/**
 * MCP tool for showing agent's memory status.
 * Reports: brain size, session count, summary counts, audit log size.
 */
export function createMemoryStatusTool(app) {
    return {
        name: 'memory_status',
        description: 'Show your memory status - brain size, number of sessions, summaries, etc. Use when user asks "pokaż swoją pamięć", "ile pamiętasz" or similar.',
        inputSchema: {
            type: 'object',
            properties: {},
            required: []
        },
        execute: async (args, app, plugin) => {
            console.log('[MemoryStatusTool] Executing');
            try {
                const agentManager = plugin?.agentManager;
                const activeAgent = agentManager?.getActiveAgent();
                const agentMemory = agentManager?.getActiveMemory();

                if (!agentMemory || !activeAgent) {
                    return { success: false, error: 'No active agent memory' };
                }

                const adapter = app.vault.adapter;
                const basePath = agentMemory.basePath;

                // Brain size
                let brainSize = 0;
                let brainLines = 0;
                try {
                    if (await adapter.exists(agentMemory.paths.brain)) {
                        const brain = await adapter.read(agentMemory.paths.brain);
                        brainSize = brain.length;
                        brainLines = brain.split('\n').filter(l => l.trim()).length;
                    }
                } catch (e) { /* no brain yet */ }

                // Session count
                let sessionCount = 0;
                try {
                    const sessions = await agentMemory.listSessions();
                    sessionCount = sessions.length;
                } catch (e) { /* no sessions */ }

                // Summary counts
                const summaryCounts = {};
                for (const subdir of ['L1', 'L2']) {
                    try {
                        const listed = await adapter.list(`${basePath}/summaries/${subdir}`);
                        summaryCounts[subdir] = listed?.files?.filter(f => f.endsWith('.md')).length || 0;
                    } catch (e) {
                        summaryCounts[subdir] = 0;
                    }
                }

                // Brain archive
                let archiveSize = 0;
                try {
                    const archivePath = `${basePath}/brain_archive.md`;
                    if (await adapter.exists(archivePath)) {
                        const archive = await adapter.read(archivePath);
                        archiveSize = archive.length;
                    }
                } catch (e) { /* no archive */ }

                // Audit log
                let auditEntries = 0;
                try {
                    const logPath = `${basePath}/audit.log`;
                    if (await adapter.exists(logPath)) {
                        const log = await adapter.read(logPath);
                        auditEntries = log.split('\n').filter(l => l.trim()).length;
                    }
                } catch (e) { /* no log */ }

                return {
                    success: true,
                    agent: activeAgent.name,
                    brain: {
                        sizeChars: brainSize,
                        sizeTokensApprox: Math.round(brainSize / 4),
                        lines: brainLines
                    },
                    sessions: sessionCount,
                    summaries: summaryCounts,
                    archive: { sizeChars: archiveSize },
                    auditEntries
                };

            } catch (error) {
                console.error('[MemoryStatusTool] Error:', error);
                return { success: false, error: error.message };
            }
        }
    };
}
