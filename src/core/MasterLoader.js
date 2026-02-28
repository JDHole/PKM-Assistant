/**
 * MasterLoader
 * Loads, validates, and caches master configurations from .pkm-assistant/masters/
 * Each master is a master.md file with YAML frontmatter + markdown instructions.
 * Pattern: mirrors MinionLoader (src/core/MinionLoader.js)
 */
import { parseFrontmatter, stringifyYaml } from '../utils/yamlParser.js';

const MASTERS_PATH = '.pkm-assistant/masters';

/**
 * Default starter masters created on first run
 */
const STARTER_MASTERS = [
    {
        name: 'strateg',
        folder: 'strateg',
        content: `---
name: strateg
description: Strateg planowania - analizuje, planuje, proponuje strategię
tools:
  - plan_action
  - chat_todo
  - vault_write
max_iterations: 5
min_iterations: 2
enabled: true
---

# Master Strateg - Planowanie strategiczne

## ROLA
Jesteś Master Strategiem. Dostajesz od agenta głównego zebrany kontekst
i Twoje zadanie to GŁĘBOKA ANALIZA + PLAN DZIAŁANIA.

## ZASADY
1. NIGDY nie szukaj sam - dostajesz gotowy kontekst od agenta/miniona
2. Analizuj WNIKLIWIE - porównuj, szukaj wzorców, wyciągaj wnioski
3. Twórz KONKRETNE plany z krokami (plan_action)
4. Proponuj priorytety i kolejność działań
5. Odpowiadaj po polsku, wyczerpująco

## NARZĘDZIA
### plan_action
Twórz plany z krokami i podkrokami.
\`\`\`json
{ "action": "create", "title": "Tytuł planu", "steps": ["Krok 1", "Krok 2"] }
\`\`\`

### chat_todo
Twórz listy zadań do wykonania.
\`\`\`json
{ "action": "create", "title": "Tytuł listy", "items": ["Zadanie 1", "Zadanie 2"] }
\`\`\`

### vault_write
Zapisuj wyniki analizy do notatek.
\`\`\`json
{ "path": "ścieżka/do/notatki.md", "content": "treść" }
\`\`\`

## FORMAT
- Zaczynaj od krótkiej syntezy kontekstu (3-5 zdań)
- Plan w formie kroków z uzasadnieniem
- Na końcu: rekomendacja i ryzyka
- Jeśli brakuje informacji - napisz CO brakuje, nie zgaduj`
    },
    {
        name: 'redaktor',
        folder: 'redaktor',
        content: `---
name: redaktor
description: Redaktor jakości - weryfikuje, poprawia, daje feedback
tools:
  - plan_action
  - vault_write
  - chat_todo
max_iterations: 4
min_iterations: 2
enabled: true
---

# Master Redaktor - Kontrola jakości

## ROLA
Jesteś Master Redaktorem. Dostajesz od agenta kontekst do recenzji.
Twoim zadaniem jest OCENA JAKOŚCI + FEEDBACK + POPRAWKI.

## ZASADY
1. NIGDY nie szukaj sam - pracujesz na dostarczonym kontekście
2. Oceniaj: kompletność, spójność, styl, błędy
3. Proponuj konkretne poprawki (nie ogólniki)
4. Użyj vault_write gdy poprawki dotyczą pliku
5. Odpowiadaj po polsku

## NARZĘDZIA
### plan_action
Twórz plan poprawek z krokami.
\`\`\`json
{ "action": "create", "title": "Plan poprawek", "steps": ["Poprawka 1", "Poprawka 2"] }
\`\`\`

### vault_write
Zapisuj poprawiony tekst bezpośrednio do pliku.
\`\`\`json
{ "path": "ścieżka/do/pliku.md", "content": "poprawiona treść" }
\`\`\`

### chat_todo
Twórz checklisty do weryfikacji.
\`\`\`json
{ "action": "create", "title": "Checklista", "items": ["Sprawdzić X", "Poprawić Y"] }
\`\`\`

## FORMAT
- Ocena ogólna (1 zdanie)
- Co dobre (2-3 punkty)
- Co do poprawy (konkretne uwagi z propozycjami)
- Podsumowanie: gotowe do publikacji? / wymaga poprawek?`
    }
];

export class MasterLoader {
    /**
     * @param {Object} vault - Obsidian Vault object
     */
    constructor(vault) {
        this.vault = vault;
        /** @type {Map<string, Object>} master name -> master config */
        this.cache = new Map();
    }

    /**
     * Load all masters from .pkm-assistant/masters/
     * @returns {Promise<void>}
     */
    async loadAllMasters() {
        this.cache.clear();

        try {
            const exists = await this.vault.adapter.exists(MASTERS_PATH);
            if (!exists) return;

            const listed = await this.vault.adapter.list(MASTERS_PATH);
            if (!listed?.folders) return;

            for (const folderPath of listed.folders) {
                try {
                    const master = await this._loadMasterFromFolder(folderPath);
                    if (master && master.enabled !== false) {
                        this.cache.set(master.name, master);
                    }
                } catch (e) {
                    console.warn('[MasterLoader] Error loading master from', folderPath, e);
                }
            }

            console.log(`[MasterLoader] Loaded ${this.cache.size} masters`);
        } catch (e) {
            console.error('[MasterLoader] Error loading masters:', e);
        }
    }

