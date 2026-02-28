/**
 * HomeView - Main sidebar view showing agents, communicator and backstage.
 * Crystal Soul design system — Faza 6.
 */
import { openAgentDeleteModal } from '../AgentDeleteModal.js';
import { Agent } from '../../agents/Agent.js';
import { IconGenerator } from '../../crystal-soul/IconGenerator.js';
import { CrystalGenerator } from '../../crystal-soul/CrystalGenerator.js';
import { pickColor } from '../../crystal-soul/ColorPalette.js';
import { UiIcons } from '../../crystal-soul/UiIcons.js';
import { hexToRgbTriplet } from '../../crystal-soul/SvgHelper.js';

/**
 * Role display text mapping.
 */
const ROLE_LABELS = {
    'orchestrator': 'Orchestrator',
    'specialist': 'Specjalista',
    'meta_agent': 'Meta-agent'
};

/**
 * Render the home view (agent grid + communicator + agora + zaplecze).
 * @param {HTMLElement} container
 * @param {Object} plugin
 * @param {import('./SidebarNav.js').SidebarNav} nav
 * @param {Object} params
 */
export function renderHomeView(container, plugin, nav, params) {
    container.classList.add('cs-root');
    const agentManager = plugin.agentManager;
    if (!agentManager) {
        container.createEl('p', {
            text: 'AgentManager nie jest zainicjalizowany',
            cls: 'agent-error'
        });
        return;
    }

    const agents = agentManager.getAgentListForUI();

    // ── Section: Agenci ──
    const agentTitle = container.createDiv({ cls: 'cs-section-title' });
    agentTitle.innerHTML = UiIcons.users(12) + ' Agenci';
    agentTitle.createSpan({ cls: 'cs-section-title__count', text: `(${agents.length})` });

    // Agent cards grid
    const colCount = agents.length <= 4 ? 2 : 3;
    const grid = container.createDiv({ cls: `cs-agent-grid cs-agent-grid--${colCount}col` });

    for (const agentInfo of agents) {
        renderAgentCard(grid, agentInfo, plugin, nav);
    }

    // Add agent card (dashed)
    const addCard = grid.createDiv({ cls: 'cs-agent-card cs-agent-card--add' });
    addCard.innerHTML = UiIcons.plus(16);
    addCard.addEventListener('click', () => {
        nav.push('agent-profile', { agentName: null }, 'Agenci');
    });

    // ── Section: Komunikator ──
    renderCommunicatorSection(container, agents, plugin, nav);

    // ── Section: Agora ──
    renderAgoraSection(container, plugin, nav);

    // ── Section: Zaplecze ──
    renderZapleczeSection(container, plugin, nav);
}

/**
 * Render a single agent card — Crystal Soul style.
 */
function renderAgentCard(container, agentInfo, plugin, nav) {
    const agent = plugin.agentManager.getAgent(agentInfo.name);
    if (!agent) return;

    const agentColor = agentInfo.color || pickColor(agentInfo.name).hex;
    const rgb = hexToRgbTriplet(agentColor);

    const card = container.createDiv({
        cls: `cs-agent-card ${agentInfo.isActive ? 'cs-agent-card--active' : ''}`
    });
    card.style.setProperty('--cs-agent-color-rgb', rgb);

    // Crystal avatar
    const crystalEl = card.createDiv({ cls: 'cs-agent-card__crystal' });
    crystalEl.innerHTML = CrystalGenerator.generate(agentInfo.name, { size: 32, color: agentColor, glow: false });

    // Name
    card.createDiv({ cls: 'cs-agent-card__name', text: agentInfo.name });

    // Role
    const roleText = ROLE_LABELS[agentInfo.role] || agentInfo.role || '';
    if (roleText) {
        card.createDiv({ cls: 'cs-agent-card__role', text: roleText });
    }

    // Hover action buttons
    const actions = card.createDiv({ cls: 'cs-agent-card__actions' });

    const profileBtn = actions.createEl('button', {
        cls: 'cs-agent-card__action',
        attr: { 'aria-label': 'Profil' }
    });
    profileBtn.innerHTML = UiIcons.settings(10);
    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        nav.push('agent-profile', { agentName: agent.name }, 'Agenci');
    });

    const deleteBtn = actions.createEl('button', {
        cls: 'cs-agent-card__action cs-agent-card__action--danger',
        attr: { 'aria-label': 'Usuń' }
    });
    deleteBtn.innerHTML = UiIcons.trash(10);
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
 * Render the communicator section — Crystal Soul style.
 */
