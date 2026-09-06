/**
 * YAML Parser utility
 * Wrapper around js-yaml with error handling
 */
import yaml from 'js-yaml';
import { log } from './Logger.js';

/** Minimalny kształt złapanego błędu (`catch` daje `unknown`). */
type ErrLike = { message?: string };

/**
 * Wpis listy (`skills` / `minions` / `masters`) w formie obiektowej. `name` jest `unknown`,
 * bo walidator dopiero SPRAWDZA, czy to string — typ nie ma prawa tego zakładać.
 */
type NamedEntry = { name?: unknown };

/** Wpis mapy `models` w formie obiektowej — jak wyżej, pola dopiero są walidowane. */
type ModelEntry = { platform?: unknown; model?: unknown };

/**
 * Parse YAML content to JavaScript object
 * @param content - YAML string to parse
 * @returns Parsed value (`unknown` — YAML może być czymkolwiek) or null on error
 */
export function parseYaml(content: string): unknown {
    try {
        return yaml.load(content);
    } catch (error) {
        log.error('yamlParser', 'Error parsing YAML:', (error as ErrLike).message);
        return null;
    }
}

/**
 * Convert JavaScript object to YAML string
 * @param obj - Object to serialize
 * @param options - js-yaml dump options
 * @returns YAML string
 */
export function stringifyYaml(obj: unknown, options: Record<string, unknown> = {}): string {
    const defaultOptions = {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        sortKeys: false
    };

    try {
        return yaml.dump(obj, { ...defaultOptions, ...options });
    } catch (error) {
        log.error('yamlParser', 'Error stringifying to YAML:', (error as ErrLike).message);
        return '';
    }
}

/**
 * Parse YAML frontmatter from markdown content
 * @param content - Markdown content with YAML frontmatter
 */
export function parseFrontmatter(content: string): { frontmatter: unknown; content: string } {
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
        return { frontmatter: null, content: content };
    }

    const frontmatter = parseYaml(match[1]);
    return {
        frontmatter,
        content: match[2] || ''
    };
}

/**
 * Validate agent YAML against required schema
 * @param agentData - Parsed agent data. Wszystko `unknown` — walidator dopiero SPRAWDZA
 *   kształty, więc typ nie ma prawa niczego zakładać.
 */
