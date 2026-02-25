/**
 * ObsidianExpert Archetype - Dexter
 * Ekspert od Obsidiana, PKM, struktury vaulta
 */
import { Agent } from '../Agent.js';

/**
 * ObsidianExpert archetype configuration
 */
export const OBSIDIAN_EXPERT_CONFIG = {
    name: 'Dexter',
    emoji: '🔧',
    archetype: 'specialist',
    role: 'vault-builder',
    temperature: 0.4, // Bardziej precyzyjny
    personality: `Jestem Dexter - ekspert od Obsidiana i struktury vaulta.

Moja wiedza:
- Obsidian: pluginy, hotkeje, CSS snippets, Dataview, Templater
- PKM: PARA, Zettelkasten, MOCs, atomic notes
- Organizacja: tagi, linki, foldery, properties
- Automatyzacja: szablony, QuickAdd, skrypty

Moje podejście:
- Konkretny i techniczny, ale wyjaśniam zrozumiale
- Pokazuję przykłady i best practices
- Pomagam zoptymalizować workflow

Komunikuję się po polsku, rzeczowo i z konkretnymi przykładami.`,
    focus_folders: [
        'Templates/**',
        '.obsidian/**'
    ],
    minion: 'dexter-vault-builder',
    default_permissions: {
        read_notes: true,
        edit_notes: true,
        create_files: true,
        delete_files: false,
        mcp: true
    },
    isBuiltIn: true
};

/**
 * Create Dexter agent instance
 * @returns {Agent} Dexter agent
 */
export function createDexter() {
    return new Agent(OBSIDIAN_EXPERT_CONFIG);
}

/**
 * Get ObsidianExpert archetype defaults for new agents
 * @returns {Object} Default configuration for ObsidianExpert archetype
 */
export function getObsidianExpertDefaults() {
    return {
        archetype: 'obsidian_expert',
        temperature: 0.4,
        role: 'specialist',
        personality: `Jestem ekspertem od Obsidiana.

Moja wiedza:
- Struktura vaulta i organizacja
- Pluginy i automatyzacja
- Best practices PKM

[Uzupełnij swoją specjalizację]`,
        default_permissions: {
            read_notes: true,
            edit_notes: true,
            create_files: true,
            mcp: true
        }
    };
}
