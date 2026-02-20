/**
 * AgentManager
 * Central manager for all agents - loading, switching, and managing agent state
 */
import { AgentLoader } from '../agents/AgentLoader.js';
import { AgentMemory } from '../memory/AgentMemory.js';

/**
 * AgentManager class - manages all agents and their state
 */
export class AgentManager {
    /**
     * @param {Object} vault - Obsidian Vault object
     * @param {Object} settings - Plugin settings
     */
    constructor(vault, settings) {
        this.vault = vault;
        this.settings = settings;
        this.loader = new AgentLoader(vault);

        /** @type {Map<string, Agent>} */
        this.agents = new Map();

        /** @type {Agent|null} */
        this.activeAgent = null;

        /** @type {Map<string, Array>} Agent message histories */
        this.agentHistories = new Map();

        /** @type {Map<string, AgentMemory>} Agent memory instances */
        this.agentMemories = new Map();

        /** @type {Function[]} Event listeners */
        this.listeners = [];
    }

    /**
     * Initialize the agent manager - load all agents
     * @returns {Promise<void>}
     */
    async initialize() {
        console.log('[AgentManager] Initializing...');

        try {
            const allAgents = await this.loader.loadAllAgents();

            for (const agent of allAgents) {
                this.agents.set(agent.name, agent);
                this.agentHistories.set(agent.name, []);

                // Initialize memory for each agent
                const memory = new AgentMemory(this.vault, agent.name, this.settings);
                await memory.initialize();
                this.agentMemories.set(agent.name, memory);
            }

            // Set default active agent (Jaskier or first available)
            const defaultAgentName = this.settings?.defaultAgent || 'Jaskier';
            this.activeAgent = this.agents.get(defaultAgentName) || allAgents[0] || null;

            console.log('[AgentManager] Loaded', this.agents.size, 'agents');
            console.log('[AgentManager] Active agent:', this.activeAgent?.name || 'none');

            this._emit('agents:loaded', { count: this.agents.size });

        } catch (error) {
            console.error('[AgentManager] Initialization error:', error);
        }
    }

    /**
     * Get all agents as array
     * @returns {Agent[]}
     */
    getAllAgents() {
        return Array.from(this.agents.values());
    }

    /**
     * Get all built-in agents
     * @returns {Agent[]}
     */
    getBuiltInAgents() {
        return this.getAllAgents().filter(a => a.isBuiltIn);
    }

    /**
     * Get all custom agents
     * @returns {Agent[]}
     */
    getCustomAgents() {
        return this.getAllAgents().filter(a => !a.isBuiltIn);
    }

    /**
     * Get agent by name
     * @param {string} name - Agent name
     * @returns {Agent|undefined}
     */
    getAgent(name) {
        return this.agents.get(name);
    }

    /**
     * Get currently active agent
     * @returns {Agent|null}
     */
    getActiveAgent() {
        return this.activeAgent;
    }

    /**
     * Switch to a different agent
     * @param {string} name - Agent name to switch to
     * @returns {boolean} Success status
     */
    switchAgent(name) {
        const agent = this.agents.get(name);
        if (!agent) {
            console.error('[AgentManager] Agent not found:', name);
            return false;
        }

        const previousAgent = this.activeAgent;
        this.activeAgent = agent;
        this.activeAgent.lastActivity = Date.now();

        console.log('[AgentManager] Switched to agent:', name);
        this._emit('agent:switched', {
            previous: previousAgent?.name,
            current: agent.name
        });

        return true;
    }

    /**
     * Get conversation history for active agent
     * @returns {Array} Messages array
     */
    getActiveHistory() {
        if (!this.activeAgent) return [];
        return this.agentHistories.get(this.activeAgent.name) || [];
    }

    /**
     * Set conversation history for active agent
     * @param {Array} messages - Messages array
     */
    setActiveHistory(messages) {
        if (!this.activeAgent) return;
        this.agentHistories.set(this.activeAgent.name, messages);
    }

    /**
     * Add message to active agent's history
     * @param {Object} message - Message object { role, content }
     */
    addToActiveHistory(message) {
        if (!this.activeAgent) return;
        const history = this.getActiveHistory();
        history.push(message);
        this.agentHistories.set(this.activeAgent.name, history);
    }

    /**
     * Clear history for active agent
     */
    clearActiveHistory() {
        if (!this.activeAgent) return;
        this.agentHistories.set(this.activeAgent.name, []);
        this._emit('agent:history_cleared', { agent: this.activeAgent.name });
    }

    /**
     * Get memory instance for active agent
     * @returns {AgentMemory|null}
     */
    getActiveMemory() {
        if (!this.activeAgent) return null;
        return this.agentMemories.get(this.activeAgent.name) || null;
    }

    /**
     * Get memory instance for specific agent
     * @param {string} agentName
     * @returns {AgentMemory|null}
     */
    getAgentMemory(agentName) {
        return this.agentMemories.get(agentName) || null;
    }

