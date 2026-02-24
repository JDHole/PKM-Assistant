/**
 * MCP Tool: agora_project
 * Zarządzanie współdzielonymi projektami w Agorze
 * Create, update, tasks, comments, ping
 */

export function createAgoraProjectTool(app) {
    return {
        name: 'agora_project',
        description: 'Zarządzaj współdzielonymi projektami w Agorze — twórz, aktualizuj statusy, przypisuj zadania, komentuj, pinguj agentów.\n\nAKCJE:\n- "create" — nowy projekt (tytuł + opis + agenci)\n- "update_status" — zmień status projektu (active/paused/done)\n- "add_task" — dodaj zadanie do projektu (z przypisaniem do agenta)\n- "complete_task" — oznacz zadanie jako wykonane\n- "add_comment" — dodaj komentarz do projektu\n- "ping" — wyślij wiadomość do WSZYSTKICH agentów w projekcie (przez komunikator)\n\nKIEDY UŻYWAĆ:\n- User chce zorganizować pracę wielu agentów nad jednym tematem\n- Potrzebujesz koordynować zadania między agentami\n- Chcesz śledzić postęp wspólnej pracy\n\nKIEDY NIE UŻYWAĆ:\n- Prywatna lista zadań → chat_todo\n- Prywatny plan → plan_action\n- Wiadomość do jednego agenta → agent_message\n\nUPRAWNIENIA:\n- Tworzenie/aktualizacja/zadania: contributor lub admin\n- Ping: wszyscy (nie wymaga uprawnień write)\n- Ty (twórca) jesteś automatycznie dodawany do projektu',
        inputSchema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create', 'update_status', 'add_task', 'complete_task', 'add_comment', 'ping'],
                    description: '"create" = nowy projekt. "update_status" = zmień status. "add_task" = dodaj zadanie. "complete_task" = wykonaj zadanie. "add_comment" = komentarz. "ping" = powiadom agentów.'
                },
                title: {
                    type: 'string',
                    description: 'Tytuł projektu (TYLKO dla create). Przykład: "Reorganizacja vaulta", "Analiza produktywności"'
                },
                description: {
                    type: 'string',
                    description: 'Opis projektu (TYLKO dla create). Co to za projekt, jaki cel, jakie oczekiwania.'
                },
                agents: {
                    type: 'string',
                    description: 'Agenci zaangażowani w projekt, oddzieleni przecinkami (TYLKO dla create). Przykład: "Jaskier, Dexter, Lexie". Ty jesteś dodawany automatycznie.'
                },
                slug: {
                    type: 'string',
                    description: 'Slug (identyfikator) istniejącego projektu. WYMAGANY dla: update_status, add_task, complete_task, add_comment, ping. Pobierz z agora_read(projects_list).'
                },
                assignee: {
                    type: 'string',
                    description: 'Agent przypisany do zadania (dla add_task). Domyślnie: Ty. Przykład: "Dexter"'
                },
                task: {
                    type: 'string',
                    description: 'Treść zadania (dla add_task). Konkretnie co trzeba zrobić. Przykład: "Przeskanuj folder Archiwum/ i zaproponuj strukturę"'
                },
                task_index: {
                    type: 'number',
                    description: 'Indeks zadania (0-based) do oznaczenia jako wykonane (dla complete_task).'
                },
                status: {
                    type: 'string',
                    enum: ['active', 'paused', 'done'],
                    description: 'Nowy status projektu (dla update_status). "active" = w trakcie. "paused" = wstrzymany. "done" = zakończony.'
                },
                comment: {
                    type: 'string',
                    description: 'Treść komentarza (dla add_comment). Informacja, postęp, pytanie.'
                },
                message: {
                    type: 'string',
                    description: 'Wiadomość ping (dla ping). Wysyłana do WSZYSTKICH agentów w projekcie przez komunikator.'
                },
                note: {
                    type: 'string',
                    description: 'Dodatkowa notatka (opcjonalna, dla update_status i complete_task).'
                }
            },
            required: ['action']
        },
        execute: async (args, _app, plugin) => {
            const agora = plugin?.agoraManager;
            if (!agora) {
                return { isError: true, error: 'AgoraManager nie jest zainicjalizowany.' };
            }

            const agentName = plugin?.agentManager?.activeAgent?.name || 'Unknown';

            // Check project write permission
            const canWrite = await agora.canWrite(agentName, 'projects');
            if (!canWrite && args.action !== 'ping') {
                return {
                    isError: true,
                    error: `Agent "${agentName}" nie ma uprawnień do zarządzania projektami.`
                };
            }

            try {
                switch (args.action) {
                    case 'create': {
                        if (!args.title || !args.description) {
                            return { isError: true, error: 'Wymagane: title, description.' };
                        }
                        const agentsList = args.agents
                            ? args.agents.split(',').map(a => a.trim()).filter(Boolean)
                            : [agentName];
                        // Ensure creator is included
                        if (!agentsList.includes(agentName)) {
                            agentsList.unshift(agentName);
                        }
                        const result = await agora.createProject(
                            args.title,
                            args.description,
                            agentsList,
                            null,
                            agentName
                        );
                        return result;
                    }

                    case 'update_status': {
                        if (!args.slug || !args.status) {
                            return { isError: true, error: 'Wymagane: slug, status.' };
                        }
                        return await agora.updateProjectStatus(args.slug, args.status, args.note);
                    }

                    case 'add_task': {
                        if (!args.slug || !args.task) {
                            return { isError: true, error: 'Wymagane: slug, task.' };
                        }
                        const assignee = args.assignee || agentName;
                        return await agora.addTask(args.slug, assignee, args.task);
                    }

                    case 'complete_task': {
                        if (!args.slug || args.task_index === undefined) {
                            return { isError: true, error: 'Wymagane: slug, task_index.' };
                        }
                        return await agora.completeTask(args.slug, args.task_index, args.note);
                    }

                    case 'add_comment': {
                        if (!args.slug || !args.comment) {
                            return { isError: true, error: 'Wymagane: slug, comment.' };
                        }
                        return await agora.addComment(args.slug, agentName, args.comment);
                    }

                    case 'ping': {
                        if (!args.slug || !args.message) {
                            return { isError: true, error: 'Wymagane: slug, message.' };
                        }
                        const komunikator = plugin?.agentManager?.komunikatorManager;
                        if (!komunikator) {
                            return { isError: true, error: 'KomunikatorManager niedostępny.' };
                        }
                        return await agora.pingAgents(args.slug, agentName, args.message, komunikator);
                    }

                    default:
                        return { isError: true, error: `Nieznana akcja: ${args.action}` };
                }
            } catch (e) {
                return { isError: true, error: `Błąd projektu Agory: ${e.message}` };
            }
        }
    };
}
