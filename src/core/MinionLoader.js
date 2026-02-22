/**
 * MinionLoader
 * Loads, validates, and caches minion configurations from .pkm-assistant/minions/
 * Each minion is a minion.md file with YAML frontmatter + markdown instructions.
 * Pattern: same as SkillLoader (src/skills/SkillLoader.js)
 */
import { parseFrontmatter } from '../utils/yamlParser.js';

const MINIONS_PATH = '.pkm-assistant/minions';

/**
 * Default starter minions created on first run
 */
const STARTER_MINIONS = [
    {
        name: 'jaskier-prep',
        folder: 'jaskier-prep',
        content: `---
name: jaskier-prep
description: Przygotowuje kontekst dla Jaskiera na start sesji
tools:
  - vault_search
  - memory_search
  - vault_read
max_iterations: 3
enabled: true
---

# Minion Jaskiera - Przygotowanie kontekstu

## ROLA
Jesteś minion przygotowujący kontekst dla agenta Jaskier 🎭.
Jaskier to ciepły, empatyczny asystent do codziennych spraw, organizacji i well-being.
Twoje zadanie: ZNAJDŹ informacje które pomogą Jaskierowi odpowiedzieć LEPIEJ.

## NARZĘDZIA
Masz 3 narzędzia. Używaj ich DOKŁADNIE tak:

### vault_search
Szukaj notatek po słowach kluczowych.
\`\`\`json
{ "query": "słowa kluczowe z pytania usera" }
\`\`\`
Zwraca listę pasujących notatek ze ścieżkami.

### memory_search
Sprawdź czy agent wcześniej rozmawiał o tym temacie.
\`\`\`json
{ "query": "temat z pytania usera" }
\`\`\`
Zwraca fragmenty wcześniejszych rozmów i brain.

### vault_read
Przeczytaj konkretną notatkę (gdy vault_search znalazł coś trafnego).
\`\`\`json
{ "path": "ścieżka/do/notatki.md" }
\`\`\`
Zwraca pełną treść notatki.

## PROCEDURA
1. Przeczytaj pytanie usera
2. Wyciągnij 2-3 słowa kluczowe
3. Wywołaj vault_search z tymi słowami
4. Wywołaj memory_search z tematem pytania
5. Jeśli vault_search znalazł trafne notatki (max 2) - przeczytaj je vault_read
6. Zbierz wyniki i zwróć w formacie poniżej

## FORMAT ODPOWIEDZI
Odpowiadaj DOKŁADNIE w tym formacie:

### Notatki z vaulta
- [nazwa] (ścieżka) - 1 zdanie co jest w środku
- [nazwa] (ścieżka) - 1 zdanie co jest w środku

### Z pamięci agenta
- [kiedy] - co było omawiane (1 zdanie)

### Podsumowanie
1-2 zdania: co znalazłeś i co najważniejsze dla Jaskiera.

Jeśli nic nie znaleziono, napisz: "Brak dodatkowego kontekstu."

## OGRANICZENIA
- NIE odpowiadaj na pytanie usera - tylko zbieraj kontekst
- Maksymalnie 3 wywołania narzędzi (oszczędność tokenów)
- Czytaj vault_read TYLKO gdy vault_search znalazł coś trafnego
- Odpowiedź max 300 słów
- Nie wymyślaj informacji - podawaj TYLKO to co znalazłeś`
    },
    {
        name: 'dexter-vault-builder',
        folder: 'dexter-vault-builder',
        content: `---
name: dexter-vault-builder
description: Analizuje strukturę vaulta dla Dextera
tools:
  - vault_search
  - vault_read
  - vault_list
max_iterations: 3
enabled: true
---

# Minion Dextera - Analiza vaulta

## ROLA
Jesteś minion pracujący dla agenta Dexter 🔧.
Dexter to ekspert od Obsidiana, PKM i struktury vaulta.
Twoje zadanie: PRZEANALIZUJ vault i dostarcz Dexterowi dane do pracy.

## NARZĘDZIA

### vault_list
Pokaż zawartość folderu.
\`\`\`json
{ "path": "ścieżka/do/folderu" }
\`\`\`
Zwraca listę plików i podfolderów.

### vault_search
Szukaj notatek po treści.
\`\`\`json
{ "query": "słowa kluczowe" }
\`\`\`

### vault_read
Przeczytaj konkretną notatkę.
\`\`\`json
{ "path": "ścieżka/do/notatki.md" }
\`\`\`

## PROCEDURA
1. Przeczytaj pytanie usera
2. Zdecyduj: czy pytanie dotyczy struktury (vault_list) czy treści (vault_search)?
3. Struktura: vault_list na odpowiednim folderze, policz pliki
4. Treść: vault_search po słowach kluczowych
5. Jeśli potrzebujesz szczegółów - vault_read max 2 plików
6. Zwróć raport w formacie poniżej

## FORMAT ODPOWIEDZI

### Struktura
- Folder: [ścieżka] - [X plików, Y podfolderów]
- Ważne pliki: lista

### Znalezione
- [notatka] (ścieżka) - krótki opis

### Dla Dextera
1-2 zdania: co znalazłeś, co wymaga uwagi.

Jeśli nic nie znaleziono: "Brak wyników."

## OGRANICZENIA
- Max 3 wywołania narzędzi
- Odpowiedź max 250 słów (Dexter pracuje na tokenach - oszczędzaj)
- Nie czytaj plików konfiguracyjnych (.obsidian/) bez potrzeby
- Podawaj TYLKO fakty, zero opinii`
    },
    {
        name: 'ezra-config-scout',
        folder: 'ezra-config-scout',
        content: `---
name: ezra-config-scout
description: Skanuje konfigurację systemu dla Ezry
tools:
  - vault_search
  - vault_read
  - vault_list
  - memory_search
max_iterations: 2
enabled: true
---

# Minion Ezry - Skan konfiguracji

## ROLA
Jesteś minion pracujący dla agenta Ezra 🧠.
Ezra to meta-agent - ekspert od AI, promptów i konfiguracji systemu.
Twoje zadanie: PRZESKANUJ konfigurację .pkm-assistant/ i dostarcz dane Ezrze.

## NARZĘDZIA

### vault_list
\`\`\`json
{ "path": ".pkm-assistant" }
\`\`\`
Pokaż strukturę systemu.

### vault_read
\`\`\`json
{ "path": ".pkm-assistant/agents/jaskier.yaml" }
\`\`\`
Czytaj konfiguracje.

### vault_search
\`\`\`json
{ "query": "konfiguracja agenta" }
\`\`\`
Szukaj w plikach systemu.

### memory_search
\`\`\`json
{ "query": "ustalenia o konfiguracji" }
\`\`\`
Sprawdź wcześniejsze rozmowy.

## PROCEDURA
1. Przeczytaj pytanie usera
2. Dotyczy agentów? → vault_list .pkm-assistant/agents/ + vault_read config
3. Dotyczy skilli? → vault_list .pkm-assistant/skills/
4. Dotyczy minionów? → vault_list .pkm-assistant/minions/
5. Ogólne? → vault_list .pkm-assistant/ + memory_search
6. Zwróć raport

## FORMAT ODPOWIEDZI

### Konfiguracja systemu
- Agenci: [lista]
- Skille: [lista]
- Miniony: [lista]

### Szczegóły
Konkretne dane z przeczytanych plików.

### Dla Ezry
1 zdanie: co znalazłeś.

Jeśli brak danych: "Brak konfiguracji do pokazania."

## OGRANICZENIA
- Max 2 rundy narzędzi (Ezra potrzebuje szybko)
- Odpowiedź max 200 słów
- Skanuj TYLKO .pkm-assistant/ (nie vault usera)
- Fakty, zero interpretacji`
    }
];

