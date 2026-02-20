/**
 * PermissionsModal
 * Modal for managing agent permissions
 */
import { Modal, Setting } from 'obsidian';
import { PERMISSION_TYPES, PermissionSystem } from '../core/PermissionSystem.js';

export class PermissionsModal extends Modal {
    /**
     * @param {App} app - Obsidian App
     * @param {Agent} agent - Agent to edit permissions for
     * @param {Function} onSave - Callback when permissions are saved
     */
    constructor(app, agent, onSave) {
        super(app);
        this.agent = agent;
        this.onSave = onSave;
        this.tempPermissions = { ...agent.permissions };
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('pkm-permissions-modal');

        // Header
        contentEl.createEl('h2', {
            text: `Uprawnienia: ${this.agent.emoji} ${this.agent.name}`
        });

        // Presets section
        const presetContainer = contentEl.createDiv('permissions-presets');
        presetContainer.createEl('h4', { text: 'Szybkie ustawienia' });

        const presetButtons = presetContainer.createDiv('preset-buttons');

        // Safe Mode button
        const safeBtn = presetButtons.createEl('button', {
            text: '🔒 Safe Mode',
            cls: 'mod-cta'
        });
        safeBtn.onclick = () => this.applyPreset('safe');

        // Standard button
        const stdBtn = presetButtons.createEl('button', { text: '⚖️ Standard' });
        stdBtn.onclick = () => this.applyPreset('standard');

        // YOLO button
        const yoloBtn = presetButtons.createEl('button', {
            text: '🚀 YOLO',
            cls: 'mod-warning'
        });
        yoloBtn.onclick = () => this.applyPreset('yolo');

        // Permissions list
        contentEl.createEl('h4', { text: 'Szczegółowe uprawnienia' });

        const permissionsList = contentEl.createDiv('permissions-list');

        const allPermissions = PermissionSystem.getAllPermissionTypes();

        for (const { key, label } of allPermissions) {
            new Setting(permissionsList)
                .setName(label)
                .setDesc(this.getPermissionHint(key))
                .addToggle(toggle => {
                    toggle
                        .setValue(this.tempPermissions[key] === true)
                        .onChange(value => {
                            this.tempPermissions[key] = value;
                            // If YOLO enabled, show warning
                            if (key === PERMISSION_TYPES.YOLO_MODE && value) {
                                this.showYoloWarning();
                            }
                        });
                });
        }

        // Save/Cancel buttons
        const buttonContainer = contentEl.createDiv('modal-button-container');

        const cancelBtn = buttonContainer.createEl('button', { text: 'Anuluj' });
        cancelBtn.onclick = () => this.close();

        const saveBtn = buttonContainer.createEl('button', {
            text: 'Zapisz',
            cls: 'mod-cta'
        });
        saveBtn.onclick = () => this.save();
    }

    applyPreset(preset) {
        switch (preset) {
            case 'safe':
                this.tempPermissions = {
                    read_notes: true,
                    edit_notes: false,
                    create_files: false,
                    delete_files: false,
                    access_outside_vault: false,
                    execute_commands: false,
                    thinking: true,
                    mcp: false,
                    yolo_mode: false
                };
                break;
            case 'standard':
                this.tempPermissions = {
                    read_notes: true,
                    edit_notes: true,
                    create_files: true,
                    delete_files: false,
                    access_outside_vault: false,
                    execute_commands: false,
                    thinking: true,
                    mcp: true,
                    yolo_mode: false
                };
                break;
            case 'yolo':
                this.tempPermissions = {
                    read_notes: true,
                    edit_notes: true,
                    create_files: true,
                    delete_files: true,
                    access_outside_vault: true,
                    execute_commands: true,
                    thinking: true,
                    mcp: true,
                    yolo_mode: true
                };
                this.showYoloWarning();
                break;
        }
        // Refresh UI
        this.onOpen();
    }

    showYoloWarning() {
        const notice = document.createElement('div');
        notice.className = 'yolo-warning';
        notice.innerHTML = `
            <strong>⚠️ YOLO Mode</strong><br>
            Agent będzie automatycznie zatwierdzał wszystkie akcje bez pytania.
            Używaj ostrożnie!
        `;
        this.contentEl.insertBefore(notice, this.contentEl.firstChild.nextSibling);

        setTimeout(() => notice.remove(), 5000);
    }

    getPermissionHint(key) {
        const hints = {
            [PERMISSION_TYPES.READ_NOTES]: 'Pozwala czytać zawartość notatek',
            [PERMISSION_TYPES.EDIT_NOTES]: 'Pozwala modyfikować istniejące notatki',
            [PERMISSION_TYPES.CREATE_FILES]: 'Pozwala tworzyć nowe pliki',
            [PERMISSION_TYPES.DELETE_FILES]: 'Pozwala usuwać pliki (niebezpieczne!)',
            [PERMISSION_TYPES.ACCESS_OUTSIDE_VAULT]: 'Dostęp do plików poza vaultem',
            [PERMISSION_TYPES.EXECUTE_COMMANDS]: 'Wykonywanie komend systemowych',
            [PERMISSION_TYPES.THINKING]: 'Extended thinking w Claude',
            [PERMISSION_TYPES.MCP]: 'Używanie narzędzi MCP',
            [PERMISSION_TYPES.YOLO_MODE]: 'Auto-approve wszystkich akcji'
        };
        return hints[key] || '';
    }

    save() {
        // Update agent permissions
        this.agent.update({ default_permissions: this.tempPermissions });

        // Call callback
        if (this.onSave) {
            this.onSave(this.tempPermissions);
        }

        this.close();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * Open permissions modal for an agent
 * @param {App} app
 * @param {Agent} agent
 * @param {Function} onSave
 */
export function openPermissionsModal(app, agent, onSave) {
    new PermissionsModal(app, agent, onSave).open();
}
