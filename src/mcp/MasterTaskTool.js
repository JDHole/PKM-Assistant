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
        description: 'Deleguj trudne zadanie W GÓRĘ do Mastera (najmocniejszy model AI). Domyślnie minion zbiera kontekst, ale możesz to kontrolować: skip_minion=true żeby sam dostarczyć kontekst, albo minion_instructions żeby powiedzieć minionowi JAK szukać.',
        inputSchema: {
            type: 'object',
            properties: {
                task: {
                    type: 'string',
                    description: 'Opis zadania dla Mastera. Bądź precyzyjny - co dokładnie ma przeanalizować/odpowiedzieć.'
                },
                context: {
                    type: 'string',
                    description: 'Dodatkowy kontekst (np. fragment notatki, wynik poprzedniego narzędzia). Przy skip_minion=true to JEDYNY kontekst dla Mastera.'
                },
                skip_minion: {
                    type: 'boolean',
                    description: 'Pomiń miniona - sam dostarczasz kontekst w polu "context". Przydatne gdy już masz zebrane dane.'
                },
                minion_instructions: {
                    type: 'string',
                    description: 'Instrukcje dla miniona JAK zbierać kontekst. Np. "Przeszukaj minimum 10 notatek z folderu Projects/", "Szukaj w pamięci i w brain.md", "Zbierz WSZYSTKIE notatki o X - nie pomijaj żadnych".'
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
                    result: masterResponse,
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
