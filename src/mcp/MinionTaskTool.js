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
        description: 'Deleguj zadanie W DÓŁ do swojego miniona — tańszego/szybszego modelu AI. Minion ma dostęp do narzędzi (vault_read, vault_search, memory_search itp.) i pracuje samodzielnie.\n\nKIEDY DELEGOWAĆ MINIONOWI:\n- Przeszukanie wielu plików (np. "znajdź wszystkie notatki o projekcie X")\n- Analiza zbiorcza (np. "policz ile mam notatek z tagiem #idea")\n- Zbieranie danych z wielu źródeł (vault + pamięć + brain)\n- Czasochłonne operacje które nie wymagają geniuszu\n\nKIEDY ROBIĆ SAMEMU (nie deleguj):\n- Odczyt jednego pliku → vault_read\n- Proste wyszukiwanie → vault_search\n- Odpowiedź na pytanie usera (nie wymaga researchu)\n- Operacje na pamięci → memory_update\n\nJAK FORMUŁOWAĆ ZADANIE:\n- Bądź KONKRETNY: "Przeszukaj folder Projekty/ i znajdź wszystkie pliki zawierające słowo budżet. Dla każdego podaj ścieżkę i krótki fragment."\n- NIE: "Poszukaj czegoś o budżecie" (za ogólne)\n\nUWAGI:\n- Minion pracuje na tańszym modelu (np. Haiku) — nie dawaj mu zadań wymagających głębokiej analizy\n- Max kilka iteracji tool-calling (konfigurowane w minion.md)\n- Graceful failure: jeśli minion padnie, dostaniesz błąd (nie crash)',
        inputSchema: {
            type: 'object',
            properties: {
                task: {
                    type: 'string',
                    description: 'Konkretny opis zadania. Napisz CO ma znaleźć/zrobić, GDZIE szukać, w JAKIM formacie zwrócić wynik. Im precyzyjniej, tym lepszy wynik.'
                },
                extra_tools: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Dodatkowe narzędzia poza domyślnymi miniona. Przykład: ["vault_write", "memory_update"]. Domyślne narzędzia miniona: vault_read, vault_list, vault_search, memory_search.'
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
                    tool_call_details: taskResult.toolCallDetails || [],
                    duration_ms: taskResult.duration,
                    usage: taskResult.usage || null,
                };
            } catch (e) {
                console.error('[MinionTaskTool] Error:', e);
                return { success: false, error: e.message };
            }
        }
    };
}
