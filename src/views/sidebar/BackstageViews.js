/**
 * BackstageViews - Zaplecze views: Skills, MCP Tools, Minions, Masters.
 * Crystal Soul design — Faza 6.
 */
import { TOOL_INFO, TOOL_DESCRIPTIONS, getToolIcon } from '../../components/ToolCallDisplay.js';
import { IconGenerator } from '../../crystal-soul/IconGenerator.js';
import { UiIcons } from '../../crystal-soul/UiIcons.js';
import { MinionMasterEditorModal } from '../MinionMasterEditorModal.js';
import { SkillEditorModal } from '../SkillEditorModal.js';

// Tool categories for grouping in ToolsView
const TOOL_CATEGORIES = [
    { iconFn: (s) => UiIcons.folder(s), label: 'Vault', tools: ['vault_read', 'vault_list', 'vault_write', 'vault_delete', 'vault_search'] },
    { iconFn: (s) => UiIcons.brain(s), label: 'Pamięć', tools: ['memory_search', 'memory_update', 'memory_status'] },
    { iconFn: (s) => UiIcons.zap(s), label: 'Skille', tools: ['skill_list', 'skill_execute'] },
    { iconFn: (s) => UiIcons.robot(s), label: 'Minion / Master', tools: ['minion_task', 'master_task'] },
    { iconFn: (s) => UiIcons.users(s), label: 'Agent', tools: ['agent_message', 'agent_delegate'] },
    { iconFn: (s) => UiIcons.chat(s), label: 'Chat', tools: ['chat_todo', 'plan_action'] },
    { iconFn: (s) => UiIcons.globe(s), label: 'Agora', tools: ['agora_read', 'agora_update', 'agora_project'] },
];

// ========== SHARED: Crystal filter chip bar ==========

/**
 * Render a crystal-style filter chip bar.
 */
function renderFilterBar(container, filters, activeFilters, onToggle) {
    const bar = container.createDiv({ cls: 'cs-filter-bar' });
    for (const f of filters) {
        const chip = bar.createSpan({
            cls: `cs-filter-chip ${activeFilters.has(f.value) ? 'active' : ''}`
        });
        if (f.iconFn) {
            chip.innerHTML = f.iconFn(11) + ' ' + f.label;
        } else if (f.toolName) {
            chip.innerHTML = getToolIcon(f.toolName, 'currentColor', 11) + ' ' + f.label;
        } else {
            chip.textContent = f.label;
        }
        chip.addEventListener('click', () => onToggle(f.value));
    }
    return bar;
}

/**
 * Check if agent has a minion assigned (multi-delegate compatible).
 */
function agentHasMinion(agent, minionName) {
    return agent.getMinionNames?.().includes(minionName) || agent.minion === minionName;
}

/**
 * Check if agent has a master assigned (multi-delegate compatible).
 */
function agentHasMaster(agent, masterName) {
    return agent.getMasterNames?.().includes(masterName) || agent.master === masterName;
}

/**
 * Render agent cross-references for an item.
 */
function renderAgentLinks(container, usedBy, nav, breadcrumbLabel) {
    if (usedBy.length === 0) return;
    const row = container.createDiv({ cls: 'cs-item-card__agents' });
    row.createSpan({ text: 'Agenci: ' });
    for (const agent of usedBy) {
        const link = row.createSpan({
            cls: 'cs-agent-link',
            text: agent.name
        });
        link.addEventListener('click', (e) => {
            e.stopPropagation();
            nav.push('agent-profile', { agentName: agent.name }, breadcrumbLabel);
        });
    }
}

// ========== SKILLS VIEW ==========

/**
 * Render skills list view — Crystal Soul style.
 */
