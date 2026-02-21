/**
 * Wrapper na SmartEmbedModel dla łatwego użycia w RAG
 */
export class EmbeddingHelper {
    constructor(env) {
        this.env = env;
        this._embedModel = null;
    }

    /**
     * Znajduje model embeddings w różnych miejscach env
     */
    _findEmbedModel() {
        // Try various paths where embed model might be
        if (this.env?.smart_embed_model?.embed) {
            return this.env.smart_embed_model;
        }
        // Try through modules
        if (this.env?.modules?.smart_embed_model?.embed) {
            return this.env.modules.smart_embed_model;
        }
        // Try through collections (smart_sources use embed model)
        if (this.env?.smart_sources?.embed_model?.embed) {
            return this.env.smart_sources.embed_model;
        }
        // Try smart_blocks
        if (this.env?.smart_blocks?.embed_model?.embed) {
            return this.env.smart_blocks.embed_model;
        }
        return null;
    }

    /**
     * Sprawdza czy model jest gotowy
     */
    isReady() {
        this._embedModel = this._findEmbedModel();
        return !!this._embedModel;
    }

    /**
     * Embeduje pojedynczy tekst
     * @param {string} text - Tekst do zembedowania
     * @returns {Promise<number[]>} Vector
     */
    async embed(text) {
        if (!this.isReady()) throw new Error('Embed model not ready');

        // SmartEmbedModel.embed() expects just the text string, not {input: text}
        const result = await this._embedModel.embed(text);

        // Handle various result formats
        if (Array.isArray(result)) {
            return result;
        }
        if (result?.vec) {
            return result.vec;
        }
        if (result?.embedding) {
            return result.embedding;
        }
        if (result?.data?.[0]?.embedding) {
            return result.data[0].embedding;
        }

        console.warn('[EmbeddingHelper] Unknown result format:', result);
        throw new Error('Embed result has unknown format');
    }

    /**
     * Embeduje wiele tekstów (batch)
     * @param {string[]} texts - Lista tekstów do zembedowania
     * @returns {Promise<number[][]>} Lista wektorów
     */
    async embedBatch(texts) {
        if (!this.isReady()) throw new Error('Embed model not ready');

        // Użyj embed_batch jeśli dostępne
        if (this._embedModel.embed_batch) {
            try {
                const result = await this._embedModel.embed_batch({ input: texts });
                return result.vecs || result.embeddings || result;
            } catch (e) {
                console.warn("SmartEmbedModel.embed_batch failed, falling back to iterative embed:", e);
            }
        }

        // Fallback: iterate
        return Promise.all(texts.map(text => this.embed(text)));
    }

    /**
     * Oblicza podobieństwo cosinusowe
     * @param {number[]} vecA 
     * @param {number[]} vecB 
     * @returns {number} Similarity score (-1 to 1)
     */
    cosineSimilarity(vecA, vecB) {
        if (!vecA || !vecB || vecA.length !== vecB.length) {
            console.warn("Invalid vectors for cosineSimilarity");
            return 0;
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
