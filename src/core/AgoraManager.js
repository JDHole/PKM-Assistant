/**
 * AgoraManager
 * Centralna baza wiedzy o użytkowniku i tablica aktywności agentów.
 *
 * Trzy filary:
 * 1. Profil użytkownika (globalny) - zainteresowania, cele, projekty, wartości
 * 2. Tablica aktywności (broadcast) - co każdy agent zrobił
 * 3. Współdzielone projekty - koordynacja między agentami
 *
 * Storage: .pkm-assistant/agora/
 */
import { log } from '../utils/Logger.js';

const BASE_PATH = '.pkm-assistant/agora';
const PROFILE_MAX_CHARS = 4000;
const ACTIVITY_MAX_ENTRIES = 30;

/** Valid profile sections */
const PROFILE_SECTIONS = [
    'kim_jestem', 'zainteresowania', 'cele', 'wartosci',
    'projekty', 'wyzwania', 'ustalenia', 'sukcesy'
];

/** Section display names (for markdown headers) */
const SECTION_HEADERS = {
    kim_jestem: 'Kim jestem',
    zainteresowania: 'Zainteresowania',
    cele: 'Cele',
    wartosci: 'Wartości',
    projekty: 'Aktualne projekty',
    wyzwania: 'Wyzwania',
    ustalenia: 'Ustalenia',
    sukcesy: 'Sukcesy'
};

/** Access level definitions */
const ACCESS_LEVELS = {
    admin: { profile: 'write', vault_map: 'write', activity: 'write', projects: 'write' },
    contributor: { profile: 'read', vault_map: 'read', activity: 'write', projects: 'write' },
    reader: { profile: 'read', vault_map: 'read', activity: 'read', projects: 'read' }
};

export class AgoraManager {
    /**
     * @param {Object} vault - Obsidian Vault object
     */
    constructor(vault) {
        this.vault = vault;
        this._accessCache = null; // Cached access.yaml
    }

    // ─────────────────────────────────────────────
    // INITIALIZATION
    // ─────────────────────────────────────────────

    async initialize() {
        await this._ensureStructure();
        log.info('Agora', 'AgoraManager initialized');
    }

    async _ensureStructure() {
        const adapter = this.vault.adapter;

        // Create folders
        for (const dir of [BASE_PATH, `${BASE_PATH}/projects`]) {
            if (!(await adapter.exists(dir))) {
                await adapter.mkdir(dir);
            }
        }

        // Create starter files if missing
        if (!(await adapter.exists(`${BASE_PATH}/profile.md`))) {
            await adapter.write(`${BASE_PATH}/profile.md`, this._starterProfile());
        }
        if (!(await adapter.exists(`${BASE_PATH}/vault_map.md`))) {
            await adapter.write(`${BASE_PATH}/vault_map.md`, this._starterVaultMap());
        }
        if (!(await adapter.exists(`${BASE_PATH}/activity.md`))) {
            await adapter.write(`${BASE_PATH}/activity.md`, '# Tablica Aktywności\n\n');
        }
        if (!(await adapter.exists(`${BASE_PATH}/access.yaml`))) {
            await adapter.write(`${BASE_PATH}/access.yaml`, this._starterAccess());
        }
    }

    _starterProfile() {
        return `# Profil Użytkownika

## Kim jestem
> Sekcja zostanie uzupełniona przez agentów w trakcie rozmów.

## Zainteresowania

## Cele

## Wartości

## Aktualne projekty

## Wyzwania

## Ustalenia

## Sukcesy
`;
    }

    _starterVaultMap() {
        return `# Globalna Mapa Vaulta

## Strefy systemowe
- **.pkm-assistant/** — system PKM Assistant (ukryty folder)
  - **agents/** — konfiguracje i pamięć agentów
  - **skills/** — centralna biblioteka umiejętności
  - **minions/** — konfiguracje minionów
  - **agora/** — wspólna baza wiedzy (ten plik)
- **.obsidian/** — konfiguracja Obsidiana (NIE MODYFIKUJ)
- **.smart-env/** — indeks embeddings

## Strefy użytkownika
> Ta sekcja zostanie uzupełniona przez agentów.

## Strefy agentowe
> Ta sekcja zostanie uzupełniona przez agentów.
`;
    }

    _starterAccess() {
        return `# Agora - Kontrola Dostępu
# Poziomy: admin (pełny zapis), contributor (aktywność + projekty), reader (tylko odczyt)

default_level: reader

agents:
  Jaskier:
    level: admin
`;
    }

    // ─────────────────────────────────────────────
    // PROFILE
    // ─────────────────────────────────────────────

    /**
     * Read full profile
     * @returns {Promise<string>}
     */
    async readProfile() {
        const path = `${BASE_PATH}/profile.md`;
        try {
            return await this.vault.adapter.read(path);
        } catch {
            return '';
        }
    }

