/**
 * Base Agent class
 * Represents an AI assistant with unique personality and capabilities.
 *
 * Hierarchy: Archetype (broad class) → Role (specific specialization) → Personality (custom text)
 * - Archetype: orchestrator, specialist, assistant, meta_agent
 * - Role: jaskier-mentor, vault-builder, creative-writer, daily-assistant, custom...
 */

import { PromptBuilder } from '../core/PromptBuilder.js';

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
    thinking: true,
    mcp: false,
    yolo_mode: false
};

/**
 * Agent class - base for all AI assistants
 */
export class Agent {
    /**
     * @param {Object} config - Agent configuration
     * @param {string} config.name - Agent name
     * @param {string} config.emoji - Agent emoji icon
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
     */
    constructor(config) {
        this.name = config.name;
        this.emoji = config.emoji || '🤖';

        // Archetype = broad class (orchestrator, specialist, assistant, meta_agent)
        this.archetype = config.archetype || 'specialist';

        // Role = specific specialization (e.g. 'vault-builder', 'creative-writer')
        this.role = config.role || null;

        this.personality = config.personality || '';
        this.model = config.model || null; // null = use default from settings
        this.temperature = config.temperature ?? 0.7;
        this.focusFolders = config.focus_folders || [];
        this.permissions = { ...DEFAULT_PERMISSIONS, ...(config.default_permissions || {}) };
        this.skills = config.skills || [];
        this.enabledTools = config.enabled_tools || []; // empty = all tools
        this.minion = config.minion || null; // minion config name (e.g. 'jaskier-prep')
        this.minionEnabled = config.minion_enabled !== false; // default: true
        this.models = config.models || {}; // per-agent model overrides {main: {platform, model}, minion: {...}, master: {...}}
        this.isBuiltIn = config.isBuiltIn || false;
        this.filePath = config.filePath || null;

        // Runtime state
        this.activeContext = [];
        this.lastActivity = null;
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
     * @returns {Object} { name, emoji, archetype, role, isBuiltIn }
     */
    getDisplayInfo() {
        return {
            name: this.name,
            emoji: this.emoji,
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
            emoji: this.emoji
        };

        if (this.archetype && this.archetype !== 'specialist') data.archetype = this.archetype;
        if (this.role) data.role = this.role;
        if (this.personality) data.personality = this.personality;
        if (this.model) data.model = this.model;
        if (this.temperature !== 0.7) data.temperature = this.temperature;
        if (this.focusFolders.length > 0) data.focus_folders = this.focusFolders;
        if (this.skills.length > 0) data.skills = this.skills;
        if (this.enabledTools.length > 0) data.enabled_tools = this.enabledTools;
        if (this.minion) data.minion = this.minion;
        if (this.minionEnabled === false) data.minion_enabled = false;
        if (Object.keys(this.models).length > 0) data.models = this.models;

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
            'name', 'emoji', 'personality', 'model',
            'temperature', 'archetype', 'role', 'focus_folders', 'default_permissions', 'skills',
            'enabled_tools', 'minion', 'minion_enabled', 'models'
        ];

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                if (key === 'focus_folders') {
                    this.focusFolders = value;
                } else if (key === 'default_permissions') {
                    this.permissions = { ...DEFAULT_PERMISSIONS, ...value };
                } else if (key === 'minion_enabled') {
                    this.minionEnabled = value;
                } else if (key === 'enabled_tools') {
                    this.enabledTools = value;
                } else {
                    this[key] = value;
                }
            }
        }
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
