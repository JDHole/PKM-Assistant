/**
 * AgentProfileView - Inline agent profile/creator in the sidebar.
 * Tabs: Profil, Uprawnienia, Umiejętności, Pamięć, Statystyki.
 *
 * Sesja 41: Archetype → Role flow, Memory tab redesign (6 files, collapsible, forms).
 */
import { Setting, MarkdownRenderer, Notice } from 'obsidian';
import { getArchetypeList } from '../../agents/archetypes/Archetypes.js';
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
        archetype: agent.archetype || 'specialist',
        role: agent.role || '',
        personality: agent.personality || '',
        temperature: agent.temperature,
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
        archetype: 'specialist',
        role: '',
        personality: '',
        temperature: 0.7,
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

    // ─── PROFILE TAB (sesja 41: Archetype → Role flow) ───

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

        // ── ARCHETYPE (broad class) ──
        const archetypes = getArchetypeList();
        new Setting(el)
            .setName('Archetyp')
            .setDesc('Typ agenta — filozofia pracy')
            .addDropdown(dropdown => {
                for (const arch of archetypes) {
                    dropdown.addOption(arch.id, `${arch.emoji} ${arch.name}`);
                }
                dropdown.setValue(formData.archetype || 'specialist');
                dropdown.onChange(async (value) => {
                    formData.archetype = value;
                    // Archetyp NIE zmienia temperature/permissions — tylko Rola to robi
                    renderActiveTab();
                });
            });

        // ── ROLE (specific specialization) ──
        const roleLoader = agentManager.roleLoader;
        if (roleLoader) {
            const allRoles = roleLoader.getRoleList();
            const suggestedRoles = roleLoader.getRoleList(formData.archetype);
            const otherRoles = allRoles.filter(r => r.archetype !== formData.archetype);

            new Setting(el)
                .setName('Rola')
                .setDesc('Specjalizacja agenta — nadaje konkrety')
                .addDropdown(dropdown => {
                    dropdown.addOption('', '— Bez roli (custom) —');

                    // Suggested roles for this archetype first
                    if (suggestedRoles.length > 0) {
                        for (const role of suggestedRoles) {
                            dropdown.addOption(role.id, `${role.emoji} ${role.name}`);
                        }
                    }

                    // Other roles (from different archetypes)
                    if (otherRoles.length > 0) {
                        for (const role of otherRoles) {
                            dropdown.addOption(role.id, `${role.emoji} ${role.name} (${role.archetype})`);
                        }
                    }

                    dropdown.setValue(formData.role || '');
                    dropdown.onChange(async (value) => {
                        formData.role = value || null;

                        if (!value) {
                            // "Brak" = kasacja — czyść wszystko do domyślnych
                            formData.personality = '';
                            formData.temperature = 0.7;
                            formData.permissions = { ...DEFAULT_PERMISSIONS, mcp: true };
                            formData.skills = [];
                            formData.focus_folders = [];
                            formData.emoji = '🤖';
                            renderActiveTab();
                            return;
                        }

                        // Rola ZAWSZE nadpisuje dane
                        const roleData = roleLoader.getRole(value);
                        if (roleData) {
                            if (roleData.personality_template) {
                                formData.personality = roleData.personality_template.replace(/\{name\}/g, formData.name || 'Agent');
                            }
                            if (roleData.temperature !== undefined) formData.temperature = roleData.temperature;
                            if (roleData.default_permissions) {
                                formData.permissions = { ...DEFAULT_PERMISSIONS, ...(roleData.default_permissions || {}) };
                            }
                            if (roleData.recommended_skills?.length > 0) {
                                formData.skills = [...roleData.recommended_skills];
                            } else {
                                formData.skills = [];
                            }
                            if (roleData.focus_folders?.length > 0) {
                                formData.focus_folders = [...roleData.focus_folders];
                            } else {
                                formData.focus_folders = [];
                            }
                            if (roleData.emoji) {
                                formData.emoji = roleData.emoji;
                            }
                            renderActiveTab();
                        }
                    });
                });
        }

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

    // ─── PERMISSIONS TAB ───

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

    // ─── SKILLS TAB ───

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
                                    for (const tool of tools) {
                                        if (!formData.enabled_tools.includes(tool)) {
                                            formData.enabled_tools.push(tool);
                                        }
                                    }
                                } else {
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

    // ─── MEMORY TAB (sesja 41: full redesign — 6 files, collapsible, forms) ───

    async function renderMemoryTab(el) {
        if (!agent) return;

        const memory = agentManager.getAgentMemory?.(agent.name);
        if (!memory) {
            el.createEl('p', { text: 'Brak danych pamięci.', cls: 'agent-profile-empty' });
            return;
        }

        const safeName = agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const adapter = plugin.app.vault.adapter;

        // ── 1. BRAIN.MD ──
        await renderCollapsibleFile(el, {
            icon: '🧠',
            title: 'Brain (pamięć długoterminowa)',
            path: `.pkm-assistant/agents/${safeName}/memory/brain.md`,
            adapter,
            defaultOpen: false,
            showEditBtn: true,
        });

        // ── 2. PLAYBOOK ──
        const playbookPath = `.pkm-assistant/agents/${safeName}/playbook.md`;
        await renderCollapsibleFile(el, {
            icon: '📖',
            title: 'Playbook (procedury)',
            path: playbookPath,
            adapter,
            defaultOpen: false,
            showEditBtn: false,
            customForm: (formContainer) => {
                renderAddForm(formContainer, {
                    label: 'Dodaj niestandardowe instrukcje',
                    placeholder: 'np. Zawsze pytaj o deadline przed tworzeniem planu...',
                    onAdd: async (text) => {
                        await appendToFile(adapter, playbookPath,
                            `\n\n## Instrukcje niestandardowe\n- ${text}`);
                        renderActiveTab();
                    }
                });
            }
        });

        // ── 3. VAULT MAP ──
        const vaultMapPath = `.pkm-assistant/agents/${safeName}/vault_map.md`;
        await renderCollapsibleFile(el, {
            icon: '🗺️',
            title: 'Mapa Vaulta (strefy dostępu)',
            path: vaultMapPath,
            adapter,
            defaultOpen: false,
            showEditBtn: false,
            customForm: (formContainer) => {
                renderAddForm(formContainer, {
                    label: 'Dodaj niestandardową lokację',
                    placeholder: 'np. Health/ — notatki o zdrowiu i ćwiczeniach',
                    onAdd: async (text) => {
                        await appendToFile(adapter, vaultMapPath,
                            `\n\n## Lokacje niestandardowe\n- ${text}`);
                        renderActiveTab();
                    }
                });
            }
        });

        // ── 4. ACTIVE CONTEXT ──
        await renderCollapsibleFile(el, {
            icon: '📋',
            title: 'Aktywny kontekst',
            path: `.pkm-assistant/agents/${safeName}/memory/active_context.md`,
            adapter,
            defaultOpen: false,
            showEditBtn: true,
        });

        // ── 5. AUDIT LOG ──
        await renderCollapsibleFile(el, {
            icon: '📝',
            title: 'Audit log (historia zmian)',
            path: `.pkm-assistant/agents/${safeName}/memory/audit.log`,
            adapter,
            defaultOpen: false,
            showEditBtn: true,
        });

        // ── 6. SESSIONS ──
        el.createEl('h4', { text: '💬 Sesje', cls: 'agent-profile-section-header memory-section-header' });

        try {
            const sessionsPath = `.pkm-assistant/agents/${safeName}/sessions`;
            const listed = await adapter.list(sessionsPath);
            const sessionFiles = (listed?.files || []).filter(f => f.endsWith('.md')).reverse();

            if (sessionFiles.length === 0) {
                el.createEl('p', { text: 'Brak zapisanych sesji.', cls: 'agent-profile-empty' });
            } else {
                const sessionList = el.createDiv({ cls: 'agent-profile-session-list' });
                for (const filePath of sessionFiles.slice(0, 20)) {
                    const fileName = filePath.split('/').pop().replace('.md', '');
                    const item = sessionList.createDiv({ cls: 'agent-profile-session-item' });
                    item.createSpan({ text: `💬 ${fileName}` });

                    // Copy path button
                    const copyBtn = item.createSpan({ text: '📋', cls: 'memory-copy-btn' });
                    copyBtn.title = 'Kopiuj ścieżkę';
                    copyBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(filePath);
                        new Notice('Skopiowano ścieżkę');
                    });

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

    // ─── STATS TAB ───

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

        // Archetype + Role info
        el.createEl('h4', { text: '🏷️ Typ', cls: 'agent-profile-section-header' });
        const typeInfo = el.createDiv({ cls: 'agent-profile-type-info' });
        typeInfo.createEl('p', { text: `Archetyp: ${agent.archetype || '—'}` });
        typeInfo.createEl('p', { text: `Rola: ${agent.role || '— (custom)'}` });

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

    // ========== HELPERS: Collapsible file sections ==========

    /**
     * Render a collapsible file section with markdown preview.
     */
    async function renderCollapsibleFile(parentEl, opts) {
        const { icon, title, path, adapter, defaultOpen, showEditBtn, customForm } = opts;

        // Header (clickable to toggle)
        const headerEl = parentEl.createDiv({ cls: 'memory-section-header' });
        const arrow = headerEl.createSpan({ text: defaultOpen ? '▼' : '▶', cls: 'memory-section-arrow' });
        headerEl.createSpan({ text: ` ${icon} ${title}` });

        // Content container (collapsed by default)
        const contentEl = parentEl.createDiv({ cls: 'memory-section-content' });
        if (!defaultOpen) contentEl.style.display = 'none';

        // Check if file exists
        let fileContent = '';
        let fileExists = false;
        try {
            fileExists = await adapter.exists(path);
            if (fileExists) {
                fileContent = await adapter.read(path);
            }
        } catch { /* ignore */ }

        if (!fileExists) {
            contentEl.createEl('p', { text: 'Plik nie istnieje.', cls: 'agent-profile-empty' });
        } else if (!fileContent.trim()) {
            contentEl.createEl('p', { text: 'Plik jest pusty.', cls: 'agent-profile-empty' });
        } else {
            // Render markdown sections (split by ## headers)
            const sections = splitMarkdownSections(fileContent);
            for (const section of sections) {
                if (section.heading) {
                    const sectionHeader = contentEl.createDiv({ cls: 'memory-subsection-header' });
                    sectionHeader.createSpan({ text: `▸ ${section.heading}`, cls: 'memory-subsection-title' });

                    const sectionBody = contentEl.createDiv({ cls: 'memory-subsection-body' });
                    await MarkdownRenderer.render(plugin.app, section.content, sectionBody, '', plugin);

                    // Toggle subsection
                    sectionHeader.addEventListener('click', () => {
                        const isHidden = sectionBody.style.display === 'none';
                        sectionBody.style.display = isHidden ? 'block' : 'none';
                        sectionHeader.querySelector('.memory-subsection-title').textContent =
                            `${isHidden ? '▾' : '▸'} ${section.heading}`;
                    });
                } else {
                    // Content without heading (intro)
                    const previewEl = contentEl.createDiv({ cls: 'agent-profile-preview' });
                    await MarkdownRenderer.render(plugin.app, section.content, previewEl, '', plugin);
                }
            }
        }

        // Edit button
        if (showEditBtn && fileExists) {
            const editBtn = contentEl.createEl('button', { text: '📝 Edytuj', cls: 'agent-profile-action-btn memory-edit-btn' });
            editBtn.addEventListener('click', async () => {
                await openHiddenFile(plugin.app, path, path.split('/').pop());
            });
        }

        // Custom form (e.g. "Add custom instructions")
        if (customForm) {
            customForm(contentEl);
        }

        // Toggle collapse
        headerEl.addEventListener('click', () => {
            const isHidden = contentEl.style.display === 'none';
            contentEl.style.display = isHidden ? 'block' : 'none';
            arrow.textContent = isHidden ? '▼' : '▶';
        });
        headerEl.style.cursor = 'pointer';
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
                    archetype: formData.archetype || 'specialist',
                    role: formData.role || undefined,
                    personality: formData.personality,
                    temperature: formData.temperature,
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
                    archetype: formData.archetype,
                    role: formData.role,
                    personality: formData.personality,
                    temperature: formData.temperature,
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

        const cancelDeleteBtn = btnRow.createEl('button', { text: 'Anuluj' });
        cancelDeleteBtn.addEventListener('click', () => renderActiveTab());

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

// ========== UTILITY FUNCTIONS ==========

/**
 * Split markdown content into sections by ## headers.
 */
function splitMarkdownSections(content) {
    const lines = content.split('\n');
    const sections = [];
    let currentHeading = null;
    let currentLines = [];

    for (const line of lines) {
        const headingMatch = line.match(/^##\s+(.+)/);
        if (headingMatch) {
            if (currentLines.length > 0 || currentHeading) {
                sections.push({
                    heading: currentHeading,
                    content: currentLines.join('\n').trim()
                });
            }
            currentHeading = headingMatch[1];
            currentLines = [];
        } else {
            currentLines.push(line);
        }
    }

    // Last section
    if (currentLines.length > 0 || currentHeading) {
        sections.push({
            heading: currentHeading,
            content: currentLines.join('\n').trim()
        });
    }

    return sections.filter(s => s.content || s.heading);
}

/**
 * Render a mini form for adding content to a file.
 */
function renderAddForm(container, opts) {
    const { label, placeholder, onAdd } = opts;
    const formEl = container.createDiv({ cls: 'memory-add-form' });
    formEl.createEl('label', { text: label, cls: 'memory-add-label' });

    const row = formEl.createDiv({ cls: 'memory-add-row' });
    const input = row.createEl('input', { type: 'text', placeholder, cls: 'memory-add-input' });
    const btn = row.createEl('button', { text: '+', cls: 'memory-add-btn' });

    btn.addEventListener('click', async () => {
        const value = input.value.trim();
        if (!value) return;
        await onAdd(value);
        input.value = '';
        new Notice('Dodano!');
    });

    // Enter key support
    input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            btn.click();
        }
    });
}

/**
 * Append text to a file (create if not exists).
 */
async function appendToFile(adapter, path, text) {
    try {
        const exists = await adapter.exists(path);
        if (exists) {
            const current = await adapter.read(path);
            await adapter.write(path, current + text);
        } else {
            await adapter.write(path, text.trim());
        }
    } catch (e) {
        new Notice('Błąd zapisu: ' + e.message);
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
