import { log } from '../utils/Logger.js';

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
    'skill_execute': 'vault.read',
    'minion_task': 'vault.read',
    'master_task': 'vault.read',
    'agent_message': 'vault.write',
    'agent_delegate': 'vault.read',
    'chat_todo': 'vault.read',
    'plan_action': 'vault.read',
    'agora_read': 'vault.read',
    'agora_update': 'vault.write',
    'agora_project': 'vault.write'
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
        const toolStart = Date.now();
        log.debug('MCPClient', `executeToolCall: ${toolCall.name} (agent: ${agentName})`);

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
            log.debug('MCPClient', `${toolCall.name} args:`, args);

            // 2. Get tool from registry
            const tool = this.toolRegistry.getTool(toolCall.name);
            if (!tool) {
                throw new Error(`Tool not found: ${toolCall.name}`);
            }

            // 3. Get Agent object from AgentManager (not just the name!)
            const agent = this.plugin.agentManager?.getAgent(agentName)
                || this.plugin.agentManager?.getActiveAgent();
            if (!agent) {
                log.warn('MCPClient', `Agent nie znaleziony: ${agentName}, pomijam sprawdzenie uprawnień`);
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

            log.debug('MCPClient', `${toolCall.name} permission check: ${actionType} → ${targetPath || '(brak ścieżki)'}`);

            let permResult = { allowed: true, requiresApproval: false };
            if (agent) {
                permResult = this.plugin.permissionSystem.checkPermission(agent, actionType, targetPath);

                if (!permResult.allowed) {
                    log.warn('MCPClient', `Permission DENIED: ${permResult.reason}`);
                    throw new Error(`Permission denied: ${permResult.reason}`);
                }
            }

            // 5. Handle approval if required
            if (permResult.requiresApproval) {
                log.info('MCPClient', `${toolCall.name} wymaga zatwierdzenia usera...`);
                const approved = await this.plugin.approvalManager.requestApproval({
                    type: actionType,
                    description: tool.description,
                    targetPath: targetPath,
                    agentName: agentName,
                    preview: args.content ? `Content length: ${args.content.length}` : JSON.stringify(args)
                });

                if (!approved) {
                    log.warn('MCPClient', `User ODMÓWIŁ zatwierdzenia: ${toolCall.name}`);
                    throw new Error("User denied approval for this action.");
                }
                log.debug('MCPClient', `User ZATWIERDZIŁ: ${toolCall.name}`);
            }

            // 6. Execute tool (pass plugin as 3rd arg for tools that need it, e.g. memory_search)
            const result = await tool.execute(args, this.app, this.plugin);
            log.tool(toolCall.name, args, result);
            log.timing('MCPClient', `${toolCall.name} wykonanie`, toolStart);
            return result;

        } catch (error) {
            log.error('MCPClient', `${toolCall.name} BŁĄD:`, error);
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

        // Post-process: detect and split concatenated tool calls (DeepSeek Reasoner bug)
        // e.g. name="chat_todoplan_action", args='{"action":"list"}{"action":"list"}'
        const processed = [];
        for (const tc of toolCalls) {
            const split = this._trySplitConcatenatedToolCall(tc);
            processed.push(...split);
        }

        return processed;
    }

    /**
     * Try to split a concatenated tool call into separate calls.
     * DeepSeek Reasoner sometimes glues multiple tool calls into one:
     * name: "chat_todoplan_action" → "chat_todo" + "plan_action"
     * args: '{"action":"list"}{"action":"list"}' → two separate JSON objects
     *
     * @param {Object} toolCall - { id, name, arguments }
     * @returns {Array<Object>} Array of tool calls (1 if no split needed, 2+ if split)
     */
    _trySplitConcatenatedToolCall(toolCall) {
        const name = toolCall.name;

        // Quick check: if tool exists, no split needed
        if (this.toolRegistry.getTool(name)) {
            return [toolCall];
        }

        // Try to find two known tool names concatenated
        const allToolNames = this.toolRegistry.getAllToolNames();
        for (const t1 of allToolNames) {
            if (name.startsWith(t1) && name.length > t1.length) {
                const rest = name.slice(t1.length);
                if (allToolNames.includes(rest)) {
                    log.warn('MCPClient', `Wykryto sklejone tool calls: "${name}" → "${t1}" + "${rest}"`);

                    // Split arguments (two JSON objects concatenated)
                    const argsStr = typeof toolCall.arguments === 'string'
                        ? toolCall.arguments
                        : JSON.stringify(toolCall.arguments);
                    const splitArgs = this._splitConcatenatedJSON(argsStr);

                    return [
                        { id: toolCall.id, name: t1, arguments: splitArgs[0] || '{}' },
                        { id: `${toolCall.id}_split`, name: rest, arguments: splitArgs[1] || '{}' }
                    ];
                }
            }
        }

        // No split possible — return as-is (will fail gracefully in executeToolCall)
        return [toolCall];
    }

    /**
     * Split concatenated JSON objects: '{"a":1}{"b":2}' → ['{"a":1}', '{"b":2}']
     * @param {string} str - Potentially concatenated JSON string
     * @returns {string[]} Array of individual JSON strings
     */
    _splitConcatenatedJSON(str) {
        if (!str || typeof str !== 'string') return [str];

        const parts = [];
        let depth = 0;
        let start = 0;

        for (let i = 0; i < str.length; i++) {
            if (str[i] === '{') depth++;
            if (str[i] === '}') {
                depth--;
                if (depth === 0) {
                    parts.push(str.slice(start, i + 1));
                    start = i + 1;
                }
            }
        }

        return parts.length > 0 ? parts : [str];
    }
}
