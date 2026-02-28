/**
 * ApprovalModal
 * Modal for approving/denying agent actions.
 * Polish UI, content preview, deny reason field.
 */
import { Modal } from 'obsidian';
import { UiIcons } from '../crystal-soul/UiIcons.js';

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
        const h2 = header.createEl('h2');
        h2.innerHTML = `${UiIcons.warning(20)} Wymagane zatwierdzenie`;

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
        typeBadge.innerHTML = this._getActionLabel();

        // Target path
        if (this.action.targetPath) {
            const pathEl = details.createDiv('action-path');
            const folderIcon = pathEl.createEl('span');
            folderIcon.innerHTML = UiIcons.folder(14) + ' ';
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
            cls: 'mod-warning'
        });
        denyBtn.innerHTML = `${UiIcons.cross(14)} Odrzuć`;
        denyBtn.onclick = () => {
            if (!denyClicked) {
                denyClicked = true;
                denyReasonDiv.style.display = 'block';
                denyBtn.innerHTML = `${UiIcons.cross(14)} Potwierdź odmowę`;
                denyReasonInput.focus();
            } else {
                this._resolve({ result: 'deny', reason: denyReasonInput.value.trim() });
            }
        };

        // Approve button
        const approveBtn = buttonContainer.createEl('button', {
            cls: 'mod-cta'
        });
        approveBtn.innerHTML = `${UiIcons.check(14)} Zatwierdź`;
        approveBtn.onclick = () => this._resolve({ result: 'approve', reason: '' });

        // Always approve button
        const alwaysBtn = buttonContainer.createEl('button', {
            cls: 'mod-muted'
        });
        alwaysBtn.innerHTML = `${UiIcons.refresh(14)} Zawsze zatwierdzaj to`;
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
            'vault.write': `${UiIcons.edit(14)} Zapis pliku`,
            'vault.delete': `${UiIcons.trash(14)} Usuwanie pliku`,
            'vault.create': `${UiIcons.file(14)} Tworzenie pliku`,
            'command.execute': `${UiIcons.zap(14)} Komenda systemowa`,
            'mcp.call': `${UiIcons.wrench(14)} Wywołanie MCP`
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
