/**
 * PromptBuilder v2.1 — modularny system budowania system promptu agenta.
 *
 * Struktura v2.1:
 * A: KIM JESTEM (identity, archetype, role, personality)
 * B: GDZIE PRACUJĘ (environment, folders, permissions + agent_rules)
 * ★ TRYB PRACY (work_mode — na górze, przed drzewem!)
 * C: JAK PRACUJĘ (decision_tree, minion_guide, master_guide, rules)
 * D: KONTEKST (memory, agora, oczko, artifacts, RAG, minion auto-prep)
 *
 * Filozofia:
 * - Opis → Instrukcja (nie mów czym jest, mów co robić)
 * - 1 info = 1 miejsce (zero duplikacji)
 * - JSON tools mówią same za siebie (nie powtarzamy opisów narzędzi)
 * - Wszystko edytowalne: agent override > global override > factory default
 */

import { getTokenCount } from '../utils/tokenCounter.js';
import { getArchetype } from '../agents/archetypes/Archetypes.js';
import { getModeInfo } from './WorkMode.js';

// ═══════════════════════════════════════════
// TOOL GROUPS — do filtrowania per-agent
// ═══════════════════════════════════════════

export const TOOL_GROUPS = {
    vault: ['vault_read', 'vault_list', 'vault_write', 'vault_delete', 'vault_search'],
    memory: ['memory_search', 'memory_update', 'memory_status'],
    skills: ['skill_list', 'skill_execute'],
    delegation: ['minion_task', 'master_task'],
    communication: ['agent_message', 'agent_delegate'],
    artifacts: ['chat_todo', 'plan_action'],
    agora: ['agora_read', 'agora_update', 'agora_project'],
    web: ['web_search'],
    interaction: ['ask_user'],
    mode: ['switch_mode'],
};

// ═══════════════════════════════════════════
// TRYB PRACY — sekcja promptu
// ═══════════════════════════════════════════

const MODE_BEHAVIORS = {
    rozmowa: [
        'Rozmawiasz z użytkownikiem. Słuchaj, odpowiadaj, doradzaj.',
        'NIE proponuj zmian w plikach — nie masz do nich dostępu.',
        'NIE oferuj "mogę to zrobić" gdy dotyczy edycji vault.',
        'Możesz przeszukiwać pamięć (memory_search) żeby odwołać się do wcześniejszych rozmów.',
        'Jeśli temat wymaga pracy z plikami → switch_mode(mode:"praca", reason:"Potrzebuję edytować pliki").',
        'Jeśli temat wymaga analizy lub planowania → switch_mode(mode:"planowanie", reason:"Czas na analizę").',
    ],
    planowanie: [
        'Analizujesz i planujesz. Czytaj, przeszukuj, projektuj — NIE edytuj plików.',
        'Twórz plany (plan_action), listy zadań (chat_todo), analizuj vault.',
        'Jeśli potrzebujesz napisać lub edytować pliki → switch_mode(mode:"praca", reason:"Muszę edytować vault").',
        'Odpowiadaj wyczerpująco — dawaj konkretne rekomendacje i szczegółowe plany.',
    ],
    praca: [
        'Masz pełny dostęp do wszystkich narzędzi. Wykonuj zadania, edytuj pliki, deleguj.',
        'Działaj konkretnie — nie pytaj o pozwolenie na każdy krok, wykonuj zadanie.',
        'Korzystaj z minionów do zbierania kontekstu i ciężkiej pracy.',
        'Jeśli user chce tylko porozmawiać bez pracy z plikami → switch_mode(mode:"rozmowa").',
    ],
    kreatywny: [
        'Tworzysz nowe treści — notatki, dokumenty, artykuły, pomysły.',
        'Pisz, generuj, buduj — NIE kasuj istniejących plików.',
        'Skup się na jakości treści, nie na zarządzaniu vault.',
        'Jeśli potrzebujesz kasować lub reorganizować → switch_mode(mode:"praca", reason:"Potrzebuję usuwać pliki").',
    ],
};

/**
 * Build a TRYB PRACY section for the system prompt.
 * Exported for backward compat (used by chat_view fallback in "Pokaż prompt").
 * In v2.1, normally called internally by PromptBuilder.build() via context.workMode.
 * @param {string} mode - Current work mode id
 * @returns {string} Markdown section
 */
export function buildModePromptSection(mode) {
    const info = getModeInfo(mode);
    if (!info) return '';
    const behaviors = MODE_BEHAVIORS[mode] || [];
    const lines = [
        `## TRYB PRACY: ${info.icon} ${info.label}`,
        info.description,
        '',
        ...behaviors.map((b, i) => `${i + 1}. ${b}`),
    ];
    return lines.join('\n');
}

// ═══════════════════════════════════════════
// FACTORY DEFAULTS — edytowalne przez usera
// ═══════════════════════════════════════════

