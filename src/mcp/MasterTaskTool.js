/**
 * MasterTaskTool
 * MCP tool: agent delegates a difficult task UP to the Master model (most powerful).
 * Flow: Minion gathers context → prompt is built → Master answers → response goes directly to user.
 */
import { MinionRunner } from '../core/MinionRunner.js';
import { streamToComplete } from '../memory/streamHelper.js';
import { createModelForRole } from '../utils/modelResolver.js';

/** @type {MinionRunner|null} Lazy-initialized singleton */
let _minionRunner = null;

export function createMasterTaskTool(app) {
    return {
        name: 'master_task',
        description: 'Deleguj trudne zadanie W GÓRĘ do Mastera — najmocniejszego modelu AI (np. Claude Opus, GPT-4). Dla zadań wymagających głębokiej analizy, kreatywności lub eksperckiej wiedzy.\n\nFLOW (domyślny):\n1. Minion zbiera kontekst z vaulta/pamięci (tańszy model)\n2. Kontekst + zadanie trafiają do Mastera\n3. Master analizuje i odpowiada\n\n3 TRYBY:\n- Domyślny: minion zbiera kontekst → Master analizuje\n- skip_minion=true: SAM dostarczasz kontekst w polu "context" (oszczędność gdy już masz dane)\n- minion_instructions: mówisz minionowi JAK i GDZIE szukać kontekstu\n\nKIEDY UŻYWAĆ:\n- Złożona analiza wymagająca głębokiego myślenia\n- Zadanie przekraczające Twoje możliwości (np. tani model nie ogarnia)\n- User prosi o ekspercką opinię, strategię, plan\n- Porównanie wielu dokumentów, synteza wiedzy\n\nKIEDY NIE UŻYWAĆ:\n- Proste pytania — odpowiedz sam\n- Zbieranie danych bez analizy → minion_task\n- Master nie jest skonfigurowany → sprawdź ustawienia\n\nROZNICA vs minion_task:\n- minion_task = delegacja W DÓŁ (tańszy model, zbieranie danych)\n- master_task = delegacja W GÓRĘ (droższy model, głęboka analiza)',
        inputSchema: {
            type: 'object',
            properties: {
                task: {
                    type: 'string',
                    description: 'Precyzyjny opis zadania dla Mastera. Co ma przeanalizować? Jaką odpowiedź oczekujesz? Np. "Przeanalizuj 5 notatek o strategii i zaproponuj plan działania na Q2"'
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
                // 1. Create Master model
                const activeAgent = plugin?.agentManager?.getActiveAgent();
                const masterModel = createModelForRole(plugin, 'master', activeAgent);
                if (!masterModel?.stream) {
                    return {
                        success: false,
                        error: 'Master nie skonfigurowany. Ustaw model Master w ustawieniach pluginu (Modele → Master).'
                    };
                }

                // 2. Gather context via Minion (unless skip_minion)
                let minionContext = '';
                let minionSkipped = !!args.skip_minion;

                if (!minionSkipped) {
                    try {
                        const agentManager = plugin?.agentManager;

                        if (activeAgent?.minion && activeAgent.minionEnabled !== false) {
                            const minionConfig = agentManager?.minionLoader?.getMinion(activeAgent.minion);
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

                                // Use custom instructions or default
                                const contextTask = args.minion_instructions
                                    ? `${args.minion_instructions}\n\nKontekst pytania: "${args.task}". Zwróć surowe dane bez analizy.`
                                    : `Zbierz kontekst do następującego pytania/zadania: "${args.task}". Przeszukaj vault i pamięć, zbierz wszystkie istotne informacje. Zwróć surowe dane bez analizy.`;

                                const prepResult = await _minionRunner.runTask(
                                    contextTask,
                                    activeAgent,
                                    minionConfig || {},
                                    model
                                );

                                if (prepResult?.result) {
                                    minionContext = prepResult.result;
                                }
                            }
                        }
                    } catch (e) {
                        // Minion failed - continue without context
                        console.warn('[MasterTaskTool] Minion context gathering failed, proceeding without:', e.message);
                    }
                }

                // 3. Build rich prompt for Master
                const promptParts = [];
                promptParts.push('Jesteś ekspertem AI. Odpowiedz wyczerpująco na poniższe zadanie.');

                if (minionContext) {
                    promptParts.push('\n--- Kontekst z vaulta (zebrany przez asystenta) ---');
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
                promptParts.push('\nOdpowiedz po polsku, wyczerpująco i merytorycznie.');

                const masterMessages = [
                    { role: 'user', content: promptParts.join('\n') }
                ];

                // 4. Call Master model
                const masterResponse = await streamToComplete(masterModel, masterMessages);

                return {
                    success: true,
                    result: masterResponse.text,
                    usage: masterResponse.usage,
                    context_gathered: !!minionContext,
                    minion_skipped: minionSkipped,
                    minion_context: minionSkipped
                        ? '(pominięty - agent dostarczył własny kontekst)'
                        : minionContext
                            ? (minionContext.length > 500 ? minionContext.slice(0, 500) + '...[skrócono]' : minionContext)
                            : '(minion nie zebrał kontekstu)',
                    source: 'master'
                };

            } catch (e) {
                console.error('[MasterTaskTool] Error:', e);
                return { success: false, error: e.message };
            }
        }
    };
}
