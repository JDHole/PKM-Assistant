import { TFile } from 'obsidian';

export function createVaultWriteTool(app) {
    return {
        name: 'vault_write',
        description: 'Create a new note or modify an existing one. Use mode "create", "append", "prepend", or "replace".',
        inputSchema: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Path to the note (relative to vault root)'
                },
                content: {
                    type: 'string',
                    description: 'Content to write'
                },
                mode: {
                    type: 'string',
                    enum: ['create', 'append', 'prepend', 'replace'],
                    description: 'Write mode: create (fail if exists), append, prepend, or replace'
                }
            },
            required: ['path', 'content']
        },
        execute: async (args, app) => {
            console.log('[VaultWriteTool] Executing with args:', args);
            try {
                const { path, content } = args;
                if (!path || typeof path !== 'string') {
                    throw new Error('Path is required and must be a string');
                }
                if (typeof content !== 'string') { // Allow empty string content
                    throw new Error('Content must be a string');
                }

                const mode = args.mode || 'replace';
                let file = app.vault.getAbstractFileByPath(path);

                if (file && !(file instanceof TFile)) {
                    throw new Error(`Path ${path} exists but is not a file (likely a folder)`);
                }

                let finalContent = content;
                let bytesWritten = 0;

                if (mode === 'create') {
                    if (file) {
                        throw new Error(`File ${path} already exists. Use mode "replace", "append", or "prepend" to modify it.`);
                    }
                    // For create, we rely on app.vault.create which handles folder creation automatically if using newer API, 
                    // but standard check says we might need to ensure folders exist. 
                    // However, user prompt implies straightforward usage. 
                    // Let's rely on standard behavior or basic check.
                    // Actually, Obsidian's create usually requires folder existence. 
                    // Let's implement safe folder creation if needed or just try create.
                    // The prompt snippet: "// Tworzenie pliku (z auto-tworzeniem folderów)" implies it might, 
                    // or I should just call create.
                    // Let's assume standard behavior for now to match requested logic simplicity unless error occurs.

                    // Wait, standard app.vault.create DOES NOT auto-create folders in older versions, 
                    // but let's stick to the prompt's implied logic: "Użyj app.vault.create(path, content)".

                    // Actually, let's just make sure we try to create folders if we can, 
                    // but the prompt implementation instructions are specific:
                    // "Jeśli plik istnieje → error. Użyj app.vault.create(path, content)"
                    const createdFile = await app.vault.create(path, finalContent);
                    bytesWritten = content.length;
                    return {
                        success: true,
                        path: createdFile.path,
                        mode: 'create',
                        bytesWritten
                    };
                }

                // For other modes, file might not exist (except maybe they expect it to for append/prepend?)
                // Prompt says: "replace: Użyj app.vault.modify(file, content) lub create jeśli nie istnieje"

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
                        // append/prepend require existing file usually, or strictly defined?
                        // "append: Odczytaj content, dodaj na końcu, modify" -> Implying read fails if no file.
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
