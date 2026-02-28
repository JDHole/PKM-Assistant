/**
 * MasterTaskTool
 * MCP tool: agent delegates a difficult task UP to the Master model (most powerful).
 * Flow: Minion gathers context → Master analyzes with tools → response to agent.
 *
 * Sesja 46: Full rewrite — uses MasterRunner with tool loop instead of single-call.
 */
import { MinionRunner } from '../core/MinionRunner.js';
import { MasterRunner } from '../core/MasterRunner.js';
import { createModelForRole } from '../utils/modelResolver.js';

/** @type {MinionRunner|null} Lazy-initialized singleton */
let _minionRunner = null;
/** @type {MasterRunner|null} Lazy-initialized singleton */
let _masterRunner = null;

export function createMasterTaskTool(app) {
    return {
        name: 'master_task',
        description: 'Deleguj trudne zadanie W GÓRĘ do Mastera — najmocniejszego modelu AI (np. Claude Opus, GPT-4). Dla zadań wymagających głębokiej analizy, kreatywności lub eksperckiej wiedzy.\n\nFLOW (domyślny):\n1. Minion zbiera kontekst z vaulta/pamięci (tańszy model)\n2. Kontekst + zadanie trafiają do Mastera\n3. Master analizuje i może używać narzędzi (plan_action, chat_todo, vault_write)\n\n3 TRYBY:\n- Domyślny: minion zbiera kontekst → Master analizuje\n- skip_minion=true: SAM dostarczasz kontekst w polu "context" (oszczędność gdy już masz dane)\n- minion_instructions: mówisz minionowi JAK i GDZIE szukać kontekstu\n\nKIEDY UŻYWAĆ:\n- Złożona analiza wymagająca głębokiego myślenia\n- Zadanie przekraczające Twoje możliwości (np. tani model nie ogarnia)\n- User prosi o ekspercką opinię, strategię, plan\n- Porównanie wielu dokumentów, synteza wiedzy\n\nKIEDY NIE UŻYWAĆ:\n- Proste pytania — odpowiedz sam\n- Zbieranie danych bez analizy → minion_task\n- Master nie jest skonfigurowany → sprawdź ustawienia',
        inputSchema: {
            type: 'object',
            properties: {
                task: {
                    type: 'string',
                    description: 'Precyzyjny opis zadania dla Mastera. Co ma przeanalizować? Jaką odpowiedź oczekujesz? Np. "Przeanalizuj 5 notatek o strategii i zaproponuj plan działania na Q2"'
                },
                master: {
                    type: 'string',
                    description: 'Opcjonalnie: nazwa mastera (np. "strateg", "redaktor"). Puste = domyślny master agenta.'
                },
                context: {
                    type: 'string',
                    description: 'Dodatkowy kontekst (fragment notatki, wynik narzędzia, dane). Przy skip_minion=true to JEDYNY kontekst — zadbaj żeby był kompletny.'
                },
                skip_minion: {
                    type: 'boolean',
                    description: 'true = pomiń miniona, sam dostarczasz kontekst. Przydatne gdy masz już zebrane dane i chcesz oszczędzić czas/tokeny.'
                },
                minion_instructions: {
                    type: 'string',
                    description: 'Instrukcje dla miniona JAK zbierać kontekst. Przykłady: "Przeszukaj min. 10 notatek z Projekty/", "Zbierz WSZYSTKIE notatki o budżecie", "Szukaj w brain.md i ostatnich 5 sesjach"'
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

                // --- Resolve which master to use ---
                const requestedMasterName = args.master || activeAgent.defaultMaster?.name;
                let masterConfig = null;

                if (!requestedMasterName) {
                    const available = activeAgent.getMasterNames?.() || [];
                    if (available.length > 0) {
                        // Has masters but no default — hint to AI
                        console.log(`[MasterTask] Brak domyślnego mastera, dostępni: ${available.join(', ')}. Fallback do global.`);
                    }
                }

                if (requestedMasterName) {
                    // Resolve with per-agent overrides
                    masterConfig = agentManager.resolveMasterConfig
                        ? agentManager.resolveMasterConfig(requestedMasterName, activeAgent)
                        : agentManager.masterLoader?.getMaster(requestedMasterName);
                    if (!masterConfig) {
                        const available = agentManager.masterLoader?.getAllMasters().map(m => m.name).join(', ') || 'brak';
                        return {
                            success: false,
                            error: `Master "${requestedMasterName}" nie znaleziony. Dostępne: ${available}`
                        };
                    }
                }

                // --- Create master model ---
                const masterModel = createModelForRole(plugin, 'master', activeAgent, masterConfig);
                if (!masterModel?.stream) {
                    return {
                        success: false,
                        error: 'Master nie skonfigurowany. Ustaw model Master w ustawieniach pluginu (Modele → Master).'
                    };
                }

                // --- Gather context via Minion (unless skip_minion) ---
                let minionContext = '';
                let minionSkipped = !!args.skip_minion;

                if (!minionSkipped) {
                    try {
                        const defaultMinionName = activeAgent.defaultMinion?.name;
                        if (defaultMinionName && activeAgent.minionEnabled !== false) {
                            const minionConfig = agentManager.resolveMinionConfig
                                ? agentManager.resolveMinionConfig(defaultMinionName, activeAgent)
                                : agentManager.minionLoader?.getMinion(defaultMinionName);
                            const minionModel = createModelForRole(plugin, 'minion', activeAgent, minionConfig);
                            const model = minionModel || (plugin.env?.smart_chat_model?.stream ? plugin.env.smart_chat_model : null);

                            if (model?.stream && plugin.toolRegistry) {
                                // Lazy-init MinionRunner
                                if (!_minionRunner) {
                                    _minionRunner = new MinionRunner({
                                        toolRegistry: plugin.toolRegistry,
                                        app: app,
                                        plugin: plugin
                                    });
                                }

                                const contextTask = args.minion_instructions
                                    ? `${args.minion_instructions}\n\nKontekst pytania: "${args.task}". Zwróć surowe dane bez analizy.`
                                    : `Zbierz kontekst do następującego pytania/zadania: "${args.task}". Przeszukaj vault i pamięć, zbierz wszystkie istotne informacje. Zwróć surowe dane bez analizy.`;

                                const prepResult = await _minionRunner.runTask(
                                    contextTask,
                                    activeAgent,
                                    minionConfig || {},
                                    model,
                                    { workMode: plugin.currentWorkMode }
                                );

                                if (prepResult?.result) {
                                    minionContext = prepResult.result;
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('[MasterTaskTool] Minion context gathering failed, proceeding without:', e.message);
                    }
                }

                // --- Build combined prompt for Master ---
                const promptParts = [];

                if (minionContext) {
                    promptParts.push('--- Kontekst z vaulta (zebrany przez miniona) ---');
                    // Truncate if too long
                    const maxContextLen = 8000;
                    if (minionContext.length > maxContextLen) {
                        promptParts.push(minionContext.slice(0, maxContextLen) + '\n[...skrócono]');
                    } else {
                        promptParts.push(minionContext);
                    }
                    promptParts.push('--- Koniec kontekstu ---');
                }

                if (args.context) {
                    promptParts.push('\n--- Dodatkowy kontekst od agenta ---');
                    promptParts.push(args.context);
                    promptParts.push('--- Koniec dodatkowego kontekstu ---');
                }

                promptParts.push(`\n--- Zadanie ---`);
                promptParts.push(args.task);
                promptParts.push('--- Koniec zadania ---');

                const combinedPrompt = promptParts.join('\n');

                // --- Execute via MasterRunner (with tool loop) ---
                if (!_masterRunner && plugin.toolRegistry) {
                    _masterRunner = new MasterRunner({
                        toolRegistry: plugin.toolRegistry,
                        app: app,
                        plugin: plugin
                    });
                }

                if (!_masterRunner) {
                    return { success: false, error: 'Nie można zainicjalizować MasterRunner' };
                }

                // Use masterConfig if resolved, otherwise create a generic config
                const effectiveConfig = masterConfig || {
                    name: 'master',
                    description: 'Ekspert AI do głębokiej analizy',
                    tools: ['plan_action', 'chat_todo', 'vault_write'],
                    max_iterations: 5,
                    min_iterations: 2,
                    prompt: ''
                };

                const masterResult = await _masterRunner.runTask(
                    combinedPrompt,
                    activeAgent,
                    effectiveConfig,
                    masterModel,
                    { workMode: plugin.currentWorkMode }
                );

                return {
                    success: true,
                    result: masterResult.result,
                    tools_used: masterResult.toolsUsed,
                    tool_call_details: masterResult.toolCallDetails || [],
                    duration_ms: masterResult.duration,
                    usage: masterResult.usage || null,
                    context_gathered: !!minionContext,
                    minion_skipped: minionSkipped,
                    source: 'master'
                };

            } catch (e) {
                console.error('[MasterTaskTool] Error:', e);
                return { success: false, error: e.message };
            }
        }
    };
}
