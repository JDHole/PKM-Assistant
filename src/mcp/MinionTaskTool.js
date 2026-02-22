/**
 * MinionTaskTool
 * MCP tool: agent delegates a task to its minion (cheaper/faster model).
 * The minion executes the task using tools and returns results to the agent.
 */
import { MinionRunner } from '../core/MinionRunner.js';
import { createModelForRole } from '../utils/modelResolver.js';

/** @type {MinionRunner|null} Lazy-initialized singleton */
let _minionRunner = null;

export function createMinionTaskTool(app) {
    return {
        name: 'minion_task',
        description: 'Deleguj zadanie do swojego miniona (tańszy model AI). Minion przeszukuje vault, pamięć, zbiera dane i zwraca wyniki. Używaj gdy potrzebujesz przeszukać wiele plików, zrobić analizę zbiorczą lub zebrać dane z wielu źródeł. Proste operacje (odczyt jednego pliku) rób sam.',
        inputSchema: {
            type: 'object',
            properties: {
                task: {
                    type: 'string',
                    description: 'Opis zadania dla miniona. Bądź konkretny - napisz dokładnie co ma znaleźć/zrobić.'
                },
                extra_tools: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Opcjonalnie: dodatkowe narzędzia poza domyślnymi miniona (np. ["vault_list", "vault_write"])'
                }
            },
            required: ['task']
        },
        execute: async (args, app, plugin) => {
            try {
                const agentManager = plugin?.agentManager;
                if (!agentManager) {
                    return { success: false, error: 'AgentManager niedostępny' };
                }

                const activeAgent = agentManager.getActiveAgent();
                if (!activeAgent) {
                    return { success: false, error: 'Brak aktywnego agenta' };
                }

                // Check if agent has a minion assigned
                if (!activeAgent.minion) {
                    return {
                        success: false,
                        error: `Agent ${activeAgent.name} nie ma przypisanego miniona. Skonfiguruj pole "minion" w konfiguracji agenta.`
                    };
                }

                // Check if minion is enabled
                if (activeAgent.minionEnabled === false) {
                    return {
                        success: false,
                        error: `Minion jest wyłączony dla agenta ${activeAgent.name}.`
                    };
                }

                // Get minion config
                const minionConfig = agentManager.minionLoader.getMinion(activeAgent.minion);
                if (!minionConfig) {
                    return {
                        success: false,
                        error: `Minion "${activeAgent.minion}" nie znaleziony. Dostępne: ${agentManager.minionLoader.getAllMinions().map(m => m.name).join(', ') || 'brak'}`
                    };
                }

                // Get minion model (or fall back to main model)
                const minionModel = createModelForRole(plugin, 'minion', activeAgent, minionConfig);
                const model = minionModel || (plugin.env?.smart_chat_model?.stream ? plugin.env.smart_chat_model : null);
                if (!model?.stream) {
                    return { success: false, error: 'Brak dostępnego modelu AI dla miniona' };
                }

                // Lazy-init MinionRunner
                if (!_minionRunner && plugin.toolRegistry) {
                    _minionRunner = new MinionRunner({
                        toolRegistry: plugin.toolRegistry,
                        app: app,
                        plugin: plugin
                    });
                }

                if (!_minionRunner) {
                    return { success: false, error: 'Nie można zainicjalizować MinionRunner' };
                }

                // Execute task
                const taskResult = await _minionRunner.runTask(
                    args.task,
                    activeAgent,
                    minionConfig,
                    model,
                    { extraTools: args.extra_tools }
                );

                return {
                    success: true,
                    result: taskResult.result,
                    tools_used: taskResult.toolsUsed,
                    duration_ms: taskResult.duration
                };
            } catch (e) {
                console.error('[MinionTaskTool] Error:', e);
                return { success: false, error: e.message };
            }
        }
    };
}
