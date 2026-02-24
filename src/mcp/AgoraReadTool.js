/**
 * MCP Tool: agora_read
 * Czytanie z Agory - profil, mapa vaulta, aktywność, projekty
 */

export function createAgoraReadTool(app) {
    return {
        name: 'agora_read',
        description: 'Czytaj ze wspólnej bazy wiedzy agentów (Agora). Agora zawiera: profil użytkownika, mapę vaulta, tablicę aktywności agentów i współdzielone projekty.\n\nSEKCJE:\n- "profile" — profil użytkownika (kim jest, zainteresowania, cele, wartości, ustalenia)\n- "vault_map" — mapa vaulta (struktura, strefy, ważne foldery)\n- "activity" — tablica aktywności (co robili inni agenci, wnioski, zalecane akcje)\n- "project" — konkretny współdzielony projekt (wymaga project_slug)\n- "projects_list" — lista wszystkich projektów z ich statusami\n\nKIEDY UŻYWAĆ:\n- Na początku sesji: sprawdź profil usera i aktywność innych agentów\n- Potrzebujesz kontekstu o userze (kim jest, co robi, jakie ma cele)\n- Chcesz wiedzieć co robili inni agenci (tablica aktywności)\n- Szukasz informacji o współdzielonym projekcie\n- Chcesz poznać strukturę vaulta (mapa)\n\nKIEDY NIE UŻYWAĆ:\n- Szukasz w notatkach usera → vault_search\n- Szukasz we własnej pamięci → memory_search\n\nUWAGI:\n- Dane z Agory są WSPÓLNE dla WSZYSTKICH agentów\n- Profil budowany automatycznie z interakcji (agent → agora_update)\n- Część kontekstu Agory jest już wstrzykiwana do system promptu automatycznie',
        inputSchema: {
            type: 'object',
            properties: {
                section: {
                    type: 'string',
                    enum: ['profile', 'vault_map', 'activity', 'project', 'projects_list'],
                    description: '"profile" = profil usera. "vault_map" = mapa vaulta. "activity" = co robili agenci. "project" = konkretny projekt (wymaga project_slug). "projects_list" = lista projektów.'
                },
                project_slug: {
                    type: 'string',
                    description: 'Slug (identyfikator) projektu. WYMAGANY dla section="project". Pobierz slug z projects_list. Przykład: "reorganizacja-vaulta"'
                },
                limit: {
                    type: 'number',
                    description: 'Limit wpisów aktywności (tylko dla section="activity"). Domyślnie 10. Max 30.'
                }
            },
            required: ['section']
        },
        execute: async (args, _app, plugin) => {
            const agora = plugin?.agoraManager;
            if (!agora) {
                return { isError: true, error: 'AgoraManager nie jest zainicjalizowany.' };
            }

            try {
                switch (args.section) {
                    case 'profile': {
                        const profile = await agora.readProfile();
                        return { success: true, content: profile || '(profil pusty)' };
                    }
                    case 'vault_map': {
                        const map = await agora.readVaultMap();
                        return { success: true, content: map || '(mapa vaulta pusta)' };
                    }
                    case 'activity': {
                        const entries = await agora.readActivity(args.limit || 10);
                        if (entries.length === 0) {
                            return { success: true, content: '(brak wpisów aktywności)' };
                        }
                        const formatted = entries.map(e => {
                            let line = `${e.agent} (${e.date}): ${e.summary}`;
                            if (e.conclusions) line += `\nWnioski: ${e.conclusions}`;
                            if (e.actions) line += `\nAkcje: ${e.actions}`;
                            return line;
                        }).join('\n---\n');
                        return { success: true, content: formatted, count: entries.length };
                    }
                    case 'project': {
                        if (!args.project_slug) {
                            return { isError: true, error: 'Wymagany project_slug dla section=project.' };
                        }
                        const project = await agora.getProject(args.project_slug);
                        if (!project) {
                            return { isError: true, error: `Projekt "${args.project_slug}" nie istnieje.` };
                        }
                        return {
                            success: true,
                            title: project.title,
                            status: project.status,
                            agents: project.agents,
                            tasks: project.tasks,
                            content: project.content
                        };
                    }
                    case 'projects_list': {
                        // Get agent name from plugin context
                        const agentName = plugin?.agentManager?.activeAgent?.name;
                        const projects = await agora.listProjects(agentName);
                        if (projects.length === 0) {
                            return { success: true, content: '(brak projektów)' };
                        }
                        const list = projects.map(p =>
                            `- ${p.title} [${p.status}] (slug: ${p.slug}, agenci: ${p.agents.join(', ')})`
                        ).join('\n');
                        return { success: true, content: list, count: projects.length };
                    }
                    default:
                        return { isError: true, error: `Nieznana sekcja: ${args.section}` };
                }
            } catch (e) {
                return { isError: true, error: `Błąd odczytu Agory: ${e.message}` };
            }
        }
    };
}
