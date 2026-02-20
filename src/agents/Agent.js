/**
 * Base Agent class
 * Represents an AI assistant with unique personality and capabilities
 */

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
     * @param {string} [config.archetype] - Base archetype name
     * @param {string} [config.personality] - Personality description / system prompt extension
     * @param {string} [config.model] - Preferred AI model
     * @param {number} [config.temperature] - Model temperature (0-2)
     * @param {string} [config.role] - Agent role (orchestrator, specialist, meta_agent)
     * @param {string[]} [config.focus_folders] - Folders this agent focuses on
     * @param {Object} [config.default_permissions] - Permission overrides
     * @param {boolean} [config.isBuiltIn] - Whether this is a built-in agent
     * @param {string} [config.filePath] - Path to YAML definition file (for custom agents)
     */
    constructor(config) {
        this.name = config.name;
        this.emoji = config.emoji || '🤖';
        this.archetype = config.archetype || null;
        this.personality = config.personality || '';
        this.model = config.model || null; // null = use default from settings
        this.temperature = config.temperature ?? 0.7;
        this.role = config.role || 'specialist';
        this.focusFolders = config.focus_folders || [];
        this.permissions = { ...DEFAULT_PERMISSIONS, ...(config.default_permissions || {}) };
        this.isBuiltIn = config.isBuiltIn || false;
        this.filePath = config.filePath || null;

        // Runtime state
        this.activeContext = [];
        this.lastActivity = null;
    }

    /**
     * Get the full system prompt for this agent
     * @param {Object} [context] - Additional context to include
     * @returns {string} Complete system prompt
     */
    getSystemPrompt(context = {}) {
        const parts = [];

        // Agent identity
        parts.push(`Jesteś ${this.name} ${this.emoji}`);

        // Personality
        if (this.personality) {
            parts.push(this.personality);
        }

        // Focus folders
        if (this.focusFolders.length > 0) {
            parts.push(`\nMoje główne obszary w vaultcie:`);
            this.focusFolders.forEach(folder => {
                parts.push(`- ${folder}`);
            });
        }

        // Additional context
        if (context.vaultName) {
            parts.push(`\nPracujesz w vaultcie: ${context.vaultName}`);
        }

        if (context.currentDate) {
            parts.push(`Dzisiejsza data: ${context.currentDate}`);
        }

        // Memory context (long-term memory, summaries)
        if (context.memoryContext) {
            parts.push(`\n--- Twoja pamięć ---`);
            parts.push(context.memoryContext);
            parts.push(`--- Koniec pamięci ---`);
        }

        // MCP Tool usage instructions - CRITICAL for making AI actually use tools
        if (this.permissions.mcp) {
            parts.push(`\n--- WAŻNE: Używanie narzędzi ---`);
            parts.push(`Masz dostęp do narzędzi (functions/tools) do interakcji z vaultem użytkownika.`);
            parts.push(`Narzędzia do notatek użytkownika (vault):`);
            parts.push(`- vault_list — zawartość folderu`);
            parts.push(`- vault_read — odczyt notatki`);
            parts.push(`- vault_search — szukanie w notatkach użytkownika`);
            parts.push(`- vault_write — tworzenie/edycja notatek`);
            parts.push(`Narzędzia do TWOJEJ pamięci:`);
            parts.push(`- memory_search — przeszukaj swoje poprzednie rozmowy, brain i podsumowania`);
            parts.push(`- memory_update — zarządzaj swoją pamięcią (zapamiętaj/zapomnij/aktualizuj fakty)`);
            parts.push(`- memory_status — pokaż stan swojej pamięci (ile sesji, rozmiar brain itp.)`);
            parts.push(`KOMENDY PAMIĘCIOWE - reaguj na te frazy użytkownika:`);
            parts.push(`- "zapamiętaj że..." / "pamiętaj że..." → memory_update(operation: "update_brain", content: fakt)`);
            parts.push(`- "zapomnij o..." / "usuń z pamięci..." → memory_update(operation: "delete_from_brain", content: co usunąć)`);
            parts.push(`- "co o mnie wiesz?" / "co pamiętasz?" → memory_update(operation: "read_brain")`);
            parts.push(`- "pokaż swoją pamięć" / "ile pamiętasz?" → memory_status`);
            parts.push(`- "czy pamiętasz...?" / "co mówiliśmy o...?" → memory_search`);
            parts.push(`ZASADY:`);
            parts.push(`1. NIE odpowiadaj tekstem że "zaraz sprawdzisz" - WYWOŁAJ narzędzie`);
            parts.push(`2. Zawsze NAJPIERW wywołaj narzędzie, POTEM odpowiadaj na podstawie wyników`);
            parts.push(`3. Gdy user mówi "zapamiętaj" → od razu memory_update, nie czekaj`);
            parts.push(`--- Koniec instrukcji narzędzi ---`);
        }

        return parts.join('\n');
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
     * @returns {Object} { name, emoji, role, isBuiltIn }
     */
    getDisplayInfo() {
        return {
            name: this.name,
            emoji: this.emoji,
            role: this.role,
            isBuiltIn: this.isBuiltIn,
            archetype: this.archetype
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

        if (this.archetype) data.archetype = this.archetype;
        if (this.personality) data.personality = this.personality;
        if (this.model) data.model = this.model;
        if (this.temperature !== 0.7) data.temperature = this.temperature;
        if (this.role !== 'specialist') data.role = this.role;
        if (this.focusFolders.length > 0) data.focus_folders = this.focusFolders;

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
            'temperature', 'role', 'focus_folders', 'default_permissions'
        ];

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                if (key === 'focus_folders') {
                    this.focusFolders = value;
                } else if (key === 'default_permissions') {
                    this.permissions = { ...DEFAULT_PERMISSIONS, ...value };
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
