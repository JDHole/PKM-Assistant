import { TFile } from 'obsidian';
import { isProtectedPath } from '../utils/keySanitizer.js';

export function createVaultWriteTool(app) {
    return {
        name: 'vault_write',
        description: 'Stwórz nową notatkę lub zmodyfikuj istniejącą w vaultcie użytkownika.\n\nTRYBY (mode):\n- "create" — nowy plik (błąd jeśli już istnieje)\n- "append" — dopisz na KOŃCU istniejącego pliku (np. dodaj sekcję, wpis do dziennika)\n- "prepend" — dopisz na POCZĄTKU istniejącego pliku\n- "replace" — zastąp CAŁĄ zawartość (uwaga: nadpisuje wszystko! jeśli plik nie istnieje, tworzy nowy)\n\nKIEDY UŻYWAĆ:\n- User prosi "stwórz notatkę", "zapisz to", "dodaj do pliku X"\n- Po analizie/pracy: zapisanie wyników do notatki\n- Aktualizacja plików konfiguracyjnych (.pkm-assistant/)\n\nKIEDY NIE UŻYWAĆ:\n- Nie nadpisuj notatek usera bez pytania — preferuj append zamiast replace\n- Do zapisu w pamięci agenta → użyj memory_update\n\nUWAGI:\n- Ścieżka musi zawierać rozszerzenie (np. .md)\n- Pliki systemowe (.smart-env/) są zablokowane\n- Operacja wymaga uprawnień vault.write — user zobaczy modal zatwierdzenia',
        inputSchema: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Ścieżka pliku relatywna do roota vaulta. Musi zawierać rozszerzenie. Przykłady: "Notatki/nowy-pomysł.md", "Dziennik/2026-02-24.md"'
                },
                content: {
                    type: 'string',
                    description: 'Treść do zapisania. Dla trybu append/prepend: treść która zostanie DODANA do istniejącej. Dla replace/create: pełna zawartość pliku. Używaj markdown.'
                },
                mode: {
                    type: 'string',
                    enum: ['create', 'append', 'prepend', 'replace'],
                    description: 'Tryb zapisu. "create" = nowy plik (błąd jeśli istnieje). "append" = dopisz na końcu. "prepend" = dopisz na początku. "replace" = nadpisz całość (UWAGA: kasuje starą treść!). Domyślnie: replace'
                }
            },
            required: ['path', 'content']
        },
        execute: async (args, app) => {
            try {
                const { path, content } = args;
                if (!path || typeof path !== 'string') {
                    throw new Error('Path is required and must be a string');
                }
                if (typeof content !== 'string') { // Allow empty string content
                    throw new Error('Content must be a string');
                }

                if (isProtectedPath(path)) {
                    throw new Error('Brak dostępu do plików konfiguracji systemu');
                }

                const mode = args.mode || 'replace';
                let file = app.vault.getAbstractFileByPath(path);

                if (file && !(file instanceof TFile)) {
                    throw new Error(`Path ${path} exists but is not a file (likely a folder)`);
                }

                // Check if path is in a hidden/unindexed folder (e.g. .pkm-assistant)
                const isHiddenPath = path.startsWith('.') || path.includes('/.');

                let finalContent = content;
                let bytesWritten = 0;

                // For hidden paths, use adapter directly (Obsidian doesn't index these)
                if (isHiddenPath) {
                    const fileExists = await app.vault.adapter.exists(path);
                    if (mode === 'create' && fileExists) {
                        throw new Error(`File ${path} already exists. Use mode "replace", "append", or "prepend" to modify it.`);
                    }
                    if (mode === 'append' || mode === 'prepend') {
                        if (!fileExists) throw new Error(`File ${path} does not exist. Cannot ${mode}.`);
                        const oldContent = await app.vault.adapter.read(path);
                        finalContent = mode === 'append' ? oldContent + content : content + oldContent;
                    }
                    await app.vault.adapter.write(path, finalContent);
                    return { success: true, path, mode, bytesWritten: finalContent.length };
                }

                if (mode === 'create') {
                    if (file) {
                        throw new Error(`File ${path} already exists. Use mode "replace", "append", or "prepend" to modify it.`);
                    }
                    const createdFile = await app.vault.create(path, finalContent);
                    bytesWritten = content.length;
                    return {
                        success: true,
                        path: createdFile.path,
                        mode: 'create',
                        bytesWritten
                    };
                }

                if (!file) {
                    if (mode === 'replace') {
                        // Treat as create
                        const createdFile = await app.vault.create(path, finalContent);
                        return {
                            success: true,
                            path: createdFile.path,
                            mode: 'replace (created)',
                            bytesWritten: finalContent.length
                        };
                    } else {
                        throw new Error(`File ${path} does not exist. Cannot ${mode}.`);
                    }
                }

                // File exists, proceed with modify
                const oldContent = await app.vault.read(file);

                if (mode === 'replace') {
                    finalContent = content;
                } else if (mode === 'append') {
                    finalContent = oldContent + content;
                } else if (mode === 'prepend') {
                    finalContent = content + oldContent;
                } else {
                    throw new Error(`Unknown mode: ${mode}`);
                }

                await app.vault.modify(file, finalContent);
                bytesWritten = content.length; // Bytes added/written roughly

                return {
                    success: true,
                    path: file.path,
                    mode,
                    bytesWritten
                };

            } catch (error) {
                console.error('[VaultWriteTool] Error:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }
    };
}
