export function createVaultSearchTool(app) {
    return {
        name: 'vault_search',
        description: 'Search for notes in the vault by content or filename. For searching agent memory/past conversations, use memory_search instead.',
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Search query (text to find in notes)'
                },
                searchIn: {
                    type: 'string',
                    enum: ['content', 'filename', 'both'],
                    description: 'Where to search. Default: both'
                },
                folder: {
                    type: 'string',
                    description: 'Optional: limit search to specific folder'
                },
                limit: {
                    type: 'number',
                    description: 'Max results to return. Default: 20'
                }
            },
            required: ['query']
        },
        execute: async (args, app) => {
            try {
                const { query, folder } = args;
                if (!query || typeof query !== 'string') {
                    throw new Error('Query is required and must be a string');
                }

                const searchIn = args.searchIn || 'both';
                const limit = Math.min(args.limit || 20, 50);
                const queryLower = query.toLowerCase();

                const allFiles = app.vault.getMarkdownFiles();

                let candidates = allFiles;
                if (folder) {
                    candidates = candidates.filter(f => f.path.startsWith(folder));
                }

                const results = [];

                for (const file of candidates) {
                    if (results.length >= limit) break;

                    let matchType = null;
                    let snippet = null;

                    if (searchIn === 'filename' || searchIn === 'both') {
                        if (file.basename.toLowerCase().includes(queryLower)) {
                            matchType = 'filename';
                        }
                    }

                    let contentMatch = false;

                    if (searchIn === 'content' || searchIn === 'both') {
                        const content = await app.vault.cachedRead(file);
                        const contentLower = content.toLowerCase();
                        const idx = contentLower.indexOf(queryLower);

                        if (idx !== -1) {
                            contentMatch = true;
                            const start = Math.max(0, idx - 75);
                            const end = Math.min(content.length, idx + query.length + 75);
                            snippet = content.substring(start, end).replace(/\n/g, ' ');
                            if (start > 0) snippet = '...' + snippet;
                            if (end < content.length) snippet = snippet + '...';
                        }
                    }

                    if (matchType === 'filename' && contentMatch) {
                        matchType = 'both';
                    } else if (!matchType && contentMatch) {
                        matchType = 'content';
                    }

                    if (matchType) {
                        results.push({ path: file.path, matchType, snippet });
                    }
                }

                return {
                    success: true,
                    query,
                    results,
                    count: results.length
                };

            } catch (error) {
                console.error('[VaultSearchTool] Error:', error);
                return { success: false, error: error.message };
            }
        }
    };
}
