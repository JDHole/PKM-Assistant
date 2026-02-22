/**
 * AgentDelegateTool
 * MCP tool: Propose delegation of conversation to another agent.
 * Does NOT switch automatically - returns delegation data for UI to render a button.
 */

export function createAgentDelegateTool(app) {
    return {
        name: 'agent_delegate',
        description: 'Zaproponuj przekazanie rozmowy innemu agentowi. NIE przełącza automatycznie - user musi kliknąć przycisk. Używaj gdy temat wykracza poza Twoje kompetencje lub user prosi o innego agenta.',
        inputSchema: {
            type: 'object',
            properties: {
                to_agent: {
                    type: 'string',
                    description: 'Nazwa agenta, któremu chcesz przekazać rozmowę'
                },
                reason: {
                    type: 'string',
                    description: 'Dlaczego przekazujesz (user zobaczy to przy przycisku)'
                },
                context_summary: {
                    type: 'string',
                    description: 'Podsumowanie dotychczasowej rozmowy dla nowego agenta'
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
                    const available = agentManager.getAllAgents().map(a => `${a.emoji} ${a.name}`).join(', ');
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
                    to_emoji: toAgent.emoji,
                    to_name: toAgent.name,
                    from_agent: fromName,
                    reason: args.reason || `${fromName} proponuje przekazanie rozmowy`,
                    context_summary: args.context_summary || '',
                    message: `Proponuję przekazanie rozmowy do ${toAgent.emoji} ${toAgent.name}. Kliknij przycisk poniżej żeby przejść do tego agenta.`
                };
            } catch (e) {
                return { success: false, error: e.message };
            }
        }
    };
}
