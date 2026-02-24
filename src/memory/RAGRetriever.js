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
     * Indeksuje wszystkie sesje z AgentMemory (batch - 1-2 HTTP calls zamiast N).
     * Limituje do 20 najnowszych sesji.
     */
    async indexAllSessions() {
        if (!this.agentMemory || !this.embeddingHelper) return;

        const sessions = await this.agentMemory.listSessions();
        // Most recent 20 sessions only (sorted desc by name = date)
        const recentSessions = sessions.slice(0, 20);

        // Load all session contents
        const loaded = [];
        for (const session of recentSessions) {
            try {
                const sessionData = await this.agentMemory.loadSession(session);
                if (!sessionData?.messages?.length) continue;
                const content = sessionData.messages
                    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
                    .join('\n\n')
                    .substring(0, 1500); // cap per session to avoid huge payloads
                loaded.push({ path: session.path, content });
            } catch { /* skip unreadable */ }
        }

        // Odfiltruj puste sesje przed embedowaniem
        const validLoaded = loaded.filter(s => s.content && s.content.trim().length > 0);
        if (validLoaded.length === 0) return;

        // Batch embed ALL sessions in 1-2 HTTP calls
        try {
            const texts = validLoaded.map(s => s.content);
            const vecs = await this.embeddingHelper.embedBatch(texts);
            validLoaded.forEach((s, i) => {
                if (vecs[i]) {
                    this.sessionEmbeddings.set(s.path, { embedding: vecs[i], content: s.content });
                }
            });
            console.log(`[RAG] Indexed ${validLoaded.length} sessions (batch)`);
        } catch (e) {
            console.warn('[RAG] Batch indexing failed:', e.message);
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
