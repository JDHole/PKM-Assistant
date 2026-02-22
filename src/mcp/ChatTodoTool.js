/**
 * ChatTodoTool - MCP tool for managing interactive todo lists in chat.
 * Agent creates/updates checklists that render as interactive widgets.
 * State stored on plugin instance (_chatTodoStore).
 */
export function createChatTodoTool(app) {
    return {
        name: 'chat_todo',
        description: 'Stwórz lub zaktualizuj interaktywną listę zadań w chacie. Akcje: create (nowa lista), update (odhacz/odznacz element), add_item (dodaj element), remove_item (usuń element), save (zapisz jako notatka w vaultcie).',
        inputSchema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create', 'update', 'add_item', 'remove_item', 'save'],
                    description: 'Akcja do wykonania'
                },
                id: {
                    type: 'string',
                    description: 'ID listy (wymagane dla update/add_item/remove_item/save)'
                },
                title: {
                    type: 'string',
                    description: 'Tytuł listy (dla create)'
                },
                items: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Elementy listy (dla create)'
                },
                mode: {
                    type: 'string',
                    enum: ['temporary', 'persistent'],
                    description: 'temporary=tylko w chacie, persistent=zapisana do vaulta'
                },
                item_index: {
                    type: 'number',
                    description: 'Indeks elementu (dla update/remove_item)'
                },
                done: {
                    type: 'boolean',
                    description: 'Stan checkboxa (dla update)'
                },
                text: {
                    type: 'string',
                    description: 'Tekst elementu (dla add_item)'
                },
                path: {
                    type: 'string',
                    description: 'Ścieżka w vaultcie (dla save)'
                }
            },
            required: ['action']
        },
        execute: async (args, app, plugin) => {
            const todoStore = plugin._chatTodoStore || (plugin._chatTodoStore = new Map());
            const { action } = args;

            if (action === 'create') {
                const id = 'todo_' + Date.now();
                const items = (args.items || []).map(text => ({ text, done: false }));
                const todo = {
                    id,
                    title: args.title || 'Lista zadań',
                    items,
                    mode: args.mode || 'temporary'
                };
                todoStore.set(id, todo);
                return { type: 'todo_list', ...todo };
            }

            if (action === 'update') {
                const todo = todoStore.get(args.id);
                if (!todo) return { isError: true, error: 'Lista nie znaleziona: ' + args.id };
                if (args.item_index >= 0 && args.item_index < todo.items.length) {
                    todo.items[args.item_index].done = args.done ?? !todo.items[args.item_index].done;
                }
                return { type: 'todo_list', ...todo };
            }

            if (action === 'add_item') {
                const todo = todoStore.get(args.id);
                if (!todo) return { isError: true, error: 'Lista nie znaleziona: ' + args.id };
                todo.items.push({ text: args.text || 'Nowy element', done: false });
                return { type: 'todo_list', ...todo };
            }

            if (action === 'remove_item') {
                const todo = todoStore.get(args.id);
                if (!todo) return { isError: true, error: 'Lista nie znaleziona: ' + args.id };
                if (args.item_index >= 0 && args.item_index < todo.items.length) {
                    todo.items.splice(args.item_index, 1);
                }
                return { type: 'todo_list', ...todo };
            }

            if (action === 'save') {
                const todo = todoStore.get(args.id);
                if (!todo) return { isError: true, error: 'Lista nie znaleziona: ' + args.id };
                const md = `# ${todo.title}\n\n` + todo.items
                    .map(i => `- [${i.done ? 'x' : ' '}] ${i.text}`).join('\n') + '\n';
                const safeName = todo.title.replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ _-]/g, '').trim();
                const path = args.path || `${safeName || 'Lista zadań'}.md`;
                await app.vault.adapter.write(path, md);
                todo.mode = 'persistent';
                return { type: 'todo_list', savedTo: path, ...todo };
            }

            return { isError: true, error: 'Nieznana akcja: ' + action };
        }
    };
}