export function renderSkillsView(container, plugin, nav, params) {
    container.classList.add('cs-root');
    const skillLoader = plugin.agentManager?.skillLoader;
    const allSkills = skillLoader?.getAllSkills() || [];
    const agents = plugin.agentManager?.getAllAgents() || [];

    // Title
    const title = container.createDiv({ cls: 'cs-section-title' });
    title.innerHTML = UiIcons.zap(12) + ' Skille';
    title.createSpan({ cls: 'cs-section-title__count', text: `(${allSkills.length})` });

    // Create button
    const createBtn = container.createEl('button', { cls: 'cs-create-btn' });
    createBtn.innerHTML = UiIcons.plus(11) + ' Nowy Skill';
    createBtn.addEventListener('click', () => {
        new SkillEditorModal(plugin.app, plugin, null, () => nav.refresh()).open();
    });

    if (allSkills.length === 0) {
        container.createEl('p', { text: 'Brak dostępnych skilli.', cls: 'sidebar-empty-text' });
        return;
    }

    // Search
    const searchInput = container.createEl('input', {
        type: 'text', placeholder: 'Szukaj skilla...', cls: 'cs-search-input'
    });

    // Filters
    const activeFilters = new Set();
    const categories = [...new Set(allSkills.map(s => s.category).filter(Boolean))];
    const filterDefs = [
        ...categories.map(c => ({ value: `cat:${c}`, label: c, iconFn: (s) => UiIcons.folder(s) })),
        ...agents.slice(0, 5).map(a => ({ value: `agent:${a.name}`, label: a.name }))
    ];

    const filterContainer = container.createDiv();
    const list = container.createDiv({ cls: 'cs-item-list' });

    const renderFilters = () => {
        filterContainer.empty();
        if (filterDefs.length > 0) {
            renderFilterBar(filterContainer, filterDefs, activeFilters, (val) => {
                if (activeFilters.has(val)) activeFilters.delete(val);
                else activeFilters.add(val);
                renderFilters();
                renderList(searchInput.value.toLowerCase());
            });
        }
    };

    const renderList = (filter = '') => {
        list.empty();
        let filtered = allSkills;

        if (filter) {
            filtered = filtered.filter(s =>
                s.name.toLowerCase().includes(filter) || s.description?.toLowerCase().includes(filter)
            );
        }

        for (const f of activeFilters) {
            if (f.startsWith('cat:')) {
                const cat = f.slice(4);
                filtered = filtered.filter(s => s.category === cat);
            } else if (f.startsWith('agent:')) {
                const agentName = f.slice(6);
                filtered = filtered.filter(s =>
                    agents.find(a => a.name === agentName)?.skills?.includes(s.name)
                );
            }
        }

        for (const skill of filtered) {
            const card = list.createDiv({ cls: 'cs-item-card' });

            const nameDiv = card.createDiv({ cls: 'cs-item-card__name' });
            nameDiv.innerHTML = IconGenerator.generate(skill.name, 'arcane', { size: 13, color: 'currentColor' }) + ` ${skill.name}`;

            if (skill.category) {
                const meta = card.createDiv({ cls: 'cs-item-card__meta' });
                meta.createSpan({ cls: 'cs-item-card__badge', text: skill.category });
            }

            if (skill.description) {
                card.createDiv({ cls: 'cs-item-card__desc', text: skill.description });
            }

            const usedBy = agents.filter(a => a.skills?.includes(skill.name));
            renderAgentLinks(card, usedBy, nav, 'Skille');

            card.addEventListener('click', () => {
                nav.push('skill-detail', { skillName: skill.name }, 'Skille');
            });
        }
    };

    renderFilters();
    searchInput.addEventListener('input', (e) => renderList(e.target.value.toLowerCase()));
    renderList();
}

// ========== TOOLS VIEW ==========

/**
 * Render MCP tools browser view — Crystal Soul style.
 */
