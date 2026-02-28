/**
 * SkillExecuteTool
 * MCP tool: activates a skill and returns its full prompt/instructions
 */

export function createSkillExecuteTool(app) {
    return {
        name: 'skill_execute',
        description: 'Aktywuj skill po nazwie — zwraca PEŁNE instrukcje (prompt) skilla. Po otrzymaniu instrukcji WYKONUJ je krok po kroku.\n\nKIEDY UŻYWAĆ:\n- User kliknął guzik skilla w UI\n- User prosi o konkretne zadanie i masz pasujący skill (np. "zrób daily review")\n- Chcesz wykonać procedurę z gotowym przepisem\n\nJAK UŻYWAĆ:\n1. Wywołaj skill_execute z nazwą skilla\n2. Otrzymasz pełny prompt z instrukcjami\n3. WYKONUJ instrukcje — używaj narzędzi wg przepisu skilla\n4. Skill może wymagać vault_read, vault_write, vault_search itp.\n\nCO ZWRACA:\n- name, description, category — metadane\n- prompt — PEŁNE instrukcje do wykonania (to jest najważniejsze!)\n\nUWAGI:\n- Skill musi być przypisany do Twojego agenta\n- Jeśli nie znasz nazwy, użyj najpierw skill_list',
        inputSchema: {
            type: 'object',
            properties: {
                skill_name: {
                    type: 'string',
                    description: 'Dokładna nazwa skilla (case-sensitive). Przykłady: "daily-review", "vault-organization", "note-from-idea", "weekly-review"'
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

                const activeAgent = agentManager.getActiveAgent();

                // Check if skill is assigned to this agent
                if (activeAgent?.skills?.length > 0 && !activeAgent.skills.includes(skillName)) {
                    return {
                        success: false,
                        error: `Skill "${skillName}" nie jest przypisany do agenta ${activeAgent.name}. Dostępne: ${activeAgent.skills.join(', ')}`
                    };
                }

                // Resolve skill with per-agent overrides
                const skill = agentManager.resolveSkillConfig(skillName, activeAgent);
                if (!skill) {
                    return {
                        success: false,
                        error: `Skill "${skillName}" nie istnieje. Użyj skill_list żeby zobaczyć dostępne skille.`
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
