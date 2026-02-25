/**
 * AgentProfileModal
 * Unified modal for creating and editing agents.
 * Tabs: Profil, Uprawnienia, Umiejętności, Pamięć, Statystyki.
 * Mode: create (agent=null) or edit (agent=Agent instance).
 */
import { Modal, Setting, MarkdownRenderer, Notice } from 'obsidian';
import { getArchetypeList, ARCHETYPE_DEFAULTS } from '../agents/archetypes/index.js';
import { PermissionSystem, PERMISSION_TYPES } from '../core/PermissionSystem.js';
import { DEFAULT_PERMISSIONS } from '../agents/Agent.js';
import agent_profile_styles from './AgentProfileModal.css' with { type: 'css' };

// Tab definitions
const TABS = [
    { id: 'profile', label: 'Profil', icon: '👤' },
    { id: 'permissions', label: 'Uprawnienia', icon: '🔒' },
    { id: 'skills', label: 'Umiejętności', icon: '⚡' },
    { id: 'memory', label: 'Pamięć', icon: '🧠', editOnly: true },
    { id: 'stats', label: 'Statystyki', icon: '📊', editOnly: true }
];

export class AgentProfileModal extends Modal {
    /**
     * @param {App} app
     * @param {Object} plugin - Obsek plugin instance
     * @param {Agent|null} agent - null = create mode, Agent = edit mode
     * @param {Function|null} onSave - Callback after save
     */
    constructor(app, plugin, agent = null, onSave = null) {
        super(app);
        this.plugin = plugin;
        this.agent = agent;
        this.onSave = onSave;
        this.isCreateMode = !agent;
        this.activeTab = 'profile';

        // Form data (copy from agent or defaults)
        if (agent) {
            this.formData = {
                name: agent.name,
                emoji: agent.emoji,
                archetype: agent.archetype || '',
                personality: agent.personality || '',
                temperature: agent.temperature,
                role: agent.role || 'specialist',
                focus_folders: [...(agent.focusFolders || [])],
                model: agent.model || '',
                skills: [...(agent.skills || [])],
                minion: agent.minion || '',
                minion_enabled: agent.minionEnabled !== false,
                permissions: { ...agent.permissions },
                models: JSON.parse(JSON.stringify(agent.models || {}))
            };
        } else {
            this.formData = {
                name: '',
                emoji: '🤖',
                archetype: 'human_vibe',
                personality: '',
                temperature: 0.7,
                role: 'specialist',
                focus_folders: [],
                model: '',
                skills: [],
                minion: '',
                minion_enabled: true,
                permissions: { ...DEFAULT_PERMISSIONS, mcp: true },
                models: {}
            };
        }
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('agent-profile-modal');

        // Adopt CSS
        if (!document.adoptedStyleSheets.includes(agent_profile_styles)) {
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, agent_profile_styles];
        }

        // Header
        const title = this.isCreateMode
            ? '✨ Nowy Agent'
            : `${this.formData.emoji} ${this.formData.name}`;
        contentEl.createEl('h2', { text: title, cls: 'agent-profile-title' });

        // Tab bar
        this.renderTabBar(contentEl);

        // Tab content container
        this.tabContent = contentEl.createDiv({ cls: 'agent-profile-tab-content' });

        // Buttons at bottom
        this.renderButtons(contentEl);

