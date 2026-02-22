/**
 * Base Agent class
 * Represents an AI assistant with unique personality and capabilities
 */

/**
 * Default permissions for agents
 */
export const DEFAULT_PERMISSIONS = {
    read_notes: true,
    edit_notes: false,
    create_files: false,
    delete_files: false,
    access_outside_vault: false,
    execute_commands: false,
    thinking: true,
    mcp: false,
    yolo_mode: false
};

/**
 * Agent class - base for all AI assistants
 */
export class Agent {
    /**
     * @param {Object} config - Agent configuration
     * @param {string} config.name - Agent name
     * @param {string} config.emoji - Agent emoji icon
     * @param {string} [config.archetype] - Base archetype name
     * @param {string} [config.personality] - Personality description / system prompt extension
     * @param {string} [config.model] - Preferred AI model
     * @param {number} [config.temperature] - Model temperature (0-2)
     * @param {string} [config.role] - Agent role (orchestrator, specialist, meta_agent)
     * @param {string[]} [config.focus_folders] - Folders this agent focuses on
     * @param {Object} [config.default_permissions] - Permission overrides
     * @param {boolean} [config.isBuiltIn] - Whether this is a built-in agent
     * @param {string} [config.filePath] - Path to YAML definition file (for custom agents)
     */
    constructor(config) {
        this.name = config.name;
        this.emoji = config.emoji || '🤖';
        this.archetype = config.archetype || null;
        this.personality = config.personality || '';
        this.model = config.model || null; // null = use default from settings
        this.temperature = config.temperature ?? 0.7;
        this.role = config.role || 'specialist';
        this.focusFolders = config.focus_folders || [];
        this.permissions = { ...DEFAULT_PERMISSIONS, ...(config.default_permissions || {}) };
        this.skills = config.skills || [];
        this.minion = config.minion || null; // minion config name (e.g. 'jaskier-prep')
        this.minionEnabled = config.minion_enabled !== false; // default: true
        this.models = config.models || {}; // per-agent model overrides {main: {platform, model}, minion: {...}, master: {...}}
        this.isBuiltIn = config.isBuiltIn || false;
        this.filePath = config.filePath || null;

        // Runtime state
        this.activeContext = [];
        this.lastActivity = null;
    }

