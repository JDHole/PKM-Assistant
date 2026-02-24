/**
 * AgentProfileView - Inline agent profile/creator in the sidebar.
 * Adapted from AgentProfileModal.js for sidebar navigation.
 * Tabs: Profil, Uprawnienia, Umiejętności, Pamięć, Statystyki.
 */
import { Setting, MarkdownRenderer, Notice } from 'obsidian';
import { getArchetypeList, ARCHETYPE_DEFAULTS } from '../../agents/archetypes/index.js';
import { PermissionSystem, PERMISSION_TYPES } from '../../core/PermissionSystem.js';
import { DEFAULT_PERMISSIONS } from '../../agents/Agent.js';
import { HiddenFileEditorModal } from '../AgentProfileModal.js';
import { TOOL_GROUPS } from '../../core/PromptBuilder.js';

// Tab definitions
const TABS = [
    { id: 'profile', label: 'Profil', icon: '👤' },
    { id: 'permissions', label: 'Uprawnienia', icon: '🔒' },
    { id: 'skills', label: 'Umiejętności', icon: '⚡' },
    { id: 'memory', label: 'Pamięć', icon: '🧠', editOnly: true },
    { id: 'stats', label: 'Statystyki', icon: '📊', editOnly: true }
];

/**
 * Render agent profile view inline in sidebar.
 * @param {HTMLElement} container
 * @param {Object} plugin
 * @param {import('./SidebarNav.js').SidebarNav} nav
 * @param {Object} params - { agentName: string|null }
 */
