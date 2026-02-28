/**
 * SkillEditorModal
 * Creator/Editor modal for Skills (v2 format, agentskills.io compatible).
 * Pattern: same as MinionMasterEditorModal.
 *
 * Sesja 48: Skills v2.
 */
import { Modal, Setting, Notice } from 'obsidian';
import { TOOL_INFO } from '../components/ToolCallDisplay.js';
import { UiIcons } from '../crystal-soul/UiIcons.js';

/** Suggested categories (user can type anything) */
const CATEGORY_SUGGESTIONS = ['productivity', 'writing', 'organization', 'analysis', 'system', 'creative'];

export class SkillEditorModal extends Modal {
    /**
     * @param {Object} app - Obsidian App
     * @param {Object} plugin - Plugin instance
     * @param {Object|null} existing - Existing skill object for edit mode, null for create
     * @param {Function} [onSave] - Callback after successful save/delete
     */
    constructor(app, plugin, existing = null, onSave = null) {
        super(app);
        this.plugin = plugin;
        this.existing = existing;
        this.onSave = onSave;
        this.isEditMode = !!existing;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('skill-editor-modal');

        const title = this.isEditMode
            ? `Edytuj skill: ${this.existing.name}`
            : 'Nowy Skill';

        contentEl.createEl('h3', { text: title });

        // Form data
        const formData = {
            name: this.existing?.name || '',
            description: this.existing?.description || '',
            icon: this.existing?.icon || '🎯',
            category: this.existing?.category || 'general',
            tags: [...(this.existing?.tags || [])],
            version: this.existing?.version ?? 1,
            enabled: this.existing?.enabled !== false,
            model: this.existing?.model || '',
            allowedTools: [...(this.existing?.allowedTools || [])],
            disableModelInvocation: this.existing?.disableModelInvocation ?? false,
            userInvocable: this.existing?.userInvocable !== false,
            preQuestions: JSON.parse(JSON.stringify(this.existing?.preQuestions || [])),
            prompt: this.existing?.prompt || ''
        };

        // ─── BASIC INFO ───

        // Name
        new Setting(contentEl)
            .setName('Nazwa')
            .setDesc('Unikalna nazwa skilla (np. daily-review, write-article)')
            .addText(text => {
                text.setPlaceholder('np. weekly-review')
                    .setValue(formData.name)
                    .onChange(v => formData.name = v.trim());
                if (this.isEditMode) text.inputEl.disabled = true;
            });

        // Description
        new Setting(contentEl)
            .setName('Opis')
            .setDesc('Opisz KIEDY agent ma użyć tego skilla — to kluczowe dla auto-invoke')
            .addTextArea(text => {
                text.setPlaceholder('Np. "Tygodniowy przegląd vaulta. Używaj gdy user prosi o podsumowanie tygodnia, przegląd tasków lub planowanie."')
                    .setValue(formData.description)
                    .onChange(v => formData.description = v.trim());
                text.inputEl.rows = 3;
                text.inputEl.style.width = '100%';
            });

        // Icon + Category row
        new Setting(contentEl)
            .setName('Ikona')
            .setDesc('Emoji wyświetlane na guziku skilla')
            .addText(text => {
                text.setPlaceholder('🎯')
                    .setValue(formData.icon)
                    .onChange(v => formData.icon = v.trim() || '🎯');
                text.inputEl.style.width = '60px';
                text.inputEl.style.textAlign = 'center';
                text.inputEl.style.fontSize = '18px';
            });

        // Category with suggestions
        new Setting(contentEl)
            .setName('Kategoria')
            .setDesc('Grupowanie skilli (np. productivity, writing)')
            .addText(text => {
                text.setPlaceholder('productivity')
                    .setValue(formData.category)
                    .onChange(v => formData.category = v.trim() || 'general');
                // Add datalist for suggestions
                const dl = contentEl.createEl('datalist', { attr: { id: 'skill-cat-list' } });
                for (const cat of CATEGORY_SUGGESTIONS) {
                    dl.createEl('option', { attr: { value: cat } });
                }
                text.inputEl.setAttribute('list', 'skill-cat-list');
            });

        // Tags
        new Setting(contentEl)
            .setName('Tagi')
            .setDesc('Oddzielone przecinkami (np. weekly, review, planning)')
            .addText(text => {
                text.setPlaceholder('weekly, review, planning')
                    .setValue((formData.tags || []).join(', '))
                    .onChange(v => {
                        formData.tags = v.split(',').map(t => t.trim()).filter(Boolean);
                    });
            });

        // ─── ADVANCED SETTINGS ───

        const advHeader = contentEl.createEl('h4');
        advHeader.innerHTML = `${UiIcons.settings(18)} Ustawienia zaawansowane`;
        advHeader.style.cssText = 'display:flex; align-items:center; gap:6px;';

        // Version
        new Setting(contentEl)
            .setName('Wersja')
            .addText(text => {
                text.inputEl.type = 'number';
                text.inputEl.min = '1';
                text.inputEl.style.width = '60px';
                text.setValue(String(formData.version))
                    .onChange(v => formData.version = parseInt(v) || 1);
            });

        // Enabled
        new Setting(contentEl)
            .setName('Aktywny')
            .setDesc('Wyłączony skill nie pojawia się w UI ani w promptach')
            .addToggle(toggle => {
                toggle.setValue(formData.enabled).onChange(v => formData.enabled = v);
            });

        // Model override
        new Setting(contentEl)
            .setName('Model (opcjonalnie)')
            .setDesc('Override modelu na czas skilla. Pusty = model agenta.')
            .addText(text => {
                text.setPlaceholder('np. deepseek-reasoner')
                    .setValue(formData.model || '')
                    .onChange(v => formData.model = v.trim() || null);
            });

        // Auto-invoke (inverted disable-model-invocation)
        new Setting(contentEl)
            .setName('Auto-invoke')
            .setDesc('Agent sam aktywuje skill gdy zadanie usera pasuje do opisu')
            .addToggle(toggle => {
                toggle.setValue(!formData.disableModelInvocation)
                    .onChange(v => formData.disableModelInvocation = !v);
            });

        // User-invocable (visible in UI)
        new Setting(contentEl)
            .setName('Widoczny w UI')
            .setDesc('Wyłącz jeśli skill ma być tylko auto-invoke (bez guzika)')
            .addToggle(toggle => {
                toggle.setValue(formData.userInvocable)
                    .onChange(v => formData.userInvocable = v);
            });

        // ─── ALLOWED TOOLS ───

        const toolsHeader = contentEl.createEl('h4');
        toolsHeader.innerHTML = `${UiIcons.wrench(18)} Dozwolone narzędzia`;
        toolsHeader.style.cssText = 'display:flex; align-items:center; gap:6px;';
        const toolsNote = contentEl.createEl('p', {
            text: 'Zaznacz narzędzia które ten skill potrzebuje. Informuje agenta i inne systemy.',
            cls: 'setting-item-description'
        });
        toolsNote.style.marginTop = '-4px';
        toolsNote.style.marginBottom = '8px';

        const toolsContainer = contentEl.createDiv({ cls: 'editor-tools-grid' });
        const allToolNames = Object.keys(TOOL_INFO);
        for (const toolName of allToolNames) {
            const info = TOOL_INFO[toolName];
            new Setting(toolsContainer)
                .setName(info.label)
                .setDesc(toolName)
                .addToggle(toggle => {
                    toggle
                        .setValue((formData.allowedTools || []).includes(toolName))
                        .onChange(v => {
                            if (v && !formData.allowedTools.includes(toolName)) {
                                formData.allowedTools.push(toolName);
                            } else if (!v) {
                                formData.allowedTools = formData.allowedTools.filter(t => t !== toolName);
                            }
                        });
                });
        }

        // ─── PRE-QUESTIONS ───

        const pqHeader = contentEl.createEl('h4');
        pqHeader.innerHTML = `${UiIcons.question(18)} Pytania przed uruchomieniem`;
        pqHeader.style.cssText = 'display:flex; align-items:center; gap:6px;';
        const pqNote = contentEl.createEl('p', {
            text: 'Skill może zapytać usera o parametry zanim agent zacznie pracować. Użyj {{klucz}} w prompcie.',
            cls: 'setting-item-description'
        });
        pqNote.style.marginTop = '-4px';
        pqNote.style.marginBottom = '8px';

        const pqContainer = contentEl.createDiv({ cls: 'skill-prequestions-list' });

        const renderPreQuestions = () => {
            pqContainer.empty();

            for (let i = 0; i < formData.preQuestions.length; i++) {
                const pq = formData.preQuestions[i];
                const row = pqContainer.createDiv({ cls: 'skill-pq-row' });
                row.style.cssText = 'display:flex; gap:6px; margin-bottom:6px; align-items:center;';

                // Key (variable name)
                const keyInput = row.createEl('input', {
                    type: 'text', placeholder: 'klucz',
                    value: pq.key || '',
                    cls: 'skill-pq-input'
                });
                keyInput.style.cssText = 'width:80px; padding:4px 6px; font-size:12px; border:1px solid var(--background-modifier-border); border-radius:4px; background:var(--background-primary); color:var(--text-normal);';
                keyInput.addEventListener('input', () => pq.key = keyInput.value.trim());

                // Question text
                const qInput = row.createEl('input', {
                    type: 'text', placeholder: 'Pytanie do usera',
                    value: pq.question || '',
                    cls: 'skill-pq-input'
                });
                qInput.style.cssText = 'flex:1; padding:4px 6px; font-size:12px; border:1px solid var(--background-modifier-border); border-radius:4px; background:var(--background-primary); color:var(--text-normal);';
                qInput.addEventListener('input', () => pq.question = qInput.value);

                // Default value
                const defInput = row.createEl('input', {
                    type: 'text', placeholder: 'Domyślna wartość',
                    value: pq.default || '',
                    cls: 'skill-pq-input'
                });
                defInput.style.cssText = 'width:120px; padding:4px 6px; font-size:12px; border:1px solid var(--background-modifier-border); border-radius:4px; background:var(--background-primary); color:var(--text-normal);';
                defInput.addEventListener('input', () => pq.default = defInput.value);

                // Delete button
                const delBtn = row.createEl('button', { text: '✕', cls: 'skill-pq-delete' });
                delBtn.style.cssText = 'width:24px; height:24px; padding:0; font-size:14px; cursor:pointer; border:none; background:none; color:var(--text-error);';
                delBtn.addEventListener('click', () => {
                    formData.preQuestions.splice(i, 1);
                    renderPreQuestions();
                });
            }
        };

        renderPreQuestions();

        // Add question button
        const addPqBtn = contentEl.createEl('button', {
            text: '+ Dodaj pytanie',
            cls: 'skill-pq-add-btn'
        });
        addPqBtn.style.cssText = 'margin-bottom:12px; padding:4px 12px; font-size:12px; cursor:pointer;';
        addPqBtn.addEventListener('click', () => {
            formData.preQuestions.push({ key: '', question: '', default: '' });
            renderPreQuestions();
        });

        // ─── PROMPT ───

        const promptHeader = contentEl.createEl('h4');
        promptHeader.innerHTML = `${UiIcons.edit(18)} Prompt skilla`;
        promptHeader.style.cssText = 'display:flex; align-items:center; gap:6px;';
        const promptNote = contentEl.createEl('p', {
            text: 'Pełna instrukcja krok-po-kroku. Użyj {{klucz}} dla zmiennych z pytań powyżej.',
            cls: 'setting-item-description'
        });
        promptNote.style.marginTop = '-4px';
        promptNote.style.marginBottom = '8px';

        const textarea = contentEl.createEl('textarea', {
            placeholder: '# Nazwa procedury\n\n## Kroki\n1. vault_search("{{query}}")\n2. Dla każdego wyniku: vault_read\n3. Podsumuj wyniki\n4. Zapytaj usera o decyzję\n5. vault_write do notatki\n\n## Ton\nBądź pomocny i konkretny.'
        });
        textarea.value = formData.prompt;
        textarea.style.cssText = 'width:100%; min-height:300px; font-family:var(--font-monospace); font-size:0.82em; resize:vertical; padding:8px; border:1px solid var(--background-modifier-border); border-radius:4px; background:var(--background-primary); color:var(--text-normal);';
        textarea.addEventListener('input', () => formData.prompt = textarea.value);

        // ─── ACTIONS ───

        const actions = contentEl.createDiv({ cls: 'editor-modal-actions' });
        actions.style.cssText = 'display:flex; gap:8px; margin-top:16px; justify-content:flex-end;';

        // Save
        const saveBtn = actions.createEl('button', { cls: 'mod-cta' });
        saveBtn.innerHTML = this.isEditMode
            ? `${UiIcons.save(16)} Zapisz zmiany`
            : `${UiIcons.sparkle(16)} Utwórz skill`;
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
            new Notice('Podaj nazwę skilla!');
            return;
        }
        if (!formData.description.trim()) {
            new Notice('Podaj opis skilla! (Ważne dla auto-invoke)');
            return;
        }

        // Clean pre-questions: remove entries with empty key or question
        formData.preQuestions = (formData.preQuestions || []).filter(pq => pq.key && pq.question);

        try {
            const skillLoader = this.plugin.agentManager?.skillLoader;

            if (!skillLoader) {
                new Notice('SkillLoader niedostępny!');
                return;
            }

            await skillLoader.saveSkill(formData);

            new Notice(`Skill "${formData.name}" zapisany!`);
            if (this.onSave) this.onSave();
            this.close();
        } catch (e) {
            console.error('[SkillEditorModal] Save error:', e);
            new Notice('Błąd zapisu: ' + e.message);
        }
    }

    async _handleDelete() {
        if (!this.existing?.name) return;

        if (!confirm(`Na pewno usunąć skill "${this.existing.name}"?`)) return;

        try {
            const skillLoader = this.plugin.agentManager?.skillLoader;
            await skillLoader.deleteSkill(this.existing.name);

            new Notice(`Usunięto skill: ${this.existing.name}`);
            if (this.onSave) this.onSave();
            this.close();
        } catch (e) {
            console.error('[SkillEditorModal] Delete error:', e);
            new Notice('Błąd usuwania: ' + e.message);
        }
    }

    onClose() {
        this.contentEl.empty();
    }
}