    /**
     * Get the full system prompt for this agent
     * @param {Object} [context] - Additional context to include
     * @returns {string} Complete system prompt
     */
    getSystemPrompt(context = {}) {
        const parts = [];

        // Agent identity
        parts.push(`Jesteś ${this.name} ${this.emoji}`);

        // Personality
        if (this.personality) {
            parts.push(this.personality);
        }

        // Focus folders
        if (this.focusFolders.length > 0) {
            parts.push(`\nMoje główne obszary w vaultcie:`);
            this.focusFolders.forEach(folder => {
                parts.push(`- ${folder}`);
            });
        }

        // Additional context
        if (context.vaultName) {
            parts.push(`\nPracujesz w vaultcie: ${context.vaultName}`);
        }

        if (context.currentDate) {
            parts.push(`Dzisiejsza data: ${context.currentDate}`);
        }

        // Memory context (long-term memory, summaries)
        if (context.memoryContext) {
            parts.push(`\n--- Twoja pamięć ---`);
            parts.push(context.memoryContext);
            parts.push(`--- Koniec pamięci ---`);
        }

        // Playbook pointer (lightweight - full content is read by minion at auto-prep)
        if (this.permissions.mcp && this.minion && this.minionEnabled !== false) {
            const safeName = this.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            parts.push(`\n--- Playbook ---`);
            parts.push(`Masz playbook z procedurami i instrukcjami: .pkm-assistant/agents/${safeName}/playbook.md`);
            parts.push(`Masz vault map ze strukturą vaulta: .pkm-assistant/agents/${safeName}/vault_map.md`);
            parts.push(`Minion czyta te pliki automatycznie na starcie sesji.`);
            parts.push(`W trakcie rozmowy możesz poprosić: minion_task(task: "Sprawdź w playbooku jak...")`);
            parts.push(`---`);
        }

        // MCP Tool usage instructions - CRITICAL for making AI actually use tools
        if (this.permissions.mcp) {
            if (context.isLocalModel) {
                // Shorter instructions for local models (save ~150 tokens)
                parts.push(`\n--- Narzędzia ---`);
                parts.push(`Vault: vault_list, vault_read, vault_search, vault_write, vault_delete`);
                parts.push(`Pamięć: memory_search, memory_update, memory_status`);
                parts.push(`Skille: skill_list, skill_execute`);
                if (this.minion && this.minionEnabled !== false) {
                    parts.push(`Minion: minion_task(task: "konkretne zadanie od usera")`);
                    parts.push(`ZASADA: szukanie/analiza → minion_task, NIE vault_search!`);
                }
                parts.push(`Komunikator: agent_message(to, subject, content), agent_delegate(to, reason)`);
                parts.push(`ZASADY: Zawsze NAJPIERW wywołaj narzędzie, POTEM odpowiadaj.`);
                parts.push(`---`);
            } else {
                parts.push(`\n--- WAŻNE: Używanie narzędzi ---`);
                parts.push(`Masz dostęp do narzędzi (functions/tools) do interakcji z vaultem użytkownika.`);
                parts.push(`Narzędzia do notatek użytkownika (vault):`);
                parts.push(`- vault_list — zawartość folderu`);
                parts.push(`- vault_read — odczyt notatki`);
                parts.push(`- vault_search — szukanie w notatkach użytkownika`);
                parts.push(`- vault_write — tworzenie/edycja notatek`);
                parts.push(`Narzędzia do TWOJEJ pamięci:`);
                parts.push(`- memory_search — przeszukaj swoje poprzednie rozmowy, brain i podsumowania`);
                parts.push(`- memory_update — zarządzaj swoją pamięcią (zapamiętaj/zapomnij/aktualizuj fakty)`);
                parts.push(`- memory_status — pokaż stan swojej pamięci (ile sesji, rozmiar brain itp.)`);
                parts.push(`KOMENDY PAMIĘCIOWE - reaguj na te frazy użytkownika:`);
                parts.push(`- "zapamiętaj że..." / "pamiętaj że..." → memory_update(operation: "update_brain", content: fakt)`);
                parts.push(`- "zapomnij o..." / "usuń z pamięci..." → memory_update(operation: "delete_from_brain", content: co usunąć)`);
                parts.push(`- "co o mnie wiesz?" / "co pamiętasz?" → memory_update(operation: "read_brain")`);
                parts.push(`- "pokaż swoją pamięć" / "ile pamiętasz?" → memory_status`);
                parts.push(`- "czy pamiętasz...?" / "co mówiliśmy o...?" → memory_search`);
                parts.push(`ZASADY:`);
                parts.push(`1. NIE odpowiadaj tekstem że "zaraz sprawdzisz" - WYWOŁAJ narzędzie`);
                parts.push(`2. Zawsze NAJPIERW wywołaj narzędzie, POTEM odpowiadaj na podstawie wyników`);
                parts.push(`3. Gdy user mówi "zapamiętaj" → od razu memory_update, nie czekaj`);
                parts.push(`Umiejętności (skille):`);
                parts.push(`- skill_list — pokaż dostępne skille (instrukcje krok-po-kroku)`);
                parts.push(`- skill_execute — aktywuj skill po nazwie (zwraca pełne instrukcje)`);
                parts.push(`Masz dostępne umiejętności. Użyj skill_list żeby zobaczyć jakie, skill_execute żeby aktywować.`);
                parts.push(`Możesz tworzyć nowe skille: vault_write do .pkm-assistant/skills/{nazwa}/skill.md`);
                parts.push(`Format: frontmatter YAML (name, description, category) + treść markdown z instrukcjami.`);
                // Minion info (only if agent has a minion assigned)
                if (this.minion && this.minionEnabled !== false) {
                    parts.push(`\n--- MINION (WAŻNE!) ---`);
                    parts.push(`Masz miniona - tańszy model AI z narzędziami do ciężkiej roboty.`);
                    parts.push(`Narzędzie: minion_task(task: "konkretne zadanie")`);
                    parts.push(`JAK UŻYWAĆ:`);
                    parts.push(`- W polu "task" wpisz KONKRETNE zadanie, np: "Znajdź wszystkie notatki o projekcie X i podsumuj ich treść"`);
                    parts.push(`- NIE pisz ogólników typu "przetestuj się" - podaj DOKŁADNIE co ma znaleźć/zrobić`);
                    parts.push(`- Przekaż pytanie/zadanie usera swoimi słowami, precyzyjnie`);
                    parts.push(`- Przykład: user pyta "co mam o wakacjach?" → minion_task(task: "Przeszukaj vault i pamięć pod kątem wakacji, podróży, urlopów. Podsumuj co znalazłeś.")`);
                    parts.push(`KIEDY DELEGOWAĆ DO MINIONA:`);
                    parts.push(`- Wyszukiwanie/szukanie czegokolwiek → minion_task`);
                    parts.push(`- Analiza/przegląd wielu plików → minion_task`);
                    parts.push(`- Zbieranie informacji z różnych miejsc → minion_task`);
                    parts.push(`CO ROBISZ SAM (bez miniona):`);
                    parts.push(`- Odczyt JEDNEGO konkretnego pliku (vault_read)`);
                    parts.push(`- Zapis/edycja notatki (vault_write)`);
                    parts.push(`- Pamięć (memory_update), skille (skill_execute)`);
                    parts.push(`ZASADA: NIE używaj sam vault_search ani memory_search - to robi minion!`);
                    parts.push(`---`);
                }
                // Master info (only if master is configured in settings)
                if (context.hasMaster) {
                    parts.push(`\n--- MASTER (EKSPERT) ---`);
                    parts.push(`Masz dostęp do Mastera - potężniejszego modelu AI do trudnych zadań.`);
                    parts.push(`Narzędzie: master_task(task, context?, skip_minion?, minion_instructions?)`);
                    parts.push(`3 TRYBY WYWOŁANIA:`);
                    parts.push(`1. DOMYŚLNY: master_task(task: "pytanie") → minion automatycznie zbiera kontekst → Master odpowiada`);
                    parts.push(`2. Z INSTRUKCJAMI DLA MINIONA: master_task(task: "pytanie", minion_instructions: "Przeszukaj WSZYSTKIE notatki w folderze Projects/. Szukaj też w pamięci.") → minion szuka wg Twoich wskazówek`);
                    parts.push(`3. BEZ MINIONA: master_task(task: "pytanie", context: "tu dajesz własny kontekst", skip_minion: true) → sam dostarczasz dane, minion pominięty`);
                    parts.push(`KIEDY KTÓRY TRYB:`);
                    parts.push(`- Tryb 1 (domyślny): user zadaje ogólne pytanie, nie wiesz co jest w vaultcie`);
                    parts.push(`- Tryb 2 (instrukcje): wiesz GDZIE szukać lub chcesz głębsze przeszukanie`);
                    parts.push(`- Tryb 3 (skip): już zebrałeś dane sam (np. przez minion_task) i chcesz je przesłać do Mastera`);
                    parts.push(`Przykład tryb 2: master_task(task: "Zaplanuj system organizacji notatek", minion_instructions: "Przeszukaj vault_search po 'organizacja', 'struktura', 'foldery'. Przeszukaj memory_search po 'system notatek'. Zbierz minimum 8 źródeł.")`);
                    parts.push(`Przykład tryb 3: master_task(task: "Przeanalizuj te dane", context: "Dane z vaulta: ...", skip_minion: true)`);
                    parts.push(`WAŻNE: Nie przerabiaj odpowiedzi mastera - przekaż ją tak jak jest.`);
                    parts.push(`---`);
                }
                // Komunikator (inter-agent communication)
                parts.push(`\n--- KOMUNIKATOR ---`);
                parts.push(`Narzędzia do komunikacji z innymi agentami:`);
                parts.push(`- agent_message(to_agent, subject, content, context?) — wyślij wiadomość do innego agenta`);
                parts.push(`- agent_delegate(to_agent, reason?, context_summary?) — zaproponuj przekazanie rozmowy`);
                parts.push(`KIEDY agent_message: informujesz, prosisz o pomoc, przekazujesz wyniki`);
                parts.push(`KIEDY agent_delegate: temat poza Twoimi kompetencjami, user prosi o innego agenta`);
                parts.push(`WAŻNE: agent_delegate NIE przełącza - user musi kliknąć przycisk!`);
                parts.push(`KRYTYCZNE: ZAWSZE podaj context_summary przy agent_delegate! Bez tego nowy agent nie wie o czym była rozmowa. Napisz streszczenie: co user chciał, co już zrobiłeś, co zostało do zrobienia.`);
                parts.push(`---`);
                parts.push(`\n--- LISTA ZADAŃ (chat_todo) ---`);
                parts.push(`Dla większych zadań z wieloma krokami, użyj chat_todo aby stworzyć interaktywną listę zadań w chacie.`);
                parts.push(`- chat_todo(action:"create", title:"...", items:["krok 1","krok 2",...]) — stwórz listę`);
                parts.push(`- chat_todo(action:"update", id:"...", item_index:0, done:true) — odhacz element`);
                parts.push(`- chat_todo(action:"add_item", id:"...", text:"nowy krok") — dodaj element`);
                parts.push(`- chat_todo(action:"save", id:"...", path:"folder/lista.md") — zapisz do vaulta`);
                parts.push(`User widzi interaktywną checklistę z paskiem postępu. Odznaczaj elementy w trakcie pracy.`);
                parts.push(`---`);
                parts.push(`\n--- PLAN DZIAŁANIA (plan_action) ---`);
                parts.push(`Dla większych zadań, zanim zaczniesz działać, stwórz plan i pokaż go userowi do zatwierdzenia.`);
                parts.push(`- plan_action(action:"create", title:"...", steps:[{label:"...", description:"..."},...]) — stwórz plan`);
                parts.push(`- plan_action(action:"update_step", id:"...", step_index:0, status:"in_progress"|"done"|"skipped", note:"...") — aktualizuj krok`);
                parts.push(`- plan_action(action:"get", id:"...") — pobierz aktualny stan planu`);
                parts.push(`User widzi interaktywny plan z numerowanymi krokami i paskiem postępu. Czekaj na zatwierdzenie planu!`);
                parts.push(`Po zatwierdzeniu: realizuj kroki po kolei, aktualizując status każdego przez update_step.`);
                parts.push(`Statusy kroków: pending (oczekuje), in_progress (w trakcie), done (gotowy), skipped (pominięty).`);
                parts.push(`---`);
                parts.push(`\n--- KOMENTARZ INLINE ---`);
                parts.push(`Gdy wiadomość zaczyna się od "KOMENTARZ INLINE", user wybrał fragment tekstu w notatce i chce go zmienić.`);
                parts.push(`Działanie: 1) vault_read plik, 2) znajdź wskazany fragment, 3) zmodyfikuj go zgodnie z komentarzem, 4) vault_write mode:"replace" z całą zawartością pliku. Odpowiedz krótko co zmieniłeś.`);
                parts.push(`---`);
                parts.push(`--- Koniec instrukcji narzędzi ---`);
            }
        }

        return parts.join('\n');
    }

