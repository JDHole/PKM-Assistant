/**
 * AgentMessageTool
 * MCP tool: Send a message to another agent's inbox
 */

export function createAgentMessageTool(app) {
    return {
        name: 'agent_message',
        description: 'Wyślij wiadomość do innego agenta. Używaj gdy chcesz przekazać informacje, poprosić o pomoc, lub poinformować o czymś innego agenta.',
        inputSchema: {
            type: 'object',
            properties: {
                to_agent: {
                    type: 'string',
                    description: 'Nazwa agenta-odbiorcy (np. "Dexter", "Lexie")'
                },
                subject: {
                    type: 'string',
                    description: 'Temat wiadomości (krótko)'
                },
                content: {
                    type: 'string',
                    description: 'Treść wiadomości'
                },
                context: {
                    type: 'string',
                    description: 'Opcjonalny kontekst - ścieżka pliku, fragment notatki, dane'
                }
            },
            required: ['to_agent', 'subject', 'content']
        },

        execute: async (args, app, plugin) => {
            try {
                const agentManager = plugin?.agentManager;
                if (!agentManager) {
                    return { success: false, error: 'AgentManager niedostępny' };
                }

                const komunikator = agentManager.komunikatorManager;
                if (!komunikator) {
                    return { success: false, error: 'KomunikatorManager niedostępny' };
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

                // Get sender
                const fromAgent = agentManager.getActiveAgent();
                const fromName = fromAgent?.name || 'System';

                // Write message
                const messageId = await komunikator.writeMessage(
                    fromName,
                    args.to_agent,
                    args.subject,
                    args.content,
                    args.context || ''
                );

                // Emit event for UI refresh
                agentManager._emit('communicator:message_sent', {
                    from: fromName,
                    to: args.to_agent,
                    messageId
                });

                return {
                    success: true,
                    message: `Wiadomość wysłana do ${toAgent.emoji} ${toAgent.name}`,
                    messageId
                };
            } catch (e) {
                return { success: false, error: e.message };
            }
        }
    };
}
