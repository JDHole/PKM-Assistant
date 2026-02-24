import { TFile } from 'obsidian';

export function createVaultDeleteTool(app) {
    return {
        name: 'vault_delete',
        description: 'Usuń notatkę z vaulta użytkownika. OPERACJA NIEODWRACALNA (chyba że trash=true).\n\nDOMYŚLNIE plik trafia do kosza systemowego (trash=true) — user może go odzyskać.\nUstaw trash=false TYLKO gdy user wyraźnie prosi o trwałe usunięcie.\n\nKIEDY UŻYWAĆ:\n- User wyraźnie prosi "usuń plik X", "skasuj notatkę Y"\n- Czyszczenie duplikatów lub pustych plików na prośbę usera\n\nKIEDY NIE UŻYWAĆ:\n- NIGDY nie usuwaj plików bez wyraźnej prośby usera\n- Nie usuwaj plików konfiguracyjnych (.pkm-assistant/) bez potwierdzenia\n- Nie usuwaj folderów — to narzędzie działa tylko na pojedyncze pliki\n\nUWAGI:\n- Wymaga uprawnień vault.delete — user zobaczy modal zatwierdzenia\n- Nie można usunąć folderów, tylko pliki\n- Pliki systemowe (.smart-env/) są zablokowane',
        inputSchema: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Ścieżka pliku do usunięcia, relatywna do roota vaulta. Przykład: "Archiwum/stara-notatka.md"'
                },
                trash: {
                    type: 'boolean',
                    description: 'true (domyślnie) = przenieś do kosza systemowego (odwracalne). false = trwałe usunięcie (NIEODWRACALNE). Zawsze preferuj true.'
                }
            },
            required: ['path']
        },
        execute: async (args, app) => {
            try {
                const { path } = args;
                if (!path || typeof path !== 'string') {
                    throw new Error('Path is required and must be a string');
                }

                // Default trash to true if undefined
                const trash = args.trash !== false;

                const file = app.vault.getAbstractFileByPath(path);

                if (!file) {
                    throw new Error(`File ${path} not found`);
                }

                if (!(file instanceof TFile)) {
                    throw new Error(`Path ${path} is not a file (it might be a folder)`);
                }

                if (trash) {
                    // trash(file, system: boolean)
                    // Prompt says: "true = system trash" for usage: app.vault.trash(file, true)
                    await app.vault.trash(file, true);
                } else {
                    await app.vault.delete(file);
                }

                return {
                    success: true,
                    path: file.path,
                    trashedToSystem: trash
                };

            } catch (error) {
                console.error('[VaultDeleteTool] Error:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }
    };
}
