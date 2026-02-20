import { EmbeddingHelper } from './EmbeddingHelper.js';

export class RAGRetriever {
    constructor(options) {
        this.embeddingHelper = options.embeddingHelper;
        this.sessionManager = options.sessionManager;
        this.vault = options.vault;
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
     * @param {TFile} file
     */
    async indexSession(file) {
        if (!this.sessionManager || !this.embeddingHelper) return;

        try {
            console.log('[RAG] Indexing session:', file.path);
            const sessionData = await this.sessionManager.loadSession(file);

            // Prepare content for embedding
            if (!sessionData || !sessionData.messages || sessionData.messages.length === 0) {
                console.log('[RAG] Session empty, skipping:', file.path);
                return;
            }

            const content = sessionData.messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
            console.log('[RAG] Session content length:', content.length);

            const embedding = await this.embeddingHelper.embed(content);
            console.log('[RAG] Session embedded, vector length:', embedding?.length);

            this.sessionEmbeddings.set(file.path, {
                embedding,
                content
            });
            console.log('[RAG] Session indexed successfully');

        } catch (error) {
            console.error(`RAGRetriever: Error indexing session ${file.path}:`, error);
        }
    }

    /**
     * Indeksuje wszystkie sesje
     */
    async indexAllSessions() {
        if (!this.sessionManager) return;

        const files = await this.sessionManager.listSessions();
        for (const file of files) {
            await this.indexSession(file);
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

    /**
     * Calculates cosine similarity between two vectors
     * @private
     */
    _cosineSimilarity(vecA, vecB) {
        if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        if (normA === 0 || normB === 0) return 0;

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