export function renderToolsView(container, plugin, nav, params) {
    container.classList.add('cs-root');
    const allTools = plugin.toolRegistry?.getAllTools() || [];
    const agents = plugin.agentManager?.getAllAgents() || [];

    // Title
    const title = container.createDiv({ cls: 'cs-section-title' });
    title.innerHTML = UiIcons.wrench(12) + ' Narzędzia MCP';
    title.createSpan({ cls: 'cs-section-title__count', text: `(${allTools.length})` });

    // Search
    const searchInput = container.createEl('input', {
        type: 'text', placeholder: 'Szukaj narzędzia...', cls: 'cs-search-input'
    });

    // Filters
    const activeFilters = new Set();
    const filterDefs = [
        ...TOOL_CATEGORIES.map(c => ({ value: `group:${c.label}`, label: c.label, iconFn: c.iconFn })),
        ...agents.slice(0, 5).map(a => ({ value: `agent:${a.name}`, label: a.name }))
    ];

    const filterContainer = container.createDiv();

    // Helper: find which agents have access to a tool
    const getToolAgents = (toolName) => agents.filter(a => {
        if (a.permissions?.mcp === false) return false;
        if (!a.enabledTools || a.enabledTools.length === 0) return true;
        return a.enabledTools.includes(toolName);
    });

    const contentDiv = container.createDiv();

    const renderFilters = () => {
        filterContainer.empty();
        if (filterDefs.length > 0) {
            renderFilterBar(filterContainer, filterDefs, activeFilters, (val) => {
                if (activeFilters.has(val)) activeFilters.delete(val);
                else activeFilters.add(val);
                renderFilters();
                renderContent(searchInput.value.toLowerCase());
            });
        }
    };

    const renderContent = (filter = '') => {
        contentDiv.empty();

        let categoriesToShow = TOOL_CATEGORIES;
        const groupFilters = [...activeFilters].filter(f => f.startsWith('group:'));
        if (groupFilters.length > 0) {
            const labels = groupFilters.map(f => f.slice(6));
            categoriesToShow = TOOL_CATEGORIES.filter(c => labels.includes(c.label));
        }

        const agentFilters = [...activeFilters].filter(f => f.startsWith('agent:'));
        const filteredAgentNames = agentFilters.map(f => f.slice(6));

        const renderToolCard = (group, toolName) => {
            const tool = allTools.find(t => t.name === toolName);
            if (!tool) return;

            const info = TOOL_INFO[toolName] || { category: 'mixed', label: toolName };
            const humanDesc = TOOL_DESCRIPTIONS[toolName] || '';

            if (filter && !info.label.toLowerCase().includes(filter) && !toolName.toLowerCase().includes(filter)) return;

            if (filteredAgentNames.length > 0) {
                const toolAgents = getToolAgents(toolName);
                if (!toolAgents.some(a => filteredAgentNames.includes(a.name))) return;
            }

            const card = group.createDiv({ cls: 'cs-tool-card' });

            const topRow = card.createDiv({ cls: 'cs-tool-card__top' });
            const iconSpan = topRow.createSpan({ cls: 'cs-tool-card__icon' });
            iconSpan.innerHTML = getToolIcon(toolName, 'currentColor', 13);
            topRow.createSpan({ cls: 'cs-tool-card__label', text: info.label });
            topRow.createSpan({ cls: 'cs-tool-card__name', text: toolName });

            if (humanDesc) {
                card.createDiv({ cls: 'cs-tool-card__desc', text: humanDesc });
            }

            const usedBy = getToolAgents(toolName);
            renderAgentLinks(card, usedBy, nav, 'Narzędzia');
        };

        for (const category of categoriesToShow) {
            const categoryTools = category.tools.filter(name =>
                allTools.some(t => t.name === name)
            );
            if (categoryTools.length === 0) continue;

            const group = contentDiv.createDiv({ cls: 'cs-tool-group' });
            const groupTitle = group.createEl('h4', { cls: 'cs-tool-group__title' });
            groupTitle.innerHTML = category.iconFn(14) + ` ${category.label} (${categoryTools.length})`;

            for (const toolName of categoryTools) {
                renderToolCard(group, toolName);
            }
        }

        // Custom tools
        const categorizedTools = TOOL_CATEGORIES.flatMap(c => c.tools);
        const customTools = allTools.filter(t => !categorizedTools.includes(t.name));
        if (customTools.length > 0 && groupFilters.length === 0) {
            const group = contentDiv.createDiv({ cls: 'cs-tool-group' });
            const customTitle = group.createEl('h4', { cls: 'cs-tool-group__title' });
            customTitle.innerHTML = UiIcons.settings(14) + ` Własne (${customTools.length})`;
            for (const tool of customTools) {
                renderToolCard(group, tool.name);
            }
        }

        const footer = contentDiv.createDiv({ cls: 'cs-backstage-footer' });
        footer.innerHTML = UiIcons.settings(11) + ' Budowanie własnych Narzędzi MCP — wkrótce.';
    };

    renderFilters();
    searchInput.addEventListener('input', (e) => renderContent(e.target.value.toLowerCase()));
    renderContent();
}

// ========== MINIONS VIEW ==========

/**
 * Render minions list view — Crystal Soul style.
 */
