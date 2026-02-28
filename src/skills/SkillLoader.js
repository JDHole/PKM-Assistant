/**
 * SkillLoader v2
 * Loads, validates, caches, saves and deletes skills from the central skill library.
 * Skills stored in .pkm-assistant/skills/{skill_name}/SKILL.md (standard agentskills.io)
 * with backward compat for skill.md (lowercase, v1 format).
 *
 * v2 (sesja 48): new format fields, saveSkill/deleteSkill, SKILL.md standard,
 *   allowed-tools, pre-questions, icon, tags, model override, auto-invoke control.
 */
import { parseFrontmatter, stringifyYaml } from '../utils/yamlParser.js';

const SKILLS_PATH = '.pkm-assistant/skills';

/**
 * Default starter skills created on first run
 */
const STARTER_SKILLS = [
    {
        name: 'daily-review',
        folder: 'daily-review',
        content: `---
name: daily-review
description: "Codzienny przegląd notatek, zadań i samopoczucia. Używaj gdy user prosi o: daily review, przegląd dnia, co dzisiaj, podsumowanie dnia."
category: productivity
version: 2
enabled: true
icon: "\uD83D\uDCCB"
tags: [daily, review, productivity]
allowed-tools: [vault_search, vault_read, vault_write, memory_search]
user-invocable: true
pre-questions:
  - key: dzien
    question: "Za jaki dzień robimy przegląd?"
    default: "dzisiaj"
---

# Codzienny przegląd

Okres: {{dzien}}

Wykonaj codzienny przegląd vaulta użytkownika krok po kroku:

1. **Notatki z dnia** — Użyj vault_search żeby znaleźć notatki zmodyfikowane w podanym okresie. Pokaż listę.
2. **Zadania** — Szukaj notatek z zadaniami (Tasks, TODO, Daily). Przeczytaj je vault_read.
3. **Podsumowanie** — Powiedz co zrobione (✅), co w toku (🔄), co zaplanowane (📋).
4. **Samopoczucie** — Zapytaj usera jak się czuje i co było najlepsze w dniu.
5. **Priorytety** — Pomóż ustalić 1-3 priorytety na jutro.
6. **Zapis** — Zaproponuj zapisanie podsumowania do notatki dziennej.

Bądź ciepły i motywujący. Doceniaj postępy, nawet małe.`
    },
    {
        name: 'vault-organization',
        folder: 'vault-organization',
        content: `---
name: vault-organization
description: "Analiza struktury vaulta i propozycje lepszej organizacji. Używaj gdy user prosi o: porządki, organizacja, struktura folderów, posprzątaj vault."
category: organization
version: 2
enabled: true
icon: "\uD83D\uDDC2\uFE0F"
tags: [organization, vault, structure]
allowed-tools: [vault_list, vault_read, vault_write, vault_search]
user-invocable: true
---

# Organizacja vaulta

Pomóż użytkownikowi uporządkować vault krok po kroku:

1. **Przegląd struktury** — Użyj vault_list żeby zobaczyć główne foldery i pliki.
2. **Analiza** — Zidentyfikuj:
   - Pliki bez folderu (luźne w root)
   - Foldery z jednym plikiem (niepotrzebne zagnieżdżenie)
   - Potencjalne duplikaty (podobne nazwy)
   - Notatki bez linków (osierocone)
3. **Propozycje** — Zaproponuj konkretne zmiany:
   - Przeniesienie plików do odpowiednich folderów
   - Połączenie duplikatów
   - Nowe foldery jeśli potrzebne
4. **Wykonanie** — Po zatwierdzeniu przez usera, użyj vault_write żeby przenosić pliki.

Pytaj o każdą zmianę przed wykonaniem. User musi zatwierdzić.`
    },
    {
        name: 'note-from-idea',
        folder: 'note-from-idea',
        content: `---
name: note-from-idea
description: "Rozwijanie luźnego pomysłu w pełną notatkę ze strukturą. Używaj gdy user mówi: mam pomysł, zapisz ideę, rozwiń myśl, stwórz notatkę z tego."
category: writing
version: 2
enabled: true
icon: "\uD83D\uDCA1"
tags: [writing, ideas, notes]
allowed-tools: [vault_search, vault_read, vault_write]
user-invocable: true
pre-questions:
  - key: pomysl
    question: "Jaki pomysł chcesz rozwinąć?"
    default: ""
  - key: folder
    question: "W jakim folderze zapisać notatkę?"
    default: ""
---

# Notatka z pomysłu

Pomysł: {{pomysl}}
Docelowy folder: {{folder}}

Pomóż użytkownikowi rozwinąć luźny pomysł w kompletną notatkę:

1. **Zbieranie** — Jeśli pomysł nie jest podany, zapytaj usera. Dopytuj o szczegóły, kontekst, powiązania.
2. **Struktura** — Zaproponuj strukturę notatki:
   - Tytuł
   - Krótkie streszczenie (1-2 zdania)
   - Rozwinięcie tematu (sekcje)
   - Powiązane notatki (linki [[...]])
   - Tagi
3. **Kontekst** — Użyj vault_search żeby znaleźć powiązane notatki w vaultcie. Zaproponuj linki.
4. **Zapis** — Użyj vault_write żeby stworzyć gotową notatkę. Zapytaj usera o lokalizację (folder) jeśli nie podana.

Format notatki dopasuj do stylu istniejących notatek usera.`
    },
    {
        name: 'weekly-review',
        folder: 'weekly-review',
        content: `---
name: weekly-review
description: "Podsumowanie tygodnia z planowaniem następnego. Używaj gdy user prosi o: weekly review, przegląd tygodnia, co w tym tygodniu, podsumuj tydzień."
category: productivity
version: 2
enabled: true
icon: "\uD83D\uDCC6"
tags: [weekly, review, planning, productivity]
allowed-tools: [vault_search, vault_read, vault_write, memory_search]
user-invocable: true
pre-questions:
  - key: okres
    question: "Za jaki okres robimy przegląd?"
    default: "ostatni tydzień"
---

# Przegląd tygodniowy

Okres: {{okres}}

Wykonaj tygodniowy przegląd vaulta użytkownika:

1. **Co się wydarzyło** — Użyj vault_search żeby znaleźć notatki z podanego okresu. Podsumuj aktywność.
2. **Osiągnięcia** — Wylistuj co user zrobił (✅). Doceń postępy.
3. **W toku** — Co jest niedokończone (🔄)? Czy coś wymaga uwagi?
4. **Wyzwania** — Co było trudne? Czego user się nauczył?
5. **Następny tydzień** — Pomóż ustalić 3-5 celów na przyszły tydzień.
6. **Zapis** — Zaproponuj zapisanie podsumowania tygodniowego.

Bądź refleksyjny. Pomagaj zobaczyć szerszy obraz, nie tylko listę tasków.`
    },
    {
        name: 'create-agent',
        folder: 'create-agent',
        content: `---
name: create-agent
description: "Tworzenie nowego agenta krok po kroku przez rozmowę. Używaj gdy user prosi o: nowy agent, stwórz agenta, chcę nowego pomocnika."
category: system
version: 2
enabled: true
icon: "\uD83E\uDD16"
tags: [system, agent, setup]
allowed-tools: [vault_write, vault_list]
user-invocable: true
disable-model-invocation: true
---

# Tworzenie agenta

Poprowadź użytkownika przez stworzenie nowego agenta krok po kroku:

1. **Kim ma być agent?** — Zapytaj o ogólny cel i charakter agenta. Jaką rolę ma pełnić?
2. **Nazwa i emoji** — Zaproponuj kilka opcji nazwy i emoji. User wybiera.
3. **Archetyp** — Wyjaśnij 3 dostępne archetypy i pomóż wybrać:
   - 🎭 Human Vibe — empatyczny, ciepły, do rozmów i organizacji
   - 🔮 Ekspert Obsidiana — techniczny, do zarządzania vaultem
   - 🧠 Ekspert AI — analityczny, do promptów i strategii AI
4. **Osobowość** — Na podstawie odpowiedzi usera napisz opis osobowości (3-5 zdań + lista cech).
5. **Temperatura** — Wyjaśnij skalę (0=precyzyjny, 1=kreatywny) i zaproponuj wartość.
6. **Focus folders** — Zapytaj czy agent ma się skupiać na konkretnych folderach.
7. **Uprawnienia** — Zapytaj jaki poziom dostępu:
   - Bezpieczny (tylko odczyt)
   - Standardowy (odczyt + zapis za zgodą)
   - Pełny (wszystko)
8. **Podsumowanie** — Pokaż podsumowanie konfiguracji i poproś o zatwierdzenie.
9. **Zapis** — Po zatwierdzeniu utwórz plik YAML agenta:

\\\`\\\`\\\`
vault_write(".pkm-assistant/agents/{nazwa}/agent.yaml", "---
name: {nazwa}
emoji: {emoji}
archetype: {archetyp}
role: specialist
temperature: {temp}
personality: |
  {osobowość}
focus_folders:
  - {folder1}
skills: []
minion: null
default_permissions:
  read_notes: true
  edit_notes: false
  create_files: false
---")
\\\`\\\`\\\`

10. **Gotowe!** — Powiedz userowi że agent jest stworzony i może go wybrać w panelu agentów.

Bądź pomocny i cierpliwy. User może nie znać terminów technicznych.`
    }
];

