/**
 * AgentSidebar - Panel to display and switch between agents
 */
import { ItemView } from 'obsidian';
import agent_sidebar_styles from './AgentSidebar.css' with { type: 'css' };
import { openAgentCreator } from './AgentCreatorModal.js';

export const AGENT_SIDEBAR_VIEW_TYPE = 'pkm-agent-sidebar';

export class AgentSidebar extends ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
        this.unsubscribe = null;
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
            this.unsubscribe = this.plugin.agentManager.on((event, data) => {
                if (event === 'agent:switched' || event === 'agents:loaded' || event === 'agents:reloaded') {
                    this.renderSidebar();
                }
            });
        }
    }

    onClose() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }

    renderSidebar() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('agent-sidebar');

        // Header
        const header = container.createDiv({ cls: 'agent-sidebar-header' });
        header.createEl('h3', { text: '🤖 Agenci' });

        // Agent list
        const agentList = container.createDiv({ cls: 'agent-list' });

        const agentManager = this.plugin.agentManager;
        if (!agentManager) {
            agentList.createEl('p', {
                text: 'AgentManager nie jest zainicjalizowany',
                cls: 'agent-error'
            });
            return;
        }

        const agents = agentManager.getAgentListForUI();

        // Built-in agents section
        const builtInAgents = agents.filter(a => a.isBuiltIn);
        if (builtInAgents.length > 0) {
            const section = agentList.createDiv({ cls: 'agent-section' });
            section.createEl('h4', { text: 'Wbudowani' });

            for (const agent of builtInAgents) {
                this.renderAgentItem(section, agent);
            }
        }

        // Custom agents section
        const customAgents = agents.filter(a => !a.isBuiltIn);
        if (customAgents.length > 0) {
            const section = agentList.createDiv({ cls: 'agent-section' });
            section.createEl('h4', { text: 'Własni' });

            for (const agent of customAgents) {
                this.renderAgentItem(section, agent);
            }
        }

        // Footer with "Add Agent" button
        const footer = container.createDiv({ cls: 'agent-sidebar-footer' });
        const addBtn = footer.createEl('button', {
            cls: 'agent-add-button',
            text: '+ Nowy agent'
        });
        addBtn.addEventListener('click', () => {
            openAgentCreator(this.plugin, () => {
                // Refresh sidebar after creating agent
                this.renderSidebar();
            });
        });
    }

    renderAgentItem(container, agent) {
        const item = container.createDiv({
            cls: `agent-item ${agent.isActive ? 'active' : ''}`
        });

        // Agent icon/emoji
        const icon = item.createSpan({ cls: 'agent-emoji', text: agent.emoji });

        // Agent info
        const info = item.createDiv({ cls: 'agent-info' });
        info.createSpan({ cls: 'agent-name', text: agent.name });

        const roleText = this.getRoleDisplayText(agent.role);
        info.createSpan({ cls: 'agent-role', text: roleText });

        // Active indicator
        if (agent.isActive) {
            item.createSpan({ cls: 'agent-active-badge', text: '●' });
        }

        // Click to switch
        item.addEventListener('click', () => {
            if (!agent.isActive) {
                this.plugin.agentManager?.switchAgent(agent.name);
            }
        });
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