export const FACTORY_DEFAULTS = {
    environment: `## Środowisko
Pracujesz wewnątrz Obsidian.md — edytora notatek Markdown.
Vault to kolekcja plików .md w folderach.
Folder .pkm-assistant/ — konfiguracja systemu (agenci, skille, pamięć, artefakty).
Folder .obsidian/ — konfiguracja Obsidiana — NIE RUSZAJ bez prośby usera.`,

    /** @deprecated v2 — use DECISION_TREE_DEFAULTS + DECISION_TREE_GROUPS instead */
    decision_tree: '',

    minion_guide: `## Miniony — Twoi asystenci do ciężkiej roboty
Domyślny minion: "{minion_name}" — tańszy model z dostępem do narzędzi.
Minion NIE podejmuje decyzji. Ty decydujesz, minion zbiera dane i wykonuje robotę.
Szczegóły delegacji w drzewie decyzyjnym powyżej.

Formuluj zadania KONKRETNIE:
✅ minion_task(task:"Przeszukaj folder Projekty/ pod kątem deadline'ów. Podsumuj.")
✅ minion_task(task:"Przeczytaj notatkę X i wyciągnij wszystkie daty", minion:"reader")
❌ minion_task(task:"Sprawdź coś w vaultcie")

MULTI-MINION — równoległe wysyłanie:
Możesz wysłać KILKU minionów NA RAZ w jednym turnie! Wywołaj kilka minion_task jednocześnie:
✅ minion_task(task:"Szukaj w Projekty/", minion:"szukacz") + minion_task(task:"Szukaj w Notatki/", minion:"czytelnik")
Wyniki wrócą razem — oszczędność czasu przy zbieraniu danych z wielu źródeł.

Jeśli masz kilku minionów, wybierz po nazwie: minion_task(task:"...", minion:"nazwa")

Playbook: .pkm-assistant/agents/{agent_safe_name}/playbook.md
Vault map: .pkm-assistant/agents/{agent_safe_name}/vault_map.md`,

    master_guide: `## Mastery — delegacja W GÓRĘ
Mocniejszy model AI do głębokiej analizy i ekspertyzy.
Master NIE szuka sam — dostarczaj mu bogaty kontekst (sam lub przez miniona).

3 TRYBY:
1. DOMYŚLNY: master_task(task:"pytanie") → minion zbiera kontekst → Master analizuje
2. Z INSTRUKCJAMI: master_task(task:"pytanie", minion_instructions:"Szukaj w X...") → minion szuka wg wskazówek → Master analizuje
3. BEZ MINIONA: master_task(task:"pytanie", context:"dane od Ciebie/miniona", skip_minion:true) → Master dostaje gotowy kontekst

MULTI-MASTER — różni eksperci:
Jeśli masz kilku masterów, wybierz po nazwie: master_task(task:"...", master:"nazwa")
Możesz wysłać do KILKU masterów NA RAZ (równolegle) — np. jeden analizuje treść, drugi recenzuje jakość.
✅ master_task(task:"Analiza strategii", master:"strateg", skip_minion:true, context:"...") + master_task(task:"Recenzja jakości", master:"redaktor", skip_minion:true, context:"...")

WAŻNE: Nie przerabiaj odpowiedzi Mastera — przekaż ją userowi bez zmian.`,

    rules: `## Zasady
1. Odpowiadaj po polsku (chyba że user pisze w innym języku).
2. NAJPIERW wywołaj narzędzie, POTEM odpowiadaj na podstawie wyników. NIE mów "zaraz sprawdzę" — po prostu wywołaj tool.
3. Gdy user mówi "zapamiętaj" → OD RAZU memory_update, nie pytaj o potwierdzenie.

ANTY-LOOPING — bądź konkretny i efektywny:
4. JEDNO wyszukiwanie na temat. Nie znalazł → powiedz userowi, NIE szukaj tego samego innymi słowami.
5. Błąd narzędzia → przeczytaj komunikat, napraw, spróbuj RAZ. Nie ponawiaj w nieskończoność.
6. Nie wywołuj tego samego narzędzia z tymi samymi argumentami dwa razy.
7. Gdy nie masz pewności → ZAPYTAJ usera.
8. Max 3 tool calle na krok. Potem podsumuj i zapytaj o dalsze.

KOMENTARZ INLINE:
9. Wiadomość zaczyna się od "KOMENTARZ INLINE" → vault_read → znajdź fragment → vault_write mode:"replace". Odpowiedz krótko.`,
};

// ═══════════════════════════════════════════
// DRZEWO DECYZYJNE v2 — granularne instrukcje
// ═══════════════════════════════════════════

/**
 * Decision tree group definitions.
 * requiredGroups: group is visible if ANY of these TOOL_GROUPS is enabled.
 */
export const DECISION_TREE_GROUPS = {
    delegacja:   { label: 'DELEGACJA',     order: 0, requiredGroups: ['delegation'] },
    szukanie:    { label: 'SZUKANIE',      order: 1, requiredGroups: ['vault', 'memory', 'web'] },
    pamiec:      { label: 'PAMIĘĆ',        order: 2, requiredGroups: ['memory'] },
    pliki:       { label: 'PLIKI',         order: 3, requiredGroups: ['vault'] },
    artefakty:   { label: 'ARTEFAKTY',     order: 4, requiredGroups: ['artifacts'] },
    skille:      { label: 'SKILLE',        order: 5, requiredGroups: ['skills'] },
    komunikacja: { label: 'KOMUNIKACJA',   order: 6, requiredGroups: ['communication', 'interaction'] },
    agora:       { label: 'AGORA',         order: 7, requiredGroups: ['agora'] },
    tryb:        { label: 'TRYB PRACY',    order: 8, requiredGroups: ['mode'] },
};

/**
 * Individual instruction defaults.
 * id: stable key for overrides
 * group: which DECISION_TREE_GROUPS section this belongs to
 * tool: specific tool required (null = always visible when group is visible)
 * text: default instruction text (user-editable)
 */