export class SkillLoader {
    /**
     * @param {Object} vault - Obsidian Vault object
     */
    constructor(vault) {
        this.vault = vault;
        /** @type {Map<string, Object>} skill name -> skill data */
        this.cache = new Map();
    }

    /**
     * Load all skills from the central library (.pkm-assistant/skills/)
     * @returns {Promise<void>}
     */
    async loadAllSkills() {
        this.cache.clear();

        try {
            const exists = await this.vault.adapter.exists(SKILLS_PATH);
            if (!exists) return;

            const listed = await this.vault.adapter.list(SKILLS_PATH);
            if (!listed?.folders) return;

            for (const folderPath of listed.folders) {
                try {
                    const skill = await this._loadSkillFromFolder(folderPath);
                    if (skill && skill.enabled !== false) {
                        this.cache.set(skill.name, skill);
                    }
                } catch (e) {
                    console.warn('[SkillLoader] Error loading skill from', folderPath, e);
                }
            }

            console.log(`[SkillLoader] Loaded ${this.cache.size} skills`);
        } catch (e) {
            console.error('[SkillLoader] Error loading skills:', e);
        }
    }

    /**
     * Load a single skill from its folder.
     * Looks for SKILL.md (standard) first, falls back to skill.md (v1 compat).
     * @param {string} folderPath - e.g. ".pkm-assistant/skills/daily-review"
     * @returns {Promise<Object|null>}
     */
    async _loadSkillFromFolder(folderPath) {
        // Standard: SKILL.md first, fallback: skill.md (v1)
        let skillFilePath = `${folderPath}/SKILL.md`;
        let fileExists = await this.vault.adapter.exists(skillFilePath);

        if (!fileExists) {
            skillFilePath = `${folderPath}/skill.md`;
            fileExists = await this.vault.adapter.exists(skillFilePath);
        }

        if (!fileExists) return null;

        const raw = await this.vault.adapter.read(skillFilePath);
        if (!raw?.trim()) return null;

        const { frontmatter, content } = parseFrontmatter(raw);

        if (!frontmatter?.name || !frontmatter?.description) {
            console.warn('[SkillLoader] Skill missing name or description:', skillFilePath);
            return null;
        }

        // Parse pre-questions (array of {key, question, default, options?})
        let preQuestions = null;
        if (Array.isArray(frontmatter['pre-questions'])) {
            preQuestions = frontmatter['pre-questions']
                .filter(q => q && q.key && q.question)
                .map(q => ({
                    key: q.key,
                    question: q.question,
                    default: q.default || '',
                    ...(q.options ? { options: q.options } : {})
                }));
            if (preQuestions.length === 0) preQuestions = null;
        }

        // Parse allowed-tools (array of strings or space-separated string)
        let allowedTools = null;
        const rawTools = frontmatter['allowed-tools'];
        if (Array.isArray(rawTools)) {
            allowedTools = rawTools.filter(t => typeof t === 'string');
        } else if (typeof rawTools === 'string') {
            allowedTools = rawTools.split(/[\s,]+/).filter(Boolean);
        }

        // Parse tags (array of strings or comma-separated string)
        let tags = null;
        if (Array.isArray(frontmatter.tags)) {
            tags = frontmatter.tags.filter(t => typeof t === 'string');
        } else if (typeof frontmatter.tags === 'string') {
            tags = frontmatter.tags.split(/[\s,]+/).filter(Boolean);
        }

        return {
            name: frontmatter.name,
            description: frontmatter.description,
            category: frontmatter.category || 'general',
            version: frontmatter.version || 1,
            enabled: frontmatter.enabled !== false,
            prompt: content.trim(),
            path: skillFilePath,
            // v2 fields
            icon: frontmatter.icon || null,
            tags: tags,
            model: frontmatter.model || null,
            allowedTools: allowedTools,
            argumentHint: frontmatter['argument-hint'] || null,
            disableModelInvocation: frontmatter['disable-model-invocation'] === true,
            userInvocable: frontmatter['user-invocable'] !== false, // default true
            preQuestions: preQuestions,
            // Supporting files awareness (checked below)
            hasTemplate: false,
            hasReferences: false,
            hasExamples: false,
            folderPath: folderPath,
        };

        // Check supporting files
        try {
            if (await this.vault.adapter.exists(`${folderPath}/template.md`)) skill.hasTemplate = true;
            if (await this.vault.adapter.exists(`${folderPath}/references`)) skill.hasReferences = true;
            if (await this.vault.adapter.exists(`${folderPath}/examples`)) skill.hasExamples = true;
        } catch { /* ignore errors on optional files */ }

        return skill;
    }