export function renderAgentProfileView(container, plugin, nav, params) {
    const agentManager = plugin.agentManager;
    if (!agentManager) {
        container.createEl('p', { text: 'AgentManager nie jest zainicjalizowany', cls: 'agent-error' });
        return;
    }

    const agent = params.agentName ? agentManager.getAgent(params.agentName) : null;
    const isCreateMode = !agent;

    // Form data (copy from agent or defaults)
    const formData = agent ? {
        name: agent.name,
        emoji: agent.emoji,
        archetype: agent.archetype || '',
        personality: agent.personality || '',
        temperature: agent.temperature,
        role: agent.role || 'specialist',
        focus_folders: [...(agent.focusFolders || [])],
        model: agent.model || '',
        skills: [...(agent.skills || [])],
        enabled_tools: [...(agent.enabledTools || [])],
        minion: agent.minion || '',
        minion_enabled: agent.minionEnabled !== false,
        permissions: { ...agent.permissions },
        models: JSON.parse(JSON.stringify(agent.models || {}))
    } : {
        name: '',
        emoji: '🤖',
        archetype: 'human_vibe',
        personality: '',
        temperature: 0.7,
        role: 'specialist',
        focus_folders: [],
        model: '',
        skills: [],
        enabled_tools: [],
        minion: '',
        minion_enabled: true,
        permissions: { ...DEFAULT_PERMISSIONS, mcp: true },
        models: {}
    };

    // State
    let activeTab = 'profile';
    const tabContentEl = container.createDiv();

    // Header
    const title = isCreateMode
        ? '✨ Nowy Agent'
        : `${formData.emoji} ${formData.name}`;
    container.createEl('h3', { text: title, cls: 'sidebar-profile-title' });

    // Tab bar
    const tabBar = container.createDiv({ cls: 'sidebar-profile-tabs' });
    for (const tab of TABS) {
        if (tab.editOnly && isCreateMode) continue;
        const tabBtn = tabBar.createEl('button', {
            cls: `sidebar-profile-tab ${activeTab === tab.id ? 'active' : ''}`,
            text: `${tab.icon} ${tab.label}`
        });
        tabBtn.dataset.tab = tab.id;
        tabBtn.addEventListener('click', () => {
            activeTab = tab.id;
            tabBar.querySelectorAll('.sidebar-profile-tab').forEach(t => t.removeClass('active'));
            tabBtn.addClass('active');
            renderActiveTab();
        });
    }

    // Tab content
    const tabContent = container.createDiv({ cls: 'sidebar-profile-tab-content' });

    // Buttons
    const buttonContainer = container.createDiv({ cls: 'sidebar-profile-buttons' });

    const cancelBtn = buttonContainer.createEl('button', { text: 'Anuluj' });
    cancelBtn.addEventListener('click', () => nav.pop());

    const saveBtn = buttonContainer.createEl('button', {
        text: isCreateMode ? 'Utwórz' : 'Zapisz',
        cls: 'mod-cta'
    });
    saveBtn.addEventListener('click', () => handleSave());

    // Delete button (edit mode only, non-built-in)
    if (!isCreateMode && !agent.isBuiltIn) {
        const deleteBtn = buttonContainer.createEl('button', {
            text: '🗑️ Usuń',
            cls: 'sidebar-delete-btn'
        });
        deleteBtn.addEventListener('click', () => showDeleteConfirmation());
    }

    // Render initial tab
    renderActiveTab();

    // ========== TAB RENDERERS ==========

    function renderActiveTab() {
        tabContent.empty();
        switch (activeTab) {
            case 'profile': renderProfileTab(tabContent); break;
            case 'permissions': renderPermissionsTab(tabContent); break;
            case 'skills': renderSkillsTab(tabContent); break;
            case 'memory': renderMemoryTab(tabContent); break;
            case 'stats': renderStatsTab(tabContent); break;
        }
    }

    function renderProfileTab(el) {
        new Setting(el)
            .setName('Nazwa')
            .setDesc('Unikalna nazwa agenta')
            .addText(text => text
                .setPlaceholder('np. Bibliotekarz')
                .setValue(formData.name)
                .onChange(v => formData.name = v));

        new Setting(el)
            .setName('Emoji')
            .setDesc('Ikona agenta')
            .addText(text => {
                text.setPlaceholder('🤖')
                    .setValue(formData.emoji)
                    .onChange(v => formData.emoji = v);
                text.inputEl.style.width = '60px';
            });

        const archetypes = getArchetypeList();
        new Setting(el)
            .setName('Archetyp')
            .setDesc('Bazowy szablon osobowości')
            .addDropdown(dropdown => {
                dropdown.addOption('', '— Bez archetypu —');
                for (const arch of archetypes) {
                    dropdown.addOption(arch.id, `${arch.emoji} ${arch.name}`);
                }
                dropdown.setValue(formData.archetype || '');
                dropdown.onChange(async (value) => {
                    formData.archetype = value;
                    if (value && ARCHETYPE_DEFAULTS[value] && isCreateMode) {
                        const defaults = await ARCHETYPE_DEFAULTS[value]();
                        if (!formData.personality) formData.personality = defaults.personality || '';
                        formData.temperature = defaults.temperature ?? 0.7;
                        formData.permissions = { ...DEFAULT_PERMISSIONS, ...(defaults.default_permissions || {}) };
                        renderActiveTab();
                    }
                });
            });

        new Setting(el)
            .setName('Rola')
            .addDropdown(dropdown => {
                dropdown.addOption('specialist', 'Specjalista');
                dropdown.addOption('orchestrator', 'Orchestrator');
                dropdown.addOption('meta_agent', 'Meta-agent');
                dropdown.setValue(formData.role);
                dropdown.onChange(v => formData.role = v);
            });

        new Setting(el)
            .setName('Osobowość')
            .addTextArea(text => {
                text.setPlaceholder('Opisz kim jest agent...')
                    .setValue(formData.personality)
                    .onChange(v => formData.personality = v);
                text.inputEl.rows = 6;
                text.inputEl.style.width = '100%';
            });

        new Setting(el)
            .setName('Temperatura')
            .setDesc('0 = precyzyjny, 1 = kreatywny')
            .addSlider(slider => slider
                .setLimits(0, 1, 0.1)
                .setValue(formData.temperature)
                .setDynamicTooltip()
                .onChange(v => formData.temperature = v));

        new Setting(el)
            .setName('Focus folders')
            .setDesc('Foldery agenta (jeden per linia)')
            .addTextArea(text => {
                text.setPlaceholder('Projects/**\nNotes/**')
                    .setValue(formData.focus_folders.join('\n'))
                    .onChange(v => {
                        formData.focus_folders = v.split('\n').map(f => f.trim()).filter(f => f.length > 0);
                    });
                text.inputEl.rows = 3;
                text.inputEl.style.width = '100%';
            });

        new Setting(el)
            .setName('Model AI')
            .setDesc('Nadpisanie globalnego modelu (puste = domyślny)')
            .addText(text => text
                .setPlaceholder('np. claude-sonnet-4-6')
                .setValue(formData.model || '')
                .onChange(v => formData.model = v || null));
    }

    function renderPermissionsTab(el) {
        // Presets
        const presetSection = el.createDiv({ cls: 'agent-profile-section' });
        presetSection.createEl('h4', { text: 'Szybkie ustawienia' });

        const presetButtons = presetSection.createDiv({ cls: 'permission-preset-buttons' });
        const presets = [
            { id: 'safe', label: '🔒 Safe', perms: { read_notes: true, edit_notes: false, create_files: false, delete_files: false, access_outside_vault: false, execute_commands: false, thinking: true, mcp: false, yolo_mode: false } },
            { id: 'standard', label: '⚖️ Standard', perms: { read_notes: true, edit_notes: true, create_files: true, delete_files: false, access_outside_vault: false, execute_commands: false, thinking: true, mcp: true, yolo_mode: false } },
            { id: 'yolo', label: '🚀 Full', perms: { read_notes: true, edit_notes: true, create_files: true, delete_files: true, access_outside_vault: true, execute_commands: true, thinking: true, mcp: true, yolo_mode: true } }
        ];

        for (const preset of presets) {
            const btn = presetButtons.createEl('button', { text: preset.label });
            btn.addEventListener('click', () => {
                formData.permissions = { ...preset.perms };
                renderActiveTab();
            });
        }

        // Detailed permissions
        el.createEl('h4', { text: 'Szczegółowe uprawnienia' });

        const allPermissions = PermissionSystem.getAllPermissionTypes();
        const hints = {
            [PERMISSION_TYPES.READ_NOTES]: 'Czytanie notatek',
            [PERMISSION_TYPES.EDIT_NOTES]: 'Modyfikacja notatek',
            [PERMISSION_TYPES.CREATE_FILES]: 'Tworzenie plików',
            [PERMISSION_TYPES.DELETE_FILES]: 'Usuwanie plików',
            [PERMISSION_TYPES.ACCESS_OUTSIDE_VAULT]: 'Dostęp poza vaultem',
            [PERMISSION_TYPES.EXECUTE_COMMANDS]: 'Komendy systemowe',
            [PERMISSION_TYPES.THINKING]: 'Extended thinking',
            [PERMISSION_TYPES.MCP]: 'Narzędzia MCP',
            [PERMISSION_TYPES.YOLO_MODE]: 'Auto-approve'
        };

        for (const { key, label } of allPermissions) {
            new Setting(el)
                .setName(label)
                .setDesc(hints[key] || '')
                .addToggle(toggle => {
                    toggle
                        .setValue(formData.permissions[key] === true)
                        .onChange(value => { formData.permissions[key] = value; });
                });
        }
    }

    function renderSkillsTab(el) {
        el.createEl('h4', { text: '⚡ Skille' });

        const skillLoader = plugin.agentManager?.skillLoader;
        if (skillLoader) {
            const allSkills = skillLoader.getAllSkills();
            if (allSkills.length === 0) {
                el.createEl('p', { text: 'Brak dostępnych skilli.', cls: 'agent-profile-empty' });
            } else {
                for (const skill of allSkills) {
                    const setting = new Setting(el)
                        .setName(skill.name)
                        .setDesc(skill.description || '')
                        .addToggle(toggle => {
                            toggle
                                .setValue(formData.skills.includes(skill.name))
                                .onChange(value => {
                                    if (value) {
                                        if (!formData.skills.includes(skill.name)) formData.skills.push(skill.name);
                                    } else {
                                        formData.skills = formData.skills.filter(s => s !== skill.name);
                                    }
                                });
                        });

                    // Cross-reference link to skill detail
                    const linkEl = setting.nameEl.createSpan({ cls: 'sidebar-agent-link sidebar-detail-link', text: ' →' });
                    linkEl.addEventListener('click', (e) => {
                        e.stopPropagation();
                        nav.push('skill-detail', { skillName: skill.name }, formData.name || 'Nowy agent');
                    });
                }
            }
        }

        // MCP Tools section (per-agent filtering)
        if (formData.permissions?.mcp) {
            el.createEl('h4', { text: '🔧 Narzędzia MCP', cls: 'agent-profile-section-header' });

            const allTools = Object.values(TOOL_GROUPS).flat();
            const isAllEnabled = formData.enabled_tools.length === 0;

            // "All tools" toggle
            new Setting(el)
                .setName('Wszystkie narzędzia')
                .setDesc('Puste = agent ma dostęp do WSZYSTKICH narzędzi')
                .addToggle(toggle => toggle
                    .setValue(isAllEnabled)
                    .onChange(v => {
                        if (v) {
                            formData.enabled_tools = [];
                        } else {
                            // When disabling "all", enable ALL tools explicitly so user can deselect
                            formData.enabled_tools = [...allTools];
                        }
                        renderActiveTab();
                    })
                );

            // Per-group toggles (only when not "all")
            if (!isAllEnabled) {
                const GROUP_LABELS = {
                    vault: '📁 Vault',
                    memory: '🧠 Pamięć',
                    skills: '⚡ Skille',
                    delegation: '🤖 Delegacja',
                    communication: '📡 Komunikator',
                    artifacts: '📋 Artefakty',
                    agora: '🏛️ Agora',
                };

                for (const [groupKey, tools] of Object.entries(TOOL_GROUPS)) {
                    const groupEnabled = tools.filter(t => formData.enabled_tools.includes(t));
                    const allInGroup = groupEnabled.length === tools.length;

                    new Setting(el)
                        .setName(`${GROUP_LABELS[groupKey] || groupKey} (${groupEnabled.length}/${tools.length})`)
                        .setDesc(tools.join(', '))
                        .addToggle(toggle => toggle
                            .setValue(allInGroup)
                            .onChange(v => {
                                if (v) {
                                    // Enable all tools in this group
                                    for (const tool of tools) {
                                        if (!formData.enabled_tools.includes(tool)) {
                                            formData.enabled_tools.push(tool);
                                        }
                                    }
                                } else {
                                    // Disable all tools in this group
                                    formData.enabled_tools = formData.enabled_tools.filter(t => !tools.includes(t));
                                }
                                renderActiveTab();
                            })
                        );
                }
            }
        }

        // Minion section
        el.createEl('h4', { text: '🤖 Minion', cls: 'agent-profile-section-header' });

        const minionLoader = plugin.agentManager?.minionLoader;
        if (minionLoader) {
            const allMinions = minionLoader.getAllMinions();

            new Setting(el)
                .setName('Minion')
                .setDesc('Tańszy model do ciężkiej roboty')
                .addDropdown(dropdown => {
                    dropdown.addOption('', '— Brak miniona —');
                    for (const minion of allMinions) {
                        dropdown.addOption(minion.name, `${minion.name}`);
                    }
                    dropdown.setValue(formData.minion || '');
                    dropdown.onChange(v => formData.minion = v || null);
                });

            // Cross-reference link to minion detail
            if (formData.minion) {
                const minionLink = el.createDiv({ cls: 'sidebar-cross-link' });
                const link = minionLink.createSpan({
                    cls: 'sidebar-agent-link',
                    text: `🤖 ${formData.minion} — szczegóły →`
                });
                link.addEventListener('click', () => {
                    nav.push('minion-detail', { minionName: formData.minion }, formData.name || 'Nowy agent');
                });
            }

            new Setting(el)
                .setName('Auto-prep')
                .setDesc('Minion zbiera kontekst na starcie sesji')
                .addToggle(toggle => {
                    toggle
                        .setValue(formData.minion_enabled)
                        .onChange(v => formData.minion_enabled = v);
                });
        }
    }

    async function renderMemoryTab(el) {
        if (!agent) return;

        const memory = agentManager.getAgentMemory?.(agent.name);
        if (!memory) {
            el.createEl('p', { text: 'Brak danych pamięci.', cls: 'agent-profile-empty' });
            return;
        }

        // Brain.md preview
        el.createEl('h4', { text: '🧠 Brain' });

        try {
            const brain = await memory.getBrain();
            if (brain) {
                const brainPreview = el.createDiv({ cls: 'agent-profile-preview' });
                await MarkdownRenderer.render(plugin.app, brain, brainPreview, '', plugin);
            } else {
                el.createEl('p', { text: 'Brain jest pusty.', cls: 'agent-profile-empty' });
            }
        } catch {
            el.createEl('p', { text: 'Nie można odczytać brain.md', cls: 'agent-profile-empty' });
        }

        // Open brain button
        const brainBtn = el.createEl('button', { text: '📝 Otwórz brain.md', cls: 'agent-profile-action-btn' });
        brainBtn.addEventListener('click', async () => {
            const safeName = agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const brainPath = `.pkm-assistant/agents/${safeName}/memory/brain.md`;
            await openHiddenFile(plugin.app, brainPath, `brain_${safeName}.md`);
        });

        // Sessions list
        el.createEl('h4', { text: '💬 Sesje', cls: 'agent-profile-section-header' });

        try {
            const sessionsPath = memory.paths.sessions;
            const listed = await plugin.app.vault.adapter.list(sessionsPath);
            const sessionFiles = (listed?.files || []).filter(f => f.endsWith('.md')).reverse();

            if (sessionFiles.length === 0) {
                el.createEl('p', { text: 'Brak zapisanych sesji.', cls: 'agent-profile-empty' });
            } else {
                const sessionList = el.createDiv({ cls: 'agent-profile-session-list' });
                for (const filePath of sessionFiles.slice(0, 20)) {
                    const fileName = filePath.split('/').pop().replace('.md', '');
                    const item = sessionList.createDiv({ cls: 'agent-profile-session-item' });
                    item.createSpan({ text: `💬 ${fileName}` });
                    item.addEventListener('click', async () => {
                        await openHiddenFile(plugin.app, filePath, `sesja_${fileName}.md`);
                    });
                }
                if (sessionFiles.length > 20) {
                    el.createEl('p', { text: `...i ${sessionFiles.length - 20} więcej`, cls: 'agent-profile-empty' });
                }
            }
        } catch {
            el.createEl('p', { text: 'Nie można odczytać sesji.', cls: 'agent-profile-empty' });
        }
    }

    async function renderStatsTab(el) {
        if (!agent) return;

        el.createEl('h4', { text: '📊 Statystyki' });

        const stats = await agentManager.getAgentStats?.(agent.name);
        if (!stats) {
            el.createEl('p', { text: 'Brak danych.', cls: 'agent-profile-empty' });
            return;
        }

        const grid = el.createDiv({ cls: 'agent-profile-stats-grid' });
        const statItems = [
            { label: 'Sesje', value: stats.sessionCount },
            { label: 'L1', value: stats.l1Count },
            { label: 'L2', value: stats.l2Count },
            { label: 'Brain', value: stats.brainSize },
            { label: 'Skille', value: stats.skillCount },
            { label: 'Minion', value: stats.minionName || '—' },
            { label: 'MCP', value: stats.hasMcp ? 'Tak' : 'Nie' },
            { label: 'Ostatnia aktywność', value: stats.lastActivity ? new Date(stats.lastActivity).toLocaleString('pl-PL') : '—' }
        ];

        for (const item of statItems) {
            const statEl = grid.createDiv({ cls: 'agent-profile-stat' });
            statEl.createDiv({ cls: 'agent-profile-stat-value', text: String(item.value) });
            statEl.createDiv({ cls: 'agent-profile-stat-label', text: item.label });
        }

        // MCP tools list (respects enabledTools)
        if (stats.hasMcp) {
            el.createEl('h4', { text: '🔧 Narzędzia MCP', cls: 'agent-profile-section-header' });
            const toolList = el.createDiv({ cls: 'agent-profile-tool-list' });
            const allTools = Object.values(TOOL_GROUPS).flat();
            const enabled = agent.enabledTools || [];
            const isAll = enabled.length === 0;

            for (const tool of allTools) {
                const isEnabled = isAll || enabled.includes(tool);
                const badge = toolList.createEl('span', {
                    text: tool,
                    cls: `agent-profile-tool-badge${isEnabled ? '' : ' tool-disabled'}`
                });
                if (!isEnabled) badge.style.opacity = '0.4';
            }
            if (isAll) {
                el.createEl('p', { text: 'Wszystkie narzędzia włączone', cls: 'setting-item-description' });
            } else {
                el.createEl('p', { text: `${enabled.length}/${allTools.length} narzędzi włączonych`, cls: 'setting-item-description' });
            }
        }
    }

    // ========== SAVE LOGIC ==========

    async function handleSave() {
        if (!formData.name.trim()) {
            new Notice('Podaj nazwę agenta!');
            return;
        }

        if (isCreateMode) {
            if (agentManager.getAgent(formData.name)) {
                new Notice('Agent o tej nazwie już istnieje!');
                return;
            }
            try {
                await agentManager.createAgent({
                    name: formData.name,
                    emoji: formData.emoji,
                    archetype: formData.archetype || undefined,
                    personality: formData.personality,
                    temperature: formData.temperature,
                    role: formData.role,
                    focus_folders: formData.focus_folders,
                    model: formData.model || undefined,
                    skills: formData.skills,
                    enabled_tools: formData.enabled_tools.length > 0 ? formData.enabled_tools : undefined,
                    minion: formData.minion || undefined,
                    minion_enabled: formData.minion_enabled,
                    default_permissions: formData.permissions,
                    models: Object.keys(formData.models).length > 0 ? formData.models : undefined
                });
                new Notice(`Agent ${formData.emoji} ${formData.name} utworzony!`);
            } catch (error) {
                new Notice('Błąd tworzenia agenta: ' + error.message);
                return;
            }
        } else {
            try {
                const updates = {
                    emoji: formData.emoji,
                    personality: formData.personality,
                    temperature: formData.temperature,
                    role: formData.role,
                    focus_folders: formData.focus_folders,
                    model: formData.model || null,
                    skills: formData.skills,
                    enabled_tools: formData.enabled_tools,
                    minion: formData.minion || null,
                    minion_enabled: formData.minion_enabled,
                    default_permissions: formData.permissions,
                    models: formData.models
                };
                if (!agent.isBuiltIn && formData.name !== agent.name) {
                    updates.name = formData.name;
                }
                await agentManager.updateAgent(agent.name, updates);
                new Notice(`Agent ${formData.emoji} ${formData.name} zaktualizowany!`);
            } catch (error) {
                new Notice('Błąd zapisu: ' + error.message);
                return;
            }
        }

        nav.pop();
    }

    // ========== DELETE CONFIRMATION ==========

    function showDeleteConfirmation() {
        tabContent.empty();
        activeTab = null;
        tabBar.querySelectorAll('.sidebar-profile-tab').forEach(t => t.removeClass('active'));

        const el = tabContent;
        el.createEl('h4', { text: '🗑️ Usunąć agenta?' });
        el.createEl('p', { text: `Czy na pewno chcesz usunąć agenta ${agent.emoji} ${agent.name}?` });

        if (agent.isBuiltIn) {
            el.createEl('p', {
                text: 'Uwaga: wbudowany agent zostanie odtworzony przy restarcie.',
                cls: 'agent-delete-warning'
            });
        }

        let archiveMemory = true;
        new Setting(el)
            .setName('Archiwizuj pamięć')
            .setDesc('Zachowaj kopię pamięci w archiwum')
            .addToggle(toggle => {
                toggle.setValue(true).onChange(v => archiveMemory = v);
            });

        const btnRow = el.createDiv({ cls: 'sidebar-delete-actions' });

        const cancelBtn = btnRow.createEl('button', { text: 'Anuluj' });
        cancelBtn.addEventListener('click', () => renderActiveTab());

        const confirmBtn = btnRow.createEl('button', { text: 'Usuń', cls: 'mod-warning' });
        confirmBtn.addEventListener('click', async () => {
            try {
                if (archiveMemory) await agentManager.archiveAgentMemory(agent.name);
                await agentManager.deleteAgent(agent.name);
                new Notice(`Agent ${agent.emoji} ${agent.name} usunięty.`);
                nav.goHome();
            } catch (error) {
                new Notice('Błąd usuwania: ' + error.message);
            }
        });
    }
}

/**
 * Open a file from .pkm-assistant in an editor modal.
 */
async function openHiddenFile(app, hiddenPath, title) {
    try {
        const adapter = app.vault.adapter;
        const exists = await adapter.exists(hiddenPath);
        if (!exists) {
            new Notice('Plik nie istnieje: ' + hiddenPath);
            return;
        }
        const content = await adapter.read(hiddenPath);
        new HiddenFileEditorModal(app, hiddenPath, title, content).open();
    } catch (e) {
        new Notice('Nie można otworzyć pliku: ' + e.message);
    }
}
