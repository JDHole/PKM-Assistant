/**
 * SkillLoader
 * Loads, validates, and caches skills from the central skill library.
 * Skills are stored in .pkm-assistant/skills/{skill_name}/skill.md
 */
import { parseFrontmatter } from '../utils/yamlParser.js';

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
description: Codzienny przeglad notatek, zadan i samopoczucia
category: productivity
version: 1
enabled: true
---

# Codzienny przegląd

Wykonaj codzienny przegląd vaulta użytkownika krok po kroku:

1. **Notatki z dzisiaj** — Użyj vault_search żeby znaleźć notatki zmodyfikowane dzisiaj. Pokaż listę.
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
description: Analiza struktury vaulta i propozycje lepszej organizacji
category: organization
version: 1
enabled: true
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
description: Rozwijanie luźnego pomysłu w pełną notatkę ze strukturą
category: writing
version: 1
enabled: true
---

# Notatka z pomysłu

Pomóż użytkownikowi rozwinąć luźny pomysł w kompletną notatkę:

1. **Zbieranie** — Zapytaj usera o pomysł. Dopytuj o szczegóły, kontekst, powiązania.
2. **Struktura** — Zaproponuj strukturę notatki:
   - Tytuł
   - Krótkie streszczenie (1-2 zdania)
   - Rozwinięcie tematu (sekcje)
   - Powiązane notatki (linki [[...]])
   - Tagi
3. **Kontekst** — Użyj vault_search żeby znaleźć powiązane notatki w vaultcie. Zaproponuj linki.
4. **Zapis** — Użyj vault_write żeby stworzyć gotową notatkę. Zapytaj usera o lokalizację (folder).

Format notatki dopasuj do stylu istniejących notatek usera.`
    },
    {
        name: 'weekly-review',
        folder: 'weekly-review',
        content: `---
name: weekly-review
description: Podsumowanie tygodnia z planowaniem nastepnego
category: productivity
version: 1
enabled: true
---

# Przegląd tygodniowy

Wykonaj tygodniowy przegląd vaulta użytkownika:

1. **Co się wydarzyło** — Użyj vault_search żeby znaleźć notatki z ostatnich 7 dni. Podsumuj aktywność.
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
description: Tworzenie nowego agenta krok po kroku przez rozmowe
category: system
version: 1
enabled: true
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
            if (!exists) {
                return;
            }

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
     * Load a single skill from its folder
     * @param {string} folderPath - e.g. ".pkm-assistant/skills/daily-review"
     * @returns {Promise<Object|null>}
     */
    async _loadSkillFromFolder(folderPath) {
        const skillFilePath = `${folderPath}/skill.md`;

        const fileExists = await this.vault.adapter.exists(skillFilePath);
        if (!fileExists) return null;

        const raw = await this.vault.adapter.read(skillFilePath);
        if (!raw?.trim()) return null;

        const { frontmatter, content } = parseFrontmatter(raw);

        if (!frontmatter?.name || !frontmatter?.description) {
            console.warn('[SkillLoader] Skill missing name or description:', skillFilePath);
            return null;
        }

        return {
            name: frontmatter.name,
            description: frontmatter.description,
            category: frontmatter.category || 'general',
            version: frontmatter.version || 1,
            enabled: frontmatter.enabled !== false,
            prompt: content.trim(),
            path: skillFilePath
        };
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

            // Write each starter skill
            for (const skill of STARTER_SKILLS) {
                const folderPath = `${SKILLS_PATH}/${skill.folder}`;
                const filePath = `${folderPath}/skill.md`;

                await this.vault.adapter.mkdir(folderPath);
                await this.vault.adapter.write(filePath, skill.content);
            }

            console.log(`[SkillLoader] Created ${STARTER_SKILLS.length} starter skills`);
        } catch (e) {
            console.error('[SkillLoader] Error creating starter skills:', e);
        }
    }
}
