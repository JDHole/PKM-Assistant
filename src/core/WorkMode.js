/**
 * WorkMode — Tryby Pracy Chatu.
 *
 * 4 tryby kontrolują jakie narzędzia MCP są dostępne:
 *   rozmowa    — tylko memory + delegacja (bez vault)
 *   planowanie — czytanie + analiza (bez edycji)
 *   praca      — pełna moc (wszystkie narzędzia)
 *   kreatywny  — tworzenie treści (bez kasowania, bez listy plików)
 *
 * Tryb kaskaduje: Main → Master → Minion.
 * 3 warstwy niezależne: Tryb → Whitelist/No-Go → YOLO/Approval.
 */

import { UiIcons } from '../crystal-soul/UiIcons.js';

// ═══════════════════════════════════════════
// MODE DEFINITIONS
// ═══════════════════════════════════════════

export const MODES = {
    rozmowa: {
        id: 'rozmowa',
        label: 'Rozmowa',
        icon: UiIcons.chat(16),
        description: 'Rozmowa bez dostępu do vault',
    },
    planowanie: {
        id: 'planowanie',
        label: 'Planowanie',
        icon: UiIcons.clipboard(16),
        description: 'Analiza i planowanie — bez edycji',
    },
    praca: {
        id: 'praca',
        label: 'Praca',
        icon: UiIcons.hammer(16),
        description: 'Pełna moc — wszystkie narzędzia',
    },
    kreatywny: {
        id: 'kreatywny',
        label: 'Kreatywny',
        icon: UiIcons.sparkle(16),
        description: 'Tworzenie treści — bez kasowania',
    },
};

/** Default mode for new chats (fallback when agent/global not set). */
export const DEFAULT_MODE = 'rozmowa';

// ═══════════════════════════════════════════
// MODE → TOOL MAPPING
// ═══════════════════════════════════════════

/**
 * null = ALL tools (no filtering).
 * Array = only these tools are visible to the agent.
 * switch_mode is included in every mode (always available).
 */
export const MODE_TOOLS = {
    rozmowa: [
        'memory_search',
        'minion_task',
        'master_task',
        'switch_mode',
        'web_search',
        'ask_user',
    ],
    planowanie: [
        'vault_read',
        'vault_list',
        'vault_search',
        'memory_search',
        'memory_status',
        'skill_list',
        'minion_task',
        'master_task',
        'chat_todo',
        'plan_action',
        'switch_mode',
        'agora_read',
        'web_search',
        'ask_user',
    ],
    praca: null, // all tools
    kreatywny: [
        'vault_read',
        'vault_search',
        'vault_write',
        'skill_list',
        'skill_execute',
        'minion_task',
        'master_task',
        'chat_todo',
        'switch_mode',
        'web_search',
        'ask_user',
    ],
};

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

/**
 * Get allowed tool names for a mode.
 * @param {string} mode - Mode id
 * @returns {string[]|null} Tool name array, or null (= all tools)
 */
export function getToolsForMode(mode) {
    if (!mode || !MODE_TOOLS.hasOwnProperty(mode)) return null;
    return MODE_TOOLS[mode];
}

/**
 * Filter an array of tool definitions by mode.
 * Works with OpenAI-format tool objects: { type:'function', function:{ name } }.
 * @param {Array} tools - Tool definitions array
 * @param {string} mode - Current work mode
 * @returns {Array} Filtered tools (or original array if mode=praca/unknown)
 */
export function filterToolsByMode(tools, mode) {
    const allowed = getToolsForMode(mode);
    if (!allowed) return tools; // null = no filtering (praca)
    return tools.filter(t => {
        const name = t.function?.name || t.name;
        return allowed.includes(name);
    });
}

/**
 * Get mode metadata.
 * @param {string} mode - Mode id
 * @returns {Object|null} { id, label, icon, description }
 */
export function getModeInfo(mode) {
    return MODES[mode] || null;
}

/**
 * Get all mode definitions.
 * @returns {Object[]} Array of { id, label, icon, description }
 */
export function getAllModes() {
    return Object.values(MODES);
}

/**
 * Check if a mode id is valid.
 * @param {string} mode
 * @returns {boolean}
 */
export function isValidMode(mode) {
    return !!MODES[mode];
}