    /**
     * Get a specific skill by name
     * @param {string} skillName
     * @returns {Object|null}
     */
    getSkill(skillName) {
        return this.cache.get(skillName) || null;
    }

    /**
     * Get all loaded skills
     * @returns {Object[]}
     */
    getAllSkills() {
        return Array.from(this.cache.values());
    }

    /**
     * Get skills assigned to a specific agent
     * @param {string[]} skillNames - list of skill names from agent config
     * @returns {Object[]}
     */
    getSkillsForAgent(skillNames) {
        if (!skillNames || skillNames.length === 0) return [];
        return skillNames
            .map(name => this.cache.get(name))
            .filter(Boolean);
    }

    /**
     * Reload all skills from disk
     * @returns {Promise<void>}
     */
    async reloadSkills() {
        await this.loadAllSkills();
    }

    // ─── CRUD (v2) ──────────────────────────────────────────────

    /**
     * Save skill to disk (create or update).
     * Writes as SKILL.md (standard format).
     * @param {Object} skillData - skill object from SkillEditorModal
     * @returns {Promise<string>} File path
     */
    async saveSkill(skillData) {
        const slug = this._slugify(skillData.name);
        const folderPath = `${SKILLS_PATH}/${slug}`;
        const filePath = `${folderPath}/SKILL.md`;

        // Build frontmatter
        const frontmatter = {
            name: skillData.name,
            description: skillData.description,
        };

        // Standard fields
        if (skillData.allowedTools?.length > 0) frontmatter['allowed-tools'] = skillData.allowedTools;
        if (skillData.argumentHint) frontmatter['argument-hint'] = skillData.argumentHint;
        if (skillData.disableModelInvocation) frontmatter['disable-model-invocation'] = true;
        if (skillData.userInvocable === false) frontmatter['user-invocable'] = false;

        // Our extensions
        if (skillData.category && skillData.category !== 'general') frontmatter.category = skillData.category;
        if (skillData.tags?.length > 0) frontmatter.tags = skillData.tags;
        frontmatter.version = skillData.version || 1;
        frontmatter.enabled = skillData.enabled !== false;
        if (skillData.icon) frontmatter.icon = skillData.icon;
        if (skillData.model) frontmatter.model = skillData.model;
        if (skillData.preQuestions?.length > 0) frontmatter['pre-questions'] = skillData.preQuestions;

        const yamlStr = stringifyYaml(frontmatter);
        const content = `---\n${yamlStr}---\n\n${skillData.prompt || ''}`;

        // Ensure folders exist
        if (!await this.vault.adapter.exists(SKILLS_PATH)) {
            await this.vault.adapter.mkdir(SKILLS_PATH);
        }
        if (!await this.vault.adapter.exists(folderPath)) {
            await this.vault.adapter.mkdir(folderPath);
        }

        // Remove old skill.md (v1) if SKILL.md is being written
        const oldPath = `${folderPath}/skill.md`;
        if (await this.vault.adapter.exists(oldPath)) {
            try { await this.vault.adapter.remove(oldPath); } catch { /* ignore */ }
        }

        await this.vault.adapter.write(filePath, content);

        // Update cache
        this.cache.set(skillData.name, {
            name: skillData.name,
            description: skillData.description,
            category: skillData.category || 'general',
            version: skillData.version || 1,
            enabled: skillData.enabled !== false,
            prompt: (skillData.prompt || '').trim(),
            path: filePath,
            icon: skillData.icon || null,
            tags: skillData.tags || null,
            model: skillData.model || null,
            allowedTools: skillData.allowedTools || null,
            argumentHint: skillData.argumentHint || null,
            disableModelInvocation: skillData.disableModelInvocation === true,
            userInvocable: skillData.userInvocable !== false,
            preQuestions: skillData.preQuestions || null,
            hasTemplate: false,
            hasReferences: false,
            hasExamples: false,
        });

        return filePath;
    }