export const DECISION_TREE_DEFAULTS = [
    // ─── DELEGACJA (na górze — ogólna info o pomocnikach) ───
    { id: 'deleg_minion_info', group: 'delegacja', tool: 'minion_task',
      text: 'Masz minionów — tańsze modele do zbierania danych. Możesz wysłać KILKU NA RAZ (równolegle w jednym turnie). Formułuj zadania PRECYZYJNIE, podawaj minion:"nazwa".' },
    { id: 'deleg_master_info', group: 'delegacja', tool: 'master_task',
      text: 'Masz masterów — mocniejsze modele do analizy i ekspertyzy. Możesz wysłać do KILKU NA RAZ (równolegle). Dostarczaj bogaty kontekst (sam lub przez miniona), podawaj master:"nazwa".' },
    { id: 'deleg_parallel', group: 'delegacja', tool: null,
      text: 'RÓWNOLEGŁOŚĆ: Wywołaj kilka minion_task i/lub master_task w JEDNYM turnie — system wykona je równolegle. Idealne do zbierania danych z wielu źródeł naraz.' },
    { id: 'deleg_context_gathering', group: 'delegacja', tool: 'minion_task',
      text: 'PROAKTYWNE ZBIERANIE KONTEKSTU: Gdy user zaczyna nowy temat, potrzebujesz kontekstu lub nie jesteś pewien odpowiedzi — WYŚLIJ MINIONA po informacje (memory_search, vault_search, vault_read). Nie czekaj aż user poprosi. Sam zdecyduj kiedy kontekst jest potrzebny. Twój minion zna playbook, vault_map i ma dostęp do pełnej pamięci.' },

    // ─── SZUKANIE ───
    { id: 'search_mention',       group: 'szukanie', tool: 'vault_read',    text: 'Wiadomość usera zawiera @[NazwaNotatki] → to jest MENTION — user wskazał konkretny plik/folder. Ścieżki plików podane na początku wiadomości. Przeczytaj wskazane pliki vault_read(path) ZANIM odpowiesz, lub oddeleguj minionowi gdy jest ich dużo.' },
    { id: 'search_vault_read',    group: 'szukanie', tool: 'vault_read',    text: 'User pyta o konkretną notatkę → vault_read(path)' },
    { id: 'search_vault_search',  group: 'szukanie', tool: 'vault_search',  text: 'Szybkie pytanie o vault → vault_search(query)' },
    { id: 'search_memory',        group: 'szukanie', tool: 'memory_search', text: 'User pyta "co o mnie wiesz?" / "pamiętasz?" → memory_search(query)' },
    { id: 'search_minion_multi',  group: 'szukanie', tool: 'minion_task',   text: 'Przeszukanie WIELU źródeł/notatek naraz → minion_task' },
    { id: 'search_minion_reader', group: 'szukanie', tool: 'minion_task',   text: 'Wyciągnięcie info z długiego tekstu → minion_task' },
    { id: 'search_web',          group: 'szukanie', tool: 'web_search',   text: 'User pyta o aktualne informacje, nowości, rzeczy spoza vaulta → web_search(query). Pisz zapytanie po angielsku dla lepszych wyników (chyba że szukasz polskich źródeł). Cytuj źródła URL w odpowiedzi.' },

    // ─── PAMIĘĆ ───
    { id: 'mem_update', group: 'pamiec', tool: 'memory_update', text: '"zapamiętaj że..." → memory_update(operation:"update_brain", content: fakt w 3. osobie)' },
    { id: 'mem_delete', group: 'pamiec', tool: 'memory_update', text: '"zapomnij o..." → memory_update(operation:"delete_from_brain")' },
    { id: 'mem_read',   group: 'pamiec', tool: 'memory_update', text: '"co o mnie wiesz?" → memory_update(operation:"read_brain")' },
    { id: 'mem_dedup',  group: 'pamiec', tool: null,            text: 'Sprawdź brain PRZED dodaniem — nie dodawaj duplikatów!' },

    // ─── PLIKI ───
    { id: 'file_create',  group: 'pliki', tool: 'vault_write',  text: 'Tworzenie nowej notatki → vault_write(mode:"create")' },
    { id: 'file_append',  group: 'pliki', tool: 'vault_write',  text: 'Dopisanie do istniejącej → vault_write(mode:"append") — PREFERUJ nad replace' },
    { id: 'file_replace', group: 'pliki', tool: 'vault_write',  text: 'Edycja fragmentu → vault_write(mode:"replace") — PYTAJ usera najpierw!' },
    { id: 'file_delete',  group: 'pliki', tool: 'vault_delete', text: 'Usunięcie → vault_delete — ZAWSZE pytaj usera!' },

    // ─── ARTEFAKTY ───
    { id: 'art_todo',        group: 'artefakty', tool: 'chat_todo',   text: 'Prosta lista/checklist → chat_todo(create)' },
    { id: 'art_plan',        group: 'artefakty', tool: 'plan_action', text: 'Złożone zadanie z etapami → plan_action(create) — CZEKAJ na zatwierdzenie!' },
    { id: 'art_existing',    group: 'artefakty', tool: null,          text: 'User odnosi się do istniejącego → użyj jego ID, nie twórz nowego' },
    { id: 'art_master_plan', group: 'artefakty', tool: 'master_task', text: 'Bardzo złożony plan wymagający ekspertyzy → master_task' },

    // ─── SKILLE ───
    { id: 'skill_use',   group: 'skille', tool: 'skill_execute', text: 'User chce procedurę (przegląd, organizacja) → skill_execute(name)' },
    { id: 'skill_auto',  group: 'skille', tool: 'skill_execute', text: 'Jeśli zadanie usera pasuje do opisu skilla — użyj go bez pytania (auto-invoke)' },
    { id: 'skill_known', group: 'skille', tool: null,            text: 'Znasz swoje skille — nie musisz wołać skill_list' },

    // ─── KOMUNIKACJA ───
    { id: 'comms_delegate', group: 'komunikacja', tool: 'agent_delegate', text: 'Temat poza kompetencjami → agent_delegate (ZAWSZE podaj context_summary!)' },
    { id: 'comms_message',  group: 'komunikacja', tool: 'agent_message',  text: 'Poinformuj innego agenta → agent_message' },
    { id: 'comms_ask_user', group: 'komunikacja', tool: 'ask_user',       text: 'Nie jesteś pewien intencji użytkownika lub potrzebujesz wyboru → ask_user(question, options). NIE zgaduj — zapytaj. User dostanie klikalne opcje.' },

    // ─── AGORA ───
    { id: 'agora_update',    group: 'agora', tool: 'agora_update', text: 'Na KOŃCU ważnych sesji → agora_update(section:"activity", summary:"co zrobiłeś")' },
    { id: 'agora_knowledge', group: 'agora', tool: null,           text: 'Nowe fakty o userze → zapytaj "Czy zaktualizować Bazę Wiedzy?"' },

    // ─── TRYB PRACY ───
    { id: 'mode_switch', group: 'tryb', tool: 'switch_mode',
      text: 'Gdy zadanie NIE PASUJE do aktualnego trybu → WYWOŁAJ switch_mode(mode, reason). NIE pisz o tym w tekście — użyj narzędzia.\nPrzykłady: user prosi o edycję plików a jesteś w trybie rozmowa → switch_mode(mode:"praca", reason:"Potrzebuję edytować pliki"). User chce pogadać a jesteś w trybie praca → switch_mode(mode:"rozmowa").\nDostępne tryby: rozmowa (bez vault), planowanie (vault read-only), praca (pełny dostęp), kreatywny (pisanie bez kasowania).' },
    { id: 'mode_proactive', group: 'tryb', tool: 'switch_mode',
      text: 'Proponuj zmianę trybu PROAKTYWNIE — nie czekaj aż user sam to zrobi. Jeśli widzisz że potrzebujemy innych narzędzi, zaproponuj od razu.' },
];