        // Render active tab
        this.renderActiveTab();
    }

    renderTabBar(container) {
        const tabBar = container.createDiv({ cls: 'agent-profile-tabs' });

        for (const tab of TABS) {
            // Skip edit-only tabs in create mode
            if (tab.editOnly && this.isCreateMode) continue;

            const tabBtn = tabBar.createEl('button', {
                cls: `agent-profile-tab ${this.activeTab === tab.id ? 'active' : ''}`,
                text: `${tab.icon} ${tab.label}`
            });
            tabBtn.dataset.tab = tab.id;
            tabBtn.addEventListener('click', () => {
                this.activeTab = tab.id;
                // Update active state
                tabBar.querySelectorAll('.agent-profile-tab').forEach(t => t.removeClass('active'));
                tabBtn.addClass('active');
                this.renderActiveTab();
            });
        }
    }

    renderButtons(container) {
        const buttonContainer = container.createDiv({ cls: 'agent-profile-buttons' });

        const cancelBtn = buttonContainer.createEl('button', { text: 'Anuluj' });
        cancelBtn.addEventListener('click', () => this.close());

        const saveBtn = buttonContainer.createEl('button', {
            text: this.isCreateMode ? 'Utwórz agenta' : 'Zapisz zmiany',
            cls: 'mod-cta'
        });
        saveBtn.addEventListener('click', () => this.handleSave());
    }

    renderActiveTab() {
        this.tabContent.empty();

        switch (this.activeTab) {
            case 'profile': this.renderProfileTab(); break;
            case 'permissions': this.renderPermissionsTab(); break;
            case 'skills': this.renderSkillsTab(); break;
            case 'memory': this.renderMemoryTab(); break;
            case 'stats': this.renderStatsTab(); break;
        }
    }

    // ========== PROFIL TAB ==========

    renderProfileTab() {
        const container = this.tabContent;

        // Name
        new Setting(container)
            .setName('Nazwa')
            .setDesc('Unikalna nazwa agenta')
            .addText(text => text
                .setPlaceholder('np. Bibliotekarz')
                .setValue(this.formData.name)
                .onChange(v => this.formData.name = v));

        // Emoji
        new Setting(container)
            .setName('Emoji')
            .setDesc('Ikona agenta')
            .addText(text => {
                text.setPlaceholder('🤖')
                    .setValue(this.formData.emoji)
                    .onChange(v => this.formData.emoji = v);
                text.inputEl.style.width = '60px';
            });

        // Archetype
        const archetypes = getArchetypeList();
        new Setting(container)
            .setName('Archetyp')
            .setDesc('Bazowy szablon osobowości (wypełnia domyślne pola)')
            .addDropdown(dropdown => {
                dropdown.addOption('', '— Bez archetypu —');
                for (const arch of archetypes) {
                    dropdown.addOption(arch.id, `${arch.emoji} ${arch.name} — ${arch.description}`);
                }
                dropdown.setValue(this.formData.archetype || '');
                dropdown.onChange(async (value) => {
                    this.formData.archetype = value;
                    if (value && ARCHETYPE_DEFAULTS[value] && this.isCreateMode) {
                        const defaults = await ARCHETYPE_DEFAULTS[value]();
                        if (!this.formData.personality) {
                            this.formData.personality = defaults.personality || '';
                        }
                        this.formData.temperature = defaults.temperature ?? 0.7;
                        this.formData.permissions = { ...DEFAULT_PERMISSIONS, ...(defaults.default_permissions || {}) };
                        this.renderActiveTab(); // Refresh to show new defaults
                    }
                });
            });

        // Role
        new Setting(container)
            .setName('Rola')
            .setDesc('Typ agenta')
            .addDropdown(dropdown => {
                dropdown.addOption('specialist', 'Specjalista');
                dropdown.addOption('orchestrator', 'Orchestrator');
                dropdown.addOption('meta_agent', 'Meta-agent');
                dropdown.setValue(this.formData.role);
                dropdown.onChange(v => this.formData.role = v);
            });

        // Personality
        new Setting(container)
            .setName('Osobowość')
            .setDesc('Opis zachowania i specjalizacji agenta')
            .addTextArea(text => {
                text.setPlaceholder('Opisz kim jest agent, co robi, jak się komunikuje...')
                    .setValue(this.formData.personality)
                    .onChange(v => this.formData.personality = v);
                text.inputEl.rows = 8;
                text.inputEl.style.width = '100%';
            });

        // Temperature
        new Setting(container)
            .setName('Temperatura')
            .setDesc('0 = precyzyjny, 1 = kreatywny')
            .addSlider(slider => slider
                .setLimits(0, 1, 0.1)
                .setValue(this.formData.temperature)
                .setDynamicTooltip()
                .onChange(v => this.formData.temperature = v));

        // Focus folders
        new Setting(container)
            .setName('Focus folders')
            .setDesc('Foldery na których agent się skupia (jeden per linia)')
            .addTextArea(text => {
                text.setPlaceholder('Projects/**\nNotes/**')
                    .setValue(this.formData.focus_folders.map(f => typeof f === 'string' ? f : f.path).join('\n'))
                    .onChange(v => {
                        this.formData.focus_folders = v.split('\n').map(f => f.trim()).filter(f => f.length > 0);
                    });
                text.inputEl.rows = 3;
                text.inputEl.style.width = '100%';
            });

        // Model override (optional)
        new Setting(container)
            .setName('Model AI')
            .setDesc('Nadpisanie globalnego modelu (puste = używaj domyślnego)')
            .addText(text => text
                .setPlaceholder('np. claude-sonnet-4-6')
                .setValue(this.formData.model || '')
                .onChange(v => this.formData.model = v || null));
    }

    // ========== UPRAWNIENIA TAB ==========

    renderPermissionsTab() {
        const container = this.tabContent;

        // Presets
        const presetSection = container.createDiv({ cls: 'agent-profile-section' });
        presetSection.createEl('h4', { text: 'Szybkie ustawienia' });

        const presetButtons = presetSection.createDiv({ cls: 'permission-preset-buttons' });

        const presets = [
            { id: 'safe', label: '🔒 Safe Mode', cls: '' },
            { id: 'standard', label: '⚖️ Standard', cls: '' },
            { id: 'yolo', label: '🚀 Full', cls: 'mod-warning' }
        ];

        for (const preset of presets) {
            const btn = presetButtons.createEl('button', {
                text: preset.label,
                cls: preset.cls
            });
            btn.addEventListener('click', () => {
                this.applyPermissionPreset(preset.id);
                this.renderActiveTab(); // Refresh toggles
            });
        }

        // Detailed permissions
        container.createEl('h4', { text: 'Szczegółowe uprawnienia' });

        const allPermissions = PermissionSystem.getAllPermissionTypes();
        const hints = {
            [PERMISSION_TYPES.READ_NOTES]: 'Pozwala czytać zawartość notatek',
            [PERMISSION_TYPES.EDIT_NOTES]: 'Pozwala modyfikować istniejące notatki',
            [PERMISSION_TYPES.CREATE_FILES]: 'Pozwala tworzyć nowe pliki',
            [PERMISSION_TYPES.DELETE_FILES]: 'Pozwala usuwać pliki (niebezpieczne!)',
            [PERMISSION_TYPES.ACCESS_OUTSIDE_VAULT]: 'Dostęp do plików poza vaultem',
            [PERMISSION_TYPES.EXECUTE_COMMANDS]: 'Wykonywanie komend systemowych',
            [PERMISSION_TYPES.THINKING]: 'Extended thinking w Claude',
            [PERMISSION_TYPES.MCP]: 'Używanie narzędzi MCP (vault, memory, skills)',
            [PERMISSION_TYPES.YOLO_MODE]: 'Auto-approve wszystkich akcji'
        };

        for (const { key, label } of allPermissions) {
            new Setting(container)
                .setName(label)
                .setDesc(hints[key] || '')
                .addToggle(toggle => {
                    toggle
                        .setValue(this.formData.permissions[key] === true)
                        .onChange(value => {
                            this.formData.permissions[key] = value;
                        });
                });
        }
    }

    applyPermissionPreset(preset) {
        const presets = {
            safe: { read_notes: true, edit_notes: false, create_files: false, delete_files: false, access_outside_vault: false, execute_commands: false, thinking: true, mcp: false, yolo_mode: false },
            standard: { read_notes: true, edit_notes: true, create_files: true, delete_files: false, access_outside_vault: false, execute_commands: false, thinking: true, mcp: true, yolo_mode: false },
            yolo: { read_notes: true, edit_notes: true, create_files: true, delete_files: true, access_outside_vault: true, execute_commands: true, thinking: true, mcp: true, yolo_mode: true }
        };
        this.formData.permissions = { ...presets[preset] };
    }

    // ========== UMIEJĘTNOŚCI TAB ==========

    renderSkillsTab() {
        const container = this.tabContent;

        // Skills section
        container.createEl('h4', { text: '⚡ Skille' });
        container.createEl('p', {
            text: 'Wybierz umiejętności dostępne dla agenta:',
            cls: 'setting-item-description'
        });

        const skillLoader = this.plugin.agentManager?.skillLoader;
        if (skillLoader) {
            const allSkills = skillLoader.getAllSkills();
            if (allSkills.length === 0) {
                container.createEl('p', { text: 'Brak dostępnych skilli.', cls: 'agent-profile-empty' });
            } else {
                for (const skill of allSkills) {
                    new Setting(container)
                        .setName(skill.name)
                        .setDesc(skill.description || '')
                        .addToggle(toggle => {
                            toggle
                                .setValue(this.formData.skills.includes(skill.name))
                                .onChange(value => {
                                    if (value) {
                                        if (!this.formData.skills.includes(skill.name)) {
                                            this.formData.skills.push(skill.name);
                                        }
                                    } else {
                                        this.formData.skills = this.formData.skills.filter(s => s !== skill.name);
                                    }
                                });
                        });
                }
            }
        }

        // Minion section
        container.createEl('h4', { text: '🤖 Minion', cls: 'agent-profile-section-header' });

        const minionLoader = this.plugin.agentManager?.minionLoader;
        if (minionLoader) {
            const allMinions = minionLoader.getAllMinions();

            new Setting(container)
                .setName('Minion')
                .setDesc('Tańszy model AI do ciężkiej roboty (przeszukiwanie, analiza)')
                .addDropdown(dropdown => {
                    dropdown.addOption('', '— Brak miniona —');
                    for (const minion of allMinions) {
                        dropdown.addOption(minion.name, `${minion.name} — ${minion.description || ''}`);
                    }
                    dropdown.setValue(this.formData.minion || '');
                    dropdown.onChange(v => this.formData.minion = v || null);
                });

            new Setting(container)
                .setName('Auto-prep')
                .setDesc('Minion automatycznie zbiera kontekst na starcie sesji')
                .addToggle(toggle => {
                    toggle
                        .setValue(this.formData.minion_enabled)
                        .onChange(v => this.formData.minion_enabled = v);
                });
        }

        // Marketplace note
        const note = container.createDiv({ cls: 'agent-profile-note' });
        note.createEl('p', {
            text: '💡 Więcej skilli i narzędzi będzie dostępnych w Marketplace (w przyszłości).'
        });
    }

    // ========== PAMIĘĆ TAB ==========

    async renderMemoryTab() {
        const container = this.tabContent;
        if (!this.agent) return;

        const memory = this.plugin.agentManager?.getAgentMemory(this.agent.name);
        if (!memory) {
            container.createEl('p', { text: 'Brak danych pamięci.', cls: 'agent-profile-empty' });
            return;
        }

        // Brain.md preview
        container.createEl('h4', { text: '🧠 Brain (długoterminowa pamięć)' });

        try {
            const brain = await memory.getBrain();
            if (brain) {
                const brainPreview = container.createDiv({ cls: 'agent-profile-preview' });
                await MarkdownRenderer.render(this.app, brain, brainPreview, '', this.plugin);
            } else {
                container.createEl('p', { text: 'Brain jest pusty.', cls: 'agent-profile-empty' });
            }
        } catch (e) {
            container.createEl('p', { text: 'Nie można odczytać brain.md', cls: 'agent-profile-empty' });
        }

        // Open brain button
        const brainBtn = container.createEl('button', { text: '📝 Otwórz brain.md w edytorze', cls: 'agent-profile-action-btn' });
        brainBtn.addEventListener('click', async () => {
            const safeName = this.agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const brainPath = `.pkm-assistant/agents/${safeName}/memory/brain.md`;
            await this._openHiddenFile(brainPath, `brain_${safeName}.md`);
        });

        // Sessions list
        container.createEl('h4', { text: '💬 Sesje', cls: 'agent-profile-section-header' });

        try {
            const sessionsPath = memory.paths.sessions;
            const listed = await this.plugin.app.vault.adapter.list(sessionsPath);
            const sessionFiles = (listed?.files || []).filter(f => f.endsWith('.md')).reverse();

            if (sessionFiles.length === 0) {
                container.createEl('p', { text: 'Brak zapisanych sesji.', cls: 'agent-profile-empty' });
            } else {
                const sessionList = container.createDiv({ cls: 'agent-profile-session-list' });
                for (const filePath of sessionFiles.slice(0, 20)) { // Max 20 sessions shown
                    const fileName = filePath.split('/').pop().replace('.md', '');
                    const item = sessionList.createDiv({ cls: 'agent-profile-session-item' });
                    item.createSpan({ text: `💬 ${fileName}` });
                    item.addEventListener('click', async () => {
                        await this._openHiddenFile(filePath, `sesja_${fileName}.md`);
                    });
                }
                if (sessionFiles.length > 20) {
                    container.createEl('p', {
                        text: `...i ${sessionFiles.length - 20} więcej`,
                        cls: 'agent-profile-empty'
                    });
                }
            }
        } catch (e) {
            container.createEl('p', { text: 'Nie można odczytać sesji.', cls: 'agent-profile-empty' });
        }
    }

    /**
     * Open a file from a hidden folder (.pkm-assistant) in an editor modal.
     * Edits are saved directly back to the original file via vault adapter.
     * @param {string} hiddenPath - Path inside .pkm-assistant
     * @param {string} title - Display title for the modal
     */
    async _openHiddenFile(hiddenPath, title) {
        try {
            const adapter = this.app.vault.adapter;
            const exists = await adapter.exists(hiddenPath);
            if (!exists) {
                new Notice('Plik nie istnieje: ' + hiddenPath);
                return;
            }

            const content = await adapter.read(hiddenPath);
            new HiddenFileEditorModal(this.app, hiddenPath, title, content).open();
        } catch (e) {
            new Notice('Nie można otworzyć pliku: ' + e.message);
        }
    }

    // ========== STATYSTYKI TAB ==========

    async renderStatsTab() {
        const container = this.tabContent;
        if (!this.agent) return;

        container.createEl('h4', { text: '📊 Statystyki' });

        const stats = await this.plugin.agentManager?.getAgentStats(this.agent.name);
        if (!stats) {
            container.createEl('p', { text: 'Brak danych.', cls: 'agent-profile-empty' });
            return;
        }

        const grid = container.createDiv({ cls: 'agent-profile-stats-grid' });

        const statItems = [
            { label: 'Sesje', value: stats.sessionCount },
            { label: 'Podsumowania L1', value: stats.l1Count },
            { label: 'Podsumowania L2', value: stats.l2Count },
            { label: 'Brain (znaki)', value: stats.brainSize },
            { label: 'Skille', value: stats.skillCount },
            { label: 'Minion', value: stats.minionName || '—' },
            { label: 'MCP tools', value: stats.hasMcp ? 'Tak' : 'Nie' },
            { label: 'Ostatnia aktywność', value: stats.lastActivity ? new Date(stats.lastActivity).toLocaleString('pl-PL') : '—' }
        ];

        for (const item of statItems) {
            const statEl = grid.createDiv({ cls: 'agent-profile-stat' });
            statEl.createDiv({ cls: 'agent-profile-stat-value', text: String(item.value) });
            statEl.createDiv({ cls: 'agent-profile-stat-label', text: item.label });
        }

        // MCP tools list
        if (stats.hasMcp) {
            container.createEl('h4', { text: '🔧 Dostępne narzędzia MCP', cls: 'agent-profile-section-header' });
            const toolList = container.createDiv({ cls: 'agent-profile-tool-list' });
            const tools = [
                'vault_read', 'vault_list', 'vault_write', 'vault_delete', 'vault_search',
                'memory_search', 'memory_update', 'memory_status',
                'skill_list', 'skill_execute', 'minion_task', 'master_task',
                'agent_message', 'agent_delegate'
            ];
            for (const tool of tools) {
                toolList.createEl('span', { text: tool, cls: 'agent-profile-tool-badge' });
            }
        }
    }

    // ========== SAVE LOGIC ==========

    async handleSave() {
        // Validation
        if (!this.formData.name.trim()) {
            new Notice('Podaj nazwę agenta!');
            return;
        }

        const agentManager = this.plugin.agentManager;
        if (!agentManager) return;

        if (this.isCreateMode) {
            // Check uniqueness
            if (agentManager.getAgent(this.formData.name)) {
                new Notice('Agent o tej nazwie już istnieje!');
                return;
            }

            try {
                const config = {
                    name: this.formData.name,
                    emoji: this.formData.emoji,
                    archetype: this.formData.archetype || undefined,
                    personality: this.formData.personality,
                    temperature: this.formData.temperature,
                    role: this.formData.role,
                    focus_folders: this.formData.focus_folders,
                    model: this.formData.model || undefined,
                    skills: this.formData.skills,
                    minion: this.formData.minion || undefined,
                    minion_enabled: this.formData.minion_enabled,
                    default_permissions: this.formData.permissions,
                    models: Object.keys(this.formData.models).length > 0 ? this.formData.models : undefined
                };

                await agentManager.createAgent(config);
                new Notice(`Agent ${this.formData.emoji} ${this.formData.name} utworzony!`);
            } catch (error) {
                new Notice('Błąd tworzenia agenta: ' + error.message);
                return;
            }
        } else {
            // Edit mode
            try {
                const updates = {
                    emoji: this.formData.emoji,
                    personality: this.formData.personality,
                    temperature: this.formData.temperature,
                    role: this.formData.role,
                    focus_folders: this.formData.focus_folders,
                    model: this.formData.model || null,
                    skills: this.formData.skills,
                    minion: this.formData.minion || null,
                    minion_enabled: this.formData.minion_enabled,
                    default_permissions: this.formData.permissions,
                    models: this.formData.models
                };

                // Allow name change for non-built-in agents
                if (!this.agent.isBuiltIn && this.formData.name !== this.agent.name) {
                    updates.name = this.formData.name;
                }

                await agentManager.updateAgent(this.agent.name, updates);
                new Notice(`Agent ${this.formData.emoji} ${this.formData.name} zaktualizowany!`);
            } catch (error) {
                new Notice('Błąd zapisu: ' + error.message);
                return;
            }
        }

        if (this.onSave) this.onSave();
        this.close();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * Modal editor for files in hidden folders (.pkm-assistant).
 * Shows a textarea with the file content and saves directly back via adapter.
 */
export class HiddenFileEditorModal extends Modal {
    constructor(app, filePath, title, content) {
        super(app);
        this.filePath = filePath;
        this.title = title;
        this.originalContent = content;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('hidden-file-editor-modal');

        // Title
        contentEl.createEl('h3', { text: this.title });

        // Path hint
        contentEl.createEl('p', {
            text: this.filePath,
            cls: 'hidden-file-editor-path'
        });

        // Textarea
        this.textarea = contentEl.createEl('textarea', {
            cls: 'hidden-file-editor-textarea'
        });
        this.textarea.value = this.originalContent;
        this.textarea.rows = 25;

        // Buttons
        const buttons = contentEl.createDiv({ cls: 'hidden-file-editor-buttons' });

        const closeBtn = buttons.createEl('button', { text: 'Zamknij' });
        closeBtn.addEventListener('click', () => this.close());

        const saveBtn = buttons.createEl('button', { text: 'Zapisz', cls: 'mod-cta' });
        saveBtn.addEventListener('click', async () => {
            try {
                await this.app.vault.adapter.write(this.filePath, this.textarea.value);
                new Notice('Zapisano!');
                this.close();
            } catch (e) {
                new Notice('Błąd zapisu: ' + e.message);
            }
        });
    }

    onClose() {
        this.contentEl.empty();
    }
}

/**
 * Open agent profile modal
 * @param {Object} plugin
 * @param {Agent|null} agent - null for create mode
 * @param {Function|null} onSave
 */
export function openAgentProfile(plugin, agent = null, onSave = null) {
    new AgentProfileModal(plugin.app, plugin, agent, onSave).open();
}
