/**
 * AgentLoader
 * Loads and validates agent definitions from YAML files
 */
import { Agent } from './Agent.js';
import { parseYaml, validateAgentSchema } from '../utils/yamlParser.js';
import { createJaskier, createDexter, createEzra, ARCHETYPE_DEFAULTS } from './archetypes/index.js';

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
     * Load all built-in agents
     * @returns {Agent[]} Array of built-in agents
     */
    loadBuiltInAgents() {
        console.log('[AgentLoader] Loading built-in agents');
        return [
            createJaskier(),
            createDexter(),
            createEzra()
        ];
    }

    /**
     * Load custom agents from .pkm-assistant/agents/*.yaml
     * @returns {Promise<Agent[]>} Array of custom agents
     */
    async loadCustomAgents() {
        console.log('[AgentLoader] Loading custom agents from:', this.agentsPath);
        const agents = [];

        try {
            // Check if agents folder exists
            const exists = await this.vault.adapter.exists(this.agentsPath);
            if (!exists) {
                console.log('[AgentLoader] Agents folder does not exist, creating...');
                await this.vault.adapter.mkdir(this.agentsPath);
                return agents;
            }

            // List all files in agents folder
            const listed = await this.vault.adapter.list(this.agentsPath);
            console.log('[AgentLoader] Found files:', listed?.files);

            if (!listed || !listed.files) {
                return agents;
            }

            // Load each YAML file
            for (const filePath of listed.files) {
                if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
                    try {
                        const agent = await this.loadAgentFromFile(filePath);
                        if (agent) {
                            agents.push(agent);
                            console.log('[AgentLoader] Loaded custom agent:', agent.name);
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
        const builtIn = this.loadBuiltInAgents();
        const custom = await this.loadCustomAgents();

        console.log('[AgentLoader] Loaded', builtIn.length, 'built-in and', custom.length, 'custom agents');
        return [...builtIn, ...custom];
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
        console.log('[AgentLoader] Saved agent to:', filePath);

        return filePath;
    }

    /**
     * Delete agent definition file
     * @param {Agent} agent - Agent to delete (must have filePath)
     * @returns {Promise<boolean>} Success status
     */
    async deleteAgent(agent) {
        if (!agent.filePath) {
            console.error('[AgentLoader] Cannot delete agent without filePath');
            return false;
        }

        if (agent.isBuiltIn) {
            console.error('[AgentLoader] Cannot delete built-in agent');
            return false;
        }

        try {
            await this.vault.adapter.remove(agent.filePath);
            console.log('[AgentLoader] Deleted agent:', agent.filePath);
            return true;
        } catch (error) {
            console.error('[AgentLoader] Error deleting agent:', error);
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
        console.log('[AgentLoader] Agent watching not yet implemented');
        return () => { };
    }
}
