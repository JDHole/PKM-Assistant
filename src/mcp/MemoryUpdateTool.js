/**
 * MCP tool for managing agent's brain (long-term memory).
 * Supports: read_brain, update_brain, delete_from_brain.
 * All writes go through AgentMemory.memoryWrite() for audit trail.
 */
export function createMemoryUpdateTool(app) {
    return {
        name: 'memory_update',
        description: 'Zarządzaj swoją długoterminową pamięcią (brain.md). Brain to plik z trwałymi faktami o userze — przetrwa restart pluginu.\n\nOPERACJE:\n- "read_brain" — odczytaj aktualną zawartość brain.md (nie wymaga uprawnień write)\n- "update_brain" — dodaj nowy fakt lub zaktualizuj istniejący\n- "delete_from_brain" — usuń fakt z pamięci\n\nKIEDY UŻYWAĆ:\n- User mówi "zapamiętaj że...", "zapomnij o...", "co o mnie wiesz?"\n- Dowiedziałeś się czegoś ważnego o userze (imię, preferencje, cele, ustalenia)\n- User prosi żebyś coś zapamiętał na stałe\n\nKIEDY NIE UŻYWAĆ:\n- Do przeszukiwania pamięci → użyj memory_search\n- Do sprawdzenia statystyk → użyj memory_status\n- Do zapisu notatek usera → użyj vault_write\n\nSEKCJE BRAIN:\n- "## User" — fakty o userze (imię, zawód, zainteresowania)\n- "## Preferencje" — preferencje (styl komunikacji, ulubione narzędzia)\n- "## Ustalenia" — decyzje i ustalenia ("zawsze używaj X", "nigdy nie rób Y")\n- "## Bieżące" — aktualne tematy i kontekst\n\nFORMAT FAKTÓW:\n- Pisz w 3. osobie: "User lubi kawę" (nie "Lubisz kawę")\n- Każdy fakt = jeden punkt (bullet point)\n- ZAWSZE sprawdź read_brain przed dodaniem — nie dodawaj duplikatów!',
        inputSchema: {
            type: 'object',
            properties: {
                operation: {
                    type: 'string',
                    enum: ['read_brain', 'update_brain', 'delete_from_brain'],
                    description: '"read_brain" = odczytaj brain.md (bezpieczne, bez uprawnień write). "update_brain" = dodaj/zaktualizuj fakt. "delete_from_brain" = usuń fakt.'
                },
                content: {
                    type: 'string',
                    description: 'Dla update_brain: fakt do zapamiętania w 3. osobie (np. "User pracuje jako grafik"). Dla delete_from_brain: tekst do znalezienia i usunięcia.'
                },
                section: {
                    type: 'string',
                    enum: ['## User', '## Preferencje', '## Ustalenia', '## Bieżące'],
                    description: 'Sekcja brain.md. "## User" = fakty o userze (domyślnie). "## Preferencje" = preferencje. "## Ustalenia" = decyzje. "## Bieżące" = aktualny kontekst.'
                },
                old_content: {
                    type: 'string',
                    description: 'Tylko dla update_brain gdy AKTUALIZUJESZ istniejący fakt: stary tekst do zastąpienia. Np. old_content="User ma 2 koty", content="User ma 3 koty".'
                }
            },
            required: ['operation']
        },
        execute: async (args, app, plugin) => {
            try {
                const { operation, content, section, old_content } = args;

                // Get active agent's memory
                const agentManager = plugin?.agentManager;
                const agentMemory = agentManager?.getActiveMemory();
                if (!agentMemory) {
                    return { success: false, error: 'No active agent memory' };
                }

                switch (operation) {
                    case 'read_brain': {
                        const brain = await agentMemory.getBrain();
                        return {
                            success: true,
                            operation: 'read_brain',
                            content: brain
                        };
                    }

                    case 'update_brain': {
                        if (!content) {
                            return { success: false, error: 'content is required for update_brain' };
                        }

                        const category = old_content ? 'UPDATE' : 'CORE';
                        const targetSection = section || '## User';

                        const updates = [{
                            category,
                            content,
                            section: targetSection,
                            oldContent: old_content || null
                        }];

                        await agentMemory.memoryWrite(updates, null);

                        return {
                            success: true,
                            operation: 'update_brain',
                            message: `Zapamiętano: "${content}" w sekcji ${targetSection}`
                        };
                    }

                    case 'delete_from_brain': {
                        if (!content) {
                            return { success: false, error: 'content is required for delete_from_brain' };
                        }

                        const updates = [{
                            category: 'DELETE',
                            content,
                            section: section || null
                        }];

                        await agentMemory.memoryWrite(updates, null);

                        return {
                            success: true,
                            operation: 'delete_from_brain',
                            message: `Usunięto z pamięci: "${content}"`
                        };
                    }

                    default:
                        return { success: false, error: `Unknown operation: ${operation}` };
                }

            } catch (error) {
                console.error('[MemoryUpdateTool] Error:', error);
                return { success: false, error: error.message };
            }
        }
    };
}
