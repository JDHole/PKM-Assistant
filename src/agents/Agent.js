/**
 * Base Agent class
 * Represents an AI assistant with unique personality and capabilities.
 *
 * Hierarchy: Archetype (broad class) → Role (specific specialization) → Personality (custom text)
 * - Archetype: orchestrator, specialist, assistant, meta_agent
 * - Role: jaskier-mentor, vault-builder, creative-writer, daily-assistant, custom...
 *
 * Multi-delegate: Agent can have MULTIPLE minions and masters (max 20 each).
 * Each assignment: {name, role?, default?, active?, overrides?}
 * active: default true, false = assigned but inactive (config preserved, not in prompt)
 * Backward compat: old `minion: string` format auto-migrated to `minions: [{...}]`
 */

import { PromptBuilder } from '../core/PromptBuilder.js';
import { pickColor, ALL_COLORS } from '../crystal-soul/ColorPalette.js';

/**
 * Max minions/masters per agent
 */
export const MAX_DELEGATES = 20;

/**
 * Default permissions for agents
 */
export const DEFAULT_PERMISSIONS = {
    read_notes: true,
    edit_notes: false,
    create_files: false,
    delete_files: false,
    access_outside_vault: false,
    execute_commands: false,
    thinking: false,
    mcp: false,
    yolo_mode: false,
    web_search: true,
    memory: true,
    guidance_mode: false  // false = WHITELIST (strict), true = cały vault except No-Go
};

/**
 * Agent class - base for all AI assistants
 */
export class Agent {
    /**
     * @param {Object} config - Agent configuration
     * @param {string} config.name - Agent name
     * @param {string} [config.archetype] - Broad class: orchestrator, specialist, assistant, meta_agent
     * @param {string} [config.role] - Specific role id (e.g. 'creative-writer', 'vault-builder')
     * @param {string} [config.personality] - Personality description / system prompt extension
     * @param {string} [config.model] - Preferred AI model
     * @param {number} [config.temperature] - Model temperature (0-2)
     * @param {string[]} [config.focus_folders] - Folders this agent focuses on
     * @param {Object} [config.default_permissions] - Permission overrides
     * @param {string[]} [config.enabled_tools] - Which MCP tools are enabled (empty = all)
     * @param {boolean} [config.isBuiltIn] - Whether this is a built-in agent
     * @param {string} [config.filePath] - Path to YAML definition file (for custom agents)
     * @param {Object} [config.prompt_overrides] - Per-agent prompt section overrides {decision_tree, minion_guide, ...}
     * @param {string} [config.agent_rules] - Domain-specific rules for this agent (e.g. "Grafiki w 16:9")
     * @param {Array} [config.minions] - Assigned minions [{name, role?, default?, overrides?}]
     * @param {Array} [config.masters] - Assigned masters [{name, default?, overrides?}]
     */
    /**
     * Crystal Soul agent color palette
     */
    static get CRYSTAL_PALETTE() { return ALL_COLORS.map(c => c.hex); }

    /**
     * Derive a deterministic color from agent name (hash → palette index)
     * @param {string} name - Agent name
     * @returns {string} Color name from CRYSTAL_PALETTE
     */
    static deriveColor(name) {
        return pickColor(name).hex;
    }

