/**
 * ArtifactManager
 * Persists artifacts (todos, plans) to disk so they survive restart.
 * Global storage: .pkm-assistant/artifacts/{readable-name}.json
 */
import { log } from '../utils/Logger.js';

const ARTIFACTS_BASE = '.pkm-assistant/artifacts';

/**
 * Convert title to a safe, human-readable filename slug.
 * Polish chars → ASCII, spaces → hyphens, special chars removed.
 */
function slugify(text) {
    const polishMap = {
        'ą':'a','ć':'c','ę':'e','ł':'l','ń':'n','ó':'o','ś':'s','ź':'z','ż':'z',
        'Ą':'a','Ć':'c','Ę':'e','Ł':'l','Ń':'n','Ó':'o','Ś':'s','Ź':'z','Ż':'z'
    };
    return text
        .split('').map(ch => polishMap[ch] || ch).join('')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 80)
        || 'artifact';
}

export class ArtifactManager {
    constructor(vault) {
        this.vault = vault;
        // Runtime index: id → slug (for fast lookup by id)
        this._slugIndex = new Map();
    }

    _basePath() {
        return ARTIFACTS_BASE;
    }

    _filePath(slug) {
        return `${this._basePath()}/${slug}.json`;
    }

    async _ensureFolder() {
        const base = this._basePath();
        try {
            const exists = await this.vault.adapter.exists(base);
            if (!exists) {
                await this.vault.adapter.mkdir(base);
            }
        } catch (e) {
            console.warn('[ArtifactManager] mkdir failed:', base, e);
        }
    }

    /**
     * Find available slug. If file exists with same id → reuse. Otherwise append _2, _3...
     */
    async _findSlug(baseSlug, artifactId) {
        // Check cached slug first
        const cached = this._slugIndex.get(artifactId);
        if (cached) return cached;

        let slug = baseSlug;
        let attempt = 1;
        while (true) {
            const path = this._filePath(slug);
            const exists = await this.vault.adapter.exists(path);
            if (!exists) return slug;
            // File exists — check if same artifact (overwrite OK)
            try {
                const content = await this.vault.adapter.read(path);
                const existing = JSON.parse(content);
                if (existing.id === artifactId) return slug;
            } catch (e) {
                // Corrupted file, claim the name
                return slug;
            }
            attempt++;
            slug = `${baseSlug}_${attempt}`;
        }
    }

    /**
     * Save artifact to disk with human-readable filename.
     * @param {object} artifact - { type, id, title, data, createdBy }
     */
    async save(artifact) {
        await this._ensureFolder();
        artifact.updatedAt = new Date().toISOString();
        if (!artifact.createdAt) artifact.createdAt = artifact.updatedAt;

        const baseSlug = slugify(artifact.title || 'artifact');
        const slug = await this._findSlug(baseSlug, artifact.id);

        // If title changed → old slug differs → delete old file
        const oldSlug = this._slugIndex.get(artifact.id);
        if (oldSlug && oldSlug !== slug) {
            const oldPath = this._filePath(oldSlug);
            try {
                const exists = await this.vault.adapter.exists(oldPath);
                if (exists) await this.vault.adapter.remove(oldPath);
            } catch (e) { /* ignore */ }
        }

        this._slugIndex.set(artifact.id, slug);
        const path = this._filePath(slug);
        await this.vault.adapter.write(path, JSON.stringify(artifact, null, 2));
        return path;
    }

    /**
     * Delete artifact by its unique id.
     */
    async deleteById(artifactId) {
        const slug = this._slugIndex.get(artifactId);
        if (slug) {
            const path = this._filePath(slug);
            try {
                const exists = await this.vault.adapter.exists(path);
                if (exists) await this.vault.adapter.remove(path);
            } catch (e) {
                console.warn('[ArtifactManager] delete failed:', path, e);
            }
            this._slugIndex.delete(artifactId);
            return;
        }
        // Fallback: scan folder
        const all = await this.listAll();
        for (const a of all) {
            if (a.id === artifactId) {
                const s = slugify(a.title || 'artifact');
                await this._deleteBySlug(s, artifactId);
                return;
            }
        }
    }

