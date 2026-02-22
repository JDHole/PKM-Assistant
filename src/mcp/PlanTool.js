/**
 * PlanTool - MCP tool for managing creation plans (step-by-step artifacts) in chat.
 * Agent creates a plan, user approves, agent executes step by step.
 * State stored on plugin instance (_planStore).
 */
export function createPlanTool(app) {
    return {
        name: 'plan_action',
        description: 'Stwórz lub zaktualizuj plan działania widoczny w chacie. Akcje: create (nowy plan z krokami), update_step (zmień status kroku), get (pobierz aktualny stan planu). User musi zatwierdzić plan przed wykonaniem.',
        inputSchema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create', 'update_step', 'get'],
                    description: 'Akcja do wykonania'
                },
                id: {
                    type: 'string',
                    description: 'ID planu (wymagane dla update_step/get)'
                },
                title: {
                    type: 'string',
                    description: 'Tytuł planu (dla create)'
                },
                steps: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            label: { type: 'string', description: 'Nazwa kroku' },
                            description: { type: 'string', description: 'Opis (opcjonalny)' }
                        }
                    },
                    description: 'Lista kroków (dla create). Każdy krok: {label, description?}'
                },
                step_index: {
                    type: 'number',
                    description: 'Indeks kroku (dla update_step)'
                },
                status: {
                    type: 'string',
                    enum: ['pending', 'in_progress', 'done', 'skipped'],
                    description: 'Nowy status kroku (dla update_step)'
                },
                note: {
                    type: 'string',
                    description: 'Notatka o wykonaniu kroku (opcjonalna, dla update_step)'
                }
            },
            required: ['action']
        },
        execute: async (args, app, plugin) => {
            const planStore = plugin._planStore || (plugin._planStore = new Map());
            const { action } = args;

            if (action === 'create') {
                const id = 'plan_' + Date.now();
                const steps = (args.steps || []).map(s => ({
                    label: typeof s === 'string' ? s : (s.label || ''),
                    description: typeof s === 'string' ? '' : (s.description || ''),
                    status: 'pending',
                    note: ''
                }));
                const plan = { id, title: args.title || 'Plan', steps, approved: false };
                planStore.set(id, plan);
                return { type: 'plan_artifact', ...plan };
            }

            if (action === 'update_step') {
                const plan = planStore.get(args.id);
                if (!plan) return { isError: true, error: 'Plan nie znaleziony: ' + args.id };
                const step = plan.steps[args.step_index];
                if (!step) return { isError: true, error: 'Krok nie znaleziony: ' + args.step_index };
                if (args.status) step.status = args.status;
                if (args.note) step.note = args.note;
                return { type: 'plan_artifact', ...plan };
            }

            if (action === 'get') {
                const plan = planStore.get(args.id);
                return plan ? { type: 'plan_artifact', ...plan } : { isError: true, error: 'Plan nie znaleziony' };
            }

            return { isError: true, error: 'Nieznana akcja: ' + action };
        }
    };
}