    constructor(config) {
        this.name = config.name;
        this.color = config.color || null; // Crystal Soul color (null = auto-derive from name)

        // Archetype = broad class (orchestrator, specialist, assistant, meta_agent)
        this.archetype = config.archetype || 'specialist';

        // Role = specific specialization (e.g. 'vault-builder', 'creative-writer')
        this.role = config.role || null;

        this.personality = config.personality || '';
        this.description = config.description || '';
        this.createdAt = config.created_at || null;
        this.model = config.model || null; // null = use default from settings
        this.temperature = config.temperature ?? 0.7;
        this.focusFolders = Agent._normalizeFocusFolders(config.focus_folders);
        this.permissions = { ...DEFAULT_PERMISSIONS, ...(config.default_permissions || {}) };
        this._skills = Agent._normalizeSkillAssignments(config.skills);
        this.enabledTools = config.enabled_tools || []; // empty = all tools

        // Multi-delegate: arrays of {name, role?, default?, overrides?}
        // Backward compat: old single `minion`/`master` string → migrated to array
        this._minions = Agent._normalizeDelegateAssignments(config.minions, config.minion);
        this._masters = Agent._normalizeDelegateAssignments(config.masters, config.master);
        this.minionEnabled = config.minion_enabled !== false; // default: true
        this.masterEnabled = config.master_enabled !== false; // default: true

        this.models = config.models || {}; // per-agent model overrides {main: {platform, model}, minion: {...}, master: {...}}
        this.defaultMode = config.default_mode || null; // null = use global default
        this.isBuiltIn = config.isBuiltIn || false;
        this.filePath = config.filePath || null;
        this.promptOverrides = config.prompt_overrides || {}; // per-agent prompt section overrides
        this.agentRules = config.agent_rules || ''; // domain-specific rules
        this.playbookOverrides = config.playbook_overrides || {}; // per-agent playbook block overrides

        // Runtime state
        this.activeContext = [];
        this.lastActivity = null;
    }

    /** Crystal Soul color — explicit or auto-derived from name */
    get crystalColor() {
        return this.color || Agent.deriveColor(this.name);
    }

    // ─── Backward compat getters (old code reads agent.minion / agent.master) ───

    /** @returns {string|null} Default minion name (backward compat) */
    get minion() { return this.defaultMinion?.name || null; }

    /** @returns {string|null} Default master name (backward compat) */
    get master() { return this.defaultMaster?.name || null; }

    // ─── Multi-delegate getters ───

    /** @returns {Object[]} Active minions only (active !== false) */
    get activeMinions() { return this._minions.filter(m => m.active !== false); }

    /** @returns {Object[]} Active masters only (active !== false) */
    get activeMasters() { return this._masters.filter(m => m.active !== false); }

    /** @returns {Object|null} First active minion with default:true, or null (no fallback!) */
    get defaultMinion() {
        if (this._minions.length === 0) return null;
        return this._minions.find(m => m.default && m.active !== false) || null;
    }

    /** @returns {Object|null} Active minion with role:'prep', fallback to defaultMinion */
    get prepMinion() {
        const active = this.activeMinions;
        if (active.length === 0) return null;
        return active.find(m => m.role === 'prep') || this.defaultMinion;
    }

    /** @returns {Object|null} First active master with default:true, or null (no fallback!) */
    get defaultMaster() {
        if (this._masters.length === 0) return null;
        return this._masters.find(m => m.default && m.active !== false) || null;
    }

    /** @returns {Object|null} Get assignment object for a specific minion by name */
    getMinionAssignment(name) {
        return this._minions.find(m => m.name === name) || null;
    }

    /** @returns {Object|null} Get assignment object for a specific master by name */
    getMasterAssignment(name) {
        return this._masters.find(m => m.name === name) || null;
    }

    /** @returns {string[]} Active minion names only */
    getMinionNames() {
        return this.activeMinions.map(m => m.name);
    }

    /** @returns {string[]} Active master names only */
    getMasterNames() {
        return this.activeMasters.map(m => m.name);
    }

    // ─── Skills multi-format getters ───

    /** @returns {string[]} Skill names (backward compat — returns just names) */
    get skills() { return this._skills.map(s => s.name); }

    /** Setter — normalizes input (string[] or object[]) into _skills format */
    set skills(value) { this._skills = Agent._normalizeSkillAssignments(value); }

    /** @returns {Object|null} Get skill assignment object by name */
    getSkillAssignment(name) {
        return this._skills.find(s => s.name === name) || null;
    }