    /**
     * Save current session to active agent's memory
     * @param {Array} messages - Current conversation
     * @param {Object} metadata - Additional metadata
     * @returns {Promise<string|null>} Path to saved session
     */
    async saveActiveSession(messages, metadata = {}) {
        const memory = this.getActiveMemory();
        if (!memory) return null;
        return await memory.saveSession(messages, metadata);
    }

    /**
     * Get system prompt for active agent with memory context
     * @param {Object} [context] - Additional context
     * @returns {Promise<string>}
     */
    async getActiveSystemPromptWithMemory(context = {}) {
        if (!this.activeAgent) {
            return 'You are a helpful AI assistant.';
        }

        // Get memory context
        const memory = this.getActiveMemory();
        let memoryContext = '';
        if (memory) {
            try {
                memoryContext = await memory.getMemoryContext();
            } catch (e) {
                console.warn('[AgentManager] Could not load memory context:', e);
            }
        }

        // Add vault name, date, and memory to context
        const enrichedContext = {
            vaultName: this.vault?.getName?.() || 'Unknown Vault',
            currentDate: new Date().toLocaleDateString('pl-PL'),
            memoryContext,
            ...context
        };

        return this.activeAgent.getSystemPrompt(enrichedContext);
    }

    /**
     * Get system prompt for active agent
     * @param {Object} [context] - Additional context
     * @returns {string}
     */
    getActiveSystemPrompt(context = {}) {
        if (!this.activeAgent) {
            return 'You are a helpful AI assistant.';
        }

        // Add vault name and current date to context
        const enrichedContext = {
            vaultName: this.vault?.getName?.() || 'Unknown Vault',
            currentDate: new Date().toLocaleDateString('pl-PL'),
            ...context
        };

        return this.activeAgent.getSystemPrompt(enrichedContext);
    }

    /**
     * Get model settings for active agent
     * @returns {Object} { model, temperature }
     */
    getActiveModelSettings() {
        if (!this.activeAgent) {
            return { model: null, temperature: 0.7 };
        }
        return this.activeAgent.getModelSettings();
    }

    /**
     * Create and save a new custom agent
     * @param {Object} config - Agent configuration
     * @returns {Promise<Agent>}
     */
    async createAgent(config) {
        const { Agent } = await import('../agents/Agent.js');
        const agent = new Agent(config);

        // Save to file
        await this.loader.saveAgent(agent);

        // Add to manager
        this.agents.set(agent.name, agent);
        this.agentHistories.set(agent.name, []);

        console.log('[AgentManager] Created new agent:', agent.name);
        this._emit('agent:created', { agent: agent.name });

        return agent;
    }

    /**
     * Delete a custom agent
     * @param {string} name - Agent name
     * @returns {Promise<boolean>}
     */
    async deleteAgent(name) {
        const agent = this.agents.get(name);
        if (!agent) return false;
        if (agent.isBuiltIn) {
            console.error('[AgentManager] Cannot delete built-in agent');
            return false;
        }

        const success = await this.loader.deleteAgent(agent);
        if (success) {
            this.agents.delete(name);
            this.agentHistories.delete(name);

            // If deleted agent was active, switch to Jaskier
            if (this.activeAgent?.name === name) {
                this.switchAgent('Jaskier');
            }

            this._emit('agent:deleted', { agent: name });
        }

        return success;
    }

    /**
     * Reload all agents from files
     * @returns {Promise<void>}
     */
    async reload() {
        console.log('[AgentManager] Reloading agents...');
        const activeAgentName = this.activeAgent?.name;

        // Clear and reload
        this.agents.clear();
        await this.initialize();

        // Try to restore active agent
        if (activeAgentName && this.agents.has(activeAgentName)) {
            this.activeAgent = this.agents.get(activeAgentName);
        }

        this._emit('agents:reloaded', { count: this.agents.size });
    }

    /**
     * Subscribe to events
     * @param {Function} callback - Event handler (event, data) => void
     * @returns {Function} Unsubscribe function
     */
    on(callback) {
        this.listeners.push(callback);
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) this.listeners.splice(index, 1);
        };
    }

    /**
     * Emit event to all listeners
     * @private
     */
    _emit(event, data) {
        for (const listener of this.listeners) {
            try {
                listener(event, data);
            } catch (error) {
                console.error('[AgentManager] Listener error:', error);
            }
        }
    }

    /**
     * Get agent display info for UI
     * @returns {Array<{name, emoji, role, isBuiltIn, isActive}>}
     */
    getAgentListForUI() {
        return this.getAllAgents().map(agent => ({
            ...agent.getDisplayInfo(),
            isActive: agent.name === this.activeAgent?.name
        }));
    }
}

/**
 * Create and initialize AgentManager
 * @param {Object} vault - Obsidian Vault
 * @param {Object} settings - Plugin settings
 * @returns {Promise<AgentManager>}
 */
export async function createAgentManager(vault, settings) {
    const manager = new AgentManager(vault, settings);
    await manager.initialize();
    return manager;
}
