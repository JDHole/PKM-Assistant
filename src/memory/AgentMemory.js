/**
 * AgentMemory - Hierarchical memory management per agent
 * 
 * Structure:
 * .pkm-assistant/agents/{agent_name}/memory/
 * ├── brain.md              <- Long-term memory (~500 tok max)
 * ├── brain_archive.md      <- Overflow from brain (for RAG)
 * ├── active_context.md     <- Summary of last session
 * ├── audit.log             <- Memory change log
 * ├── sessions/             <- Individual sessions with summaries
 * └── summaries/
 *     ├── L1/              <- Every 5 sessions → 1 L1 summary
 *     └── L2/              <- Every 5 L1 → 1 L2 summary
 */

import { formatToMarkdown, parseSessionFile } from './sessionParser.js';
import { streamToComplete } from './streamHelper.js';

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

        // Track active session to prevent duplicate files
        this.activeSessionPath = null;

        // Paths
        this.paths = {
            sessions: `${this.basePath}/sessions`,
            l1: `${this.basePath}/summaries/L1`,
            l2: `${this.basePath}/summaries/L2`,
            activeContext: `${this.basePath}/active_context.md`,
            brain: `${this.basePath}/brain.md`
        };
    }

    /**
     * Initialize memory structure - create folders if needed
     */
    async initialize() {

        const folders = [
            this.basePath,
            this.paths.sessions,
            `${this.basePath}/summaries`,
            this.paths.l1,
            this.paths.l2
        ];

        for (const folder of folders) {
            if (!(await this.vault.adapter.exists(folder))) {
                await this.vault.adapter.mkdir(folder);
            }
        }

        // Migrate old weekly/ files to summaries/L1/ (one-time)
        await this._migrateOldFolders();
    }

    /**
     * One-time migration: move files from old weekly/ to summaries/L1/
     */
    async _migrateOldFolders() {
        const oldWeekly = `${this.basePath}/weekly`;
        try {
            if (!(await this.vault.adapter.exists(oldWeekly))) return;

            const listed = await this.vault.adapter.list(oldWeekly);
            if (!listed?.files || listed.files.length === 0) return;

            for (const filePath of listed.files) {
                const fileName = filePath.split('/').pop();
                const newPath = `${this.paths.l1}/${fileName}`;
                const content = await this.vault.adapter.read(filePath);
                await this.vault.adapter.write(newPath, content);
                await this.vault.adapter.remove(filePath);
            }
        } catch (e) {
            console.warn(`[AgentMemory:${this.agentName}] Migration failed (non-fatal):`, e);
        }
    }

    /**
     * Save a session to this agent's memory
     * @param {Array} messages - Conversation messages
     * @param {Object} metadata - Session metadata
     * @returns {Promise<string>} Path to saved session
     */
    async saveSession(messages, metadata = {}) {
        // Reuse existing session file if already saved (prevents duplicates)
        let path;
        if (this.activeSessionPath) {
            path = this.activeSessionPath;
        } else {
            const filename = this._generateSessionFilename();
            path = `${this.paths.sessions}/${filename}`;
            this.activeSessionPath = path;
        }

        const enrichedMetadata = {
            ...metadata,
            agent: this.agentName,
            created: new Date().toISOString(),
            messageCount: messages.length
        };

        const content = formatToMarkdown(messages, enrichedMetadata);
        await this.vault.adapter.write(path, content);

        return path;
    }

    /**
     * Reset active session tracker (call when starting a new conversation)
     */
    startNewSession() {
        this.activeSessionPath = null;
    }

    /**
     * Load a session from this agent's memory
     * @param {string|Object} fileOrName - Filename string, full path, or {path, name} object
     * @returns {Promise<Object>} { messages, metadata, summary }
     */
    async loadSession(fileOrName) {
        let path;
        if (typeof fileOrName === 'string') {
            // If it looks like a full path (contains /), use it directly; otherwise prepend sessions dir
            path = fileOrName.includes('/') ? fileOrName : `${this.paths.sessions}/${fileOrName}`;
        } else if (fileOrName && fileOrName.path) {
            path = fileOrName.path;
        } else {
            throw new Error(`Invalid session reference: ${JSON.stringify(fileOrName)}`);
        }
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
     * Get or create the agent's "brain" - long-term key information
     * Sections match MEMORY_DESIGN.md: User, Preferencje, Ustalenia, Bieżące
     * @returns {Promise<string>} Brain content
     */
    async getBrain() {
        try {
            if (await this.vault.adapter.exists(this.paths.brain)) {
                let content = await this.vault.adapter.read(this.paths.brain);
                // Gracefully add any missing design-spec sections without overwriting existing content
                const requiredSections = ['## User', '## Preferencje', '## Ustalenia', '## Bieżące'];
                let changed = false;
                for (const section of requiredSections) {
                    if (!content.includes(section)) {
                        content += `\n${section}\n\n`;
                        changed = true;
                    }
                }
                if (changed) {
                    await this.vault.adapter.write(this.paths.brain, content);
                }
                return content;
            }

            // Create initial brain file with design-spec sections
            const initialContent = `# ${this.agentName} - Mózg (Długoterminowa pamięć)

## User


## Preferencje


## Ustalenia


## Bieżące

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
    }

    /**
     * Get memory context to inject into system prompt.
     * Combines: brain (long-term) + active_context.md (last session summary) + latest L1 summary
     * @returns {Promise<string>} Combined context string
     */
    async getMemoryContext() {
        const parts = [];

        // Add brain (long-term memory)
        const brain = await this.getBrain();
        if (brain && brain.trim()) {
            parts.push('## Długoterminowa pamięć\n' + brain);
        }

        // Add active context (summary of last session) - only if file exists and has content
        try {
            if (await this.vault.adapter.exists(this.paths.activeContext)) {
                const activeCtx = await this.vault.adapter.read(this.paths.activeContext);
                if (activeCtx && activeCtx.trim()) {
                    parts.push('## Kontekst poprzedniej sesji\n' + activeCtx);
                }
            }
        } catch (e) {
            // active_context.md not yet created - that's fine
        }

        // Add most recent L1 summary
        try {
            const l1Files = await this.vault.adapter.list(this.paths.l1);
            if (l1Files?.files?.length > 0) {
                const sorted = l1Files.files.sort().reverse();
                if (sorted.length > 0) {
                    const latestL1 = await this.vault.adapter.read(sorted[0]);
                    parts.push('## Podsumowanie ostatnich sesji\n' + latestL1);
                }
            }
        } catch (e) {
            // No L1 summaries yet
        }

        return parts.join('\n\n---\n\n');
    }

    // --- Phase 5: L1/L2 Consolidation ---

    /**
     * Parse YAML frontmatter from a markdown file.
     * Returns an object with frontmatter fields, or {} if none.
     * @param {string} content - File content
     * @returns {Object}
     */
    _parseFrontmatter(content) {
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        if (!match) return {};
        const result = {};
        for (const line of match[1].split('\n')) {
            const trimmed = line.trim();
            if (trimmed.startsWith('- ')) {
                // Array item - append to last key
                if (result._lastKey) {
                    if (!Array.isArray(result[result._lastKey])) {
                        result[result._lastKey] = [];
                    }
                    result[result._lastKey].push(trimmed.slice(2).trim());
                }
            } else if (trimmed.includes(':')) {
                const idx = trimmed.indexOf(':');
                const key = trimmed.slice(0, idx).trim();
                const val = trimmed.slice(idx + 1).trim();
                result[key] = val || [];
                result._lastKey = key;
            }
        }
        delete result._lastKey;
        return result;
    }

    /**
     * Get sessions not yet included in any L1 summary.
     * Checks L1 frontmatter `sessions: [...]` to determine which sessions are consolidated.
     * @returns {Promise<Array>} Array of { path, name, mtime } for unconsolidated sessions
     */
    async getUnconsolidatedSessions() {
        const allSessions = await this.listSessions();
        if (allSessions.length === 0) return [];

        // Collect all session names referenced in L1 files
        const consolidatedNames = new Set();
        try {
            const l1Listed = await this.vault.adapter.list(this.paths.l1);
            if (l1Listed?.files) {
                for (const filePath of l1Listed.files) {
                    if (!filePath.endsWith('.md')) continue;
                    try {
                        const content = await this.vault.adapter.read(filePath);
                        const fm = this._parseFrontmatter(content);
                        if (Array.isArray(fm.sessions)) {
                            fm.sessions.forEach(s => consolidatedNames.add(s));
                        }
                    } catch (e) { /* skip unreadable L1 */ }
                }
            }
        } catch (e) { /* no L1 folder yet */ }

        return allSessions.filter(s => !consolidatedNames.has(s.name));
    }

    /**
     * Get L1 summaries not yet included in any L2 summary.
     * Checks L2 frontmatter `l1_files: [...]`.
     * @returns {Promise<Array>} Array of { path, name } for unconsolidated L1s
     */
    async getUnconsolidatedL1s() {
        const allL1s = [];
        try {
            const l1Listed = await this.vault.adapter.list(this.paths.l1);
            if (l1Listed?.files) {
                for (const filePath of l1Listed.files) {
                    if (filePath.endsWith('.md')) {
                        allL1s.push({ path: filePath, name: filePath.split('/').pop() });
                    }
                }
            }
        } catch (e) { return []; }

        if (allL1s.length === 0) return [];

        // Collect all L1 names referenced in L2 files
        const consolidatedNames = new Set();
        try {
            const l2Listed = await this.vault.adapter.list(this.paths.l2);
            if (l2Listed?.files) {
                for (const filePath of l2Listed.files) {
                    if (!filePath.endsWith('.md')) continue;
                    try {
                        const content = await this.vault.adapter.read(filePath);
                        const fm = this._parseFrontmatter(content);
                        if (Array.isArray(fm.l1_files)) {
                            fm.l1_files.forEach(s => consolidatedNames.add(s));
                        }
                    } catch (e) { /* skip unreadable L2 */ }
                }
            }
        } catch (e) { /* no L2 folder yet */ }

        return allL1s.filter(l => !consolidatedNames.has(l.name));
    }

    /**
     * Create an L1 summary from a batch of sessions using AI.
     * @param {Array} sessions - Array of { path, name } (max 5)
     * @param {Object} chatModel - SmartChatModel instance with .stream()
     * @returns {Promise<string|null>} Path to created L1 file or null
     */
    async createL1Summary(sessions, chatModel) {
        if (!sessions || sessions.length === 0 || !chatModel?.stream) return null;

        // Load session contents
        const sessionTexts = [];
        const sessionNames = [];
        for (const session of sessions) {
            try {
                const data = await this.loadSession(session);
                sessionNames.push(session.name || session);
                const msgs = (data.messages || [])
                    .filter(m => m.role === 'user' || m.role === 'assistant')
                    .map(m => {
                        const role = m.role === 'user' ? 'User' : 'Agent';
                        const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
                        return `${role}: ${content}`;
                    })
                    .join('\n');
                sessionTexts.push(`### Sesja: ${session.name || session}\n${msgs}`);
            } catch (e) {
                console.warn(`[AgentMemory:${this.agentName}] Could not load session for L1:`, session.name);
            }
        }

        if (sessionTexts.length === 0) return null;

        // Build prompt
        const prompt = `Streszcz poniższe ${sessionTexts.length} sesji rozmów z użytkownikiem.
Wyciągnij:
1. Główne tematy - o czym rozmawiano
2. Kluczowe fakty - co ważnego ustalono lub dowiedziałeś się o userze
3. Decyzje i ustalenia - co postanowiono

Pisz zwięźle (maks 300 słów). Po polsku.

${sessionTexts.join('\n\n---\n\n')}`;

        const apiMessages = [
            { role: 'user', content: prompt }
        ];

        let summaryText;
        try {
            summaryText = await streamToComplete(chatModel, apiMessages);
        } catch (e) {
            console.error(`[AgentMemory:${this.agentName}] AI call for L1 failed:`, e);
            return null;
        }

        // Build file with frontmatter
        const dateStr = new Date().toISOString().slice(0, 10);
        const timeStr = new Date().toISOString().slice(11, 19).replace(/:/g, '-');
        const filename = `l1_${dateStr}_${timeStr}.md`;
        const path = `${this.paths.l1}/${filename}`;

        const sessionsYaml = sessionNames.map(n => `  - ${n}`).join('\n');
        const content = `---
type: l1_summary
agent: ${this.agentName}
date: ${dateStr}
sessions:
${sessionsYaml}
---

# Podsumowanie ${sessionTexts.length} sesji - ${dateStr}

${summaryText}
`;

        await this.vault.adapter.write(path, content);
        return path;
    }

    /**
     * Create an L2 summary from a batch of L1 summaries using AI.
     * @param {Array} l1Files - Array of { path, name } (max 5)
     * @param {Object} chatModel - SmartChatModel instance with .stream()
     * @returns {Promise<string|null>} Path to created L2 file or null
     */
    async createL2Summary(l1Files, chatModel) {
        if (!l1Files || l1Files.length === 0 || !chatModel?.stream) return null;

        // Load L1 contents
        const l1Texts = [];
        const l1Names = [];
        for (const l1 of l1Files) {
            try {
                const content = await this.vault.adapter.read(l1.path);
                l1Names.push(l1.name);
                // Strip frontmatter for prompt
                const body = content.replace(/^---[\s\S]*?---\n*/, '').trim();
                l1Texts.push(`### ${l1.name}\n${body}`);
            } catch (e) {
                console.warn(`[AgentMemory:${this.agentName}] Could not read L1 for L2:`, l1.name);
            }
        }

        if (l1Texts.length === 0) return null;

        // Build prompt
        const prompt = `Streszcz poniższe ${l1Texts.length} podsumowań L1 (każde streszcza 5 sesji rozmów z użytkownikiem).
Wyciągnij najważniejsze:
1. Główne tematy z tego okresu
2. Kluczowe fakty o userze
3. Ważne decyzje i ustalenia

Pisz bardzo zwięźle (maks 200 słów). Po polsku.

${l1Texts.join('\n\n---\n\n')}`;

        const apiMessages = [
            { role: 'user', content: prompt }
        ];

        let summaryText;
        try {
            summaryText = await streamToComplete(chatModel, apiMessages);
        } catch (e) {
            console.error(`[AgentMemory:${this.agentName}] AI call for L2 failed:`, e);
            return null;
        }

        // Build file with frontmatter
        const dateStr = new Date().toISOString().slice(0, 10);
        const timeStr = new Date().toISOString().slice(11, 19).replace(/:/g, '-');
        const filename = `l2_${dateStr}_${timeStr}.md`;
        const path = `${this.paths.l2}/${filename}`;

        const l1Yaml = l1Names.map(n => `  - ${n}`).join('\n');
        const content = `---
type: l2_summary
agent: ${this.agentName}
date: ${dateStr}
l1_files:
${l1Yaml}
---

# Podsumowanie ${l1Texts.length} okresów - ${dateStr}

${summaryText}
`;

        await this.vault.adapter.write(path, content);
        return path;
    }

    // --- Phase 3: Memory Extraction support ---

    /**
     * Central memory write function.
     * Applies brain updates and saves active context summary.
     * All memory writes go through here (future: autonomy check).
     *
     * @param {Array} updates - Array of {category, content, section, oldContent?} from MemoryExtractor
     * @param {string} activeContextSummary - Summary of the session for active_context.md
     * @returns {Promise<void>}
     */
    async memoryWrite(updates, activeContextSummary) {
        // TODO: autonomy check (MEMORY_DESIGN.md sekcja 9)

        // Apply brain updates if any
        if (updates && updates.length > 0) {
            await this.applyBrainUpdates(updates);
        }

        // Save active context summary
        if (activeContextSummary && activeContextSummary.trim()) {
            await this.vault.adapter.write(this.paths.activeContext, activeContextSummary);
        }

        // Audit log
        await this._appendAuditLog(updates);
    }

    /**
     * Apply extracted facts to brain.md
     * @param {Array} updates - Array of {category, content, section, oldContent?}
     * @returns {Promise<void>}
     */
    async applyBrainUpdates(updates) {
        if (!updates || updates.length === 0) return;

        const brainContent = await this.getBrain();
        const sections = this._parseBrainSections(brainContent);

        for (const update of updates) {
            if (update.category === 'DELETE') {
                this._applyDelete(sections, update);
            } else if (update.category === 'UPDATE') {
                this._applyUpdate(sections, update);
            } else {
                // CORE, PREFERENCE, DECISION, PROJECT → append to section
                this._applyAppend(sections, update);
            }
        }

        // Build new brain content
        let newBrain = this._buildBrainFromSections(sections);

        // Check size limit (~2000 chars ≈ 500 tokens)
        const BRAIN_MAX_CHARS = 2000;
        if (newBrain.length > BRAIN_MAX_CHARS) {
            newBrain = await this._archiveOverflow(sections, BRAIN_MAX_CHARS);
        }

        await this.vault.adapter.write(this.paths.brain, newBrain);
    }

    /**
     * Parse brain.md into sections map
     * @param {string} brainContent
     * @returns {Object} { header: string, sections: Map<string, string[]> }
     */
    _parseBrainSections(brainContent) {
        const lines = brainContent.split('\n');
        let header = '';
        const sections = new Map();
        let currentSection = null;

        for (const line of lines) {
            if (line.startsWith('# ') && !line.startsWith('## ')) {
                header = line;
            } else if (line.startsWith('## ')) {
                currentSection = line;
                if (!sections.has(currentSection)) {
                    sections.set(currentSection, []);
                }
            } else if (currentSection) {
                const trimmed = line.trim();
                if (trimmed) {
                    sections.get(currentSection).push(trimmed);
                }
            }
        }

        // Ensure all required sections exist
        for (const s of ['## User', '## Preferencje', '## Ustalenia', '## Bieżące']) {
            if (!sections.has(s)) {
                sections.set(s, []);
            }
        }

        return { header: header || `# ${this.agentName} - Mózg (Długoterminowa pamięć)`, sections };
    }

    /**
     * Rebuild brain.md from sections map
     * @param {Object} parsed - { header, sections }
     * @returns {string}
     */
    _buildBrainFromSections(parsed) {
        const parts = [parsed.header, ''];

        // Maintain consistent section order
        const sectionOrder = ['## User', '## Preferencje', '## Ustalenia', '## Bieżące'];
        const orderedKeys = [
            ...sectionOrder.filter(s => parsed.sections.has(s)),
            ...[...parsed.sections.keys()].filter(s => !sectionOrder.includes(s))
        ];

        for (const key of orderedKeys) {
            parts.push(key);
            const items = parsed.sections.get(key) || [];
            for (const item of items) {
                parts.push(item.startsWith('- ') ? item : `- ${item}`);
            }
            parts.push('');
        }

        return parts.join('\n');
    }

    /**
     * Append a fact to the appropriate brain section
     * @param {Object} parsed - { header, sections }
     * @param {Object} update - { category, content, section }
     */
    _applyAppend(parsed, update) {
        const section = update.section;
        if (!parsed.sections.has(section)) {
            parsed.sections.set(section, []);
        }
        const items = parsed.sections.get(section);
        // Fuzzy duplicate check: extract keywords (numbers + significant words)
        const newKeywords = this._extractKeywords(update.content);
        const isDuplicate = items.some(item => {
            const clean = item.replace(/^-\s*/, '');
            const existingKeywords = this._extractKeywords(clean);
            return this._keywordsOverlap(newKeywords, existingKeywords);
        });
        if (!isDuplicate) {
            items.push(`- ${update.content}`);
        } else {
        }
    }

    /**
     * Extract significant keywords from a fact string.
     * Returns numbers and non-stopword words (3+ chars).
     * @param {string} text
     * @returns {Set<string>}
     */
    _extractKeywords(text) {
        const lower = text.toLowerCase();
        const stopwords = new Set([
            'user', 'jest', 'ma', 'mam', 'masz', 'się', 'nie', 'tak', 'ale', 'że',
            'to', 'ten', 'ta', 'ci', 'jak', 'już', 'tylko', 'bardzo', 'też', 'czy',
            'lub', 'albo', 'oraz', 'jego', 'jej', 'ich', 'dla', 'po', 'na', 'ze',
            'od', 'do', 'przy', 'przez', 'nad', 'pod', 'przed', 'za', 'między',
            'numer', 'buta', 'kolor', 'lubi', 'woli', 'preferuje'
        ]);
        // Extract all numbers
        const numbers = lower.match(/\d+/g) || [];
        // Extract words 3+ chars, skip stopwords
        const words = lower.match(/[a-ząćęłńóśźż]{3,}/g) || [];
        const significant = words.filter(w => !stopwords.has(w));
        return new Set([...numbers, ...significant]);
    }

    /**
     * Check if two keyword sets overlap enough to be considered duplicates.
     * If either set has numbers, ALL numbers must match.
     * For words, at least 50% overlap required.
     * @param {Set<string>} a
     * @param {Set<string>} b
     * @returns {boolean}
     */
    _keywordsOverlap(a, b) {
        if (a.size === 0 || b.size === 0) return false;

        // Separate numbers and words
        const numsA = [...a].filter(k => /^\d+$/.test(k));
        const numsB = [...b].filter(k => /^\d+$/.test(k));
        const wordsA = [...a].filter(k => !/^\d+$/.test(k));
        const wordsB = [...b].filter(k => !/^\d+$/.test(k));

        // If both have numbers, check if they share at least one
        if (numsA.length > 0 && numsB.length > 0) {
            const sharedNums = numsA.filter(n => numsB.includes(n));
            if (sharedNums.length > 0) {
                // Same number + at least one shared word → duplicate
                const sharedWords = wordsA.filter(w => wordsB.includes(w));
                return sharedWords.length > 0 || wordsA.length === 0 || wordsB.length === 0;
            }
            return false; // Different numbers = not duplicate
        }

        // Words-only comparison: need 50%+ overlap
        if (wordsA.length === 0 || wordsB.length === 0) return false;
        const sharedWords = wordsA.filter(w => wordsB.includes(w));
        const overlapRatio = sharedWords.length / Math.min(wordsA.length, wordsB.length);
        return overlapRatio >= 0.5;
    }

    /**
     * Update (replace) a fact in the brain
     * @param {Object} parsed - { header, sections }
     * @param {Object} update - { category, content, section, oldContent }
     */
    _applyUpdate(parsed, update) {
        const section = update.section;
        if (!parsed.sections.has(section)) {
            parsed.sections.set(section, []);
        }
        const items = parsed.sections.get(section);

        if (update.oldContent) {
            // Try to find and replace the old fact
            const oldLower = update.oldContent.toLowerCase();
            const idx = items.findIndex(item => {
                const clean = item.replace(/^-\s*/, '').toLowerCase();
                return clean.includes(oldLower);
            });
            if (idx >= 0) {
                items[idx] = `- ${update.content}`;
                return;
            }
        }

        // If old fact not found, search all sections for something similar
        for (const [secKey, secItems] of parsed.sections) {
            if (update.oldContent) {
                const oldLower = update.oldContent.toLowerCase();
                const idx = secItems.findIndex(item => {
                    const clean = item.replace(/^-\s*/, '').toLowerCase();
                    return clean.includes(oldLower);
                });
                if (idx >= 0) {
                    secItems[idx] = `- ${update.content}`;
                    return;
                }
            }
        }

        // Fallback: append to target section
        items.push(`- ${update.content}`);
    }

    /**
     * Delete a fact from the brain
     * @param {Object} parsed - { header, sections }
     * @param {Object} update - { category, content, section }
     */
    _applyDelete(parsed, update) {
        const contentLower = update.content.toLowerCase();

        // Search in specified section first, then all sections
        const searchOrder = update.section
            ? [update.section, ...[...parsed.sections.keys()].filter(k => k !== update.section)]
            : [...parsed.sections.keys()];

        for (const secKey of searchOrder) {
            const items = parsed.sections.get(secKey);
            if (!items) continue;

            const idx = items.findIndex(item => {
                const clean = item.replace(/^-\s*/, '').toLowerCase();
                return clean.includes(contentLower);
            });
            if (idx >= 0) {
                items.splice(idx, 1);
                return;
            }
        }
    }

    /**
     * Move oldest facts to brain_archive.md when brain exceeds size limit
     * @param {Object} parsed - { header, sections }
     * @param {number} maxChars - Maximum brain size in characters
     * @returns {Promise<string>} New brain content within limit
     */
    async _archiveOverflow(parsed, maxChars) {
        const archivePath = `${this.basePath}/brain_archive.md`;
        const archived = [];

        // Remove oldest facts from ## User and ## Bieżące (most likely to overflow)
        for (const section of ['## Bieżące', '## User']) {
            const items = parsed.sections.get(section);
            if (!items) continue;

            while (items.length > 1 && this._buildBrainFromSections(parsed).length > maxChars) {
                const removed = items.shift(); // Remove oldest (first) item
                archived.push(`[${new Date().toISOString().slice(0, 10)}] ${section}: ${removed}`);
            }
        }

        // Append archived facts to brain_archive.md
        if (archived.length > 0) {
            let existingArchive = '';
            try {
                if (await this.vault.adapter.exists(archivePath)) {
                    existingArchive = await this.vault.adapter.read(archivePath);
                }
            } catch (e) { /* first archive */ }

            const archiveContent = existingArchive
                ? existingArchive + '\n' + archived.join('\n')
                : `# ${this.agentName} - Brain Archive\n\n` + archived.join('\n');

            await this.vault.adapter.write(archivePath, archiveContent);
        }

        return this._buildBrainFromSections(parsed);
    }

    /**
     * Append memory changes to audit.log
     * @param {Array} updates - Changes applied
     */
    async _appendAuditLog(updates) {
        if (!updates || updates.length === 0) return;

        const logPath = `${this.basePath}/audit.log`;
        const timestamp = new Date().toISOString();

        const entries = updates.map(u =>
            `[${timestamp}] [${u.category}] ${u.content}`
        ).join('\n');

        try {
            let existing = '';
            if (await this.vault.adapter.exists(logPath)) {
                existing = await this.vault.adapter.read(logPath);
            }
            await this.vault.adapter.write(logPath, existing ? existing + '\n' + entries : entries);
        } catch (e) {
            console.warn(`[AgentMemory:${this.agentName}] Could not write audit log:`, e);
        }
    }

    // --- Private helpers ---

    _generateSessionFilename() {
        const now = new Date();
        const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
        const time = now.toISOString().slice(11, 19).replace(/:/g, '-'); // HH-MM-SS
        return `${date}_${time}.md`;
    }

}
