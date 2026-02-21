/**
 * MinionTaskTool
 * MCP tool: agent delegates a task to its minion (cheaper/faster model).
 * The minion executes the task using tools and returns results to the agent.
 */
import { MinionRunner } from '../core/MinionRunner.js';

/** @type {MinionRunner|null} Lazy-initialized singleton */
let _minionRunner = null;

/**
 * Create a minion model instance.
 * Resolution: minionConfig.model → global obsek.minionModel → null
 * Same logic as ChatView._getMinionModel but standalone.
 */
function _createMinionModel(plugin, minionConfig) {
    const env = plugin?.env;
    if (!env) return null;

    const configModel = minionConfig?.model;
    const globalModel = env.settings?.obsek?.minionModel;
    const minionModelId = configModel || globalModel;
    if (!minionModelId || !minionModelId.trim()) return null;

    const scSettings = env.settings?.smart_chat_model || {};
    let platform = scSettings.platform;
    if (!platform) {
        for (const p of ['anthropic', 'openai', 'open_router', 'gemini', 'groq', 'deepseek']) {
            if (scSettings[`${p}_api_key`]) { platform = p; break; }
        }
    }
    if (!platform) return null;

    const api_key = scSettings[`${platform}_api_key`];
    if (!api_key && platform !== 'ollama') return null;

    const module_config = env.config?.modules?.smart_chat_model;
    if (!module_config?.class) return null;

    try {
        return new module_config.class({
            ...module_config,
            class: null,
            env: env,
            settings: env.settings,
            adapter: platform,
            api_key: api_key,
            model_key: minionModelId.trim(),
        });
    } catch (e) {
        console.warn('[MinionTaskTool] Failed to create minion model:', e);
        return null;
    }
}

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
                const minionModel = _createMinionModel(plugin, minionConfig);
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
