import { TFile } from 'obsidian';
import { isProtectedPath } from '../utils/keySanitizer.js';

export function createVaultReadTool(app) {
    return {
        name: 'vault_read',
        description: 'Odczytaj zawartość notatki z vaulta użytkownika po ścieżce. Zwraca pełny tekst pliku markdown.\n\nKIEDY UŻYWAĆ:\n- Gdy potrzebujesz przeczytać konkretną notatkę (znasz ścieżkę)\n- Gdy user prosi "pokaż mi notatkę X" lub "co jest w pliku Y"\n- Do odczytu plików konfiguracyjnych z .pkm-assistant/\n\nKIEDY NIE UŻYWAĆ:\n- Nie znasz ścieżki → najpierw vault_list lub vault_search\n- Szukasz treści w wielu plikach → użyj vault_search\n- Szukasz we własnej pamięci → użyj memory_search\n\nUWAGI:\n- Ścieżki relatywne do roota vaulta (np. "Projekty/mój-projekt.md")\n- Obsługuje ukryte foldery (.pkm-assistant/) przez adapter\n- Pliki systemowe (.smart-env/) są zablokowane\n- Zwraca {success, content, path} lub {success: false, error}',
        inputSchema: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Ścieżka do pliku relatywna do roota vaulta. Przykłady: "Notatki/dziennik.md", "Projekty/pomysły.md", ".pkm-assistant/agents/jaskier/memory/brain.md"'
                }
            },
            required: ['path']
        },
        execute: async (args, app) => {
            try {
                if (!args.path) {
                    return { success: false, error: 'Path is required' };
                }

                if (isProtectedPath(args.path)) {
                    return { success: false, error: 'Brak dostępu do plików konfiguracji systemu' };
                }

                const file = app.vault.getAbstractFileByPath(args.path);

                if (!file) {
                    // Fallback: try adapter for hidden/unindexed paths (e.g. .pkm-assistant)
                    try {
                        const content = await app.vault.adapter.read(args.path);
                        return { success: true, content, path: args.path };
                    } catch (adapterErr) {
                        return { success: false, error: `File not found: ${args.path}` };
                    }
                }

                if (!(file instanceof TFile)) {
                    return { success: false, error: `Path is not a file: ${args.path}` };
                }

                const content = await app.vault.read(file);

                return { success: true, content, path: file.path };

            } catch (err) {
                console.error('[VaultReadTool] Error reading file:', err);
                return { success: false, error: err.message };
            }
        }
    };
}
