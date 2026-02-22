/**
 * KomunikatorManager
 * Manages inter-agent communication via inbox files in .pkm-assistant/komunikator/
 * Each agent has an inbox file: inbox_{safeName}.md with messages in HTML comment blocks.
 *
 * Status system: dual-track (user vs AI read status)
 *   NOWA           - nobody read
 *   USER_READ      - user opened in KomunikatorModal
 *   AI_READ        - minion/agent processed it
 *   ALL_READ       - both user and AI read it
 */

export class KomunikatorManager {
    constructor(vault) {
        this.vault = vault;
        this.BASE_PATH = '.pkm-assistant/komunikator';
    }

    /**
     * Ensure the komunikator folder exists
     */
    async ensureFolder() {
        try {
            const exists = await this.vault.adapter.exists(this.BASE_PATH);
            if (!exists) {
                await this.vault.adapter.mkdir(this.BASE_PATH);
            }
        } catch (e) {
            console.warn('[KomunikatorManager] Failed to create folder:', e);
        }
    }

    /**
     * Convert agent name to safe filesystem name
     * @param {string} name
     * @returns {string}
     */
    _getSafeName(name) {
        return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }

    /**
     * Get inbox file path for an agent
     * @param {string} agentName
     * @returns {string}
     */
    _getInboxPath(agentName) {
        return `${this.BASE_PATH}/inbox_${this._getSafeName(agentName)}.md`;
    }

    /**
     * Read all messages from an agent's inbox
     * @param {string} agentName
     * @returns {Promise<Array<{id, from, subject, body, context, date, status}>>}
     */
    async readInbox(agentName) {
        const path = this._getInboxPath(agentName);
        try {
            const exists = await this.vault.adapter.exists(path);
            if (!exists) return [];

            const content = await this.vault.adapter.read(path);
            return this._parseMessages(content);
        } catch (e) {
            console.warn('[KomunikatorManager] Failed to read inbox:', e);
            return [];
        }
    }

    /**
     * Write a message to an agent's inbox
     * @param {string} from - Sender name
     * @param {string} to - Recipient agent name
     * @param {string} subject
     * @param {string} content - Message body
     * @param {string} [context] - Optional context (file path, fragment)
     * @returns {Promise<string>} Message ID
     */
    async writeMessage(from, to, subject, content, context = '') {
        await this.ensureFolder();
        const path = this._getInboxPath(to);
        const messageId = String(Date.now());

        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10) + ' ' +
            now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

        let block = `<!-- MSG:${messageId} -->\n`;
        block += `**Od:** ${from}\n`;
        block += `**Temat:** ${subject}\n`;
        block += `**Data:** ${dateStr}\n`;
        block += `**Status:** NOWA\n`;
        block += `\n${content}\n`;
        if (context) {
            block += `\n**Kontekst:** ${context}\n`;
        }
        block += `\n<!-- /MSG:${messageId} -->\n`;

        // Append to existing file or create new
        let existing = '';
        try {
            const exists = await this.vault.adapter.exists(path);
            if (exists) {
                existing = await this.vault.adapter.read(path);
            }
        } catch {}

        const separator = existing.trim() ? '\n' : '';
        await this.vault.adapter.write(path, existing + separator + block);

