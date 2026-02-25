/**
 * AccessGuard — Whitelist-based access control for agents.
 *
 * Filozofia: agent widzi TYLKO foldery/pliki z focusFolders.
 * Reszta vaulta NIE ISTNIEJE. Puste focusFolders = unrestricted (backward compat).
 *
 * .pkm-assistant/ obsługiwany osobno — memory tools (memory_search, memory_update)
 * mają własny dostęp, vault tools NIE sięgają do .pkm-assistant/.
 * Wyjątek: playbook.md i vault_map.md agenta — zawsze widoczne.
 */

import { log } from '../utils/Logger.js';

export class AccessGuard {

    /** @type {string[]} No-Go folders — set once at plugin init */
    static _noGoFolders = [];

    /**
     * Set global No-Go folders (called at plugin load and from settings).
     * @param {string[]} folders
     */
    static setNoGoFolders(folders) {
        AccessGuard._noGoFolders = (folders || []).map(f => f.replace(/\\/g, '/').replace(/\/$/, ''));
    }

    /**
     * Check if a path is in the No-Go zone (blocked for ALL agents, even unrestricted).
     */
    static _isNoGo(targetPath) {
        if (!targetPath || AccessGuard._noGoFolders.length === 0) return false;
        const norm = targetPath.replace(/\\/g, '/');
        return AccessGuard._noGoFolders.some(ng =>
            norm === ng || norm.startsWith(ng + '/')
        );
    }

    /**
     * Check if agent can access a given path.
     * @param {Object} agent - Agent object with focusFolders
     * @param {string} targetPath - path being accessed
     * @param {'read'|'write'} accessLevel - required access level
     * @returns {{allowed: boolean, reason: string}}
     */
    static checkAccess(agent, targetPath, accessLevel = 'read') {
        // No-Go check — blocks EVERYONE
        if (AccessGuard._isNoGo(targetPath)) {
            return { allowed: false, reason: `Strefa No-Go: "${targetPath}" jest całkowicie niedostępna` };
        }

        const folders = agent?.focusFolders;

        // Empty focusFolders = unrestricted (backward compat)
        if (!folders || folders.length === 0) {
            return { allowed: true, reason: 'unrestricted' };
        }

        // Guidance mode = agent sees whole vault (focus folders are just hints, not restrictions)
        if (agent?.permissions?.guidance_mode === true) {
            return { allowed: true, reason: 'guidance-mode' };
        }

        // No path provided = allow (memory_search, skill_list etc.)
        if (!targetPath) {
            return { allowed: true, reason: 'no-path' };
        }

        // .pkm-assistant/ paths — special handling
        if (targetPath.startsWith('.pkm-assistant/') || targetPath.startsWith('.pkm-assistant\\')) {
            return AccessGuard._checkPkmPath(agent, targetPath);
        }

        // Normalize entries
        const entries = AccessGuard._normalizeEntries(folders);

        // Check if path matches any whitelist entry
        for (const entry of entries) {
            if (AccessGuard._matchesEntry(targetPath, entry.path)) {
                // Check access level
                if (accessLevel === 'write' && entry.access === 'read') {
                    return {
                        allowed: false,
                        reason: `Folder "${entry.path}" jest tylko do odczytu dla tego agenta`
                    };
                }
                return { allowed: true, reason: `whitelist: ${entry.path}` };
            }
        }

        // Path not in whitelist = invisible
        log.debug('AccessGuard', `BLOCKED: ${agent.name} → ${targetPath} (poza whitelistą)`);
        return {
            allowed: false,
            reason: `Ścieżka "${targetPath}" jest poza obszarem roboczym agenta`
        };
    }

