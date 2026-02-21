import { TFolder, TFile } from 'obsidian';

export function createVaultListTool(app) {
    return {
        name: 'vault_list',
        description: 'List files and folders in a vault directory',
        inputSchema: {
            type: 'object',
            properties: {
                folder: {
                    type: 'string',
                    description: 'Folder path (relative to vault root). Use empty string or "/" for root.'
                },
                recursive: {
                    type: 'boolean',
                    description: 'If true, list files recursively. Default: false'
                }
            },
            required: []
        },
        execute: async (args, app) => {
            try {
                const folderPath = args.folder || '/';
                const recursive = args.recursive || false;

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
