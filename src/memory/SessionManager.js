import { TFile } from 'obsidian';
import { formatToMarkdown, parseSessionFile } from './sessionParser.js';
import { ensureFolderStructure } from '../utils/ensureFolderStructure.js';

/**
 * Manages chat sessions, saving/loading from Obsidian vault.
 */
export class SessionManager {
    /**
     * @param {Object} vault - Obsidian Vault object
     * @param {Object} settings - Plugin settings
     */
    constructor(vault, settings) {
        this.vault = vault;
        this.settings = settings;
        this.sessionsPath = '.pkm-assistant/sessions';
        this.activeSessionFile = null;
        this.autoSaveTimer = null;
    }

    /**
     * Initialization - ensures folders exist
     */
    async initialize() {
        await ensureFolderStructure(this.vault);
    }

    /**
     * Saves session to file
     * @param {Array} messages 
     * @param {Object} metadata 
     */
    async saveSession(messages, metadata = {}) {
        try {
            const content = formatToMarkdown(messages, metadata);
            console.log('[SessionManager] saveSession called, activeSessionFile:', this.activeSessionFile?.path || 'null');

            let path;
            if (!this.activeSessionFile) {
                const filename = await this._generateFilename();
                path = `${this.sessionsPath}/${filename}`;
                console.log('[SessionManager] Creating new file:', path);
                this.activeSessionFile = { path, name: filename };
            } else {
                path = this.activeSessionFile.path;
                console.log('[SessionManager] Updating existing file:', path);
            }

            // Use adapter.write directly - it handles both create and update
            await this.vault.adapter.write(path, content);
            console.log('[SessionManager] File saved successfully:', path);

        } catch (error) {
            console.error('SessionManager: Error saving session:', error);
            throw error;
        }
    }

    /**
     * Creates new session (reset)
     * @returns {Array} Empty message array
     */
    startNewSession() {
        this.activeSessionFile = null;
        return [];
    }

    /**
     * Loads session from file
     * @param {TFile|string|Object} fileOrPath - TFile, path string, or {path, name} object from listSessions
     * @returns {Promise<Object>} { messages, metadata }
     */
    async loadSession(fileOrPath) {
        try {
            let content;
            let path;

            if (typeof fileOrPath === 'string') {
                // Direct path string
                path = fileOrPath;
                content = await this.vault.adapter.read(path);
            } else if (fileOrPath instanceof TFile) {
                // TFile object
                path = fileOrPath.path;
                content = await this.vault.read(fileOrPath);
            } else if (fileOrPath && fileOrPath.path) {
                // Object with path property (from listSessions)
                path = fileOrPath.path;
                content = await this.vault.adapter.read(path);
            } else {
                throw new Error(`Invalid session file: ${JSON.stringify(fileOrPath)}`);
            }

            const parsed = parseSessionFile(content);

            // Store reference as object with path (compatible with our new format)
            this.activeSessionFile = { path, name: path.split('/').pop() || path };

            console.log('[SessionManager] Loaded session from:', path);
            return parsed;
        } catch (error) {
            console.error('SessionManager: Error loading session:', error);
            throw error;
        }
    }

    /**
     * Returns list of all sessions sorted by modification time (newest first)
     * Returns objects with { path, name, stat: { mtime } } compatible with TFile interface
     * @returns {Promise<Array<{path: string, name: string, stat: {mtime: number}}>>}
     */
    async listSessions() {
        console.log('[SessionManager] listSessions called, sessionsPath:', this.sessionsPath);

        try {
            // Use adapter.list which is more reliable for newly created folders
            const listed = await this.vault.adapter.list(this.sessionsPath);
            console.log('[SessionManager] adapter.list result:', listed);
            console.log('[SessionManager] listed.files:', listed?.files);

            if (!listed || !listed.files) {
                return [];
            }

            // Build file info using adapter.stat() to bypass TFile cache issues
            const files = [];
            for (const filePath of listed.files) {
                console.log('[SessionManager] Processing filePath:', filePath);
                if (filePath.endsWith('.md')) {
                    try {
                        // Use adapter.stat to get file metadata directly from filesystem
                        const stat = await this.vault.adapter.stat(filePath);
                        if (stat) {
                            // Extract filename from path
                            const name = filePath.split('/').pop() || filePath.split('\\').pop() || filePath;
                            files.push({
                                path: filePath,
                                name: name,
                                stat: { mtime: stat.mtime }
                            });
                            console.log('[SessionManager] Added file:', name, 'mtime:', stat.mtime);
                        }
                    } catch (statError) {
                        console.warn('[SessionManager] Could not stat file:', filePath, statError);
                    }
                }
            }

            // Sort by modification time (newest first)
            files.sort((a, b) => b.stat.mtime - a.stat.mtime);
            console.log('[SessionManager] listSessions found:', files.length, 'files');

            return files;
        } catch (error) {
            console.error('[SessionManager] listSessions error:', error);
            return [];
        }
    }

    /**
     * Generates filename: YYYY-MM-DD_NNN.md
     * @returns {Promise<string>}
     */
    async _generateFilename() {
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const files = await this.listSessions();
        console.log('[SessionManager] _generateFilename - found files:', files.map(f => f.name));

        let maxNum = 0;
        const regex = new RegExp(`^${today}_(\\d{3})\\.md$`);

        for (const file of files) {
            const match = file.name.match(regex);
            if (match) {
                const num = parseInt(match[1], 10);
                console.log('[SessionManager] Found matching file:', file.name, 'num:', num);
                if (num > maxNum) maxNum = num;
            }
        }

        const nextNum = (maxNum + 1).toString().padStart(3, '0');
        const filename = `${today}_${nextNum}.md`;
        console.log('[SessionManager] Generated filename:', filename);
        return filename;
    }

    /**
     * Starts auto-save
     * @param {Function} getMessagesCallback - Function returning current messages and metadata
     */
    startAutoSave(getMessagesCallback) {
        this.stopAutoSave(); // Stop existing if any

        if (!this.settings?.autoSaveInterval || this.settings.autoSaveInterval <= 0) {
            return;
        }

        const intervalMs = this.settings.autoSaveInterval * 60 * 1000;

        this.autoSaveTimer = setInterval(async () => {
            const { messages, metadata } = getMessagesCallback();
            if (messages && messages.length > 0) {
                await this.saveSession(messages, metadata);
            }
        }, intervalMs);
    }

    /**
     * Stops auto-save
     */
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }
}
