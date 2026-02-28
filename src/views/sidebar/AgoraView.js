/**
 * AgoraView - Full Agora panel in sidebar.
 * Tabs: Profil, Aktywność, Projekty, Mapa, Dostęp
 * All tabs use inline forms for CRUD operations (no raw file editors).
 */
import { Modal } from 'obsidian';
import { AccessGuard } from '../../core/AccessGuard.js';
import { UiIcons } from '../../crystal-soul/UiIcons.js';
import { CrystalGenerator } from '../../crystal-soul/CrystalGenerator.js';
import { pickColor } from '../../crystal-soul/ColorPalette.js';

// ── SVG Icon Constants (via UiIcons) ──────────────────────────────────────
const SVG_CHEVRON = UiIcons.chevronDown(12);
const SVG_EDIT = UiIcons.edit(14);
const SVG_DELETE = UiIcons.x(14);
const SVG_CHECK = UiIcons.check(14);
const SVG_CANCEL = SVG_DELETE;
const SVG_ADD = UiIcons.plus(14);
const SVG_TRASH = UiIcons.trash(14);
const SVG_NOGO = UiIcons.noEntry(16);
const SVG_FOLDER = UiIcons.folder(14);
const SVG_EYE = UiIcons.eye(14);
const SVG_PENCIL = UiIcons.edit(14);

// ── Access level indicator SVGs ─────────────────────────────
const SVG_DOT_GREEN = UiIcons.dotGreen(10);
const SVG_DOT_YELLOW = UiIcons.dotYellow(10);
const SVG_DOT_RED = UiIcons.dotRed(10);

// ── Tab icon generators ─────────────────────────────────────
const SVG_TAB_PROFILE = UiIcons.user(14);
const SVG_TAB_ACTIVITY = UiIcons.chart(14);
const SVG_TAB_PROJECTS = UiIcons.clipboard(14);
const SVG_TAB_MAP = UiIcons.compass(14);
const SVG_TAB_ACCESS = UiIcons.shield(14);
const SVG_AGORA_TITLE = UiIcons.globe(18);

const TABS = [
    { id: 'profile', label: 'Profil', icon: SVG_TAB_PROFILE },
    { id: 'activity', label: 'Aktywność', icon: SVG_TAB_ACTIVITY },
    { id: 'projects', label: 'Projekty', icon: SVG_TAB_PROJECTS },
    { id: 'map', label: 'Mapa', icon: SVG_TAB_MAP },
    { id: 'access', label: 'Dostęp', icon: SVG_TAB_ACCESS }
];

/** Map display headers → AgoraManager section keys */
const PROFILE_SECTION_MAP = {
    'Kim jestem': 'kim_jestem',
    'Zainteresowania': 'zainteresowania',
    'Cele': 'cele',
    'Wartości': 'wartosci',
    'Aktualne projekty': 'projekty',
    'Wyzwania': 'wyzwania',
    'Ustalenia': 'ustalenia',
    'Sukcesy': 'sukcesy'
};

// ─────────────────────────────────────────────
// MAIN AGORA VIEW
// ─────────────────────────────────────────────

/**
 * Render the full Agora view.
 * @param {HTMLElement} container
 * @param {Object} plugin
 * @param {import('./SidebarNav.js').SidebarNav} nav
 * @param {Object} params - { tab?: string }
 */
export function renderAgoraView(container, plugin, nav, params) {
    container.classList.add('cs-root');
    const agora = plugin.agoraManager;
    if (!agora) {
        container.createEl('p', { text: 'AgoraManager nie jest zainicjalizowany.', cls: 'agent-error' });
        return;
    }

    const titleEl = container.createDiv({ cls: 'cs-section-title' });
    titleEl.innerHTML = UiIcons.globe(12) + ' Agora';
    container.createEl('p', {
        text: 'Wspólna baza wiedzy — to widzi każdy agent.',
        cls: 'agora-subtitle'
    });

    const activeTab = params.tab || 'profile';
    const tabBar = container.createDiv({ cls: 'cs-profile-tabs' });
    for (const tab of TABS) {
        const btn = tabBar.createEl('button', {
            cls: `cs-profile-tab ${tab.id === activeTab ? 'cs-profile-tab--active' : ''}`
        });
        btn.innerHTML = tab.icon + ` ${tab.label}`;
        btn.addEventListener('click', () => {
            nav.replace('agora', { tab: tab.id }, 'Agora');
        });
    }

    const content = container.createDiv({ cls: 'cs-profile-content' });
    const refresh = () => nav.replace('agora', { tab: activeTab }, 'Agora');

    switch (activeTab) {
        case 'profile': renderProfileTab(content, plugin, agora, refresh); break;
        case 'activity': renderActivityTab(content, plugin, agora, refresh); break;
        case 'projects': renderProjectsTab(content, plugin, agora, nav); break;
        case 'map': renderMapTab(content, plugin, agora, refresh); break;
        case 'access': renderAccessTab(content, plugin, agora, refresh); break;
    }
}

// ─────────────────────────────────────────────
// PROFILE TAB
// ─────────────────────────────────────────────