// ═══════════════════════════════════════════
// PROMPT BUILDER v2.1
// ═══════════════════════════════════════════

export class PromptBuilder {
    constructor() {
        /** @type {Map<string, SectionData>} */
        this.sections = new Map();
    }

    /**
     * Build the full system prompt for an agent.
     * @param {import('../agents/Agent.js').Agent} agent
     * @param {Object} context
     * @param {string} context.vaultName
     * @param {string} context.currentDate
     * @param {string} [context.memoryContext]
     * @param {string} [context.agoraContext]
     * @param {boolean} [context.hasMinion]
     * @param {boolean} [context.hasMaster]
     * @param {Array<{name:string, description:string, category:string}>} [context.skills]
     * @param {string[]} [context.agentList] - other agent names
     * @param {number} [context.unreadInbox] - unread messages count
     * @param {string} [context.workMode] - current work mode id
     * @param {Object} [context.artifacts] - {todos: Map, plans: Map} from chat session
     * @param {Object} [context.promptDefaults] - global prompt overrides from settings
     * @returns {PromptBuilder} this (for chaining)
     */
    build(agent, context) {
        this.sections.clear();

        const hasMCP = agent.permissions?.mcp === true;
        const hasMinion = !!(context.hasMinion);
        const hasMaster = !!(context.hasMaster);
        const enabledGroups = this._getEnabledGroups(agent);
        const overrides = agent.promptOverrides || {};
        const globalDefaults = context.promptDefaults || {};

        // ══ BLOK A: KIM JESTEM ══

        this._add('identity', 'Tożsamość', this._buildIdentity(agent, context), {
            category: 'core'
        });

        const archetypeBehavior = this._buildArchetypeBehavior(agent, context);
        if (archetypeBehavior) {
            this._add('archetype_behavior', 'Archetyp', archetypeBehavior, {
                category: 'core'
            });
        }

        const roleBehavior = this._buildRoleBehavior(agent, context);
        if (roleBehavior) {
            this._add('role_behavior', 'Rola', roleBehavior, {
                category: 'core'
            });
        }

        if (agent.personality) {
            this._add('personality', 'Osobowość', agent.personality, {
                category: 'core'
            });
        }

        // ══ BLOK B: GDZIE PRACUJĘ ══

        this._add('environment', 'Środowisko',
            this._resolveSection('environment', overrides, globalDefaults, this._buildEnvironment(agent, context)),
            { category: 'core' }
        );

        this._add('permissions', 'Uprawnienia',
            this._buildPermissions(agent, context, enabledGroups), {
                category: 'rules'
            });

        // ══ ★ TRYB PRACY (na górze, przed drzewem!) ══

        if (context.workMode) {
            const modeSection = buildModePromptSection(context.workMode);
            if (modeSection) {
                this._add('work_mode', 'Tryb pracy', modeSection, {
                    category: 'behavior'
                });
            }
        }

        // ══ BLOK C: JAK PRACUJĘ ══

        if (hasMCP) {
            // Decision tree: resolution per-instruction (not per-section)
            this._add('decision_tree', 'Drzewo decyzyjne',
                this._buildDecisionTree(agent, context, enabledGroups),
                { category: 'behavior' }
            );
        }

        if (hasMinion) {
            this._add('minion_guide', 'Minion',
                this._resolveSection('minion_guide', overrides, globalDefaults,
                    this._buildMinionGuide(agent, context)),
                { category: 'behavior' }
            );
        }

        if (hasMaster) {
            this._add('master_guide', 'Master',
                this._resolveSection('master_guide', overrides, globalDefaults,
                    this._buildMasterGuide(agent, context)),
                { category: 'behavior' }
            );
        }

        // Delegate behavior_inject sections (sesja 46c)
        const delegates = context.delegateAssignments || [];
        for (const d of delegates) {
            if (d.overrides?.behavior_inject) {
                this._add(
                    `delegate_behavior_${d.name}`,
                    `Zachowanie: ${d.name}`,
                    d.overrides.behavior_inject,
                    { category: 'behavior' }
                );
            }
        }

        this._add('rules', 'Zasady',
            this._resolveSection('rules', overrides, globalDefaults,
                this._buildRules(agent, context, enabledGroups)),
            { category: 'rules' }
        );

        return this;
    }