function renderCommunicatorSection(container, agents, plugin, nav) {
    const section = container.createDiv({ cls: 'cs-home-section' });

    // Header
    const header = section.createDiv({ cls: 'cs-home-section__header' });
    const title = header.createDiv({ cls: 'cs-section-title' });
    title.style.padding = '0';
    title.style.margin = '0';
    title.innerHTML = UiIcons.chat(12) + ' Komunikator';

    const openBtn = header.createEl('button', {
        cls: 'cs-home-section__open',
        attr: { 'aria-label': 'Otwórz komunikator' }
    });
    openBtn.innerHTML = UiIcons.externalLink(10);
    openBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        nav.push('communicator', {}, 'Agenci');
    });

    // Agent rows with badges
    const list = section.createDiv();
    for (const agentInfo of agents) {
        const agent = plugin.agentManager.getAgent(agentInfo.name);
        if (!agent) continue;

        const agentColor = agentInfo.color || pickColor(agentInfo.name).hex;

        const row = list.createDiv({ cls: 'cs-comm-row' });
        const nameSpan = row.createDiv({ cls: 'cs-comm-row__name' });
        nameSpan.innerHTML = IconGenerator.generate(agentInfo.name, 'connect', { size: 12, color: agentColor }) + ` ${agentInfo.name}`;

        const badge = row.createSpan({ cls: 'cs-comm-row__badge hidden' });
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

    const badges = section.querySelectorAll('.cs-comm-row__badge');
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
 * Render the Agora section — Crystal Soul style.
 */
function renderAgoraSection(container, plugin, nav) {
    if (!plugin.agoraManager) return;

    const section = container.createDiv({ cls: 'cs-home-section' });

    // Header
    const header = section.createDiv({ cls: 'cs-home-section__header' });
    const title = header.createDiv({ cls: 'cs-section-title' });
    title.style.padding = '0';
    title.style.margin = '0';
    title.innerHTML = UiIcons.globe(12) + ' Agora';

    const openBtn = header.createEl('button', {
        cls: 'cs-home-section__open',
        attr: { 'aria-label': 'Otwórz Agorę' }
    });
    openBtn.innerHTML = UiIcons.externalLink(10);
    openBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        nav.push('agora', {}, 'Agora');
    });

    const items = section.createDiv();

    const agoraRows = [
        { icon: () => UiIcons.user(12), text: 'Profil użytkownika', tab: 'profile' },
        { icon: () => UiIcons.chart(12), text: 'Tablica aktywności', tab: 'activity' },
        { icon: () => UiIcons.clipboard(12), text: 'Projekty współdzielone', tab: 'projects' },
        { icon: () => UiIcons.compass(12), text: 'Mapa vaulta', tab: 'map' },
        { icon: () => UiIcons.shield(12), text: 'Kontrola dostępu', tab: 'access' },
    ];
    for (const rowData of agoraRows) {
        const row = items.createDiv({ cls: 'cs-home-row' });
        const left = row.createDiv({ cls: 'cs-home-row__left' });
        left.innerHTML = rowData.icon() + ` ${rowData.text}`;
        row.addEventListener('click', () => nav.push('agora', { tab: rowData.tab }, 'Agora'));
    }

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

        const rows = container.querySelectorAll('.cs-home-row');
        if (rows[1] && activities.length > 0) {
            rows[1].createSpan({ cls: 'cs-home-row__count', text: `(${activities.length})` });
        }
        if (rows[2] && activeProjects.length > 0) {
            rows[2].createSpan({ cls: 'cs-home-row__count', text: `(${activeProjects.length})` });
        }
    } catch { /* stats are optional */ }
}

/**
 * Render the Zaplecze (Backstage) section — Crystal Soul style.
 */
function renderZapleczeSection(container, plugin, nav) {
    const section = container.createDiv({ cls: 'cs-home-section' });

    // Header
    const title = section.createDiv({ cls: 'cs-section-title' });
    title.style.padding = '0';
    title.style.marginBottom = '8px';
    title.innerHTML = UiIcons.wrench(12) + ' Zaplecze';

    const skillCount = plugin.agentManager?.skillLoader?.getAllSkills()?.length || 0;
    const minionCount = plugin.agentManager?.minionLoader?.getAllMinions()?.length || 0;
    const masterCount = plugin.agentManager?.masterLoader?.getAllMasters()?.length || 0;
    const toolCount = plugin.toolRegistry?.getAllTools()?.length || 0;

    const items = section.createDiv();

    const zapleczeRows = [
        { icon: () => UiIcons.zap(12), text: 'Skille', count: skillCount, viewId: 'skills' },
        { icon: () => UiIcons.wrench(12), text: 'Narzędzia MCP', count: toolCount, viewId: 'tools' },
        { icon: () => UiIcons.robot(12), text: 'Miniony', count: minionCount, viewId: 'minions' },
        { icon: () => UiIcons.crown(12), text: 'Mastery', count: masterCount, viewId: 'masters' },
    ];
    for (const rowData of zapleczeRows) {
        const row = items.createDiv({ cls: 'cs-home-row' });
        const left = row.createDiv({ cls: 'cs-home-row__left' });
        left.innerHTML = rowData.icon() + ` ${rowData.text}`;
        row.createSpan({ cls: 'cs-home-row__count', text: `(${rowData.count})` });
        row.addEventListener('click', () => nav.push(rowData.viewId, {}, rowData.text));
    }
}
