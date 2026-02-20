/**
 * AgentMemory - Hierarchical memory management per agent
 * 
 * Structure:
 * .pkm-assistant/agents/{agent_name}/memory/
 * ├── active_context.md     <- Current session
 * ├── sessions/             <- Individual sessions with summaries
 * ├── weekly/               <- Weekly summaries
 * ├── monthly/              <- Monthly summaries
 * └── yearly/               <- "Brain" - long-term memory
 */

import { formatToMarkdown, parseSessionFile } from './sessionParser.js';

export class AgentMemory {
    /**
     * @param {Object} vault - Obsidian Vault object
     * @param {string} agentName - Name of the agent
     * @param {Object} settings - Plugin settings
     */
    constructor(vault, agentName, settings = {}) {
        this.vault = vault;
        this.agentName = agentName;
        this.settings = settings;

        // Normalize agent name for filesystem
        this.safeName = agentName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        this.basePath = `.pkm-assistant/agents/${this.safeName}/memory`;

        // Paths
        this.paths = {
            sessions: `${this.basePath}/sessions`,
            weekly: `${this.basePath}/weekly`,
            monthly: `${this.basePath}/monthly`,
            yearly: `${this.basePath}/yearly`,
            activeContext: `${this.basePath}/active_context.md`,
            brain: `${this.basePath}/brain.md`
        };
    }

    /**
     * Initialize memory structure - create folders if needed
     */
    async initialize() {
        console.log(`[AgentMemory:${this.agentName}] Initializing memory structure`);

        const folders = [
            this.basePath,
            this.paths.sessions,
            this.paths.weekly,
            this.paths.monthly,
            this.paths.yearly
        ];

        for (const folder of folders) {
            if (!(await this.vault.adapter.exists(folder))) {
                await this.vault.adapter.mkdir(folder);
                console.log(`[AgentMemory:${this.agentName}] Created folder: ${folder}`);
            }
        }
    }

    /**
     * Save a session to this agent's memory
     * @param {Array} messages - Conversation messages
     * @param {Object} metadata - Session metadata
     * @returns {Promise<string>} Path to saved session
     */
    async saveSession(messages, metadata = {}) {
        const filename = this._generateSessionFilename();
        const path = `${this.paths.sessions}/${filename}`;

        const enrichedMetadata = {
            ...metadata,
            agent: this.agentName,
            created: new Date().toISOString(),
            messageCount: messages.length
        };

        const content = formatToMarkdown(messages, enrichedMetadata);
        await this.vault.adapter.write(path, content);

        console.log(`[AgentMemory:${this.agentName}] Saved session: ${filename}`);
        return path;
    }

    /**
     * Load a session from this agent's memory
     * @param {string} filename - Session filename
     * @returns {Promise<Object>} { messages, metadata, summary }
     */
    async loadSession(filename) {
        const path = `${this.paths.sessions}/${filename}`;
        const content = await this.vault.adapter.read(path);
        return parseSessionFile(content);
    }

    /**
     * List all sessions for this agent
     * @returns {Promise<Array>} Array of { path, name, mtime }
     */
    async listSessions() {
        try {
            const listed = await this.vault.adapter.list(this.paths.sessions);
            if (!listed?.files) return [];

            const sessions = [];
            for (const filePath of listed.files) {
                if (filePath.endsWith('.md')) {
                    const stat = await this.vault.adapter.stat(filePath);
                    if (stat) {
                        sessions.push({
                            path: filePath,
                            name: filePath.split('/').pop(),
                            mtime: stat.mtime
                        });
                    }
                }
            }

            // Sort by mtime descending (newest first)
            sessions.sort((a, b) => b.mtime - a.mtime);
            return sessions;
        } catch (error) {
            console.error(`[AgentMemory:${this.agentName}] Error listing sessions:`, error);
            return [];
        }
    }

    /**
     * Save active context (current working memory)
     * @param {Array} messages - Current conversation
     */
    async saveActiveContext(messages) {
        const content = formatToMarkdown(messages, {
            agent: this.agentName,
            type: 'active_context',
            updated: new Date().toISOString()
        });
        await this.vault.adapter.write(this.paths.activeContext, content);
    }

    /**
     * Load active context
     * @returns {Promise<Object|null>} { messages, metadata } or null
     */
    async loadActiveContext() {
        try {
            if (!(await this.vault.adapter.exists(this.paths.activeContext))) {
                return null;
            }
            const content = await this.vault.adapter.read(this.paths.activeContext);
            return parseSessionFile(content);
        } catch (error) {
            console.error(`[AgentMemory:${this.agentName}] Error loading active context:`, error);
            return null;
        }
    }

