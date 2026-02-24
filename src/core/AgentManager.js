/**
 * AgentManager
 * Central manager for all agents - loading, switching, and managing agent state
 */
import { AgentLoader } from '../agents/AgentLoader.js';
import { AgentMemory } from '../memory/AgentMemory.js';
import { SkillLoader } from '../skills/SkillLoader.js';
import { MinionLoader } from './MinionLoader.js';
import { PlaybookManager } from './PlaybookManager.js';
import { KomunikatorManager } from './KomunikatorManager.js';
import { log } from '../utils/Logger.js';

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
        this.skillLoader = new SkillLoader(vault);
        this.minionLoader = new MinionLoader(vault);
        this.playbookManager = new PlaybookManager(vault);
        this.komunikatorManager = new KomunikatorManager(vault);

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
        const initStart = Date.now();
        log.group('AgentManager', 'initialize()');
        try {
            const allAgents = await this.loader.loadAllAgents();
            log.debug('AgentManager', `Załadowano ${allAgents.length} agentów: ${allAgents.map(a => a.name).join(', ')}`);

            for (const agent of allAgents) {
                this.agents.set(agent.name, agent);
                this.agentHistories.set(agent.name, []);

                // Initialize memory for each agent
                const memory = new AgentMemory(this.vault, agent.name, this.settings);
                await memory.initialize();
                this.agentMemories.set(agent.name, memory);
                log.debug('AgentManager', `Pamięć ${agent.name}: OK`);
            }

            // Set default active agent (Jaskier or first available)
            const defaultAgentName = this.settings?.defaultAgent || 'Jaskier';
            this.activeAgent = this.agents.get(defaultAgentName) || allAgents[0] || null;
            log.info('AgentManager', `Aktywny agent: ${this.activeAgent?.name || 'BRAK'}`);

            // Load skills
            await this.skillLoader.ensureStarterSkills();
            await this.skillLoader.loadAllSkills();
            log.debug('AgentManager', `Skills: ${this.skillLoader.cache?.size || 0} załadowanych`);

            // Load minions
            await this.minionLoader.ensureStarterMinions();
            await this.minionLoader.loadAllMinions();
            log.debug('AgentManager', `Minions: ${this.minionLoader.cache?.size || 0} załadowanych`);

            // Ensure playbook.md + vault_map.md for all agents
            await this.playbookManager.ensureStarterFiles(allAgents);

            // Ensure komunikator folder exists
            await this.komunikatorManager.ensureFolder();

            this._emit('agents:loaded', { count: this.agents.size });

            log.timing('AgentManager', 'initialize()', initStart);
            log.groupEnd();
        } catch (error) {
            log.error('AgentManager', 'Initialization FAIL:', error);
            log.groupEnd();
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
     * Get skills assigned to the active agent
     * @returns {Object[]} Array of skill objects
     */
    getActiveAgentSkills() {
        if (!this.activeAgent) return [];
        return this.skillLoader.getSkillsForAgent(this.activeAgent.skills);
    }

    /**
     * Reload all skills from disk
     * @returns {Promise<void>}
     */
    async reloadSkills() {
        await this.skillLoader.reloadSkills();
    }

    /**
     * Reload all minions from disk
     * @returns {Promise<void>}
     */
    async reloadMinions() {
        await this.minionLoader.reloadMinions();
    }

    /**
     * Get minion config for the active agent
     * @returns {Object|null} Minion config or null
     */
    getActiveMinionConfig() {
        if (!this.activeAgent?.minion) return null;
        return this.minionLoader.getMinion(this.activeAgent.minion);
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
     * Build enriched context for PromptBuilder.
     * Shared logic for both sync and async prompt methods.
     * @private
     * @returns {Object} Base enriched context (without async data like memory/agora)
     */
    _buildBaseContext() {
        const agent = this.activeAgent;
        if (!agent) return {};

        // Skills metadata (name + description + category only — no full prompt text)
        const skills = this.skillLoader.getSkillsForAgent(agent.skills)
            .filter(s => s.enabled !== false)
            .map(s => ({ name: s.name, description: s.description, category: s.category }));

        // Agent list for communicator
        const agentList = this.getAllAgents().map(a => a.name);

        // Minion availability
        const minionConfig = agent.minion ? this.minionLoader.getMinion(agent.minion) : null;
        const hasMinion = agent.minionEnabled !== false && !!minionConfig;

        // Master availability (global setting)
        const obsek = this.settings?.obsek || {};
        const hasMaster = !!(obsek.masterModel && obsek.masterPlatform);

        // Custom PKM/Environment prompts from settings (empty = use defaults)
        const pkmSystemPrompt = obsek.pkmSystemPrompt || '';
        const environmentPrompt = obsek.environmentPrompt || '';

        // Disabled prompt sections from settings
        const disabledPromptSections = obsek.disabledPromptSections || [];

        return {
            vaultName: this.vault?.getName?.() || 'Unknown Vault',
            currentDate: new Date().toLocaleDateString('pl-PL'),
            skills,
            agentList,
            hasMinion,
            hasMaster,
            ...(pkmSystemPrompt && { pkmSystemPrompt }),
            ...(environmentPrompt && { environmentPrompt }),
            ...(disabledPromptSections.length > 0 && { disabledPromptSections }),
        };
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

        const enrichedContext = this._buildBaseContext();

        // Memory context (unless disabled in settings)
        const memory = this.getActiveMemory();
        const injectMemory = this.settings?.obsek?.injectMemoryToPrompt !== false;
        if (memory && injectMemory) {
            try {
                enrichedContext.memoryContext = await memory.getMemoryContext();
            } catch (e) {
                console.warn('[AgentManager] Could not load memory context:', e);
            }
        }

        // Agora context (shared knowledge base)
        if (this.agoraManager) {
            try {
                enrichedContext.agoraContext = await this.agoraManager.buildPromptContext(this.activeAgent);
            } catch (e) {
                console.warn('[AgentManager] Agora context failed:', e);
            }
        }

        // Unread inbox count
        try {
            enrichedContext.unreadInbox = await this.komunikatorManager.getUnreadCount(this.activeAgent.name);
        } catch (e) {
            log.debug('AgentManager', 'Could not get unread count:', e);
        }

        // Merge caller-provided context (overrides allowed)
        Object.assign(enrichedContext, context);

        return this.activeAgent.getSystemPrompt(enrichedContext);
    }

    /**
     * Get system prompt for active agent (sync — no memory/agora/inbox)
     * @param {Object} [context] - Additional context
     * @returns {string}
     */
    getActiveSystemPrompt(context = {}) {
        if (!this.activeAgent) {
            return 'You are a helpful AI assistant.';
        }

        const enrichedContext = { ...this._buildBaseContext(), ...context };
        return this.activeAgent.getSystemPrompt(enrichedContext);
    }

    /**
     * Get prompt inspector data for Settings UI.
     * Returns sections with token counts and breakdown.
     * @param {Object} [context] - Additional context overrides
     * @returns {Promise<{sections: Array, breakdown: Object}>}
     */
    async getPromptInspectorData(context = {}) {
        if (!this.activeAgent) {
            return { sections: [], breakdown: { total: 0, sections: [] } };
        }

        const enrichedContext = this._buildBaseContext();

        // Include memory + agora for realistic token count
        const memory = this.getActiveMemory();
        if (memory) {
            try {
                enrichedContext.memoryContext = await memory.getMemoryContext();
            } catch (e) { /* ok */ }
        }
        if (this.agoraManager) {
            try {
                enrichedContext.agoraContext = await this.agoraManager.buildPromptContext(this.activeAgent);
            } catch (e) { /* ok */ }
        }
        try {
            enrichedContext.unreadInbox = await this.komunikatorManager.getUnreadCount(this.activeAgent.name);
        } catch (e) { /* ok */ }

        Object.assign(enrichedContext, context);

        return this.activeAgent.getPromptSections(enrichedContext);
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

        // Create memory folders for the new agent (sessions/, summaries/L1/, L2/, brain.md)
        const memory = new AgentMemory(this.vault, agent.name, this.settings);
        await memory.initialize();
        this.agentMemories.set(agent.name, memory);

        // Create playbook.md + vault_map.md for the new agent
        await this.playbookManager.ensureStarterFiles([agent]);

        this._emit('agent:created', { agent: agent.name });

        return agent;
    }

    /**
     * Update agent configuration and persist to file
     * @param {string} name - Agent name
     * @param {Object} updates - Fields to update
     * @returns {Promise<boolean>}
     */
    async updateAgent(name, updates) {
        const agent = this.agents.get(name);
        if (!agent) return false;

        agent.update(updates);

        // Persist changes
        if (agent.isBuiltIn) {
            await this.loader.saveBuiltInOverrides(agent);
        } else {
            await this.loader.saveAgent(agent);
        }

        this._emit('agent:updated', { agent: name, updates });
        return true;
    }

    /**
     * Get statistics for an agent
     * @param {string} name - Agent name
     * @returns {Promise<Object|null>}
     */
    async getAgentStats(name) {
        const agent = this.agents.get(name);
        const memory = this.agentMemories.get(name);
        if (!agent) return null;

        let sessionCount = 0, l1Count = 0, l2Count = 0, brainSize = 0;

        if (memory) {
            try {
                const sessions = await this.vault.adapter.list(memory.paths.sessions);
                sessionCount = sessions?.files?.filter(f => f.endsWith('.md')).length || 0;
            } catch (e) { /* no sessions yet */ }

            try {
                const l1 = await this.vault.adapter.list(memory.paths.l1);
                l1Count = l1?.files?.filter(f => f.endsWith('.md')).length || 0;
            } catch (e) { /* no L1 yet */ }

            try {
                const l2 = await this.vault.adapter.list(memory.paths.l2);
                l2Count = l2?.files?.filter(f => f.endsWith('.md')).length || 0;
            } catch (e) { /* no L2 yet */ }

            try {
                const brain = await memory.getBrain();
                brainSize = brain?.length || 0;
            } catch (e) { /* no brain yet */ }
        }

        return {
            sessionCount,
            l1Count,
            l2Count,
            brainSize,
            lastActivity: agent.lastActivity || null,
            skillCount: agent.skills?.length || 0,
            minionName: agent.minion || null,
            hasMcp: agent.permissions?.mcp || false
        };
    }

    /**
     * Archive agent memory before deletion
     * @param {string} name - Agent name
     * @returns {Promise<boolean>}
     */
    async archiveAgentMemory(name) {
        const memory = this.agentMemories.get(name);
        if (!memory) return false;

        const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const srcBase = `.pkm-assistant/agents/${safeName}`;
        const destBase = `.pkm-assistant/archive/${safeName}_${Date.now()}`;

        try {
            // Create archive directory
            await this.vault.adapter.mkdir(destBase);

            // Copy memory folder recursively
            const memoryPath = `${srcBase}/memory`;
            const exists = await this.vault.adapter.exists(memoryPath);
            if (exists) {
                await this._copyFolderRecursive(memoryPath, `${destBase}/memory`);
            }

            // Copy playbook and vault_map
            for (const file of ['playbook.md', 'vault_map.md']) {
                const filePath = `${srcBase}/${file}`;
                if (await this.vault.adapter.exists(filePath)) {
                    const content = await this.vault.adapter.read(filePath);
                    await this.vault.adapter.write(`${destBase}/${file}`, content);
                }
            }

            return true;
        } catch (error) {
            console.error('[AgentManager] Archive error:', error);
            return false;
        }
    }

    /**
     * Recursively copy a folder via vault adapter
     * @private
     */
    async _copyFolderRecursive(src, dest) {
        await this.vault.adapter.mkdir(dest);

        const listed = await this.vault.adapter.list(src);
        if (!listed) return;

        // Copy files
        if (listed.files) {
            for (const filePath of listed.files) {
                const content = await this.vault.adapter.read(filePath);
                const relativePath = filePath.substring(src.length);
                await this.vault.adapter.write(`${dest}${relativePath}`, content);
            }
        }

        // Copy subfolders
        if (listed.folders) {
            for (const folderPath of listed.folders) {
                const relativePath = folderPath.substring(src.length);
                await this._copyFolderRecursive(folderPath, `${dest}${relativePath}`);
            }
        }
    }

    /**
     * Delete an agent (any agent, including built-in)
     * @param {string} name - Agent name
     * @returns {Promise<boolean>}
     */
    async deleteAgent(name) {
        const agent = this.agents.get(name);
        if (!agent) return false;

        // Delete file (custom YAML or built-in overrides)
        if (agent.filePath) {
            await this.loader.deleteAgent(agent);
        }
        // Also remove override file for built-in agents
        if (agent.isBuiltIn) {
            await this.loader.deleteBuiltInOverrides(agent);
        }

        this.agents.delete(name);
        this.agentHistories.delete(name);
        this.agentMemories.delete(name);

        // If deleted agent was active, switch to another or recreate Jaskier
        if (this.activeAgent?.name === name) {
            if (this.agents.size > 0) {
                const firstAgent = this.agents.values().next().value;
                this.switchAgent(firstAgent.name);
            } else {
                // No agents left - recreate Jaskier as fallback
                await this._recreateJaskierFallback();
            }
        }

        this._emit('agent:deleted', { agent: name });
        return true;
    }

    /**
     * Recreate Jaskier when all agents have been deleted
     * @private
     */
    async _recreateJaskierFallback() {
        const { createJaskier } = await import('../agents/archetypes/HumanVibe.js');
        const jaskier = createJaskier();

        this.agents.set(jaskier.name, jaskier);
        this.agentHistories.set(jaskier.name, []);

        const memory = new AgentMemory(this.vault, jaskier.name, this.settings);
        await memory.initialize();
        this.agentMemories.set(jaskier.name, memory);

        await this.playbookManager.ensureStarterFiles([jaskier]);

        this.activeAgent = jaskier;
        this._emit('agent:created', { agent: jaskier.name });
    }

    /**
     * Reload all agents from files
     * @returns {Promise<void>}
     */
    async reload() {
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