export function validateAgentSchema(
    agentData: Record<string, unknown> | null | undefined,
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!agentData) {
        return { valid: false, errors: ['Agent data is null or undefined'] };
    }

    // Required fields
    if (!agentData.name || typeof agentData.name !== 'string') {
        errors.push('Missing or invalid "name" field (required string)');
    }

    // Optional but typed fields
    // E2.8 A1: `archetype` nie jest już walidowane (byt skasowany) — stare YAML-e z tym polem
    // przechodzą walidację i są ignorowane przez konstruktor Agenta.

    if (agentData.personality && typeof agentData.personality !== 'string') {
        errors.push('"personality" must be a string');
    }

    if (agentData.model && typeof agentData.model !== 'string') {
        errors.push('"model" must be a string');
    }

    if (agentData.temperature !== undefined) {
        if (typeof agentData.temperature !== 'number' || agentData.temperature < 0 || agentData.temperature > 2) {
            errors.push('"temperature" must be a number between 0 and 2');
        }
    }

    if (agentData.focus_folders && !Array.isArray(agentData.focus_folders)) {
        errors.push('"focus_folders" must be an array');
    }

    if (agentData.default_permissions && typeof agentData.default_permissions !== 'object') {
        errors.push('"default_permissions" must be an object');
    }

    // Skills: array of strings or {name, overrides?} objects
    if (agentData.skills !== undefined) {
        if (!Array.isArray(agentData.skills)) {
            errors.push('"skills" must be an array of strings or {name, overrides?}');
        } else {
            for (const s of agentData.skills as unknown[]) {
                if (typeof s === 'string') continue; // shorthand allowed
                if (!s || typeof s !== 'object' || !(s as NamedEntry).name || typeof (s as NamedEntry).name !== 'string') {
                    errors.push('"skills" entries must be a string or have a "name" string');
                    break;
                }
            }
        }
    }

    // Minion: old format (string) or new format (array of {name, ...})
    if (agentData.minion && typeof agentData.minion !== 'string') {
        errors.push('"minion" must be a string (old format, backward compat)');
    }
    if (agentData.minions !== undefined) {
        if (!Array.isArray(agentData.minions)) {
            errors.push('"minions" must be an array of {name, role?, default?, overrides?}');
        } else {
            for (const m of agentData.minions as unknown[]) {
                if (typeof m === 'string') continue; // shorthand allowed
                if (!m || typeof m !== 'object' || !(m as NamedEntry).name || typeof (m as NamedEntry).name !== 'string') {
                    errors.push('"minions" entries must have a "name" string');
                    break;
                }
            }
        }
    }

    if (agentData.minion_enabled !== undefined && typeof agentData.minion_enabled !== 'boolean') {
        errors.push('"minion_enabled" must be a boolean');
    }

    // Master: old format (string) or new format (array of {name, ...})
    if (agentData.master && typeof agentData.master !== 'string') {
        errors.push('"master" must be a string (old format, backward compat)');
    }
    if (agentData.masters !== undefined) {
        if (!Array.isArray(agentData.masters)) {
            errors.push('"masters" must be an array of {name, default?, overrides?}');
        } else {
            for (const m of agentData.masters as unknown[]) {
                if (typeof m === 'string') continue;
                if (!m || typeof m !== 'object' || !(m as NamedEntry).name || typeof (m as NamedEntry).name !== 'string') {
                    errors.push('"masters" entries must have a "name" string');
                    break;
                }
            }
        }
    }

    if (agentData.master_enabled !== undefined && typeof agentData.master_enabled !== 'boolean') {
        errors.push('"master_enabled" must be a boolean');
    }

    // Sprint 04 MCP_PORZADEK_v1: mcp_servers[] whitelist (strings)
    if (agentData.mcp_servers !== undefined) {
        if (!Array.isArray(agentData.mcp_servers)) {
            errors.push('"mcp_servers" must be an array of strings (server names or "*")');
        } else {
            for (const s of agentData.mcp_servers) {
                if (typeof s !== 'string') {
                    errors.push('"mcp_servers" entries must be strings');
                    break;
                }
            }
        }
    }

    // S33 Z2 (B3): walidacja `can_message[]` USUNIĘTA razem z polem (skasowane jako byt
    // w E2.8 A4/F7). Schemat jest permissive — stary YAML z tym polem przechodzi walidację
    // i ląduje w ignorowanej reszcie configu.

    if (agentData.models !== undefined) {
        // `models === null` musi wpaść tu, nie do Object.entries: `typeof null === 'object'`,
        // a puste `models:` w YAML parsuje się właśnie do null (fix znaleziska TS-1 #2).
        if (agentData.models === null || typeof agentData.models !== 'object' || Array.isArray(agentData.models)) {
            errors.push('"models" must be an object with optional keys: main, researcher, strategist');
        } else {
            const allowedRoles = ['main', 'researcher', 'strategist', 'minion', 'master'];
            // `as object`: `typeof null === 'object'`, więc `models: null` wpada TUTAJ i wywala
            // `Object.entries` — zastane zachowanie (patrz raport TS-1), nie zmieniamy go typami.
            for (const [role, cfg] of Object.entries(agentData.models as Record<string, unknown>)) {
                if (!allowedRoles.includes(role)) {
                    errors.push(`"models.${role}" is not valid. Allowed: ${allowedRoles.join(', ')}`);
                } else if (typeof cfg === 'string') {
                    // Shorthand format: "platform/model" — valid
                } else if (typeof cfg !== 'object' || Array.isArray(cfg)) {
                    errors.push(`"models.${role}" must be a string ("platform/model") or object with "platform" and "model" fields`);
                } else {
                    if ((cfg as ModelEntry).platform && typeof (cfg as ModelEntry).platform !== 'string') errors.push(`"models.${role}.platform" must be a string`);
                    if ((cfg as ModelEntry).model && typeof (cfg as ModelEntry).model !== 'string') errors.push(`"models.${role}.model" must be a string`);
                }
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
