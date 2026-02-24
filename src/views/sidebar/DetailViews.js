/**
 * DetailViews - Skill detail and Minion detail views for sidebar.
 * Shows full information about a single skill or minion with cross-reference links.
 */
import { MarkdownRenderer } from 'obsidian';
import { HiddenFileEditorModal } from '../AgentProfileModal.js';
import { TOOL_INFO } from '../../components/ToolCallDisplay.js';

// ========== SKILL DETAIL VIEW ==========

/**
 * Render detailed view of a single skill.
 * @param {HTMLElement} container
 * @param {Object} plugin
 * @param {import('./SidebarNav.js').SidebarNav} nav
 * @param {Object} params - { skillName: string }
 */
export function renderSkillDetailView(container, plugin, nav, params) {
    const skillLoader = plugin.agentManager?.skillLoader;
    const skill = skillLoader?.getSkill(params.skillName);

    if (!skill) {
        container.createEl('h3', { text: '⚡ Skill nie znaleziony', cls: 'sidebar-section-title' });
        container.createEl('p', {
            text: `Nie znaleziono skilla: "${params.skillName}"`,
            cls: 'sidebar-empty-text'
        });
        return;
    }

    // Header
    container.createEl('h3', { text: `⚡ ${skill.name}`, cls: 'sidebar-section-title' });

    // Meta info card
    const meta = container.createDiv({ cls: 'sidebar-detail-meta' });

    if (skill.description) {
        const descRow = meta.createDiv({ cls: 'sidebar-detail-row' });
        descRow.createSpan({ cls: 'sidebar-detail-label', text: 'Opis:' });
        descRow.createSpan({ cls: 'sidebar-detail-value', text: skill.description });
    }

    if (skill.category) {
        const catRow = meta.createDiv({ cls: 'sidebar-detail-row' });
        catRow.createSpan({ cls: 'sidebar-detail-label', text: 'Kategoria:' });
        catRow.createSpan({ cls: 'sidebar-category-badge', text: skill.category });
    }

    const versionRow = meta.createDiv({ cls: 'sidebar-detail-row' });
    versionRow.createSpan({ cls: 'sidebar-detail-label', text: 'Wersja:' });
    versionRow.createSpan({ cls: 'sidebar-detail-value', text: String(skill.version || 1) });

    const statusRow = meta.createDiv({ cls: 'sidebar-detail-row' });
    statusRow.createSpan({ cls: 'sidebar-detail-label', text: 'Status:' });
    statusRow.createSpan({
        cls: `sidebar-detail-value ${skill.enabled ? 'status-active' : 'status-inactive'}`,
        text: skill.enabled ? '✅ Aktywny' : '❌ Wyłączony'
    });

    // Agents using this skill
    const agents = plugin.agentManager?.getAllAgents() || [];
    const usedBy = agents.filter(a => a.skills?.includes(skill.name));

    if (usedBy.length > 0) {
        const agentsSection = container.createDiv({ cls: 'sidebar-detail-section' });
        agentsSection.createEl('h4', { text: `👥 Agenci (${usedBy.length})`, cls: 'sidebar-detail-subtitle' });

        const agentsList = agentsSection.createDiv({ cls: 'sidebar-detail-agents' });
        for (const agent of usedBy) {
            const link = agentsList.createSpan({
                cls: 'sidebar-agent-link',
                text: `${agent.emoji} ${agent.name}`
            });
            link.addEventListener('click', (e) => {
                e.stopPropagation();
                nav.push('agent-profile', { agentName: agent.name }, skill.name);
            });
        }
    } else {
        const noAgents = container.createDiv({ cls: 'sidebar-detail-section' });
        noAgents.createEl('p', {
            text: 'Żaden agent nie używa tego skilla.',
            cls: 'sidebar-empty-text'
        });
    }

    // Prompt content
    if (skill.prompt) {
        const promptSection = container.createDiv({ cls: 'sidebar-detail-section' });
        promptSection.createEl('h4', { text: '📝 Prompt', cls: 'sidebar-detail-subtitle' });

        const promptContent = promptSection.createDiv({ cls: 'sidebar-detail-prompt' });

        // Render markdown
        try {
            MarkdownRenderer.render(
                plugin.app,
                skill.prompt,
                promptContent,
                skill.path || '',
                plugin
            );
        } catch {
            // Fallback to plain text
            promptContent.createEl('pre', { text: skill.prompt, cls: 'sidebar-detail-pre' });
        }
    }

    // Action buttons
    const actions = container.createDiv({ cls: 'sidebar-detail-actions' });

    const editBtn = actions.createEl('button', {
        text: '✏️ Edytuj plik',
        cls: 'sidebar-detail-btn'
    });
    editBtn.addEventListener('click', async () => {
        if (skill.path) {
            try {
                const content = await plugin.app.vault.adapter.read(skill.path);
                new HiddenFileEditorModal(plugin.app, skill.path, `Edytuj: ${skill.name}`, content).open();
            } catch (e) {
                console.error('[DetailViews] Error reading skill file:', e);
            }
        }
    });
}

// ========== MINION DETAIL VIEW ==========

/**
 * Render detailed view of a single minion.
 * @param {HTMLElement} container
 * @param {Object} plugin
 * @param {import('./SidebarNav.js').SidebarNav} nav
 * @param {Object} params - { minionName: string }
 */
