/**
 * AgentCreatorModal - DEPRECATED
 * Redirects to AgentProfileModal in create mode.
 * Kept for backward compatibility.
 */
import { openAgentProfile } from './AgentProfileModal.js';

/**
 * Open the agent creator (redirects to AgentProfileModal)
 * @param {Plugin} plugin
 * @param {Function} onSave - Callback after agent is created
 */
export function openAgentCreator(plugin, onSave) {
    openAgentProfile(plugin, null, onSave);
}