async function renderProfileTab(container, plugin, agora, refresh) {
    const loading = container.createEl('p', { text: 'Ładowanie profilu...', cls: 'agora-loading' });

    try {
        const profile = await agora.readProfile();
        loading.remove();

        // Parse all sections from profile
        const parsedSections = new Map();
        if (profile && profile.trim().length > 10) {
            const sections = profile.split(/^## /m).filter(s => s.trim());
            for (const sec of sections) {
                const lines = sec.split('\n');
                const header = lines[0].replace(/^#+ /, '').trim();
                const body = lines.slice(1).join('\n').trim();
                if (header !== 'Profil Użytkownika') {
                    parsedSections.set(header, body);
                }
            }
        }

        // Render each section
        for (const [displayName, sectionKey] of Object.entries(PROFILE_SECTION_MAP)) {
            const body = parsedSections.get(displayName) || '';
            const secDiv = container.createDiv({ cls: 'agora-profile-section' });
            secDiv.createEl('h4', { text: displayName, cls: 'agora-profile-header' });

            const itemsDiv = secDiv.createDiv({ cls: 'agora-profile-items' });

            // Parse bullet points (skip blockquote placeholders)
            const items = body.split('\n')
                .filter(l => l.trim() && !l.trim().startsWith('>'))
                .map(l => l.replace(/^- /, '').trim())
                .filter(Boolean);

            if (items.length === 0) {
                itemsDiv.createEl('p', { text: '(pusta)', cls: 'sidebar-empty-text agora-empty-hint' });
            }

            for (const item of items) {
                renderEditableItem(itemsDiv, item, {
                    onSave: async (newVal) => {
                        await agora.updateProfile(sectionKey, 'update', newVal, item);
                        refresh();
                    },
                    onDelete: async () => {
                        await agora.updateProfile(sectionKey, 'delete', item);
                        refresh();
                    }
                });
            }

            // Add form
            renderAddForm(secDiv, async (val) => {
                await agora.updateProfile(sectionKey, 'add', val);
                refresh();
            });
        }
    } catch (e) {
        loading.textContent = `Błąd: ${e.message}`;
    }
}

// ─────────────────────────────────────────────
// ACTIVITY TAB
// ─────────────────────────────────────────────

async function renderActivityTab(container, plugin, agora, refresh) {
    const loading = container.createEl('p', { text: 'Ładowanie aktywności...', cls: 'agora-loading' });

    try {
        const entries = await agora.readActivity(15);
        loading.remove();

        if (entries.length === 0) {
            container.createEl('p', {
                text: 'Brak wpisów aktywności.',
                cls: 'sidebar-empty-text'
            });
        } else {
            const reversed = [...entries].reverse();
            for (const entry of reversed) {
                renderActivityCard(container, entry, plugin, agora, refresh);
            }
        }

        // Add activity button
        const addSection = container.createDiv({ cls: 'agora-actions' });
        const addBtn = addSection.createEl('button', {
            text: '+ Dodaj aktywność',
            cls: 'sidebar-detail-btn'
        });
        addBtn.addEventListener('click', () => {
            new ActivityModal(plugin.app, plugin, {
                onSave: async (data) => {
                    await agora.postActivity(
                        data.agent, '',
                        data.summary, data.conclusions, data.actions
                    );
                    refresh();
                }
            }).open();
        });
    } catch (e) {
        loading.textContent = `Błąd: ${e.message}`;
    }
}

function renderActivityCard(container, entry, plugin, agora, refresh) {
    const card = container.createDiv({ cls: 'agora-activity-card' });

    const header = card.createDiv({ cls: 'agora-activity-header' });
    header.createSpan({ text: entry.agent, cls: 'agora-activity-agent' });

    const headerRight = header.createDiv({ cls: 'agora-item-actions' });
    headerRight.createSpan({ text: entry.date, cls: 'agora-activity-date' });

    // Edit button
    const editBtn = headerRight.createEl('button', {
        cls: 'agora-item-btn', attr: { title: 'Edytuj' }
    });
    editBtn.innerHTML = SVG_EDIT;
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        new ActivityModal(plugin.app, plugin, {
            entry,
            onSave: async (data) => {
                await agora.updateActivity(entry.id, data);
                refresh();
            }
        }).open();
    });

    // Delete button
    const delBtn = headerRight.createEl('button', {
        cls: 'agora-item-btn agora-item-delete', attr: { title: 'Usuń' }
    });
    delBtn.innerHTML = SVG_DELETE;
    delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await agora.deleteActivity(entry.id);
        refresh();
    });

    card.createDiv({ text: entry.summary, cls: 'agora-activity-summary' });

    if (entry.conclusions) {
        const det = card.createDiv({ cls: 'agora-activity-detail' });
        det.createSpan({ text: 'Wnioski: ', cls: 'agora-activity-label' });
        det.createSpan({ text: entry.conclusions });
    }
    if (entry.actions) {
        const det = card.createDiv({ cls: 'agora-activity-detail' });
        det.createSpan({ text: 'Akcje: ', cls: 'agora-activity-label' });
        det.createSpan({ text: entry.actions });
    }
}

// ─────────────────────────────────────────────
// ACTIVITY MODAL (add / edit)
// ─────────────────────────────────────────────

class ActivityModal extends Modal {
    constructor(app, plugin, options) {
        super(app);
        this.plugin = plugin;
        this.options = options; // { entry?, onSave }
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('agora-modal');

        const entry = this.options.entry;
        const isEdit = !!entry;

        contentEl.createEl('h3', {
            text: isEdit ? 'Edytuj aktywność' : 'Nowa aktywność',
            cls: 'agora-modal-title'
        });

        // Agent
        const agentRow = contentEl.createDiv({ cls: 'agora-modal-field' });
        agentRow.createEl('label', { text: 'Agent / Autor' });
        const agentInput = agentRow.createEl('input', {
            attr: { type: 'text', placeholder: 'np. Jaskier lub Użytkownik' }
        });
        agentInput.value = entry?.agent || 'Użytkownik';

        // Summary
        const summaryRow = contentEl.createDiv({ cls: 'agora-modal-field' });
        summaryRow.createEl('label', { text: 'Podsumowanie' });
        const summaryInput = summaryRow.createEl('textarea', {
            attr: { placeholder: 'Co się wydarzyło...', rows: 3 }
        });
        summaryInput.value = entry?.summary || '';

        // Conclusions
        const conclusionsRow = contentEl.createDiv({ cls: 'agora-modal-field' });
        conclusionsRow.createEl('label', { text: 'Wnioski' });
        const conclusionsInput = conclusionsRow.createEl('textarea', {
            attr: { placeholder: 'Kluczowe wnioski...', rows: 2 }
        });
        conclusionsInput.value = entry?.conclusions || '';

        // Actions
        const actionsRow = contentEl.createDiv({ cls: 'agora-modal-field' });
        actionsRow.createEl('label', { text: 'Akcje dla agentów' });
        const actionsInput = actionsRow.createEl('textarea', {
            attr: { placeholder: 'Zalecane akcje...', rows: 2 }
        });
        actionsInput.value = entry?.actions || '';

        // Footer
        const footer = contentEl.createDiv({ cls: 'agora-modal-footer' });
        const cancelBtn = footer.createEl('button', { text: 'Anuluj' });
        cancelBtn.addEventListener('click', () => this.close());

        const saveBtn = footer.createEl('button', { text: 'Zapisz', cls: 'mod-cta' });
        saveBtn.addEventListener('click', async () => {
            const data = {
                agent: agentInput.value.trim() || 'Użytkownik',
                emoji: '',
                date: entry?.date || new Date().toLocaleString('pl-PL'),
                summary: summaryInput.value.trim(),
                conclusions: conclusionsInput.value.trim(),
                actions: actionsInput.value.trim()
            };
            if (!data.summary) return;
            await this.options.onSave(data);
            this.close();
        });

        setTimeout(() => summaryInput.focus(), 50);
    }