    /**
     * Get agent settings for AI model
     * @returns {Object} Settings object
     */
    getModelSettings() {
        return {
            model: this.model,
            temperature: this.temperature
        };
    }

    /**
     * Get display info for UI
     * @returns {Object} { name, emoji, role, isBuiltIn }
     */
    getDisplayInfo() {
        return {
            name: this.name,
            emoji: this.emoji,
            role: this.role,
            isBuiltIn: this.isBuiltIn,
            archetype: this.archetype
        };
    }

    /**
     * Serialize agent to object (for saving to YAML)
     * @returns {Object} Serialized agent data
     */
    serialize() {
        const data = {
            name: this.name,
            emoji: this.emoji
        };

        if (this.archetype) data.archetype = this.archetype;
        if (this.personality) data.personality = this.personality;
        if (this.model) data.model = this.model;
        if (this.temperature !== 0.7) data.temperature = this.temperature;
        if (this.role !== 'specialist') data.role = this.role;
        if (this.focusFolders.length > 0) data.focus_folders = this.focusFolders;
        if (this.skills.length > 0) data.skills = this.skills;
        if (this.minion) data.minion = this.minion;
        if (this.minionEnabled === false) data.minion_enabled = false;
        if (Object.keys(this.models).length > 0) data.models = this.models;

        // Only save non-default permissions
        const customPermissions = {};
        for (const [key, value] of Object.entries(this.permissions)) {
            if (value !== DEFAULT_PERMISSIONS[key]) {
                customPermissions[key] = value;
            }
        }
        if (Object.keys(customPermissions).length > 0) {
            data.default_permissions = customPermissions;
        }

        return data;
    }