    /** @returns {string[]} ALL minion names including inactive */
    getAllMinionNames() {
        return this._minions.map(m => m.name);
    }

    /** @returns {string[]} ALL master names including inactive */
    getAllMasterNames() {
        return this._masters.map(m => m.name);
    }

    /**
     * Get the full system prompt for this agent using PromptBuilder.
     * @param {Object} [context] - Enriched context from AgentManager
     * @returns {string} Complete system prompt
     */
    getSystemPrompt(context = {}) {
        const builder = new PromptBuilder();
        builder.build(this, context);

        // Apply user-disabled sections from settings
        if (context.disabledPromptSections?.length > 0) {
            builder.applyDisabledSections(context.disabledPromptSections);
        }

        // Dynamic sections: memory and agora (passed in context)
        if (context.memoryContext) {
            builder.addDynamicSection('memory', 'Pamięć',
                `--- Twoja pamięć ---\n${context.memoryContext}\n--- Koniec pamięci ---`);
        }
        if (context.agoraContext) {
            builder.addDynamicSection('agora_data', 'Dane Agory',
                `--- AGORA (Wspólna Baza Wiedzy) ---\n${context.agoraContext}\n--- Koniec Agory ---`);
        }

        // Inbox (unread messages) — actionable with tool path
        if (context.unreadInbox && context.unreadInbox > 0) {
            const safeName = this.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const inboxPath = `.pkm-assistant/komunikator/inbox_${safeName}.md`;
            builder.addDynamicSection('inbox', 'Wiadomości',
                `📬 Masz ${context.unreadInbox} nieprzeczytanych wiadomości.\nOdczytaj: vault_read(path:"${inboxPath}")\nNa początku rozmowy poinformuj usera: "Masz ${context.unreadInbox} wiadomości — chcesz przejrzeć?"`);
        }

        return builder.getPrompt();
    }

    /**
     * Get prompt sections metadata for Prompt Inspector UI.
     * @param {Object} [context] - Same context as getSystemPrompt
     * @returns {{sections: Array, breakdown: Object}}
     */
    getPromptSections(context = {}) {
        const builder = new PromptBuilder();
        builder.build(this, context);

        // Apply user-disabled sections from settings
        if (context.disabledPromptSections?.length > 0) {
            builder.applyDisabledSections(context.disabledPromptSections);
        }

        if (context.memoryContext) {
            builder.addDynamicSection('memory', 'Pamięć',
                `--- Twoja pamięć ---\n${context.memoryContext}\n--- Koniec pamięci ---`);
        }
        if (context.agoraContext) {
            builder.addDynamicSection('agora_data', 'Dane Agory',
                `--- AGORA ---\n${context.agoraContext}\n--- Koniec Agory ---`);
        }

        return {
            sections: builder.getSections(),
            breakdown: builder.getTokenBreakdown(),
        };
    }

    /**
     * Get agent settings for AI model
     * @returns {Object} Settings object
     */
    getModelSettings() {
        return {
            model: this.model,
            temperature: this.temperature
        };
    }

    /**
     * Get display info for UI
     * @returns {Object} { name, archetype, role, isBuiltIn }
     */
    getDisplayInfo() {
        return {
            name: this.name,
            archetype: this.archetype,
            role: this.role,
            isBuiltIn: this.isBuiltIn
        };
    }

