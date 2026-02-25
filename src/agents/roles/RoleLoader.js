/**
 * RoleLoader — ładuje role z wbudowanych definicji + YAML z .pkm-assistant/roles/.
 * Role to konkretne specjalizacje agentów (np. "Pisarz Kreatywny", "Budowniczy Vaulta").
 * User może tworzyć własne role via Settings UI lub agent via vault_write.
 */

import { parseYaml, stringifyYaml } from 'obsidian';
import { BUILT_IN_ROLES, getBuiltInRole } from './BuiltInRoles.js';

const ROLES_PATH = '.pkm-assistant/roles';

export class RoleLoader {
    /**
     * @param {import('obsidian').Vault} vault
     */
    constructor(vault) {
        this.vault = vault;
        /** @type {Map<string, import('./BuiltInRoles.js').RoleDefinition>} */
        this._cache = new Map();
        this._loaded = false;
    }

    /**
     * Load all roles (built-in + custom from YAML).
     * @returns {Promise<Map<string, RoleDefinition>>}
     */
    async loadAll() {
        this._cache.clear();

        // 1. Built-in roles
        for (const [id, role] of Object.entries(BUILT_IN_ROLES)) {
            this._cache.set(id, { ...role });
        }

        // 2. Custom roles from .pkm-assistant/roles/*.yaml
        try {
            await this._ensureDirectory();
            const listed = await this.vault.adapter.list(ROLES_PATH);
            const yamlFiles = (listed?.files || []).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

            for (const filePath of yamlFiles) {
                try {
                    const content = await this.vault.adapter.read(filePath);
                    const data = parseYaml(content);
                    if (data && data.id && data.name) {
                        const role = this._normalizeRole(data, filePath);
                        // Custom roles override built-in with same id
                        this._cache.set(role.id, role);
                    }
                } catch (e) {
                    console.warn(`[RoleLoader] Cannot parse ${filePath}:`, e.message);
                }
            }
        } catch (e) {
            // No custom roles directory — that's fine
        }

        this._loaded = true;
        return this._cache;
    }

    /**
     * Get role by ID (from cache).
     * @param {string} id
     * @returns {RoleDefinition|null}
     */
    getRole(id) {
        if (!id) return null;
        return this._cache.get(id) || getBuiltInRole(id) || null;
    }

    /**
     * Get all roles as list for UI.
     * @param {string} [archetypeFilter] - Optional: filter by suggested archetype
     * @returns {Array<{id, name, emoji, archetype, description, isBuiltIn}>}
     */
    getRoleList(archetypeFilter) {
        const roles = [...this._cache.values()];
        const filtered = archetypeFilter
            ? roles.filter(r => r.archetype === archetypeFilter)
            : roles;
        return filtered.map(r => ({
            id: r.id,
            name: r.name,
            emoji: r.emoji,
            archetype: r.archetype,
            description: r.description,
            isBuiltIn: r.isBuiltIn || false,
        }));
    }

    /**
     * Get ALL roles (no filter).
     * @returns {Array<RoleDefinition>}
     */
    getAllRoles() {
        return [...this._cache.values()];
    }

    /**
     * Save a custom role to YAML.
     * @param {Object} roleData - Role definition
     * @returns {Promise<string>} File path
     */
    async saveRole(roleData) {
        await this._ensureDirectory();

        const id = roleData.id || this._slugify(roleData.name);
        const role = this._normalizeRole({ ...roleData, id }, null);
        role.isBuiltIn = false;

        const filePath = `${ROLES_PATH}/${id}.yaml`;
        const yaml = stringifyYaml(this._serializeRole(role));
        await this.vault.adapter.write(filePath, yaml);

        // Update cache
        role.filePath = filePath;
        this._cache.set(id, role);

        return filePath;
    }

    /**
     * Delete a custom role.
     * @param {string} id
     * @returns {Promise<boolean>}
     */
    async deleteRole(id) {
        const role = this._cache.get(id);
        if (!role || role.isBuiltIn) return false;

        const filePath = role.filePath || `${ROLES_PATH}/${id}.yaml`;
        try {
            const exists = await this.vault.adapter.exists(filePath);
            if (exists) {
                await this.vault.adapter.remove(filePath);
            }
            this._cache.delete(id);
            return true;
        } catch (e) {
            console.warn(`[RoleLoader] Cannot delete ${filePath}:`, e.message);
            return false;
        }
    }

    /**
     * Normalize raw YAML data into a clean RoleDefinition.
     * @param {Object} data
     * @param {string|null} filePath
     * @returns {RoleDefinition}
     */
    _normalizeRole(data, filePath) {
        return {
            id: data.id,
            name: data.name || data.id,
            emoji: data.emoji || '🤖',
            archetype: data.archetype || 'specialist',
            description: data.description || '',
            behavior_rules: Array.isArray(data.behavior_rules) ? data.behavior_rules : [],
            personality_template: data.personality_template || '',
            recommended_skills: Array.isArray(data.recommended_skills) ? data.recommended_skills : [],
            focus_folders: Array.isArray(data.focus_folders) ? data.focus_folders : [],
            temperature: data.temperature ?? undefined,
            default_permissions: data.default_permissions || undefined,
            isBuiltIn: data.isBuiltIn || false,
            filePath: filePath || data.filePath || null,
        };
    }

    /**
     * Serialize role for YAML output (strips internal fields).
     */
    _serializeRole(role) {
        const data = {
            id: role.id,
            name: role.name,
            emoji: role.emoji,
            archetype: role.archetype,
            description: role.description,
        };
        if (role.behavior_rules?.length > 0) data.behavior_rules = role.behavior_rules;
        if (role.personality_template) data.personality_template = role.personality_template;
        if (role.recommended_skills?.length > 0) data.recommended_skills = role.recommended_skills;
        if (role.focus_folders?.length > 0) data.focus_folders = role.focus_folders;
        if (role.temperature !== undefined) data.temperature = role.temperature;
        if (role.default_permissions) data.default_permissions = role.default_permissions;
        return data;
    }

    /**
     * Ensure .pkm-assistant/roles/ exists.
     */
    async _ensureDirectory() {
        try {
            const exists = await this.vault.adapter.exists(ROLES_PATH);
            if (!exists) {
                await this.vault.adapter.mkdir(ROLES_PATH);
            }
        } catch (e) {
            // ignore
        }
    }

    /**
     * Convert name to kebab-case ID.
     */
    _slugify(name) {
        return name
            .toLowerCase()
            .replace(/[ąàáâã]/g, 'a').replace(/[ćč]/g, 'c')
            .replace(/[ęèéêë]/g, 'e').replace(/[łl]/g, 'l')
            .replace(/[ńñ]/g, 'n').replace(/[óòôõ]/g, 'o')
            .replace(/[śš]/g, 's').replace(/[ź]/g, 'z').replace(/[żž]/g, 'z')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 50);
    }
}