    onClose() {
        this.contentEl.empty();
    }
}

// ─────────────────────────────────────────────
// PROJECTS TAB
// ─────────────────────────────────────────────

async function renderProjectsTab(container, plugin, agora, nav) {
    const loading = container.createEl('p', { text: 'Ładowanie projektów...', cls: 'agora-loading' });

    try {
        const projects = await agora.listProjects();
        loading.remove();

        if (projects.length === 0) {
            container.createEl('p', {
                text: 'Brak współdzielonych projektów.',
                cls: 'sidebar-empty-text'
            });
        }

        for (const p of projects) {
            const card = container.createDiv({ cls: 'agora-project-card' });
            const header = card.createDiv({ cls: 'agora-project-header' });
            header.createSpan({ text: p.title, cls: 'agora-project-title' });

            // Status badge - clickable to cycle
            const statusCls = p.status === 'active' ? 'status-active' :
                              p.status === 'done' ? 'status-done' : 'status-paused';
            const statusBadge = header.createSpan({
                text: p.status,
                cls: `agora-project-status clickable ${statusCls}`,
                attr: { title: 'Kliknij aby zmienić status' }
            });
            statusBadge.addEventListener('click', async (e) => {
                e.stopPropagation();
                const next = p.status === 'active' ? 'paused' :
                             p.status === 'paused' ? 'done' : 'active';
                await agora.updateProjectStatus(p.slug, next);
                nav.replace('agora', { tab: 'projects' }, 'Agora');
            });

            card.createDiv({
                text: `Agenci: ${p.agents.join(', ')}`,
                cls: 'agora-project-agents'
            });

            card.addEventListener('click', () => {
                nav.push('agora-project-detail', { slug: p.slug }, 'Agora');
            });
        }

        // Create project button
        const addSection = container.createDiv({ cls: 'agora-actions' });
        const addBtn = addSection.createEl('button', {
            text: '+ Nowy projekt',
            cls: 'sidebar-detail-btn'
        });
        addBtn.addEventListener('click', () => {
            new ProjectCreateModal(plugin.app, plugin, {
                onSave: async (data) => {
                    await agora.createProject(
                        data.title, data.description, data.agents, null, 'Użytkownik'
                    );
                    nav.replace('agora', { tab: 'projects' }, 'Agora');
                }
            }).open();
        });
    } catch (e) {
        loading.textContent = `Błąd: ${e.message}`;
    }
}

// ─────────────────────────────────────────────
// PROJECT CREATE MODAL
// ─────────────────────────────────────────────

class ProjectCreateModal extends Modal {
    constructor(app, plugin, options) {
        super(app);
        this.plugin = plugin;
        this.options = options;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('agora-modal');
        contentEl.createEl('h3', { text: 'Nowy projekt', cls: 'agora-modal-title' });

        // Title
        const titleRow = contentEl.createDiv({ cls: 'agora-modal-field' });
        titleRow.createEl('label', { text: 'Tytuł' });
        const titleInput = titleRow.createEl('input', {
            attr: { type: 'text', placeholder: 'Nazwa projektu...' }
        });

        // Description
        const descRow = contentEl.createDiv({ cls: 'agora-modal-field' });
        descRow.createEl('label', { text: 'Opis' });
        const descInput = descRow.createEl('textarea', {
            attr: { placeholder: 'Opis projektu...', rows: 3 }
        });

        // Agents (checkboxes)
        const agentsRow = contentEl.createDiv({ cls: 'agora-modal-field' });
        agentsRow.createEl('label', { text: 'Agenci' });
        const allAgents = this.plugin.agentManager?.getAgentListForUI() || [];
        const checkboxes = [];
        const cbContainer = agentsRow.createDiv({ cls: 'agora-modal-checkboxes' });
        for (const a of allAgents) {
            const label = cbContainer.createEl('label', { cls: 'agora-modal-checkbox' });
            const cb = label.createEl('input', { attr: { type: 'checkbox' } });
            cb.value = a.name;
            const agentColor = pickColor(a.name);
            const agentCrystalSvg = CrystalGenerator.generate(a.name, { size: 14, color: agentColor });
            const agentCrystalSpan = document.createElement('span');
            agentCrystalSpan.className = 'cs-icon-inline';
            agentCrystalSpan.innerHTML = agentCrystalSvg;
            label.appendChild(document.createTextNode(' '));
            label.appendChild(agentCrystalSpan);
            label.appendText(` ${a.name}`);
            checkboxes.push(cb);
        }

        // Footer
        const footer = contentEl.createDiv({ cls: 'agora-modal-footer' });
        const cancelBtn = footer.createEl('button', { text: 'Anuluj' });
        cancelBtn.addEventListener('click', () => this.close());

        const saveBtn = footer.createEl('button', { text: 'Utwórz', cls: 'mod-cta' });
        saveBtn.addEventListener('click', async () => {
            const title = titleInput.value.trim();
            if (!title) return;
            const agents = checkboxes.filter(c => c.checked).map(c => c.value);
            const description = descInput.value.trim() || '';
            await this.options.onSave({ title, description, agents });
            this.close();
        });

        setTimeout(() => titleInput.focus(), 50);
    }

    onClose() {
        this.contentEl.empty();
    }
}

// ─────────────────────────────────────────────
// PROJECT DETAIL VIEW
// ─────────────────────────────────────────────

/**
 * Render a single project detail view.
 * @param {HTMLElement} container
 * @param {Object} plugin
 * @param {import('./SidebarNav.js').SidebarNav} nav
 * @param {Object} params - { slug: string }
 */