    /**
     * Load a single master from its folder
     * @param {string} folderPath - e.g. ".pkm-assistant/masters/strateg"
     * @returns {Promise<Object|null>}
     */
    async _loadMasterFromFolder(folderPath) {
        const masterFilePath = `${folderPath}/master.md`;

        const fileExists = await this.vault.adapter.exists(masterFilePath);
        if (!fileExists) return null;

        const raw = await this.vault.adapter.read(masterFilePath);
        if (!raw?.trim()) return null;

        const { frontmatter, content } = parseFrontmatter(raw);

        if (!frontmatter?.name || !frontmatter?.description) {
            console.warn('[MasterLoader] Master missing name or description:', masterFilePath);
            return null;
        }

        return {
            name: frontmatter.name,
            description: frontmatter.description,
            model: frontmatter.model || null,
            tools: frontmatter.tools || ['plan_action', 'chat_todo', 'vault_write'],
            max_iterations: frontmatter.max_iterations || 5,
            min_iterations: frontmatter.min_iterations || 2,
            enabled: frontmatter.enabled !== false,
            prompt: content.trim(),
            path: masterFilePath
        };
    }

    /**
     * Get a master config by name
     * @param {string} masterName
     * @returns {Object|null}
     */
    getMaster(masterName) {
        return this.cache.get(masterName) || null;
    }

    /**
     * Get all loaded masters
     * @returns {Object[]}
     */
    getAllMasters() {
        return Array.from(this.cache.values());
    }

    /**
     * Reload all masters from disk
     * @returns {Promise<void>}
     */
    async reloadMasters() {
        await this.loadAllMasters();
    }

    /**
     * Create starter masters if none exist
     * @returns {Promise<void>}
     */
    async ensureStarterMasters() {
        try {
            if (!await this.vault.adapter.exists(MASTERS_PATH)) {
                await this.vault.adapter.mkdir(MASTERS_PATH);
            }

            for (const master of STARTER_MASTERS) {
                const folderPath = `${MASTERS_PATH}/${master.folder}`;
                const filePath = `${folderPath}/master.md`;

                // Skip if already exists (idempotent)
                if (await this.vault.adapter.exists(filePath)) continue;

                if (!await this.vault.adapter.exists(folderPath)) {
                    await this.vault.adapter.mkdir(folderPath);
                }
                await this.vault.adapter.write(filePath, master.content);
            }

            console.log('[MasterLoader] Starter masters verified');
        } catch (e) {
            console.error('[MasterLoader] Error creating starter masters:', e);
        }
    }

    /**
     * Slugify name for folder names (Polish chars support)
     * @param {string} name
     * @returns {string}
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

    /**
     * Save master to disk (create or update).
     * @param {Object} masterData - { name, description, model, tools, max_iterations, min_iterations, enabled, prompt }
     * @returns {Promise<string>} File path
     */
    async saveMaster(masterData) {
        const slug = this._slugify(masterData.name);
        const folderPath = `${MASTERS_PATH}/${slug}`;
        const filePath = `${folderPath}/master.md`;

        const frontmatter = {
            name: masterData.name,
            description: masterData.description,
        };
        if (masterData.model) frontmatter.model = masterData.model;
        if (masterData.tools?.length > 0) frontmatter.tools = masterData.tools;
        frontmatter.max_iterations = masterData.max_iterations || 5;
        frontmatter.min_iterations = masterData.min_iterations || 2;
        frontmatter.enabled = masterData.enabled !== false;

        const yamlStr = stringifyYaml(frontmatter);
        const content = `---\n${yamlStr}---\n\n${masterData.prompt || ''}`;

        if (!await this.vault.adapter.exists(MASTERS_PATH)) {
            await this.vault.adapter.mkdir(MASTERS_PATH);
        }
        if (!await this.vault.adapter.exists(folderPath)) {
            await this.vault.adapter.mkdir(folderPath);
        }
        await this.vault.adapter.write(filePath, content);

        // Update cache
        this.cache.set(masterData.name, {
            name: masterData.name,
            description: masterData.description,
            model: masterData.model || null,
            tools: masterData.tools || ['plan_action', 'chat_todo', 'vault_write'],
            max_iterations: masterData.max_iterations || 5,
            min_iterations: masterData.min_iterations || 2,
            enabled: masterData.enabled !== false,
            prompt: (masterData.prompt || '').trim(),
            path: filePath
        });

        return filePath;
    }

    /**
     * Delete master from disk and cache.
     * @param {string} masterName
     * @returns {Promise<boolean>}
     */
    async deleteMaster(masterName) {
        const config = this.cache.get(masterName);
        if (!config) return false;

        const slug = this._slugify(masterName);
        const folderPath = `${MASTERS_PATH}/${slug}`;

        try {
            if (await this.vault.adapter.exists(folderPath)) {
                const filePath = `${folderPath}/master.md`;
                if (await this.vault.adapter.exists(filePath)) {
                    await this.vault.adapter.remove(filePath);
                }
                await this.vault.adapter.rmdir(folderPath, false);
            }
            this.cache.delete(masterName);
            return true;
        } catch (e) {
            console.warn('[MasterLoader] Cannot delete:', e);
            return false;
        }
    }
}
