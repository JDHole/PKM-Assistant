/**
 * Central registry for all available MCP tools.
 */
export class ToolRegistry {
    constructor() {
        this.tools = new Map();
    }

    /**
     * Registers a new tool.
     * @param {Object} tool - The tool definition.
     * @param {string} tool.name - Unique name of the tool.
     * @param {string} tool.description - Description of what the tool does.
     * @param {Object} tool.inputSchema - JSON Schema for the tool's input.
     * @param {Function} tool.execute - Async function to execute the tool.
     */
    registerTool(tool) {
        if (!tool.name || !tool.description || !tool.inputSchema || !tool.execute) {
            console.error('[ToolRegistry] Invalid tool definition:', tool);
            throw new Error(`Invalid tool definition for ${tool.name || 'unknown tool'}`);
        }

        if (this.tools.has(tool.name)) {
            console.warn(`[ToolRegistry] Tool ${tool.name} is already registered. Overwriting.`);
        }

        this.tools.set(tool.name, tool);
    }

    /**
     * Retrieves a tool by name.
     * @param {string} name - The name of the tool.
     * @returns {Object|null} The tool definition or null if not found.
     */
    getTool(name) {
        return this.tools.get(name) || null;
    }

    /**
     * Returns all registered tools.
     * @returns {Array<Object>} Array of tool definitions.
     */
    getAllTools() {
        return Array.from(this.tools.values());
    }

    /**
     * Returns tool definitions formatted for OpenAI function calling / AI consumption.
     * @returns {Array<Object>} Array of tool definitions in AI format.
     */
    getToolDefinitions() {
        return this.getAllTools().map(tool => ({
            type: "function",
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.inputSchema
            }
        }));
    }
}
