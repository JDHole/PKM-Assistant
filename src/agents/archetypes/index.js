/**
 * Archetypes Index
 * Exports all built-in archetypes and their utilities
 */

export {
    createJaskier,
    getHumanVibeDefaults,
    HUMAN_VIBE_CONFIG
} from './HumanVibe.js';

export {
    createDexter,
    getObsidianExpertDefaults,
    OBSIDIAN_EXPERT_CONFIG
} from './ObsidianExpert.js';

export {
    createEzra,
    getAIExpertDefaults,
    AI_EXPERT_CONFIG
} from './AIExpert.js';

/**
 * Map of archetype names to their default getters
 */
export const ARCHETYPE_DEFAULTS = {
    human_vibe: () => import('./HumanVibe.js').then(m => m.getHumanVibeDefaults()),
    obsidian_expert: () => import('./ObsidianExpert.js').then(m => m.getObsidianExpertDefaults()),
    ai_expert: () => import('./AIExpert.js').then(m => m.getAIExpertDefaults())
};

/**
 * List of all archetype names
 */
export const ARCHETYPE_NAMES = ['human_vibe', 'obsidian_expert', 'ai_expert'];

/**
 * Get archetype display info
 * @returns {Array<{id: string, name: string, description: string}>}
 */
export function getArchetypeList() {
    return [
        {
            id: 'human_vibe',
            name: 'Human Vibe',
            emoji: '🎭',
            description: 'Empatyczny, ciepły asystent. Dobre dla: codziennych rozmów, organizacji, well-being.'
        },
        {
            id: 'obsidian_expert',
            name: 'Obsidian Expert',
            emoji: '🔧',
            description: 'Ekspert od Obsidiana i PKM. Dobre dla: struktury vaulta, pluginów, automatyzacji.'
        },
        {
            id: 'ai_expert',
            name: 'AI Expert',
            emoji: '🧠',
            description: 'Ekspert od AI i promptingu. Dobre dla: tworzenia agentów, workflows, optymalizacji.'
        }
    ];
}
