/**
 * AgentSidebar - Rich panel for managing agents
 * Shows agent cards with quick actions (profile, delete, switch)
 */
import { ItemView } from 'obsidian';
import agent_sidebar_styles from './AgentSidebar.css' with { type: 'css' };
import { openAgentProfile } from './AgentProfileModal.js';
import { openAgentDeleteModal } from './AgentDeleteModal.js';
import { openKomunikatorModal } from './KomunikatorModal.js';

export const AGENT_SIDEBAR_VIEW_TYPE = 'pkm-agent-sidebar';

export class AgentSidebar extends ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
        this.unsubscribe = null;
        this._renderTimer = null;
    }

    getViewType() {
        return AGENT_SIDEBAR_VIEW_TYPE;
    }

    getDisplayText() {
        return 'PKM Agents';
    }

    getIcon() {
        return 'users';
    }

    async onOpen() {
        this.renderSidebar();

        // Subscribe to agent changes
        if (this.plugin.agentManager) {
            this.unsubscribe = this.plugin.agentManager.on((event) => {
                if (['agent:switched', 'agents:loaded', 'agents:reloaded',
                     'agent:created', 'agent:deleted', 'agent:updated'].includes(event)) {
                    this.renderSidebar();
                }
                // Communicator events: debounce to prevent duplicate renders
                if (event === 'communicator:message_sent' || event === 'communicator:message_read') {
                    if (this._renderTimer) clearTimeout(this._renderTimer);
                    this._renderTimer = setTimeout(() => {
                        this._renderTimer = null;
                        this.renderSidebar();
                    }, 200);
                }
            });
        }
    }

    onClose() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        if (this._renderTimer) {
            clearTimeout(this._renderTimer);
        }
    }

    renderSidebar() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('agent-sidebar');

        const agentManager = this.plugin.agentManager;
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
                this.renderAgentCard(agentList, agentInfo);
            }
        }

        // Add Agent button (above communicator - agent management area)
        const addSection = container.createDiv({ cls: 'agent-sidebar-add-section' });
        const addBtn = addSection.createEl('button', {
            cls: 'agent-add-button',
            text: '+ Nowy agent'
        });
        addBtn.addEventListener('click', () => {
            openAgentProfile(this.plugin, null, () => {
                this.renderSidebar();
            });
        });

        // Komunikator section (bottom)
        this.renderCommunicatorSection(container, agents);
    }

    renderAgentCard(container, agentInfo) {
        const agent = this.plugin.agentManager.getAgent(agentInfo.name);
        if (!agent) return;

        const card = container.createDiv({
            cls: `agent-card ${agentInfo.isActive ? 'active' : ''}`
        });

        // Top row: emoji + name + active badge
        const topRow = card.createDiv({ cls: 'agent-card-header' });
        topRow.createSpan({ cls: 'agent-card-emoji', text: agentInfo.emoji });

        const nameCol = topRow.createDiv({ cls: 'agent-card-name-col' });
        nameCol.createSpan({ cls: 'agent-card-name', text: agentInfo.name });

        const roleText = this.getRoleDisplayText(agentInfo.role);
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
            openAgentProfile(this.plugin, agent, () => {
                this.renderSidebar();
            });
        });

        // Delete button
        const deleteBtn = actions.createEl('button', {
            cls: 'agent-card-action-btn agent-card-delete-btn',
            attr: { 'aria-label': 'Usuń' }
        });
        deleteBtn.textContent = '🗑️';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openAgentDeleteModal(this.plugin, agent, () => {
                this.renderSidebar();
            });
        });

        // Click card to switch agent
        card.addEventListener('click', () => {
            if (!agentInfo.isActive) {
                this.plugin.agentManager?.switchAgent(agentInfo.name);
            }
        });
    }

    renderCommunicatorSection(container, agents) {
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
            openKomunikatorModal(this.plugin);
        });

        // Compact agent list with badges
        const list = section.createDiv({ cls: 'communicator-agent-list' });

        for (const agentInfo of agents) {
            const agent = this.plugin.agentManager.getAgent(agentInfo.name);
            if (!agent) continue;

            const row = list.createDiv({ cls: 'communicator-agent-row' });
            row.createSpan({ text: `${agentInfo.emoji} ${agentInfo.name}` });

            // Badge placeholder (updated async)
            const badge = row.createSpan({ cls: 'communicator-badge hidden' });
            badge.dataset.agent = agentInfo.name;

            row.addEventListener('click', () => {
                openKomunikatorModal(this.plugin, agentInfo.name);
            });
        }

        // Async update badges
        this._updateCommunicatorBadges(section);
    }

    async _updateCommunicatorBadges(section) {
        const komunikator = this.plugin.agentManager?.komunikatorManager;
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

    getRoleDisplayText(role) {
        const roles = {
            'orchestrator': 'Orchestrator',
            'specialist': 'Specjalista',
            'meta_agent': 'Meta-agent'
        };
        return roles[role] || role || '';
    }
}

/**
 * Register the sidebar view
 * @param {Plugin} plugin
 */
export function registerAgentSidebar(plugin) {
    plugin.registerView(
        AGENT_SIDEBAR_VIEW_TYPE,
        (leaf) => new AgentSidebar(leaf, plugin)
    );
}

/**
 * Open or reveal the agent sidebar
 * @param {Plugin} plugin
 */
export async function openAgentSidebar(plugin) {
    const { workspace } = plugin.app;

    let leaf = workspace.getLeavesOfType(AGENT_SIDEBAR_VIEW_TYPE)[0];

    if (!leaf) {
        leaf = workspace.getRightLeaf(false);
        await leaf.setViewState({
            type: AGENT_SIDEBAR_VIEW_TYPE,
            active: true
        });
    }

    workspace.revealLeaf(leaf);
}
