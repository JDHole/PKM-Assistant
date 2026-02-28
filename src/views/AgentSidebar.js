/**
 * AgentSidebar - Rich panel for managing agents.
 * Thin shell: initializes SidebarNav and registers all views.
 * All rendering logic is in src/views/sidebar/ modules.
 */
import { ItemView } from 'obsidian';
import agent_sidebar_styles from './AgentSidebar.css' with { type: 'css' };
import sidebar_view_styles from './sidebar/SidebarViews.css' with { type: 'css' };
import { SidebarNav } from './sidebar/SidebarNav.js';
import { renderHomeView } from './sidebar/HomeView.js';
import { renderAgentProfileView } from './sidebar/AgentProfileView.js';
import { renderCommunicatorView } from './sidebar/CommunicatorView.js';
import { renderSkillsView, renderToolsView, renderMinionsView, renderMastersView } from './sidebar/BackstageViews.js';
import { renderSkillDetailView, renderMinionDetailView, renderMasterDetailView } from './sidebar/DetailViews.js';
import { renderAgoraView, renderAgoraProjectDetailView } from './sidebar/AgoraView.js';

export const AGENT_SIDEBAR_VIEW_TYPE = 'pkm-agent-sidebar';

export class AgentSidebar extends ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
        this.unsubscribe = null;
        this._renderTimer = null;
        this.nav = null;
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
        // Adopt CSS (fix: was imported but never applied)
        if (!document.adoptedStyleSheets.includes(agent_sidebar_styles)) {
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, agent_sidebar_styles];
        }
        if (!document.adoptedStyleSheets.includes(sidebar_view_styles)) {
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, sidebar_view_styles];
        }

        const container = this.containerEl.children[1];

        // Initialize navigation
        this.nav = new SidebarNav(container, this.plugin);
        this.nav.register('home', renderHomeView);
        this.nav.register('agent-profile', renderAgentProfileView);
        this.nav.register('communicator', renderCommunicatorView);
        this.nav.register('skills', renderSkillsView);
        this.nav.register('tools', renderToolsView);
        this.nav.register('minions', renderMinionsView);
        this.nav.register('skill-detail', renderSkillDetailView);
        this.nav.register('minion-detail', renderMinionDetailView);
        this.nav.register('masters', renderMastersView);
        this.nav.register('master-detail', renderMasterDetailView);
        this.nav.register('agora', renderAgoraView);
        this.nav.register('agora-project-detail', renderAgoraProjectDetailView);

        this.nav.push('home', {}, 'Agenci');

        // Subscribe to agent changes
        if (this.plugin.agentManager) {
            this.unsubscribe = this.plugin.agentManager.on((event) => {
                if (['agent:switched', 'agents:loaded', 'agents:reloaded',
                     'agent:created', 'agent:deleted', 'agent:updated'].includes(event)) {
                    this.nav.refresh();
                }
                // Communicator events: debounce to prevent duplicate renders
                if (event === 'communicator:message_sent' || event === 'communicator:message_read') {
                    if (this._renderTimer) clearTimeout(this._renderTimer);
                    this._renderTimer = setTimeout(() => {
                        this._renderTimer = null;
                        this.nav.refresh();
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
