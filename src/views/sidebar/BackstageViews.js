/**
 * BackstageViews - Zaplecze views: Skills, MCP Tools, Minions.
 * Each is a standalone render function for SidebarNav.
 */
import { TOOL_INFO, TOOL_DESCRIPTIONS } from '../../components/ToolCallDisplay.js';

// Tool categories for grouping in ToolsView
const TOOL_CATEGORIES = [
    { label: '📁 Vault', tools: ['vault_read', 'vault_list', 'vault_write', 'vault_delete', 'vault_search'] },
    { label: '🧠 Pamięć', tools: ['memory_search', 'memory_update', 'memory_status'] },
    { label: '⚡ Skille', tools: ['skill_list', 'skill_execute'] },
    { label: '🤖 Minion / Master', tools: ['minion_task', 'master_task'] },
    { label: '💬 Agent', tools: ['agent_message', 'agent_delegate'] },
    { label: '📋 Chat', tools: ['chat_todo', 'plan_action'] },
    { label: '🏛️ Agora', tools: ['agora_read', 'agora_update', 'agora_project'] },
];

// ========== SKILLS VIEW ==========

/**
 * Render skills list view.
 */
export function renderSkillsView(container, plugin, nav, params) {
    const skillLoader = plugin.agentManager?.skillLoader;
    const allSkills = skillLoader?.getAllSkills() || [];
    const agents = plugin.agentManager?.getAllAgents() || [];

    container.createEl('h3', { text: `⚡ Skille (${allSkills.length})`, cls: 'sidebar-section-title' });

    if (allSkills.length === 0) {
        container.createEl('p', { text: 'Brak dostępnych skilli.', cls: 'sidebar-empty-text' });
        return;
    }

    const list = container.createDiv({ cls: 'sidebar-item-list' });

    for (const skill of allSkills) {
        const card = list.createDiv({ cls: 'sidebar-item-card' });

        // Top row: name + category badge
        const topRow = card.createDiv({ cls: 'sidebar-item-top' });
        topRow.createSpan({ cls: 'sidebar-item-name', text: skill.name });
        if (skill.category) {
            topRow.createSpan({ cls: 'sidebar-category-badge', text: skill.category });
        }

        // Description
        if (skill.description) {
            card.createDiv({ cls: 'sidebar-item-desc', text: skill.description });
        }

        // Agents using this skill
        const usedBy = agents.filter(a => a.skills?.includes(skill.name));
        if (usedBy.length > 0) {
            const agentsRow = card.createDiv({ cls: 'sidebar-item-agents' });
            agentsRow.createSpan({ cls: 'sidebar-item-agents-label', text: 'Agenci: ' });
            for (const agent of usedBy) {
                const link = agentsRow.createSpan({
                    cls: 'sidebar-agent-link',
                    text: `${agent.emoji} ${agent.name}`
                });
                link.addEventListener('click', (e) => {
                    e.stopPropagation();
                    nav.push('agent-profile', { agentName: agent.name }, 'Skille');
                });
            }
        }

        // Click to detail
        card.addEventListener('click', () => {
            nav.push('skill-detail', { skillName: skill.name }, 'Skille');
        });
    }
}

// ========== TOOLS VIEW ==========

/**
 * Render MCP tools browser view.
 */
