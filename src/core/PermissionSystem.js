/**
 * PermissionSystem
 * Central system for managing agent permissions and access control
 */

/**
 * Permission types enum
 */
export const PERMISSION_TYPES = {
    READ_NOTES: 'read_notes',
    EDIT_NOTES: 'edit_notes',
    CREATE_FILES: 'create_files',
    DELETE_FILES: 'delete_files',
    ACCESS_OUTSIDE_VAULT: 'access_outside_vault',
    EXECUTE_COMMANDS: 'execute_commands',
    THINKING: 'thinking',
    MCP: 'mcp',
    YOLO_MODE: 'yolo_mode'
};

/**
 * Action to permission mapping
 */
export const ACTION_PERMISSIONS = {
    'vault.read': PERMISSION_TYPES.READ_NOTES,
    'vault.write': PERMISSION_TYPES.EDIT_NOTES,
    'vault.create': PERMISSION_TYPES.CREATE_FILES,
    'vault.delete': PERMISSION_TYPES.DELETE_FILES,
    'command.execute': PERMISSION_TYPES.EXECUTE_COMMANDS,
    'mcp.call': PERMISSION_TYPES.MCP
};

export class PermissionSystem {
    /**
     * @param {Object} vault - Obsidian Vault
     * @param {Object} settings - Plugin settings
     */
    constructor(vault, settings) {
        this.vault = vault;
        this.settings = settings;
        this.accessLog = [];
        this.maxLogSize = 1000;

        // Będzie ustawione przez integrację z VaultZones (Batch 2)
        this.vaultZones = null;
    }

    /**
     * Set vault zones instance (called after VaultZones is initialized)
     * @param {VaultZones} vaultZones
     */
    setVaultZones(vaultZones) {
        this.vaultZones = vaultZones;
    }

    /**
     * Check if agent has permission for an action
     * @param {Agent} agent - Agent to check
     * @param {string} action - Action name (e.g., 'vault.read', 'vault.write')
     * @param {string|null} targetPath - Path being accessed (optional)
     * @returns {{allowed: boolean, reason: string, requiresApproval: boolean}}
     */
    checkPermission(agent, action, targetPath = null) {
        // YOLO mode bypasses all checks
        if (agent.hasPermission(PERMISSION_TYPES.YOLO_MODE)) {
            this.logAccess(agent, action, targetPath, true, 'YOLO mode enabled');
            return { allowed: true, reason: 'YOLO mode', requiresApproval: false };
        }

        // Get required permission for this action
        const requiredPermission = ACTION_PERMISSIONS[action];
        if (!requiredPermission) {
            // Unknown action - allow by default but log
            console.warn('[PermissionSystem] Unknown action:', action);
            return { allowed: true, reason: 'Unknown action', requiresApproval: false };
        }

        // Check if agent has the permission
        const hasPermission = agent.hasPermission(requiredPermission);

        if (!hasPermission) {
            this.logAccess(agent, action, targetPath, false, `Missing permission: ${requiredPermission}`);
            return {
                allowed: false,
                reason: `Brak uprawnienia: ${requiredPermission}`,
                requiresApproval: false
            };
        }

        // Check vault zones (if configured)
        const requiresApproval = this.requiresApproval(action, targetPath);

        this.logAccess(agent, action, targetPath, true, requiresApproval ? 'Requires approval' : 'Allowed');

        return {
            allowed: true,
            reason: 'Permission granted',
            requiresApproval
        };
    }

    /**
     * Check if action on path requires explicit approval
     * @param {string} action - Action name
     * @param {string|null} targetPath - Target path
     * @returns {boolean}
     */
    requiresApproval(action, targetPath) {
        // Destructive actions always require approval (unless YOLO)
        const destructiveActions = ['vault.write', 'vault.delete', 'command.execute'];
        if (destructiveActions.includes(action)) {
            // Will be enhanced in Batch 2 with VaultZones
            if (this.vaultZones && targetPath) {
                return this.vaultZones.requiresExplicitApprove(targetPath);
            }
            return true; // Default: require approval for destructive actions
        }

        return false;
    }

    /**
     * Log access attempt
     * @param {Agent} agent
     * @param {string} action
     * @param {string|null} targetPath
     * @param {boolean} allowed
     * @param {string} reason
     */
    logAccess(agent, action, targetPath, allowed, reason) {
        const entry = {
            timestamp: Date.now(),
            agent: agent.name,
            action,
            targetPath,
            allowed,
            reason
        };

        this.accessLog.push(entry);

        // Trim log if too large
        if (this.accessLog.length > this.maxLogSize) {
            this.accessLog = this.accessLog.slice(-this.maxLogSize / 2);
        }

        // Console log for debugging
        const emoji = allowed ? '✅' : '❌';
        console.log(`[PermissionSystem] ${emoji} ${agent.name}: ${action}${targetPath ? ` → ${targetPath}` : ''} (${reason})`);
    }

    /**
     * Get access log entries
     * @param {number} limit - Max entries to return
     * @returns {Array}
     */
    getAccessLog(limit = 100) {
        return this.accessLog.slice(-limit);
    }

    /**
     * Get access log for specific agent
     * @param {string} agentName
     * @param {number} limit
     * @returns {Array}
     */
    getAgentAccessLog(agentName, limit = 50) {
        return this.accessLog
            .filter(entry => entry.agent === agentName)
            .slice(-limit);
    }

    /**
     * Clear access log
     */
    clearAccessLog() {
        this.accessLog = [];
    }

    /**
     * Get permission description for UI
     * @param {string} permission
     * @returns {string}
     */
    static getPermissionDescription(permission) {
        const descriptions = {
            [PERMISSION_TYPES.READ_NOTES]: 'Czytanie notatek',
            [PERMISSION_TYPES.EDIT_NOTES]: 'Edycja notatek',
            [PERMISSION_TYPES.CREATE_FILES]: 'Tworzenie plików',
            [PERMISSION_TYPES.DELETE_FILES]: 'Usuwanie plików',
            [PERMISSION_TYPES.ACCESS_OUTSIDE_VAULT]: 'Dostęp poza vault',
            [PERMISSION_TYPES.EXECUTE_COMMANDS]: 'Wykonywanie komend',
            [PERMISSION_TYPES.THINKING]: 'Extended thinking (Claude)',
            [PERMISSION_TYPES.MCP]: 'Narzędzia MCP',
            [PERMISSION_TYPES.YOLO_MODE]: 'YOLO mode (auto-approve wszystko)'
        };
        return descriptions[permission] || permission;
    }

    /**
     * Get all permission types with descriptions
     * @returns {Array<{key: string, label: string}>}
     */
    static getAllPermissionTypes() {
        return Object.values(PERMISSION_TYPES).map(key => ({
            key,
            label: PermissionSystem.getPermissionDescription(key)
        }));
    }
}
