import { log } from '../utils/Logger.js';
import { UiIcons } from '../crystal-soul/UiIcons.js';

/**
 * MentionAutocomplete — dropdown autocomplete for @ mentions in chat textarea.
 *
 * V2: Chip-based system. Selecting a mention adds a chip above the input
 * (like attachments), not inline text. This handles paths with spaces correctly.
 *
 * Triggers on '@' character. Shows vault notes and folders.
 * Keyboard navigation: ArrowUp/Down, Enter/Tab to select, Escape to close.
 *
 * Usage:
 *   const autocomplete = new MentionAutocomplete(textarea, plugin, { onChange });
 *   // autocomplete.getMentions() → [{type, name, path, icon}]
 *   // autocomplete.hasMentions() → boolean
 *   // autocomplete.clear() → removes all chips
 *   // autocomplete.destroy() → cleanup
 */
export class MentionAutocomplete {
    constructor(textarea, plugin, options = {}) {
        this.textarea = textarea;
        this.plugin = plugin;
        this.onChange = options.onChange || (() => {});
        this.dropdown = null;
        this.isOpen = false;
        this.items = [];
        this.selectedIndex = 0;
        this.triggerStart = -1;
        this.currentQuery = '';
        this.currentCategory = null; // 'folder' or null (= notes)

        /** @type {Array<{type: string, name: string, path: string, icon: string}>} */
        this.mentions = [];

        this._onInput = this._handleInput.bind(this);
        this._onKeydown = this._handleKeydown.bind(this);
        this._onBlur = () => setTimeout(() => this.close(), 200);

        this.textarea.addEventListener('input', this._onInput);
        this.textarea.addEventListener('keydown', this._onKeydown);
        this.textarea.addEventListener('blur', this._onBlur);
    }

    // ═══════════════════════════════════════════
    // TRIGGER DETECTION
    // ═══════════════════════════════════════════

    _handleInput() {
        const value = this.textarea.value;
        const cursor = this.textarea.selectionStart;
        const before = value.slice(0, cursor);

        // Match @folder: or plain @
        const match = before.match(/@(folder:)?([^\s@]*)$/);

        if (match) {
            const query = match[2] || '';
            // Skip if cursor is inside an existing @[Name] mention
            if (query.startsWith('[')) {
                this.close();
                return;
            }
            this.triggerStart = cursor - match[0].length;
            this.currentCategory = match[1] ? 'folder' : null;
            this.currentQuery = query;
            this._updateSuggestions();
            this._open();
        } else {
            this.close();
        }
    }