    /**
     * Update profile - add, update, or delete a fact in a section
     * @param {string} section - Section key (kim_jestem, cele, etc.)
     * @param {string} operation - add | update | delete
     * @param {string} content - Fact to add/update
     * @param {string} [oldContent] - Old text to replace (for update operation)
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async updateProfile(section, operation, content, oldContent) {
        if (!PROFILE_SECTIONS.includes(section)) {
            return { success: false, message: `Nieznana sekcja: ${section}. Dostępne: ${PROFILE_SECTIONS.join(', ')}` };
        }

        const profile = await this.readProfile();
        const sections = this._parseProfileSections(profile);

        const header = SECTION_HEADERS[section];

        switch (operation) {
            case 'add': {
                const current = sections.get(header) || '';
                const fact = content.startsWith('- ') ? content : `- ${content}`;
                // Duplicate check
                if (current.includes(content)) {
                    return { success: false, message: 'Ten fakt już istnieje w profilu.' };
                }
                sections.set(header, current ? `${current}\n${fact}` : fact);
                break;
            }
            case 'update': {
                if (!oldContent) {
                    return { success: false, message: 'Operacja update wymaga old_content.' };
                }
                const current = sections.get(header) || '';
                if (!current.includes(oldContent)) {
                    return { success: false, message: `Nie znaleziono "${oldContent}" w sekcji ${header}.` };
                }
                sections.set(header, current.replace(oldContent, content));
                break;
            }
            case 'delete': {
                const current = sections.get(header) || '';
                const lines = current.split('\n').filter(l => !l.includes(content));
                sections.set(header, lines.join('\n'));
                break;
            }
            default:
                return { success: false, message: `Nieznana operacja: ${operation}` };
        }

        // Rebuild profile
        const rebuilt = this._rebuildProfile(sections);

        // Check size limit
        if (rebuilt.length > PROFILE_MAX_CHARS) {
            await this._archiveProfileOverflow(sections);
        }

        await this.vault.adapter.write(`${BASE_PATH}/profile.md`, rebuilt);
        log.info('Agora', `Profile updated: ${operation} in ${header}`);
        return { success: true, message: `Profil zaktualizowany: ${operation} w sekcji "${header}".` };
    }

    /**
     * Get compact profile summary for prompt injection
     * @param {number} [maxChars=2000]
     * @returns {Promise<string>}
     */
    async getProfileSummary(maxChars = 2000) {
        const profile = await this.readProfile();
        if (!profile || profile.trim().length < 20) return '';

        // Strip the main header and empty placeholder lines
        let clean = profile
            .replace(/^# Profil Użytkownika\n*/m, '')
            .replace(/^> .*$/gm, '') // Remove blockquote placeholders
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        if (clean.length <= maxChars) return clean;

        // Truncate keeping complete lines
        const lines = clean.split('\n');
        let result = '';
        for (const line of lines) {
            if ((result + '\n' + line).length > maxChars) break;
            result += (result ? '\n' : '') + line;
        }
        return result;
    }

    /**
     * Parse profile.md into sections Map<headerName, content>
     */
    _parseProfileSections(text) {
        const sections = new Map();
        const lines = text.split('\n');
        let currentHeader = null;
        let currentLines = [];

        for (const line of lines) {
            const headerMatch = line.match(/^## (.+)$/);
            if (headerMatch) {
                if (currentHeader) {
                    sections.set(currentHeader, currentLines.join('\n').trim());
                }
                currentHeader = headerMatch[1];
                currentLines = [];
            } else if (currentHeader) {
                currentLines.push(line);
            }
        }
        if (currentHeader) {
            sections.set(currentHeader, currentLines.join('\n').trim());
        }

        return sections;
    }

    /**
     * Rebuild profile.md from sections Map
     */
    _rebuildProfile(sections) {
        const parts = ['# Profil Użytkownika\n'];
        for (const key of Object.values(SECTION_HEADERS)) {
            const content = sections.get(key) || '';
            parts.push(`## ${key}`);
            if (content) {
                parts.push(content);
            }
            parts.push('');
        }
        return parts.join('\n');
    }

    /**
     * Archive oldest facts when profile exceeds size limit
     */
    async _archiveProfileOverflow(sections) {
        const archivePath = `${BASE_PATH}/profile_archive.md`;
        let archive = '';
        try {
            archive = await this.vault.adapter.read(archivePath);
        } catch { /* empty */ }

        const now = new Date().toLocaleDateString('pl-PL');
        const archived = [];

        // Remove oldest facts from volatile sections
        for (const sec of ['Aktualne projekty', 'Wyzwania', 'Kim jestem']) {
            const content = sections.get(sec) || '';
            const lines = content.split('\n').filter(l => l.trim());
            if (lines.length > 3) {
                const removed = lines.splice(0, lines.length - 3);
                archived.push(`### ${sec}\n${removed.join('\n')}`);
                sections.set(sec, lines.join('\n'));
            }
        }

        if (archived.length > 0) {
            archive += `\n\n---\n## Archiwum ${now}\n${archived.join('\n\n')}\n`;
            await this.vault.adapter.write(archivePath, archive);
            log.info('Agora', 'Profile overflow archived');
        }
    }

    // ─────────────────────────────────────────────
    // ACCESS CONTROL
    // ─────────────────────────────────────────────

    /**
     * Get access level for an agent
     * @param {string} agentName
     * @returns {Promise<{level: string, permissions: Object, projects: string[]}>}
     */
    async getAccess(agentName) {
        const config = await this._readAccessConfig();
        const agentConfig = config.agents?.[agentName];

        if (agentConfig) {
            const level = agentConfig.level || config.default_level || 'reader';
            return {
                level,
                permissions: ACCESS_LEVELS[level] || ACCESS_LEVELS.reader,
                projects: agentConfig.projects || [] // empty = all projects
            };
        }

        // Default level
        const defaultLevel = config.default_level || 'reader';
        return {
            level: defaultLevel,
            permissions: ACCESS_LEVELS[defaultLevel] || ACCESS_LEVELS.reader,
            projects: []
        };
    }

    /**
     * Check if agent can write to a section
     * @param {string} agentName
     * @param {string} section - profile | vault_map | activity | projects
     * @returns {Promise<boolean>}
     */
    async canWrite(agentName, section) {
        const access = await this.getAccess(agentName);
        return access.permissions[section] === 'write';
    }

    /**
     * Check if agent has access to a specific project
     * @param {string} agentName
     * @param {string} projectSlug
     * @returns {Promise<boolean>}
     */
    async canAccessProject(agentName, projectSlug) {
        const access = await this.getAccess(agentName);
        // Empty projects array = access to all
        if (!access.projects || access.projects.length === 0) return true;
        return access.projects.includes(projectSlug);
    }

    /**
     * Parse access.yaml (simple parser, no YAML dependency)
     */
    async _readAccessConfig() {
        if (this._accessCache) return this._accessCache;

        const path = `${BASE_PATH}/access.yaml`;
        let content = '';
        try {
            content = await this.vault.adapter.read(path);
        } catch {
            return { default_level: 'reader', agents: {} };
        }

        const config = this._parseSimpleYaml(content);
        this._accessCache = config;
        return config;
    }

    /**
     * Invalidate access cache (call after external edits)
     */
    invalidateAccessCache() {
        this._accessCache = null;
    }

    /**
     * Set access level for an agent
     * @param {string} agentName
     * @param {string} level - admin | contributor | reader
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async setAccess(agentName, level) {
        if (!ACCESS_LEVELS[level]) {
            return { success: false, message: `Nieznany poziom: ${level}` };
        }

        const config = await this._readAccessConfig();
        if (!config.agents[agentName]) {
            config.agents[agentName] = { level, projects: [] };
        } else {
            config.agents[agentName].level = level;
        }

        await this._writeAccessConfig(config);
        this._accessCache = null;
        log.info('Agora', `Access updated: ${agentName} → ${level}`);
        return { success: true, message: `Uprawnienia ${agentName} zmienione na: ${level}.` };
    }

    /**
     * Serialize and write access config back to YAML
     */
    async _writeAccessConfig(config) {
        let yaml = '# Agora - Kontrola Dostępu\n';
        yaml += '# Poziomy: admin (pełny zapis), contributor (aktywność + projekty), reader (tylko odczyt)\n\n';
        yaml += `default_level: ${config.default_level}\n\n`;
        yaml += 'agents:\n';

        for (const [name, data] of Object.entries(config.agents)) {
            yaml += `  ${name}:\n`;
            yaml += `    level: ${data.level}\n`;
            if (data.projects && data.projects.length > 0) {
                yaml += `    projects: [${data.projects.join(', ')}]\n`;
            }
        }

        await this.vault.adapter.write(`${BASE_PATH}/access.yaml`, yaml);
    }

    /**
     * Simple YAML parser for access.yaml
     * Handles: default_level, agents with level and projects
     */
    _parseSimpleYaml(text) {
        const config = { default_level: 'reader', agents: {} };
        const lines = text.split('\n');
        let currentAgent = null;
        let inProjects = false;

        for (const rawLine of lines) {
            const line = rawLine.replace(/\r$/, '');
            // Skip comments and empty lines
            if (line.trim().startsWith('#') || !line.trim()) continue;

            const defaultMatch = line.match(/^default_level:\s*(\w+)/);
            if (defaultMatch) {
                config.default_level = defaultMatch[1];
                continue;
            }

            // Agent name (2 spaces indent + Name:)
            const agentMatch = line.match(/^  (\w[\w\s]*\w|\w+):$/);
            if (agentMatch && !line.includes('level:') && !line.includes('projects:')) {
                currentAgent = agentMatch[1].trim();
                config.agents[currentAgent] = { level: 'reader', projects: [] };
                inProjects = false;
                continue;
            }

            if (currentAgent) {
                const levelMatch = line.match(/^\s+level:\s*(\w+)/);
                if (levelMatch) {
                    config.agents[currentAgent].level = levelMatch[1];
                    inProjects = false;
                    continue;
                }

                if (line.match(/^\s+projects:/)) {
                    inProjects = true;
                    // Inline array: projects: [a, b, c]
                    const inlineMatch = line.match(/projects:\s*\[([^\]]*)\]/);
                    if (inlineMatch) {
                        config.agents[currentAgent].projects = inlineMatch[1]
                            .split(',')
                            .map(s => s.trim())
                            .filter(Boolean);
                        inProjects = false;
                    }
                    continue;
                }

                if (inProjects) {
                    const itemMatch = line.match(/^\s+-\s+(.+)/);
                    if (itemMatch) {
                        config.agents[currentAgent].projects.push(itemMatch[1].trim());
                    } else {
                        inProjects = false;
                    }
                }
            }
        }

        return config;
    }

    // ─────────────────────────────────────────────
    // ACTIVITY BOARD
    // ─────────────────────────────────────────────

    /**
     * Read activity entries
     * @param {number} [limit=10]
     * @returns {Promise<Array<{id, agent, date, summary, conclusions, actions}>>}
     */
    async readActivity(limit = 10) {
        const path = `${BASE_PATH}/activity.md`;
        let content = '';
        try {
            content = await this.vault.adapter.read(path);
        } catch {
            return [];
        }

        const entries = this._parseActivityEntries(content);
        return entries.slice(-limit); // Most recent last
    }

    /**
     * Post a new activity entry
     * @param {string} agentName
     * @param {string} emoji
     * @param {string} summary - What happened in the session
     * @param {string} conclusions - Key findings/conclusions
     * @param {string} [actions] - Recommended actions for other agents
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async postActivity(agentName, emoji, summary, conclusions, actions) {
        const path = `${BASE_PATH}/activity.md`;
        let content = '';
        try {
            content = await this.vault.adapter.read(path);
        } catch { /* empty */ }