    // ═══════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════

    /**
     * Add a dynamic section (memory, RAG, oczko, inbox — injected per message by chat_view)
     */
    addDynamicSection(key, label, content, category = 'context') {
        if (!content || !content.trim()) return;
        this._add(key, label, content, { category, required: false });
    }

    /**
     * Get full assembled prompt text (enabled sections only)
     */
    getPrompt() {
        return [...this.sections.values()]
            .filter(s => s.enabled)
            .map(s => s.content)
            .join('\n\n');
    }

    /**
     * Get section metadata for Prompt Inspector UI
     * @returns {Array<{key, label, tokens, enabled, required, category}>}
     */
    getSections() {
        const EDITABLE_KEYS = new Set([
            'environment', 'decision_tree', 'minion_guide', 'master_guide', 'rules'
        ]);
        return [...this.sections.entries()].map(([key, data]) => ({
            key,
            label: data.label,
            tokens: data.tokens,
            enabled: data.enabled,
            required: data.required,
            category: data.category,
            content: data.content,
            editable: EDITABLE_KEYS.has(key),
        }));
    }

    /**
     * Get token breakdown
     * @returns {{total: number, sections: Array<{key, label, tokens}>}}
     */
    getTokenBreakdown() {
        const sections = this.getSections().filter(s => s.enabled);
        return {
            total: sections.reduce((sum, s) => sum + s.tokens, 0),
            sections: sections.map(s => ({ key: s.key, label: s.label, tokens: s.tokens })),
        };
    }

    /**
     * Toggle a section on/off. Cannot toggle required sections off.
     */
    toggleSection(key, enabled) {
        const section = this.sections.get(key);
        if (!section) return false;
        if (section.required && !enabled) return false;
        section.enabled = enabled;
        return true;
    }

    /**
     * Apply disabled sections from user settings.
     * @param {string[]} disabledKeys - Section keys to disable
     */
    applyDisabledSections(disabledKeys = []) {
        for (const key of disabledKeys) {
            this.toggleSection(key, false);
        }
    }

    // ═══════════════════════════════════════════
    // INTERNAL: Section builders
    // ═══════════════════════════════════════════

    _add(key, label, content, opts = {}) {
        if (!content || !content.trim()) return;
        this.sections.set(key, {
            key,
            label,
            content: content.trim(),
            tokens: getTokenCount(content),
            enabled: true,
            required: opts.required || false,
            category: opts.category || 'core',
        });
    }

    /**
     * Resolve section content: agent override > global override > factory default.
     * @param {string} key - Section key (e.g. 'decision_tree')
     * @param {Object} agentOverrides - agent.promptOverrides
     * @param {Object} globalDefaults - obsek.promptDefaults from settings
     * @param {string} factoryContent - built-in default from code
     * @returns {string}
     */
    _resolveSection(key, agentOverrides, globalDefaults, factoryContent) {
        if (agentOverrides[key]) return agentOverrides[key];
        if (globalDefaults[key]) return globalDefaults[key];
        return factoryContent;
    }

    /**
     * Which tool groups does this agent have enabled?
     * Empty/undefined enabledTools = ALL groups.
     */
    _getEnabledGroups(agent) {
        const enabled = agent.enabledTools;
        const result = {};
        for (const [group, tools] of Object.entries(TOOL_GROUPS)) {
            if (group === 'memory' && agent.permissions?.memory === false) continue;
            if (!enabled || enabled.length === 0) {
                result[group] = tools;
            } else {
                const active = tools.filter(t => enabled.includes(t));
                if (active.length > 0) result[group] = active;
            }
        }
        return result;
    }

    // ─── A1: identity ───

    _buildIdentity(agent, ctx) {
        return `Jesteś ${agent.name}
Vault: ${ctx.vaultName || 'Obsidian Vault'} | Data: ${ctx.currentDate || new Date().toLocaleDateString('pl-PL')}`;
    }

    // ─── A2: archetype ───

    _buildArchetypeBehavior(agent, ctx) {
        const archetype = getArchetype(agent.archetype);
        if (!archetype || !archetype.behavior_rules?.length) return null;

        const lines = [`## Typ: ${archetype.name}`];
        lines.push(archetype.description);
        lines.push('');
        lines.push('Zasady tego typu:');
        for (const rule of archetype.behavior_rules) {
            lines.push(`- ${rule}`);
        }
        return lines.join('\n');
    }

    // ─── A3: role ───

