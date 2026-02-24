/**
 * ChatTodoTool - MCP tool for managing interactive todo lists in chat.
 * Agent creates/updates checklists that render as interactive widgets.
 * State stored on plugin instance (_chatTodoStore).
 */
export function createChatTodoTool(app) {
    return {
        name: 'chat_todo',
        description: 'Zarządzaj interaktywnymi listami zadań (todo) w chacie. Widget z checkboxami renderuje się w rozmowie — user może klikać, edytować, dodawać elementy.\n\nAKCJE:\n- "create" — stwórz nową listę (tytuł + elementy)\n- "update" — odhacz/odznacz element (item_index + done)\n- "add_item" — dodaj nowy element do istniejącej listy\n- "remove_item" — usuń element z listy\n- "save" — zapisz listę jako notatkę markdown w vaultcie\n- "list" — pokaż WSZYSTKIE istniejące listy z ich ID\n\nKIEDY UŻYWAĆ:\n- User prosi o listę zadań, checklistę, plan zakupów itp.\n- Organizujesz kroki do wykonania (np. po skill_execute)\n- User mówi "zrób mi listę...", "dodaj do listy...", "odhacz punkt 3"\n\nKIEDY NIE UŻYWAĆ:\n- Wieloetapowy plan z statusami → użyj plan_action\n- Prosty tekst bez checkboxów → odpowiedz zwykłym tekstem\n\nWAŻNE:\n- Przy update/add_item/remove_item MUSISZ podać id listy. Nie znasz ID? Użyj akcji "list"\n- Elementy numerowane od 0 (item_index=0 = pierwszy element)\n- Listy zapisywane automatycznie do .pkm-assistant/artifacts/ (przetrwają restart)',
        inputSchema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create', 'update', 'add_item', 'remove_item', 'save', 'list'],
                    description: '"create" = nowa lista. "update" = zmień checkbox. "add_item" = dodaj element. "remove_item" = usuń element. "save" = zapisz do vaulta. "list" = pokaż wszystkie listy z ID.'
                },
                id: {
                    type: 'string',
                    description: 'ID listy (format: "todo_1708123456789"). WYMAGANE dla: update, add_item, remove_item, save. Nie znasz ID? Użyj action="list".'
                },
                title: {
                    type: 'string',
                    description: 'Tytuł listy (tylko dla create). Przykład: "Zakupy na weekend", "Kroki do projektu"'
                },
                items: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Elementy listy (tylko dla create). Tablica stringów. Przykład: ["Kupić mleko", "Zadzwonić do dentysty", "Napisać raport"]'
                },
                mode: {
                    type: 'string',
                    enum: ['temporary', 'persistent'],
                    description: '"temporary" (domyślnie) = tylko w chacie. "persistent" = od razu zapisana też w vaultcie.'
                },
                item_index: {
                    type: 'number',
                    description: 'Indeks elementu (0-based). Pierwszy element = 0, drugi = 1 itd. Dla: update, remove_item.'
                },
                done: {
                    type: 'boolean',
                    description: 'true = odhacz checkbox, false = odznacz. Dla akcji update.'
                },
                text: {
                    type: 'string',
                    description: 'Tekst nowego elementu. Dla akcji add_item.'
                },
                path: {
                    type: 'string',
                    description: 'Ścieżka do zapisania w vaultcie. Dla akcji save. Przykład: "Listy/zakupy.md". Domyślnie: nazwa listy + .md'
                }
            },
            required: ['action']
        },
        execute: async (args, app, plugin) => {
            const todoStore = plugin._chatTodoStore || (plugin._chatTodoStore = new Map());
            const { action } = args;

            // Helper: auto-save artifact to disk (fire-and-forget)
            const _persist = (todo) => {
                if (plugin.artifactManager) {
                    const createdBy = todo.createdBy
                        || plugin.agentManager?.getActiveAgent()?.name
                        || 'unknown';
                    todo.createdBy = createdBy;
                    plugin.artifactManager.save({
                        type: 'todo', id: todo.id, title: todo.title,
                        data: todo, createdBy
                    }).catch(e => console.warn('[ChatTodoTool] Auto-save failed:', e));
                }
            };

            if (action === 'create') {
                const id = 'todo_' + Date.now();
                const items = (args.items || []).map(text => ({ text, done: false }));
                const createdBy = plugin.agentManager?.getActiveAgent()?.name || 'unknown';
                const todo = {
                    id,
                    title: args.title || 'Lista zadań',
                    items,
                    mode: args.mode || 'temporary',
                    createdBy
                };
                todoStore.set(id, todo);
                _persist(todo);
                return { type: 'todo_list', ...todo };
            }

            if (action === 'update') {
                const todo = todoStore.get(args.id);
                if (!todo) return { isError: true, error: 'Lista nie znaleziona: ' + args.id };
                if (args.item_index >= 0 && args.item_index < todo.items.length) {
                    todo.items[args.item_index].done = args.done ?? !todo.items[args.item_index].done;
                }
                _persist(todo);
                return { type: 'todo_list', ...todo };
            }

            if (action === 'add_item') {
                const todo = todoStore.get(args.id);
                if (!todo) return { isError: true, error: 'Lista nie znaleziona: ' + args.id };
                todo.items.push({ text: args.text || 'Nowy element', done: false });
                _persist(todo);
                return { type: 'todo_list', ...todo };
            }

            if (action === 'remove_item') {
                const todo = todoStore.get(args.id);
                if (!todo) return { isError: true, error: 'Lista nie znaleziona: ' + args.id };
                if (args.item_index >= 0 && args.item_index < todo.items.length) {
                    todo.items.splice(args.item_index, 1);
                }
                _persist(todo);
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
                _persist(todo);
                return { type: 'todo_list', savedTo: path, ...todo };
            }

            if (action === 'list') {
                const summaries = [];
                for (const [id, todo] of todoStore) {
                    const done = todo.items?.filter(i => i.done).length || 0;
                    const total = todo.items?.length || 0;
                    summaries.push({
                        id, title: todo.title, progress: `${done}/${total}`,
                        createdBy: todo.createdBy || 'unknown'
                    });
                }
                return { type: 'todo_list_summary', count: summaries.length, todos: summaries };
            }

            return { isError: true, error: 'Nieznana akcja: ' + action };
        }
    };
}
