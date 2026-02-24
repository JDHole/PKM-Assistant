/**
 * MCP Tool: agora_update
 * Aktualizacja Agory - profil użytkownika, mapa vaulta, tablica aktywności
 * Sprawdza uprawnienia agenta (access.yaml)
 */

export function createAgoraUpdateTool(app) {
    return {
        name: 'agora_update',
        description: 'Aktualizuj wspólną bazę wiedzy agentów (Agora). Wymaga odpowiednich uprawnień (admin/contributor).\n\n3 SEKCJE DO AKTUALIZACJI:\n\n1. "profile" — profil użytkownika (8 sekcji: kim_jestem, zainteresowania, cele, wartosci, projekty, wyzwania, ustalenia, sukcesy)\n   - operation: "add" (dodaj), "update" (zmień), "delete" (usuń)\n   - Wymaga: profile_section + content (+ old_content dla update)\n   - Uprawnienia: admin\n\n2. "vault_map" — mapa vaulta (struktura, strefy, ważne foldery)\n   - Wymaga: map_section + content\n   - Uprawnienia: admin\n\n3. "activity" — wpis aktywności (co zrobiłeś w tej sesji)\n   - Wymaga: summary (+ opcjonalnie conclusions, actions)\n   - Uprawnienia: contributor lub admin\n   - Dodawaj wpis na KOŃCU sesji — podsumuj co zrobiłeś\n\nKIEDY UŻYWAĆ:\n- Dowiedziałeś się czegoś nowego o userze → zaktualizuj profil\n- Odkryłeś nową strukturę vaulta → zaktualizuj mapę\n- Na końcu sesji → dodaj wpis aktywności (żeby inni agenci wiedzieli co robiłeś)\n\nKIEDY NIE UŻYWAĆ:\n- Do zapisu w PRYWATNEJ pamięci agenta → memory_update\n- Do zapisu notatek usera → vault_write\n\nUPRAWNIENIA:\n- Sprawdzone automatycznie z access.yaml\n- Brak uprawnień → dostaniesz czytelny błąd z aktualnym poziomem dostępu',
        inputSchema: {
            type: 'object',
            properties: {
                section: {
                    type: 'string',
                    enum: ['profile', 'vault_map', 'activity'],
                    description: '"profile" = profil usera. "vault_map" = mapa vaulta. "activity" = wpis aktywności (podsumowanie sesji).'
                },
                operation: {
                    type: 'string',
                    enum: ['add', 'update', 'delete'],
                    description: 'Operacja (TYLKO dla section="profile"). "add" = dodaj nowy punkt. "update" = zmień istniejący (wymaga old_content). "delete" = usuń punkt.'
                },
                profile_section: {
                    type: 'string',
                    enum: ['kim_jestem', 'zainteresowania', 'cele', 'wartosci', 'projekty', 'wyzwania', 'ustalenia', 'sukcesy'],
                    description: 'Sekcja profilu (TYLKO dla section="profile"). Przykłady: "kim_jestem" = podstawowe info, "cele" = cele usera, "ustalenia" = decyzje i reguły.'
                },
                content: {
                    type: 'string',
                    description: 'Treść do dodania/aktualizacji. Dla profilu: konkretny fakt. Dla mapy: opis sekcji. Dla aktywności: nie używaj (użyj summary).'
                },
                old_content: {
                    type: 'string',
                    description: 'Stara treść do zastąpienia (TYLKO dla operation="update"). Musi dokładnie odpowiadać istniejącemu tekstowi.'
                },
                map_section: {
                    type: 'string',
                    description: 'Nazwa sekcji mapy vaulta (TYLKO dla section="vault_map"). Np. "Strefy użytkownika", "Projekty aktywne", "Archiwum"'
                },
                summary: {
                    type: 'string',
                    description: 'Podsumowanie sesji (TYLKO dla section="activity"). Co zrobiłeś, z czym pracowałeś. 2-3 zdania.'
                },
                conclusions: {
                    type: 'string',
                    description: 'Wnioski i odkrycia z sesji (opcjonalne, dla activity). Co nowego się dowiedziałeś.'
                },
                actions: {
                    type: 'string',
                    description: 'Zalecane akcje dla INNYCH agentów (opcjonalne, dla activity). Np. "Dexter powinien sprawdzić folder Projekty/"'
                }
            },
            required: ['section']
        },
        execute: async (args, _app, plugin) => {
            const agora = plugin?.agoraManager;
            if (!agora) {
                return { isError: true, error: 'AgoraManager nie jest zainicjalizowany.' };
            }

            const agentName = plugin?.agentManager?.activeAgent?.name || 'Unknown';
            const agentEmoji = plugin?.agentManager?.activeAgent?.emoji || '';

            try {
                switch (args.section) {
                    case 'profile': {
                        // Check write permission
                        const canWrite = await agora.canWrite(agentName, 'profile');
                        if (!canWrite) {
                            return {
                                isError: true,
                                error: `Agent "${agentName}" nie ma uprawnień do edycji profilu. Poziom dostępu: ${(await agora.getAccess(agentName)).level}. Wymagany: admin.`
                            };
                        }
                        if (!args.operation || !args.profile_section || !args.content) {
                            return { isError: true, error: 'Wymagane: operation, profile_section, content.' };
                        }
                        return await agora.updateProfile(
                            args.profile_section,
                            args.operation,
                            args.content,
                            args.old_content
                        );
                    }

                    case 'vault_map': {
                        const canWrite = await agora.canWrite(agentName, 'vault_map');
                        if (!canWrite) {
                            return {
                                isError: true,
                                error: `Agent "${agentName}" nie ma uprawnień do edycji mapy vaulta.`
                            };
                        }
                        if (!args.map_section || !args.content) {
                            return { isError: true, error: 'Wymagane: map_section, content.' };
                        }
                        return await agora.updateVaultMap(args.map_section, args.content);
                    }

                    case 'activity': {
                        const canWrite = await agora.canWrite(agentName, 'activity');
                        if (!canWrite) {
                            return {
                                isError: true,
                                error: `Agent "${agentName}" nie ma uprawnień do postowania aktywności.`
                            };
                        }
                        if (!args.summary) {
                            return { isError: true, error: 'Wymagane: summary (podsumowanie sesji).' };
                        }
                        return await agora.postActivity(
                            agentName,
                            agentEmoji,
                            args.summary,
                            args.conclusions || '',
                            args.actions || ''
                        );
                    }

                    default:
                        return { isError: true, error: `Nieznana sekcja: ${args.section}` };
                }
            } catch (e) {
                return { isError: true, error: `Błąd aktualizacji Agory: ${e.message}` };
            }
        }
    };
}
