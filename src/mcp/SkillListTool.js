/**
 * SkillListTool
 * MCP tool: shows available skills for the active agent
 */

export function createSkillListTool(app) {
    return {
        name: 'skill_list',
        description: 'Wyświetl listę swoich skilli (gotowych procedur/instrukcji). Każdy skill to przepis krok-po-kroku na konkretne zadanie.\n\nKIEDY UŻYWAĆ:\n- User pyta "co umiesz?", "jakie masz skille?", "pokaż umiejętności"\n- Chcesz sprawdzić czy masz skill pasujący do zadania usera\n- Na początku sesji — sprawdź co masz do dyspozycji\n\nKIEDY NIE UŻYWAĆ:\n- Już wiesz jaki skill chcesz aktywować → od razu skill_execute\n- System prompt już zawiera listę skilli — sprawdź najpierw tam\n\nCO ZWRACA:\n- Lista skilli z: name (nazwa), description (opis), category (kategoria)\n- Użyj skill_execute z nazwą skilla żeby go aktywować',
        inputSchema: {
            type: 'object',
            properties: {
                category: {
                    type: 'string',
                    description: 'Filtruj po kategorii. Przykłady: "productivity", "writing", "organization", "analysis". Puste = wszystkie skille.'
                }
            },
            required: []
        },
        execute: async (args, app, plugin) => {
            try {
                const agentManager = plugin?.agentManager;
                if (!agentManager) {
                    return { success: false, error: 'AgentManager not available' };
                }

                let skills = agentManager.getActiveAgentSkills();

                // Filter by category if provided
                if (args.category) {
                    skills = skills.filter(s => s.category === args.category);
                }

                if (skills.length === 0) {
                    return {
                        success: true,
                        skills: [],
                        message: 'Brak dostępnych skilli' + (args.category ? ` w kategorii "${args.category}"` : '')
                    };
                }

                return {
                    success: true,
                    count: skills.length,
                    skills: skills.map(s => ({
                        name: s.name,
                        description: s.description,
                        category: s.category
                    }))
                };
            } catch (e) {
                return { success: false, error: e.message };
            }
        }
    };
}