    /**
     * Create Agent from plain object
     * @param {Object} data - Agent data
     * @returns {Agent}
     */
    static fromObject(data) {
        return new Agent(data);
    }

    /**
     * Update agent configuration
     * @param {Object} updates - Fields to update
     */
    update(updates) {
        const allowedFields = [
            'name', 'emoji', 'personality', 'model',
            'temperature', 'role', 'focus_folders', 'default_permissions', 'skills',
            'minion', 'minion_enabled', 'models'
        ];

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                if (key === 'focus_folders') {
                    this.focusFolders = value;
                } else if (key === 'default_permissions') {
                    this.permissions = { ...DEFAULT_PERMISSIONS, ...value };
                } else if (key === 'minion_enabled') {
                    this.minionEnabled = value;
                } else {
                    this[key] = value;
                }
            }
        }
    }

    /**
     * Check if agent has a specific permission
     * @param {string} permission - Permission key
     * @returns {boolean}
     */
    hasPermission(permission) {
        return this.permissions[permission] === true;
    }

    /**
     * Get memory directory path for this agent
     * @returns {string} Path like .pkm-assistant/agents/{name}/memory
     */
    getMemoryPath() {
        const safeName = this.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        return `.pkm-assistant/agents/${safeName}/memory`;
    }
}