    _buildRoleBehavior(agent, ctx) {
        const roleData = ctx.roleData;
        if (!roleData || !roleData.behavior_rules?.length) return null;

        const lines = [`## Rola: ${roleData.name}`];
        if (roleData.description) {
            lines.push(roleData.description);
        }
        lines.push('');
        lines.push('Zasady roli:');
        for (const rule of roleData.behavior_rules) {
            lines.push(`- ${rule}`);
        }
        return lines.join('\n');
    }

    // ─── B1: environment (skrócone — bez README ekosystemu) ───

    _buildEnvironment(agent, ctx) {
        const lines = [];
        // Use factory default text (will be resolved by _resolveSection for overrides)
        lines.push(FACTORY_DEFAULTS.environment);

        // Focus folders — WHITELIST or Guidance mode (always auto-generated)
        if (agent.focusFolders && agent.focusFolders.length > 0) {
            const isGuidance = agent.permissions?.guidance_mode === true;
            lines.push('');

            if (isGuidance) {
                lines.push('### PRIORYTETOWE FOLDERY');
                lines.push('Masz dostęp do całego vaulta. Te foldery są Twoim priorytetem — szukaj i pracuj tu w pierwszej kolejności:');
            } else {
                lines.push('### TWÓJ OBSZAR ROBOCZY (WHITELIST)');
                lines.push('Widzisz TYLKO te foldery. Reszta vaulta NIE ISTNIEJE dla Ciebie. Nie próbuj szukać ani pisać poza tym obszarem.');
            }

            lines.push('');
            for (const folder of agent.focusFolders) {
                const path = typeof folder === 'string' ? folder : folder.path;
                const access = typeof folder === 'string' ? 'readwrite' : (folder.access || 'readwrite');
                const icon = access === 'read' ? '👁️' : '📝';
                const label = access === 'read' ? 'odczyt' : 'odczyt + zapis';
                const desc = ctx.vaultMapDescriptions?.[path];
                const descPart = desc ? ` — ${desc}` : '';
                lines.push(`- ${icon} **${path}** [${label}]${descPart}`);
            }
        } else {
            lines.push('');
            lines.push('Masz dostęp do całego vaulta (brak ograniczeń folderowych).');
        }

        return lines.join('\n');
    }

    // ─── B3: permissions + agent_rules ───

    _buildPermissions(agent, ctx, enabledGroups) {
        const lines = ['## Uprawnienia'];

        if (!agent.permissions?.mcp) {
            lines.push('⛔ NIE MASZ NARZĘDZI. Nie możesz przeszukiwać vaulta, pamięci, ani wykonywać żadnych akcji.');
            lines.push('Nie wspominaj o narzędziach, nie obiecuj że coś sprawdzisz. Możesz TYLKO rozmawiać.');
            lines.push('');
        }

        const canDo = [];
        if (agent.permissions.read_notes) canDo.push('czytać notatki');
        if (agent.permissions.mcp) canDo.push('używać narzędzi MCP');
        if (agent.permissions.thinking) canDo.push('extended thinking');
        if (canDo.length > 0) lines.push(`MOŻESZ: ${canDo.join(', ')}`);

        const needsApproval = [];
        if (agent.permissions.edit_notes) needsApproval.push('edytować notatki (vault_write)');
        if (agent.permissions.create_files) needsApproval.push('tworzyć pliki');
        if (needsApproval.length > 0) lines.push(`WYMAGA ZATWIERDZENIA: ${needsApproval.join(', ')}`);

        const cantDo = [];
        if (!agent.permissions.edit_notes) cantDo.push('edytować notatek');
        if (!agent.permissions.create_files) cantDo.push('tworzyć plików');
        if (!agent.permissions.delete_files) cantDo.push('usuwać plików');
        if (!agent.permissions.execute_commands) cantDo.push('wykonywać komend systemowych');
        if (!agent.permissions.access_outside_vault) cantDo.push('wychodzić poza vault');
        if (!agent.permissions.mcp) cantDo.push('używać narzędzi MCP');
        if (cantDo.length > 0) lines.push(`NIE MOŻESZ: ${cantDo.join(', ')}`);

        if (agent.enabledTools && agent.enabledTools.length > 0) {
            const allTools = Object.values(TOOL_GROUPS).flat();
            const disabled = allTools.filter(t => !agent.enabledTools.includes(t));
            if (disabled.length > 0) {
                lines.push(`WYŁĄCZONE NARZĘDZIA: ${disabled.join(', ')} — nie próbuj ich używać`);
            }
        }

        if (agent.permissions?.mcp) {
            lines.push('');
            lines.push('ODMOWA: Jeśli user odmówi — NIE ponawiaj. Zapytaj czego potrzebuje.');
        }

        // Agent-specific domain rules (B3)
        if (agent.agentRules) {
            lines.push('');
            lines.push('### Reguły specjalne agenta');
            lines.push(agent.agentRules);
        }

        return lines.join('\n');
    }

    // ─── C1: decision_tree v2 — per-instruction overrides + dynamic filtering ───

