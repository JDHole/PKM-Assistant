# HANDOFF — Sesja 45: Delegacja v2

> Skopiuj ten plik + STATUS.md + PLAN_v2.md do nowego czatu z AI.
> Data: 2026-02-26

---

## Kontekst

JDHole — non-programista, vibe-coding z AI, komunikacja PO POLSKU.
Plugin PKM Assistant (Obsek) — Obsidian, fork SC v4.1.7, JavaScript ES Modules.
Kod: `c:\Users\jdziu\Desktop\Obsek\Obsek Plugin\`

## Co zrobiono w sesji 45

Delegacja v2 — fundamenty pod pełny system delegacji w dół (minion) i w górę (master):

1. **Parallel tool execution** — Promise.all w `streamHelper.js` (minion loop) i `chat_view.js` (main chat)
2. **Multi-minion** — parametr `minion` w `minion_task`, resolve: args.minion > activeAgent.minion, error z listą dostępnych
3. **Min iterations** — `min_iterations` w minion.md frontmatter, nudge wymuszający kontynuację pracy
4. **Decision Tree v2.1** — 8 grup (dodano DELEGACJA order:0, KOMUNIKACJA order:6), instrukcje minion/master rozproszone po kategoriach
5. **minionList w kontekście** — AgentManager._buildBaseContext() podaje listę minionów do PromptBuilder

### Pliki zmienione
- `src/core/MinionLoader.js` — min_iterations
- `src/memory/streamHelper.js` — parallel + minIterations nudge
- `src/core/MinionRunner.js` — przekazanie minIterations
- `src/mcp/MinionTaskTool.js` — multi-minion parametr
- `src/core/AgentManager.js` — minionList w kontekście
- `src/core/PromptBuilder.js` — 7 zmian (grupy, instrukcje, injecty, filtrowanie, guides)
- `src/views/chat_view.js` — 3-fazowe parallel tool calls
- `src/mcp/MasterTaskTool.js` — BEZ ZMIAN (czeka na pełny MasterRunner)

---

## Znane problemy do naprawy

### 1. PromptBuilder — minion/master inject prawdopodobnie niepoprawny

Nowe instrukcje minion/master w Decision Tree zostały dodane, ale **fizycznie nie ma jeszcze wielu minionów ani masterów w puli**. Przez to:
- `_injectGroupDynamics()` w grupie DELEGACJA wstrzykuje listę minionów — ale jeśli jest tylko 1 (default), to mało przydatne
- Instrukcje `search_minion_multi`, `search_minion_reader`, `art_master_plan` istnieją w DECISION_TREE_DEFAULTS ale mogą się źle wyświetlać w Prompt Builder jeśli `minion_task`/`master_task` nie są w enabledGroups
- **Trzeba przetestować w Obsidianie** z włączonym i wyłączonym minionem/masterem i sprawdzić czy instrukcje poprawnie się zamieniają
- Stare instruction IDs (search_minion, deleg_minion, deleg_master, deleg_agent, deleg_message, search_delegate) zostały usunięte — user overrides z tymi ID cicho przestały działać

### 2. Kilka rzeczy olanych w sesji 45

- **MasterTaskTool** — wciąż single-call (bez tool loop), hardcoded 8000 char context limit, generic prompt "Jesteś ekspertem AI". Pełny MasterRunner/MasterLoader to osobne zadanie
- **Prompt Builder UI** — nowe grupy (KOMUNIKACJA, DELEGACJA) powinny się pojawić automatycznie, ale nie było weryfikacji wizualnej
- **chat_view parallel** — ApprovalManager nie kolejkuje modali. Jeśli 2 tool calle wymagające approval lecą równolegle (np. 2x vault_write), mogą się nałożyć. Edge case, ale warto wiedzieć
- **Inbox notification** — przeniesiony z DELEGACJA do KOMUNIKACJA, z fallbackiem. Nie przetestowane czy fallback działa gdy agent nie ma communication tools

### 3. Brak Minion/Master Creator i Manager

To jest kluczowy brak dla pełnego systemu delegacji:

**Minion Creator:**
- Analogiczny do Role Creator (RoleEditorModal) w Settings
- Formularz: nazwa, opis, model override, max_iterations, min_iterations, allowed_tools, system prompt
- Zapis do `.pkm-assistant/minions/{name}/minion.md`
- Hot-reload po zapisie (MinionLoader już to obsługuje)
- Backstage (BackstageViews.js) już ma listę minionów — potrzebuje przycisk "Utwórz" + edycja

**Master Creator:**
- Analogiczny do Minion Creator ale dla masterów
- Potrzebuje MasterLoader (nie istnieje!) + MasterRunner (nie istnieje!) + master.md format
- Master tools: plan_action, chat_todo, vault_write (NIE vault_search — master nie szuka sam)
- `master_task` potrzebuje parametr `master` (analogicznie do `minion` w `minion_task`)

**Manager (w Backstage):**
- Lista minionów/masterów z opcją edycji/usunięcia/tworzenia
- Cross-reference z agentami (który agent używa którego miniona)
- Miniony/mastery widoczne w sidebar Backstage (BackstageViews.js) — lista już istnieje, brakuje CRUD

---

## Sugerowana kolejność następnych sesji

1. **Przetestować Delegację v2** w Obsidianie — sprawdzić PromptBuilder, parallel tools, multi-minion
2. **Naprawić PromptBuilder** jeśli testy wykażą problemy z inject/filter
3. **Minion Creator** w Settings/Backstage — CRUD na miniony
4. **MasterRunner + MasterLoader** — pełny system mastera (analogiczny do MinionRunner)
5. **Master Creator** w Settings/Backstage

---

## Pliki do przeczytania

- `src/core/PromptBuilder.js` — DECISION_TREE_GROUPS, DECISION_TREE_DEFAULTS, _injectGroupDynamics(), FACTORY_DEFAULTS.minion_guide/master_guide
- `src/memory/streamHelper.js` — streamToCompleteWithTools() z parallel + minIterations
- `src/views/chat_view.js` — 3-fazowe parallel tool calls (szukaj "Phase 1", "Phase 2", "Phase 3")
- `src/mcp/MinionTaskTool.js` — multi-minion resolution
- `src/mcp/MasterTaskTool.js` — obecny stan (single-call, bez MasterRunner)

---

*Wygenerowany po sesji 45*
