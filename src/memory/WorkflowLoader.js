import { parseWorkflow, formatWorkflowForPrompt } from './workflowParser.js';

export class WorkflowLoader {
    constructor(options) {
        this.vault = options.vault;
        this.embeddingHelper = options.embeddingHelper;
        this.workflowsPath = '.pkm-assistant/workflows';
        this.workflowCache = new Map(); // path -> {workflow, embedding}
    }

    /**
     * Ładuje i indeksuje wszystkie workflows
     */
    async loadAll() {
        console.log("Loading workflows from", this.workflowsPath);
        this.workflowCache.clear();

        if (!(await this.vault.adapter.exists(this.workflowsPath))) {
            console.warn(`Workflows directory not found: ${this.workflowsPath}`);
            return;
        }

        const files = await this.vault.adapter.list(this.workflowsPath);
        // vault.adapter.list returns { files: string[], folders: string[] }
        // or just an array of strings in some API versions? 
        // Checking standard Obsidian API: list(path) returns Promise<DataAdapterList> which has 'files' and 'folders' properties

        const filePaths = files.files || [];

        for (const filePath of filePaths) {
            if (!filePath.endsWith('.md')) continue;

            try {
                const content = await this.vault.adapter.read(filePath);
                const workflow = parseWorkflow(content);

                // Construct text reference for embedding
                // Priority: triggers -> description -> name
                const triggers = workflow.frontmatter.triggers ? workflow.frontmatter.triggers.join(' ') : '';
                const textToEmbed = `${triggers} ${workflow.frontmatter.description || ''} ${workflow.frontmatter.name || ''}`;

                let embedding = null;
                if (textToEmbed.trim() && this.embeddingHelper && this.embeddingHelper.isReady()) {
                    embedding = await this.embeddingHelper.embed(textToEmbed);
                }

                this.workflowCache.set(filePath, {
                    workflow,
                    embedding,
                    path: filePath
                });

            } catch (e) {
                console.error(`Failed to load workflow ${filePath}:`, e);
            }
        }
        console.log(`Loaded ${this.workflowCache.size} workflows.`);
    }

    /**
     * Znajduje workflow pasujący do query (intent detection)
     * @returns {Promise<Object|null>} Workflow lub null
     */
    async findByIntent(query, threshold = 0.7) {
        if (!this.embeddingHelper || !this.embeddingHelper.isReady()) {
            console.warn("Embedding helper not ready, cannot find workflow by intent.");
            return null;
        }

        if (this.workflowCache.size === 0) {
            return null;
        }

        try {
            const queryEmbedding = await this.embeddingHelper.embed(query);
            let bestMatch = null;
            let maxScore = -1;

            for (const item of this.workflowCache.values()) {
                if (!item.embedding) continue;

                const score = this.embeddingHelper.cosineSimilarity(queryEmbedding, item.embedding);
                if (score > maxScore) {
                    maxScore = score;
                    bestMatch = item;
                }
            }

            if (bestMatch && maxScore >= threshold) {
                console.log(`Found workflow intent: ${bestMatch.workflow.frontmatter.name} (score: ${maxScore})`);
                return {
                    ...bestMatch.workflow,
                    path: bestMatch.path,
                    score: maxScore
                };
            }

        } catch (e) {
            console.error("Error finding workflow by intent:", e);
        }

        return null;
    }

    /**
     * Zwraca workflow gotowy do wstrzyknięcia w prompt
     */
    getFormattedWorkflow(workflowPath) {
        const item = this.workflowCache.get(workflowPath);
        if (!item) return null;
        return formatWorkflowForPrompt(item.workflow);
    }
}
