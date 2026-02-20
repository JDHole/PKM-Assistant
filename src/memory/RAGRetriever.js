export class RAGRetriever {
    constructor(options) {
        this.embeddingHelper = options.embeddingHelper;
        this.agentMemory = options.agentMemory;
        this.settings = options.settings;

        // Cache embeddingów sesji
        this.sessionEmbeddings = new Map(); // path -> {embedding, content}
    }

    /**
     * Pobiera relevantny kontekst dla query
     * @param {string} query
     * @param {number} maxResults
     * @returns {Promise<Array<{content, source, similarity}>>}
     */
    async retrieve(query, maxResults = 5) {
        console.log('[RAG] retrieve called, query:', query.substring(0, 50));
        console.log('[RAG] sessionEmbeddings size:', this.sessionEmbeddings.size);

        if (!this.embeddingHelper) {
            console.warn("RAGRetriever: No embedding helper initialized.");
            return [];
        }

        try {
            // 1. Embeduj query
            const queryEmbedding = await this.embeddingHelper.embed(query);
            console.log('[RAG] query embedded, vector length:', queryEmbedding?.length);

            // 2. Porównaj z cached session embeddings
            const results = [];
            const threshold = this.settings?.ragSimilarityThreshold || 0.5; // Lower threshold for testing

            for (const [path, data] of this.sessionEmbeddings.entries()) {
                const similarity = this.embeddingHelper.cosineSimilarity(queryEmbedding, data.embedding);
                console.log('[RAG] comparing with', path, 'similarity:', similarity);

                if (similarity >= threshold) {
                    results.push({
                        content: data.content,
                        source: path,
                        similarity: similarity
                    });
                }
            }

            // 3. Sortuj po similarity
            results.sort((a, b) => b.similarity - a.similarity);
            console.log('[RAG] found', results.length, 'relevant results');

            // 4. Zwróć top N
            return results.slice(0, maxResults);
        } catch (error) {
            console.error("RAGRetriever: Error during retrieval:", error);
            return [];
        }
    }

    /**
     * Indeksuje sesję (dodaje do cache)
     * @param {{path: string, name: string}} session - Session object from AgentMemory.listSessions()
     */
    async indexSession(session) {
        if (!this.agentMemory || !this.embeddingHelper) return;

        try {
            console.log('[RAG] Indexing session:', session.path);
            const sessionData = await this.agentMemory.loadSession(session);

            // Prepare content for embedding
            if (!sessionData || !sessionData.messages || sessionData.messages.length === 0) {
                console.log('[RAG] Session empty, skipping:', session.path);
                return;
            }

            const content = sessionData.messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
            console.log('[RAG] Session content length:', content.length);

            const embedding = await this.embeddingHelper.embed(content);
            console.log('[RAG] Session embedded, vector length:', embedding?.length);

            this.sessionEmbeddings.set(session.path, {
                embedding,
                content
            });
            console.log('[RAG] Session indexed successfully');

        } catch (error) {
            console.error(`RAGRetriever: Error indexing session ${session.path}:`, error);
        }
    }

    /**
     * Indeksuje wszystkie sesje z AgentMemory
     */
    async indexAllSessions() {
        if (!this.agentMemory) return;

        const sessions = await this.agentMemory.listSessions();
        for (const session of sessions) {
            await this.indexSession(session);
        }
    }

    /**
     * Formatuje wyniki do wstrzyknięcia w prompt
     * @param {Array<{content, source, similarity}>} results
     * @returns {string}
     */
    formatContext(results) {
        if (!results || results.length === 0) return "";

        return results.map(r =>
            `--- Źródło: ${r.source} (${(r.similarity * 100).toFixed(0)}%) ---\n${r.content}`
        ).join('\n\n');
    }

}
