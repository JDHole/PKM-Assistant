import { TFile } from 'obsidian';

export function createVaultReadTool(app) {
    return {
        name: 'vault_read',
        description: 'Read the content of a note from the vault by its path',
        inputSchema: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Path to the note (relative to vault root), e.g. "folder/note.md"'
                }
            },
            required: ['path']
        },
        execute: async (args, app) => {
            try {
                if (!args.path) {
                    return { success: false, error: 'Path is required' };
                }

                const file = app.vault.getAbstractFileByPath(args.path);

                if (!file) {
                    return { success: false, error: `File not found: ${args.path}` };
                }

                if (!(file instanceof TFile)) {
                    return { success: false, error: `Path is not a file: ${args.path}` };
                }

                const content = await app.vault.read(file);
                console.log(`[VaultReadTool] Read content of ${args.path}`);

                return { success: true, content, path: file.path };

            } catch (err) {
                console.error('[VaultReadTool] Error reading file:', err);
                return { success: false, error: err.message };
            }
        }
    };
}