    /**
     * Delete skill from disk and cache.
     * @param {string} skillName
     * @returns {Promise<boolean>}
     */
    async deleteSkill(skillName) {
        const config = this.cache.get(skillName);
        if (!config) return false;

        const slug = this._slugify(skillName);
        const folderPath = `${SKILLS_PATH}/${slug}`;

        try {
            if (await this.vault.adapter.exists(folderPath)) {
                // Remove SKILL.md and skill.md
                for (const fname of ['SKILL.md', 'skill.md']) {
                    const fp = `${folderPath}/${fname}`;
                    if (await this.vault.adapter.exists(fp)) {
                        await this.vault.adapter.remove(fp);
                    }
                }
                // Remove template.md if exists
                const tpl = `${folderPath}/template.md`;
                if (await this.vault.adapter.exists(tpl)) {
                    await this.vault.adapter.remove(tpl);
                }
                // Try to remove folder (fails silently if non-empty — references/ etc.)
                try { await this.vault.adapter.rmdir(folderPath, false); } catch { /* ok */ }
            }
            this.cache.delete(skillName);
            return true;
        } catch (e) {
            console.warn('[SkillLoader] Cannot delete skill:', e);
            return false;
        }
    }

    /**
     * Slugify name for folder names (Polish chars support).
     * Copied from MinionLoader pattern.
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
     * Create starter skills if the skills folder is empty or doesn't exist
     * @returns {Promise<void>}
     */
    async ensureStarterSkills() {
        try {
            const exists = await this.vault.adapter.exists(SKILLS_PATH);

            if (exists) {
                const listed = await this.vault.adapter.list(SKILLS_PATH);
                if (listed?.folders?.length > 0) {
                    return; // skills already exist
                }
            }

            // Create skills folder
            if (!exists) {
                await this.vault.adapter.mkdir(SKILLS_PATH);
            }

            // Write each starter skill as SKILL.md (v2 standard)
            for (const skill of STARTER_SKILLS) {
                const folderPath = `${SKILLS_PATH}/${skill.folder}`;
                const filePath = `${folderPath}/SKILL.md`;

                await this.vault.adapter.mkdir(folderPath);
                await this.vault.adapter.write(filePath, skill.content);
            }

            console.log(`[SkillLoader] Created ${STARTER_SKILLS.length} starter skills`);
        } catch (e) {
            console.error('[SkillLoader] Error creating starter skills:', e);
        }
    }
}
