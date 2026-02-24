import { TFolder, TFile } from 'obsidian';
import { isProtectedPath } from '../utils/keySanitizer.js';

export function createVaultListTool(app) {
    return {
        name: 'vault_list',
        description: 'Wylistuj pliki i foldery w katalogu vaulta. Zwraca nazwy, ścieżki i typy (plik/folder).\n\nKIEDY UŻYWAĆ:\n- User pyta "co mam w folderze X" lub "pokaż strukturę"\n- Potrzebujesz poznać strukturę vaulta zanim użyjesz vault_read\n- Szukasz konkretnego pliku po nazwie w znanym folderze\n\nKIEDY NIE UŻYWAĆ:\n- Szukasz treści wewnątrz plików → użyj vault_search\n- Szukasz w wielu folderach naraz → użyj vault_search lub deleguj minionowi\n\nUWAGI:\n- Domyślnie lista płaska (bez podfolderów). Ustaw recursive=true dla pełnego drzewa\n- Max 100 wyników (jeśli więcej, użyj konkretniejszego folderu)\n- Obsługuje ukryte foldery (.pkm-assistant/)\n- Pliki systemowe (.smart-env/) są zablokowane',
        inputSchema: {
            type: 'object',
            properties: {
                folder: {
                    type: 'string',
                    description: 'Ścieżka folderu relatywna do roota vaulta. Pusty string lub "/" = root vaulta. Przykłady: "Projekty", "Dziennik/2026", ".pkm-assistant/skills"'
                },
                recursive: {
                    type: 'boolean',
                    description: 'true = listuj rekursywnie (wszystkie podkatalogi). false (domyślnie) = tylko bezpośrednia zawartość folderu'
                }
            },
            required: []
        },
        execute: async (args, app) => {
            try {
                const folderPath = args.folder || '/';
                const recursive = args.recursive || false;

                if (isProtectedPath(folderPath)) {
                    return { success: false, error: 'Brak dostępu do plików konfiguracji systemu' };
                }

                let files = [];
                let targetFolder;

                if (folderPath === '/' || folderPath === '') {
                    targetFolder = app.vault.getRoot();
                } else {
                    targetFolder = app.vault.getAbstractFileByPath(folderPath);
                }

                if (!targetFolder) {
                    // Fallback: try adapter for hidden/unindexed folders (e.g. .pkm-assistant)
                    try {
                        const listed = await app.vault.adapter.list(folderPath);
                        const files = [
                            ...(listed.folders || []).map(f => ({ name: f.split('/').pop(), path: f, isFolder: true })),
                            ...(listed.files || []).map(f => ({ name: f.split('/').pop(), path: f, isFolder: false }))
                        ];
                        return { success: true, folder: folderPath, files, count: files.length, totalCount: files.length };
                    } catch (adapterErr) {
                        return { success: false, error: `Folder not found: ${folderPath}` };
                    }
                }

                if (!(targetFolder instanceof TFolder)) {
                    return { success: false, error: `Path is not a folder: ${folderPath}` };
                }

                if (recursive) {
                    // Recursive listing using getFiles()
                    const allFiles = app.vault.getFiles();

                    // If root, take all. If subfolder, filter by path prefix.
                    if (folderPath === '/' || folderPath === '') {
                        files = allFiles;
                    } else {
                        // Ensure folder path doesn't have trailing slash for comparison, 
                        // or handle it correctly. TFile.path contains full path.
                        const prefix = folderPath === '/' ? '' : folderPath + '/';
                        files = allFiles.filter(f => f.path.startsWith(prefix));
                    }

                    // Map TFile to output format
                    files = files.map(file => ({
                        name: file.name,
                        path: file.path,
                        isFolder: false,
                        extension: file.extension
                    }));

                } else {
                    // shallow listing using children
                    const children = targetFolder.children;
                    files = children.map(child => ({
                        name: child.name,
                        path: child.path,
                        isFolder: child instanceof TFolder,
                        extension: (child instanceof TFile) ? child.extension : undefined
                    }));
                }

                // Limit results
                const MAX_RESULTS = 100;
                const totalCount = files.length;
                if (files.length > MAX_RESULTS) {
                    files = files.slice(0, MAX_RESULTS);
                }

                return {
                    success: true,
                    folder: targetFolder.path,
                    files: files,
                    count: files.length,
                    totalCount: totalCount // informative if truncated
                };

            } catch (err) {
                console.error('[VaultListTool] Error listing files:', err);
                return { success: false, error: err.message };
            }
        }
    };
}