export async function renderAgoraProjectDetailView(container, plugin, nav, params) {
    const agora = plugin.agoraManager;
    if (!agora || !params.slug) {
        container.createEl('p', { text: 'Brak danych projektu.', cls: 'agent-error' });
        return;
    }

    const refresh = () => nav.replace('agora-project-detail', { slug: params.slug }, 'Agora');
    const loading = container.createEl('p', { text: 'Ładowanie projektu...', cls: 'agora-loading' });

    try {
        const project = await agora.getProject(params.slug);
        loading.remove();

        if (!project) {
            container.createEl('p', { text: `Projekt "${params.slug}" nie istnieje.`, cls: 'agent-error' });
            return;
        }

        // ── Title + Status ──
        const titleRow = container.createDiv({ cls: 'agora-project-detail-header' });
        titleRow.createEl('h3', { text: project.title, cls: 'sidebar-section-title' });

        const statusSelect = titleRow.createEl('select', { cls: 'agora-status-select' });
        for (const s of ['active', 'paused', 'done']) {
            const opt = statusSelect.createEl('option', { text: s, value: s });
            if (s === project.status) opt.selected = true;
        }
        statusSelect.addEventListener('change', async () => {
            await agora.updateProjectStatus(params.slug, statusSelect.value);
            const komunikator = plugin.agentManager?.komunikatorManager;
            if (komunikator) {
                await agora.pingAgents(params.slug, 'Użytkownik',
                    `Status projektu zmieniony na: ${statusSelect.value}`, komunikator);
            }
            refresh();
        });

        // ── Meta ──
        const meta = container.createDiv({ cls: 'sidebar-detail-meta' });
        meta.createDiv({ cls: 'sidebar-detail-row' }).innerHTML =
            `<span class="sidebar-detail-label">Autor:</span> <span class="sidebar-detail-value">${project.created_by}</span>`;
        meta.createDiv({ cls: 'sidebar-detail-row' }).innerHTML =
            `<span class="sidebar-detail-label">Data:</span> <span class="sidebar-detail-value">${project.created_at}</span>`;

        // ── Agents ──
        const agentsSection = container.createDiv({ cls: 'agora-project-section' });
        agentsSection.createEl('h4', { text: 'Agenci', cls: 'agora-profile-header' });
        const agentsBadges = agentsSection.createDiv({ cls: 'agora-agent-badges' });
        for (const a of project.agents) {
            const agentObj = plugin.agentManager?.getAgent(a);
            const badge = agentsBadges.createDiv({ cls: 'agora-agent-badge' });
            const badgeLabel = badge.createSpan();
            const agentColor = agentObj?.color ? agentObj.color : pickColor(a);
            const crystalSvg = CrystalGenerator.generate(a, { size: 14, color: agentColor });
            const crystalSpan = document.createElement('span');
            crystalSpan.className = 'cs-icon-inline';
            crystalSpan.innerHTML = crystalSvg;
            badgeLabel.appendChild(crystalSpan);
            badgeLabel.appendText(` ${a}`);

            // Remove agent button (only if more than 1 agent)
            if (project.agents.length > 1) {
                const removeBtn = badge.createEl('button', {
                    cls: 'agora-badge-remove',
                    attr: { title: `Usuń ${a} z projektu` }
                });
                removeBtn.innerHTML = SVG_DELETE;
                removeBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await agora.removeAgentFromProject(params.slug, a);
                    const komunikator = plugin.agentManager?.komunikatorManager;
                    if (komunikator) {
                        await komunikator.writeMessage('Użytkownik', a,
                            `[Agora] Usunięto z projektu: ${project.title}`,
                            `Zostałeś usunięty z projektu "${project.title}".`
                        );
                    }
                    refresh();
                });
            }
        }

        // Add agent
        const allAgents = plugin.agentManager?.getAgentListForUI() || [];
        const availableAgents = allAgents.filter(a => !project.agents.includes(a.name));
        if (availableAgents.length > 0) {
            const addAgentForm = agentsSection.createDiv({ cls: 'agora-add-form' });
            const agentSelect = addAgentForm.createEl('select', { cls: 'agora-add-input' });
            agentSelect.createEl('option', { text: 'Dodaj agenta...', value: '' });
            for (const a of availableAgents) {
                agentSelect.createEl('option', { text: a.name, value: a.name });
            }

            const notifyLabel = addAgentForm.createEl('label', { cls: 'agora-notify-label' });
            const notifyCheck = notifyLabel.createEl('input', { attr: { type: 'checkbox' } });
            notifyCheck.checked = true;
            notifyLabel.appendText(' Powiadom');

            const addAgentBtn = addAgentForm.createEl('button', { cls: 'agora-add-btn', text: '+' });
            addAgentBtn.addEventListener('click', async () => {
                const name = agentSelect.value;
                if (!name) return;
                await agora.addAgentToProject(params.slug, name);
                if (notifyCheck.checked) {
                    const komunikator = plugin.agentManager?.komunikatorManager;
                    if (komunikator) {
                        await komunikator.writeMessage('Użytkownik', name,
                            `[Agora] Dodano do projektu: ${project.title}`,
                            `Zostałeś dodany do projektu "${project.title}". Sprawdź Agorę po szczegóły.`
                        );
                    }
                }
                refresh();
            });
        }

        // ── Description ──
        const descSection = container.createDiv({ cls: 'agora-project-section' });
        const descHeader = descSection.createDiv({ cls: 'agora-section-header-row' });
        descHeader.createEl('h4', { text: 'Opis', cls: 'agora-profile-header' });

        const descEditBtn = descHeader.createEl('button', {
            cls: 'agora-item-btn', attr: { title: 'Edytuj opis' }
        });
        descEditBtn.innerHTML = SVG_EDIT;

        const descContent = descSection.createDiv({ cls: 'agora-project-desc-text' });
        descContent.textContent = project.description || '(brak opisu)';

        descEditBtn.addEventListener('click', () => {
            descContent.style.display = 'none';
            descEditBtn.style.display = 'none';

            const editArea = descSection.createDiv({ cls: 'agora-desc-edit' });
            const textarea = editArea.createEl('textarea', {
                cls: 'agora-desc-textarea',
                attr: { rows: 4 }
            });
            textarea.value = project.description || '';

            const btnRow = editArea.createDiv({ cls: 'agora-edit-buttons' });
            const saveBtn = btnRow.createEl('button', { text: 'Zapisz', cls: 'mod-cta agora-edit-save' });
            const cancelBtn = btnRow.createEl('button', { text: 'Anuluj', cls: 'agora-edit-cancel' });

            saveBtn.addEventListener('click', async () => {
                await agora.updateProjectDescription(params.slug, textarea.value.trim());
                refresh();
            });
            cancelBtn.addEventListener('click', () => {
                editArea.remove();
                descContent.style.display = '';
                descEditBtn.style.display = '';
            });

            textarea.focus();
        });

        // ── Tasks ──
        const taskSection = container.createDiv({ cls: 'agora-project-tasks' });
        taskSection.createEl('h4', { text: 'Zadania', cls: 'agora-profile-header' });

        if (project.tasks && project.tasks.length > 0) {
            project.tasks.forEach((task, idx) => {
                const taskRow = taskSection.createDiv({ cls: 'agora-task-row' });

                const checkbox = taskRow.createEl('input', {
                    attr: { type: 'checkbox' },
                    cls: 'agora-task-check'
                });
                checkbox.checked = task.done;
                checkbox.addEventListener('change', async () => {
                    if (task.done) {
                        await agora.uncompleteTask(params.slug, idx);
                    } else {
                        await agora.completeTask(params.slug, idx);
                    }
                    refresh();
                });

                taskRow.createSpan({
                    text: `@${task.assignee}: ${task.task}`,
                    cls: task.done ? 'agora-task-text done' : 'agora-task-text'
                });

                const delBtn = taskRow.createEl('button', {
                    cls: 'agora-item-btn agora-item-delete',
                    attr: { title: 'Usuń zadanie' }
                });
                delBtn.innerHTML = SVG_DELETE;
                delBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await agora.deleteTask(params.slug, idx);
                    refresh();
                });
            });

            // Progress bar
            const done = project.tasks.filter(t => t.done).length;
            const total = project.tasks.length;
            const pct = total > 0 ? Math.round(done / total * 100) : 0;
            const progressDiv = taskSection.createDiv({ cls: 'agora-progress' });
            const bar = progressDiv.createDiv({ cls: 'agora-progress-bar' });
            bar.createDiv({ cls: 'agora-progress-fill' }).style.width = `${pct}%`;
            progressDiv.createSpan({ text: `${done}/${total} (${pct}%)`, cls: 'agora-progress-text' });
        } else {
            taskSection.createEl('p', { text: '(brak zadań)', cls: 'sidebar-empty-text' });
        }

        // Add task form
        const addTaskForm = taskSection.createDiv({ cls: 'agora-add-task-form' });
        const assigneeSelect = addTaskForm.createEl('select', { cls: 'agora-task-assignee' });
        for (const a of project.agents) {
            assigneeSelect.createEl('option', { text: a, value: a });
        }
        const taskInput = addTaskForm.createEl('input', {
            cls: 'agora-add-input',
            attr: { type: 'text', placeholder: 'Nowe zadanie...' }
        });

        const notifyLabel2 = addTaskForm.createEl('label', { cls: 'agora-notify-label' });
        const notifyCheck2 = notifyLabel2.createEl('input', { attr: { type: 'checkbox' } });
        notifyCheck2.checked = true;
        notifyLabel2.appendText(' Ping');

        const addTaskBtn = addTaskForm.createEl('button', { cls: 'agora-add-btn', text: '+' });
        addTaskBtn.addEventListener('click', async () => {
            const taskText = taskInput.value.trim();
            if (!taskText) return;
            const assignee = assigneeSelect.value;
            await agora.addTask(params.slug, assignee, taskText);
            if (notifyCheck2.checked) {
                const komunikator = plugin.agentManager?.komunikatorManager;
                if (komunikator) {
                    await komunikator.writeMessage('Użytkownik', assignee,
                        `[Agora] Nowe zadanie: ${project.title}`,
                        `Nowe zadanie: ${taskText}`
                    );
                }
            }
            refresh();
        });
        taskInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addTaskBtn.click();
        });

        // ── Delete Project ──
        const dangerSection = container.createDiv({ cls: 'agora-project-danger' });
        const deleteBtn = dangerSection.createEl('button', {
            cls: 'agora-danger-btn'
        });
        const trashIconSpan = deleteBtn.createSpan({ cls: 'cs-icon-inline' });
        trashIconSpan.innerHTML = SVG_TRASH;
        deleteBtn.appendText(' Usuń projekt');
        deleteBtn.addEventListener('click', () => {
            // Confirmation step
            deleteBtn.style.display = 'none';
            const confirmRow = dangerSection.createDiv({ cls: 'agora-danger-confirm' });
            confirmRow.createSpan({ text: 'Na pewno usunąć projekt?', cls: 'agora-danger-text' });
            const yesBtn = confirmRow.createEl('button', { text: 'Tak, usuń', cls: 'agora-danger-btn' });
            const noBtn = confirmRow.createEl('button', { text: 'Anuluj', cls: 'agora-edit-cancel' });

            yesBtn.addEventListener('click', async () => {
                await agora.deleteProject(params.slug);
                nav.replace('agora', { tab: 'projects' }, 'Agora');
            });
            noBtn.addEventListener('click', () => {
                confirmRow.remove();
                deleteBtn.style.display = '';
            });
        });

    } catch (e) {
        loading.textContent = `Błąd: ${e.message}`;
    }
}

