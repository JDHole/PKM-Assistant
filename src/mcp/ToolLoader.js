import { TFile, TFolder } from 'obsidian';

/**
 * Loads custom tool definitions from vault
 */
export class ToolLoader {
    constructor(vault) {
        this.vault = vault;
        this.toolsPath = '.pkm-assistant/tools';
    }

    /**
     * Load all tool definitions from the tools directory
     * @returns {Promise<Array>} Array of tool definitions
     */
    async loadAllTools() {
        const toolsFolder = this.vault.getAbstractFileByPath(this.toolsPath);

        if (!toolsFolder || !(toolsFolder instanceof TFolder)) {
            console.log(`[ToolLoader] Tools directory not found at ${this.toolsPath}`);
            return [];
        }

        const loadedTools = [];

        // Iterate through all files in the directory
        for (const child of toolsFolder.children) {
            if (child instanceof TFile && child.extension === 'json') {
                const tool = await this.loadToolFromFile(child);
                if (tool) {
                    loadedTools.push(tool);
                }
            }
        }

        console.log(`[ToolLoader] Loaded ${loadedTools.length} custom tools`);
        return loadedTools;
    }

    /**
     * Load a single tool from JSON file
     * @param {TFile} file 
     * @returns {Promise<Object|null>}
     */
    async loadToolFromFile(file) {
        try {
            const content = await this.vault.read(file);
            const toolDef = JSON.parse(content);

            if (this.validateToolDefinition(toolDef)) {
                return this.createToolFromDefinition(toolDef);
            } else {
                console.warn(`[ToolLoader] Invalid tool definition in ${file.path}`);
                return null;
            }
        } catch (error) {
            console.error(`[ToolLoader] Failed to load tool from ${file.path}:`, error);
            return null;
        }
    }

    /**
     * Validate tool definition
     * @param {Object} toolDef 
     * @returns {boolean}
     */
    validateToolDefinition(toolDef) {
        if (!toolDef || typeof toolDef !== 'object') return false;

        const hasName = typeof toolDef.name === 'string' && toolDef.name.length > 0;
        const hasDescription = typeof toolDef.description === 'string';
        const hasInputSchema = toolDef.input_schema &&
            typeof toolDef.input_schema === 'object' &&
            toolDef.input_schema.type === 'object';

        return hasName && hasDescription && hasInputSchema;
    }

    /**
     * Create executable wrapper for custom tool
     * @param {Object} toolDef 
     * @returns {Object} Tool ready for ToolRegistry
     */
    createToolFromDefinition(toolDef) {
        return {
            name: toolDef.name,
            description: toolDef.description,
            inputSchema: toolDef.input_schema,
            execute: async (args, app) => {
                // Custom tools nie mają execute - zwróć info
                console.log(`[ToolLoader] Custom tool ${toolDef.name} called with:`, args);
                return {
                    success: false,
                    error: `Custom tool "${toolDef.name}" requires external MCP server: ${toolDef.mcp_server || 'not specified'}`
                };
            },
            isCustom: true,
            mcpServer: toolDef.mcp_server || null
        };
    }
}