export function renderMinionsView(container, plugin, nav, params) {
    container.classList.add('cs-root');
    const minionLoader = plugin.agentManager?.minionLoader;
    const allMinions = minionLoader?.getAllMinions() || [];
    const agents = plugin.agentManager?.getAllAgents() || [];

    // Title
    const title = container.createDiv({ cls: 'cs-section-title' });
    title.innerHTML = UiIcons.robot(12) + ' Miniony';
    title.createSpan({ cls: 'cs-section-title__count', text: `(${allMinions.length})` });

    // Create button
    const createBtn = container.createEl('button', { cls: 'cs-create-btn' });
    createBtn.innerHTML = UiIcons.plus(11) + ' Nowy Minion';
    createBtn.addEventListener('click', () => {
        new MinionMasterEditorModal(plugin.app, plugin, 'minion', null, () => nav.refresh()).open();
    });

    if (allMinions.length === 0) {
        container.createEl('p', { text: 'Brak dostępnych minionów.', cls: 'sidebar-empty-text' });
        return;
    }

    // Search
    const searchInput = container.createEl('input', {
        type: 'text', placeholder: 'Szukaj miniona...', cls: 'cs-search-input'
    });

    // Filters
    const activeFilters = new Set();
    const toolsInMinions = [...new Set(allMinions.flatMap(m => m.tools || []))];
    const filterDefs = [
        ...toolsInMinions.slice(0, 8).map(t => {
            const info = TOOL_INFO[t];
            return { value: `tool:${t}`, label: info?.label || t, toolName: t };
        }),
        ...agents.slice(0, 5).map(a => ({ value: `agent:${a.name}`, label: a.name })),
        { value: 'status:enabled', label: 'Aktywne' },
        { value: 'status:disabled', label: 'Wyłączone' }
    ];

    const filterContainer = container.createDiv();
    const list = container.createDiv({ cls: 'cs-item-list' });

    const renderFilters = () => {
        filterContainer.empty();
        if (filterDefs.length > 0) {
            renderFilterBar(filterContainer, filterDefs, activeFilters, (val) => {
                if (activeFilters.has(val)) activeFilters.delete(val);
                else activeFilters.add(val);
                renderFilters();
                renderList(searchInput.value.toLowerCase());
            });
        }
    };

    const renderList = (filter = '') => {
        list.empty();
        let filtered = allMinions;

        if (filter) {
            filtered = filtered.filter(m =>
                m.name.toLowerCase().includes(filter) || m.description?.toLowerCase().includes(filter)
            );
        }

        for (const f of activeFilters) {
            if (f.startsWith('tool:')) {
                const tool = f.slice(5);
                filtered = filtered.filter(m => m.tools?.includes(tool));
            } else if (f.startsWith('agent:')) {
                const agentName = f.slice(6);
                const agent = agents.find(a => a.name === agentName);
                filtered = filtered.filter(m => agent && agentHasMinion(agent, m.name));
            } else if (f === 'status:enabled') {
                filtered = filtered.filter(m => m.enabled !== false);
            } else if (f === 'status:disabled') {
                filtered = filtered.filter(m => m.enabled === false);
            }
        }

        for (const minion of filtered) {
            const card = list.createDiv({ cls: 'cs-item-card' });

            const nameDiv = card.createDiv({ cls: 'cs-item-card__name' });
            nameDiv.innerHTML = IconGenerator.generate(minion.name, 'connect', { size: 13, color: 'currentColor' }) + ` ${minion.name}`;

            if (minion.description) {
                card.createDiv({ cls: 'cs-item-card__desc', text: minion.description });
            }

            if (minion.tools?.length > 0) {
                const meta = card.createDiv({ cls: 'cs-item-card__meta' });
                for (const toolName of minion.tools) {
                    const info = TOOL_INFO[toolName] || { category: 'mixed', label: toolName };
                    const badge = meta.createSpan({ cls: 'cs-item-card__badge' });
                    badge.innerHTML = getToolIcon(toolName, 'currentColor', 10) + ' ' + info.label;
                }
            }

            const usedBy = agents.filter(a => agentHasMinion(a, minion.name));
            renderAgentLinks(card, usedBy, nav, 'Miniony');

            card.addEventListener('click', () => {
                nav.push('minion-detail', { minionName: minion.name }, 'Miniony');
            });
        }
    };

    renderFilters();
    searchInput.addEventListener('input', (e) => renderList(e.target.value.toLowerCase()));
    renderList();
}

// ========== MASTERS VIEW ==========

/**
 * Render masters list view — Crystal Soul style.
 */
