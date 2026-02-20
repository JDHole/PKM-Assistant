/**
 * ApprovalModal
 * Modal for approving/denying agent actions
 */
import { Modal } from 'obsidian';

export class ApprovalModal extends Modal {
    /**
     * @param {App} app - Obsidian App
     * @param {Object} action - Action to approve
     * @param {string} action.type - Action type (e.g., 'vault.write', 'vault.delete')
     * @param {string} action.description - Human-readable description
     * @param {string} action.targetPath - Target file path
     * @param {string} action.preview - Optional preview of changes
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

        // Agent info
        const agentInfo = contentEl.createDiv('approval-agent');
        agentInfo.createEl('p', {
            text: `Agent ${this.action.agentName || 'AI'} chce wykonać akcję:`
        });

        // Action details
        const details = contentEl.createDiv('approval-details');

        // Action type badge
        const typeBadge = details.createEl('span', {
            cls: `action-badge action-${this.getActionSeverity()}`
        });
        typeBadge.textContent = this.getActionLabel();

        // Description
        details.createEl('p', {
            text: this.action.description,
            cls: 'action-description'
        });

        // Target path
        if (this.action.targetPath) {
            const pathEl = details.createDiv('action-path');
            pathEl.createEl('span', { text: '📁 ' });
            pathEl.createEl('code', { text: this.action.targetPath });
        }

        // Preview (if available)
        if (this.action.preview) {
            const previewSection = contentEl.createDiv('approval-preview');
            previewSection.createEl('h4', { text: 'Podgląd zmian:' });
            const previewContent = previewSection.createEl('pre');
            previewContent.createEl('code', { text: this.action.preview });
        }

        // Buttons
        const buttonContainer = contentEl.createDiv('approval-buttons');

        // Deny button
        const denyBtn = buttonContainer.createEl('button', {
            text: '❌ Odrzuć',
            cls: 'mod-warning'
        });
        denyBtn.onclick = () => this.resolve('deny');

        // Approve button
        const approveBtn = buttonContainer.createEl('button', {
            text: '✅ Zatwierdź',
            cls: 'mod-cta'
        });
        approveBtn.onclick = () => this.resolve('approve');

        // Always approve button
        const alwaysBtn = buttonContainer.createEl('button', {
            text: '🔄 Zawsze zatwierdzaj to',
            cls: 'mod-muted'
        });
        alwaysBtn.onclick = () => this.resolve('always');
    }

    getActionLabel() {
        const labels = {
            'vault.write': 'Edycja pliku',
            'vault.delete': 'Usuwanie pliku',
            'vault.create': 'Tworzenie pliku',
            'command.execute': 'Komenda systemowa',
            'mcp.call': 'Wywołanie MCP'
        };
        return labels[this.action.type] || this.action.type;
    }

    getActionSeverity() {
        const severities = {
            'vault.delete': 'danger',
            'command.execute': 'danger',
            'vault.write': 'warning',
            'vault.create': 'info',
            'mcp.call': 'info'
        };
        return severities[this.action.type] || 'info';
    }

    resolve(result) {
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
            this.resolvePromise('deny');
        }
    }

    /**
     * Show modal and wait for user response
     * @returns {Promise<'approve'|'deny'|'always'>}
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
 * @returns {Promise<'approve'|'deny'|'always'>}
 */
export async function requestApproval(app, action) {
    const modal = new ApprovalModal(app, action);
    return modal.waitForResponse();
}