    async _deleteBySlug(slug, artifactId) {
        const path = this._filePath(slug);
        try {
            const exists = await this.vault.adapter.exists(path);
            if (exists) await this.vault.adapter.remove(path);
            if (artifactId) this._slugIndex.delete(artifactId);
        } catch (e) {
            console.warn('[ArtifactManager] delete failed:', path, e);
        }
    }

    /**
     * List ALL artifacts from disk.
     */
    async listAll() {
        const base = this._basePath();
        try {
            const exists = await this.vault.adapter.exists(base);
            if (!exists) return [];
            const listing = await this.vault.adapter.list(base);
            const artifacts = [];
            for (const filePath of (listing.files || [])) {
                if (!filePath.endsWith('.json')) continue;
                try {
                    const content = await this.vault.adapter.read(filePath);
                    const parsed = JSON.parse(content);
                    artifacts.push(parsed);
                    // Build index
                    if (parsed.id) {
                        const slug = filePath.split('/').pop().replace('.json', '');
                        this._slugIndex.set(parsed.id, slug);
                    }
                } catch (e) {
                    console.warn('[ArtifactManager] Failed to read:', filePath, e);
                }
            }
            return artifacts;
        } catch (e) {
            console.warn('[ArtifactManager] listAll failed:', e);
            return [];
        }
    }

    /**
     * Restore ALL artifacts from disk into in-memory stores.
     */
    async restoreToStores(todoStore, planStore) {
        const artifacts = await this.listAll();
        let restored = 0;
        for (const artifact of artifacts) {
            if (!artifact.data || !artifact.id) continue;
            if (artifact.type === 'todo') {
                // Ensure createdBy propagates to data
                if (artifact.createdBy && !artifact.data.createdBy) {
                    artifact.data.createdBy = artifact.createdBy;
                }
                todoStore.set(artifact.id, artifact.data);
                restored++;
            } else if (artifact.type === 'plan') {
                if (artifact.createdBy && !artifact.data.createdBy) {
                    artifact.data.createdBy = artifact.createdBy;
                }
                planStore.set(artifact.id, artifact.data);
                restored++;
            }
        }
        if (restored > 0) {
            log.info('ArtifactManager', `Przywrócono ${restored} artefaktów (global)`);
        }
        return restored;
    }

    /**
     * One-time migration: move artifacts from old per-agent folders to global folder.
     * Safe to call multiple times (idempotent).
     */
    async migrateFromAgentFolders() {
        const agentsBase = '.pkm-assistant/agents';
        try {
            const exists = await this.vault.adapter.exists(agentsBase);
            if (!exists) return 0;
            const agentListing = await this.vault.adapter.list(agentsBase);
            let migrated = 0;
            for (const agentFolder of (agentListing.folders || [])) {
                const artFolder = `${agentFolder}/artifacts`;
                const artExists = await this.vault.adapter.exists(artFolder);
                if (!artExists) continue;
                const artListing = await this.vault.adapter.list(artFolder);
                for (const filePath of (artListing.files || [])) {
                    if (!filePath.endsWith('.json')) continue;
                    try {
                        const content = await this.vault.adapter.read(filePath);
                        const artifact = JSON.parse(content);
                        // Set createdBy from old agentName field
                        if (!artifact.createdBy && artifact.agentName) {
                            artifact.createdBy = artifact.agentName;
                        }
                        if (artifact.data && !artifact.data.createdBy && artifact.createdBy) {
                            artifact.data.createdBy = artifact.createdBy;
                        }
                        await this.save(artifact);
                        // Remove old file
                        await this.vault.adapter.remove(filePath);
                        migrated++;
                    } catch (e) {
                        console.warn('[ArtifactManager] Migration failed for:', filePath, e);
                    }
                }
            }
            if (migrated > 0) {
                console.log(`[ArtifactManager] Migrated ${migrated} artifacts to global folder`);
            }
            return migrated;
        } catch (e) {
            console.warn('[ArtifactManager] Migration scan failed:', e);
            return 0;
        }
    }
}
