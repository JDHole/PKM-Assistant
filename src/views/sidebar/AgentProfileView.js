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
import { TOOL_GROUPS, FACTORY_DEFAULTS, DECISION_TREE_GROUPS, DECISION_TREE_DEFAULTS } from '../../core/PromptBuilder.js';
import { TOOL_INFO, getToolIcon } from '../../components/ToolCallDisplay.js';
import { IconGenerator } from '../../crystal-soul/IconGenerator.js';
import { CrystalGenerator } from '../../crystal-soul/CrystalGenerator.js';
import { pickColor, COLOR_GROUPS, getColorByHex } from '../../crystal-soul/ColorPalette.js';
import { UiIcons } from '../../crystal-soul/UiIcons.js';
import { hexToRgbTriplet } from '../../crystal-soul/SvgHelper.js';

// SVG status icons
const SVG_CHECK = '<svg viewBox="0 0 12 12" width="12" height="12"><polyline points="2,6 5,9 10,3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SVG_X = '<svg viewBox="0 0 12 12" width="12" height="12"><line x1="3" y1="3" x2="9" y2="9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="9" y1="3" x2="3" y2="9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const SVG_TRASH = '<svg viewBox="0 0 14 14" width="14" height="14"><path d="M3,4 V12 A1,1 0 0,0 4,13 H10 A1,1 0 0,0 11,12 V4" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M2,4 H12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M5,4 V2.5 A0.5,0.5 0 0,1 5.5,2 H8.5 A0.5,0.5 0 0,1 9,2.5 V4" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';