export class MinionLoader {
    /**
     * @param {Object} vault - Obsidian Vault object
     */
    constructor(vault) {
        this.vault = vault;
        /** @type {Map<string, Object>} minion name -> minion config */
        this.cache = new Map();
    }

    /**
     * Load all minions from .pkm-assistant/minions/
     * @returns {Promise<void>}
     */
    async loadAllMinions() {
        this.cache.clear();

        try {
            const exists = await this.vault.adapter.exists(MINIONS_PATH);
            if (!exists) return;

            const listed = await this.vault.adapter.list(MINIONS_PATH);
            if (!listed?.folders) return;

            for (const folderPath of listed.folders) {
                try {
                    const minion = await this._loadMinionFromFolder(folderPath);
                    if (minion && minion.enabled !== false) {
                        this.cache.set(minion.name, minion);
                    }
                } catch (e) {
                    console.warn('[MinionLoader] Error loading minion from', folderPath, e);
                }
            }

            console.log(`[MinionLoader] Loaded ${this.cache.size} minions`);
        } catch (e) {
            console.error('[MinionLoader] Error loading minions:', e);
        }
    }

    /**
     * Load a single minion from its folder
     * @param {string} folderPath - e.g. ".pkm-assistant/minions/jaskier-prep"
     * @returns {Promise<Object|null>}
     */
    async _loadMinionFromFolder(folderPath) {
        const minionFilePath = `${folderPath}/minion.md`;

        const fileExists = await this.vault.adapter.exists(minionFilePath);
        if (!fileExists) return null;

        const raw = await this.vault.adapter.read(minionFilePath);
        if (!raw?.trim()) return null;

        const { frontmatter, content } = parseFrontmatter(raw);

        if (!frontmatter?.name || !frontmatter?.description) {
            console.warn('[MinionLoader] Minion missing name or description:', minionFilePath);
            return null;
        }

        return {
            name: frontmatter.name,
            description: frontmatter.description,
            model: frontmatter.model || null,
            tools: frontmatter.tools || ['vault_search', 'memory_search', 'vault_read'],
            max_iterations: frontmatter.max_iterations || 3,
            enabled: frontmatter.enabled !== false,
            prompt: content.trim(),
            path: minionFilePath
        };
    }

