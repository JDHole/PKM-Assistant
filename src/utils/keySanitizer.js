/**
 * Key Sanitizer - API key security utilities
 * Protects against key leakage through MCP tools, logs, and memory extraction.
 */

/** Paths that must NEVER be accessible through MCP vault tools */
const PROTECTED_PATHS = [
    '.smart-env',
    'smart_env.json',
    '.env',
    'data.json',
];

/**
 * Check if a path points to a protected system file.
 * @param {string} filePath - Path to check (relative to vault root)
 * @returns {boolean} true if path is protected
 */
export function isProtectedPath(filePath) {
    if (!filePath || typeof filePath !== 'string') return false;
    const normalized = filePath.replace(/\\/g, '/').toLowerCase();
    for (const p of PROTECTED_PATHS) {
        if (normalized === p.toLowerCase() ||
            normalized.startsWith(p.toLowerCase() + '/') ||
            normalized.endsWith('/' + p.toLowerCase())) {
            return true;
        }
    }
    return false;
}

/**
 * Mask an API key for safe display/logging.
 * @param {string} key - Full API key
 * @returns {string} Masked key like "sk-Tq...xR4m"
 */
export function maskKey(key) {
    if (!key || typeof key !== 'string') return '';
    if (key.length <= 8) return '••••••••';
    return key.slice(0, 4) + '...' + key.slice(-4);
}
