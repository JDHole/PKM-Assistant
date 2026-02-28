/**
 * SendToAgentModal
 * Mini-modal for sending selected text to an agent's inbox.
 * Triggered from editor context menu.
 */
import { Modal, Notice } from 'obsidian';
import { UiIcons } from '../crystal-soul/UiIcons.js';

export class SendToAgentModal extends Modal {
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
        contentEl.style.maxWidth = '450px';

        // Title
        const h3 = contentEl.createEl('h3');
        h3.innerHTML = `${UiIcons.send(18)} Wyślij do asystenta`;

        // Selected text preview
        const preview = contentEl.createDiv({
            cls: 'send-to-agent-preview'
        });
        preview.style.cssText = 'background: var(--background-secondary); border-radius: 6px; padding: 8px 10px; margin-bottom: 12px; font-size: 0.85em; max-height: 120px; overflow-y: auto; white-space: pre-wrap; color: var(--text-muted);';
        const previewText = this.selectedText.length > 500
            ? this.selectedText.slice(0, 500) + '...'
            : this.selectedText;
        preview.textContent = previewText;

        // File path hint
        if (this.filePath) {
            const pathHint = contentEl.createEl('p', {
                text: `Z pliku: ${this.filePath}`
            });
            pathHint.style.cssText = 'font-size: 0.75em; color: var(--text-muted); margin: 0 0 12px 0;';
        }

        // Agent dropdown
        const agentRow = contentEl.createDiv();
        agentRow.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 10px;';
        agentRow.createEl('label', { text: 'Do:' }).style.cssText = 'font-weight: 500; min-width: 70px; font-size: 0.9em;';

        const agentSelect = agentRow.createEl('select');
        agentSelect.style.cssText = 'flex: 1; padding: 5px 8px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-primary); color: var(--text-normal); font-size: 0.9em;';

        const agentManager = this.plugin.agentManager;
        if (agentManager) {
            const agents = agentManager.getAllAgents();
            for (const agent of agents) {
                const opt = agentSelect.createEl('option', {
                    value: agent.name,
                    text: agent.name
                });
                // Pre-select active agent
                if (agent.name === agentManager.getActiveAgent()?.name) {
                    opt.selected = true;
                }
            }
        }

        // Comment textarea
        const commentRow = contentEl.createDiv();
        commentRow.style.cssText = 'display: flex; align-items: flex-start; gap: 8px; margin-bottom: 12px;';
        commentRow.createEl('label', { text: 'Komentarz:' }).style.cssText = 'font-weight: 500; min-width: 70px; font-size: 0.9em; padding-top: 5px;';

        const commentArea = commentRow.createEl('textarea', {
            placeholder: 'Opcjonalny komentarz...'
        });
        commentArea.style.cssText = 'flex: 1; padding: 5px 8px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-primary); color: var(--text-normal); font-size: 0.85em; font-family: inherit; min-height: 50px; resize: vertical;';
        commentArea.rows = 2;

        // Buttons
        const buttons = contentEl.createDiv();
        buttons.style.cssText = 'display: flex; justify-content: flex-end; gap: 8px; padding-top: 8px; border-top: 1px solid var(--background-modifier-border);';

        const cancelBtn = buttons.createEl('button', { text: 'Anuluj' });
        cancelBtn.addEventListener('click', () => this.close());

        const sendBtn = buttons.createEl('button', {
            cls: 'mod-cta'
        });
        sendBtn.innerHTML = `${UiIcons.send(14)} Wyślij`;

        sendBtn.addEventListener('click', async () => {
            const toAgent = agentSelect.value;
            if (!toAgent) {
                new Notice('Wybierz agenta!');
                return;
            }

            const komunikator = this.plugin.agentManager?.komunikatorManager;
            if (!komunikator) {
                new Notice('Komunikator niedostępny');
                return;
            }

            try {
                const comment = commentArea.value.trim();
                const subject = comment
                    ? comment.slice(0, 60)
                    : `Fragment z ${this.filePath || 'notatki'}`;
                const context = this.filePath
                    ? `${this.filePath}${comment ? ' | ' + comment : ''}`
                    : comment || '';

                await komunikator.writeMessage('User', toAgent, subject, this.selectedText, context);
                this.plugin.agentManager?._emit('communicator:message_sent');
                new Notice(`Wysłano do ${toAgent}!`);
                this.close();
            } catch (e) {
                new Notice('Błąd: ' + e.message);
            }
        });
    }

    onClose() {
        this.contentEl.empty();
    }
}
