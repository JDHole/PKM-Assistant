
const ACTION_TYPE_MAP = {
    'vault_read': 'vault.read',
    'vault_write': 'vault.write',
    'vault_list': 'vault.read',
    'vault_delete': 'vault.delete',
    'vault_search': 'vault.read',
    'memory_search': 'vault.read',
    'memory_update': 'vault.write',  // overridden below for read_brain
    'memory_status': 'vault.read',
    'skill_list': 'vault.read',
    'skill_execute': 'vault.read'
};

/**
 * Main client for handling MCP tool calls from AI agents.
 */
export class MCPClient {
    /**
     * @param {Object} app - Obsidian App instance.
     * @param {Object} plugin - Plugin instance (access to permissionSystem, approvalManager).
     * @param {Object} toolRegistry - Instance of ToolRegistry.
     */
    constructor(app, plugin, toolRegistry) {
        this.app = app;
        this.plugin = plugin;
        this.toolRegistry = toolRegistry;
    }

    /**
     * Executes a tool call requested by an AI agent.
     * @param {Object} toolCall - The tool call object.
     * @param {string} toolCall.id - Unique ID of the call.
     * @param {string} toolCall.name - Name of the tool to execute.
     * @param {string|Object} toolCall.arguments - Arguments for the tool (JSON string or object).
     * @param {string} agent - The name of the agent requesting the execution.
     * @returns {Promise<Object>} The result of the tool execution or an error object.
     */
    async executeToolCall(toolCall, agentName) {

        try {
            // 1. Parse arguments
            let args = toolCall.arguments;
            if (typeof args === 'string') {
                try {
                    args = JSON.parse(args);
                } catch (e) {
                    throw new Error(`Failed to parse arguments for tool ${toolCall.name}: ${e.message}`);
                }
            }

            // 2. Get tool from registry
            const tool = this.toolRegistry.getTool(toolCall.name);
            if (!tool) {
                throw new Error(`Tool not found: ${toolCall.name}`);
            }

            // 3. Get Agent object from AgentManager (not just the name!)
            const agent = this.plugin.agentManager?.getAgent(agentName)
                || this.plugin.agentManager?.getActiveAgent();
            if (!agent) {
                console.warn(`[MCPClient] Agent not found: ${agentName}, skipping permission check`);
            }

            // 4. Check permissions (only if we have an agent)
            let actionType = ACTION_TYPE_MAP[toolCall.name] || 'unknown';
            // memory_update with read_brain is a read operation, not write
            if (toolCall.name === 'memory_update' && args.operation === 'read_brain') {
                actionType = 'vault.read';
            }
            let targetPath = args.path || args.targetPath || args.file || '';

            // Special handling if the tool operates on 'folder'
            if (!targetPath && args.folder) {
                targetPath = args.folder;
            }


            let permResult = { allowed: true, requiresApproval: false };
            if (agent) {
                permResult = this.plugin.permissionSystem.checkPermission(agent, actionType, targetPath);

                if (!permResult.allowed) {
                    console.warn(`[MCPClient] Permission denied: ${permResult.reason}`);
                    throw new Error(`Permission denied: ${permResult.reason}`);
                }
            }

            // 5. Handle approval if required
            if (permResult.requiresApproval) {
                const approved = await this.plugin.approvalManager.requestApproval({
                    type: actionType,
                    description: tool.description,
                    targetPath: targetPath,
                    agentName: agentName,
                    preview: args.content ? `Content length: ${args.content.length}` : JSON.stringify(args)
                });

                if (!approved) {
                    console.warn(`[MCPClient] User denied approval for ${toolCall.name}`);
                    throw new Error("User denied approval for this action.");
                }
            }

            // 6. Execute tool (pass plugin as 3rd arg for tools that need it, e.g. memory_search)
            const result = await tool.execute(args, this.app, this.plugin);
            return result;

        } catch (error) {
            console.error(`[MCPClient] Error executing ${toolCall.name}:`, error);
            // Graceful error handling
            return {
                isError: true,
                error: error.message
            };
        }
    }

    /**
     * Helper to return tool definitions for AI.
     * @returns {Array<Object>}
     */
    formatToolsForAI() {
        return this.toolRegistry.getToolDefinitions();
    }

    /**
     * Parses tool calls from AI response (Anthropic format).
     * @param {Object} response - The AI response object.
     * @returns {Array<Object>} Array of formatted tool calls {id, name, arguments}.
     */
    parseToolCalls(response) {
        const toolCalls = [];

        // Anthropic format: response.content is an array of content blocks.
        // Look for blocks with type: 'tool_use'
        if (response && response.content && Array.isArray(response.content)) {
            for (const block of response.content) {
                if (block.type === 'tool_use') {
                    toolCalls.push({
                        id: block.id,
                        name: block.name,
                        arguments: block.input // Anthropic usually provides 'input' already parsed as object
                    });
                }
            }
        }

        // OpenAI format (fallback/alternative support if needed, though req specifies Anthropic mapping context mainly)
        if (response && response.tool_calls) {
            for (const call of response.tool_calls) {
                toolCalls.push({
                    id: call.id,
                    name: call.function.name,
                    arguments: call.function.arguments // OpenAI sends string
                });
            }
        }

        // OpenAI/Gemini format via choices array (most common path!)
        if (response?.choices?.[0]?.message?.tool_calls) {
            for (const call of response.choices[0].message.tool_calls) {
                toolCalls.push({
                    id: call.id || `call_${Date.now()}`,
                    name: call.function?.name || call.name,
                    arguments: call.function?.arguments || call.arguments
                });
            }
        }

        return toolCalls;
    }
}