    /**
     * Create weekly summary from sessions
     * @param {Date} weekStart - Start of the week
     * @returns {Promise<string|null>} Path to summary or null
     */
    async createWeeklySummary(weekStart = null) {
        const sessions = await this.listSessions();
        if (sessions.length === 0) return null;

        // Get sessions from the last 7 days
        const now = Date.now();
        const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
        const weekSessions = sessions.filter(s => s.mtime >= weekAgo);

        if (weekSessions.length === 0) return null;

        // Load and combine session contents
        const sessionContents = [];
        for (const session of weekSessions) {
            try {
                const data = await this.loadSession(session.name);
                sessionContents.push({
                    name: session.name,
                    messages: data.messages,
                    summary: data.summary
                });
            } catch (e) {
                console.warn(`[AgentMemory:${this.agentName}] Could not load session:`, session.name);
            }
        }

        // Create summary content
        const dateStr = new Date().toISOString().slice(0, 10);
        const filename = `week_${dateStr}.md`;
        const path = `${this.paths.weekly}/${filename}`;

        const summaryContent = this._formatWeeklySummary(sessionContents, dateStr);
        await this.vault.adapter.write(path, summaryContent);

        console.log(`[AgentMemory:${this.agentName}] Created weekly summary: ${filename}`);
        return path;
    }

    /**
     * Create monthly summary from weekly summaries
     * @returns {Promise<string|null>} Path to summary or null
     */
    async createMonthlySummary() {
        // List weekly summaries
        const listed = await this.vault.adapter.list(this.paths.weekly);
        if (!listed?.files || listed.files.length === 0) return null;

        const monthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
        const filename = `month_${monthStr}.md`;
        const path = `${this.paths.monthly}/${filename}`;

        // Combine weekly summaries
        const weeklies = [];
        for (const file of listed.files) {
            if (file.endsWith('.md')) {
                try {
                    const content = await this.vault.adapter.read(file);
                    weeklies.push({
                        name: file.split('/').pop(),
                        content
                    });
                } catch (e) {
                    console.warn(`[AgentMemory:${this.agentName}] Could not read weekly:`, file);
                }
            }
        }

        if (weeklies.length === 0) return null;

        const summaryContent = this._formatMonthlySummary(weeklies, monthStr);
        await this.vault.adapter.write(path, summaryContent);

        console.log(`[AgentMemory:${this.agentName}] Created monthly summary: ${filename}`);
        return path;
    }

    /**
     * Get or create the agent's "brain" - long-term key information
     * @returns {Promise<string>} Brain content
     */
    async getBrain() {
        try {
            if (await this.vault.adapter.exists(this.paths.brain)) {
                return await this.vault.adapter.read(this.paths.brain);
            }

            // Create initial brain file
            const initialContent = `# ${this.agentName} - Mózg (Długoterminowa pamięć)

## Kluczowe informacje o użytkowniku


## Ważne preferencje


## Powtarzające się tematy


## Notatki

`;
            await this.vault.adapter.write(this.paths.brain, initialContent);
            return initialContent;
        } catch (error) {
            console.error(`[AgentMemory:${this.agentName}] Error getting brain:`, error);
            return '';
        }
    }

    /**
     * Update the agent's brain with new information
     * @param {string} content - New brain content
     */
    async updateBrain(content) {
        await this.vault.adapter.write(this.paths.brain, content);
        console.log(`[AgentMemory:${this.agentName}] Updated brain`);
    }

    /**
     * Get context for RAG - combines brain + recent summaries
     * @returns {Promise<string>} Combined context
     */
    async getMemoryContext() {
        const parts = [];

        // Add brain
        const brain = await this.getBrain();
        if (brain) {
            parts.push('## Długoterminowa pamięć\n' + brain);
        }

        // Add most recent weekly summary
        try {
            const weeklies = await this.vault.adapter.list(this.paths.weekly);
            if (weeklies?.files?.length > 0) {
                const sorted = weeklies.files.sort().reverse();
                if (sorted.length > 0) {
                    const latestWeekly = await this.vault.adapter.read(sorted[0]);
                    parts.push('## Podsumowanie ostatniego tygodnia\n' + latestWeekly);
                }
            }
        } catch (e) {
            // No weekly summaries yet
        }

        return parts.join('\n\n---\n\n');
    }

    // --- Private helpers ---

    _generateSessionFilename() {
        const now = new Date();
        const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
        const time = now.toISOString().slice(11, 19).replace(/:/g, '-'); // HH-MM-SS
        return `${date}_${time}.md`;
    }

    _formatWeeklySummary(sessions, dateStr) {
        let content = `---
type: weekly_summary
agent: ${this.agentName}
date: ${dateStr}
session_count: ${sessions.length}
---

# Podsumowanie tygodnia - ${dateStr}

## Sesje (${sessions.length})

`;
        for (const session of sessions) {
            content += `### ${session.name}\n`;
            if (session.summary) {
                content += session.summary + '\n\n';
            } else {
                content += `Wiadomości: ${session.messages?.length || 0}\n\n`;
            }
        }

        content += `## Kluczowe tematy\n\n[Do uzupełnienia przez AI]\n\n`;
        content += `## Notatki\n\n`;

        return content;
    }

    _formatMonthlySummary(weeklies, monthStr) {
        let content = `---
type: monthly_summary
agent: ${this.agentName}
month: ${monthStr}
weekly_count: ${weeklies.length}
---

# Podsumowanie miesiąca - ${monthStr}

## Tygodnie (${weeklies.length})

`;
        for (const weekly of weeklies) {
            content += `### ${weekly.name}\n\n`;
        }

        content += `## Kluczowe tematy miesiąca\n\n[Do uzupełnienia]\n\n`;
        content += `## Wnioski\n\n`;

        return content;
    }
}
