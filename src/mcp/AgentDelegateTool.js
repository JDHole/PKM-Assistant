/**
 * AgentDelegateTool
 * MCP tool: Propose delegation of conversation to another agent.
 * Does NOT switch automatically - returns delegation data for UI to render a button.
 */

export function createAgentDelegateTool(app) {
    return {
        name: 'agent_delegate',
        description: 'Zaproponuj PRZEKAZANIE rozmowy innemu agentowi. W chacie pojawi się przycisk — user decyduje czy przełączyć. NIE przełącza automatycznie!\n\nKIEDY UŻYWAĆ:\n- Temat rozmowy wykracza poza Twoje kompetencje (np. user prosi o analizę techniczną a Ty jesteś orchestratorem)\n- User wprost prosi o innego agenta ("chcę rozmawiać z Dexterem")\n- Zadanie lepiej pasuje do specjalizacji innego agenta\n\nKIEDY NIE UŻYWAĆ:\n- Chcesz tylko POINFORMOWAĆ innego agenta → użyj agent_message\n- Nie ma innego agenta w systemie\n- User nie chce zmieniać agenta\n\nJAK DZIAŁA:\n1. Tworzysz propozycję delegacji z powodem i podsumowaniem\n2. W chacie pojawia się przycisk "Przejdź do [Agent]"\n3. User klika → sesja zapisana → nowy agent dostaje kontekst\n4. Nowy agent zaczyna z podsumowaniem Twojej rozmowy\n\nWAŻNE:\n- ZAWSZE podaj context_summary — bez niego nowy agent nie wie o czym rozmawialiście\n- Aktywne artefakty (todo, plany) są automatycznie przekazywane',
        inputSchema: {
            type: 'object',
            properties: {
                to_agent: {
                    type: 'string',
                    description: 'Nazwa agenta docelowego. Musi być dokładna (case-sensitive). Przykłady: "Jaskier", "Dexter", "Lexie"'
                },
                reason: {
                    type: 'string',
                    description: 'Powód delegacji — user ZOBACZY to przy przycisku. Pisz krótko i zrozumiale. Np. "Dexter lepiej zna się na organizacji vaulta"'
                },
                context_summary: {
                    type: 'string',
                    description: 'WAŻNE: Podsumowanie dotychczasowej rozmowy dla nowego agenta. Bez tego nowy agent nie będzie miał kontekstu. Pisz zwięźle: co user chciał, co ustaliliście, co pozostało do zrobienia.'
                }
            },
            required: ['to_agent']
        },

        execute: async (args, app, plugin) => {
            try {
                const agentManager = plugin?.agentManager;
                if (!agentManager) {
                    return { success: false, error: 'AgentManager niedostępny' };
                }

                // Validate recipient exists
                const toAgent = agentManager.getAgent(args.to_agent);
                if (!toAgent) {
                    const available = agentManager.getAllAgents().map(a => a.name).join(', ');
                    return {
                        success: false,
                        error: `Agent "${args.to_agent}" nie istnieje. Dostępni agenci: ${available}`
                    };
                }

                const fromAgent = agentManager.getActiveAgent();
                const fromName = fromAgent?.name || 'System';

                // Send context message to recipient's inbox (if context provided)
                const komunikator = agentManager.komunikatorManager;
                if (komunikator && args.context_summary) {
                    await komunikator.writeMessage(
                        fromName,
                        args.to_agent,
                        `Delegacja rozmowy od ${fromName}`,
                        args.context_summary,
                        args.reason || ''
                    );
                    agentManager._emit('communicator:message_sent', {
                        from: fromName,
                        to: args.to_agent,
                        type: 'delegation'
                    });
                }

                // Return delegation proposal - chat_view.js will render a button
                return {
                    success: true,
                    delegation: true,
                    to_agent: args.to_agent,
                    to_name: toAgent.name,
                    from_agent: fromName,
                    reason: args.reason || `${fromName} proponuje przekazanie rozmowy`,
                    context_summary: args.context_summary || '',
                    message: `Proponuję przekazanie rozmowy do ${toAgent.name}. Kliknij przycisk poniżej żeby przejść do tego agenta.`
                };
            } catch (e) {
                return { success: false, error: e.message };
            }
        }
    };
}
