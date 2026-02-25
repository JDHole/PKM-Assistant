/**
 * ApprovalModal
 * Modal for approving/denying agent actions.
 * Polish UI, content preview, deny reason field.
 */
import { Modal } from 'obsidian';

export class ApprovalModal extends Modal {
    /**
     * @param {App} app - Obsidian App
     * @param {Object} action - Action to approve
     * @param {string} action.type - Action type (e.g., 'vault.write', 'vault.delete')
     * @param {string} action.description - Human-readable description
     * @param {string} action.targetPath - Target file path
     * @param {string} [action.preview] - Optional preview summary
     * @param {string} [action.contentPreview] - Actual content for vault_write
     * @param {string} action.agentName - Name of the agent requesting
     */
    constructor(app, action) {
        super(app);
        this.action = action;
        this.result = null;
        this.resolvePromise = null;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('pkm-approval-modal');

        // Header with warning icon
        const header = contentEl.createDiv('approval-header');
        header.createEl('h2', { text: '⚠️ Wymagane zatwierdzenie' });

        // Agent action description (human-readable)
        const agentInfo = contentEl.createDiv('approval-agent');
        agentInfo.createEl('p', {
            text: this._getHumanDescription()
        });

        // Action details
        const details = contentEl.createDiv('approval-details');

        // Action type badge
        const typeBadge = details.createEl('span', {
            cls: `action-badge action-${this._getActionSeverity()}`
        });
        typeBadge.textContent = this._getActionLabel();

        // Target path
        if (this.action.targetPath) {
            const pathEl = details.createDiv('action-path');
            pathEl.createEl('span', { text: '📁 ' });
            pathEl.createEl('code', { text: this.action.targetPath });
        }

        // Content preview for vault_write
        if (this.action.contentPreview) {
            const previewSection = contentEl.createDiv('approval-preview');
            previewSection.createEl('h4', { text: 'Co zostanie zapisane:' });
            const previewContent = previewSection.createEl('pre', { cls: 'approval-content-preview' });
            const truncated = this.action.contentPreview.length > 500
                ? this.action.contentPreview.slice(0, 500) + '\n... (skrócono)'
                : this.action.contentPreview;
            previewContent.createEl('code', { text: truncated });
        } else if (this.action.preview) {
            // Fallback: old-style preview
            const previewSection = contentEl.createDiv('approval-preview');
            previewSection.createEl('h4', { text: 'Szczegóły:' });
            const previewContent = previewSection.createEl('pre');
            previewContent.createEl('code', { text: this.action.preview });
        }

        // Deny reason field (hidden by default)
        const denyReasonDiv = contentEl.createDiv({ cls: 'approval-deny-reason' });
        denyReasonDiv.style.display = 'none';
        denyReasonDiv.createEl('label', { text: 'Dlaczego nie? (opcjonalne)' });
        const denyReasonInput = denyReasonDiv.createEl('input', {
            type: 'text',
            placeholder: 'np. Nie modyfikuj tego pliku',
            cls: 'approval-deny-input'
        });
        denyReasonInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this._resolve({ result: 'deny', reason: denyReasonInput.value.trim() });
            }
        });

        // Buttons
        const buttonContainer = contentEl.createDiv('approval-buttons');

        // Deny button — first click shows reason field, second confirms
        let denyClicked = false;
        const denyBtn = buttonContainer.createEl('button', {
            text: '❌ Odrzuć',
            cls: 'mod-warning'
        });
        denyBtn.onclick = () => {
            if (!denyClicked) {
                denyClicked = true;
                denyReasonDiv.style.display = 'block';
                denyBtn.textContent = '❌ Potwierdź odmowę';
                denyReasonInput.focus();
            } else {
                this._resolve({ result: 'deny', reason: denyReasonInput.value.trim() });
            }
        };

        // Approve button
        const approveBtn = buttonContainer.createEl('button', {
            text: '✅ Zatwierdź',
            cls: 'mod-cta'
        });
        approveBtn.onclick = () => this._resolve({ result: 'approve', reason: '' });

        // Always approve button
        const alwaysBtn = buttonContainer.createEl('button', {
            text: '🔄 Zawsze zatwierdzaj to',
            cls: 'mod-muted'
        });
        alwaysBtn.onclick = () => this._resolve({ result: 'always', reason: '' });
    }

    _getHumanDescription() {
        const name = this.action.agentName || 'AI';
        const path = this.action.targetPath || 'plik';
        const descriptions = {
            'vault.write': `${name} chce zapisać zmiany w pliku "${path}"`,
            'vault.delete': `${name} chce USUNĄĆ plik "${path}"`,
            'vault.create': `${name} chce utworzyć nowy plik "${path}"`,
            'command.execute': `${name} chce wykonać komendę systemową`,
            'mcp.call': `${name} chce wywołać narzędzie`
        };
        return descriptions[this.action.type] || `${name} chce wykonać akcję na "${path}"`;
    }

    _getActionLabel() {
        const labels = {
            'vault.write': '📝 Zapis pliku',
            'vault.delete': '🗑️ Usuwanie pliku',
            'vault.create': '📄 Tworzenie pliku',
            'command.execute': '⚡ Komenda systemowa',
            'mcp.call': '🔧 Wywołanie MCP'
        };
        return labels[this.action.type] || this.action.type;
    }

    _getActionSeverity() {
        const severities = {
            'vault.delete': 'danger',
            'command.execute': 'danger',
            'vault.write': 'warning',
            'vault.create': 'info',
            'mcp.call': 'info'
        };
        return severities[this.action.type] || 'info';
    }

    _resolve(result) {
        this.result = result;
        if (this.resolvePromise) {
            this.resolvePromise(result);
        }
        this.close();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();

        // If closed without action, treat as deny
        if (this.result === null && this.resolvePromise) {
            this.resolvePromise({ result: 'deny', reason: '' });
        }
    }

    /**
     * Show modal and wait for user response
     * @returns {Promise<{result: 'approve'|'deny'|'always', reason: string}>}
     */
    async waitForResponse() {
        return new Promise((resolve) => {
            this.resolvePromise = resolve;
            this.open();
        });
    }
}

/**
 * Request approval for an action
 * @param {App} app
 * @param {Object} action
 * @returns {Promise<{result: 'approve'|'deny'|'always', reason: string}>}
 */
export async function requestApproval(app, action) {
    const modal = new ApprovalModal(app, action);
    return modal.waitForResponse();
}
