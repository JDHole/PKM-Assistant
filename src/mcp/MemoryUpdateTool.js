/**
 * MCP tool for managing agent's brain (long-term memory).
 * Supports: read_brain, update_brain, delete_from_brain.
 * All writes go through AgentMemory.memoryWrite() for audit trail.
 */
export function createMemoryUpdateTool(app) {
    return {
        name: 'memory_update',
        description: 'Manage your long-term memory (brain.md). Use when user says "zapamiętaj", "zapomnij", "co o mnie wiesz" etc. Operations: read_brain, update_brain, delete_from_brain.',
        inputSchema: {
            type: 'object',
            properties: {
                operation: {
                    type: 'string',
                    enum: ['read_brain', 'update_brain', 'delete_from_brain'],
                    description: 'Operation to perform. read_brain: see current memory. update_brain: add/update a fact. delete_from_brain: remove a fact.'
                },
                content: {
                    type: 'string',
                    description: 'For update_brain: the fact to remember (e.g. "User lubi kawę"). For delete_from_brain: text to find and remove.'
                },
                section: {
                    type: 'string',
                    enum: ['## User', '## Preferencje', '## Ustalenia', '## Bieżące'],
                    description: 'Brain section to target. Default: ## User for facts about user, ## Preferencje for preferences, ## Ustalenia for decisions, ## Bieżące for current topics.'
                },
                old_content: {
                    type: 'string',
                    description: 'For update_brain when replacing an existing fact: the old text to find and replace.'
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