export function renderToolsView(container, plugin, nav, params) {
    const allTools = plugin.toolRegistry?.getAllTools() || [];
    const agents = plugin.agentManager?.getAllAgents() || [];

    container.createEl('h3', { text: `🔧 Narzędzia MCP (${allTools.length})`, cls: 'sidebar-section-title' });

    // Helper: find which agents have access to a tool
    const getToolAgents = (toolName) => agents.filter(a => {
        if (a.permissions?.mcp === false) return false;
        if (!a.enabledTools || a.enabledTools.length === 0) return true; // all tools
        return a.enabledTools.includes(toolName);
    });

    // Render a tool card
    const renderToolCard = (group, toolName) => {
        const tool = allTools.find(t => t.name === toolName);
        if (!tool) return;

        const info = TOOL_INFO[toolName] || { icon: '🔧', label: toolName };
        const humanDesc = TOOL_DESCRIPTIONS[toolName] || '';

        const card = group.createDiv({ cls: 'sidebar-tool-card' });

        // Top row: icon + Polish label + technical name (dimmed)
        const topRow = card.createDiv({ cls: 'sidebar-tool-top' });
        topRow.createSpan({ cls: 'sidebar-tool-icon', text: info.icon });
        topRow.createSpan({ cls: 'sidebar-tool-label', text: info.label });
        topRow.createSpan({ cls: 'sidebar-tool-name-dim', text: toolName });

        // Human-readable description
        if (humanDesc) {
            card.createDiv({ cls: 'sidebar-tool-desc-human', text: humanDesc });
        }

        // Which agents use this tool (cross-reference)
        const usedBy = getToolAgents(toolName);
        if (usedBy.length > 0) {
            const agentsRow = card.createDiv({ cls: 'sidebar-tool-agents' });
            agentsRow.createSpan({ cls: 'sidebar-tool-agents-label', text: 'Agenci: ' });
            for (const agent of usedBy) {
                const link = agentsRow.createSpan({
                    cls: 'sidebar-agent-link',
                    text: `${agent.emoji} ${agent.name}`
                });
                link.addEventListener('click', (e) => {
                    e.stopPropagation();
                    nav.push('agent-profile', { agentName: agent.name }, 'Narzędzia');
                });
            }
        }
    };

    // Group tools by category
    for (const category of TOOL_CATEGORIES) {
        const categoryTools = category.tools.filter(name =>
            allTools.some(t => t.name === name)
        );
        if (categoryTools.length === 0) continue;

        const group = container.createDiv({ cls: 'sidebar-tool-group' });
        group.createEl('h4', { text: `${category.label} (${categoryTools.length})`, cls: 'sidebar-tool-group-title' });

        for (const toolName of categoryTools) {
            renderToolCard(group, toolName);
        }
    }

    // Show any tools not in our categories (custom tools)
    const categorizedTools = TOOL_CATEGORIES.flatMap(c => c.tools);
    const customTools = allTools.filter(t => !categorizedTools.includes(t.name));
    if (customTools.length > 0) {
        const group = container.createDiv({ cls: 'sidebar-tool-group' });
        group.createEl('h4', { text: `🔌 Własne (${customTools.length})`, cls: 'sidebar-tool-group-title' });

        for (const tool of customTools) {
            renderToolCard(group, tool.name);
        }
    }

    // Footer
    const footer = container.createDiv({ cls: 'sidebar-tools-footer' });
    footer.createEl('p', {
        text: '🔌 Budowanie własnych Narzędzi MCP — wkrótce.',
        cls: 'sidebar-tools-footer-text'
    });
}

// ========== MINIONS VIEW ==========

/**
 * Render minions list view.
 */
export function renderMinionsView(container, plugin, nav, params) {
    const minionLoader = plugin.agentManager?.minionLoader;
    const allMinions = minionLoader?.getAllMinions() || [];
    const agents = plugin.agentManager?.getAllAgents() || [];

    container.createEl('h3', { text: `🤖 Miniony (${allMinions.length})`, cls: 'sidebar-section-title' });

    if (allMinions.length === 0) {
        container.createEl('p', { text: 'Brak dostępnych minionów.', cls: 'sidebar-empty-text' });
        return;
    }

    const list = container.createDiv({ cls: 'sidebar-item-list' });

    for (const minion of allMinions) {
        const card = list.createDiv({ cls: 'sidebar-item-card' });

        // Name
        card.createDiv({ cls: 'sidebar-item-name', text: `🤖 ${minion.name}` });

        // Description
        if (minion.description) {
            card.createDiv({ cls: 'sidebar-item-desc', text: minion.description });
        }

        // Tools
        if (minion.tools?.length > 0) {
            const toolsRow = card.createDiv({ cls: 'sidebar-minion-tools' });
            toolsRow.createSpan({ cls: 'sidebar-item-agents-label', text: 'Narzędzia: ' });
            for (const toolName of minion.tools) {
                const info = TOOL_INFO[toolName] || { icon: '🔧', label: toolName };
                toolsRow.createSpan({ cls: 'sidebar-tool-mini-badge', text: `${info.icon} ${info.label}` });
            }
        }

        // Agents using this minion
        const usedBy = agents.filter(a => a.minion === minion.name);
        if (usedBy.length > 0) {
            const agentsRow = card.createDiv({ cls: 'sidebar-item-agents' });
            agentsRow.createSpan({ cls: 'sidebar-item-agents-label', text: 'Agenci: ' });
            for (const agent of usedBy) {
                const link = agentsRow.createSpan({
                    cls: 'sidebar-agent-link',
                    text: `${agent.emoji} ${agent.name}`
                });
                link.addEventListener('click', (e) => {
                    e.stopPropagation();
                    nav.push('agent-profile', { agentName: agent.name }, 'Miniony');
                });
            }
        }

        // Click to detail
        card.addEventListener('click', () => {
            nav.push('minion-detail', { minionName: minion.name }, 'Miniony');
        });
    }
}