// Tab definitions (Crystal Soul 8-tab layout)
const TABS = [
    { id: 'overview',    label: 'Przegląd',      icon: () => UiIcons.eye(14), editOnly: true },
    { id: 'profile',     label: 'Persona',        icon: () => UiIcons.user(14) },
    { id: 'skills',      label: 'Umiejętności',   icon: () => UiIcons.zap(14) },
    { id: 'team',        label: 'Ekipa',           icon: () => UiIcons.users(14) },
    { id: 'permissions', label: 'Uprawnienia',    icon: () => UiIcons.shield(14) },
    { id: 'memory',      label: 'Pamięć',         icon: () => UiIcons.brain(14), editOnly: true },
    { id: 'prompt',      label: 'Prompt',          icon: () => UiIcons.edit(14) },
    { id: 'advanced',    label: 'Zaawansowane',   icon: () => UiIcons.settings(14), editOnly: true },
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
        color: agent.color || null,
        archetype: agent.archetype || 'specialist',
        role: agent.role || '',
        personality: agent.personality || '',
        description: agent.description || '',
        createdAt: agent.createdAt || null,
        temperature: agent.temperature,
        focus_folders: [...(agent.focusFolders || [])],
        model: agent.model || '',
        skills: JSON.parse(JSON.stringify(agent._skills || [])),
        enabled_tools: [...(agent.enabledTools || [])],
        minions: JSON.parse(JSON.stringify(agent._minions || [])),
        minion_enabled: agent.minionEnabled !== false,
        masters: JSON.parse(JSON.stringify(agent._masters || [])),
        master_enabled: agent.masterEnabled !== false,
        permissions: { ...agent.permissions },
        models: JSON.parse(JSON.stringify(agent.models || {})),
        default_mode: agent.defaultMode || '',
        prompt_overrides: JSON.parse(JSON.stringify(agent.promptOverrides || {})),
        agent_rules: agent.agentRules || '',
        playbook_overrides: JSON.parse(JSON.stringify(agent.playbookOverrides || {}))
    } : {
        name: '',
        emoji: '',
        color: null,
        archetype: 'specialist',
        role: '',
        personality: '',
        description: '',
        createdAt: null,
        temperature: 0.7,
        focus_folders: [],
        model: '',
        skills: [],
        enabled_tools: [],
        minions: [],
        minion_enabled: true,
        masters: [],
        master_enabled: true,
        permissions: { ...DEFAULT_PERMISSIONS, mcp: true },
        models: {},
        default_mode: '',
        prompt_overrides: {},
        agent_rules: '',
        playbook_overrides: {}
    };

    // Agent color for CSS
    const agentColor = agent?.color || pickColor(formData.name || 'default').hex;
    const agentRgb = hexToRgbTriplet(agentColor);
    container.addClass('cs-root');
    container.style.setProperty('--cs-agent-color-rgb', agentRgb);

    // State
    let activeTab = isCreateMode ? 'profile' : 'overview';
    let activeSkillsSubTab = 'skills';
    let activeEkipaSubTab = 'minions';

    // ── HEADER (name only — crystal moved to overview tab) ──
    const header = container.createDiv({ cls: 'cs-profile__header' });
    header.createEl('h2', { text: isCreateMode ? 'Nowy Agent' : formData.name, cls: 'cs-profile__name' });
    if (!isCreateMode && formData.role) {
        header.createDiv({ cls: 'cs-profile__role', text: formData.role });
    }

    // ── TAB BAR ──
    const tabBar = container.createDiv({ cls: 'cs-profile-tabs' });
    for (const tab of TABS) {
        if (tab.editOnly && isCreateMode) continue;
        const tabBtn = tabBar.createEl('button', {
            cls: `cs-profile-tab ${activeTab === tab.id ? 'cs-profile-tab--active' : ''}`
        });
        const tabIconSpan = tabBtn.createSpan();
        tabIconSpan.innerHTML = tab.icon();
        tabBtn.createSpan({ text: tab.label });
        tabBtn.dataset.tab = tab.id;
        tabBtn.addEventListener('click', () => {
            activeTab = tab.id;
            tabBar.querySelectorAll('.cs-profile-tab').forEach(t => t.classList.remove('cs-profile-tab--active'));
            tabBtn.classList.add('cs-profile-tab--active');
            renderActiveTab();
        });
    }

    // ── TAB CONTENT ──
    const tabContent = container.createDiv({ cls: 'cs-profile-content' });

    // ── BUTTONS (bottom bar) ──
    const buttonContainer = container.createDiv({ cls: 'cs-profile-buttons' });

    const cancelBtn = buttonContainer.createEl('button', { text: 'Anuluj' });
    cancelBtn.addEventListener('click', () => nav.pop());

    const saveBtn = buttonContainer.createEl('button', {
        text: isCreateMode ? 'Utwórz' : 'Zapisz',
        cls: 'cs-btn--primary'
    });
    saveBtn.addEventListener('click', () => handleSave());

    if (!isCreateMode && !agent.isBuiltIn) {
        const deleteBtn = buttonContainer.createEl('button', { cls: 'cs-btn--danger' });
        deleteBtn.innerHTML = UiIcons.trash(12) + ' Usuń';
        deleteBtn.addEventListener('click', () => showDeleteConfirmation());
    }

    // Render initial tab
    renderActiveTab();

    // ========== TAB RENDERERS ==========

    async function renderActiveTab() {
        tabContent.empty();
        try {
            switch (activeTab) {
                case 'overview': await renderOverviewTab(tabContent); break;
                case 'profile': renderProfileTab(tabContent); break;
                case 'permissions': renderPermissionsTab(tabContent); break;
                case 'skills': renderSkillsTab(tabContent); break;
                case 'team': renderEkipaTab(tabContent); break;
                case 'prompt': renderPromptTab(tabContent); break;
                case 'memory': renderMemoryTab(tabContent); break;
                case 'advanced': await renderAdvancedTab(tabContent); break;
            }
        } catch (err) {
            console.error('[AgentProfile] renderActiveTab error:', err);
            tabContent.createDiv({ text: 'Błąd renderowania: ' + err.message, cls: 'cs-shard__sub-label' });
        }
    }

    // ─── OVERVIEW TAB (new — Crystal Soul stats) ───

    async function renderOverviewTab(el) {
        const skillCount = formData.skills?.length || 0;
        const minionCount = formData.minions?.length || 0;
        const masterCount = formData.masters?.length || 0;

        // Fetch real stats (async, safe)
        let stats = null;
        try { stats = agent ? await agentManager.getAgentStats?.(agent.name) : null; } catch (e) { /* ignore */ }
        const sessionCount = stats?.sessionCount ?? 0;

        // ── Hero card: info left + crystal right ──
        const hero = el.createDiv({ cls: 'cs-profile-hero' });
        const heroInfo = hero.createDiv({ cls: 'cs-profile-hero__info' });
        heroInfo.createEl('h2', { text: formData.name, cls: 'cs-profile-hero__name' });

        // Editable description
        const descRow = heroInfo.createDiv({ cls: 'cs-profile-hero__desc-row' });
        const descText = descRow.createDiv({
            cls: 'cs-profile-hero__desc',
            text: formData.description || 'Kliknij aby dodać opis…'
        });
        if (!formData.description) descText.classList.add('cs-profile-hero__desc--empty');
        const editBtn = descRow.createDiv({ cls: 'cs-profile-hero__edit' });
        editBtn.innerHTML = UiIcons.edit(10);
        editBtn.addEventListener('click', () => {
            descText.empty();
            const input = descText.createEl('textarea', {
                cls: 'cs-profile-hero__desc-input',
                attr: { rows: 2, placeholder: 'Opis agenta…' }
            });
            input.value = formData.description || '';
            input.focus();
            editBtn.style.display = 'none';
            const save = () => {
                formData.description = input.value.trim();
                descText.empty();
                descText.textContent = formData.description || 'Kliknij aby dodać opis…';
                descText.classList.toggle('cs-profile-hero__desc--empty', !formData.description);
                editBtn.style.display = '';
            };
            input.addEventListener('blur', save);
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); } });
        });

        // Meta: archetype badge + dates
        const heroMeta = heroInfo.createDiv({ cls: 'cs-profile-hero__meta' });
        heroMeta.createSpan({ text: formData.archetype || 'specialist', cls: 'cs-profile-hero__badge' });
        if (formData.createdAt) {
            heroMeta.createSpan({ text: new Date(formData.createdAt).toLocaleDateString('pl-PL'), cls: 'cs-profile-hero__date' });
        }
        if (stats?.lastActivity) {
            heroMeta.createSpan({ text: 'aktywny ' + new Date(stats.lastActivity).toLocaleDateString('pl-PL'), cls: 'cs-profile-hero__date' });
        }

        // Color picker row (Crystal Soul palette)
        const colorRow = heroInfo.createDiv({ cls: 'cs-profile-hero__color-row' });
        const colorDot = colorRow.createDiv({ cls: 'cs-profile-hero__color-dot' });
        colorDot.style.background = agentColor;
        const colorMatch = getColorByHex(agentColor);
        const colorLabel = colorRow.createSpan({ text: colorMatch?.name || agentColor, cls: 'cs-profile-hero__color-hex' });

        const applyColor = (hex) => {
            colorDot.style.background = hex;
            const match = getColorByHex(hex);
            colorLabel.textContent = match?.name || hex;
            formData.color = hex;
            const rgb = hex.replace('#', '').match(/.{2}/g).map(h => parseInt(h, 16)).join(',');
            container.style.setProperty('--cs-agent-color-rgb', rgb);
            crystalBox.innerHTML = CrystalGenerator.generate(formData.name, { size: 100, color: hex, glow: true });
        };

        let palettePopup = null;
        const togglePalette = () => {
            if (palettePopup) { palettePopup.remove(); palettePopup = null; return; }
            palettePopup = heroInfo.createDiv({ cls: 'cs-palette-popup' });
            for (const [group, colors] of Object.entries(COLOR_GROUPS)) {
                const row = palettePopup.createDiv({ cls: 'cs-palette-popup__row' });
                for (const c of colors) {
                    const swatch = row.createDiv({ cls: 'cs-palette-popup__swatch' });
                    swatch.style.background = c.hex;
                    swatch.title = c.name;
                    if (c.hex.toLowerCase() === (formData.color || agentColor).toLowerCase()) {
                        swatch.classList.add('cs-palette-popup__swatch--active');
                    }
                    swatch.addEventListener('click', () => {
                        applyColor(c.hex);
                        palettePopup.remove();
                        palettePopup = null;
                    });
                }
            }
        };
        colorDot.addEventListener('click', togglePalette);
        colorLabel.addEventListener('click', togglePalette);

        const crystalBox = hero.createDiv({ cls: 'cs-profile__crystal' });
        crystalBox.innerHTML = CrystalGenerator.generate(formData.name, { size: 100, color: agentColor, glow: true });

        // Grid 1 — Activity stats
        const grid = el.createDiv({ cls: 'cs-shards' });
        for (const stat of [
            { label: 'Sesje', value: String(sessionCount) },
            { label: 'Skille', value: String(skillCount) },
            { label: 'Miniony', value: String(minionCount) },
            { label: 'Mastery', value: String(masterCount) },
        ]) {
            const shard = grid.createDiv({ cls: `cs-shard ${stat.value !== '0' ? 'cs-shard--filled' : 'cs-shard--empty'}` });
            shard.createDiv({ cls: 'cs-shard__value cs-shard__value--has', text: stat.value });
            shard.createDiv({ cls: 'cs-shard__main-label', text: stat.label });
        }

        // Grid 2 — Model + Memory
        const infoGrid = el.createDiv({ cls: 'cs-shards' });
        for (const info of [
            { label: 'Model', value: formData.model || 'Globalny' },
            { label: 'L1', value: String(stats?.l1Count ?? 0) },
            { label: 'L2', value: String(stats?.l2Count ?? 0) },
            { label: 'Brain', value: String(stats?.brainSize ?? 0) },
        ]) {
            const filled = info.value !== '0' && info.value !== '—';
            const shard = infoGrid.createDiv({ cls: `cs-shard ${filled ? 'cs-shard--filled' : 'cs-shard--empty'}` });
            shard.createDiv({ cls: 'cs-shard__value cs-shard__value--has', text: info.value });
            shard.createDiv({ cls: 'cs-shard__main-label', text: info.label });
        }
    }

    // ─── Helper: render shard-style form field ───

    function renderShard(container, label, sublabel, value, type, onChange, opts = {}) {
        const shard = container.createDiv({
            cls: `cs-shard ${value ? 'cs-shard--filled' : 'cs-shard--empty'} ${opts.big ? 'cs-shard--big' : ''}`
        });
        const labelDiv = shard.createDiv({ cls: 'cs-shard__label' });
        labelDiv.createDiv({ cls: 'cs-shard__main-label', text: label });
        if (sublabel) labelDiv.createDiv({ cls: 'cs-shard__sub-label', text: sublabel });

        if (type === 'text') {
            const input = shard.createEl('input', {
                cls: 'cs-shard__input', attr: { type: 'text', value: value || '', placeholder: opts.placeholder || '' }
            });
            input.addEventListener('change', e => {
                onChange(e.target.value);
                shard.className = `cs-shard ${e.target.value ? 'cs-shard--filled' : 'cs-shard--empty'} ${opts.big ? 'cs-shard--big' : ''}`;
            });
        } else if (type === 'textarea') {
            const textarea = shard.createEl('textarea', { cls: 'cs-shard__textarea' });
            textarea.value = value || '';
            textarea.rows = opts.rows || 5;
            textarea.placeholder = opts.placeholder || '';
            textarea.addEventListener('change', e => onChange(e.target.value));
        } else if (type === 'select') {
            const select = shard.createEl('select', { cls: 'cs-shard__select' });
            for (const opt of (opts.options || [])) {
                select.createEl('option', { value: opt.value, text: opt.label });
            }
            select.value = value || '';
            select.addEventListener('change', e => {
                onChange(e.target.value);
                if (opts.rerender) renderActiveTab();
            });
        } else if (type === 'slider') {
            const row = shard.createDiv({ attr: { style: 'display:flex;align-items:center;gap:8px' } });
            const slider = row.createEl('input', {
                cls: 'cs-shard__slider', attr: { type: 'range', min: opts.min ?? 0, max: opts.max ?? 1, step: opts.step ?? 0.1, value: value ?? 0.7 }
            });
            const valSpan = row.createSpan({ cls: 'cs-shard__value', text: String(value ?? 0.7) });
            slider.addEventListener('input', e => {
                valSpan.textContent = e.target.value;
                onChange(parseFloat(e.target.value));
            });
        } else if (type === 'display') {
            shard.createDiv({ cls: 'cs-shard__value cs-shard__value--has', text: String(value || '—') });
        }

        return shard;
    }

    // ─── Crystal toggle helper ───

    function renderToggle(container, label, desc, value, onChange) {
        const row = container.createDiv({ cls: `cs-perm-row ${value ? 'cs-perm-row--on' : ''}` });
        const info = row.createDiv({ cls: 'cs-perm-row__info' });
        info.createDiv({ cls: 'cs-perm-row__name', text: label });
        if (desc) info.createDiv({ cls: 'cs-perm-row__desc', text: desc });

        const toggle = row.createDiv({ cls: `cs-toggle ${value ? 'cs-toggle--on' : ''}` });
        toggle.createDiv({ cls: 'cs-toggle__track' });
        toggle.createDiv({ cls: 'cs-toggle__thumb' });
        toggle.addEventListener('click', () => {
            const newVal = !toggle.classList.contains('cs-toggle--on');
            toggle.classList.toggle('cs-toggle--on', newVal);
            row.classList.toggle('cs-perm-row--on', newVal);
            onChange(newVal);
        });
        return row;
    }

    // ─── PROFILE TAB (sesja 41: Archetype → Role flow) ───

    function renderProfileTab(el) {
        const grid = el.createDiv({ cls: 'cs-shards' });

        // Name
        renderShard(grid, 'Nazwa', 'Unikalna nazwa agenta', formData.name, 'text',
            v => formData.name = v, { placeholder: 'np. Bibliotekarz' });

        // Archetype
        const archetypes = getArchetypeList();
        renderShard(grid, 'Archetyp', 'Typ agenta — filozofia pracy', formData.archetype, 'select',
            v => { formData.archetype = v; renderActiveTab(); },
            { options: archetypes.map(a => ({ value: a.id, label: a.name })), rerender: true });

        // Role
        const roleLoader = agentManager.roleLoader;
        if (roleLoader) {
            const allRoles = roleLoader.getRoleList();
            const suggestedRoles = roleLoader.getRoleList(formData.archetype);
            const otherRoles = allRoles.filter(r => r.archetype !== formData.archetype);
            const roleOptions = [{ value: '', label: '— Bez roli (custom) —' }];
            for (const role of suggestedRoles) roleOptions.push({ value: role.id, label: role.name });
            for (const role of otherRoles) roleOptions.push({ value: role.id, label: `${role.name} (${role.archetype})` });

            renderShard(grid, 'Rola', 'Specjalizacja agenta — nadaje konkrety', formData.role || '', 'select',
                v => {
                    formData.role = v || null;
                    if (!v) {
                        formData.personality = '';
                        formData.temperature = 0.7;
                        formData.permissions = { ...DEFAULT_PERMISSIONS, mcp: true };
                        formData.skills = [];
                        formData.focus_folders = [];
                        renderActiveTab();
                        return;
                    }
                    const roleData = roleLoader.getRole(v);
                    if (roleData) {
                        if (roleData.personality_template) formData.personality = roleData.personality_template.replace(/\{name\}/g, formData.name || 'Agent');
                        if (roleData.temperature !== undefined) formData.temperature = roleData.temperature;
                        if (roleData.default_permissions) formData.permissions = { ...DEFAULT_PERMISSIONS, ...(roleData.default_permissions || {}) };
                        if (roleData.recommended_skills?.length > 0) formData.skills = roleData.recommended_skills.map(s => typeof s === 'string' ? { name: s } : s);
                        else formData.skills = [];
                        if (roleData.focus_folders?.length > 0) formData.focus_folders = [...roleData.focus_folders];
                        else formData.focus_folders = [];
                        renderActiveTab();
                    }
                },
                { options: roleOptions, rerender: true });
        }

        // Personality (big shard)
        renderShard(grid, 'Osobowość', null, formData.personality, 'textarea',
            v => formData.personality = v, { big: true, placeholder: 'Opisz kim jest agent...', rows: 6 });
    }

    // ─── PERMISSIONS TAB ───

    function renderPermissionsTab(el) {
        // Presets
        const presetRow = el.createDiv({ cls: 'cs-preset-row' });
        const presets = [
            { id: 'safe', label: 'Safe', perms: { read_notes: true, edit_notes: false, create_files: false, delete_files: false, access_outside_vault: false, execute_commands: false, thinking: false, mcp: false, yolo_mode: false, memory: true, guidance_mode: false } },
            { id: 'standard', label: 'Standard', perms: { read_notes: true, edit_notes: true, create_files: true, delete_files: false, access_outside_vault: false, execute_commands: false, thinking: false, mcp: true, yolo_mode: false, memory: true, guidance_mode: false } },
            { id: 'yolo', label: 'Full', perms: { read_notes: true, edit_notes: true, create_files: true, delete_files: true, access_outside_vault: false, execute_commands: false, thinking: false, mcp: true, yolo_mode: true, memory: true, guidance_mode: false } }
        ];
        for (const preset of presets) {
            const btn = presetRow.createEl('button', { text: preset.label, cls: 'cs-preset-btn' });
            btn.addEventListener('click', () => {
                formData.permissions = { ...preset.perms };
                renderActiveTab();
            });
        }

        // Detailed permissions (crystal toggles)
        const headPerms = el.createDiv({ cls: 'cs-section-head' });
        headPerms.innerHTML = UiIcons.shield(14);
        headPerms.createSpan({ text: 'Szczegółowe uprawnienia' });

        const activePerms = [
            { key: PERMISSION_TYPES.READ_NOTES, label: 'Czytanie notatek', hint: 'Odczyt plików z vaulta' },
            { key: PERMISSION_TYPES.EDIT_NOTES, label: 'Modyfikacja notatek', hint: 'Edycja istniejących plików' },
            { key: PERMISSION_TYPES.CREATE_FILES, label: 'Tworzenie plików', hint: 'Nowe notatki i foldery' },
            { key: PERMISSION_TYPES.DELETE_FILES, label: 'Usuwanie plików', hint: 'Trwałe usunięcie z vaulta' },
            { key: PERMISSION_TYPES.MCP, label: 'Narzędzia MCP', hint: 'Wyszukiwanie, zapis, delegacja' },
            { key: PERMISSION_TYPES.YOLO_MODE, label: 'Auto-zatwierdź', hint: 'Bez pytania (YOLO mode)' },
            { key: 'memory', label: 'Pamięć', hint: 'Brain.md, sesje, narzędzia pamięci' }
        ];

        for (const { key, label, hint } of activePerms) {
            renderToggle(el, label, hint, formData.permissions[key] === true,
                v => { formData.permissions[key] = v; });
        }

        // Focus folders section
        const headFocus = el.createDiv({ cls: 'cs-section-head' });
        headFocus.innerHTML = UiIcons.folder(14);
        headFocus.createSpan({ text: 'Dostęp do folderów' });

        renderToggle(el, 'Guidance mode',
            formData.permissions.guidance_mode
                ? 'Agent widzi cały vault (except No-Go). Focus folders to priorytety.'
                : 'WHITELIST: agent widzi TYLKO focus folders. Reszta nie istnieje.',
            formData.permissions.guidance_mode === true,
            v => { formData.permissions.guidance_mode = v; renderActiveTab(); });

        renderFocusFoldersSection(el);
    }

    // ─── SKILLS TAB ───

    /**
     * Show inline override form for a skill under this agent.
     */
    function _showSkillOverrideForm(container, baseSkill, assignment, onDone) {
        // Remove any existing override form
        container.querySelector('.skill-override-form')?.remove();

        const ovr = assignment.overrides || {};
        const form = container.createDiv({ cls: 'skill-override-form cs-skill-override' });

        const ovrHeader = form.createEl('h5');
        ovrHeader.innerHTML = UiIcons.info(14) + ` Overrides: ${baseSkill.name}`;
        form.createEl('p', {
            text: 'Zmiany dotyczą TYLKO tego agenta. Oryginalny skill pozostaje niezmieniony.',
            cls: 'setting-item-description'
        });

        // Prompt append
        new Setting(form)
            .setName('Dodatkowe instrukcje')
            .setDesc('Tekst dołączony na końcu promptu skilla')
            .addTextArea(text => {
                text.setPlaceholder('Np. "Zawsze pisz po angielsku"')
                    .setValue(ovr.prompt_append || '')
                    .onChange(v => {
                        if (!assignment.overrides) assignment.overrides = {};
                        if (v.trim()) {
                            assignment.overrides.prompt_append = v.trim();
                        } else {
                            delete assignment.overrides.prompt_append;
                        }
                    });
                text.inputEl.rows = 3;
                text.inputEl.style.width = '100%';
            });

        // Model override
        new Setting(form)
            .setName('Model override')
            .setDesc('Inny model na czas tego skilla (pusty = domyślny)')
            .addText(text => {
                text.setPlaceholder('np. deepseek-reasoner')
                    .setValue(ovr.model || '')
                    .onChange(v => {
                        if (!assignment.overrides) assignment.overrides = {};
                        if (v.trim()) {
                            assignment.overrides.model = v.trim();
                        } else {
                            delete assignment.overrides.model;
                        }
                    });
            });

        // Pre-question default overrides
        if (baseSkill.preQuestions?.length > 0) {
            const preqHeader = form.createEl('h6');
            preqHeader.innerHTML = UiIcons.question(12) + ' Domyślne odpowiedzi na pytania';
            for (const pq of baseSkill.preQuestions) {
                new Setting(form)
                    .setName(`{{${pq.key}}} — ${pq.question}`)
                    .addText(text => {
                        text.setPlaceholder(pq.default || '(brak)')
                            .setValue(ovr.pre_question_defaults?.[pq.key] || '')
                            .onChange(v => {
                                if (!assignment.overrides) assignment.overrides = {};
                                if (!assignment.overrides.pre_question_defaults) assignment.overrides.pre_question_defaults = {};
                                if (v.trim()) {
                                    assignment.overrides.pre_question_defaults[pq.key] = v.trim();
                                } else {
                                    delete assignment.overrides.pre_question_defaults[pq.key];
                                    if (Object.keys(assignment.overrides.pre_question_defaults).length === 0) {
                                        delete assignment.overrides.pre_question_defaults;
                                    }
                                }
                            });
                    });
            }
        }

        // Close / clear buttons
        const btnRow = form.createDiv({ cls: 'skill-override-buttons cs-skill-override__buttons' });

        const clearBtn = btnRow.createEl('button', { text: 'Wyczyść overrides', cls: 'cs-btn--danger' });
        clearBtn.addEventListener('click', () => {
            delete assignment.overrides;
            form.remove();
            if (onDone) onDone();
        });

        const closeBtn = btnRow.createEl('button', { text: 'Zamknij', cls: 'mod-cta' });
        closeBtn.addEventListener('click', () => {
            // Clean empty overrides object
            if (assignment.overrides && Object.keys(assignment.overrides).length === 0) {
                delete assignment.overrides;
            }
            form.remove();
            if (onDone) onDone();
        });
    }

    function renderSkillsTab(el) {
        // ── Sub-tab bar: Skille | MCP ──
        const subTabBar = el.createDiv({ cls: 'cs-profile-tabs' });

        const skillSubTab = subTabBar.createEl('button', {
            cls: `cs-profile-tab ${activeSkillsSubTab === 'skills' ? 'cs-profile-tab--active' : ''}`
        });
        const skillTabIcon = skillSubTab.createSpan();
        skillTabIcon.innerHTML = UiIcons.zap(14);
        skillSubTab.createSpan({ text: ' Skille' });

        const mcpSubTab = subTabBar.createEl('button', {
            cls: `cs-profile-tab ${activeSkillsSubTab === 'mcp' ? 'cs-profile-tab--active' : ''}`
        });
        const mcpTabIcon = mcpSubTab.createSpan();
        mcpTabIcon.innerHTML = UiIcons.wrench(14);
        mcpSubTab.createSpan({ text: ' MCP' });

        const subContent = el.createDiv({ cls: 'cs-profile-content' });

        function renderSubContent() {
            subContent.empty();
            if (activeSkillsSubTab === 'skills') {
                _renderSkillsGrid(subContent);
            } else {
                _renderMcpSection(subContent);
            }
        }

        skillSubTab.addEventListener('click', () => {
            activeSkillsSubTab = 'skills';
            subTabBar.querySelectorAll('.cs-profile-tab').forEach(t => t.classList.remove('cs-profile-tab--active'));
            skillSubTab.classList.add('cs-profile-tab--active');
            renderSubContent();
        });
        mcpSubTab.addEventListener('click', () => {
            activeSkillsSubTab = 'mcp';
            subTabBar.querySelectorAll('.cs-profile-tab').forEach(t => t.classList.remove('cs-profile-tab--active'));
            mcpSubTab.classList.add('cs-profile-tab--active');
            renderSubContent();
        });

        renderSubContent();

        // ── Playbook Builder (poza sub-tabami, zawsze widoczny) ──
        if (!isCreateMode) {
            _renderPlaybookBuilder(el);
        }
    }

    // ── Skills grid (shard layout) ──
    function _renderSkillsGrid(el) {
        const isAssigned = (name) => formData.skills.some(s => s.name === name);
        const getAssignment = (name) => formData.skills.find(s => s.name === name);

        const skillLoader = plugin.agentManager?.skillLoader;
        if (!skillLoader) return;

        const allSkills = skillLoader.getAllSkills();
        if (allSkills.length === 0) {
            el.createEl('p', { text: 'Brak dostępnych skilli.', cls: 'agent-profile-empty' });
            return;
        }

        const grid = el.createDiv({ cls: 'cs-shards cs-shards--compact' });

        for (const skill of allSkills) {
            const assigned = isAssigned(skill.name);
            const assignment = getAssignment(skill.name);
            const hasOverrides = assignment?.overrides && Object.keys(assignment.overrides).length > 0;

            const shard = grid.createDiv({
                cls: `cs-shard ${assigned ? 'cs-shard--filled' : 'cs-shard--empty'}`
            });
            shard.style.cursor = 'pointer';
            shard.style.position = 'relative';

            // Icon
            const iconEl = shard.createDiv({ cls: 'cs-shard__icon' });
            iconEl.innerHTML = IconGenerator.generate(skill.name || 'skill', skill.icon_category || 'arcane', { size: 24, color: 'currentColor' });

            // Name
            shard.createDiv({
                cls: 'cs-shard__main-label',
                text: skill.name + (hasOverrides ? ' *' : '')
            });

            // Description
            if (skill.description) {
                shard.createDiv({ cls: 'cs-shard__sub-label', text: skill.description });
            }

            // Click = toggle assign/unassign
            shard.addEventListener('click', () => {
                if (assigned) {
                    formData.skills = formData.skills.filter(s => s.name !== skill.name);
                } else {
                    if (!isAssigned(skill.name)) {
                        formData.skills.push({ name: skill.name });
                    }
                }
                renderActiveTab();
            });

            // Override edit button (only for assigned)
            if (assigned) {
                const editBtn = shard.createEl('button', { cls: 'clickable-icon cs-shard__action' });
                editBtn.innerHTML = UiIcons.edit(12);
                editBtn.title = 'Edytuj pod tego agenta';
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    _showSkillOverrideForm(el, skill, assignment, () => renderActiveTab());
                });
            }

            // Detail link
            const detailBtn = shard.createEl('button', { cls: 'clickable-icon cs-shard__detail' });
            detailBtn.innerHTML = UiIcons.search(12);
            detailBtn.title = 'Szczegóły';
            detailBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                nav.push('skill-detail', { skillName: skill.name }, formData.name || 'Nowy agent');
            });
        }
    }

    // ── MCP Tools section (shard grid — same style as skills) ──
    function _renderMcpSection(el) {
        if (!formData.permissions?.mcp) {
            el.createEl('p', { text: 'MCP wyłączone w uprawnieniach.', cls: 'agent-profile-empty' });
            return;
        }

        const allTools = Object.values(TOOL_GROUPS).flat();
        // empty enabled_tools = all enabled
        const isEnabled = (t) => formData.enabled_tools.length === 0 || formData.enabled_tools.includes(t);

        const grid = el.createDiv({ cls: 'cs-shards cs-shards--compact' });

        for (const tool of allTools) {
            const enabled = isEnabled(tool);
            const info = TOOL_INFO[tool];

            const shard = grid.createDiv({
                cls: `cs-shard cs-shard--tool ${enabled ? 'cs-shard--filled' : 'cs-shard--empty'}`
            });
            shard.style.cursor = 'pointer';

            // Icon
            const iconEl = shard.createDiv({ cls: 'cs-shard__icon' });
            iconEl.innerHTML = info?.icon ? info.icon() : UiIcons.wrench(14);

            // Polish label
            shard.createDiv({
                cls: 'cs-shard__main-label',
                text: info?.label || tool
            });

            // Click = toggle
            shard.addEventListener('click', () => {
                if (formData.enabled_tools.length === 0) {
                    // Switch from "all enabled" to explicit list with this one OFF
                    formData.enabled_tools = allTools.filter(t => t !== tool);
                } else if (enabled) {
                    formData.enabled_tools = formData.enabled_tools.filter(t => t !== tool);
                    // If nothing left, go back to "all enabled"
                    if (formData.enabled_tools.length === 0) formData.enabled_tools = [];
                } else {
                    formData.enabled_tools.push(tool);
                    // If all selected, reset to empty (= all)
                    if (formData.enabled_tools.length >= allTools.length) formData.enabled_tools = [];
                }
                renderActiveTab();
            });
        }
    }

    // ═══════════════════════════════════════════
    // PLAYBOOK BUILDER
    // ═══════════════════════════════════════════

    function _renderPlaybookBuilder(el) {
        const playbookManager = plugin.agentManager?.playbookManager;
        if (!playbookManager || !agent) return;

        const overrides = formData.playbook_overrides;
        if (!overrides.sectionOverrides) overrides.sectionOverrides = {};
        if (!overrides.customRules) overrides.customRules = [];

        // ── Header ──
        const headerRow = el.createDiv({ cls: 'cs-section-head', attr: { style: 'margin-top: 20px; justify-content: space-between;' } });
        const headerLeft = headerRow.createSpan();
        headerLeft.innerHTML = UiIcons.file(14);
        headerLeft.appendText(' Playbook');

        const compileBtn = headerRow.createEl('button', { text: 'Kompiluj', cls: 'cs-preset-btn' });
        compileBtn.addEventListener('click', async () => {
            // Temporarily apply overrides to agent for compilation
            const origOverrides = agent.playbookOverrides;
            agent.playbookOverrides = overrides;
            await playbookManager.compilePlaybook(agent, plugin);
            agent.playbookOverrides = origOverrides;
            new Notice('Playbook skompilowany!');
        });

        // ── Auto-section blocks ──
        const autoSections = [
            { key: 'rola', label: 'Rola i zachowanie', icon: UiIcons.user(14),
              gen: () => playbookManager.generateRolaSection(agent, plugin) },
            { key: 'narzedzia', label: 'Narzędzia', icon: UiIcons.wrench(14),
              gen: () => playbookManager.generateNarzedziaSection(agent) },
            { key: 'skille', label: 'Umiejętności', icon: UiIcons.zap(14),
              gen: () => playbookManager.generateSkilleSection(agent, plugin) },
            { key: 'delegowanie', label: 'Delegowanie', icon: UiIcons.robot(14),
              gen: () => playbookManager.generateDelegowanieSection(agent, plugin) },
        ];

        const blocksContainer = el.createDiv({ cls: 'cs-playbook-blocks' });
        for (const section of autoSections) {
            _renderPlaybookAutoBlock(blocksContainer, section, overrides.sectionOverrides);
        }

        // ── Custom Rules (Procedury) ──
        _renderPlaybookRules(el, overrides.customRules);

        // ── Preview button ──
        const previewBtn = el.createEl('button', { cls: 'cs-preset-btn', attr: { style: 'margin-top: 8px;' } });
        previewBtn.innerHTML = UiIcons.eye(12) + ' Podgląd playbook.md';
        previewBtn.addEventListener('click', async () => {
            const path = playbookManager.getPlaybookPath(agent.name);
            try {
                await openHiddenFile(plugin.app, path, `Playbook: ${agent.name}`, {
                    agentName: agent.name,
                    agentColor: agent.color || agent.crystalColor || ''
                });
            } catch { new Notice('Plik nie istnieje — kliknij Kompiluj.'); }
        });
    }

    /**
     * Render a single auto-generated playbook block (collapsible, editable).
     */
    function _renderPlaybookAutoBlock(container, section, sectionOverrides) {
        const isOverridden = sectionOverrides[section.key] != null;
        const autoText = section.gen();
        const displayText = isOverridden ? sectionOverrides[section.key] : autoText;

        const block = container.createDiv({ cls: 'cs-shard cs-shard--big cs-shard--filled cs-playbook-block' });

        // Header
        const headerRow = block.createDiv({ cls: 'cs-playbook-block__header' });
        const iconSpan = headerRow.createSpan();
        iconSpan.innerHTML = section.icon;
        headerRow.createSpan({ text: ' ' + section.label, cls: 'cs-shard__main-label' });

        const badge = headerRow.createSpan({
            text: isOverridden ? 'EDYTOWANE' : 'AUTO',
            cls: `cs-badge ${isOverridden ? 'cs-badge--edited' : 'cs-badge--auto'}`
        });

        // Chevron
        const chevron = headerRow.createSpan({ cls: 'cs-playbook-block__chevron' });
        chevron.innerHTML = UiIcons.chevronRight(12);

        // Preview (collapsed)
        const preview = block.createDiv({ cls: 'cs-playbook-block__preview' });
        const previewLines = displayText.split('\n').filter(l => l.trim() && !l.startsWith('##')).slice(0, 3);
        preview.textContent = previewLines.join('\n') + (previewLines.length >= 3 ? '...' : '');

        // Editor (hidden by default)
        const editor = block.createDiv({ cls: 'cs-playbook-block__editor' });
        editor.style.display = 'none';

        const textarea = editor.createEl('textarea', { cls: 'cs-shard__textarea' });
        textarea.value = displayText;
        textarea.rows = 10;
        textarea.addEventListener('change', () => {
            const newText = textarea.value;
            // If same as auto-generated, treat as "not overridden"
            if (newText.trim() === autoText.trim()) {
                delete sectionOverrides[section.key];
                badge.textContent = 'AUTO';
                badge.className = 'cs-badge cs-badge--auto';
            } else {
                sectionOverrides[section.key] = newText;
                badge.textContent = 'EDYTOWANE';
                badge.className = 'cs-badge cs-badge--edited';
            }
            // Update preview
            const pLines = newText.split('\n').filter(l => l.trim() && !l.startsWith('##')).slice(0, 3);
            preview.textContent = pLines.join('\n') + (pLines.length >= 3 ? '...' : '');
        });

        // Actions row
        const actions = editor.createDiv({ cls: 'cs-playbook-block__actions' });

        const resetBtn = actions.createEl('button', { cls: 'cs-preset-btn' });
        resetBtn.innerHTML = UiIcons.refresh(12) + ' Resetuj do auto';
        resetBtn.style.display = isOverridden ? '' : 'none';
        resetBtn.addEventListener('click', () => {
            delete sectionOverrides[section.key];
            textarea.value = autoText;
            badge.textContent = 'AUTO';
            badge.className = 'cs-badge cs-badge--auto';
            resetBtn.style.display = 'none';
            const pLines = autoText.split('\n').filter(l => l.trim() && !l.startsWith('##')).slice(0, 3);
            preview.textContent = pLines.join('\n') + (pLines.length >= 3 ? '...' : '');
        });

        // Toggle expand/collapse on header click
        let expanded = false;
        headerRow.style.cursor = 'pointer';
        headerRow.addEventListener('click', () => {
            expanded = !expanded;
            preview.style.display = expanded ? 'none' : 'block';
            editor.style.display = expanded ? 'block' : 'none';
            chevron.innerHTML = expanded ? UiIcons.chevronDown(12) : UiIcons.chevronRight(12);
            if (expanded) {
                resetBtn.style.display = sectionOverrides[section.key] != null ? '' : 'none';
            }
        });
    }

    /**
     * Render custom procedure rules ("Gdy X → Zrób Y").
     */
    function _renderPlaybookRules(el, customRules) {
        const header = el.createDiv({ cls: 'cs-section-head' });
        header.innerHTML = UiIcons.target(14);
        header.createSpan({ text: ' Procedury' });

        const rulesContainer = el.createDiv({ cls: 'cs-playbook-rules' });

        function rebuildRules() {
            rulesContainer.empty();
            for (let i = 0; i < customRules.length; i++) {
                _renderPlaybookRuleCard(rulesContainer, customRules, i, rebuildRules);
            }
        }
        rebuildRules();

        // Add button
        const addBtn = el.createEl('button', { cls: 'sidebar-create-btn' });
        addBtn.innerHTML = UiIcons.plus(12) + ' Dodaj procedurę';
        addBtn.addEventListener('click', () => {
            _showPlaybookRuleForm(rulesContainer, customRules, rebuildRules);
        });
    }

    /**
     * Render a single custom rule card.
     */
    function _renderPlaybookRuleCard(container, rules, index, onRebuild) {
        const rule = rules[index];
        const disabled = rule.enabled === false;

        const card = container.createDiv({
            cls: `cs-shard cs-shard--filled cs-playbook-rule ${disabled ? 'cs-playbook-rule--disabled' : ''}`
        });

        // "Gdy:" row
        const triggerRow = card.createDiv({ cls: 'cs-playbook-rule__trigger' });
        triggerRow.createSpan({ text: 'Gdy: ', cls: 'cs-playbook-rule__label' });
        triggerRow.createSpan({ text: rule.trigger });

        // "Zrób:" row
        const actionRow = card.createDiv({ cls: 'cs-playbook-rule__action' });
        actionRow.createSpan({ text: 'Zrób: ', cls: 'cs-playbook-rule__label' });
        actionRow.createSpan({ text: rule.action });

        // Action buttons (visible on hover)
        const actionsRow = card.createDiv({ cls: 'cs-playbook-rule__actions' });

        // Toggle enabled/disabled
        const toggleBtn = actionsRow.createEl('button', { cls: 'clickable-icon' });
        toggleBtn.innerHTML = disabled ? UiIcons.eyeOff(12) : UiIcons.eye(12);
        toggleBtn.title = disabled ? 'Włącz' : 'Wyłącz';
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            rule.enabled = disabled;
            onRebuild();
        });

        // Delete
        const deleteBtn = actionsRow.createEl('button', { cls: 'clickable-icon' });
        deleteBtn.innerHTML = UiIcons.cross(12);
        deleteBtn.title = 'Usuń';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            rules.splice(index, 1);
            onRebuild();
        });
    }

    /**
     * Show inline form to add a new custom procedure rule.
     */
    function _showPlaybookRuleForm(container, rules, onRebuild) {
        // Remove existing form if any
        container.parentEl?.querySelector('.cs-playbook-rule-form')?.remove();

        const form = container.createDiv({ cls: 'cs-shard cs-shard--big cs-playbook-rule-form' });

        form.createEl('label', { text: 'Gdy:', cls: 'cs-playbook-rule__label' });
        const triggerInput = form.createEl('input', {
            cls: 'cs-shard__input',
            attr: { type: 'text', placeholder: 'np. user pyta o zdrowie' }
        });

        form.createEl('label', { text: 'Zrób:', cls: 'cs-playbook-rule__label', attr: { style: 'margin-top: 6px;' } });
        const actionArea = form.createEl('textarea', {
            cls: 'cs-shard__textarea',
            attr: { placeholder: 'np. Szukaj w Health/, użyj skill daily-review', rows: 3 }
        });

        const btns = form.createDiv({ cls: 'cs-playbook-rule-form__buttons' });

        const saveBtn = btns.createEl('button', { text: 'Dodaj', cls: 'cs-btn--primary' });
        saveBtn.addEventListener('click', () => {
            const trigger = triggerInput.value.trim();
            const action = actionArea.value.trim();
            if (!trigger || !action) { new Notice('Wypełnij oba pola'); return; }
            rules.push({ id: 'rule_' + Date.now(), trigger, action, enabled: true });
            form.remove();
            onRebuild();
        });

        const cancelBtn = btns.createEl('button', { text: 'Anuluj', cls: 'cs-preset-btn' });
        cancelBtn.addEventListener('click', () => form.remove());

        triggerInput.focus();
    }

    // ── EKIPA TAB (Team — minions + masters, sub-tab layout like Skills) ──
    function renderEkipaTab(el) {
        // ── Sub-tab bar: Miniony | Mastery ──
        const subTabBar = el.createDiv({ cls: 'cs-profile-tabs' });

        const minionSubTab = subTabBar.createEl('button', {
            cls: `cs-profile-tab ${activeEkipaSubTab === 'minions' ? 'cs-profile-tab--active' : ''}`
        });
        const minionTabIcon = minionSubTab.createSpan();
        minionTabIcon.innerHTML = UiIcons.robot(14);
        minionSubTab.createSpan({ text: ' Miniony' });

        const masterSubTab = subTabBar.createEl('button', {
            cls: `cs-profile-tab ${activeEkipaSubTab === 'masters' ? 'cs-profile-tab--active' : ''}`
        });
        const masterTabIcon = masterSubTab.createSpan();
        masterTabIcon.innerHTML = UiIcons.crown(14);
        masterSubTab.createSpan({ text: ' Mastery' });

        const subContent = el.createDiv({ cls: 'cs-profile-content' });

        function renderSubContent() {
            subContent.empty();
            if (activeEkipaSubTab === 'minions') {
                _renderDelegateGrid(subContent, {
                    type: 'minion',
                    items: formData.minions,
                    allAvailable: plugin.agentManager?.minionLoader?.getAllMinions() || [],
                    enabledKey: 'minion_enabled',
                    enabledValue: formData.minion_enabled,
                    enabledLabel: 'Auto-prep',
                    enabledDesc: 'Minion zbiera kontekst na starcie sesji',
                    detailView: 'minion-detail',
                    detailParam: 'minionName',
                    showRole: true,
                });
            } else {
                _renderDelegateGrid(subContent, {
                    type: 'master',
                    items: formData.masters,
                    allAvailable: plugin.agentManager?.masterLoader?.getAllMasters() || [],
                    enabledKey: 'master_enabled',
                    enabledValue: formData.master_enabled,
                    enabledLabel: 'Master aktywny',
                    enabledDesc: 'Włącz delegację w górę (master_task)',
                    detailView: 'master-detail',
                    detailParam: 'masterName',
                    showRole: false,
                });
            }
        }

        minionSubTab.addEventListener('click', () => {
            activeEkipaSubTab = 'minions';
            subTabBar.querySelectorAll('.cs-profile-tab').forEach(t => t.classList.remove('cs-profile-tab--active'));
            minionSubTab.classList.add('cs-profile-tab--active');
            renderSubContent();
        });
        masterSubTab.addEventListener('click', () => {
            activeEkipaSubTab = 'masters';
            subTabBar.querySelectorAll('.cs-profile-tab').forEach(t => t.classList.remove('cs-profile-tab--active'));
            masterSubTab.classList.add('cs-profile-tab--active');
            renderSubContent();
        });

        renderSubContent();
    }

    // ── Delegate grid (shard layout — same style as skills/MCP) ──
    function _renderDelegateGrid(el, opts) {
        const { type, items, allAvailable, enabledKey, enabledValue,
            enabledLabel, enabledDesc, detailView, detailParam, showRole } = opts;
        const delegateIcon = type === 'master' ? () => UiIcons.crown(24) : () => UiIcons.robot(24);
        const typeName = type === 'minion' ? 'minionów' : 'masterów';

        if (allAvailable.length === 0) {
            el.createEl('p', { text: `Brak dostępnych ${typeName}.`, cls: 'agent-profile-empty' });
            return;
        }

        const isAssigned = (name) => items.some(m => m.name === name);
        const getAssignment = (name) => items.find(m => m.name === name);

        const grid = el.createDiv({ cls: 'cs-shards cs-shards--compact' });

        for (const delegate of allAvailable) {
            const assigned = isAssigned(delegate.name);
            const assignment = getAssignment(delegate.name);
            const isInactive = assignment?.active === false;
            const hasOverrides = assignment?.overrides && (
                assignment.overrides.prompt_append || assignment.overrides.extra_tools?.length > 0
                || assignment.overrides.dt_covered_groups?.length > 0 || assignment.overrides.behavior_inject
            );

            const shard = grid.createDiv({
                cls: `cs-shard ${assigned ? (isInactive ? 'cs-shard--empty' : 'cs-shard--filled') : 'cs-shard--empty'}`
            });
            shard.style.cursor = 'pointer';
            shard.style.position = 'relative';

            // Icon
            const iconEl = shard.createDiv({ cls: 'cs-shard__icon' });
            iconEl.innerHTML = delegateIcon();

            // Name
            const nameText = delegate.name + (hasOverrides ? ' *' : '');
            shard.createDiv({ cls: 'cs-shard__main-label', text: nameText });

            // Badges (for assigned)
            if (assigned) {
                const badgeRow = shard.createDiv({ cls: 'cs-shard__badges' });
                if (showRole && assignment?.role === 'prep') {
                    badgeRow.createSpan({ text: 'PREP', cls: 'cs-badge cs-badge--prep' });
                }
                if (assignment?.default) {
                    badgeRow.createSpan({ text: 'DOMYŚLNY', cls: 'cs-badge cs-badge--default' });
                }
                if (isInactive) {
                    badgeRow.createSpan({ text: 'NIEAKTYWNY', cls: 'cs-badge cs-badge--inactive' });
                }
            }

            // Description
            if (delegate.description) {
                shard.createDiv({ cls: 'cs-shard__sub-label', text: delegate.description });
            }

            // Click = toggle assign/unassign
            shard.addEventListener('click', () => {
                if (assigned) {
                    const idx = items.findIndex(m => m.name === delegate.name);
                    if (idx >= 0) items.splice(idx, 1);
                } else {
                    items.push({ name: delegate.name, ...(items.length === 0 ? { default: true } : {}) });
                }
                renderActiveTab();
            });

            // Edit overrides button (only for assigned)
            if (assigned) {
                const editBtn = shard.createEl('button', { cls: 'clickable-icon cs-shard__action' });
                editBtn.innerHTML = UiIcons.edit(12);
                editBtn.title = 'Nadpisania per-agent';
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    _showDelegateOverrideForm(el, delegate, assignment, type, showRole, () => renderActiveTab());
                });
            }

            // Detail link
            const detailBtn = shard.createEl('button', { cls: 'clickable-icon cs-shard__detail' });
            detailBtn.innerHTML = UiIcons.search(12);
            detailBtn.title = 'Szczegóły';
            detailBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                nav.push(detailView, { [detailParam]: delegate.name }, formData.name || 'Nowy agent');
            });
        }

        // Global enable toggle
        new Setting(el)
            .setName(enabledLabel)
            .setDesc(enabledDesc)
            .addToggle(toggle => {
                toggle
                    .setValue(enabledValue)
                    .onChange(v => formData[enabledKey] = v);
            });
    }

    /**
     * Inline override form for a delegate (minion/master) — shown below grid.
     * Same pattern as _showSkillOverrideForm.
     */
    function _showDelegateOverrideForm(container, delegate, assignment, type, showRole, onDone) {
        // Remove any existing form
        container.querySelector('.delegate-override-form')?.remove();

        if (!assignment.overrides) assignment.overrides = {};
        const ovr = assignment.overrides;

        const form = container.createDiv({ cls: 'delegate-override-form cs-skill-override' });

        const ovrHeader = form.createEl('h5');
        ovrHeader.innerHTML = (type === 'master' ? UiIcons.crown(14) : UiIcons.robot(14))
            + ` Nadpisania: ${delegate.name}`;
        form.createEl('p', {
            text: 'Zmiany dotyczą TYLKO tego agenta. Oryginalna definicja pozostaje niezmieniona.',
            cls: 'setting-item-description'
        });

        // ── Status toggles ──
        new Setting(form)
            .setName('Domyślny')
            .setDesc(`Używany domyślnie do ${type === 'minion' ? 'delegacji w dół' : 'konsultacji w górę'}`)
            .addToggle(toggle => {
                toggle.setValue(assignment.default || false)
                    .onChange(v => {
                        if (v) {
                            const list = type === 'minion' ? formData.minions : formData.masters;
                            list.forEach(it => it.default = false);
                            assignment.default = true;
                        } else {
                            assignment.default = false;
                        }
                    });
            });

        if (showRole) {
            new Setting(form)
                .setName('Rola: Prep')
                .setDesc('Minion zbierający kontekst na starcie sesji')
                .addToggle(toggle => {
                    toggle.setValue(assignment.role === 'prep')
                        .onChange(v => {
                            if (v) {
                                formData.minions.forEach(it => { if (it.role === 'prep') delete it.role; });
                                assignment.role = 'prep';
                            } else {
                                delete assignment.role;
                            }
                        });
                });
        }

        new Setting(form)
            .setName('Aktywny')
            .setDesc('Dezaktywowany delegate pozostaje przypisany ale nie jest używany')
            .addToggle(toggle => {
                toggle.setValue(assignment.active !== false)
                    .onChange(v => {
                        if (v) { delete assignment.active; }
                        else { assignment.active = false; }
                    });
            });

        // ── Prompt append ──
        new Setting(form)
            .setName('Dodatkowe instrukcje')
            .setDesc('Tekst dołączony do promptu delegate')
            .addTextArea(text => {
                text.setPlaceholder('np. Szukaj głównie w PKM/Mentoring/')
                    .setValue(ovr.prompt_append || '')
                    .onChange(v => {
                        if (v.trim()) { ovr.prompt_append = v.trim(); }
                        else { delete ovr.prompt_append; }
                    });
                text.inputEl.rows = 3;
                text.inputEl.style.width = '100%';
            });

        // ── Behavior inject ──
        new Setting(form)
            .setName('Dodatkowe zachowanie')
            .setDesc('Tekst dodawany do sekcji Zachowanie gdy delegate aktywny')
            .addTextArea(text => {
                text.setPlaceholder('np. Zawsze deleguj przeszukiwanie vaultu do tego miniona.')
                    .setValue(ovr.behavior_inject || '')
                    .onChange(v => {
                        if (v.trim()) { ovr.behavior_inject = v.trim(); }
                        else { delete ovr.behavior_inject; }
                    });
                text.inputEl.rows = 2;
                text.inputEl.style.width = '100%';
            });

        // ── Extra tools ──
        if (delegate?.tools) {
            if (!ovr.extra_tools) ovr.extra_tools = [];
            const toolsHeader = form.createEl('h6');
            toolsHeader.innerHTML = UiIcons.wrench(12) + ' Dodatkowe narzędzia';

            const toolGrid = form.createDiv({ cls: 'cs-delegate-overrides__tools-grid' });
            const baseTools = delegate.tools || [];
            const allToolNames = Object.keys(TOOL_INFO || {});
            const extraTools = allToolNames.filter(t => !baseTools.includes(t));

            for (const toolName of extraTools.slice(0, 12)) {
                const info = TOOL_INFO?.[toolName];
                const isChecked = ovr.extra_tools.includes(toolName);
                const row = toolGrid.createDiv({ cls: 'cs-delegate-overrides__tool-row' });
                const cb = row.createEl('input', { type: 'checkbox' });
                cb.checked = isChecked;
                const toolLabelSpan = row.createSpan();
                toolLabelSpan.innerHTML = getToolIcon(toolName, 'currentColor', 14) + ' ' + (info?.label || toolName);
                cb.addEventListener('change', () => {
                    if (cb.checked) {
                        if (!ovr.extra_tools.includes(toolName)) ovr.extra_tools.push(toolName);
                    } else {
                        ovr.extra_tools = ovr.extra_tools.filter(t => t !== toolName);
                    }
                });
            }
        }

        // ── DT Covered Groups ──
        if (!ovr.dt_covered_groups) ovr.dt_covered_groups = [];
        const dtHeader = form.createEl('h6');
        dtHeader.innerHTML = UiIcons.info(12) + ' Pokrywa grupy w Drzewie Decyzyjnym';

        const dtGrid = form.createDiv({ cls: 'cs-dt-grid' });
        const dtGroupIds = Object.keys(DECISION_TREE_GROUPS);
        for (const gid of dtGroupIds) {
            const gdef = DECISION_TREE_GROUPS[gid];
            const isChecked = ovr.dt_covered_groups.includes(gid);
            const label = dtGrid.createEl('label');
            const cb = label.createEl('input', { type: 'checkbox' });
            cb.checked = isChecked;
            label.createSpan({ text: ` ${gdef.label}` });
            cb.addEventListener('change', () => {
                if (cb.checked) {
                    if (!ovr.dt_covered_groups.includes(gid)) ovr.dt_covered_groups.push(gid);
                } else {
                    ovr.dt_covered_groups = ovr.dt_covered_groups.filter(g => g !== gid);
                }
            });
        }

        // ── Buttons ──
        const btnRow = form.createDiv({ cls: 'skill-override-buttons cs-skill-override__buttons' });

        const clearBtn = btnRow.createEl('button', { text: 'Wyczyść nadpisania', cls: 'cs-btn--danger' });
        clearBtn.addEventListener('click', () => {
            delete assignment.overrides;
            form.remove();
            if (onDone) onDone();
        });

        const closeBtn = btnRow.createEl('button', { text: 'Zamknij', cls: 'mod-cta' });
        closeBtn.addEventListener('click', () => {
            if (ovr && Object.keys(ovr).length === 0) {
                delete assignment.overrides;
            }
            form.remove();
            if (onDone) onDone();
        });
    }

    // ─── PROMPT TAB (v2.1: per-agent prompt overrides + domain rules) ───

    function renderPromptTab(el) {
        el.createEl('p', {
            text: 'Nadpisania sekcji promptu dla tego agenta. Pusty = używa globalnego z Settings.',
            cls: 'setting-item-description'
        });

        const po = formData.prompt_overrides;

        // Agent-specific domain rules (B3)
        new Setting(el)
            .setName('Reguły specjalne agenta')
            .setDesc('Reguły domenowe wstrzykiwane do sekcji Uprawnień (np. "Grafiki w 16:9", "Pisz w 3. osobie").');

        const rulesTextarea = el.createEl('textarea', { placeholder: 'np. Grafiki zawsze w formacie 16:9\nStyl pisania: formalny, 3. osoba', cls: 'cs-prompt-textarea' });
        rulesTextarea.value = formData.agent_rules;
        rulesTextarea.addEventListener('change', () => {
            formData.agent_rules = rulesTextarea.value.trim();
        });

        // Textarea overrides (environment, minion, master, rules — NOT decision_tree)
        const overrideDefs = [
            { key: 'environment', label: 'Środowisko (B1)' },
            { key: 'minion_guide', label: 'Instrukcja Miniona (C2)' },
            { key: 'master_guide', label: 'Instrukcja Mastera (C3)' },
            { key: 'rules', label: 'Zasady (C4)' },
        ];

        el.createEl('hr');
        el.createEl('h4', { text: 'Nadpisania sekcji' });
        el.createEl('p', {
            text: 'Wpisz tekst aby nadpisać globalną sekcję TYLKO dla tego agenta. Wyczyść = globalny.',
            cls: 'setting-item-description'
        });

        for (const def of overrideDefs) {
            new Setting(el).setName(def.label);

            const textarea = el.createEl('textarea', {
                placeholder: `Pusty = globalny z Settings`,
                cls: 'cs-prompt-textarea'
            });
            textarea.value = po[def.key] || '';
            textarea.addEventListener('change', () => {
                const val = textarea.value.trim();
                if (val) {
                    po[def.key] = val;
                } else {
                    delete po[def.key];
                }
            });

            if (FACTORY_DEFAULTS[def.key]) {
                const previewBtn = el.createEl('button', {
                    text: 'Pokaż domyślny tekst',
                    cls: 'clickable-icon'
                });
                previewBtn.addClass('cs-dt-add');
                previewBtn.addEventListener('click', () => {
                    if (textarea.value.trim() === '') {
                        textarea.value = FACTORY_DEFAULTS[def.key];
                    } else {
                        new Notice('Pole nie jest puste. Wyczyść je najpierw.');
                    }
                });
            }
        }

        // ── Drzewo decyzyjne — per-agent instrukcje ──
        el.createEl('hr');
        el.createEl('h4', { text: 'Drzewo decyzyjne — per-agent' });
        el.createEl('p', {
            text: 'Nadpisz instrukcje TYLKO dla tego agenta. Pusty = globalny. Checkbox wyłączony = ukryte.',
            cls: 'setting-item-description'
        });

        if (!po.decisionTreeInstructions) po.decisionTreeInstructions = {};
        const agentDT = po.decisionTreeInstructions;

        const sortedDTGroups = Object.entries(DECISION_TREE_GROUPS)
            .sort(([, a], [, b]) => a.order - b.order);

        for (const [groupId, groupDef] of sortedDTGroups) {
            el.createEl('h5', { text: groupDef.label });

            const groupInstructions = DECISION_TREE_DEFAULTS.filter(d => d.group === groupId);

            for (const instr of groupInstructions) {
                const agentVal = agentDT[instr.id];
                const isDisabled = agentVal === false;
                const hasOverride = typeof agentVal === 'string';

                const row = el.createDiv({ cls: 'cs-dt-row' });

                const cb = row.createEl('input', { type: 'checkbox' });
                cb.checked = !isDisabled;

                const input = row.createEl('input', { type: 'text', cls: 'cs-dt-input' });
                input.value = hasOverride ? agentVal : '';
                input.placeholder = instr.text;
                input.disabled = isDisabled;

                if (instr.tool) {
                    row.createEl('span', { text: instr.tool, cls: 'cs-dt-badge' });
                }

                const clearBtn = row.createEl('button', { text: '↺', cls: 'clickable-icon cs-dt-clear' });
                clearBtn.title = 'Wyczyść (użyj globalny)';

                cb.addEventListener('change', () => {
                    if (cb.checked) {
                        if (agentDT[instr.id] === false) delete agentDT[instr.id];
                        input.disabled = false;
                    } else {
                        agentDT[instr.id] = false;
                        input.disabled = true;
                    }
                });

                input.addEventListener('change', () => {
                    const val = input.value.trim();
                    if (val) {
                        agentDT[instr.id] = val;
                    } else {
                        delete agentDT[instr.id];
                    }
                });

                clearBtn.addEventListener('click', () => {
                    input.value = '';
                    delete agentDT[instr.id];
                    cb.checked = true;
                    input.disabled = false;
                });
            }

            // Custom per-agent instructions
            const customKeys = Object.keys(agentDT).filter(k =>
                k.startsWith('custom_') && typeof agentDT[k] === 'object' && agentDT[k]?.group === groupId
            );
            for (const key of customKeys) {
                const custom = agentDT[key];
                const row = el.createDiv({ cls: 'cs-dt-row' });

                const cb = row.createEl('input', { type: 'checkbox' });
                cb.checked = true;

                const input = row.createEl('input', { type: 'text', cls: 'cs-dt-input' });
                input.value = custom.text;

                const delBtn = row.createEl('button', { cls: 'clickable-icon cs-dt-clear cs-btn--danger' });
                delBtn.innerHTML = SVG_X;
                delBtn.title = 'Usuń';

                input.addEventListener('change', () => {
                    custom.text = input.value.trim();
                });

                delBtn.addEventListener('click', () => {
                    delete agentDT[key];
                    row.remove();
                });
            }

            const addBtn = el.createEl('button', { text: '+ Dodaj', cls: 'clickable-icon cs-dt-add' });
            addBtn.addEventListener('click', () => {
                const customId = `custom_${groupId}_${Date.now()}`;
                agentDT[customId] = { group: groupId, text: 'Nowa instrukcja', tool: null };
                renderActiveTab(); // re-render
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
            icon: UiIcons.brain(14),
            title: 'Brain (pamięć długoterminowa)',
            path: `.pkm-assistant/agents/${safeName}/memory/brain.md`,
            adapter,
            defaultOpen: false,
            showEditBtn: true,
        });

        // Playbook przeniesiony do Playbook Builder w tabie Umiejętności

        // ── 2. VAULT MAP ──
        const vaultMapPath = `.pkm-assistant/agents/${safeName}/vault_map.md`;
        await renderCollapsibleFile(el, {
            icon: UiIcons.search(14),
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
            icon: UiIcons.edit(14),
            title: 'Aktywny kontekst',
            path: `.pkm-assistant/agents/${safeName}/memory/active_context.md`,
            adapter,
            defaultOpen: false,
            showEditBtn: true,
        });

        // ── 5. AUDIT LOG ──
        await renderCollapsibleFile(el, {
            icon: UiIcons.history(14),
            title: 'Audit log (historia zmian)',
            path: `.pkm-assistant/agents/${safeName}/memory/audit.log`,
            adapter,
            defaultOpen: false,
            showEditBtn: true,
        });

        // ── 6. SESSIONS ──
        const sessionsHeaderEl = el.createEl('h4', { cls: 'cs-section-head memory-section-header' });
        sessionsHeaderEl.innerHTML = UiIcons.history(14) + ' Sesje';

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
                    const sessionNameSpan = item.createSpan();
                    sessionNameSpan.innerHTML = UiIcons.file(12) + ' ' + fileName;

                    // Copy path button
                    const copyBtn = item.createSpan({ cls: 'memory-copy-btn' });
                    copyBtn.innerHTML = UiIcons.copy(12);
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

    // ─── ADVANCED TAB (models, options, stats, delete) ───

    async function renderAdvancedTab(el) {
        if (!agent) return;

        // Models section
        const headModels = el.createDiv({ cls: 'cs-section-head' });
        headModels.innerHTML = UiIcons.settings(14);
        headModels.createSpan({ text: 'Modele' });

        const modelsGrid = el.createDiv({ cls: 'cs-shards' });
        renderShard(modelsGrid, 'Model główny', 'Puste = globalny z ustawień', formData.model || '', 'text',
            v => formData.model = v || null, { placeholder: 'np. deepseek-chat' });
        renderShard(modelsGrid, 'Model miniona', null, formData.models?.minion || '', 'text',
            v => { if (!formData.models) formData.models = {}; formData.models.minion = v || undefined; },
            { placeholder: 'Domyślny' });
        renderShard(modelsGrid, 'Model mastera', null, formData.models?.master || '', 'text',
            v => { if (!formData.models) formData.models = {}; formData.models.master = v || undefined; },
            { placeholder: 'Domyślny' });

        // Behavior tuning
        const headBehavior = el.createDiv({ cls: 'cs-section-head' });
        headBehavior.innerHTML = UiIcons.zap(14);
        headBehavior.createSpan({ text: 'Zachowanie' });

        const behaviorGrid = el.createDiv({ cls: 'cs-shards' });
        renderShard(behaviorGrid, 'Temperatura', '0 = precyzyjny, 1 = kreatywny', formData.temperature, 'slider',
            v => formData.temperature = v, { min: 0, max: 1, step: 0.1 });
        renderShard(behaviorGrid, 'Domyślny tryb pracy', 'Tryb na starcie nowego chatu', formData.default_mode || '', 'select',
            v => formData.default_mode = v,
            { options: [
                { value: '', label: '— Globalny (domyślny) —' },
                { value: 'rozmowa', label: 'Rozmowa' },
                { value: 'planowanie', label: 'Planowanie' },
                { value: 'praca', label: 'Praca' },
                { value: 'kreatywny', label: 'Kreatywny' },
            ]});

        // Stats section
        const headStats = el.createDiv({ cls: 'cs-section-head' });
        headStats.innerHTML = UiIcons.chart(14);
        headStats.createSpan({ text: 'Statystyki' });

        const stats = await agentManager.getAgentStats?.(agent.name);
        if (stats) {
            const statsGrid = el.createDiv({ cls: 'cs-shards' });
            for (const item of [
                { label: 'Minion', value: stats.minionName || '—' },
                { label: 'MCP', value: stats.hasMcp ? 'Tak' : 'Nie' },
                { label: 'Aktywność', value: stats.lastActivity ? new Date(stats.lastActivity).toLocaleString('pl-PL') : '—' }
            ]) {
                const shard = statsGrid.createDiv({ cls: `cs-shard ${item.value && item.value !== '—' ? 'cs-shard--filled' : 'cs-shard--empty'}` });
                shard.createDiv({ cls: 'cs-shard__value cs-shard__value--has', text: String(item.value) });
                shard.createDiv({ cls: 'cs-shard__main-label', text: item.label });
            }
        } else {
            el.createDiv({ cls: 'cs-shard__sub-label', text: 'Brak danych statystyk.' });
        }
    }

    // ========== FOCUS FOLDERS — WHITELIST AUTOCOMPLETE ==========

    function renderFocusFoldersSection(el) {
        const section = el.createDiv({ cls: 'cs-focus-section' });
        section.createEl('div', { text: 'Focus folders (WHITELIST)', cls: 'setting-item-name' });
        section.createEl('div', {
            text: 'Agent widzi TYLKO te foldery. Puste = cały vault.',
            cls: 'setting-item-description'
        });

        // Chip list
        const chipContainer = section.createDiv({ cls: 'cs-focus-chips' });
        renderFocusChips(chipContainer);

        // Autocomplete input row
        const inputRow = section.createDiv({ cls: 'cs-focus-input-row' });
        const input = inputRow.createEl('input', {
            type: 'text',
            placeholder: 'Wpisz nazwę folderu...',
            cls: 'cs-focus-input'
        });
        const addBtn = inputRow.createEl('button', { text: '+', cls: 'cs-focus-add-btn' });

        // Suggestions dropdown
        const dropdown = section.createDiv({ cls: 'cs-focus-dropdown' });
        dropdown.style.display = 'none';

        // Get all vault folders for autocomplete
        const allFolders = getAllVaultFolders(plugin.app);

        input.addEventListener('input', () => {
            const query = input.value.trim().toLowerCase();
            dropdown.empty();
            if (!query) { dropdown.style.display = 'none'; return; }

            const existing = formData.focus_folders.map(f =>
                typeof f === 'string' ? f : f.path
            );
            const matches = allFolders
                .filter(f => f.toLowerCase().includes(query) && !existing.includes(f))
                .slice(0, 10);

            if (matches.length === 0) {
                dropdown.style.display = 'none';
                return;
            }

            dropdown.style.display = 'block';
            for (const folder of matches) {
                const item = dropdown.createDiv({ cls: 'cs-focus-suggestion' });
                item.innerHTML = UiIcons.folder(12) + ' ' + folder;
                item.addEventListener('click', () => {
                    input.value = folder;
                    dropdown.style.display = 'none';
                    input.focus();
                });
            }
        });

        // Close dropdown on blur (delay for click)
        input.addEventListener('blur', () => {
            setTimeout(() => { dropdown.style.display = 'none'; }, 200);
        });

        // Add manually typed folder/glob
        addBtn.addEventListener('click', () => addManualFolder());
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addManualFolder();
        });

        function addManualFolder() {
            const value = input.value.trim();
            if (!value) return;
            addFocusFolder(value);
            input.value = '';
            dropdown.style.display = 'none';
        }

        function addFocusFolder(path) {
            const existing = formData.focus_folders.map(f =>
                typeof f === 'string' ? f : f.path
            );
            if (existing.includes(path)) return;
            formData.focus_folders.push({ path, access: 'readwrite' });
            renderFocusChips(chipContainer);
        }
    }

    function renderFocusChips(container) {
        container.empty();
        if (formData.focus_folders.length === 0) {
            container.createEl('span', {
                text: 'Brak ograniczeń — agent widzi cały vault',
                cls: 'cs-focus-empty'
            });
            return;
        }
        for (let i = 0; i < formData.focus_folders.length; i++) {
            const entry = formData.focus_folders[i];
            const path = typeof entry === 'string' ? entry : entry.path;
            const access = typeof entry === 'string' ? 'readwrite' : (entry.access || 'readwrite');

            const chip = container.createDiv({ cls: 'cs-focus-chip' });
            const chipNameSpan = chip.createSpan({ cls: 'cs-focus-chip__name' });
            chipNameSpan.innerHTML = UiIcons.folder(12) + ' ' + path;

            // Access toggle (read ↔ readwrite)
            const accessBtn = chip.createSpan({ cls: 'cs-focus-chip__access' });
            accessBtn.innerHTML = access === 'read'
                ? UiIcons.eye(12)
                : UiIcons.edit(12);
            accessBtn.title = access === 'read' ? 'Tylko odczyt — kliknij żeby zmienić' : 'Odczyt + zapis — kliknij żeby zmienić';
            accessBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const newAccess = access === 'read' ? 'readwrite' : 'read';
                formData.focus_folders[i] = { path, access: newAccess };
                renderFocusChips(container);
            });

            // Remove button
            const removeBtn = chip.createSpan({ text: '×', cls: 'cs-focus-chip__remove' });
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                formData.focus_folders.splice(i, 1);
                renderFocusChips(container);
            });
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
        const headerLabelSpan = headerEl.createSpan();
        headerLabelSpan.innerHTML = ' ' + icon + ' ' + title;

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
            const editBtn = contentEl.createEl('button', { cls: 'agent-profile-action-btn memory-edit-btn' });
            editBtn.innerHTML = UiIcons.edit(12) + ' Edytuj';
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
                    color: formData.color || undefined,
                    archetype: formData.archetype || 'specialist',
                    role: formData.role || undefined,
                    personality: formData.personality,
                    description: formData.description || undefined,
                    created_at: formData.createdAt || new Date().toISOString(),
                    temperature: formData.temperature,
                    focus_folders: formData.focus_folders,
                    model: formData.model || undefined,
                    skills: formData.skills,
                    enabled_tools: formData.enabled_tools.length > 0 ? formData.enabled_tools : undefined,
                    minions: formData.minions.length > 0 ? formData.minions : undefined,
                    minion_enabled: formData.minion_enabled,
                    masters: formData.masters.length > 0 ? formData.masters : undefined,
                    master_enabled: formData.master_enabled,
                    default_permissions: formData.permissions,
                    models: Object.keys(formData.models).length > 0 ? formData.models : undefined,
                    default_mode: formData.default_mode || undefined,
                    prompt_overrides: Object.keys(formData.prompt_overrides).length > 0 ? formData.prompt_overrides : undefined,
                    agent_rules: formData.agent_rules || undefined,
                    playbook_overrides: Object.keys(formData.playbook_overrides).length > 0 ? formData.playbook_overrides : undefined
                });
                // Compile playbook for new agent
                const newAgent = agentManager.getAgent(formData.name);
                if (newAgent && plugin.agentManager?.playbookManager) {
                    await plugin.agentManager.playbookManager.compilePlaybook(newAgent, plugin);
                }
                new Notice(`Agent ${formData.name} utworzony!`);
            } catch (error) {
                new Notice('Błąd tworzenia agenta: ' + error.message);
                return;
            }
        } else {
            try {
                const updates = {
                    color: formData.color,
                    archetype: formData.archetype,
                    role: formData.role,
                    personality: formData.personality,
                    description: formData.description,
                    created_at: formData.createdAt,
                    temperature: formData.temperature,
                    focus_folders: formData.focus_folders,
                    model: formData.model || null,
                    skills: formData.skills,
                    enabled_tools: formData.enabled_tools,
                    minions: formData.minions,
                    minion_enabled: formData.minion_enabled,
                    masters: formData.masters,
                    master_enabled: formData.master_enabled,
                    default_permissions: formData.permissions,
                    models: formData.models,
                    default_mode: formData.default_mode || null,
                    prompt_overrides: formData.prompt_overrides,
                    agent_rules: formData.agent_rules || '',
                    playbook_overrides: formData.playbook_overrides
                };
                if (!agent.isBuiltIn && formData.name !== agent.name) {
                    updates.name = formData.name;
                }
                await agentManager.updateAgent(agent.name, updates);
                // Recompile playbook after update
                const updatedAgent = agentManager.getAgent(formData.name);
                if (updatedAgent && plugin.agentManager?.playbookManager) {
                    await plugin.agentManager.playbookManager.compilePlaybook(updatedAgent, plugin);
                }
                new Notice(`Agent ${formData.name} zaktualizowany!`);
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
        const deleteHeader = el.createEl('h4');
        deleteHeader.innerHTML = SVG_TRASH + ' Usunąć agenta?';
        el.createEl('p', { text: `Czy na pewno chcesz usunąć agenta ${agent.name}?` });

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
                new Notice(`Agent ${agent.name} usunięty.`);
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
 * Get all vault folders (non-hidden) for autocomplete.
 * @param {import('obsidian').App} app
 * @returns {string[]} Sorted list of folder paths
 */
function getAllVaultFolders(app) {
    const folders = [];
    function traverse(folder) {
        for (const child of folder.children || []) {
            if (child.children !== undefined) { // TFolder
                if (child.name.startsWith('.')) continue;
                folders.push(child.path);
                traverse(child);
            }
        }
    }
    traverse(app.vault.getRoot());
    return folders.sort();
}

/**
 * Open a file from .pkm-assistant in an editor modal.
 */
async function openHiddenFile(app, hiddenPath, title, opts = {}) {
    try {
        const adapter = app.vault.adapter;
        const exists = await adapter.exists(hiddenPath);
        if (!exists) {
            new Notice('Plik nie istnieje: ' + hiddenPath);
            return;
        }
        const content = await adapter.read(hiddenPath);
        new HiddenFileEditorModal(app, hiddenPath, title, content, opts).open();
    } catch (e) {
        new Notice('Nie można otworzyć pliku: ' + e.message);
    }
}