        return messageId;
    }

    /**
     * Mark a message as read by user (opened in KomunikatorModal)
     * NOWA → USER_READ, AI_READ → ALL_READ
     * @param {string} agentName
     * @param {string} messageId
     */
    async markAsUserRead(agentName, messageId) {
        await this._transitionStatus(agentName, messageId, {
            'NOWA': 'USER_READ',
            'AI_READ': 'ALL_READ'
        });
    }

    /**
     * Mark a message as read by AI (minion/agent processed it)
     * NOWA → AI_READ, USER_READ → ALL_READ
     * @param {string} agentName
     * @param {string} messageId
     */
    async markAsAIRead(agentName, messageId) {
        await this._transitionStatus(agentName, messageId, {
            'NOWA': 'AI_READ',
            'USER_READ': 'ALL_READ'
        });
    }

    /**
     * Mark all messages as read by user
     * @param {string} agentName
     */
    async markAllAsUserRead(agentName) {
        const path = this._getInboxPath(agentName);
        try {
            const exists = await this.vault.adapter.exists(path);
            if (!exists) return;

            let content = await this.vault.adapter.read(path);
            let updated = content;
            updated = updated.replace(/\*\*Status:\*\* NOWA/g, '**Status:** USER_READ');
            updated = updated.replace(/\*\*Status:\*\* AI_READ/g, '**Status:** ALL_READ');
            if (updated !== content) {
                await this.vault.adapter.write(path, updated);
            }
        } catch (e) {
            console.warn('[KomunikatorManager] Failed to mark all as user read:', e);
        }
    }

    /**
     * Mark all messages as read by AI
     * @param {string} agentName
     */
    async markAllAsAIRead(agentName) {
        const path = this._getInboxPath(agentName);
        try {
            const exists = await this.vault.adapter.exists(path);
            if (!exists) return;

            let content = await this.vault.adapter.read(path);
            let updated = content;
            updated = updated.replace(/\*\*Status:\*\* NOWA/g, '**Status:** AI_READ');
            updated = updated.replace(/\*\*Status:\*\* USER_READ/g, '**Status:** ALL_READ');
            if (updated !== content) {
                await this.vault.adapter.write(path, updated);
            }
        } catch (e) {
            console.warn('[KomunikatorManager] Failed to mark all as AI read:', e);
        }
    }

    /**
     * Transition status of a specific message
     * @param {string} agentName
     * @param {string} messageId
     * @param {Object} transitions - Map of oldStatus → newStatus
     */
    async _transitionStatus(agentName, messageId, transitions) {
        const path = this._getInboxPath(agentName);
        try {
            const exists = await this.vault.adapter.exists(path);
            if (!exists) return;

            let content = await this.vault.adapter.read(path);
            let updated = content;
            for (const [from, to] of Object.entries(transitions)) {
                const pattern = new RegExp(
                    `(<!-- MSG:${messageId} -->[\\s\\S]*?\\*\\*Status:\\*\\* )${from}`,
                    'g'
                );
                updated = updated.replace(pattern, `$1${to}`);
            }
            if (updated !== content) {
                await this.vault.adapter.write(path, updated);
            }
        } catch (e) {
            console.warn('[KomunikatorManager] Failed to transition status:', e);
        }
    }

    /**
     * Get count of messages unread by USER (for sidebar badges)
     * Unread by user = NOWA or AI_READ
     * @param {string} agentName
     * @returns {Promise<number>}
     */
    async getUnreadCount(agentName) {
        const messages = await this.readInbox(agentName);
        return messages.filter(m => m.status === 'NOWA' || m.status === 'AI_READ').length;
    }

    /**
     * Get count of messages unread by AI (for minion auto-prep)
     * Unread by AI = NOWA or USER_READ
     * @param {string} agentName
     * @returns {Promise<number>}
     */
    async getAIUnreadCount(agentName) {
        const messages = await this.readInbox(agentName);
        return messages.filter(m => m.status === 'NOWA' || m.status === 'USER_READ').length;
    }

    /**
     * Get unread counts for multiple agents (batch)
     * @param {string[]} agentNames
     * @returns {Promise<Map<string, number>>}
     */
    async getUnreadCounts(agentNames) {
        const counts = new Map();
        for (const name of agentNames) {
            counts.set(name, await this.getUnreadCount(name));
        }
        return counts;
    }

    // ========== BACKWARDS COMPAT ==========
    // Old single-status methods redirect to user-read variants

    /** @deprecated Use markAsUserRead */
    async markAsRead(agentName, messageId) {
        return this.markAsUserRead(agentName, messageId);
    }

    /** @deprecated Use markAllAsUserRead */
    async markAllAsRead(agentName) {
        return this.markAllAsUserRead(agentName);
    }

    /**
     * Parse message blocks from inbox file content
     * @param {string} content
     * @returns {Array<{id, from, subject, body, context, date, status}>}
     */
    _parseMessages(content) {
        if (!content || !content.trim()) return [];

        const messages = [];
        const blockRegex = /<!-- MSG:(\d+) -->([\s\S]*?)<!-- \/MSG:\1 -->/g;
        let match;

        while ((match = blockRegex.exec(content)) !== null) {
            const id = match[1];
            const block = match[2].trim();

            const from = this._extractField(block, 'Od') || 'Nieznany';
            const subject = this._extractField(block, 'Temat') || '(bez tematu)';
            const date = this._extractField(block, 'Data') || '';
            let status = this._extractField(block, 'Status') || 'NOWA';
            const context = this._extractField(block, 'Kontekst') || '';

            // Backwards compat: old status PRZECZYTANA → ALL_READ
            if (status === 'PRZECZYTANA') status = 'ALL_READ';

            const body = this._extractBody(block);

            messages.push({ id, from, subject, body, context, date, status });
        }

        return messages;
    }

    /**
     * Extract a **Field:** value from a message block
     * @param {string} block
     * @param {string} fieldName
     * @returns {string}
     */
    _extractField(block, fieldName) {
        const regex = new RegExp(`\\*\\*${fieldName}:\\*\\*\\s*(.+)`, 'i');
        const match = block.match(regex);
        return match ? match[1].trim() : '';
    }

    /**
     * Extract the body text from a message block (between header fields and optional Kontekst)
     * @param {string} block
     * @returns {string}
     */
    _extractBody(block) {
        const lines = block.split('\n');
        const bodyLines = [];

        for (const line of lines) {
            // Skip header fields
            if (/^\*\*(Od|Temat|Data|Status):\*\*/.test(line)) {
                continue;
            }
            // Stop at Kontekst field
            if (/^\*\*Kontekst:\*\*/.test(line)) {
                break;
            }
            bodyLines.push(line);
        }

        return bodyLines.join('\n').trim();
    }
}