    _handleKeydown(e) {
        if (!this.isOpen) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            this.selectedIndex = Math.min(this.selectedIndex + 1, this.items.length - 1);
            this._renderItems();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
            this._renderItems();
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            if (this.items.length > 0) {
                e.preventDefault();
                // Must use stopImmediatePropagation — _selectItem closes dropdown,
                // so chat_view's keydown handler would see isOpen=false and send the message
                e.stopImmediatePropagation();
                this._selectItem(this.items[this.selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            this.close();
        }
    }

    // ═══════════════════════════════════════════
    // SUGGESTIONS
    // ═══════════════════════════════════════════

    _updateSuggestions() {
        const query = this.currentQuery.toLowerCase();
        this.items = [];

        if (this.currentCategory === 'folder') {
            // Search folders
            const allFiles = this.plugin.app.vault.getAllLoadedFiles();
            const folders = allFiles
                .filter(f => f.children !== undefined) // TFolder has children
                .filter(f => !f.path.startsWith('.')) // skip hidden
                .filter(f => f.path.toLowerCase().includes(query))
                .slice(0, 10)
                .map(f => ({ type: 'folder', name: f.name, path: f.path, icon: UiIcons.folder(14) }));
            this.items = folders;
        } else {
            // Search notes (markdown files)
            const notes = this.plugin.app.vault.getMarkdownFiles()
                .filter(f => !f.path.startsWith('.')) // skip hidden
                .filter(f => f.basename.toLowerCase().includes(query) || f.path.toLowerCase().includes(query))
                .sort((a, b) => {
                    // Prioritize basename match over path match
                    const aBase = a.basename.toLowerCase().includes(query) ? 0 : 1;
                    const bBase = b.basename.toLowerCase().includes(query) ? 0 : 1;
                    if (aBase !== bBase) return aBase - bBase;
                    // Then by modification time (newest first)
                    return (b.stat?.mtime || 0) - (a.stat?.mtime || 0);
                })
                .slice(0, 10)
                .map(f => ({ type: 'note', name: f.basename, path: f.path, icon: UiIcons.file(14) }));

            // Also show folders if no category filter and few notes
            if (notes.length < 5 && query.length > 0) {
                const allFiles = this.plugin.app.vault.getAllLoadedFiles();
                const folders = allFiles
                    .filter(f => f.children !== undefined)
                    .filter(f => !f.path.startsWith('.'))
                    .filter(f => f.name.toLowerCase().includes(query))
                    .slice(0, 3)
                    .map(f => ({ type: 'folder', name: f.name, path: f.path, icon: UiIcons.folder(14) }));
                this.items = [...notes, ...folders];
            } else {
                this.items = notes;
            }
        }

        this.selectedIndex = 0;
        this._renderItems();
    }

    // ═══════════════════════════════════════════
    // SELECTION — adds chip instead of inline text
    // ═══════════════════════════════════════════

    _selectItem(item) {
        // Replace @query with @[Name] inline in textarea
        const value = this.textarea.value;
        const cursor = this.textarea.selectionStart;
        const before = value.slice(0, this.triggerStart);
        const after = value.slice(cursor);
        const mentionTag = `@[${item.name}] `;
        this.textarea.value = before + mentionTag + after;
        const newCursor = before.length + mentionTag.length;
        this.textarea.setSelectionRange(newCursor, newCursor);
        this.textarea.focus();

        // Check for duplicates
        if (this.mentions.some(m => m.path === item.path)) {
            log.debug('MentionAutocomplete', `Już dodano: ${item.path}`);
            this.close();
            return;
        }

        // Add mention
        this.mentions.push({
            type: item.type,
            name: item.name,
            path: item.path,
            icon: item.icon,
        });

        this.onChange(this.mentions);
        this.close();

        // Trigger input resize
        this.textarea.dispatchEvent(new Event('input'));

        log.debug('MentionAutocomplete', `Dodano chip: ${item.type} "${item.path}"`);
    }

    // ═══════════════════════════════════════════
    // DROPDOWN UI
    // ═══════════════════════════════════════════

    _open() {
        if (!this.dropdown) {
            this.dropdown = document.createElement('div');
            this.dropdown.addClass('pkm-mention-dropdown');
            // Position relative to textarea wrapper
            this.textarea.parentElement.style.position = 'relative';
            this.textarea.parentElement.appendChild(this.dropdown);
        }
        this.dropdown.style.display = 'block';
        this.isOpen = true;
        this._renderItems();
    }

    close() {
        if (this.dropdown) {
            this.dropdown.style.display = 'none';
        }
        this.isOpen = false;
        this.items = [];
    }

    _renderItems() {
        if (!this.dropdown) return;
        this.dropdown.empty();

        if (this.items.length === 0) {
            const empty = this.dropdown.createDiv({ cls: 'mention-item mention-empty' });
            empty.textContent = this.currentQuery ? 'Brak wyników' : 'Wpisz nazwę notatki...';
            return;
        }

        // Category headers
        let lastType = null;
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];

            // Category header
            if (item.type !== lastType) {
                const header = this.dropdown.createDiv({ cls: 'mention-category' });
                header.textContent = item.type === 'note' ? 'Notatki' : 'Foldery';
                lastType = item.type;
            }

            const row = this.dropdown.createDiv({
                cls: `mention-item${i === this.selectedIndex ? ' selected' : ''}`
            });

            const iconSpan = row.createSpan({ cls: 'mention-icon' });
            iconSpan.innerHTML = item.icon;
            const nameSpan = row.createSpan({ cls: 'mention-name', text: item.name });

            // Show path if different from name
            if (item.path !== item.name && item.path !== item.name + '.md') {
                row.createSpan({ cls: 'mention-path', text: item.path });
            }

            row.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Prevent blur
                this._selectItem(item);
            });

            row.addEventListener('mouseover', () => {
                this.selectedIndex = i;
                this._renderItems();
            });
        }

        // Scroll selected into view
        const selectedEl = this.dropdown.querySelector('.mention-item.selected');
        if (selectedEl) selectedEl.scrollIntoView({ block: 'nearest' });
    }

    // ═══════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════

    /**
     * Get current mention chips.
     * @returns {Array<{type: string, name: string, path: string, icon: string}>}
     */
    getMentions() {
        return [...this.mentions];
    }

    /**
     * Check if there are any mention chips.
     * @returns {boolean}
     */
    hasMentions() {
        return this.mentions.length > 0;
    }

    /**
     * Clear all mentions (call after send).
     */
    clear() {
        this.mentions = [];
        this.onChange(this.mentions);
    }

    /**
     * Remove a mention by index (called from AttachmentManager chip bar).
     * @param {number} index
     */
    removeMention(index) {
        if (index >= 0 && index < this.mentions.length) {
            const mention = this.mentions[index];
            // Remove corresponding @[Name] from textarea text
            const tag = `@[${mention.name}]`;
            const value = this.textarea.value;
            const pos = value.indexOf(tag);
            if (pos !== -1) {
                const end = pos + tag.length;
                const hasTrailingSpace = value[end] === ' ';
                this.textarea.value = value.slice(0, pos) + value.slice(end + (hasTrailingSpace ? 1 : 0));
            }
            this.mentions.splice(index, 1);
            this.onChange(this.mentions);
        }
    }

    // ═══════════════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════════════

    destroy() {
        this.textarea.removeEventListener('input', this._onInput);
        this.textarea.removeEventListener('keydown', this._onKeydown);
        this.textarea.removeEventListener('blur', this._onBlur);
        if (this.dropdown) {
            this.dropdown.remove();
            this.dropdown = null;
        }
    }
}
