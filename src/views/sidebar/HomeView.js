/**
 * HomeView - Main sidebar view showing agents, communicator and backstage.
 * Extracted from AgentSidebar.js with navigation support.
 */
import { openAgentDeleteModal } from '../AgentDeleteModal.js';

/**
 * Role display text mapping.
 */
const ROLE_LABELS = {
    'orchestrator': 'Orchestrator',
    'specialist': 'Specjalista',
    'meta_agent': 'Meta-agent'
};

/**
 * Render the home view (agent list + communicator + zaplecze).
 * @param {HTMLElement} container
 * @param {Object} plugin
 * @param {import('./SidebarNav.js').SidebarNav} nav
 * @param {Object} params
 */
export function renderHomeView(container, plugin, nav, params) {
    const agentManager = plugin.agentManager;
    if (!agentManager) {
        container.createEl('p', {
            text: 'AgentManager nie jest zainicjalizowany',
            cls: 'agent-error'
        });
        return;
    }

    const agents = agentManager.getAgentListForUI();

    // Header with count
    const header = container.createDiv({ cls: 'agent-sidebar-header' });
    header.createEl('h3', { text: `🤖 Agenci (${agents.length})` });

    // Agent cards
    const agentList = container.createDiv({ cls: 'agent-list' });

    if (agents.length === 0) {
        agentList.createEl('p', {
            text: 'Brak agentów',
            cls: 'agent-error'
        });
    } else {
        for (const agentInfo of agents) {
            renderAgentCard(agentList, agentInfo, plugin, nav);
        }
    }

    // Add Agent button
    const addSection = container.createDiv({ cls: 'agent-sidebar-add-section' });
    const addBtn = addSection.createEl('button', {
        cls: 'agent-add-button',
        text: '+ Nowy agent'
    });
    addBtn.addEventListener('click', () => {
        nav.push('agent-profile', { agentName: null }, 'Agenci');
    });

    // Communicator section
    renderCommunicatorSection(container, agents, plugin, nav);

    // Agora section
    renderAgoraSection(container, plugin, nav);

    // Zaplecze section
    renderZapleczeSection(container, plugin, nav);
}

/**
 * Render a single agent card.
 */
function renderAgentCard(container, agentInfo, plugin, nav) {
    const agent = plugin.agentManager.getAgent(agentInfo.name);
    if (!agent) return;

    const card = container.createDiv({
        cls: `agent-card ${agentInfo.isActive ? 'active' : ''}`
    });

    // Top row: emoji + name + active badge
    const topRow = card.createDiv({ cls: 'agent-card-header' });
    topRow.createSpan({ cls: 'agent-card-emoji', text: agentInfo.emoji });

    const nameCol = topRow.createDiv({ cls: 'agent-card-name-col' });
    nameCol.createSpan({ cls: 'agent-card-name', text: agentInfo.name });

    const roleText = ROLE_LABELS[agentInfo.role] || agentInfo.role || '';
    if (roleText) {
        nameCol.createSpan({ cls: 'agent-card-role', text: roleText });
    }

    if (agentInfo.isActive) {
        topRow.createSpan({ cls: 'agent-card-active', text: '●' });
    }

    // Action buttons (visible on hover)
    const actions = card.createDiv({ cls: 'agent-card-actions' });

    // Profile button
    const profileBtn = actions.createEl('button', {
        cls: 'agent-card-action-btn',
        attr: { 'aria-label': 'Profil' }
    });
    profileBtn.textContent = '⚙️';
    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        nav.push('agent-profile', { agentName: agent.name }, 'Agenci');
    });

    // Delete button
    const deleteBtn = actions.createEl('button', {
        cls: 'agent-card-action-btn agent-card-delete-btn',
        attr: { 'aria-label': 'Usuń' }
    });
    deleteBtn.textContent = '🗑️';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openAgentDeleteModal(plugin, agent, () => {
            nav.refresh();
        });
    });

    // Click card to switch agent
    card.addEventListener('click', () => {
        if (!agentInfo.isActive) {
            plugin.agentManager?.switchAgent(agentInfo.name);
        }
    });
}

/**
 * Render the communicator section.
 */
