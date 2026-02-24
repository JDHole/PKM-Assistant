/**
 * PlanTool - MCP tool for managing creation plans (step-by-step artifacts) in chat.
 * Agent creates a plan, user approves, agent executes step by step.
 * Each step can have subtasks (checklist items).
 * State stored on plugin instance (_planStore).
 */
export function createPlanTool(app) {
    return {
        name: 'plan_action',
        description: 'Zarządzaj wieloetapowymi planami działania w chacie. Widget z krokami, statusami i podzadaniami renderuje się w rozmowie.\n\nAKCJE:\n- "create" — stwórz nowy plan (tytuł + kroki + opcjonalne podzadania)\n- "update_step" — zmień status kroku (pending → in_progress → done / skipped)\n- "add_subtask" — dodaj podzadanie (checkbox) do kroku\n- "toggle_subtask" — odhacz/odznacz podzadanie\n- "get" — pobierz aktualny stan planu\n- "list" — pokaż WSZYSTKIE istniejące plany z ich ID\n\nKIEDY UŻYWAĆ:\n- User prosi o plan: "zaplanuj mi...", "zrób plan na...", "jakie kroki..."\n- Realizujesz złożone zadanie wymagające wielu etapów\n- Chcesz pokazać userowi postęp pracy (aktualizuj statusy w trakcie)\n\nKIEDY NIE UŻYWAĆ:\n- Prosta lista zakupów/zadań bez etapów → użyj chat_todo\n- Jednorazowa odpowiedź bez potrzeby śledzenia postępu\n\nSTATUSY KROKÓW:\n- "pending" — do zrobienia\n- "in_progress" — w trakcie realizacji\n- "done" — wykonane\n- "skipped" — pominięte\n\nTYPOWY FLOW:\n1. create (plan z krokami)\n2. User zatwierdza\n3. update_step (step 0 → in_progress)\n4. Wykonujesz krok...\n5. update_step (step 0 → done)\n6. Powtórz dla kolejnych kroków\n\nWAŻNE:\n- Przy update/add/toggle MUSISZ podać id planu. Nie znasz ID? Użyj akcji "list"\n- Kroki i podzadania numerowane od 0\n- Plany zapisywane automatycznie do .pkm-assistant/artifacts/ (przetrwają restart)',
        inputSchema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create', 'update_step', 'add_subtask', 'toggle_subtask', 'get', 'list'],
                    description: '"create" = nowy plan. "update_step" = zmień status kroku. "add_subtask" = dodaj podzadanie. "toggle_subtask" = odhacz podzadanie. "get" = pobierz stan. "list" = wszystkie plany z ID.'
                },
                id: {
                    type: 'string',
                    description: 'ID planu (format: "plan_1708123456789"). WYMAGANE dla: update_step, add_subtask, toggle_subtask, get. Nie znasz ID? Użyj action="list".'
                },
                title: {
                    type: 'string',
                    description: 'Tytuł planu (tylko dla create). Przykład: "Reorganizacja vaulta", "Plan tygodnia"'
                },
                steps: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            label: { type: 'string', description: 'Nazwa kroku — krótko i konkretnie' },
                            description: { type: 'string', description: 'Szczegółowy opis co zrobić (opcjonalny)' },
                            subtasks: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Podzadania jako tablica stringów (opcjonalna). Renderowane jako checkboxy pod krokiem.'
                            }
                        }
                    },
                    description: 'Lista kroków (tylko dla create). Każdy krok: {label: "Nazwa", description?: "Opis", subtasks?: ["Pod1", "Pod2"]}'
                },
                step_index: {
                    type: 'number',
                    description: 'Indeks kroku (0-based). Dla: update_step, add_subtask, toggle_subtask.'
                },
                status: {
                    type: 'string',
                    enum: ['pending', 'in_progress', 'done', 'skipped'],
                    description: 'Nowy status kroku. Typowy flow: pending → in_progress → done. Dla: update_step.'
                },
                note: {
                    type: 'string',
                    description: 'Notatka o wykonaniu kroku (opcjonalna). Widoczna w widgecie. Dla: update_step.'
                },
                subtask_text: {
                    type: 'string',
                    description: 'Tekst nowego podzadania. Dla: add_subtask.'
                },
                subtask_index: {
                    type: 'number',
                    description: 'Indeks podzadania (0-based). Dla: toggle_subtask.'
                }
            },
            required: ['action']
        },
        execute: async (args, app, plugin) => {
            const planStore = plugin._planStore || (plugin._planStore = new Map());
            const { action } = args;

            // Helper: auto-save artifact to disk (fire-and-forget)
            const _persist = (plan) => {
                if (plugin.artifactManager) {
                    const createdBy = plan.createdBy
                        || plugin.agentManager?.getActiveAgent()?.name
                        || 'unknown';
                    plan.createdBy = createdBy;
                    plugin.artifactManager.save({
                        type: 'plan', id: plan.id, title: plan.title,
                        data: plan, createdBy
                    }).catch(e => console.warn('[PlanTool] Auto-save failed:', e));
                }
            };

            if (action === 'create') {
                const id = 'plan_' + Date.now();
                const steps = (args.steps || []).map(s => ({
                    label: typeof s === 'string' ? s : (s.label || ''),
                    description: typeof s === 'string' ? '' : (s.description || ''),
                    status: 'pending',
                    note: '',
                    subtasks: Array.isArray(s.subtasks)
                        ? s.subtasks.map(st => ({ text: typeof st === 'string' ? st : (st.text || ''), done: false }))
                        : []
                }));
                const plan = {
                    id, title: args.title || 'Plan', steps, approved: false,
                    createdBy: plugin.agentManager?.getActiveAgent()?.name || 'unknown'
                };
                planStore.set(id, plan);
                _persist(plan);
                return { type: 'plan_artifact', ...plan };
            }

            if (action === 'update_step') {
                const plan = planStore.get(args.id);
                if (!plan) return { isError: true, error: 'Plan nie znaleziony: ' + args.id };
                const step = plan.steps[args.step_index];
                if (!step) return { isError: true, error: 'Krok nie znaleziony: ' + args.step_index };
                if (args.status) step.status = args.status;
                if (args.note) step.note = args.note;
                _persist(plan);
                return { type: 'plan_artifact', ...plan };
            }

            if (action === 'add_subtask') {
                const plan = planStore.get(args.id);
                if (!plan) return { isError: true, error: 'Plan nie znaleziony: ' + args.id };
                const step = plan.steps[args.step_index];
                if (!step) return { isError: true, error: 'Krok nie znaleziony: ' + args.step_index };
                if (!step.subtasks) step.subtasks = [];
                step.subtasks.push({ text: args.subtask_text || 'Podzadanie', done: false });
                _persist(plan);
                return { type: 'plan_artifact', ...plan };
            }

            if (action === 'toggle_subtask') {
                const plan = planStore.get(args.id);
                if (!plan) return { isError: true, error: 'Plan nie znaleziony: ' + args.id };
                const step = plan.steps[args.step_index];
                if (!step) return { isError: true, error: 'Krok nie znaleziony: ' + args.step_index };
                const subtask = step.subtasks?.[args.subtask_index];
                if (!subtask) return { isError: true, error: 'Podzadanie nie znalezione: ' + args.subtask_index };
                subtask.done = !subtask.done;
                _persist(plan);
                return { type: 'plan_artifact', ...plan };
            }

            if (action === 'get') {
                const plan = planStore.get(args.id);
                return plan ? { type: 'plan_artifact', ...plan } : { isError: true, error: 'Plan nie znaleziony' };
            }

            if (action === 'list') {
                const summaries = [];
                for (const [id, plan] of planStore) {
                    const done = plan.steps?.filter(s => s.status === 'done').length || 0;
                    const total = plan.steps?.length || 0;
                    summaries.push({
                        id, title: plan.title, progress: `${done}/${total}`,
                        approved: plan.approved, createdBy: plan.createdBy || 'unknown'
                    });
                }
                return { type: 'plan_list_summary', count: summaries.length, plans: summaries };
            }

            return { isError: true, error: 'Nieznana akcja: ' + action };
        }
    };
}