// ─────────────────────────────────────────────
// MAP TAB
// ─────────────────────────────────────────────

async function renderMapTab(container, plugin, agora, refresh) {
    const loading = container.createEl('p', { text: 'Ładowanie mapy...', cls: 'agora-loading' });

    try {
        const map = await agora.readVaultMap();
        loading.remove();

        // Zone sections that support "assign to agent" buttons
        const ZONE_HEADERS = ['Strefy systemowe', 'Strefy użytkownika', 'Strefy agentowe'];

        // Parse sections from vault map
        const sections = (map || '').split(/^## /m).filter(s => s.trim());
        for (const sec of sections) {
            const lines = sec.split('\n');
            const header = lines[0].replace(/^#+ /, '').trim();
            const body = lines.slice(1).join('\n').trim();

            if (header === 'Globalna Mapa Vaulta') continue;
            if (header === 'No-Go') continue; // Rendered separately below

            const secDiv = container.createDiv({ cls: 'agora-map-section' });
            secDiv.createEl('h4', { text: header, cls: 'agora-profile-header' });

            const itemsDiv = secDiv.createDiv({ cls: 'agora-profile-items' });

            const items = body.split('\n')
                .filter(l => l.trim() && !l.trim().startsWith('>'))
                .map(l => l.trim())
                .filter(Boolean);

            if (items.length === 0) {
                itemsDiv.createEl('p', { text: '(pusta)', cls: 'sidebar-empty-text agora-empty-hint' });
            }

            for (const item of items) {
                const cleanItem = item.replace(/^- /, '').trim();
                renderEditableItem(itemsDiv, cleanItem, {
                    onSave: async (newVal) => {
                        const newItem = item.startsWith('- ') ? `- ${newVal}` : newVal;
                        const newBody = body.replace(item, newItem);
                        await agora.updateVaultMap(header, newBody);
                        refresh();
                    },
                    onDelete: async () => {
                        const newBody = body.split('\n')
                            .filter(l => l.trim() !== item.trim())
                            .join('\n').trim();
                        await agora.updateVaultMap(header, newBody || '> (pusta sekcja)');
                        refresh();
                    }
                });
            }

            // Add form for each section (with folder autocomplete for zone sections)
            if (ZONE_HEADERS.includes(header)) {
                renderFolderAutocompleteForm(secDiv, plugin.app, [], async (val) => {
                    const line = `- ${val}`;
                    const cleanBody = body.replace(/^> .*$/gm, '').trim();
                    const newBody = cleanBody ? `${cleanBody}\n${line}` : line;
                    await agora.updateVaultMap(header, newBody);
                    refresh();
                }, 'Dodaj folder...');
            } else {
                renderAddForm(secDiv, async (val) => {
                    const line = `- ${val}`;
                    const cleanBody = body.replace(/^> .*$/gm, '').trim();
                    const newBody = cleanBody ? `${cleanBody}\n${line}` : line;
                    await agora.updateVaultMap(header, newBody);
                    refresh();
                });
            }

            // Zone-level "assign to agent" button
            if (ZONE_HEADERS.includes(header) && items.length > 0) {
                const zoneFolders = _extractZoneFolders(items);
                if (zoneFolders.length > 0) {
                    _renderZoneAssignButton(secDiv, zoneFolders, plugin, refresh);
                }
            }
        }

        // ── No-Go zone ──
        const noGoSettings = plugin.env?.settings?.obsek?.no_go_folders || [];
        const noGoDiv = container.createDiv({ cls: 'agora-map-section agora-nogo-section' });
        const noGoHeader = noGoDiv.createEl('h4', { cls: 'agora-profile-header' });
        const noGoIconSpan = noGoHeader.createSpan({ cls: 'cs-icon-inline' });
        noGoIconSpan.innerHTML = SVG_NOGO;
        noGoHeader.appendText(' No-Go (prywatne)');
        noGoDiv.createEl('p', {
            text: 'Foldery całkowicie niedostępne dla agentów i wykluczone z indeksowania.',
            cls: 'setting-item-description'
        });

        const noGoItems = noGoDiv.createDiv({ cls: 'agora-profile-items' });
        if (noGoSettings.length === 0) {
            noGoItems.createEl('p', { text: '(brak — dodaj foldery z prywatnymi danymi)', cls: 'sidebar-empty-text agora-empty-hint' });
        }
        for (let i = 0; i < noGoSettings.length; i++) {
            const folder = noGoSettings[i];
            renderEditableItem(noGoItems, folder, {
                onSave: async (newVal) => {
                    const clean = newVal.trim();
                    noGoSettings[i] = clean;
                    await _saveNoGoFolders(plugin, noGoSettings);
                    refresh();
                },
                onDelete: async () => {
                    noGoSettings.splice(i, 1);
                    await _saveNoGoFolders(plugin, noGoSettings);
                    refresh();
                }
            });
        }
        renderFolderAutocompleteForm(noGoDiv, plugin.app, noGoSettings, async (val) => {
            noGoSettings.push(val);
            await _saveNoGoFolders(plugin, noGoSettings);
            refresh();
        }, 'Dodaj folder No-Go...');

        // ── Agent WHITELIST cross-reference ──
        const agentZonesDiv = container.createDiv({ cls: 'agora-map-section' });
        const whitelistHeader = agentZonesDiv.createEl('h4', { cls: 'agora-profile-header' });
        const whitelistIconSpan = whitelistHeader.createSpan({ cls: 'cs-icon-inline' });
        whitelistIconSpan.innerHTML = SVG_FOLDER;
        whitelistHeader.appendText(' Dostęp agentów (WHITELIST)');

        const allAgents = plugin.agentManager?.getAgentListForUI() || [];
        for (const agentInfo of allAgents) {
            const agent = plugin.agentManager.getAgent(agentInfo.name);
            if (!agent) continue;

            const folders = agent.focusFolders || [];
            const agentRow = agentZonesDiv.createDiv({ cls: 'agora-agent-zone' });
            const zoneNameSpan = agentRow.createSpan({ cls: 'agora-agent-zone-name' });
            const zoneAgentColor = agent.color ? agent.color : pickColor(agentInfo.name);
            const zoneCrystal = CrystalGenerator.generate(agentInfo.name, { size: 14, color: zoneAgentColor });
            const zoneCrystalSpan = document.createElement('span');
            zoneCrystalSpan.className = 'cs-icon-inline';
            zoneCrystalSpan.innerHTML = zoneCrystal;
            zoneNameSpan.appendChild(zoneCrystalSpan);
            zoneNameSpan.appendText(` ${agentInfo.name}: `);

            if (folders.length === 0) {
                agentRow.createSpan({ text: '(cały vault)', cls: 'sidebar-empty-text' });
            } else {
                const folderList = agentRow.createSpan({ cls: 'agora-agent-zone-folders' });
                for (const f of folders) {
                    const path = typeof f === 'string' ? f : f.path;
                    const access = typeof f === 'string' ? 'readwrite' : (f.access || 'readwrite');
                    const accessIconSvg = access === 'read' ? SVG_EYE : SVG_PENCIL;
                    const folderBadge = folderList.createSpan({ cls: 'agora-folder-badge' });
                    const accessIconSpan = folderBadge.createSpan({ cls: 'cs-icon-inline' });
                    accessIconSpan.innerHTML = accessIconSvg;
                    folderBadge.appendText(` ${path}`);
                }
            }

            // Add folder form with autocomplete
            const existingPaths = (agent.focusFolders || []).map(f =>
                typeof f === 'string' ? f : f.path
            );
            renderFolderAutocompleteForm(agentRow, plugin.app, existingPaths, async (val) => {
                const newFolders = [...(agent.focusFolders || []), { path: val, access: 'readwrite' }];
                await plugin.agentManager.updateAgent(agentInfo.name, { focus_folders: newFolders });
                refresh();
            }, 'Dodaj folder...');
        }
    } catch (e) {
        loading.textContent = `Błąd: ${e.message}`;
    }
}

/**
 * Extract top-level folder paths from vault map section items.
 * Parses: "- **FolderName/** — description" → "FolderName"
 * Also handles plain: "- FolderName" → "FolderName"
 */
function _extractZoneFolders(items) {
    const folders = [];
    for (const item of items) {
        // Skip indented items (subfolders)
        if (item.startsWith('  ')) continue;
        // Bold format: - **Name/** — desc
        const boldMatch = item.match(/^\*\*([^*]+)\*\*/);
        if (boldMatch) {
            folders.push(boldMatch[1].replace(/\/+$/, '').trim());
            continue;
        }
        // Plain format: just a path
        const plain = item.replace(/^- /, '').split(/\s*[—–-]\s*/)[0].trim();
        if (plain && !plain.startsWith('>') && !plain.startsWith('#')) {
            folders.push(plain.replace(/\/+$/, ''));
        }
    }
    return folders;
}

/**
 * Render "Daj agentowi dostęp do strefy" button for a zone section.
 */
function _renderZoneAssignButton(secDiv, zoneFolders, plugin, refresh) {
    const allAgents = plugin.agentManager?.getAgentListForUI() || [];
    if (allAgents.length === 0) return;

    const row = secDiv.createDiv({ cls: 'agora-zone-assign' });
    const select = row.createEl('select', { cls: 'agora-zone-select' });
    for (const a of allAgents) {
        select.createEl('option', { text: a.name, value: a.name });
    }
    const btn = row.createEl('button', { text: 'Daj dostęp do strefy', cls: 'agora-zone-assign-btn', attr: { title: 'Dodaje wszystkie foldery z tej strefy do focus folders wybranego agenta' } });
    btn.addEventListener('click', async () => {
        const agentName = select.value;
        const agent = plugin.agentManager.getAgent(agentName);
        if (!agent) return;

        const existing = (agent.focusFolders || []).map(f =>
            typeof f === 'string' ? f : f.path
        );
        const toAdd = zoneFolders.filter(f => !existing.includes(f));
        if (toAdd.length === 0) { btn.textContent = 'Już ma!'; return; }

        const newFolders = [
            ...(agent.focusFolders || []),
            ...toAdd.map(p => ({ path: p, access: 'readwrite' }))
        ];
        await plugin.agentManager.updateAgent(agentName, { focus_folders: newFolders });
        btn.textContent = `+${toAdd.length} folderów`;
        setTimeout(() => { btn.textContent = 'Daj dostęp do strefy'; }, 1500);
        refresh();
    });
}

/**
 * Save no-go folders to plugin settings.
 */
async function _saveNoGoFolders(plugin, folders) {
    if (!plugin.env?.settings?.obsek) plugin.env.settings.obsek = {};
    const cleaned = folders.filter(f => f.trim());
    plugin.env.settings.obsek.no_go_folders = cleaned;
    AccessGuard.setNoGoFolders(cleaned);
    await plugin.env.save_settings();
}

// ─────────────────────────────────────────────
// ACCESS TAB
// ─────────────────────────────────────────────

async function renderAccessTab(container, plugin, agora, refresh) {
    const loading = container.createEl('p', { text: 'Ładowanie uprawnień...', cls: 'agora-loading' });

    try {
        const agents = plugin.agentManager?.getAgentListForUI() || [];
        loading.remove();

        if (agents.length === 0) {
            container.createEl('p', { text: 'Brak agentów.', cls: 'sidebar-empty-text' });
            return;
        }

        // Level legend
        const legend = container.createDiv({ cls: 'agora-access-legend' });
        const legendAdmin = legend.createEl('div', { cls: 'agora-access-legend-item' });
        const adminDot = legendAdmin.createSpan({ cls: 'cs-icon-inline' });
        adminDot.innerHTML = SVG_DOT_GREEN;
        legendAdmin.appendText(' admin — pełny zapis (profil, mapa, aktywność, projekty)');

        const legendContrib = legend.createEl('div', { cls: 'agora-access-legend-item' });
        const contribDot = legendContrib.createSpan({ cls: 'cs-icon-inline' });
        contribDot.innerHTML = SVG_DOT_YELLOW;
        legendContrib.appendText(' contributor — zapis aktywności i projektów');

        const legendReader = legend.createEl('div', { cls: 'agora-access-legend-item' });
        const readerDot = legendReader.createSpan({ cls: 'cs-icon-inline' });
        readerDot.innerHTML = SVG_DOT_RED;
        legendReader.appendText(' reader — tylko odczyt');

        // Agent access list
        const list = container.createDiv({ cls: 'agora-access-list' });
        for (const agentInfo of agents) {
            const access = await agora.getAccess(agentInfo.name);
            const row = list.createDiv({ cls: 'agora-access-row' });

            const accessAgentSpan = row.createSpan({ cls: 'agora-access-agent' });
            const accessAgent = plugin.agentManager?.getAgent(agentInfo.name);
            const accessAgentColor = accessAgent?.color ? accessAgent.color : pickColor(agentInfo.name);
            const accessCrystal = CrystalGenerator.generate(agentInfo.name, { size: 14, color: accessAgentColor });
            const accessCrystalSpan = document.createElement('span');
            accessCrystalSpan.className = 'cs-icon-inline';
            accessCrystalSpan.innerHTML = accessCrystal;
            accessAgentSpan.appendChild(accessCrystalSpan);
            accessAgentSpan.appendText(` ${agentInfo.name}`);

            // Inline level select (option elements can only contain text, use dot prefix)
            const select = row.createEl('select', { cls: 'agora-access-select' });
            for (const level of ['admin', 'contributor', 'reader']) {
                const dot = level === 'admin' ? '\u25C9' :
                            level === 'contributor' ? '\u25CE' : '\u25CB';
                const opt = select.createEl('option', {
                    text: `${dot} ${level}`,
                    value: level
                });
                if (level === access.level) opt.selected = true;
            }
            select.addEventListener('change', async () => {
                await agora.setAccess(agentInfo.name, select.value);
                row.style.opacity = '0.5';
                setTimeout(() => { row.style.opacity = '1'; }, 300);
            });

            if (access.projects && access.projects.length > 0) {
                row.createSpan({
                    text: `projekty: ${access.projects.join(', ')}`,
                    cls: 'agora-access-projects'
                });
            }
        }
    } catch (e) {
        loading.textContent = `Błąd: ${e.message}`;
    }
}

// ─────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────

/**
 * Render an editable item row with edit/delete buttons.
 * @param {HTMLElement} container
 * @param {string} text - Display text
 * @param {Object} callbacks - { onSave: async (newVal) => void, onDelete: async () => void }
 */
function renderEditableItem(container, text, callbacks) {
    const row = container.createDiv({ cls: 'agora-item-row' });
    const textSpan = row.createSpan({ text, cls: 'agora-item-text' });

    const actions = row.createDiv({ cls: 'agora-item-actions' });

    // Edit
    const editBtn = actions.createEl('button', {
        cls: 'agora-item-btn', attr: { title: 'Edytuj' }
    });
    editBtn.innerHTML = SVG_EDIT;
    editBtn.addEventListener('click', () => {
        textSpan.style.display = 'none';
        actions.style.display = 'none';

        const editRow = row.createDiv({ cls: 'agora-edit-row' });
        const input = editRow.createEl('input', {
            cls: 'agora-inline-input',
            value: text,
            attr: { type: 'text' }
        });
        const saveBtn = editRow.createEl('button', { cls: 'agora-edit-save' });
        saveBtn.innerHTML = SVG_CHECK;
        const cancelBtn = editRow.createEl('button', { cls: 'agora-edit-cancel' });
        cancelBtn.innerHTML = SVG_CANCEL;

        const cancelEdit = () => {
            editRow.remove();
            textSpan.style.display = '';
            actions.style.display = '';
        };

        saveBtn.addEventListener('click', async () => {
            const newVal = input.value.trim();
            if (newVal && newVal !== text) {
                await callbacks.onSave(newVal);
            } else {
                cancelEdit();
            }
        });
        cancelBtn.addEventListener('click', cancelEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') saveBtn.click();
            if (e.key === 'Escape') cancelEdit();
        });
        input.focus();
    });

    // Delete
    const delBtn = actions.createEl('button', {
        cls: 'agora-item-btn agora-item-delete', attr: { title: 'Usuń' }
    });
    delBtn.innerHTML = SVG_DELETE;
    delBtn.addEventListener('click', async () => {
        await callbacks.onDelete();
    });
}

/**
 * Render an add form (input + button).
 * @param {HTMLElement} container
 * @param {Function} onAdd - async (value) => void
 * @param {string} [placeholder='Dodaj...']
 */
function renderAddForm(container, onAdd, placeholder = 'Dodaj...') {
    const form = container.createDiv({ cls: 'agora-add-form' });
    const input = form.createEl('input', {
        cls: 'agora-add-input',
        attr: { type: 'text', placeholder }
    });
    const addBtn = form.createEl('button', { cls: 'agora-add-btn', text: '+' });

    const doAdd = async () => {
        const val = input.value.trim();
        if (!val) return;
        await onAdd(val);
    };
    addBtn.addEventListener('click', doAdd);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doAdd();
    });
}