        const id = String(Date.now());
        const dateStr = new Date().toLocaleString('pl-PL');

        let block = `\n<!-- ACT:${id} -->\n`;
        block += `**Agent:** ${agentName} ${emoji || ''}\n`;
        block += `**Data:** ${dateStr}\n`;
        block += `**Sesja:** ${summary}\n`;
        if (conclusions) {
            block += `**Wnioski:** ${conclusions}\n`;
        }
        if (actions) {
            block += `**Akcje:** ${actions}\n`;
        }
        block += `<!-- /ACT:${id} -->\n`;

        content += block;
        await this.vault.adapter.write(path, content);

        // Archive if too many entries
        await this._archiveOldActivity();

        log.info('Agora', `Activity posted by ${agentName}`);
        return { success: true, message: `Wpis aktywności dodany.` };
    }

    /**
     * Archive old activity entries beyond the limit
     */
    async _archiveOldActivity() {
        const path = `${BASE_PATH}/activity.md`;
        const archivePath = `${BASE_PATH}/activity_archive.md`;

        let content = '';
        try {
            content = await this.vault.adapter.read(path);
        } catch { return; }

        const entries = this._parseActivityEntries(content);
        if (entries.length <= ACTIVITY_MAX_ENTRIES) return;

        const toArchive = entries.slice(0, entries.length - ACTIVITY_MAX_ENTRIES);
        const toKeep = entries.slice(entries.length - ACTIVITY_MAX_ENTRIES);

        // Append to archive
        let archive = '';
        try {
            archive = await this.vault.adapter.read(archivePath);
        } catch { /* empty */ }

        for (const entry of toArchive) {
            archive += `\n${entry.raw}\n`;
        }
        await this.vault.adapter.write(archivePath, archive);

        // Rewrite main file with kept entries
        let kept = '# Tablica Aktywności\n';
        for (const entry of toKeep) {
            kept += `\n${entry.raw}\n`;
        }
        await this.vault.adapter.write(path, kept);

        log.info('Agora', `Archived ${toArchive.length} old activity entries`);
    }

    /**
     * Delete an activity entry by ID
     * @param {string} activityId
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async deleteActivity(activityId) {
        const path = `${BASE_PATH}/activity.md`;
        let content = '';
        try {
            content = await this.vault.adapter.read(path);
        } catch {
            return { success: false, message: 'Nie można odczytać aktywności.' };
        }

        const regex = new RegExp(`\\n?<!-- ACT:${activityId} -->[\\s\\S]*?<!-- /ACT:${activityId} -->\\n?`, 'g');
        const newContent = content.replace(regex, '\n');
        await this.vault.adapter.write(path, newContent);
        log.info('Agora', `Activity deleted: ${activityId}`);
        return { success: true, message: 'Wpis usunięty.' };
    }

    /**
     * Update an activity entry
     * @param {string} activityId
     * @param {Object} fields - { agent, date, summary, conclusions?, actions? }
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async updateActivity(activityId, fields) {
        const path = `${BASE_PATH}/activity.md`;
        let content = '';
        try {
            content = await this.vault.adapter.read(path);
        } catch {
            return { success: false, message: 'Nie można odczytać aktywności.' };
        }

        const regex = new RegExp(`<!-- ACT:${activityId} -->[\\s\\S]*?<!-- /ACT:${activityId} -->`);
        if (!regex.test(content)) {
            return { success: false, message: 'Wpis nie znaleziony.' };
        }

        let block = `<!-- ACT:${activityId} -->\n`;
        block += `**Agent:** ${fields.agent}\n`;
        block += `**Data:** ${fields.date}\n`;
        block += `**Sesja:** ${fields.summary}\n`;
        if (fields.conclusions) block += `**Wnioski:** ${fields.conclusions}\n`;
        if (fields.actions) block += `**Akcje:** ${fields.actions}\n`;
        block += `<!-- /ACT:${activityId} -->`;

        content = content.replace(regex, block);
        await this.vault.adapter.write(path, content);
        log.info('Agora', `Activity updated: ${activityId}`);
        return { success: true, message: 'Wpis zaktualizowany.' };
    }

    /**
     * Parse activity entries from content
     */
    _parseActivityEntries(content) {
        const entries = [];
        const blockRegex = /<!-- ACT:(\d+) -->([\s\S]*?)<!-- \/ACT:\1 -->/g;
        let match;

        while ((match = blockRegex.exec(content)) !== null) {
            const id = match[1];
            const block = match[2].trim();
            const raw = match[0];

            entries.push({
                id,
                raw,
                agent: this._extractField(block, 'Agent') || 'Nieznany',
                date: this._extractField(block, 'Data') || '',
                summary: this._extractField(block, 'Sesja') || '',
                conclusions: this._extractField(block, 'Wnioski') || '',
                actions: this._extractField(block, 'Akcje') || ''
            });
        }

        return entries;
    }

    /**
     * Extract field value from markdown-formatted block
     */
    _extractField(block, fieldName) {
        const regex = new RegExp(`\\*\\*${fieldName}:\\*\\*\\s*(.+)`, 'i');
        const match = block.match(regex);
        return match ? match[1].trim() : null;
    }

    // ─────────────────────────────────────────────
    // VAULT MAP
    // ─────────────────────────────────────────────

    /**
     * Read global vault map
     * @returns {Promise<string>}
     */
    async readVaultMap() {
        const path = `${BASE_PATH}/vault_map.md`;
        try {
            return await this.vault.adapter.read(path);
        } catch {
            return '';
        }
    }

    /**
     * Update a section of the vault map
     * @param {string} sectionName - Header name to update (e.g. "Strefy użytkownika")
     * @param {string} content - New content for the section
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async updateVaultMap(sectionName, content) {
        let mapContent = await this.readVaultMap();
        if (!mapContent) {
            mapContent = this._starterVaultMap();
        }

        // Replace section content
        const sectionRegex = new RegExp(
            `(## ${this._escapeRegex(sectionName)}\\n)([\\s\\S]*?)(?=\\n## |$)`,
            'm'
        );

        if (sectionRegex.test(mapContent)) {
            mapContent = mapContent.replace(sectionRegex, `$1${content}\n\n`);
        } else {
            // Add new section at end
            mapContent += `\n## ${sectionName}\n${content}\n`;
        }

        await this.vault.adapter.write(`${BASE_PATH}/vault_map.md`, mapContent);
        log.info('Agora', `Vault map updated: ${sectionName}`);
        return { success: true, message: `Mapa vaulta zaktualizowana: sekcja "${sectionName}".` };
    }

    _escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // ─────────────────────────────────────────────
    // PROJECTS
    // ─────────────────────────────────────────────

    /**
     * Create a new shared project
     * @param {string} title
     * @param {string} description
     * @param {string[]} agents - Involved agent names
     * @param {Array<{assignee: string, task: string}>} [tasks]
     * @returns {Promise<{success: boolean, slug: string, message: string}>}
     */
    async createProject(title, description, agents, tasks, createdBy) {
        const slug = this._slugify(title);
        const path = `${BASE_PATH}/projects/${slug}.md`;

        if (await this.vault.adapter.exists(path)) {
            return { success: false, slug, message: `Projekt "${slug}" już istnieje.` };
        }

        const dateStr = new Date().toISOString().split('T')[0];
        const author = createdBy || agents[0] || 'system';
        let content = `---\ntitle: ${title}\ncreated_by: ${author}\ncreated_at: ${dateStr}\nstatus: active\nagents: [${agents.join(', ')}]\n---\n\n`;
        content += `# ${title}\n\n`;
        content += `## Opis\n${description}\n\n`;
        content += `## Zadania\n`;

        if (tasks && tasks.length > 0) {
            for (const t of tasks) {
                content += `- [ ] @${t.assignee}: ${t.task}\n`;
            }
        }

        content += `\n## Komentarze\n`;

        await this.vault.adapter.write(path, content);
        log.info('Agora', `Project created: ${slug} (agents: ${agents.join(', ')})`);
        return { success: true, slug, message: `Projekt "${title}" utworzony.` };
    }

    /**
     * Get a project by slug
     * @param {string} slug
     * @returns {Promise<{slug, title, status, agents, description, content, tasks}|null>}
     */
    async getProject(slug) {
        const path = `${BASE_PATH}/projects/${slug}.md`;
        let content = '';
        try {
            content = await this.vault.adapter.read(path);
        } catch {
            return null;
        }

        const frontmatter = this._parseFrontmatter(content);
        const tasks = this._parseProjectTasks(content);
        const description = this._parseProjectDescription(content);

        return {
            slug,
            title: frontmatter.title || slug,
            status: frontmatter.status || 'active',
            agents: frontmatter.agents || [],
            created_by: frontmatter.created_by || '',
            created_at: frontmatter.created_at || '',
            description,
            content,
            tasks
        };
    }

    /**
     * Parse project description from content
     */
    _parseProjectDescription(content) {
        const match = content.match(/## Opis\n([\s\S]*?)(?=\n## )/);
        return match ? match[1].trim() : '';
    }

    /**
     * List all projects, optionally filtered for an agent
     * @param {string} [forAgent] - Filter by agent name
     * @returns {Promise<Array<{slug, title, status, agents}>>}
     */
    async listProjects(forAgent) {
        const dir = `${BASE_PATH}/projects`;
        const projects = [];

        try {
            const listing = await this.vault.adapter.list(dir);
            const files = listing?.files || [];

            for (const filePath of files) {
                if (!filePath.endsWith('.md')) continue;
                const slug = filePath.split('/').pop().replace('.md', '');

                let content = '';
                try {
                    content = await this.vault.adapter.read(filePath);
                } catch { continue; }

                const fm = this._parseFrontmatter(content);
                const project = {
                    slug,
                    title: fm.title || slug,
                    status: fm.status || 'active',
                    agents: fm.agents || []
                };

                // Filter by agent access
                if (forAgent) {
                    const hasAccess = await this.canAccessProject(forAgent, slug);
                    const isInvolved = project.agents.includes(forAgent);
                    if (!hasAccess && !isInvolved) continue;
                }

                projects.push(project);
            }
        } catch (e) {
            log.warn('Agora', 'Failed to list projects:', e);
        }

        return projects;
    }

    /**
     * Update project status
     * @param {string} slug
     * @param {string} status - active | paused | done
     * @param {string} [note]
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async updateProjectStatus(slug, status, note) {
        const path = `${BASE_PATH}/projects/${slug}.md`;
        let content = '';
        try {
            content = await this.vault.adapter.read(path);
        } catch {
            return { success: false, message: `Projekt "${slug}" nie istnieje.` };
        }

        // Update status in frontmatter
        content = content.replace(/^status:\s*.+$/m, `status: ${status}`);

        if (note) {
            const dateStr = new Date().toLocaleString('pl-PL');
            content += `\n<!-- CMT:${Date.now()} -->\n**System** (${dateStr}): Status zmieniony na ${status}. ${note}\n<!-- /CMT:${Date.now()} -->\n`;
        }

        await this.vault.adapter.write(path, content);
        log.info('Agora', `Project ${slug} status → ${status}`);
        return { success: true, message: `Status projektu "${slug}" zmieniony na: ${status}.` };
    }

    /**
     * Add a task to a project
     * @param {string} slug
     * @param {string} assignee - Agent name
     * @param {string} task - Task description
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async addTask(slug, assignee, task) {
        const path = `${BASE_PATH}/projects/${slug}.md`;
        let content = '';
        try {
            content = await this.vault.adapter.read(path);
        } catch {
            return { success: false, message: `Projekt "${slug}" nie istnieje.` };
        }

        const taskLine = `- [ ] @${assignee}: ${task}`;

        // Insert before ## Komentarze
        const commentIdx = content.indexOf('## Komentarze');
        if (commentIdx !== -1) {
            content = content.slice(0, commentIdx) + taskLine + '\n\n' + content.slice(commentIdx);
        } else {
            content += `\n${taskLine}\n`;
        }

        await this.vault.adapter.write(path, content);
        log.info('Agora', `Task added to ${slug}: @${assignee}`);
        return { success: true, message: `Zadanie dodane do projektu "${slug}" dla @${assignee}.` };
    }

    /**
     * Complete a task (toggle checkbox)
     * @param {string} slug
     * @param {number} taskIndex - 0-based index
     * @param {string} [note]
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async completeTask(slug, taskIndex, note) {
        const path = `${BASE_PATH}/projects/${slug}.md`;
        let content = '';
        try {
            content = await this.vault.adapter.read(path);
        } catch {
            return { success: false, message: `Projekt "${slug}" nie istnieje.` };
        }

        const lines = content.split('\n');
        let taskCount = 0;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/^- \[[ x]\] @/)) {
                if (taskCount === taskIndex) {
                    lines[i] = lines[i].replace('- [ ]', '- [x]');
                    if (note) lines[i] += ` ✅ ${note}`;
                    break;
                }
                taskCount++;
            }
        }

        await this.vault.adapter.write(path, lines.join('\n'));
        log.info('Agora', `Task ${taskIndex} completed in ${slug}`);
        return { success: true, message: `Zadanie #${taskIndex + 1} w projekcie "${slug}" oznaczone jako ukończone.` };
    }

    /**
     * Uncomplete a task (toggle back to unchecked)
     * @param {string} slug
     * @param {number} taskIndex - 0-based index
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async uncompleteTask(slug, taskIndex) {
        const path = `${BASE_PATH}/projects/${slug}.md`;
        let content = '';
        try {
            content = await this.vault.adapter.read(path);
        } catch {
            return { success: false, message: `Projekt "${slug}" nie istnieje.` };
        }

        const lines = content.split('\n');
        let taskCount = 0;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/^- \[[ x]\] @/)) {
                if (taskCount === taskIndex) {
                    lines[i] = lines[i].replace('- [x]', '- [ ]').replace(/ ✅.*$/, '');
                    break;
                }
                taskCount++;
            }
        }

        await this.vault.adapter.write(path, lines.join('\n'));
        log.info('Agora', `Task ${taskIndex} uncompleted in ${slug}`);
        return { success: true, message: `Zadanie #${taskIndex + 1} odznaczone.` };
    }

    /**
     * Delete a task from a project
     * @param {string} slug
     * @param {number} taskIndex - 0-based index
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async deleteTask(slug, taskIndex) {
        const path = `${BASE_PATH}/projects/${slug}.md`;
        let content = '';
        try {
            content = await this.vault.adapter.read(path);
        } catch {
            return { success: false, message: `Projekt "${slug}" nie istnieje.` };
        }

        const lines = content.split('\n');
        let taskCount = 0;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/^- \[[ x]\] @/)) {
                if (taskCount === taskIndex) {
                    lines.splice(i, 1);
                    break;
                }
                taskCount++;
            }
        }

        await this.vault.adapter.write(path, lines.join('\n'));
        log.info('Agora', `Task ${taskIndex} deleted from ${slug}`);
        return { success: true, message: `Zadanie #${taskIndex + 1} usunięte.` };
    }

    /**
     * Update project description
     * @param {string} slug
     * @param {string} description
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async updateProjectDescription(slug, description) {
        const path = `${BASE_PATH}/projects/${slug}.md`;
        let content = '';
        try {
            content = await this.vault.adapter.read(path);
        } catch {
            return { success: false, message: `Projekt "${slug}" nie istnieje.` };
        }

        const regex = /(## Opis\n)([\s\S]*?)(?=\n## )/;
        if (regex.test(content)) {
            content = content.replace(regex, `$1${description}\n\n`);
        } else {
            // Add description section if missing
            const titleEnd = content.indexOf('\n\n', content.indexOf('# '));
            if (titleEnd !== -1) {
                content = content.slice(0, titleEnd + 2) + `## Opis\n${description}\n\n` + content.slice(titleEnd + 2);
            }
        }

        await this.vault.adapter.write(path, content);
        log.info('Agora', `Description updated for ${slug}`);
        return { success: true, message: 'Opis zaktualizowany.' };
    }

    /**
     * Add an agent to a project
     * @param {string} slug
     * @param {string} agentName
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async addAgentToProject(slug, agentName) {
        const path = `${BASE_PATH}/projects/${slug}.md`;
        let content = '';
        try {
            content = await this.vault.adapter.read(path);
        } catch {
            return { success: false, message: `Projekt "${slug}" nie istnieje.` };
        }

        const fm = this._parseFrontmatter(content);
        const agents = fm.agents || [];
        if (agents.includes(agentName)) {
            return { success: false, message: `Agent ${agentName} już jest w projekcie.` };
        }
        agents.push(agentName);

        content = content.replace(
            /^agents:\s*\[.*\]$/m,
            `agents: [${agents.join(', ')}]`
        );

        await this.vault.adapter.write(path, content);
        log.info('Agora', `Agent ${agentName} added to project ${slug}`);
        return { success: true, message: `Agent ${agentName} dodany do projektu.` };
    }

    /**
     * Remove an agent from a project
     * @param {string} slug
     * @param {string} agentName
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async removeAgentFromProject(slug, agentName) {
        const path = `${BASE_PATH}/projects/${slug}.md`;
        let content = '';
        try {
            content = await this.vault.adapter.read(path);
        } catch {
            return { success: false, message: `Projekt "${slug}" nie istnieje.` };
        }

        const fm = this._parseFrontmatter(content);
        const agents = (fm.agents || []).filter(a => a !== agentName);

        content = content.replace(
            /^agents:\s*\[.*\]$/m,
            `agents: [${agents.join(', ')}]`
        );

        await this.vault.adapter.write(path, content);
        log.info('Agora', `Agent ${agentName} removed from project ${slug}`);
        return { success: true, message: `Agent ${agentName} usunięty z projektu.` };
    }

    /**
     * Delete a project entirely
     * @param {string} slug
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async deleteProject(slug) {
        const path = `${BASE_PATH}/projects/${slug}.md`;
        try {
            if (await this.vault.adapter.exists(path)) {
                await this.vault.adapter.remove(path);
                log.info('Agora', `Project deleted: ${slug}`);
                return { success: true, message: `Projekt "${slug}" usunięty.` };
            }
            return { success: false, message: `Projekt "${slug}" nie istnieje.` };
        } catch (e) {
            return { success: false, message: `Błąd usuwania: ${e.message}` };
        }
    }

    /**
     * Add a comment to a project
     * @param {string} slug
     * @param {string} agentName
     * @param {string} comment
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async addComment(slug, agentName, comment) {
        const path = `${BASE_PATH}/projects/${slug}.md`;
        let content = '';
        try {
            content = await this.vault.adapter.read(path);
        } catch {
            return { success: false, message: `Projekt "${slug}" nie istnieje.` };
        }

        const id = String(Date.now());
        const dateStr = new Date().toLocaleString('pl-PL');
        const block = `\n<!-- CMT:${id} -->\n**${agentName}** (${dateStr}): ${comment}\n<!-- /CMT:${id} -->\n`;

        content += block;
        await this.vault.adapter.write(path, content);
        log.info('Agora', `Comment added to ${slug} by ${agentName}`);
        return { success: true, message: `Komentarz dodany do projektu "${slug}".` };
    }

    /**
     * Ping agents involved in a project via Komunikator
     * @param {string} slug
     * @param {string} fromAgent
     * @param {string} message
     * @param {Object} komunikatorManager - KomunikatorManager instance
     * @returns {Promise<{success: boolean, pinged: string[], message: string}>}
     */
    async pingAgents(slug, fromAgent, message, komunikatorManager) {
        const project = await this.getProject(slug);
        if (!project) {
            return { success: false, pinged: [], message: `Projekt "${slug}" nie istnieje.` };
        }

        const agents = (project.agents || []).filter(a => a !== fromAgent);
        if (agents.length === 0) {
            return { success: false, pinged: [], message: 'Brak innych agentów w projekcie.' };
        }

        const pinged = [];
        for (const agent of agents) {
            try {
                await komunikatorManager.writeMessage(
                    fromAgent,
                    agent,
                    `[Agora] Projekt: ${project.title}`,
                    message
                );
                pinged.push(agent);
            } catch (e) {
                log.warn('Agora', `Failed to ping ${agent}:`, e);
            }
        }

        log.info('Agora', `Pinged ${pinged.length} agents for project ${slug}`);
        return { success: true, pinged, message: `Pingowano ${pinged.length} agentów: ${pinged.join(', ')}.` };
    }

    /**
     * Parse tasks from project file
     */
    _parseProjectTasks(content) {
        const tasks = [];
        const lines = content.split('\n');

        for (const line of lines) {
            const taskMatch = line.match(/^- \[([ x])\] @(\w[\w\s]*?):\s*(.+)/);
            if (taskMatch) {
                tasks.push({
                    done: taskMatch[1] === 'x',
                    assignee: taskMatch[2].trim(),
                    task: taskMatch[3].trim()
                });
            }
        }

        return tasks;
    }

    /**
     * Parse YAML frontmatter from markdown
     */
    _parseFrontmatter(content) {
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        if (!match) return {};

        const fm = {};
        const lines = match[1].split('\n');
        for (const line of lines) {
            const kv = line.match(/^(\w[\w_]*?):\s*(.+)/);
            if (kv) {
                let value = kv[2].trim();
                // Parse inline array [a, b, c]
                const arrayMatch = value.match(/^\[([^\]]*)\]$/);
                if (arrayMatch) {
                    value = arrayMatch[1].split(',').map(s => s.trim()).filter(Boolean);
                }
                fm[kv[1]] = value;
            }
        }

        return fm;
    }

    /**
     * Slugify title for filename
     */
    _slugify(text) {
        const map = { 'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z' };
        return text
            .toLowerCase()
            .replace(/[ąćęłńóśźż]/g, c => map[c] || c)
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 60);
    }

    // ─────────────────────────────────────────────
    // PROMPT CONTEXT BUILDERS
    // ─────────────────────────────────────────────

    /**
     * Build compact context for system prompt injection
     * Target: ~700 tokens
     * @param {Object} agent - Agent instance
     * @returns {Promise<string>}
     */
    async buildPromptContext(agent) {
        const parts = [];

        // 1. Profile summary (~400 tokens)
        const profile = await this.getProfileSummary(1500);
        if (profile) {
            parts.push('## Profil użytkownika');
            parts.push(profile);
        }

        // 2. Recent activity (~200 tokens)
        const activities = await this.readActivity(3);
        if (activities.length > 0) {
            parts.push('\n## Ostatnia aktywność');
            for (const a of activities) {
                let line = `- ${a.agent} (${a.date}): ${a.summary}`;
                if (a.conclusions) line += ` → ${a.conclusions}`;
                parts.push(line);
            }
        }

        // 3. Active projects for this agent (~100 tokens)
        if (agent?.name) {
            const projects = await this.listProjects(agent.name);
            const active = projects.filter(p => p.status === 'active');
            if (active.length > 0) {
                parts.push('\n## Aktywne projekty');
                for (const p of active) {
                    parts.push(`- ${p.title} [${p.status}] (agenci: ${p.agents.join(', ')})`);
                }
            }
        }

        return parts.join('\n');
    }

    /**
     * Build fuller context for minion auto-prep
     * @param {Object} agent - Agent instance
     * @returns {Promise<string>}
     */
    async buildMinionContext(agent) {
        const parts = [];

        // 1. Full profile
        const profile = await this.getProfileSummary(3000);
        if (profile) {
            parts.push('## Profil użytkownika (z Agory)');
            parts.push(profile);
        }

        // 2. Recent activity (more entries for minion)
        const activities = await this.readActivity(5);
        if (activities.length > 0) {
            parts.push('\n## Ostatnia aktywność agentów');
            for (const a of activities) {
                let line = `- ${a.agent} (${a.date}): ${a.summary}`;
                if (a.conclusions) line += ` | Wnioski: ${a.conclusions}`;
                if (a.actions) line += ` | Akcje: ${a.actions}`;
                parts.push(line);
            }
        }

        // 3. Tasks assigned to this agent across all projects
        if (agent?.name) {
            const projects = await this.listProjects(agent.name);
            const agentTasks = [];
            for (const p of projects) {
                if (p.status !== 'active') continue;
                const full = await this.getProject(p.slug);
                if (!full) continue;
                const myTasks = (full.tasks || []).filter(
                    t => t.assignee === agent.name && !t.done
                );
                if (myTasks.length > 0) {
                    agentTasks.push(`${p.title}: ${myTasks.map(t => t.task).join('; ')}`);
                }
            }
            if (agentTasks.length > 0) {
                parts.push(`\n## Twoje zadania w projektach`);
                for (const t of agentTasks) {
                    parts.push(`- ${t}`);
                }
            }
        }

        return parts.join('\n');
    }
}
