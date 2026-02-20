/**
 * VaultZones
 * Manages vault zone configurations for permission control
 */
import yaml from 'js-yaml';

/**
 * Default zone configuration
 */
const DEFAULT_CONFIG = {
    version: 1,
    zones: []
};

export class VaultZones {
    /**
     * @param {Object} vault - Obsidian Vault
     */
    constructor(vault) {
        this.vault = vault;
        this.configPath = '.pkm-assistant/config.yaml';
        this.config = { ...DEFAULT_CONFIG };
        this.initialized = false;
    }

    /**
     * Initialize - load config from file
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            const exists = await this.vault.adapter.exists(this.configPath);
            if (exists) {
                const content = await this.vault.adapter.read(this.configPath);
                this.config = yaml.load(content) || { ...DEFAULT_CONFIG };
                console.log('[VaultZones] Loaded config with', this.config.zones?.length || 0, 'zones');
            } else {
                console.log('[VaultZones] No config file found, using defaults');
            }
            this.initialized = true;
        } catch (error) {
            console.error('[VaultZones] Error loading config:', error);
            this.config = { ...DEFAULT_CONFIG };
            this.initialized = true;
        }
    }

    /**
     * Check if path requires explicit approval
     * @param {string} path - File path to check
     * @returns {boolean}
     */
    requiresExplicitApprove(path) {
        if (!path) return false;

        for (const zone of this.config.zones || []) {
            if (zone.requires_explicit_approve && this.matchesPattern(path, zone.path)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get permissions for a specific path
     * @param {string} path - File path
     * @returns {Object|null} Zone permissions or null if no zone matches
     */
    getPermissionsForPath(path) {
        if (!path) return null;

        for (const zone of this.config.zones || []) {
            if (this.matchesPattern(path, zone.path)) {
                return zone.default_permissions || null;
            }
        }
        return null;
    }

    /**
     * Get zone info for path
     * @param {string} path - File path
     * @returns {Object|null} Zone object or null
     */
    getZoneForPath(path) {
        if (!path) return null;

        for (const zone of this.config.zones || []) {
            if (this.matchesPattern(path, zone.path)) {
                return zone;
            }
        }
        return null;
    }

    /**
     * Check if path matches a glob-like pattern
     * Supports: ** (any path), * (any segment)
     * @param {string} path - File path
     * @param {string} pattern - Glob pattern
     * @returns {boolean}
     */
    matchesPattern(path, pattern) {
        if (!pattern) return false;

        // Normalize paths
        const normalizedPath = path.replace(/\\/g, '/');
        const normalizedPattern = pattern.replace(/\\/g, '/');

        // Convert glob to regex
        let regexPattern = normalizedPattern
            .replace(/\*\*/g, '<<<DOUBLESTAR>>>')  // Placeholder for **
            .replace(/\*/g, '[^/]*')               // * matches anything except /
            .replace(/<<<DOUBLESTAR>>>/g, '.*')    // ** matches anything
            .replace(/\//g, '\\/');                // Escape slashes

        // Add anchors
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(normalizedPath);
    }

    /**
     * Get all configured zones
     * @returns {Array}
     */
    getZones() {
        return this.config.zones || [];
    }

    /**
     * Add a new zone
     * @param {Object} zone - Zone configuration
     * @returns {Promise<void>}
     */
    async addZone(zone) {
        if (!this.config.zones) {
            this.config.zones = [];
        }
        this.config.zones.push(zone);
        await this.saveConfig();
    }

    /**
     * Remove a zone by name
     * @param {string} zoneName
     * @returns {Promise<boolean>}
     */
    async removeZone(zoneName) {
        const index = this.config.zones?.findIndex(z => z.name === zoneName);
        if (index > -1) {
            this.config.zones.splice(index, 1);
            await this.saveConfig();
            return true;
        }
        return false;
    }

    /**
     * Save config to file
     * @returns {Promise<void>}
     */
    async saveConfig() {
        try {
            // Ensure directory exists
            const dir = '.pkm-assistant';
            const dirExists = await this.vault.adapter.exists(dir);
            if (!dirExists) {
                await this.vault.adapter.mkdir(dir);
            }

            const yamlContent = yaml.dump(this.config, {
                indent: 2,
                lineWidth: -1
            });
            await this.vault.adapter.write(this.configPath, yamlContent);
            console.log('[VaultZones] Config saved');
        } catch (error) {
            console.error('[VaultZones] Error saving config:', error);
            throw error;
        }
    }

    /**
     * Reload config from file
     * @returns {Promise<void>}
     */
    async reload() {
        await this.initialize();
    }
}
