/**
 * MasterRunner
 * Executes master tasks with tool-calling loop.
 * Master = delegate UP to stronger model for deep analysis/planning.
 *
 * Key difference from MinionRunner:
 * - NO auto-prep mode (master doesn't run on session start)
 * - Only runTask() mode with full tool loop
 * - Master NEVER searches — gets prepared context from agent/minion
 * - Default tools: plan_action, chat_todo, vault_write
 *
 * Pattern: mirrors MinionRunner (src/core/MinionRunner.js)
 */
import { streamToCompleteWithTools } from '../memory/streamHelper.js';
import { log } from '../utils/Logger.js';
import { filterToolsByMode } from './WorkMode.js';

/** Max characters for tool results (truncate to save tokens) */
const MAX_TOOL_RESULT_LENGTH = 3000;

export class MasterRunner {
    /**
     * @param {Object} options
     * @param {Object} options.toolRegistry - ToolRegistry instance
     * @param {Object} options.app - Obsidian App instance
     * @param {Object} options.plugin - Plugin instance (for tool execution context)
     */
    constructor({ toolRegistry, app, plugin }) {
        this.toolRegistry = toolRegistry;
        this.app = app;
        this.plugin = plugin;
        this.mcpClient = plugin?.mcpClient || null;
    }

    /**
     * Run master task with tool loop.
     * Master receives prepared context + task and can use tools to plan/write.
     *
     * @param {string} taskPrompt - Task + context from agent
     * @param {Object} agent - Agent instance
     * @param {Object} masterConfig - Config from MasterLoader
     * @param {Object} masterModel - SmartChatModel instance
     * @param {Object} [options]
     * @param {string} [options.workMode] - Current work mode (cascaded from parent)
     * @returns {Promise<{ result: string, toolsUsed: string[], toolCallDetails: Array, duration: number, usage: Object|null }>}
     */
    async runTask(taskPrompt, agent, masterConfig, masterModel, options = {}) {
        const startTime = Date.now();
        log.group('Master', `Task: ${masterConfig.name} dla ${agent.name}`);
        log.debug('Master', `Zadanie: "${taskPrompt.slice(0, 200)}..."`);

        try {
            const systemPrompt = this._buildTaskPrompt(agent, masterConfig);
            let tools = this._getMasterTools(masterConfig.tools || []);

            // Filter by work mode (inherited from parent agent)
            if (options.workMode) {
                tools = filterToolsByMode(tools, options.workMode);
            }

            // Graceful exit: if mode filtering removed all tools, return error
            if (tools.length === 0) {
                const mode = options.workMode || 'nieznany';
                log.warn('Master', `Task: brak narzędzi w trybie "${mode}" — nie mogę wykonać zadania`);
                log.groupEnd();
                return {
                    result: `Nie mogę wykonać zadania — w trybie "${mode}" master nie ma dostępnych narzędzi. Zmień tryb na "praca" żeby delegować zadania.`,
                    toolsUsed: [],
                    toolCallDetails: [],
                    duration: Date.now() - startTime,
                    usage: null,
                };
            }

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: taskPrompt }
            ];

            const response = await streamToCompleteWithTools(
                masterModel,
                messages,
                tools,
                (toolCall) => this._executeTool(toolCall, agent.name),
                {
                    maxIterations: masterConfig.max_iterations || 5,
                    minIterations: masterConfig.min_iterations || 2,
                }
            );

            log.info('Master', `Task DONE: ${response.toolsUsed?.length || 0} tools, ${(response.finalText || '').length} znaków`);
            log.timing('Master', 'Task', startTime);
            log.groupEnd();
            return {
                result: response.finalText || '',
                toolsUsed: response.toolsUsed || [],
                toolCallDetails: response.toolCallDetails || [],
                duration: Date.now() - startTime,
                usage: response.usage || null,
            };
        } catch (error) {
            log.error('Master', 'Task FAIL:', error);
            log.groupEnd();
            return { result: `Błąd mastera: ${error.message}`, toolsUsed: [], toolCallDetails: [], duration: Date.now() - startTime, usage: null };
        }
    }

    /**
     * Build system prompt for master task.
     * Uses instructions from master.md + identity + rules.
     * @param {Object} agent
     * @param {Object} masterConfig
     * @returns {string}
     */
    _buildTaskPrompt(agent, masterConfig) {
        const parts = [];

        parts.push(`Jesteś master "${masterConfig.name}" pracujący dla agenta ${agent.name}.`);
        parts.push(`Twoja specjalizacja: ${masterConfig.description}`);
        parts.push('');

        // Full prompt from master.md (the detailed instructions)
        if (masterConfig.prompt) {
            parts.push(masterConfig.prompt);
        }

        parts.push('');
        parts.push('BEZWZGLĘDNE ZASADY:');
        parts.push('1. NIE szukasz informacji sam — kontekst dostajesz od agenta/miniona');
        parts.push('2. Pracujesz TYLKO na dostarczonym kontekście');
        parts.push('3. Jeśli kontekst jest niewystarczający — napisz CO brakuje');
        parts.push('4. Odpowiadaj po polsku, wyczerpująco i merytorycznie');

        return parts.join('\n');
    }

    /**
     * Get tool definitions for master (filtered from full registry).
     * @param {string[]} toolNames - Allowed tool names
     * @returns {Array} Tool definitions in OpenAI format
     */
    _getMasterTools(toolNames) {
        if (!toolNames || toolNames.length === 0) return [];

        return toolNames
            .map(name => this.toolRegistry.getTool(name))
            .filter(Boolean)
            .map(tool => ({
                type: "function",
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.inputSchema
                }
            }));
    }

    /**
     * Execute a tool call from the master.
     * Routes through MCPClient for permission/whitelist checks when available.
     * @param {Object} toolCall - { id, name, arguments }
     * @param {string} [agentName] - Agent name for permission context
     * @returns {Promise<string>} Tool result as string
     */
    async _executeTool(toolCall, agentName) {
        log.debug('Master', `_executeTool: ${toolCall.name} (agent: ${agentName || 'brak'})`);

        try {
            // Route through MCPClient for permission + whitelist enforcement
            if (this.mcpClient && agentName) {
                const result = await this.mcpClient.executeToolCall(toolCall, agentName);
                const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
                if (resultStr.length > MAX_TOOL_RESULT_LENGTH) {
                    return resultStr.substring(0, MAX_TOOL_RESULT_LENGTH) + '\n... (skrócono - za dużo danych)';
                }
                return resultStr;
            }

            // Fallback: direct execution (when MCPClient unavailable)
            log.warn('Master', `_executeTool fallback (brak MCPClient): ${toolCall.name}`);
            const tool = this.toolRegistry.getTool(toolCall.name);
            if (!tool) return `Błąd: narzędzie "${toolCall.name}" nie istnieje`;

            let args = toolCall.arguments;
            if (typeof args === 'string') {
                args = JSON.parse(args);
            }
            const result = await tool.execute(args, this.app, this.plugin);
            const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
            if (resultStr.length > MAX_TOOL_RESULT_LENGTH) {
                return resultStr.substring(0, MAX_TOOL_RESULT_LENGTH) + '\n... (skrócono - za dużo danych)';
            }
            return resultStr;
        } catch (error) {
            return `Błąd narzędzia ${toolCall.name}: ${error.message}`;
        }
    }
}
