/**
 * Wrapper na SmartEmbedModel adapter dla łatwego użycia w RAG.
 * Używa tej samej ścieżki co vault_search (adapter.embed_batch).
 */
export class EmbeddingHelper {
    constructor(env) {
        this.env = env;
        this._embedAdapter = null;
    }

    /**
     * Znajduje adapter embeddings (ten sam co vault_search).
     * smart_sources.embed_model → embedding_models.default.instance
     */
    _findEmbedAdapter() {
        // Path 1: through smart_sources (same as vault_search - proven working)
        try {
            const adapter = this.env?.smart_sources?.embed_model;
            if (adapter?.embed_batch) return adapter;
        } catch { /* not ready */ }

        // Path 2: through embedding_models collection (.instance = adapter)
        try {
            const model = this.env?.embedding_models?.default;
            if (model?.instance?.embed_batch) return model.instance;
        } catch { /* not ready */ }

        return null;
    }

    /**
     * Sprawdza czy adapter jest gotowy
     */
    isReady() {
        this._embedAdapter = this._findEmbedAdapter();
        return !!this._embedAdapter;
    }

    /**
     * Embeduje pojedynczy tekst (ta sama ścieżka co vault_search).
     * @param {string} text - Tekst do zembedowania
     * @returns {Promise<number[]>} Vector
     */
    async embed(text) {
        if (!this.isReady()) throw new Error('Embed model not ready');

        const results = await this._embedAdapter.embed_batch([{ embed_input: text }]);

        if (!results?.length || !results[0]?.vec) {
            throw new Error('Embed result is empty');
        }
        return results[0].vec;
    }

    /**
     * Embeduje wiele tekstów (batch).
     * Trackuje indeksy — adapter może odfiltrować puste inputy,
     * więc mapujemy wyniki z powrotem na oryginalne pozycje.
     * @param {string[]} texts - Lista tekstów do zembedowania
     * @returns {Promise<(number[]|null)[]>} Lista wektorów (null dla pustych/odfiltrowanych)
     */
    async embedBatch(texts) {
        if (!this.isReady()) throw new Error('Embed model not ready');

        // Zapamiętaj które indeksy mają niepusty tekst
        const validEntries = [];
        for (let i = 0; i < texts.length; i++) {
            if (texts[i] && texts[i].trim().length > 0) {
                validEntries.push({ originalIndex: i, text: texts[i] });
            }
        }

        if (validEntries.length === 0) return texts.map(() => null);

        const inputs = validEntries.map(e => ({ embed_input: e.text }));
        const results = await this._embedAdapter.embed_batch(inputs);

        // Odbuduj tablicę o oryginalnej długości — null dla pustych pozycji
        const output = new Array(texts.length).fill(null);
        for (let j = 0; j < validEntries.length; j++) {
            output[validEntries[j].originalIndex] = results[j]?.vec ?? null;
        }
        return output;
    }

    /**
     * Oblicza podobieństwo cosinusowe
     * @param {number[]} vecA 
     * @param {number[]} vecB 
     * @returns {number} Similarity score (-1 to 1)
     */
    cosineSimilarity(vecA, vecB) {
        if (!vecA || !vecB || vecA.length !== vecB.length) {
            return 0; // null vektory to oczekiwana sytuacja (puste snippety)
        }

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
