/**
 * AgentLoader
 * Loads and validates agent definitions from YAML files
 */
import { Agent } from './Agent.js';
import { parseYaml, validateAgentSchema } from '../utils/yamlParser.js';
import { createJaskier, ARCHETYPE_DEFAULTS } from './archetypes/index.js';

/**
 * AgentLoader class - handles loading agents from files and built-in definitions
 */
export class AgentLoader {
    /**
     * @param {Object} vault - Obsidian Vault object
     */
    constructor(vault) {
        this.vault = vault;
        this.agentsPath = '.pkm-assistant/agents';
    }

    /**
     * Load all built-in agents (only Jaskier on fresh install)
     * @returns {Promise<Agent[]>} Array of built-in agents
     */
    async loadBuiltInAgents() {
        const jaskier = createJaskier();

        // Load overrides from YAML if they exist
        await this._mergeBuiltInOverrides(jaskier);

        return [jaskier];
    }

    /**
     * Load custom agents from .pkm-assistant/agents/*.yaml
     * @returns {Promise<Agent[]>} Array of custom agents
     */
    async loadCustomAgents() {
        const agents = [];

        try {
            // Check if agents folder exists
            const exists = await this.vault.adapter.exists(this.agentsPath);
            if (!exists) {
                await this.vault.adapter.mkdir(this.agentsPath);
                return agents;
            }

            // List all files in agents folder
            const listed = await this.vault.adapter.list(this.agentsPath);
            if (!listed || !listed.files) {
                return agents;
            }

            // Load each YAML file (skip _overrides files — those are for built-in agents)
            for (const filePath of listed.files) {
                const fileName = filePath.split('/').pop() || '';
                if (fileName.includes('_overrides')) continue;
                if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
                    try {
                        const agent = await this.loadAgentFromFile(filePath);
                        if (agent) {
                            agents.push(agent);
                        }
                    } catch (error) {
                        console.error('[AgentLoader] Error loading agent from', filePath, error);
                    }
                }
            }
        } catch (error) {
            console.error('[AgentLoader] Error loading custom agents:', error);
        }