    /**
     * Build decision tree with granular instruction resolution.
     * Each instruction is independently: editable, disableable, tool-filtered.
     * Resolution: agent override > global override > factory default.
     * Tool filtering ALWAYS active regardless of overrides.
     */
    _buildDecisionTree(agent, ctx, enabledGroups) {
        const lines = ['## Jak pracować — drzewo decyzyjne', ''];

        // Resolve all instructions (factory + overrides + custom)
        const agentDT = agent.promptOverrides?.decisionTreeInstructions || {};
        const globalDT = ctx.promptDefaults?.decisionTreeOverrides || {};

        // Warn about legacy string overrides
        if (typeof agent.promptOverrides?.decision_tree === 'string' && agent.promptOverrides.decision_tree) {
            console.warn('[PromptBuilder] Agent ma stary format decision_tree (string) — ignorowany. Użyj decisionTreeInstructions.');
        }
        if (typeof ctx.promptDefaults?.decision_tree === 'string' && ctx.promptDefaults.decision_tree) {
            console.warn('[PromptBuilder] Globalny decision_tree (string) — ignorowany. Użyj decisionTreeOverrides.');
        }

        const resolved = this._resolveDecisionTreeInstructions(agentDT, globalDT);

        // Filter by enabled tools + hideWhenMinion/hideWhenMaster
        const filtered = resolved.filter(instr => {
            if (!instr.tool) return true; // null tool = always visible when group visible
            if (!this._isToolEnabled(instr.tool, enabledGroups)) return false;
            if (instr.hideWhenMinion && this._isToolEnabled('minion_task', enabledGroups)) return false;
            if (instr.hideWhenMaster && this._isToolEnabled('master_task', enabledGroups)) return false;
            return true;
        });

        // Group instructions
        const grouped = {};
        for (const instr of filtered) {
            if (!grouped[instr.group]) grouped[instr.group] = [];
            grouped[instr.group].push(instr);
        }

        // Render groups in order
        const sortedGroups = Object.entries(DECISION_TREE_GROUPS)
            .filter(([gid, gdef]) => {
                // Group visible if ANY required tool group is enabled
                if (!gdef.requiredGroups.some(rg => enabledGroups[rg])) return false;
                // And has at least one visible instruction
                return grouped[gid]?.length > 0;
            })
            .sort(([, a], [, b]) => a.order - b.order);

        for (const [groupId, groupDef] of sortedGroups) {
            lines.push(`${groupDef.label}:`);

            // Delegate coverage: if active delegates cover this DT group, add delegation note
            const covering = ctx.delegateAssignments?.filter(
                d => d.overrides?.dt_covered_groups?.includes(groupId)
            ) || [];
            if (covering.length > 0) {
                const names = covering.map(d =>
                    `${d.delegateType === 'minion' ? 'minion' : 'master'} "${d.name}" (${d.delegateType}_task)`
                ).join(', ');
                lines.push(`💡 Deleguj zadania z tej kategorii do: ${names}`);
            }

            for (const instr of grouped[groupId]) {
                lines.push(`- ${instr.text}`);
            }

            // Dynamic injections per group
            this._injectGroupDynamics(groupId, lines, ctx, agent);

            lines.push('');
        }

        // Inbox fallback: if komunikacja group not rendered, inject inbox at bottom
        const hasCommunicationGroup = sortedGroups.some(([gid]) => gid === 'komunikacja');
        if (!hasCommunicationGroup) {
            this._injectInboxNotification(lines, ctx, agent);
        }

        return lines.join('\n');
    }

    /**
     * Resolve all decision tree instructions: factory + global overrides + agent overrides + custom.
     * @returns {Array<{id, group, tool, text}>}
     */
    _resolveDecisionTreeInstructions(agentOverrides, globalOverrides) {
        const result = [];

        // Process factory defaults
        for (const def of DECISION_TREE_DEFAULTS) {
            const agentVal = agentOverrides[def.id];
            const globalVal = globalOverrides[def.id];

            // false = disabled (at either level)
            if (agentVal === false || (agentVal === undefined && globalVal === false)) {
                continue;
            }

            const text = (typeof agentVal === 'string') ? agentVal
                       : (typeof globalVal === 'string') ? globalVal
                       : def.text;

            result.push({ id: def.id, group: def.group, tool: def.tool, text });
        }

        // Process custom instructions (keys starting with "custom_")
        const allCustomKeys = new Set([
            ...Object.keys(globalOverrides).filter(k => k.startsWith('custom_')),
            ...Object.keys(agentOverrides).filter(k => k.startsWith('custom_')),
        ]);

        for (const key of allCustomKeys) {
            const agentVal = agentOverrides[key];
            const globalVal = globalOverrides[key];
            if (agentVal === false || (agentVal === undefined && globalVal === false)) continue;

            const source = (typeof agentVal === 'object' && agentVal?.text) ? agentVal
                         : (typeof globalVal === 'object' && globalVal?.text) ? globalVal
                         : null;

            if (source) {
                result.push({
                    id: key,
                    group: source.group || 'szukanie',
                    tool: source.tool || null,
                    text: source.text,
                });
            }
        }

        return result;
    }

    /**
     * Check if a tool is enabled in any group.
     */
    _isToolEnabled(toolName, enabledGroups) {
        for (const tools of Object.values(enabledGroups)) {
            if (tools.includes(toolName)) return true;
        }
        return false;
    }

