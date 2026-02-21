/**
 * SkillExecuteTool
 * MCP tool: activates a skill and returns its full prompt/instructions
 */

export function createSkillExecuteTool(app) {
    return {
        name: 'skill_execute',
        description: 'Aktywuj skill po nazwie - zwraca pełne instrukcje skilla. Najpierw użyj skill_list żeby zobaczyć dostępne skille.',
        inputSchema: {
            type: 'object',
            properties: {
                skill_name: {
                    type: 'string',
                    description: 'Nazwa skilla do aktywacji (np. "daily-review")'
                }
            },
            required: ['skill_name']
        },
        execute: async (args, app, plugin) => {
            try {
                const agentManager = plugin?.agentManager;
                if (!agentManager) {
                    return { success: false, error: 'AgentManager not available' };
                }

                const skillName = args.skill_name;
                if (!skillName) {
                    return { success: false, error: 'Nie podano nazwy skilla. Użyj skill_list żeby zobaczyć dostępne.' };
                }

                // Check if skill exists in central library
                const skill = agentManager.skillLoader.getSkill(skillName);
                if (!skill) {
                    return {
                        success: false,
                        error: `Skill "${skillName}" nie istnieje. Użyj skill_list żeby zobaczyć dostępne skille.`
                    };
                }

                // Check if skill is assigned to this agent
                const activeAgent = agentManager.getActiveAgent();
                if (activeAgent?.skills?.length > 0 && !activeAgent.skills.includes(skillName)) {
                    return {
                        success: false,
                        error: `Skill "${skillName}" nie jest przypisany do agenta ${activeAgent.name}. Dostępne: ${activeAgent.skills.join(', ')}`
                    };
                }

                return {
                    success: true,
                    name: skill.name,
                    description: skill.description,
                    category: skill.category,
                    prompt: skill.prompt
                };
            } catch (e) {
                return { success: false, error: e.message };
            }
        }
    };
}
