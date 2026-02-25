/**
 * ApprovalManager
 * Manages action approvals and "always approve" rules
 */
import { requestApproval } from '../views/ApprovalModal.js';

export class ApprovalManager {
    /**
     * @param {App} app - Obsidian App
     */
    constructor(app) {
        this.app = app;

        /** @type {Map<string, Set<string>>} Agent -> Set of always-approved action patterns */
        this.alwaysApproved = new Map();

        /** @type {Array} Approval history */
        this.history = [];
        this.maxHistorySize = 500;
    }

    /**
     * Request approval for an action
     * @param {Object} action - Action details
     * @param {string} action.type - Action type
     * @param {string} action.description - Description
     * @param {string} action.targetPath - Target path
     * @param {string} action.agentName - Agent name
     * @param {string} [action.preview] - Optional preview
     * @returns {Promise<{result: 'approve'|'deny', reason: string}>}
     */
    async requestApproval(action) {
        // Check if action is always approved for this agent
        if (this.isAlwaysApproved(action.agentName, action.type, action.targetPath)) {
            this.logApproval(action, 'auto-approved');
            console.log('[ApprovalManager] Auto-approved:', action.type, action.targetPath);
            return { result: 'approve', reason: '' };
        }

        // Show approval modal — returns {result, reason}
        const modalResult = await requestApproval(this.app, action);

        // Handle result (supports both old string and new object format)
        const resultKey = modalResult?.result || modalResult;
        const denyReason = modalResult?.reason || '';

        switch (resultKey) {
            case 'approve':
                this.logApproval(action, 'approved');
                return { result: 'approve', reason: '' };

            case 'always':
                this.addToAlwaysApproved(action.agentName, action.type, action.targetPath);
                this.logApproval(action, 'always-approved');
                return { result: 'approve', reason: '' };

            case 'deny':
            default:
                this.logApproval(action, 'denied');
                return { result: 'deny', reason: denyReason };
        }
    }

    /**
     * Check if action is always approved
     * @param {string} agentName
     * @param {string} actionType
     * @param {string} targetPath
     * @returns {boolean}
     */
    isAlwaysApproved(agentName, actionType, targetPath) {
        const agentRules = this.alwaysApproved.get(agentName);
        if (!agentRules) return false;

        // Create pattern key
        const patternKey = this.createPatternKey(actionType, targetPath);

        // Check exact match
        if (agentRules.has(patternKey)) return true;

        // Check wildcard pattern (action type only)
        const wildcardKey = this.createPatternKey(actionType, '*');
        if (agentRules.has(wildcardKey)) return true;

        return false;
    }

    /**
     * Add rule to always approved
     * @param {string} agentName
     * @param {string} actionType
     * @param {string} targetPath
     */
    addToAlwaysApproved(agentName, actionType, targetPath) {
        if (!this.alwaysApproved.has(agentName)) {
            this.alwaysApproved.set(agentName, new Set());
        }

        const patternKey = this.createPatternKey(actionType, targetPath);
        this.alwaysApproved.get(agentName).add(patternKey);

        console.log('[ApprovalManager] Added to always-approved:', agentName, patternKey);
    }

    /**
     * Remove rule from always approved
     * @param {string} agentName
     * @param {string} actionType
     * @param {string} targetPath
     */
    removeFromAlwaysApproved(agentName, actionType, targetPath) {
        const agentRules = this.alwaysApproved.get(agentName);
        if (agentRules) {
            const patternKey = this.createPatternKey(actionType, targetPath);
            agentRules.delete(patternKey);
        }
    }

    /**
     * Clear all always-approved rules for agent
     * @param {string} agentName
     */
    clearAlwaysApproved(agentName) {
        this.alwaysApproved.delete(agentName);
    }

    /**
     * Create pattern key for storage
     * @private
     */
    createPatternKey(actionType, targetPath) {
        return `${actionType}::${targetPath || '*'}`;
    }

    /**
     * Log approval to history
     * @private
     */
    logApproval(action, result) {
        const entry = {
            timestamp: Date.now(),
            agentName: action.agentName,
            actionType: action.type,
            targetPath: action.targetPath,
            description: action.description,
            result
        };

        this.history.push(entry);

        // Trim if needed
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(-this.maxHistorySize / 2);
        }
    }

    /**
     * Get approval history
     * @param {number} limit
     * @returns {Array}
     */
    getHistory(limit = 100) {
        return this.history.slice(-limit);
    }

    /**
     * Get always-approved rules for agent
     * @param {string} agentName
     * @returns {Array<string>}
     */
    getAlwaysApprovedRules(agentName) {
        const rules = this.alwaysApproved.get(agentName);
        return rules ? Array.from(rules) : [];
    }
}
