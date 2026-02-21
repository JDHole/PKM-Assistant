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
        if (!this.embeddingHelper) return [];

        try {
            const queryEmbedding = await this.embeddingHelper.embed(query);
            const results = [];
            const threshold = this.settings?.ragSimilarityThreshold || 0.5;

            for (const [path, data] of this.sessionEmbeddings.entries()) {
                const similarity = this.embeddingHelper.cosineSimilarity(queryEmbedding, data.embedding);
                if (similarity >= threshold) {
                    results.push({ content: data.content, source: path, similarity });
                }
            }

            results.sort((a, b) => b.similarity - a.similarity);
            return results.slice(0, maxResults);
        } catch (error) {
            console.error("[RAG] Retrieval error:", error);
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
            const sessionData = await this.agentMemory.loadSession(session);
            if (!sessionData?.messages?.length) return;

            const content = sessionData.messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
            const embedding = await this.embeddingHelper.embed(content);

            this.sessionEmbeddings.set(session.path, { embedding, content });
        } catch (error) {
            console.error(`[RAG] Error indexing session ${session.path}:`, error);
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
