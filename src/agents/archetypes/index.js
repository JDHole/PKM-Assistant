/**
 * Archetypes Index
 * Exports new 4-archetype system + legacy archetype configs for Jaskier/Dexter/Ezra.
 *
 * NEW SYSTEM (sesja 41):
 * - Archetype = broad class: orchestrator, specialist, assistant, meta_agent
 * - Role = specific specialization: jaskier-mentor, vault-builder, etc.
 *
 * LEGACY (kept for built-in agent configs):
 * - HumanVibe → Jaskier (built-in), ObsidianExpert → Dexter (template), AIExpert → Ezra (template)
 */

// ── New archetype system ──
export {
    ARCHETYPES,
    getArchetypeList,
    getArchetype,
    getArchetypeDefaults,
    ARCHETYPE_IDS,
} from './Archetypes.js';

// ── Legacy: built-in agent configs (Jaskier, Dexter, Ezra) ──
export {
    createJaskier,
    getHumanVibeDefaults,
    HUMAN_VIBE_CONFIG
} from './HumanVibe.js';

export {
    getObsidianExpertDefaults,
    OBSIDIAN_EXPERT_CONFIG
} from './ObsidianExpert.js';

export {
    getAIExpertDefaults,
    AI_EXPERT_CONFIG
} from './AIExpert.js';

/**
 * Map of OLD archetype names to their default getters.
 * Used for backwards compatibility when loading old agent YAML files.
 * @deprecated Use RoleLoader + ARCHETYPES instead for new agents.
 */
export const ARCHETYPE_DEFAULTS = {
    human_vibe: () => import('./HumanVibe.js').then(m => m.getHumanVibeDefaults()),
    obsidian_expert: () => import('./ObsidianExpert.js').then(m => m.getObsidianExpertDefaults()),
    ai_expert: () => import('./AIExpert.js').then(m => m.getAIExpertDefaults())
};

/**
 * @deprecated Use ARCHETYPE_IDS from Archetypes.js
 */
export const ARCHETYPE_NAMES = ['human_vibe', 'obsidian_expert', 'ai_expert'];

/**
 * Migration map: old archetype → new role id.
 */
export const OLD_ARCHETYPE_TO_ROLE = {
    'human_vibe': 'jaskier-mentor',
    'obsidian_expert': 'vault-builder',
    'ai_expert': 'ai-expert',
};

/**
 * Old role values that are now archetype values.
 */
export const OLD_ROLE_VALUES = ['orchestrator', 'specialist', 'meta_agent'];