        return agents;
    }

    /**
     * Load a single agent from a YAML file
     * @param {string} filePath - Path to YAML file
     * @returns {Promise<Agent|null>} Agent instance or null on error
     */
    async loadAgentFromFile(filePath) {
        try {
            const content = await this.vault.adapter.read(filePath);
            const data = parseYaml(content);

            if (!data) {
                console.error('[AgentLoader] Failed to parse YAML:', filePath);
                return null;
            }

            // Validate schema
            const validation = validateAgentSchema(data);
            if (!validation.valid) {
                console.error('[AgentLoader] Invalid agent schema:', filePath, validation.errors);
                return null;
            }

            // If archetype specified, merge with archetype defaults
            if (data.archetype && ARCHETYPE_DEFAULTS[data.archetype]) {
                const defaults = await ARCHETYPE_DEFAULTS[data.archetype]();
                data.personality = data.personality || defaults.personality;
                data.temperature = data.temperature ?? defaults.temperature;
                data.default_permissions = {
                    ...defaults.default_permissions,
                    ...(data.default_permissions || {})
                };
            }

            // Add file path reference
            data.filePath = filePath;
            data.isBuiltIn = false;

            return new Agent(data);
        } catch (error) {
            console.error('[AgentLoader] Error reading agent file:', filePath, error);
            return null;
        }
    }

    /**
     * Load all agents (built-in + custom)
     * @returns {Promise<Agent[]>} All agents
     */
    async loadAllAgents() {
        const builtIn = await this.loadBuiltInAgents();
        const custom = await this.loadCustomAgents();

        // Filter out custom agents that have the same name as built-in ones
        const builtInNames = new Set(builtIn.map(a => a.name));
        const filteredCustom = custom.filter(a => !builtInNames.has(a.name));

        return [...builtIn, ...filteredCustom];
    }

    /**
     * Save agent definition to YAML file
     * @param {Agent} agent - Agent to save
     * @param {string} [filename] - Optional filename (defaults to agent name)
     * @returns {Promise<string>} Path to saved file
     */
    async saveAgent(agent, filename = null) {
        const { stringifyYaml } = await import('../utils/yamlParser.js');

        const safeName = (filename || agent.name).toLowerCase().replace(/[^a-z0-9]/g, '_');
        const filePath = `${this.agentsPath}/${safeName}.yaml`;

        const data = agent.serialize();
        const content = stringifyYaml(data);

        await this.vault.adapter.write(filePath, content);

        return filePath;
    }

    /**
     * Delete agent definition file
     * @param {Agent} agent - Agent to delete (must have filePath)
     * @returns {Promise<boolean>} Success status
     */
    async deleteAgent(agent) {
        if (!agent.filePath) return false;

        try {
            await this.vault.adapter.remove(agent.filePath);
            return true;
        } catch (error) {
            console.error('[AgentLoader] Error deleting agent:', error);
            return false;
        }
    }

    /**
     * Merge built-in agent with override YAML (for persisting user edits)
     * @private
     * @param {Agent} agent - Built-in agent to merge overrides into
     */
    async _mergeBuiltInOverrides(agent) {
        const safeName = agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const overridePath = `${this.agentsPath}/${safeName}_overrides.yaml`;

        try {
            const exists = await this.vault.adapter.exists(overridePath);
            if (!exists) return;

            const content = await this.vault.adapter.read(overridePath);
            const data = parseYaml(content);
            if (!data) return;

            // Merge override permissions INTO existing (preserves built-in defaults like mcp:true)
            if (data.default_permissions) {
                agent.permissions = { ...agent.permissions, ...data.default_permissions };
            }
            if (data.skills) agent.skills = data.skills;
            if (data.minion !== undefined) agent.minion = data.minion;
            if (data.minion_enabled !== undefined) agent.minionEnabled = data.minion_enabled;
            if (data.temperature !== undefined) agent.temperature = data.temperature;
            if (data.personality) agent.personality = data.personality;
            if (data.emoji) agent.emoji = data.emoji;
            if (data.models) agent.models = data.models;
            if (data.model) agent.model = data.model;
            if (data.focus_folders) agent.focusFolders = data.focus_folders;
        } catch (e) {
            // No overrides or error reading - use defaults
        }
    }

    /**
     * Save built-in agent overrides to YAML
     * @param {Agent} agent - Built-in agent with modified settings
     * @returns {Promise<string>} Path to override file
     */
    async saveBuiltInOverrides(agent) {
        const { stringifyYaml } = await import('../utils/yamlParser.js');

        const safeName = agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const filePath = `${this.agentsPath}/${safeName}_overrides.yaml`;

        // Save all editable fields
        const data = agent.serialize();
        delete data.name; // Name stays hardcoded
        delete data.archetype; // Archetype stays hardcoded

        const content = stringifyYaml(data);
        await this.vault.adapter.write(filePath, content);

        return filePath;
    }

    /**
     * Delete built-in agent override file
     * @param {Agent} agent - Built-in agent
     * @returns {Promise<boolean>}
     */
    async deleteBuiltInOverrides(agent) {
        const safeName = agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const overridePath = `${this.agentsPath}/${safeName}_overrides.yaml`;

        try {
            const exists = await this.vault.adapter.exists(overridePath);
            if (exists) {
                await this.vault.adapter.remove(overridePath);
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Watch for changes in agents folder (for hot-reload)
     * @param {Function} callback - Called when agents change
     * @returns {Function} Unsubscribe function
     */
    watchAgents(callback) {
        // Note: Obsidian doesn't have a direct file watcher API
        // This would need to be implemented using vault events
        // For now, return a no-op unsubscribe
        return () => { };
    }
}
