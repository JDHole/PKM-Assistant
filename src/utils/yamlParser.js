/**
 * YAML Parser utility
 * Wrapper around js-yaml with error handling
 */
import yaml from 'js-yaml';

/**
 * Parse YAML content to JavaScript object
 * @param {string} content - YAML string to parse
 * @returns {Object|null} Parsed object or null on error
 */
export function parseYaml(content) {
    try {
        return yaml.load(content);
    } catch (error) {
        console.error('[yamlParser] Error parsing YAML:', error.message);
        return null;
    }
}

/**
 * Convert JavaScript object to YAML string
 * @param {Object} obj - Object to serialize
 * @param {Object} options - js-yaml dump options
 * @returns {string} YAML string
 */
export function stringifyYaml(obj, options = {}) {
    const defaultOptions = {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        sortKeys: false
    };

    try {
        return yaml.dump(obj, { ...defaultOptions, ...options });
    } catch (error) {
        console.error('[yamlParser] Error stringifying to YAML:', error.message);
        return '';
    }
}

/**
 * Parse YAML frontmatter from markdown content
 * @param {string} content - Markdown content with YAML frontmatter
 * @returns {Object} { frontmatter: Object|null, content: string }
 */
export function parseFrontmatter(content) {
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
 * @param {Object} agentData - Parsed agent data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateAgentSchema(agentData) {
    const errors = [];

    if (!agentData) {
        return { valid: false, errors: ['Agent data is null or undefined'] };
    }

    // Required fields
    if (!agentData.name || typeof agentData.name !== 'string') {
        errors.push('Missing or invalid "name" field (required string)');
    }

    // Optional but typed fields
    if (agentData.archetype && typeof agentData.archetype !== 'string') {
        errors.push('"archetype" must be a string');
    }

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
            for (const s of agentData.skills) {
                if (typeof s === 'string') continue; // shorthand allowed
                if (!s || typeof s !== 'object' || !s.name || typeof s.name !== 'string') {
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
            for (const m of agentData.minions) {
                if (typeof m === 'string') continue; // shorthand allowed
                if (!m || typeof m !== 'object' || !m.name || typeof m.name !== 'string') {
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
            for (const m of agentData.masters) {
                if (typeof m === 'string') continue;
                if (!m || typeof m !== 'object' || !m.name || typeof m.name !== 'string') {
                    errors.push('"masters" entries must have a "name" string');
                    break;
                }
            }
        }
    }

    if (agentData.master_enabled !== undefined && typeof agentData.master_enabled !== 'boolean') {
        errors.push('"master_enabled" must be a boolean');
    }

    if (agentData.models !== undefined) {
        if (typeof agentData.models !== 'object' || Array.isArray(agentData.models)) {
            errors.push('"models" must be an object with optional keys: main, minion, master');
        } else {
            const allowedRoles = ['main', 'minion', 'master'];
            for (const [role, cfg] of Object.entries(agentData.models)) {
                if (!allowedRoles.includes(role)) {
                    errors.push(`"models.${role}" is not valid. Allowed: ${allowedRoles.join(', ')}`);
                } else if (typeof cfg !== 'object' || Array.isArray(cfg)) {
                    errors.push(`"models.${role}" must be an object with optional "platform" and "model" fields`);
                } else {
                    if (cfg.platform && typeof cfg.platform !== 'string') errors.push(`"models.${role}.platform" must be a string`);
                    if (cfg.model && typeof cfg.model !== 'string') errors.push(`"models.${role}.model" must be a string`);
                }
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