    /**
     * Inject dynamic content per group (artifacts, skills, agents).
     */
    _injectGroupDynamics(groupId, lines, ctx, agent) {
        if (groupId === 'artefakty') {
            const todos = ctx.artifacts?.todos;
            const plans = ctx.artifacts?.plans;
            if ((todos?.size > 0) || (plans?.size > 0)) {
                lines.push('');
                lines.push('Istniejące artefakty:');
                if (todos?.size > 0) {
                    for (const [id, todo] of todos) {
                        const done = todo.items?.filter(i => i.done).length || 0;
                        const total = todo.items?.length || 0;
                        lines.push(`  📋 TODO "${todo.title}" (id: ${id}) — ${done}/${total} gotowe`);
                    }
                }
                if (plans?.size > 0) {
                    for (const [id, plan] of plans) {
                        const done = plan.steps?.filter(s => s.status === 'done').length || 0;
                        const total = plan.steps?.length || 0;
                        const status = plan.approved ? 'zatwierdzony' : 'niezatwierdzony';
                        lines.push(`  📝 PLAN "${plan.title}" (id: ${id}) — ${done}/${total} kroków, ${status}`);
                    }
                }
            }
        }

        if (groupId === 'skille' && ctx.skills?.length > 0) {
            // Rich skill descriptions for auto-invoke
            const visibleSkills = ctx.skills.filter(s => !s.disableModelInvocation);
            if (visibleSkills.length > 0) {
                lines.push('- Twoje skille (jeśli zadanie pasuje do opisu — użyj bez pytania):');
                for (const s of visibleSkills) {
                    lines.push(`  ${s.icon || '⚡'} ${s.name}: ${s.description || 'brak opisu'} [${s.category || 'general'}]`);
                }
            }
            const hiddenSkills = ctx.skills.filter(s => s.disableModelInvocation);
            if (hiddenSkills.length > 0) {
                lines.push(`- Skille tylko manualne: ${hiddenSkills.map(s => s.name).join(', ')}`);
            }
        }

        if (groupId === 'delegacja') {
            if (ctx.minionList?.length > 0) {
                const delegates = ctx.delegateAssignments || [];
                const desc = ctx.minionList.map(m => {
                    const da = delegates.find(d => d.name === m.name && d.delegateType === 'minion');
                    const groups = da?.overrides?.dt_covered_groups;
                    const tag = groups?.length > 0 ? ` [→ ${groups.join(', ')}]` : '';
                    return `${m.name} (${m.description})${tag}`;
                }).join(', ');
                lines.push(`- Twoi minioni: ${desc}`);
                if (ctx.defaultMinionName) {
                    lines.push(`- Domyślny minion: ${ctx.defaultMinionName}`);
                }
            }
            if (ctx.masterList?.length > 0) {
                const delegates = ctx.delegateAssignments || [];
                const desc = ctx.masterList.map(m => {
                    const da = delegates.find(d => d.name === m.name && d.delegateType === 'master');
                    const groups = da?.overrides?.dt_covered_groups;
                    const tag = groups?.length > 0 ? ` [→ ${groups.join(', ')}]` : '';
                    return `${m.name} (${m.description})${tag}`;
                }).join(', ');
                lines.push(`- Twoi mastery: ${desc}`);
            }
        }

        if (groupId === 'komunikacja') {
            if (ctx.agentList) {
                const others = ctx.agentList.filter(a => a !== agent.name);
                if (others.length > 0) {
                    lines.push(`- Agenci: ${others.join(', ')}`);
                }
            }
            this._injectInboxNotification(lines, ctx, agent);
        }
    }

    /**
     * Inject inbox notification at bottom of decision tree.
     */
    _injectInboxNotification(lines, ctx, agent) {
        if (ctx.unreadInbox && ctx.unreadInbox > 0) {
            const safeName = agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            lines.push(`📬 MASZ ${ctx.unreadInbox} NIEPRZECZYTANYCH WIADOMOŚCI.`);
            lines.push(`Odczytaj: vault_read(path:".pkm-assistant/komunikator/inbox_${safeName}.md")`);
            lines.push(`Na początku rozmowy poinformuj usera: "Masz ${ctx.unreadInbox} wiadomości — chcesz przejrzeć?"`);
        }
    }

    // ─── C2: minion_guide (merged with playbook pointer) ───

    _buildMinionGuide(agent, ctx) {
        // No-default case: if one minion → use its name, else generic "minion"
        const defaultName = agent.defaultMinion?.name;
        const allNames = ctx.minionList?.map(m => m.name) || [];
        const minionName = defaultName || (allNames.length === 1 ? allNames[0] : 'minion');
        const safeName = agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        // Apply placeholders to factory default or return directly
        return FACTORY_DEFAULTS.minion_guide
            .replace(/\{minion_name\}/g, minionName)
            .replace(/\{agent_safe_name\}/g, safeName);
    }

    // ─── C3: master_guide ───

    _buildMasterGuide(agent, ctx) {
        return FACTORY_DEFAULTS.master_guide;
    }

    // ─── C4: rules ───

    _buildRules(agent, ctx, enabledGroups = {}) {
        return FACTORY_DEFAULTS.rules;
    }

    // ═══════════════════════════════════════════
    // DEPRECATED: kept as no-ops for backward compat
    // ═══════════════════════════════════════════

    /** @deprecated Use decision_tree instead */
    _buildPkmSystem() { return null; }
    /** @deprecated Use decision_tree instead */
    _buildCapabilities() { return null; }
    /** @deprecated Use decision_tree instead */
    _buildToolsOverview() { return null; }
    /** @deprecated Use decision_tree instead */
    _buildSkillsList() { return null; }
    /** @deprecated Use decision_tree instead */
    _buildArtifactsOverview() { return null; }
    /** @deprecated Use decision_tree instead */
    _buildAgoraOverview() { return null; }
    /** @deprecated Use decision_tree instead */
    _buildCommsOverview() { return null; }
    /** @deprecated Use decision_tree instead */
    _buildToolsDetailed() { return null; }
    /** @deprecated Merged into minion_guide */
    _buildPlaybookPointer() { return null; }
}
