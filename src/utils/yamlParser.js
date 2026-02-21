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

    if (!agentData.emoji || typeof agentData.emoji !== 'string') {
        errors.push('Missing or invalid "emoji" field (required string)');
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

    if (agentData.skills && !Array.isArray(agentData.skills)) {
        errors.push('"skills" must be an array of strings');
    }

    if (agentData.minion && typeof agentData.minion !== 'string') {
        errors.push('"minion" must be a string (minion config name)');
    }

    if (agentData.minion_enabled !== undefined && typeof agentData.minion_enabled !== 'boolean') {
        errors.push('"minion_enabled" must be a boolean');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
