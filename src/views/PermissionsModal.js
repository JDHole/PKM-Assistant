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

        const safeBtn = presetButtons.createEl('button', {
            text: '🔒 Safe',
            cls: 'mod-cta'
        });
        safeBtn.onclick = () => this.applyPreset('safe');

        const stdBtn = presetButtons.createEl('button', { text: '⚖️ Standard' });
        stdBtn.onclick = () => this.applyPreset('standard');

        const yoloBtn = presetButtons.createEl('button', {
            text: '🚀 Full',
            cls: 'mod-warning'
        });
        yoloBtn.onclick = () => this.applyPreset('yolo');

        // Active permissions
        contentEl.createEl('h4', { text: 'Szczegółowe uprawnienia' });

        const permissionsList = contentEl.createDiv('permissions-list');

        const activePerms = [
            { key: PERMISSION_TYPES.READ_NOTES, hint: 'Czytanie notatek' },
            { key: PERMISSION_TYPES.EDIT_NOTES, hint: 'Modyfikacja notatek' },
            { key: PERMISSION_TYPES.CREATE_FILES, hint: 'Tworzenie plików' },
            { key: PERMISSION_TYPES.DELETE_FILES, hint: 'Usuwanie plików' },
            { key: PERMISSION_TYPES.MCP, hint: 'Narzędzia MCP (wyszukiwanie, zapis, delegacja)' },
            { key: PERMISSION_TYPES.YOLO_MODE, hint: 'Automatyczne zatwierdzanie (bez pytania)' },
            { key: 'memory', hint: 'Pamięć agenta (brain.md, sesje, narzędzia pamięci)' },
            { key: 'guidance_mode', hint: 'Wyłączony = WHITELIST (tylko focus folders). Włączony = cały vault (focus folders to priorytety).' }
        ];

        for (const { key, hint } of activePerms) {
            new Setting(permissionsList)
                .setName(PermissionSystem.getPermissionDescription(key) || hint)
                .setDesc(hint)
                .addToggle(toggle => {
                    toggle
                        .setValue(this.tempPermissions[key] === true)
                        .onChange(value => {
                            this.tempPermissions[key] = value;
                            if (key === PERMISSION_TYPES.YOLO_MODE && value) {
                                this.showYoloWarning();
                            }
                        });
                });
        }

        // Planned permissions (disabled)
        contentEl.createEl('h4', { text: 'Planowane' });
        const plannedList = contentEl.createDiv('permissions-list');
        const comingSoon = [
            { label: 'Dostęp poza vaultem', desc: 'Wkrótce' },
            { label: 'Komendy systemowe', desc: 'Wkrótce' }
        ];
        for (const { label, desc } of comingSoon) {
            new Setting(plannedList)
                .setName(label)
                .setDesc(desc)
                .addToggle(toggle => {
                    toggle.setValue(false).setDisabled(true);
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
                    thinking: false,
                    mcp: false,
                    yolo_mode: false,
                    memory: true,
                    guidance_mode: false
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
                    thinking: false,
                    mcp: true,
                    yolo_mode: false,
                    memory: true,
                    guidance_mode: false
                };
                break;
            case 'yolo':
                this.tempPermissions = {
                    read_notes: true,
                    edit_notes: true,
                    create_files: true,
                    delete_files: true,
                    access_outside_vault: false,
                    execute_commands: false,
                    thinking: false,
                    mcp: true,
                    yolo_mode: true,
                    memory: true,
                    guidance_mode: false
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
            [PERMISSION_TYPES.MCP]: 'Narzędzia MCP (wyszukiwanie, zapis, delegacja)',
            [PERMISSION_TYPES.YOLO_MODE]: 'Automatyczne zatwierdzanie (bez pytania)',
            'memory': 'Pamięć agenta (brain.md, sesje, narzędzia pamięci)',
            'guidance_mode': 'OFF = WHITELIST (strict). ON = cały vault, focus folders to priorytety.'
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