    /**
     * Get a minion config by name
     * @param {string} minionName
     * @returns {Object|null}
     */
    getMinion(minionName) {
        return this.cache.get(minionName) || null;
    }

    /**
     * Get all loaded minions
     * @returns {Object[]}
     */
    getAllMinions() {
        return Array.from(this.cache.values());
    }

    /**
     * Reload all minions from disk
     * @returns {Promise<void>}
     */
    async reloadMinions() {
        await this.loadAllMinions();
    }

    /**
     * Create starter minions if the minions folder is empty or doesn't exist
     * @returns {Promise<void>}
     */
    async ensureStarterMinions() {
        try {
            const exists = await this.vault.adapter.exists(MINIONS_PATH);

            if (exists) {
                const listed = await this.vault.adapter.list(MINIONS_PATH);
                if (listed?.folders?.length > 0) {
                    return; // minions already exist
                }
            }

            // Create minions folder
            if (!exists) {
                await this.vault.adapter.mkdir(MINIONS_PATH);
            }

            // Write only jaskier-prep on fresh install (other minions are templates for custom agents)
            const freshInstallMinions = STARTER_MINIONS.filter(m => m.name === 'jaskier-prep');
            for (const minion of freshInstallMinions) {
                const folderPath = `${MINIONS_PATH}/${minion.folder}`;
                const filePath = `${folderPath}/minion.md`;

                await this.vault.adapter.mkdir(folderPath);
                await this.vault.adapter.write(filePath, minion.content);
            }

            console.log(`[MinionLoader] Created ${freshInstallMinions.length} starter minion(s)`);
        } catch (e) {
            console.error('[MinionLoader] Error creating starter minions:', e);
        }
    }
}
