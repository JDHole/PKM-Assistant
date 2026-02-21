import { TFile } from 'obsidian';

export function createVaultDeleteTool(app) {
    return {
        name: 'vault_delete',
        description: 'Delete a note from the vault. Use with caution.',
        inputSchema: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Path to the note to delete'
                },
                trash: {
                    type: 'boolean',
                    description: 'If true, move to system trash instead of permanent delete. Default: true'
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