    /**
     * Serialize agent to object (for saving to YAML)
     * @returns {Object} Serialized agent data
     */
    serialize() {
        const data = {
            name: this.name,
        };

        if (this.color) data.color = this.color;
        if (this.archetype && this.archetype !== 'specialist') data.archetype = this.archetype;
        if (this.role) data.role = this.role;
        if (this.personality) data.personality = this.personality;
        if (this.description) data.description = this.description;
        if (this.createdAt) data.created_at = this.createdAt;
        if (this.model) data.model = this.model;
        if (this.temperature !== 0.7) data.temperature = this.temperature;
        if (this.focusFolders.length > 0) {
            // Backward compat: readwrite entries saved as plain strings
            data.focus_folders = this.focusFolders.map(f => {
                if (f.access === 'readwrite') return f.path;
                return { path: f.path, access: f.access };
            });
        }
        if (this._skills.length > 0) {
            // Save with overrides if any, plain strings otherwise (backward compat)
            const hasOverrides = this._skills.some(s => s.overrides && Object.keys(s.overrides).length > 0);
            if (hasOverrides) {
                data.skills = this._skills.map(s => {
                    if (!s.overrides || Object.keys(s.overrides).length === 0) return s.name;
                    return { name: s.name, overrides: s.overrides };
                });
            } else {
                data.skills = this._skills.map(s => s.name);
            }
        }
        if (this.enabledTools.length > 0) data.enabled_tools = this.enabledTools;

        // Multi-delegate: save as arrays (new format)
        if (this._minions.length > 0) {
            data.minions = this._minions.map(m => {
                const entry = { name: m.name };
                if (m.role) entry.role = m.role;
                if (m.default) entry.default = true;
                if (m.active === false) entry.active = false;
                if (m.overrides && Object.keys(m.overrides).length > 0) entry.overrides = m.overrides;
                return entry;
            });
        }
        if (this.minionEnabled === false) data.minion_enabled = false;

        if (this._masters.length > 0) {
            data.masters = this._masters.map(m => {
                const entry = { name: m.name };
                if (m.default) entry.default = true;
                if (m.active === false) entry.active = false;
                if (m.overrides && Object.keys(m.overrides).length > 0) entry.overrides = m.overrides;
                return entry;
            });
        }
        if (this.masterEnabled === false) data.master_enabled = false;
        if (Object.keys(this.models).length > 0) data.models = this.models;
        if (this.defaultMode) data.default_mode = this.defaultMode;
        if (Object.keys(this.promptOverrides).length > 0) data.prompt_overrides = this.promptOverrides;
        if (this.agentRules) data.agent_rules = this.agentRules;
        if (Object.keys(this.playbookOverrides).length > 0) data.playbook_overrides = this.playbookOverrides;

        // Only save non-default permissions
        const customPermissions = {};
        for (const [key, value] of Object.entries(this.permissions)) {
            if (value !== DEFAULT_PERMISSIONS[key]) {
                customPermissions[key] = value;
            }
        }
        if (Object.keys(customPermissions).length > 0) {
            data.default_permissions = customPermissions;
        }

        return data;
    }

    /**
     * Create Agent from plain object
     * @param {Object} data - Agent data
     * @returns {Agent}
     */
    static fromObject(data) {
        return new Agent(data);
    }

