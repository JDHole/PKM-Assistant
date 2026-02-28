/**
 * DetailViews - Skill detail and Minion detail views for sidebar.
 * Shows full information about a single skill or minion with cross-reference links.
 */
import { MarkdownRenderer } from 'obsidian';
import { TOOL_INFO, getToolIcon } from '../../components/ToolCallDisplay.js';
import { UiIcons } from '../../crystal-soul/UiIcons.js';

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
        const h3 = container.createEl('h3', { cls: 'sidebar-section-title' });
        h3.innerHTML = `${UiIcons.zap(16)} Skill nie znaleziony`;
        container.createEl('p', {
            text: `Nie znaleziono skilla: "${params.skillName}"`,
            cls: 'sidebar-empty-text'
        });
        return;
    }

    // Header
    const skillHeader = container.createEl('h3', { cls: 'sidebar-section-title' });
    skillHeader.innerHTML = `${skill.icon || UiIcons.zap(16)} ${skill.name}`;

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

    // Tags
    if (skill.tags?.length > 0) {
        const tagsRow = meta.createDiv({ cls: 'sidebar-detail-row' });
        tagsRow.createSpan({ cls: 'sidebar-detail-label', text: 'Tagi:' });
        const tagsVal = tagsRow.createSpan({ cls: 'sidebar-detail-value' });
        for (const tag of skill.tags) {
            tagsVal.createSpan({ cls: 'sidebar-category-badge', text: tag });
        }
    }

    const versionRow = meta.createDiv({ cls: 'sidebar-detail-row' });
    versionRow.createSpan({ cls: 'sidebar-detail-label', text: 'Wersja:' });
    versionRow.createSpan({ cls: 'sidebar-detail-value', text: String(skill.version || 1) });

    const statusRow = meta.createDiv({ cls: 'sidebar-detail-row' });
    statusRow.createSpan({ cls: 'sidebar-detail-label', text: 'Status:' });
    const statusVal = statusRow.createSpan({
        cls: `sidebar-detail-value ${skill.enabled ? 'status-active' : 'status-inactive'}`
    });
    statusVal.innerHTML = skill.enabled
        ? `${UiIcons.check(12)} Aktywny`
        : `${UiIcons.cross(12)} Wyłączony`;

    // Model override
    if (skill.model) {
        const modelRow = meta.createDiv({ cls: 'sidebar-detail-row' });
        modelRow.createSpan({ cls: 'sidebar-detail-label', text: 'Model:' });
        modelRow.createSpan({ cls: 'sidebar-detail-value', text: skill.model });
    }

    // Auto-invoke / User-invocable flags
    const flagsRow = meta.createDiv({ cls: 'sidebar-detail-row' });
    flagsRow.createSpan({ cls: 'sidebar-detail-label', text: 'Flagi:' });
    const flagsVal = flagsRow.createSpan({ cls: 'sidebar-detail-value' });
    const autoFlag = flagsVal.createSpan({ cls: 'sidebar-category-badge' });
    autoFlag.innerHTML = skill.disableModelInvocation
        ? `${UiIcons.noEntry(12)} Auto-invoke wyłączony`
        : `${UiIcons.check(12)} Auto-invoke`;
    const visFlag = flagsVal.createSpan({ cls: 'sidebar-category-badge' });
    visFlag.innerHTML = skill.userInvocable !== false
        ? `${UiIcons.eye(12)} Widoczny w UI`
        : `${UiIcons.lock(12)} Ukryty`;

    // Agents using this skill
    const agents = plugin.agentManager?.getAllAgents() || [];
    const usedBy = agents.filter(a => a.skills?.includes(skill.name));

    if (usedBy.length > 0) {
        const agentsSection = container.createDiv({ cls: 'sidebar-detail-section' });
        const agentsH4 = agentsSection.createEl('h4', { cls: 'sidebar-detail-subtitle' });
        agentsH4.innerHTML = `${UiIcons.users(14)} Agenci (${usedBy.length})`;

        const agentsList = agentsSection.createDiv({ cls: 'sidebar-detail-agents' });
        for (const agent of usedBy) {
            const link = agentsList.createSpan({
                cls: 'sidebar-agent-link',
                text: agent.name
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

    // Allowed tools
    if (skill.allowedTools?.length > 0) {
        const toolsSection = container.createDiv({ cls: 'sidebar-detail-section' });
        const toolsH4 = toolsSection.createEl('h4', { cls: 'sidebar-detail-subtitle' });
        toolsH4.innerHTML = `${UiIcons.wrench(14)} Dozwolone narzędzia (${skill.allowedTools.length})`;

        const toolsList = toolsSection.createDiv({ cls: 'sidebar-detail-tools' });
        for (const toolName of skill.allowedTools) {
            const info = TOOL_INFO[toolName] || { category: 'mixed', label: toolName };
            const toolCard = toolsList.createDiv({ cls: 'sidebar-tool-mini-card' });
            const toolIconSpan = toolCard.createSpan({ cls: 'sidebar-tool-icon' });
            toolIconSpan.innerHTML = getToolIcon(toolName, 'currentColor', 14);
            toolCard.createSpan({ cls: 'sidebar-tool-label', text: info.label });
            toolCard.createSpan({ cls: 'sidebar-tool-name', text: toolName });
        }
    }

    // Pre-questions
    if (skill.preQuestions?.length > 0) {
        const pqSection = container.createDiv({ cls: 'sidebar-detail-section' });
        const pqH4 = pqSection.createEl('h4', { cls: 'sidebar-detail-subtitle' });
        pqH4.innerHTML = `${UiIcons.question(14)} Pytania (${skill.preQuestions.length})`;

        for (const pq of skill.preQuestions) {
            const pqRow = pqSection.createDiv({ cls: 'sidebar-detail-row' });
            pqRow.createSpan({ cls: 'sidebar-detail-label', text: `{{${pq.key}}}` });
            pqRow.createSpan({ cls: 'sidebar-detail-value', text: pq.question + (pq.default ? ` (domyślnie: ${pq.default})` : '') });
        }
    }

    // Prompt content
    if (skill.prompt) {
        const promptSection = container.createDiv({ cls: 'sidebar-detail-section' });
        const promptH4 = promptSection.createEl('h4', { cls: 'sidebar-detail-subtitle' });
        promptH4.innerHTML = `${UiIcons.edit(14)} Prompt`;

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
        const minionNotFoundH3 = container.createEl('h3', { cls: 'sidebar-section-title' });
        minionNotFoundH3.innerHTML = `${UiIcons.robot(16)} Minion nie znaleziony`;
        container.createEl('p', {
            text: `Nie znaleziono miniona: "${params.minionName}"`,
            cls: 'sidebar-empty-text'
        });
        return;
    }

    // Header
    const minionH3 = container.createEl('h3', { cls: 'sidebar-section-title' });
    minionH3.innerHTML = `${UiIcons.robot(16)} ${minion.name}`;

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
    const minionStatusVal = statusRow.createSpan({
        cls: `sidebar-detail-value ${minion.enabled ? 'status-active' : 'status-inactive'}`
    });
    minionStatusVal.innerHTML = minion.enabled
        ? `${UiIcons.check(12)} Aktywny`
        : `${UiIcons.cross(12)} Wyłączony`;

    // Tools section
    if (minion.tools?.length > 0) {
        const toolsSection = container.createDiv({ cls: 'sidebar-detail-section' });
        const minionToolsH4 = toolsSection.createEl('h4', { cls: 'sidebar-detail-subtitle' });
        minionToolsH4.innerHTML = `${UiIcons.wrench(14)} Narzędzia (${minion.tools.length})`;

        const toolsList = toolsSection.createDiv({ cls: 'sidebar-detail-tools' });
        for (const toolName of minion.tools) {
            const info = TOOL_INFO[toolName] || { category: 'mixed', label: toolName };
            const toolCard = toolsList.createDiv({ cls: 'sidebar-tool-mini-card' });
            const toolIconSpan = toolCard.createSpan({ cls: 'sidebar-tool-icon' });
            toolIconSpan.innerHTML = getToolIcon(toolName, 'currentColor', 14);
            toolCard.createSpan({ cls: 'sidebar-tool-label', text: info.label });
            toolCard.createSpan({ cls: 'sidebar-tool-name', text: toolName });
        }
    }

    // Agents using this minion
    const agents = plugin.agentManager?.getAllAgents() || [];
    const usedBy = agents.filter(a => a.getMinionNames?.().includes(minion.name) || a.minion === minion.name);

    if (usedBy.length > 0) {
        const agentsSection = container.createDiv({ cls: 'sidebar-detail-section' });
        const agentsH4 = agentsSection.createEl('h4', { cls: 'sidebar-detail-subtitle' });
        agentsH4.innerHTML = `${UiIcons.users(14)} Agenci (${usedBy.length})`;

        const agentsList = agentsSection.createDiv({ cls: 'sidebar-detail-agents' });
        for (const agent of usedBy) {
            const link = agentsList.createSpan({
                cls: 'sidebar-agent-link',
                text: agent.name
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
        const promptH4 = promptSection.createEl('h4', { cls: 'sidebar-detail-subtitle' });
        promptH4.innerHTML = `${UiIcons.edit(14)} Prompt`;

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

}

// ========== MASTER DETAIL VIEW ==========

/**
 * Render detailed view of a single master.
 * @param {HTMLElement} container
 * @param {Object} plugin
 * @param {import('./SidebarNav.js').SidebarNav} nav
 * @param {Object} params - { masterName: string }
 */
export function renderMasterDetailView(container, plugin, nav, params) {
    const masterLoader = plugin.agentManager?.masterLoader;
    const master = masterLoader?.getMaster(params.masterName);

    if (!master) {
        const masterNotFoundH3 = container.createEl('h3', { cls: 'sidebar-section-title' });
        masterNotFoundH3.innerHTML = `${UiIcons.crown(16)} Master nie znaleziony`;
        container.createEl('p', {
            text: `Nie znaleziono mastera: "${params.masterName}"`,
            cls: 'sidebar-empty-text'
        });
        return;
    }

    // Header
    const masterH3 = container.createEl('h3', { cls: 'sidebar-section-title' });
    masterH3.innerHTML = `${UiIcons.crown(16)} ${master.name}`;

    // Meta info card
    const meta = container.createDiv({ cls: 'sidebar-detail-meta' });

    if (master.description) {
        const descRow = meta.createDiv({ cls: 'sidebar-detail-row' });
        descRow.createSpan({ cls: 'sidebar-detail-label', text: 'Opis:' });
        descRow.createSpan({ cls: 'sidebar-detail-value', text: master.description });
    }

    const iterRow = meta.createDiv({ cls: 'sidebar-detail-row' });
    iterRow.createSpan({ cls: 'sidebar-detail-label', text: 'Max iteracji:' });
    iterRow.createSpan({ cls: 'sidebar-detail-value', text: String(master.max_iterations || 5) });

    const minIterRow = meta.createDiv({ cls: 'sidebar-detail-row' });
    minIterRow.createSpan({ cls: 'sidebar-detail-label', text: 'Min iteracji:' });
    minIterRow.createSpan({ cls: 'sidebar-detail-value', text: String(master.min_iterations || 2) });

    if (master.model) {
        const modelRow = meta.createDiv({ cls: 'sidebar-detail-row' });
        modelRow.createSpan({ cls: 'sidebar-detail-label', text: 'Model:' });
        modelRow.createSpan({ cls: 'sidebar-detail-value', text: master.model });
    }

    const statusRow = meta.createDiv({ cls: 'sidebar-detail-row' });
    statusRow.createSpan({ cls: 'sidebar-detail-label', text: 'Status:' });
    const masterStatusVal = statusRow.createSpan({
        cls: `sidebar-detail-value ${master.enabled ? 'status-active' : 'status-inactive'}`
    });
    masterStatusVal.innerHTML = master.enabled
        ? `${UiIcons.check(12)} Aktywny`
        : `${UiIcons.cross(12)} Wyłączony`;

    // Tools section
    if (master.tools?.length > 0) {
        const toolsSection = container.createDiv({ cls: 'sidebar-detail-section' });
        const masterToolsH4 = toolsSection.createEl('h4', { cls: 'sidebar-detail-subtitle' });
        masterToolsH4.innerHTML = `${UiIcons.wrench(14)} Narzędzia (${master.tools.length})`;

        const toolsList = toolsSection.createDiv({ cls: 'sidebar-detail-tools' });
        for (const toolName of master.tools) {
            const info = TOOL_INFO[toolName] || { category: 'mixed', label: toolName };
            const toolCard = toolsList.createDiv({ cls: 'sidebar-tool-mini-card' });
            const toolIconSpan = toolCard.createSpan({ cls: 'sidebar-tool-icon' });
            toolIconSpan.innerHTML = getToolIcon(toolName, 'currentColor', 14);
            toolCard.createSpan({ cls: 'sidebar-tool-label', text: info.label });
            toolCard.createSpan({ cls: 'sidebar-tool-name', text: toolName });
        }
    }

    // Agents using this master
    const agents = plugin.agentManager?.getAllAgents() || [];
    const usedBy = agents.filter(a => a.getMasterNames?.().includes(master.name) || a.master === master.name);

    if (usedBy.length > 0) {
        const agentsSection = container.createDiv({ cls: 'sidebar-detail-section' });
        const agentsH4 = agentsSection.createEl('h4', { cls: 'sidebar-detail-subtitle' });
        agentsH4.innerHTML = `${UiIcons.users(14)} Agenci (${usedBy.length})`;

        const agentsList = agentsSection.createDiv({ cls: 'sidebar-detail-agents' });
        for (const agent of usedBy) {
            const link = agentsList.createSpan({
                cls: 'sidebar-agent-link',
                text: agent.name
            });
            link.addEventListener('click', (e) => {
                e.stopPropagation();
                nav.push('agent-profile', { agentName: agent.name }, master.name);
            });
        }
    } else {
        const noAgents = container.createDiv({ cls: 'sidebar-detail-section' });
        noAgents.createEl('p', {
            text: 'Żaden agent nie używa tego mastera.',
            cls: 'sidebar-empty-text'
        });
    }

    // Prompt content
    if (master.prompt) {
        const promptSection = container.createDiv({ cls: 'sidebar-detail-section' });
        const promptH4 = promptSection.createEl('h4', { cls: 'sidebar-detail-subtitle' });
        promptH4.innerHTML = `${UiIcons.edit(14)} Prompt`;

        const promptContent = promptSection.createDiv({ cls: 'sidebar-detail-prompt' });

        try {
            MarkdownRenderer.render(
                plugin.app,
                master.prompt,
                promptContent,
                master.path || '',
                plugin
            );
        } catch {
            promptContent.createEl('pre', { text: master.prompt, cls: 'sidebar-detail-pre' });
        }
    }

}
