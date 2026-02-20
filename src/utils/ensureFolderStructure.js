/**
 * Tworzy strukturę folderów .pkm-assistant/ w vaultcie jeśli nie istnieje
 * @param {import("obsidian").Vault} vault - Obsidian Vault object
 */
export async function ensureFolderStructure(vault) {
    const folders = [
        ".pkm-assistant",
        ".pkm-assistant/sessions",
        ".pkm-assistant/workflows"
    ];

    for (const folder of folders) {
        try {
            const exists = await vault.adapter.exists(folder);
            if (!exists) {
                await vault.adapter.mkdir(folder);
                console.log(`[PKM Assistant] Utworzono folder: ${folder}`);
            } else {
                // Folder już istnieje, nie robimy nic
                console.log(`[PKM Assistant] Folder już istnieje: ${folder}`);
            }
        } catch (error) {
            console.error(`[PKM Assistant] Błąd podczas tworzenia folderu ${folder}:`, error);
        }
    }
}
