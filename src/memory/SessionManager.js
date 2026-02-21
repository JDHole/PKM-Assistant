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

            let path;
            if (!this.activeSessionFile) {
                const filename = await this._generateFilename();
                path = `${this.sessionsPath}/${filename}`;
                this.activeSessionFile = { path, name: filename };
            } else {
                path = this.activeSessionFile.path;
            }

            await this.vault.adapter.write(path, content);
        } catch (error) {
            console.error('[SessionManager] Error saving session:', error);
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
                path = fileOrPath;
                content = await this.vault.adapter.read(path);
            } else if (fileOrPath instanceof TFile) {
                path = fileOrPath.path;
                content = await this.vault.read(fileOrPath);
            } else if (fileOrPath && fileOrPath.path) {
                path = fileOrPath.path;
                content = await this.vault.adapter.read(path);
            } else {
                throw new Error(`Invalid session file: ${JSON.stringify(fileOrPath)}`);
            }

            const parsed = parseSessionFile(content);
            this.activeSessionFile = { path, name: path.split('/').pop() || path };
            return parsed;
        } catch (error) {
            console.error('[SessionManager] Error loading session:', error);
            throw error;
        }
    }

    /**
     * Returns list of all sessions sorted by modification time (newest first)
     * Returns objects with { path, name, stat: { mtime } } compatible with TFile interface
     * @returns {Promise<Array<{path: string, name: string, stat: {mtime: number}}>>}
     */
    async listSessions() {
        try {
            const listed = await this.vault.adapter.list(this.sessionsPath);
            if (!listed?.files) return [];

            const files = [];
            for (const filePath of listed.files) {
                if (filePath.endsWith('.md')) {
                    try {
                        const stat = await this.vault.adapter.stat(filePath);
                        if (stat) {
                            const name = filePath.split('/').pop() || filePath.split('\\').pop() || filePath;
                            files.push({ path: filePath, name, stat: { mtime: stat.mtime } });
                        }
                    } catch (statError) {
                        // skip files we can't stat
                    }
                }
            }

            files.sort((a, b) => b.stat.mtime - a.stat.mtime);
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
        const today = new Date().toISOString().slice(0, 10);
        const files = await this.listSessions();

        let maxNum = 0;
        const regex = new RegExp(`^${today}_(\\d{3})\\.md$`);

        for (const file of files) {
            const match = file.name.match(regex);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
            }
        }

        return `${today}_${(maxNum + 1).toString().padStart(3, '0')}.md`;
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
