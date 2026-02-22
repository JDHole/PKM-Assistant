/**
 * MinionRunner
 * Executes minion tasks in two modes:
 * A) Auto-prep: runs before first message in session (uses minion.md prompt)
 * B) minion_task: runs on-demand when agent delegates work (uses dynamic prompt)
 *
 * Both modes use streamToCompleteWithTools for tool-calling loops.
 */
import { streamToCompleteWithTools } from '../memory/streamHelper.js';

/** Max characters for tool results (truncate to save tokens) */
const MAX_TOOL_RESULT_LENGTH = 3000;

export class MinionRunner {
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
    }

    /**
     * Mode A: Auto-prep — runs before first message in session.
     * Uses the minion's stored prompt from minion.md.
     *
     * @param {string} userMessage - The user's first message
     * @param {Object} agent - Agent instance
     * @param {Object} minionConfig - Config from MinionLoader
     * @param {Object} minionModel - SmartChatModel instance
     * @returns {Promise<{ context: string, toolsUsed: string[], duration: number }>}
     */
    async runAutoPrep(userMessage, agent, minionConfig, minionModel) {
        const startTime = Date.now();

        try {
            // Read playbook + vault_map for the agent (injected into minion context)
            const playbookManager = this.plugin?.agentManager?.playbookManager;
            let playbookContent = '';
            let vaultMapContent = '';
            if (playbookManager) {
                playbookContent = await playbookManager.readPlaybook(agent.name);
                vaultMapContent = await playbookManager.readVaultMap(agent.name);
            }

            // Read inbox for unread messages (AI-unread: NOWA or USER_READ)
            let inboxContent = '';
            const komunikator = this.plugin?.agentManager?.komunikatorManager;
            if (komunikator) {
                try {
                    const inbox = await komunikator.readInbox(agent.name);
                    const unread = inbox.filter(m => m.status === 'NOWA' || m.status === 'USER_READ');
                    if (unread.length > 0) {
                        inboxContent = unread.map(m =>
                            `Od: ${m.from} | Temat: ${m.subject} | ${m.date}\n${m.body.slice(0, 500)}`
                        ).join('\n---\n');
                        // Mark all as AI-read
                        for (const m of unread) {
                            await komunikator.markAsAIRead(agent.name, m.id);
                        }
                        this.plugin?.agentManager?._emit('communicator:message_read');
                    }
                } catch (e) {
                    console.warn('[MinionRunner] Failed to read inbox:', e);
                }
            }

            const systemPrompt = this._buildAutoPrepPrompt(agent, minionConfig, playbookContent, vaultMapContent, inboxContent);
            const tools = this._getMinionTools(minionConfig.tools);

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ];

            const result = await streamToCompleteWithTools(
                minionModel,
                messages,
                tools,
                (toolCall) => this._executeTool(toolCall),
                { maxIterations: minionConfig.max_iterations || 3 }
            );

            return {
                context: result.finalText || '',
                toolsUsed: result.toolsUsed || [],
                duration: Date.now() - startTime
            };
        } catch (error) {
            console.error('[MinionRunner] Auto-prep failed:', error);
            return { context: '', toolsUsed: [], duration: Date.now() - startTime };
        }
    }

    /**
     * Mode B: minion_task — runs on-demand when agent delegates.
     * Uses dynamic prompt from the agent.
     *
     * @param {string} taskPrompt - Task description from the agent
     * @param {Object} agent - Agent instance
     * @param {Object} minionConfig - Config from MinionLoader
     * @param {Object} minionModel - SmartChatModel instance
     * @param {Object} [options]
     * @param {string[]} [options.extraTools] - Additional tool names beyond minion defaults
     * @returns {Promise<{ result: string, toolsUsed: string[], duration: number }>}
     */
    async runTask(taskPrompt, agent, minionConfig, minionModel, options = {}) {
        const startTime = Date.now();

        try {
            const systemPrompt = this._buildTaskPrompt(agent, minionConfig);

            // Merge default tools with any extra tools requested by agent
            const toolNames = [...(minionConfig.tools || [])];
            if (options.extraTools) {
                for (const t of options.extraTools) {
                    if (!toolNames.includes(t)) toolNames.push(t);
                }
            }
            const tools = this._getMinionTools(toolNames);

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: taskPrompt }
            ];

            const response = await streamToCompleteWithTools(
                minionModel,
                messages,
                tools,
                (toolCall) => this._executeTool(toolCall),
                { maxIterations: minionConfig.max_iterations || 3 }
            );

            return {
                result: response.finalText || '',
                toolsUsed: response.toolsUsed || [],
                duration: Date.now() - startTime
            };
        } catch (error) {
            console.error('[MinionRunner] Task failed:', error);
            return { result: `Błąd miniona: ${error.message}`, toolsUsed: [], duration: Date.now() - startTime };
        }
    }

    /**
     * Build system prompt for auto-prep mode.
     * Uses the stored prompt from minion.md + playbook + vault_map.
     * @param {Object} agent
     * @param {Object} minionConfig
     * @param {string} [playbookContent] - Content of playbook.md
     * @param {string} [vaultMapContent] - Content of vault_map.md
     * @param {string} [inboxContent] - Unread inbox messages
     */
    _buildAutoPrepPrompt(agent, minionConfig, playbookContent = '', vaultMapContent = '', inboxContent = '') {
        const parts = [];

        parts.push(`Jesteś minion "${minionConfig.name}" pracujący dla agenta ${agent.name} ${agent.emoji}.`);
        parts.push(`Rola: ${minionConfig.description}`);
        parts.push('');

        // Full prompt from minion.md (the detailed instructions)
        if (minionConfig.prompt) {
            parts.push(minionConfig.prompt);
        }

        // Inject playbook (agent's instruction manual)
        if (playbookContent) {
            parts.push('');
            parts.push('--- PLAYBOOK AGENTA (instrukcje i procedury) ---');
            parts.push(playbookContent);
            parts.push('--- Koniec playbooka ---');
        }

        // Inject vault_map (agent's terrain map)
        if (vaultMapContent) {
            parts.push('');
            parts.push('--- VAULT MAP (mapa vaulta) ---');
            parts.push(vaultMapContent);
            parts.push('--- Koniec vault map ---');
            parts.push('');
            parts.push('Użyj vault map żeby wiedzieć GDZIE szukać informacji.');
        }

        // Add skill info if agent has skills
        if (agent.skills?.length > 0) {
            const skillLoader = this.plugin?.agentManager?.skillLoader;
            if (skillLoader) {
                const agentSkills = skillLoader.getSkillsForAgent(agent.skills);
                if (agentSkills.length > 0) {
                    parts.push('');
                    parts.push('Agent ma dostępne umiejętności (skille):');
                    for (const skill of agentSkills) {
                        parts.push(`- ${skill.name}: ${skill.description}`);
                    }
                    parts.push('Jeśli pytanie usera pasuje do skilla, dopisz na końcu:');
                    parts.push('SUGEROWANY SKILL: {nazwa_skilla}');
                }
            }
        }

        // Inject unread inbox messages
        if (inboxContent) {
            parts.push('');
            parts.push('--- NOWE WIADOMOŚCI W INBOXIE ---');
            parts.push(inboxContent);
            parts.push('--- Koniec wiadomości ---');
            parts.push('Poinformuj agenta o nowych wiadomościach w jego inboxie.');
        }

        return parts.join('\n');
    }

    /**
     * Build system prompt for minion_task mode.
     * Uses a generic preamble - the actual task comes as user message.
     */
    _buildTaskPrompt(agent, minionConfig) {
        const parts = [];

        parts.push(`Jesteś minion "${minionConfig.name}" pracujący dla agenta ${agent.name} ${agent.emoji}.`);
        parts.push(`Agent deleguje Ci zadanie. Wykonaj je dokładnie i zwróć wynik.`);
        parts.push('');
        parts.push('ZASADY:');
        parts.push('1. Użyj narzędzi żeby wykonać zadanie');
        parts.push('2. Odpowiedz KONKRETNIE - podaj znalezione dane, nie ogólniki');
        parts.push('3. Jeśli czegoś nie znalazłeś, napisz wprost');
        parts.push('4. Odpowiedź max 500 słów');

        return parts.join('\n');
    }

    /**
     * Get tool definitions for minion (filtered from full registry).
     * @param {string[]} toolNames - Allowed tool names
     * @returns {Array} Tool definitions in OpenAI format
     */
    _getMinionTools(toolNames) {
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
     * Execute a tool call from the minion.
     * @param {Object} toolCall - { id, name, arguments }
     * @returns {Promise<string>} Tool result as string
     */
    async _executeTool(toolCall) {
        const tool = this.toolRegistry.getTool(toolCall.name);
        if (!tool) return `Błąd: narzędzie "${toolCall.name}" nie istnieje`;

        try {
            let args = toolCall.arguments;
            if (typeof args === 'string') {
                args = JSON.parse(args);
            }

            // Execute tool (passes plugin for tools that need it)
            const result = await tool.execute(args, this.app, this.plugin);

            // Truncate large results to save tokens
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