    /**
     * Update agent configuration
     * @param {Object} updates - Fields to update
     */
    update(updates) {
        const allowedFields = [
            'name', 'emoji', 'color', 'personality', 'description', 'model',
            'temperature', 'archetype', 'role', 'focus_folders', 'default_permissions', 'skills',
            'enabled_tools', 'minions', 'minion', 'minion_enabled', 'masters', 'master', 'master_enabled',
            'models', 'default_mode', 'prompt_overrides', 'agent_rules', 'playbook_overrides', 'created_at'
        ];

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                if (key === 'focus_folders') {
                    this.focusFolders = Agent._normalizeFocusFolders(value);
                } else if (key === 'default_permissions') {
                    this.permissions = { ...DEFAULT_PERMISSIONS, ...value };
                } else if (key === 'minions') {
                    this._minions = Agent._normalizeDelegateAssignments(value, null);
                } else if (key === 'minion') {
                    // Backward compat: single string update → array
                    if (value && typeof value === 'string') {
                        this._minions = Agent._normalizeDelegateAssignments(null, value);
                    } else if (!value) {
                        this._minions = [];
                    }
                } else if (key === 'minion_enabled') {
                    this.minionEnabled = value;
                } else if (key === 'masters') {
                    this._masters = Agent._normalizeDelegateAssignments(value, null);
                } else if (key === 'master') {
                    // Backward compat: single string update → array
                    if (value && typeof value === 'string') {
                        this._masters = Agent._normalizeDelegateAssignments(null, value);
                    } else if (!value) {
                        this._masters = [];
                    }
                } else if (key === 'master_enabled') {
                    this.masterEnabled = value;
                } else if (key === 'enabled_tools') {
                    this.enabledTools = value;
                } else if (key === 'default_mode') {
                    this.defaultMode = value || null;
                } else if (key === 'prompt_overrides') {
                    this.promptOverrides = value || {};
                } else if (key === 'agent_rules') {
                    this.agentRules = value || '';
                } else if (key === 'playbook_overrides') {
                    this.playbookOverrides = value || {};
                } else if (key === 'created_at') {
                    this.createdAt = value;
                } else {
                    this[key] = value;
                }
            }
        }
    }

    /**
     * Normalize focusFolders from mixed formats to {path, access}[].
     * Handles: string[], {path,access}[], and mixed arrays.
     * @param {Array} input
     * @returns {Array<{path: string, access: 'read'|'readwrite'}>}
     */
    static _normalizeFocusFolders(input) {
        if (!input || !Array.isArray(input)) return [];
        return input
            .filter(f => f)
            .map(f => {
                if (typeof f === 'string') {
                    return { path: f, access: 'readwrite' };
                }
                return { path: f.path || String(f), access: f.access || 'readwrite' };
            });
    }

    /**
     * Normalize delegate assignments from mixed formats to {name, role?, default?, active?, overrides?}[].
     * Handles migration from old single-string format.
     * @param {Array|null} arrayInput - New array format [{name, ...}] or null
     * @param {string|null} singleInput - Old single-string format (backward compat)
     * @returns {Array<{name: string, role?: string, default?: boolean, active?: boolean, overrides?: Object}>}
     */
    static _normalizeDelegateAssignments(arrayInput, singleInput) {
        // New format: array of objects
        if (arrayInput && Array.isArray(arrayInput)) {
            return arrayInput
                .filter(a => a)
                .map(a => {
                    if (typeof a === 'string') return { name: a };
                    return {
                        name: a.name || String(a),
                        ...(a.role ? { role: a.role } : {}),
                        ...(a.default ? { default: true } : {}),
                        ...(a.active === false ? { active: false } : {}),
                        ...(a.overrides && Object.keys(a.overrides).length > 0 ? { overrides: a.overrides } : {})
                    };
                })
                .slice(0, MAX_DELEGATES);
        }
        // Old format: single string → convert to array with default:true
        if (singleInput && typeof singleInput === 'string') {
            return [{ name: singleInput, default: true }];
        }
        return [];
    }

    /**
     * Normalize skill assignments from mixed formats to {name, overrides?}[].
     * Handles: ['name'] (v1 string array), [{name, overrides?}] (v2 objects), mixed.
     * @param {Array|null} input - Skills array or null
     * @returns {Array<{name: string, overrides?: Object}>}
     */
    static _normalizeSkillAssignments(input) {
        if (!input || !Array.isArray(input)) return [];
        return input
            .filter(s => s)
            .map(s => {
                if (typeof s === 'string') return { name: s };
                return {
                    name: s.name || String(s),
                    ...(s.overrides && Object.keys(s.overrides).length > 0 ? { overrides: s.overrides } : {})
                };
            });
    }

    /**
     * Check if agent has a specific permission
     * @param {string} permission - Permission key
     * @returns {boolean}
     */
    hasPermission(permission) {
        return this.permissions[permission] === true;
    }

    /**
     * Get memory directory path for this agent
     * @returns {string} Path like .pkm-assistant/agents/{name}/memory
     */
    getMemoryPath() {
        const safeName = this.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        return `.pkm-assistant/agents/${safeName}/memory`;
    }
}
