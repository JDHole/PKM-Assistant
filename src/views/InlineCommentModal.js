/**
 * InlineCommentModal
 * Mini-modal for sending inline edit comments to the active agent.
 * User selects text → right-click → "Komentarz do Asystenta" → writes what to change.
 * Agent receives formatted message and edits the file directly via vault_write.
 */
import { Modal, Notice } from 'obsidian';

export class InlineCommentModal extends Modal {
    /**
     * @param {App} app
     * @param {Object} plugin
     * @param {string} selectedText - The text user selected in the editor
     * @param {string} filePath - Path of the file where text was selected
     */
    constructor(app, plugin, selectedText, filePath) {
        super(app);
        this.plugin = plugin;
        this.selectedText = selectedText;
        this.filePath = filePath;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.style.maxWidth = '480px';

        contentEl.createEl('h3', { text: '✏️ Komentarz do Asystenta' });

        // Selection preview (read-only)
        const preview = contentEl.createDiv();
        preview.style.cssText = 'background: var(--background-secondary); border-radius: 6px; padding: 8px 10px; margin-bottom: 12px; font-size: 0.85em; max-height: 120px; overflow-y: auto; white-space: pre-wrap; color: var(--text-muted);';
        const previewText = this.selectedText.length > 500
            ? this.selectedText.slice(0, 500) + '...'
            : this.selectedText;
        preview.textContent = previewText;

        // File path hint
        if (this.filePath) {
            const pathHint = contentEl.createEl('p', {
                text: `Plik: ${this.filePath}`
            });
            pathHint.style.cssText = 'font-size: 0.75em; color: var(--text-muted); margin: 0 0 12px 0;';
        }

        // Comment textarea
        const label = contentEl.createEl('label', { text: 'Co zmienić:' });
        label.style.cssText = 'font-weight: 500; font-size: 0.9em; display: block; margin-bottom: 4px;';

        const commentArea = contentEl.createEl('textarea', {
            placeholder: 'Opisz co chcesz zmienić w tym fragmencie...'
        });
        commentArea.style.cssText = 'width: 100%; padding: 8px; border: 1px solid var(--background-modifier-border); border-radius: 6px; background: var(--background-primary); color: var(--text-normal); font-size: 0.9em; font-family: inherit; min-height: 80px; resize: vertical; box-sizing: border-box;';
        commentArea.rows = 3;

        // Buttons
        const buttons = contentEl.createDiv();
        buttons.style.cssText = 'display: flex; justify-content: flex-end; gap: 8px; padding-top: 12px; border-top: 1px solid var(--background-modifier-border); margin-top: 12px;';

        const cancelBtn = buttons.createEl('button', { text: 'Anuluj' });
        cancelBtn.addEventListener('click', () => this.close());

        const sendBtn = buttons.createEl('button', {
            text: '✏️ Edytuj',
            cls: 'mod-cta'
        });

        sendBtn.addEventListener('click', () => {
            const comment = commentArea.value.trim();
            if (!comment) {
                new Notice('Wpisz komentarz!');
                return;
            }
            this.plugin.sendInlineComment(this.filePath, this.selectedText, comment);
            this.close();
        });

        // Focus textarea
        setTimeout(() => commentArea.focus(), 50);
    }

    onClose() {
        this.contentEl.empty();
    }
}