export function renderMinionDetailView(container, plugin, nav, params) {
    const minionLoader = plugin.agentManager?.minionLoader;
    const minion = minionLoader?.getMinion(params.minionName);

    if (!minion) {
        container.createEl('h3', { text: '🤖 Minion nie znaleziony', cls: 'sidebar-section-title' });
        container.createEl('p', {
            text: `Nie znaleziono miniona: "${params.minionName}"`,
            cls: 'sidebar-empty-text'
        });
        return;
    }

    // Header
    container.createEl('h3', { text: `🤖 ${minion.name}`, cls: 'sidebar-section-title' });

    // Meta info card
    const meta = container.createDiv({ cls: 'sidebar-detail-meta' });

    if (minion.description) {
        const descRow = meta.createDiv({ cls: 'sidebar-detail-row' });
        descRow.createSpan({ cls: 'sidebar-detail-label', text: 'Opis:' });
        descRow.createSpan({ cls: 'sidebar-detail-value', text: minion.description });
    }

    const iterRow = meta.createDiv({ cls: 'sidebar-detail-row' });
    iterRow.createSpan({ cls: 'sidebar-detail-label', text: 'Max iteracji:' });
    iterRow.createSpan({ cls: 'sidebar-detail-value', text: String(minion.max_iterations || 3) });

    if (minion.model) {
        const modelRow = meta.createDiv({ cls: 'sidebar-detail-row' });
        modelRow.createSpan({ cls: 'sidebar-detail-label', text: 'Model:' });
        modelRow.createSpan({ cls: 'sidebar-detail-value', text: minion.model });
    }

    const statusRow = meta.createDiv({ cls: 'sidebar-detail-row' });
    statusRow.createSpan({ cls: 'sidebar-detail-label', text: 'Status:' });
    statusRow.createSpan({
        cls: `sidebar-detail-value ${minion.enabled ? 'status-active' : 'status-inactive'}`,
        text: minion.enabled ? '✅ Aktywny' : '❌ Wyłączony'
    });

    // Tools section
    if (minion.tools?.length > 0) {
        const toolsSection = container.createDiv({ cls: 'sidebar-detail-section' });
        toolsSection.createEl('h4', {
            text: `🔧 Narzędzia (${minion.tools.length})`,
            cls: 'sidebar-detail-subtitle'
        });

        const toolsList = toolsSection.createDiv({ cls: 'sidebar-detail-tools' });
        for (const toolName of minion.tools) {
            const info = TOOL_INFO[toolName] || { icon: '🔧', label: toolName };
            const toolCard = toolsList.createDiv({ cls: 'sidebar-tool-mini-card' });
            toolCard.createSpan({ cls: 'sidebar-tool-icon', text: info.icon });
            toolCard.createSpan({ cls: 'sidebar-tool-label', text: info.label });
            toolCard.createSpan({ cls: 'sidebar-tool-name', text: toolName });
        }
    }

    // Agents using this minion
    const agents = plugin.agentManager?.getAllAgents() || [];
    const usedBy = agents.filter(a => a.minion === minion.name);

    if (usedBy.length > 0) {
        const agentsSection = container.createDiv({ cls: 'sidebar-detail-section' });
        agentsSection.createEl('h4', { text: `👥 Agenci (${usedBy.length})`, cls: 'sidebar-detail-subtitle' });

        const agentsList = agentsSection.createDiv({ cls: 'sidebar-detail-agents' });
        for (const agent of usedBy) {
            const link = agentsList.createSpan({
                cls: 'sidebar-agent-link',
                text: `${agent.emoji} ${agent.name}`
            });
            link.addEventListener('click', (e) => {
                e.stopPropagation();
                nav.push('agent-profile', { agentName: agent.name }, minion.name);
            });
        }
    } else {
        const noAgents = container.createDiv({ cls: 'sidebar-detail-section' });
        noAgents.createEl('p', {
            text: 'Żaden agent nie używa tego miniona.',
            cls: 'sidebar-empty-text'
        });
    }

    // Prompt content
    if (minion.prompt) {
        const promptSection = container.createDiv({ cls: 'sidebar-detail-section' });
        promptSection.createEl('h4', { text: '📝 Prompt', cls: 'sidebar-detail-subtitle' });

        const promptContent = promptSection.createDiv({ cls: 'sidebar-detail-prompt' });

        try {
            MarkdownRenderer.render(
                plugin.app,
                minion.prompt,
                promptContent,
                minion.path || '',
                plugin
            );
        } catch {
            promptContent.createEl('pre', { text: minion.prompt, cls: 'sidebar-detail-pre' });
        }
    }

    // Action buttons
    const actions = container.createDiv({ cls: 'sidebar-detail-actions' });

    const editBtn = actions.createEl('button', {
        text: '✏️ Edytuj plik',
        cls: 'sidebar-detail-btn'
    });
    editBtn.addEventListener('click', async () => {
        if (minion.path) {
            try {
                const content = await plugin.app.vault.adapter.read(minion.path);
                new HiddenFileEditorModal(plugin.app, minion.path, `Edytuj: ${minion.name}`, content).open();
            } catch (e) {
                console.error('[DetailViews] Error reading minion file:', e);
            }
        }
    });
}