/**
 * Get all vault folders for autocomplete (recursive, skips hidden).
 * @param {App} app - Obsidian App
 * @returns {string[]} Sorted folder paths
 */
function _getAllVaultFolders(app) {
    const folders = [];
    function traverse(folder) {
        for (const child of folder.children || []) {
            if (child.children !== undefined) {
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
 * Render folder input with autocomplete dropdown.
 * @param {HTMLElement} container
 * @param {App} app - Obsidian App (for folder list)
 * @param {string[]} exclude - Existing paths to exclude from suggestions
 * @param {Function} onAdd - async (folderPath) => void
 * @param {string} [placeholder='Dodaj folder...']
 */
function renderFolderAutocompleteForm(container, app, exclude, onAdd, placeholder = 'Dodaj folder...') {
    const wrapper = container.createDiv({ cls: 'agora-add-form' });
    const inputRow = wrapper.createDiv({ cls: 'agora-autocomplete-row' });
    const input = inputRow.createEl('input', {
        cls: 'agora-add-input',
        attr: { type: 'text', placeholder }
    });
    const addBtn = inputRow.createEl('button', { cls: 'agora-add-btn', text: '+' });

    const dropdown = wrapper.createDiv({ cls: 'cs-focus-dropdown' });
    dropdown.style.display = 'none';

    const allFolders = _getAllVaultFolders(app);

    input.addEventListener('input', () => {
        const query = input.value.trim().toLowerCase();
        dropdown.empty();
        if (!query) { dropdown.style.display = 'none'; return; }

        const excludeLower = (exclude || []).map(e => (typeof e === 'string' ? e : '').toLowerCase());
        const matches = allFolders
            .filter(f => f.toLowerCase().includes(query) && !excludeLower.includes(f.toLowerCase()))
            .slice(0, 10);

        if (matches.length === 0) { dropdown.style.display = 'none'; return; }

        dropdown.style.display = 'block';
        for (const folder of matches) {
            const item = dropdown.createDiv({ cls: 'cs-focus-suggestion' });
            const folderIconSpan = item.createSpan({ cls: 'cs-icon-inline' });
            folderIconSpan.innerHTML = SVG_FOLDER;
            item.appendText(` ${folder}`);
            item.addEventListener('click', () => {
                input.value = folder;
                dropdown.style.display = 'none';
                input.focus();
            });
        }
    });

    input.addEventListener('blur', () => {
        setTimeout(() => { dropdown.style.display = 'none'; }, 200);
    });

    const doAdd = async () => {
        const val = input.value.trim();
        if (!val) return;
        await onAdd(val);
        input.value = '';
        dropdown.style.display = 'none';
    };
    addBtn.addEventListener('click', doAdd);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doAdd();
    });
}