    /**
     * Filter a list of results to only include whitelisted paths.
     * Used by vault_list and vault_search to make non-whitelisted files invisible.
     * @param {Object} agent
     * @param {Array} results
     * @param {Function} pathExtractor - function to get path from result item
     * @returns {Array} filtered results
     */
    static filterResults(agent, results, pathExtractor = (r) => r.path || r) {
        if (!results || !Array.isArray(results)) return results;

        // Always filter No-Go, even for unrestricted agents
        if (AccessGuard._noGoFolders.length > 0) {
            results = results.filter(item => !AccessGuard._isNoGo(pathExtractor(item)));
        }

        const folders = agent?.focusFolders;
        // Guidance mode or no folders = only No-Go filtering
        if (!folders || folders.length === 0 || agent?.permissions?.guidance_mode === true) {
            return results;
        }

        const entries = AccessGuard._normalizeEntries(folders);

        return results.filter(item => {
            const p = pathExtractor(item);
            if (!p) return true;

            // .pkm-assistant/ handled by _checkPkmPath
            if (p.startsWith('.pkm-assistant/')) {
                return AccessGuard._checkPkmPath(agent, p).allowed;
            }

            return entries.some(e => AccessGuard._matchesEntry(p, e.path));
        });
    }

    // ─── Private helpers ───────────────────────────────────

    /**
     * Handle .pkm-assistant/ paths.
     * Agent always sees own folder + shared system areas.
     */
    static _checkPkmPath(agent, path) {
        // Agent's own folder: always allowed
        const safeName = (agent.name || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
        const ownPrefix = `.pkm-assistant/agents/${safeName}/`;
        if (path.startsWith(ownPrefix)) {
            return { allowed: true, reason: 'own-agent-folder' };
        }

        // Shared areas: always allowed
        const sharedPrefixes = [
            '.pkm-assistant/komunikator/',
            '.pkm-assistant/skills/',
            '.pkm-assistant/agora/',
            '.pkm-assistant/artifacts/',
            '.pkm-assistant/minions/',
            '.pkm-assistant/roles/',
        ];
        for (const prefix of sharedPrefixes) {
            if (path.startsWith(prefix)) {
                return { allowed: true, reason: 'shared-pkm-area' };
            }
        }

        // Config files at root level
        if (path === '.pkm-assistant/config.yaml') {
            return { allowed: true, reason: 'pkm-config' };
        }

        // Other .pkm-assistant paths (other agents' folders etc.) — block
        return {
            allowed: false,
            reason: `Brak dostępu do "${path}" — to nie jest Twój obszar`
        };
    }

    /**
     * Normalize focusFolders entries to {path, access} format.
     * Handles both old string[] and new {path, access}[] formats.
     */
    static _normalizeEntries(folders) {
        if (!folders || !Array.isArray(folders)) return [];
        return folders.map(f => {
            if (typeof f === 'string') {
                return { path: f, access: 'readwrite' };
            }
            return { path: f.path || f, access: f.access || 'readwrite' };
        });
    }

    /**
     * Check if a file path matches a whitelist entry pattern.
     * Supports:
     * - Exact folder: "Projects" matches "Projects/file.md" and "Projects/sub/file.md"
     * - Glob with **: "Projects/**" matches any depth inside
     * - Glob with *: "Projects/*" matches one level only
     * - Exact file: "Notes/todo.md" matches exactly
     *
     * Pattern logic based on VaultZones.matchesPattern().
     */
    static _matchesEntry(filePath, pattern) {
        if (!pattern || !filePath) return false;

        const normalizedPath = filePath.replace(/\\/g, '/');
        let normalizedPattern = pattern.replace(/\\/g, '/').replace(/\/$/, ''); // trim trailing slash

        // Plain folder name (no glob, no dot in last segment) → auto-add /**
        if (!normalizedPattern.includes('*')) {
            const lastSegment = normalizedPattern.split('/').pop();
            if (!lastSegment.includes('.')) {
                // It's a folder — match itself and everything inside
                // "Projects" should match "Projects/file.md" and "Projects" itself
                const folderRegex = new RegExp(
                    `^${AccessGuard._escapeRegex(normalizedPattern)}(\\/.*)?$`
                );
                return folderRegex.test(normalizedPath);
            }
            // It's a file — exact match
            return normalizedPath === normalizedPattern;
        }

        // Glob pattern — convert to regex (same logic as VaultZones)
        let regexStr = normalizedPattern
            .replace(/\*\*/g, '<<<DOUBLESTAR>>>')
            .replace(/\*/g, '[^/]*')
            .replace(/<<<DOUBLESTAR>>>/g, '.*')
            .replace(/\//g, '\\/');

        const regex = new RegExp(`^${regexStr}$`);
        return regex.test(normalizedPath);
    }

    /**
     * Escape special regex characters in a string.
     */
    static _escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
