/**
 * SkillListTool
 * MCP tool: shows available skills for the active agent
 */

export function createSkillListTool(app) {
    return {
        name: 'skill_list',
        description: 'Pokaż listę dostępnych umiejętności (skilli) agenta - nazwy i opisy. Użyj żeby sprawdzić jakie skille masz do dyspozycji.',
        inputSchema: {
            type: 'object',
            properties: {
                category: {
                    type: 'string',
                    description: 'Opcjonalnie filtruj po kategorii (np. productivity, writing, organization)'
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