export function renderMastersView(container, plugin, nav, params) {
    container.classList.add('cs-root');
    const masterLoader = plugin.agentManager?.masterLoader;
    const allMasters = masterLoader?.getAllMasters() || [];
    const agents = plugin.agentManager?.getAllAgents() || [];

    // Title
    const title = container.createDiv({ cls: 'cs-section-title' });
    title.innerHTML = UiIcons.crown(12) + ' Mastery';
    title.createSpan({ cls: 'cs-section-title__count', text: `(${allMasters.length})` });

    // Create button
    const createBtn = container.createEl('button', { cls: 'cs-create-btn' });
    createBtn.innerHTML = UiIcons.plus(11) + ' Nowy Master';
    createBtn.addEventListener('click', () => {
        new MinionMasterEditorModal(plugin.app, plugin, 'master', null, () => nav.refresh()).open();
    });

    if (allMasters.length === 0) {
        container.createEl('p', { text: 'Brak dostępnych masterów.', cls: 'sidebar-empty-text' });
        return;
    }

    // Search
    const searchInput = container.createEl('input', {
        type: 'text', placeholder: 'Szukaj mastera...', cls: 'cs-search-input'
    });

    // Filters
    const activeFilters = new Set();
    const toolsInMasters = [...new Set(allMasters.flatMap(m => m.tools || []))];
    const filterDefs = [
        ...toolsInMasters.slice(0, 8).map(t => {
            const info = TOOL_INFO[t];
            return { value: `tool:${t}`, label: info?.label || t, toolName: t };
        }),
        ...agents.slice(0, 5).map(a => ({ value: `agent:${a.name}`, label: a.name })),
        { value: 'status:enabled', label: 'Aktywne' },
        { value: 'status:disabled', label: 'Wyłączone' }
    ];

    const filterContainer = container.createDiv();
    const list = container.createDiv({ cls: 'cs-item-list' });

    const renderFilters = () => {
        filterContainer.empty();
        if (filterDefs.length > 0) {
            renderFilterBar(filterContainer, filterDefs, activeFilters, (val) => {
                if (activeFilters.has(val)) activeFilters.delete(val);
                else activeFilters.add(val);
                renderFilters();
                renderList(searchInput.value.toLowerCase());
            });
        }
    };

    const renderList = (filter = '') => {
        list.empty();
        let filtered = allMasters;

        if (filter) {
            filtered = filtered.filter(m =>
                m.name.toLowerCase().includes(filter) || m.description?.toLowerCase().includes(filter)
            );
        }

        for (const f of activeFilters) {
            if (f.startsWith('tool:')) {
                const tool = f.slice(5);
                filtered = filtered.filter(m => m.tools?.includes(tool));
            } else if (f.startsWith('agent:')) {
                const agentName = f.slice(6);
                const agent = agents.find(a => a.name === agentName);
                filtered = filtered.filter(m => agent && agentHasMaster(agent, m.name));
            } else if (f === 'status:enabled') {
                filtered = filtered.filter(m => m.enabled !== false);
            } else if (f === 'status:disabled') {
                filtered = filtered.filter(m => m.enabled === false);
            }
        }

        for (const master of filtered) {
            const card = list.createDiv({ cls: 'cs-item-card' });

            const nameDiv = card.createDiv({ cls: 'cs-item-card__name' });
            nameDiv.innerHTML = IconGenerator.generate(master.name, 'arcane', { size: 13, color: 'currentColor' }) + ` ${master.name}`;

            if (master.description) {
                card.createDiv({ cls: 'cs-item-card__desc', text: master.description });
            }

            if (master.tools?.length > 0) {
                const meta = card.createDiv({ cls: 'cs-item-card__meta' });
                for (const toolName of master.tools) {
                    const info = TOOL_INFO[toolName] || { category: 'mixed', label: toolName };
                    const badge = meta.createSpan({ cls: 'cs-item-card__badge' });
                    badge.innerHTML = getToolIcon(toolName, 'currentColor', 10) + ' ' + info.label;
                }
            }

            const usedBy = agents.filter(a => agentHasMaster(a, master.name));
            renderAgentLinks(card, usedBy, nav, 'Mastery');

            card.addEventListener('click', () => {
                nav.push('master-detail', { masterName: master.name }, 'Mastery');
            });
        }
    };

    renderFilters();
    searchInput.addEventListener('input', (e) => renderList(e.target.value.toLowerCase()));
    renderList();
}