function renderCommunicatorSection(container, agents, plugin, nav) {
    const section = container.createDiv({ cls: 'communicator-section' });

    // Header
    const header = section.createDiv({ cls: 'communicator-section-header' });
    header.createEl('h4', { text: '💬 Komunikator' });

    const openBtn = header.createEl('button', {
        cls: 'communicator-open-btn',
        attr: { 'aria-label': 'Otwórz komunikator' }
    });
    openBtn.textContent = '↗';
    openBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        nav.push('communicator', {}, 'Agenci');
    });

    // Compact agent list with badges
    const list = section.createDiv({ cls: 'communicator-agent-list' });

    for (const agentInfo of agents) {
        const agent = plugin.agentManager.getAgent(agentInfo.name);
        if (!agent) continue;

        const row = list.createDiv({ cls: 'communicator-agent-row' });
        row.createSpan({ text: `${agentInfo.emoji} ${agentInfo.name}` });

        // Badge placeholder (updated async)
        const badge = row.createSpan({ cls: 'communicator-badge hidden' });
        badge.dataset.agent = agentInfo.name;

        row.addEventListener('click', () => {
            nav.push('communicator', { agentName: agentInfo.name }, 'Agenci');
        });
    }

    // Async update badges
    updateCommunicatorBadges(section, plugin);
}

/**
 * Async update unread count badges.
 */
async function updateCommunicatorBadges(section, plugin) {
    const komunikator = plugin.agentManager?.komunikatorManager;
    if (!komunikator) return;

    const badges = section.querySelectorAll('.communicator-badge');
    for (const badge of badges) {
        const name = badge.dataset.agent;
        if (!name) continue;
        try {
            const count = await komunikator.getUnreadCount(name);
            if (count > 0) {
                badge.textContent = String(count);
                badge.classList.remove('hidden');
            }
        } catch {}
    }
}

/**
 * Render the Agora section (shared knowledge base).
 */
function renderAgoraSection(container, plugin, nav) {
    if (!plugin.agoraManager) return;

    const section = container.createDiv({ cls: 'agora-home-section' });

    const header = section.createDiv({ cls: 'agora-home-header' });
    header.createEl('h4', { text: '🏛️ Agora' });

    const openBtn = header.createEl('button', {
        cls: 'communicator-open-btn',
        attr: { 'aria-label': 'Otwórz Agorę' }
    });
    openBtn.textContent = '↗';
    openBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        nav.push('agora', {}, 'Agora');
    });

    const items = section.createDiv({ cls: 'zaplecze-items' });

    const makeRow = (emoji, label, viewId, tabId) => {
        const row = items.createDiv({ cls: 'zaplecze-row' });
        row.createSpan({ text: `${emoji} ${label}` });
        row.addEventListener('click', () => nav.push(viewId, { tab: tabId }, 'Agora'));
    };

    makeRow('👤', 'Profil użytkownika', 'agora', 'profile');
    makeRow('📢', 'Tablica aktywności', 'agora', 'activity');
    makeRow('📋', 'Projekty współdzielone', 'agora', 'projects');
    makeRow('🗺️', 'Mapa vaulta', 'agora', 'map');
    makeRow('🔐', 'Kontrola dostępu', 'agora', 'access');

    // Quick stats (async)
    updateAgoraStats(items, plugin);
}

/**
 * Async update Agora stats on home view.
 */
async function updateAgoraStats(container, plugin) {
    const agora = plugin.agoraManager;
    if (!agora) return;

    try {
        const activities = await agora.readActivity(1);
        const projects = await agora.listProjects();
        const activeProjects = projects.filter(p => p.status === 'active');

        // Add badges
        const rows = container.querySelectorAll('.zaplecze-row');
        if (rows[1] && activities.length > 0) {
            rows[1].createSpan({ cls: 'zaplecze-count', text: `(${activities.length})` });
        }
        if (rows[2] && activeProjects.length > 0) {
            rows[2].createSpan({ cls: 'zaplecze-count', text: `(${activeProjects.length})` });
        }
    } catch { /* stats are optional */ }
}

/**
 * Render the Zaplecze (Backstage) section.
 */
function renderZapleczeSection(container, plugin, nav) {
    const section = container.createDiv({ cls: 'zaplecze-section' });

    // Header
    const header = section.createDiv({ cls: 'zaplecze-header' });
    header.createEl('h4', { text: '⚙️ Zaplecze' });

    const items = section.createDiv({ cls: 'zaplecze-items' });

    const skillCount = plugin.agentManager?.skillLoader?.getAllSkills()?.length || 0;
    const minionCount = plugin.agentManager?.minionLoader?.getAllMinions()?.length || 0;
    const toolCount = plugin.toolRegistry?.getAllTools()?.length || 0;

    const makeRow = (emoji, label, count, viewId) => {
        const row = items.createDiv({ cls: 'zaplecze-row' });
        row.createSpan({ text: `${emoji} ${label}` });
        row.createSpan({ cls: 'zaplecze-count', text: `(${count})` });
        row.addEventListener('click', () => nav.push(viewId, {}, label));
    };

    makeRow('⚡', 'Skille', skillCount, 'skills');
    makeRow('🔧', 'Narzędzia MCP', toolCount, 'tools');
    makeRow('🤖', 'Miniony', minionCount, 'minions');
}
