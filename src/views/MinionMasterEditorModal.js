/**
 * MinionMasterEditorModal
 * Unified Creator/Editor modal for both Minions and Masters.
 * Mode: 'minion' or 'master' — changes defaults, save target, labels.
 */
import { Modal, Setting, Notice } from 'obsidian';
import { TOOL_INFO } from '../components/ToolCallDisplay.js';
import { UiIcons } from '../crystal-soul/UiIcons.js';

export class MinionMasterEditorModal extends Modal {
    /**
     * @param {Object} app - Obsidian App
     * @param {Object} plugin - Plugin instance
     * @param {'minion'|'master'} mode
     * @param {Object|null} existing - Existing config for edit mode, null for create
     * @param {Function} [onSave] - Callback after successful save
     */
    constructor(app, plugin, mode, existing = null, onSave = null) {
        super(app);
        this.plugin = plugin;
        this.mode = mode;
        this.existing = existing;
        this.onSave = onSave;
        this.isEditMode = !!existing;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('minion-master-editor-modal');

        const isMinion = this.mode === 'minion';
        const entityName = isMinion ? 'Minion' : 'Master';
        const title = this.isEditMode
            ? `Edytuj ${isMinion ? 'Miniona' : 'Mastera'}: ${this.existing.name}`
            : `Nowy ${entityName}`;

        contentEl.createEl('h3', { text: title });

        // Default tools per type
        const defaultTools = isMinion
            ? ['vault_search', 'memory_search', 'vault_read']
            : ['plan_action', 'chat_todo', 'vault_write'];

        // Form data
        const formData = {
            name: this.existing?.name || '',
            description: this.existing?.description || '',
            model: this.existing?.model || '',
            tools: [...(this.existing?.tools || defaultTools)],
            max_iterations: this.existing?.max_iterations ?? (isMinion ? 3 : 5),
            min_iterations: this.existing?.min_iterations ?? (isMinion ? 1 : 2),
            enabled: this.existing?.enabled !== false,
            prompt: this.existing?.prompt || ''
        };

        // --- Name ---
        new Setting(contentEl)
            .setName('Nazwa')
            .setDesc('Unikalna nazwa identyfikująca')
            .addText(text => {
                text.setPlaceholder(isMinion ? 'np. szukacz' : 'np. strateg')
                    .setValue(formData.name)
                    .onChange(v => formData.name = v.trim());
                if (this.isEditMode) text.inputEl.disabled = true;
            });

        // --- Description ---
        new Setting(contentEl)
            .setName('Opis')
            .setDesc('Krótki opis specjalizacji')
            .addText(text => {
                text.setPlaceholder('Co robi ten ' + entityName.toLowerCase() + '?')
                    .setValue(formData.description)
                    .onChange(v => formData.description = v.trim());
            });

        // --- Model override ---
        new Setting(contentEl)
            .setName('Model (opcjonalnie)')
            .setDesc('Pusty = domyślny model z ustawień')
            .addText(text => {
                text.setPlaceholder('np. claude-haiku-3.5')
                    .setValue(formData.model || '')
                    .onChange(v => formData.model = v.trim() || null);
            });

        // --- Iterations ---
        new Setting(contentEl)
            .setName('Max iteracji')
            .setDesc('Maksymalna liczba rund tool-calling')
            .addText(text => {
                text.inputEl.type = 'number';
                text.inputEl.min = '1';
                text.inputEl.max = '10';
                text.setValue(String(formData.max_iterations))
                    .onChange(v => formData.max_iterations = parseInt(v) || (isMinion ? 3 : 5));
            });

        new Setting(contentEl)
            .setName('Min iteracji')
            .setDesc('Minimalna liczba rund (nudge do kontynuacji)')
            .addText(text => {
                text.inputEl.type = 'number';
                text.inputEl.min = '1';
                text.inputEl.max = '10';
                text.setValue(String(formData.min_iterations))
                    .onChange(v => formData.min_iterations = parseInt(v) || (isMinion ? 1 : 2));
            });

        // --- Enabled toggle ---
        new Setting(contentEl)
            .setName('Aktywny')
            .addToggle(toggle => {
                toggle.setValue(formData.enabled).onChange(v => formData.enabled = v);
            });

        // --- Tools ---
        const toolsHeader = contentEl.createEl('h4');
        toolsHeader.innerHTML = `${UiIcons.wrench(18)} Narzędzia`;
        toolsHeader.style.cssText = 'display:flex; align-items:center; gap:6px;';
        const toolsContainer = contentEl.createDiv({ cls: 'editor-tools-grid' });

        // Get all known tools from TOOL_INFO
        const allToolNames = Object.keys(TOOL_INFO);
        for (const toolName of allToolNames) {
            const info = TOOL_INFO[toolName];
            new Setting(toolsContainer)
                .setName(info.label)
                .setDesc(toolName)
                .addToggle(toggle => {
                    toggle
                        .setValue(formData.tools.includes(toolName))
                        .onChange(v => {
                            if (v && !formData.tools.includes(toolName)) {
                                formData.tools.push(toolName);
                            } else if (!v) {
                                formData.tools = formData.tools.filter(t => t !== toolName);
                            }
                        });
                });
        }

        // --- Instructions textarea ---
        const promptHeader = contentEl.createEl('h4');
        promptHeader.innerHTML = `${UiIcons.edit(18)} Instrukcje (prompt)`;
        promptHeader.style.cssText = 'display:flex; align-items:center; gap:6px;';
        const textarea = contentEl.createEl('textarea', {
            placeholder: 'Instrukcje dla ' + entityName.toLowerCase() + '...\n\nTip: opisz rolę, procedurę, format odpowiedzi i ograniczenia.'
        });
        textarea.value = formData.prompt;
        textarea.style.cssText = 'width:100%; min-height:200px; font-family:var(--font-monospace); font-size:0.82em; resize:vertical; padding:8px; border:1px solid var(--background-modifier-border); border-radius:4px; background:var(--background-primary); color:var(--text-normal);';
        textarea.addEventListener('input', () => formData.prompt = textarea.value);

        // --- Action buttons ---
        const actions = contentEl.createDiv({ cls: 'editor-modal-actions' });

        // Save
        const saveBtn = actions.createEl('button', { cls: 'mod-cta' });
        saveBtn.innerHTML = this.isEditMode
            ? `${UiIcons.save(16)} Zapisz zmiany`
            : `${UiIcons.sparkle(16)} Utwórz`;
        saveBtn.style.cssText += 'display:inline-flex; align-items:center; gap:4px;';
        saveBtn.addEventListener('click', () => this._handleSave(formData));

        // Delete (edit mode only)
        if (this.isEditMode) {
            const deleteBtn = actions.createEl('button');
            deleteBtn.innerHTML = `${UiIcons.trash(16)} Usuń`;
            deleteBtn.style.cssText = 'color:var(--text-error); border-color:var(--text-error); display:inline-flex; align-items:center; gap:4px;';
            deleteBtn.addEventListener('click', () => this._handleDelete());
        }
    }

