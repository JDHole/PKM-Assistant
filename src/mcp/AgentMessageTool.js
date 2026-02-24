/**
 * AgentMessageTool
 * MCP tool: Send a message to another agent's inbox
 */

export function createAgentMessageTool(app) {
    return {
        name: 'agent_message',
        description: 'Wyślij wiadomość do innego agenta — trafia do jego skrzynki odbiorczej (inbox). Agent przeczyta ją na początku swojej następnej sesji.\n\nKIEDY UŻYWAĆ:\n- Chcesz poinformować innego agenta o czymś ważnym\n- User prosi "powiedz Dexterowi żeby...", "przekaż Lexie że..."\n- Chcesz poprosić innego agenta o pomoc w przyszłej sesji\n- Przekazujesz wyniki swojej pracy innemu agentowi\n\nKIEDY NIE UŻYWAĆ:\n- Chcesz PRZEKAZAĆ rozmowę (zmienić agenta) → użyj agent_delegate\n- Wiadomość jest pilna i potrzebna TERAZ → agent_delegate (natychmiast przełącza)\n\nJAK DZIAŁA:\n- Wiadomość zapisywana do pliku inbox agenta (.pkm-assistant/komunikator/)\n- Odbiorca przeczyta ją przy następnym auto-prep (start sesji)\n- Wiadomość ma status: NOWA → AI_READ → ALL_READ\n\nROZNICA vs agent_delegate:\n- agent_message = asynchroniczna wiadomość (jak email)\n- agent_delegate = natychmiastowe przekazanie rozmowy (jak przekierowanie telefonu)',
        inputSchema: {
            type: 'object',
            properties: {
                to_agent: {
                    type: 'string',
                    description: 'Nazwa agenta-odbiorcy. Musi być dokładna (case-sensitive). Przykłady: "Jaskier", "Dexter", "Lexie"'
                },
                subject: {
                    type: 'string',
                    description: 'Krótki temat wiadomości (1-2 zdania). Przykład: "Wyniki analizy vaulta", "Prośba o pomoc z projektem"'
                },
                content: {
                    type: 'string',
                    description: 'Pełna treść wiadomości. Pisz konkretnie — odbiorca nie ma kontekstu Twojej rozmowy.'
                },
                context: {
                    type: 'string',
                    description: 'Opcjonalny kontekst: ścieżka pliku, fragment notatki, dane pomocnicze. Np. "Dotyczy pliku: Projekty/plan-Q2.md"'
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