    async _handleSave(formData) {
        if (!formData.name.trim()) {
            new Notice('Podaj nazwę!');
            return;
        }
        if (!formData.description.trim()) {
            new Notice('Podaj opis!');
            return;
        }

        try {
            const loader = this.mode === 'minion'
                ? this.plugin.agentManager?.minionLoader
                : this.plugin.agentManager?.masterLoader;

            if (!loader) {
                new Notice('Loader niedostępny!');
                return;
            }

            const saveMethod = this.mode === 'minion' ? 'saveMinion' : 'saveMaster';
            await loader[saveMethod](formData);

            new Notice(`${this.mode === 'minion' ? 'Minion' : 'Master'} "${formData.name}" zapisany!`);
            if (this.onSave) this.onSave();
            this.close();
        } catch (e) {
            console.error(`[MinionMasterEditorModal] Save error:`, e);
            new Notice('Błąd zapisu: ' + e.message);
        }
    }

    async _handleDelete() {
        if (!this.existing?.name) return;

        const entityName = this.mode === 'minion' ? 'miniona' : 'mastera';
        // Simple confirm via Notice workaround (Obsidian doesn't have confirm dialog easily)
        // Using window.confirm as a pragmatic solution
        if (!confirm(`Na pewno usunąć ${entityName} "${this.existing.name}"?`)) return;

        try {
            const loader = this.mode === 'minion'
                ? this.plugin.agentManager?.minionLoader
                : this.plugin.agentManager?.masterLoader;

            const deleteMethod = this.mode === 'minion' ? 'deleteMinion' : 'deleteMaster';
            await loader[deleteMethod](this.existing.name);

            new Notice(`Usunięto: ${this.existing.name}`);
            if (this.onSave) this.onSave();
            this.close();
        } catch (e) {
            console.error(`[MinionMasterEditorModal] Delete error:`, e);
            new Notice('Błąd usuwania: ' + e.message);
        }
    }

    onClose() {
        this.contentEl.empty();
    }
}
