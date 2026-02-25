# PKM Assistant - Master Plan v2.0

> **Swiety Gral #2** obok WIZJA.md.
> Odznaczaj `[x]` w miare postepow. Kopiuj do kazdego czatu z AI razem z WIZJA.md i STATUS.md.
> Stworzony: 2026-02-23 (PLAN v2.0 - czysty restart po sesji 30)
> Zastepuje oryginalny PLAN.md (ktory zostal zbyt pomieszany sprintami/sesjami)

---

## Jak czytac ten plan

- `[x]` = gotowe i przetestowane
- `[ ]` = do zrobienia
- **CZESC 1** = co juz zostalo zrobione (odwzorowuje sesje 1-30)
- **CZESC 2** = co pozostalo do v1.0 (na bazie CHECKPOINT_sesja28.md)
- **CZESC 3** = post v1.0 (v1.5, v2.0 - dalsze wizje)
- Checkboxy w CZESCI 2 to **konkretne zadania** — kazde AI moze wziac i wykonac

### Wersje pluginu

| Wersja | Sesja | Opis |
|--------|-------|------|
| 4.1.7 | - | Odziedziczona z Smart Connections (STARA) |
| 1.0.0 | 15 | Reset wersji - wlasne wersjonowanie Obsek |
| 1.0.1 | 15 | Skill Engine |
| 1.0.2 | 16 | Minion per Agent |
| 1.0.3 | 19 | Architektura 4 modeli |
| 1.0.4 | 21 | Playbook + Vault Map |
| 1.0.5 | 22 | Agent Manager + Creator |
| 1.0.6 | 23-25 | Komunikator + Delegacja + Rozszerzony Chat |
| 1.0.7 | 26-27 | Sidebar Nav + Artefakty globalne + Subtaski |
| 1.0.8 | 28-29 | Checkpoint + Sprint Roadmap + WIZJA/PLAN update |
| 1.0.9 | 30 | SC singleton wyeliminowany, semantyczny search, rebranding |

### Kluczowy wniosek z checkpointu (sesja 28)

> **Kod jest GOTOWY w ~90%. Problem jest w PROMPTACH.**
> Architektura dziala. Ale prompty za krotkie, opisy narzedzi za biedne, skille za male.
> Nastepna faza to NIE faza kodu. To faza PROMPTOW, CONTENTU i POLISH.

---

# ══════════════════════════════════════════
# CZESC 1: CO JUZ ZROBIONE (sesje 1-30)
# ══════════════════════════════════════════

> Stan na: 2026-02-24, wersja 1.0.9, ~178 checkboxow odznaczonych
> Wszystko ponizej jest zaimplementowane, przetestowane i dziala w buildzie.

---

## 1.1 Fundament pluginu

- [x] Fork Smart Connections v4.1.7 jako baza
- [x] Plugin laduje sie w Obsidianie bez bledow
- [x] Build: `npm run build` → 6.8MB, auto-kopia do vaultu
- [x] Rebranding: "Smart Connections" → "PKM Assistant" w UI, komendach, ikonach
- [x] Wlasna ikona pluginu (graf wiedzy zamiast buzki)
- [x] package.json, manifest.json - metadane PKM Assistant
- [x] Linki w UI kieruja do GitHub JDHole/PKM-Assistant
- [x] WIZJA.md kompletna (21 sekcji, pelna wizja produktu)
- [x] PLAN.md kompletny (ten plik — v2.0)
- [x] Czysty log konsoli (zero spamu warningow)
- [x] Ribbon icon Obsek - otwiera chat

## 1.2 SC Singleton Elimination (sesja 30)

- [x] PKMPlugin.js (~95 LOC) - zastepuje SmartPlugin, rozszerza Obsidian.Plugin
- [x] PKMEnv.js (~160 LOC) - zastepuje SmartEnv (module-scoped PKM_SCOPE, bez window.smart_env)
- [x] main.js: SmartPlugin → PKMPlugin, SmartEnv → PKMEnv
- [x] Koegzystencja: PKM Assistant + Smart Connections moga dzialac jednoczesnie
- [x] Embeddingi WLACZONE: process_embed_queue: true
- [x] vault_search SEMANTYCZNY: SmartSources.lookup() z hypotheticals
- [x] memory_search SEMANTYCZNY: EmbeddingHelper + cosine similarity
- [x] Fallback na keyword indexOf jesli model embeddingowy niedostepny
- [x] Rebranding: 15 SC ghost strings usunietych (view types, codeblocks, links)
- [x] 5 martwych modulow SC usunietych (smart-actions/clusters/cluster-groups/completions/directories)
- [x] external-deps/ zostawione (adaptery dzialaja) - full extraction opcjonalna pozniej

## 1.3 Skill Engine

- [x] SkillLoader: ladowanie skilli z .pkm-assistant/skills/, cache, auto-reload
- [x] 4 starter skille: daily-review, vault-organization, note-from-idea, weekly-review
- [x] MCP tool skill_list - lista skilli agenta (z filtrem po kategorii)
- [x] MCP tool skill_execute - aktywuj skill po nazwie (zwraca pelny prompt)
- [x] Guziki skilli w UI chatu (pill/chip style, hover efekt, scrollowalne)
- [x] Agent tworzy nowe skille przez vault_write do .pkm-assistant/skills/
- [x] Hot-reload po vault_write do /skills/ + odswiezenie guzikow
- [x] Przypisanie skilli do agenta: skills[] w konfiguracji (JS + YAML)
- [x] Cykl iteracji: user uzywa → feedback → agent poprawia skill

## 1.4 Minion per Agent

- [x] MinionLoader: ladowanie konfiguracji z .pkm-assistant/minions/
- [x] MinionRunner: dwa tryby - auto-prep (1. wiadomosc) + minion_task (delegowanie)
- [x] streamToCompleteWithTools(): petla tool-calling w streamHelper.js
- [x] 3 starter miniony: jaskier-prep, dexter-vault-builder, ezra-config-scout
- [x] MCP tool minion_task - agent swiadomie deleguje ciezka prace minionowi
- [x] Auto-prep: minion przygotowuje kontekst TYLKO przy 1. wiadomosci sesji
- [x] Sugestia skilli: minion podpowiada ktory skill pasuje
- [x] Typing indicator: "Minion przygotowuje kontekst..."
- [x] Graceful failure: minion padnie → main model odpowiada normalnie
- [x] Hot-reload: edycja minion.md → przeladowanie konfiguracji

## 1.5 Architektura 4 modeli

- [x] 4 sloty: Main (rozmowa), Minion (robota w tle), Master (geniusz), Embedding (wektory)
- [x] modelResolver.js: centralny utility do tworzenia modeli per rola
- [x] 8 platform: Anthropic, OpenAI, DeepSeek, Gemini, Groq, OpenRouter, Ollama, LM Studio
- [x] Per-agent model overrides w Agent.js + yamlParser
- [x] MCP tool master_task: agent deleguje trudne zadania W GORE do Mastera
- [x] master_task 3 tryby: domyslny, z instrukcjami dla miniona, bez miniona
- [x] Graceful fallback: brak Mastera → Main odpowiada sam
- [x] UI: sekcja "Modele" w ustawieniach z 4 polami + opisami po polsku

## 1.6 Playbook + Vault Map

- [x] PlaybookManager.js: zarzadzanie playbook.md i vault_map.md per agent
- [x] playbook.md per agent: lista narzedzi, skilli, procedur
- [x] vault_map.md per agent: mapa stref vaulta z opisami
- [x] Starter playbooki/vault mapy tworzone automatycznie
- [x] Minion czyta playbook + vault_map przy auto-prep
- [x] Agent ma lekki pointer w system prompcie (nie pelna tresc)
- [x] Hot-reload: edycja playbook/vault_map przeladowuje config

## 1.7 Agent Manager + Creator

- [x] AgentProfileView: 5 zakladek inline w sidebarze (Profil, Uprawnienia, Umiejetnosci, Pamiec, Statystyki)
- [x] Agent Creator: formularz + tworzenie przez rozmowe z Jaskierem (skill create-agent)
- [x] AgentDeleteModal: usuwanie agenta z opcja archiwizacji pamieci
- [x] Tylko Jaskier jako wbudowany agent (Dexter/Ezra to szablony/archetypy)
- [x] Built-in overrides: edycja Jaskiera zapisywana do _overrides.yaml
- [x] Fallback: usuniecie ostatniego agenta → auto-odtworzenie Jaskiera
- [x] Archiwizacja pamieci agenta do .pkm-assistant/archive/ przy usuwaniu

## 1.8 Komunikator + Delegacja

- [x] KomunikatorManager: pliki inbox per agent, parsowanie, zapis, markAsRead
- [x] MCP tool agent_message - wysylanie wiadomosci miedzy agentami
- [x] MCP tool agent_delegate - delegowanie zadania z kontekstem
- [x] Delegacja: sesja zapisana → kontekst w Komunikatorze → nowy agent z kontekstem
- [x] CommunicatorView: inline w sidebarze (chipy agentow, inbox, compose)
- [x] SendToAgentModal: context menu "Wyslij do asystenta"
- [x] MinionRunner: czytanie inbox w auto-prep
- [x] Agent.js: sekcja KOMUNIKATOR w system prompcie
- [x] Dual read status (NOWA/USER_READ/AI_READ/ALL_READ)

## 1.9 Rozszerzony Chat + Artefakty

- [x] ThinkingBlock: zwijany blok "Myslenie..." z reasoning_content (DeepSeek + Anthropic)
- [x] ChatTodoList v2: inline edit (dblclick), dodawanie (+), usuwanie (x), modal pelnej edycji
- [x] PlanArtifact v2: klikalna ikona statusu, dblclick edit, subtaski [{text, done}], modal
- [x] ChatTodoTool: MCP tool chat_todo (create/update/add_item/remove_item/save/list)
- [x] PlanTool: MCP tool plan_action (create/update_step/add_subtask/toggle_subtask/get/list)
- [x] ArtifactManager: globalny folder .pkm-assistant/artifacts/, slugified filenames, auto-save
- [x] Migracja starych per-agent artefaktow → globalne
- [x] Artefakty przetrwaja restart pluginu + zmiane agenta
- [x] Artifact panel: overlay z lista WSZYSTKICH artefaktow, badge agenta, modal edit, kopiuj do vaulta
- [x] Artifact discovery: summary wstrzykiwane do system promptu agenta
- [x] Delegacja + artefakty: aktywne todo/plany przekazywane przy delegacji
- [x] InlineCommentModal: context menu "Komentarz do Asystenta"
- [x] Quick link po vault_write: klikalny link do pliku w chacie
- [x] Animacje CSS: streaming shimmer, slideDown tool calli, pulsujace pending
- [x] Ustawienie "Pokaz myslenie AI" (obsek.showThinking)
- [x] Chat layout: flex row (main + toolbar), bottom panel (skille + input)
- [x] Right toolbar: 3 ikonki (artefakty, skille toggle, tryby)

## 1.10 Sidebar Navigation + Zaplecze

- [x] SidebarNav: stack-based nawigacja push/pop/replace/goHome/refresh
- [x] HomeView: agents + komunikator + zaplecze
- [x] AgentProfileView: 5 zakladek inline (Profil, Uprawnienia, Umiejetnosci, Pamiec, Statystyki)
- [x] CommunicatorView: inline komunikator z chipami agentow
- [x] BackstageViews: Skills (nazwa, opis, kategoria), Narzedzia MCP (6 grup), Miniony
- [x] DetailViews: podglad szczegolowy skilla/miniona z cross-referencjami agentow
- [x] Cross-referencing: z profilu agenta do skilla/miniona i odwrotnie
- [x] Edycja plikow ukrytych (HiddenFileEditorModal)
- [x] Zero modali w sidebarze - wszystko inline

## 1.11 System pamieci (FAZY 0-7 KOMPLETNE)

- [x] brain.md: dlugoterminowa pamiec (fakty o userze)
- [x] active_context.md: biezacy kontekst
- [x] sessions/: pojedyncze rozmowy
- [x] summaries/L1/: kompresja 5 sesji → 1 streszczenie
- [x] summaries/L2/: kompresja 5 L1 → 1 mega-streszczenie
- [x] audit.log: log zmian pamieci
- [x] MemoryExtractor: automatyczna ekstrakcja faktow z rozmow
- [x] RollingWindow: automatyczna kompresja historii przy 70% limitu tokenow
- [x] RAGRetriever: retrieval-augmented generation na pamieci
- [x] MCP tools: memory_search (semantyczny), memory_update, memory_status
- [x] Voice commands: "zapamietaj", "zapomnij", "co o mnie wiesz", "pokaz pamiec"
- [x] Fuzzy deduplikacja faktow, brain_archive.md (overflow)
- [x] Minion model do operacji pamieciowych

## 1.12 MCP Tools (20 total)

- [x] vault_read, vault_list, vault_write, vault_delete, vault_search (semantyczny)
- [x] memory_search (semantyczny), memory_update, memory_status
- [x] skill_list, skill_execute
- [x] minion_task, master_task
- [x] agent_message, agent_delegate
- [x] chat_todo, plan_action
- [x] agora_read, agora_update, agora_project (sesja 35)
- [x] ToolRegistry: centralna rejestracja
- [x] MCPClient: egzekwowanie permissions, passing plugin as 3rd arg
- [x] ToolLoader: czyta custom tools z .pkm-assistant/tools/*.json (execute jest STUB)
- [x] ToolCallDisplay: polskie nazwy narzedzi, guziki kopiowania

## 1.13 Bezpieczenstwo + Ustawienia

- [x] PermissionSystem: read/write/delete/execute/mcp
- [x] ApprovalManager: modal zatwierdzania operacji
- [x] VaultZones: strefy dostepu (konfiguracja w config.yaml)
- [x] Blokada .smart-env/ w VaultRead/List/Write
- [x] keySanitizer.js: ochrona sciezek i maskowanie kluczy API
- [x] Anti-key prompt w MemoryExtractor
- [x] Settings persistence: namespace `obsek` (nie gina po restarcie)
- [x] Platform auto-detection z nazw kluczy API
- [x] Ustawienia po polsku z czytelnymi opisami

## 1.14 Stabilizacja — bugi (sesja 35)

- [x] Fix: todo widget duplikacja przy aktualizacji agenta
- [x] Fix: crash przy ladowaniu starej sesji (artefakty niedostepne)
- [x] Fix: petla retry uprawnien (agenci ponawiaja tool call po odmowie usera)
- [x] Fix: chat dostepny przed zaladowaniem env

## 1.15 AGORA — Wspólna Baza Wiedzy Agentów (sesja 35)

- [x] AgoraManager.js: core moduł (profil, aktywność, mapa, projekty, dostęp)
- [x] Struktura: .pkm-assistant/agora/ (profile.md, vault_map.md, activity.md, access.yaml, projects/)
- [x] Profile CRUD: 8 sekcji (kim_jestem, zainteresowania, cele, wartosci, projekty, wyzwania, ustalenia, sukcesy)
- [x] Activity Board: max 30 wpisów, archiwizacja, broadcast agentów
- [x] Vault Map: globalna mapa vaulta ze strefami
- [x] Access Control: 3 poziomy (admin/contributor/reader), YAML config
- [x] Projekty współdzielone: tworzenie, zadania, komentarze, statusy, ping agentów
- [x] Projekty UI: dodawanie/usuwanie agentów, usuwanie projektu z potwierdzeniem
- [x] 3 nowe MCP tools: agora_read, agora_update, agora_project
- [x] MCP narzedzia: 20 total
- [x] AgoraView.js: pełny sidebar UI z 5 zakładkami, inline CRUD (zero raw file edytorów)
- [x] Prompt context: buildPromptContext() + buildMinionContext() wstrzykiwane do system promptu
- [x] Integracja: Agent.js, AgentManager.js, MinionRunner.js, MCPClient.js, main.js
- [x] Build: 6.9MB, wersja 1.0.9

---

# ══════════════════════════════════════════
# CZESC 2: CO POZOSTALO DO v1.0
# ══════════════════════════════════════════

> Oparte na: CHECKPOINT_sesja28.md (19 punktow, ~80 podpunktow)
> Klucz: **to jest faza PROMPTOW i POLISH, nie faza kodu**
> Szacunek: ~25-35 sesji do release v1.0
> Kolejnosc: od gory do dolu (zaleznosci uwzglednione)

---

## 2.1 STABILIZACJA + DAILY USE ← BUGI ZROBIONE (sesja 35)

> **Cel:** Plugin nadaje sie do CODZIENNEGO uzytku bez crashy.
> **Wymaga:** niczego (fundament gotowy)
> **Szacunek:** 2-3 sesje
> **Odniesienie:** Checkpoint punkt 2 (gotownosc daily use)

### 2.1.1 Fix 4 znanych bugow
- [x] Fix: todo widget duplikacja przy aktualizacji agenta (nowy widget zamiast update istniejacego)
- [x] Fix: crash przy ladowaniu starej sesji (artefakty niedostepne)
- [x] Fix: petla retry uprawnien (agenci ponawiaja tool call po odmowie usera)
- [x] Fix: chat dostepny przed zaladowaniem env (brak system prompt, tools=0, brak agenta — chat_view.js nie czeka na agentManager)

### 2.1.2 Drobne fixy
- [ ] Wywalenie SC "What's New" ghost (jesli zostalo po sesji 30)
- [ ] Testowanie streaming na min. 3 platformach (DeepSeek, Ollama, OpenRouter)
- [ ] Testowanie tool calling dziala poprawnie
- [ ] Testowanie minion/master wywolania dzialaja
- [ ] Testowanie: nowa sesja + ladowanie starej sesji + komunikator + artefakty

### 2.1.3 Daily use
- [ ] Minimum 3 dni codziennego uzywania bez krytycznych bledow
- [ ] Podlaczenie wlasnej Ezry — przeniesienie systemu z Antigravity na nasz plugin
- [ ] Bugi wpisywane w debugging note w vaultcie

---

## 2.2 OPISY MCP TOOLS — FUNDAMENTALNA ZMIANA JAKOSCI

> **Cel:** Agent przestaje sie gubic i loopowac. Wie CO, KIEDY i JAK uzywac narzedzi.
> **Wymaga:** 2.1 (stabilny plugin)
> **Szacunek:** 1-2 sesje (czysta praca tekstowa, zero kodu)
> **Odniesienie:** Checkpoint punkt 9a (opisy zjebane), punkt 5 (architektura AI)
>
> **Dlaczego to priorytet:** Claude Code poswięca ~16,800 tokenow na opisy 18 narzedzi (~1000 tok/tool).
> Nasz plugin uzywa ~25 tokenow na opis narzedzia. To jest GLOWNY powod
> dlaczego agent sie gubi, loopuje i zle uzywa argumenty.

### 2.2.1 Przepisanie opisow 20 MCP tools
- [x] vault_read: pelna dokumentacja (co, kiedy, jak, limity, przyklady, czego NIE robic) ✅ sesja 36
- [x] vault_list: j.w. ✅ sesja 36
- [x] vault_write: j.w. (w szczegolnosci: append vs replace, kiedy tworzyc nowy plik) ✅ sesja 36
- [x] vault_delete: j.w. (ostrzezenie o nieodwracalnosci, co jest chronione) ✅ sesja 36
- [x] vault_search: j.w. (semantyczny vs keyword fallback, jak formulowac zapytania) ✅ sesja 36
- [x] memory_search: j.w. (co przeszukuje, typy wynikow, kiedy uzywac vs vault_search) ✅ sesja 36
- [x] memory_update: j.w. (tryby: zapamiętaj/zapomnij/czytaj, format danych) ✅ sesja 36
- [x] memory_status: j.w. ✅ sesja 36
- [x] skill_list: j.w. ✅ sesja 36
- [x] skill_execute: j.w. (co zwraca, jak uzyc wyniku) ✅ sesja 36
- [x] minion_task: j.w. (kiedy delegowac, jak sformulowac zadanie, 3 tryby) ✅ sesja 36
- [x] master_task: j.w. (kiedy delegowac W GORE, roznica vs minion_task) ✅ sesja 36
- [x] agent_message: j.w. (format wiadomosci, kiedy uzywac vs agent_delegate) ✅ sesja 36
- [x] agent_delegate: j.w. (co sie dzieje po delegacji, jak przekazac kontekst) ✅ sesja 36
- [x] chat_todo: j.w. (kiedy tworzyc, jak aktualizowac, format items) ✅ sesja 36
- [x] plan_action: j.w. (kiedy tworzyc plan, statusy, subtaski) ✅ sesja 36
- [x] agora_read: j.w. (co czytac, sekcje, kiedy uzywac) ✅ sesja 36
- [x] agora_update: j.w. (profil, mapa, aktywnosc — kiedy i jak aktualizowac) ✅ sesja 36
- [x] agora_project: j.w. (CRUD projektow, tasków, komentarzy, ping) ✅ sesja 36
- [ ] Weryfikacja: agent poprawnie uzywa narzedzi po aktualizacji opisow

---

## 2.3 ROZBUDOWA SYSTEM PROMPTU AGENTA

> **Cel:** Agent wie KIM jest, CO moze, JAK sie zachowywac. Prompt z ~500 do ~2000+ tokenow.
> **Wymaga:** 2.2 (zeby opisy narzedzi juz byly dobre)
> **Szacunek:** 1-2 sesje (praca tekstowa + testy)
> **Odniesienie:** Checkpoint punkt 3f (system prompt za krotki), punkt 3d (uprawnienia)

### 2.3.1 Rozbudowa system promptu
- [x] Pelne instrukcje zachowania agenta (nie 3 linijki a pelna osobowosc + zasady) ✅ sesja 37 PromptBuilder
- [x] Lista narzedzi z krotkimi opisami wstrzykiwana do system promptu ✅ sesja 37 _buildToolsOverview
- [x] Lista skilli z krotkimi opisami wstrzykiwana do system promptu (punkt 4c z checkpointu) ✅ sesja 37 _buildSkillsList
- [x] Uprawnienia widoczne w system prompcie — agent WIE czego NIE moze (punkt 3d) ✅ sesja 37 _buildPermissions + sesja 38 "NIE MASZ NARZEDZI"
- [x] Info o minionie i masterze: kiedy delegowac, jak formulowac zadania ✅ sesja 37 _buildMinionGuide + _buildMasterGuide
- [x] Kontekst roli agenta wplywa na instrukcje (nie tylko dekoracja — punkt 3a) ✅ sesja 44 PromptBuilder _buildRoleBehavior() + 3-layer overrides
- [x] Wersja skrocona dla lokalnych modeli (<14B) — tylko essentials ✅ sesja 37 lean/fat mode (hasMinion toggle)
- [x] Edytowalne sekcje PKM System + Srodowisko z Settings ✅ sesja 38 textarea w obsek_settings_tab.js
- [x] Zasady adaptacyjne wg permissions agenta ✅ sesja 38 _buildRules z enabledGroups
- [x] L1 pointer zamiast pelnego tekstu w pamieci (oszczednosc ~1500 tok) ✅ sesja 38
- [x] Inbox akcjowalny z vault_read sciezka ✅ sesja 38
- [x] Focus Folders przeniesione z Uprawnienia → Srodowisko ✅ sesja 38
- [x] Per-agent tool filtering (enabledTools[]) ✅ sesja 37 TOOL_GROUPS + UI w AgentProfileView

### 2.3.2 Testy promptow
- [x] Test: agent NIE probuje narzedzi ktorych nie ma (po dodaniu uprawnien do promptu) ✅ sesja 38 fix "NIE MASZ NARZEDZI" + tools:0
- [ ] Test: agent poprawnie deleguje do miniona/mastera
- [x] Test: agent uzywa skilli bez koniecznosci wywolywania skill_list ✅ sesja 44 DT instrukcja "Znasz swoje skille" + _injectGroupDynamics() lista nazw
- [ ] Test na DeepSeek, Ollama, OpenRouter — rozne modele, ten sam prompt

---

## 2.4 OCZKO — SWIADOMOSC AKTYWNEJ NOTATKI

> **Cel:** Agent wie co user ma otwarte w edytorze — reaguje kontekstowo.
> **Wymaga:** 2.1 (stabilny plugin)
> **Szacunek:** 1 sesja
> **Odniesienie:** Checkpoint punkt 10b (oczko), WIZJA sekcja 8c

- [x] Implementacja: app.workspace.getActiveFile() → aktywna notatka ✅ (sesja 39)
- [x] Kontekst aktywnej notatki (tytul + ~500 tokenow + frontmatter) wstrzykiwany do promptu ✅ (sesja 39)
- [x] Toggle w UI chatu: wlacz/wylacz swiadomosc notatki (ikona oka) ✅ (sesja 39)
- [x] Domyslnie WLACZONE (user moze wylaczyc) ✅ (sesja 39)
- [x] Agent odnosi sie do otwartej notatki bez pytania usera o nazwe pliku ✅ (sesja 39)

---

## 2.5 PROMPT TRANSPARENCY — USP PRODUKTU

> **Cel:** User widzi PELNY prompt ktory idzie do API. To nas odroznia od KAZDEGO innego narzedzia AI.
> **Wymaga:** 2.2 + 2.3 (opisy narzedzi i prompt juz rozbudowane — jest co pokazywac)
> **Szacunek:** 2-3 sesje
> **Odniesienie:** Checkpoint punkt 8d, WIZJA sekcja 8b

### 2.5.1 Podglad promptu
- [x] Nowy widok/panel: Prompt Inspector (zakladka w Agent Managerze lub overlay w chacie) ✅ sesja 37 w Settings
- [x] Wyswietla pelny system prompt agenta ✅ sesja 37 przycisk "Pokaz prompt" + modal
- [x] Wyswietla opisy WSZYSTKICH narzedzi (tool descriptions) ✅ sesja 40 TOOL_DESCRIPTIONS + Backstage redesign
- [x] Wyswietla kontekst auto-prep miniona ✅ sesja 40 SubAgentBlock w chacie
- [x] Wyswietla aktywne artefakty i skille w prompcie ✅ sesja 37 sekcja skills_list w PromptBuilder
- [x] Wyswietla kontekst RAG i pamieci (brain, L1/L2) ✅ sesja 37 dynamic sections memory + agora

### 2.5.2 Metryki
- [x] Liczba tokenow PER ELEMENT (system prompt: X tok, tools: Y tok, pamiec: Z tok...) ✅ sesja 37 getTokenBreakdown() per sekcja
- [x] Calkowity koszt wywolania (input + output tokens) ✅ sesja 40 TokenTracker (main/minion/master, per-sesja)
- [x] Podglad opisow narzedzi z ich rozmiarem w tokenach ✅ sesja 37 sekcja tools_overview z tokenami

### 2.5.3 Edycja z UI
- [x] Mozliwosc edycji system promptu agenta bezposrednio z Prompt Inspectora ✅ sesja 38 textarea PKM + Srodowisko → sesja 44 Prompt Builder z inline edytorami per sekcja
- [x] Mozliwosc wylaczenia/wlaczenia poszczegolnych elementow (RAG, pamiec, opisy narzedzi) ✅ sesja 40 toggles → sesja 44 WSZYSTKO toggleable (usuniety required:true), live token update
- [ ] Mozliwosc edycji opisow narzedzi z UI (krotsze/dluzsze/dokladniejsze)

---

## 2.6 PERSONALIZACJA AGENTA — NAJWAZNIEJSZY GAP

> **Cel:** Agent ktory NAPRAWDE jest spersonalizowany — nie dekoracja z emoji i jednolinijkowa osobowoscia.
> **Wymaga:** 2.3 (rozbudowany system prompt)
> **Szacunek:** 3-4 sesje
> **Odniesienie:** Checkpoint punkt 3 (caly — 6 podpunktow)

### 2.6.1 Archetyp → Rola (sesja 41: PART 1 DONE ✅)
- [x] 4 archetypy: orchestrator, specialist, assistant, meta_agent — definiuja filozofie pracy ✅ sesja 41
- [x] Archetyp → behavior_rules wstrzykiwane do system promptu (PromptBuilder) ✅ sesja 41
- [x] Kolejnosc sekcji: tozsamosc → archetyp → pkm/env → rola → osobowosc ✅ sesja 41
- [x] Archetyp NIE zmienia temperature/permissions — tylko Rola to robi ✅ sesja 41

### 2.6.2 Role — specjalizacje agentow (sesja 41: DONE ✅)
- [x] RoleLoader: ladowanie z built-in + YAML z .pkm-assistant/roles/ ✅ sesja 41
- [x] 4 wbudowane role: jaskier-mentor, vault-builder, creative-writer, daily-assistant ✅ sesja 41
- [x] Rola definiuje: behavior_rules, personality_template, skills, focus_folders, temp, permissions ✅ sesja 41
- [x] Rola ZAWSZE nadpisuje dane w kreatorze, "Brak" = kasacja do domyslnych ✅ sesja 41
- [x] Role Creator w Settings: formularz UI (nowa rola, edycja, usun, kopia wbudowanej) ✅ sesja 41
- [x] RoleEditorModal: pelny formularz z emoji, nazwa, archetyp, opis, zasady, personality, skills, foldery, temp, permissions ✅ sesja 41
- [ ] Role importowalne: YAML export/import do dzielenia sie rolami

### 2.6.3 Migracja archetyp/rola (sesja 41: DONE ✅)
- [x] Agent.js: archetype = broad class (orchestrator/specialist/assistant/meta_agent), role = specific specialization ✅ sesja 41
- [x] AgentLoader._migrateArchetypeRole(): stare wartosci auto-konwertowane ✅ sesja 41
- [x] HumanVibe/ObsidianExpert/AIExpert zaktualizowane do nowych wartosci ✅ sesja 41

### 2.6.4 Memory tab redesign (sesja 41: DONE ✅)
- [x] 6 plikow widocznych: brain, playbook, vault_map, active_context, audit, sessions ✅ sesja 41
- [x] Collapsible sekcje z markdown renderingiem (splitMarkdownSections) ✅ sesja 41
- [x] Mini-formularze: "Dodaj instrukcje" (playbook), "Dodaj lokacje" (vault_map) ✅ sesja 41
- [x] Edit button dla brain/active_context/audit ✅ sesja 41
- [x] Sessions: lista z copy-path i otwieraniem ✅ sesja 41

### 2.6.5 Uprawnienia — Access Control ✅ sesja 42
- [x] Per-tool permissions: mozliwosc wlaczania/wylaczania KONKRETNYCH narzedzi (nie all-or-nothing MCP) ✅ sesja 37 TOOL_GROUPS + enabledTools[] + UI per-group toggle
- [x] Focus folders jako TWARDE blokowanie vault_read/list/search — AccessGuard.js WHITELIST model ✅ sesja 42
- [x] Panel uprawnien z per-folder access control (read/write) — autocomplete + chipy z toggle 👁️/📝 ✅ sesja 42
- [ ] Per-agent master_task toggle (wlacz/wylacz delegacje W GORE per agent)
- [x] Fix: permission denial retry loop — denial memory w MCPClient + rich error messages + PromptBuilder info ✅ sesja 42
- [x] MinionRunner security fix — route przez MCPClient zamiast direct execute ✅ sesja 42
- [x] ApprovalModal rewrite — polskie opisy, content preview, structured deny z powodem ✅ sesja 42
- [x] AgoraView cross-reference — "Dostep agentow (WHITELIST)" z folder badges ✅ sesja 42

### 2.6.6 Rozbudowa Agent Creatora
- [x] Archetyp dropdown (4 opcje) + Rola dropdown (sugerowane wg archetypu + pozostale) ✅ sesja 41
- [x] Podglad generowanego system promptu w kreatorze (zeby user widzial efekt zmian) ✅ sesja 44 Prompt Builder panel z agent selector + expand/collapse
- [ ] Format exportu agenta: caly pakiet w jednym pliku (dla marketplace w przyszlosci)

---

## 2.7 MASTERRUNNER — PELNY EKOSYSTEM MASTERA

> **Cel:** Master to juz nie jednorazowy call — ma wlasny ekosystem jak Minion.
> **Wymaga:** 2.3 (rozbudowany prompt z info o masterze)
> **Szacunek:** 2-3 sesje
> **Odniesienie:** Checkpoint punkt 5 (master nieodkryty potencjal)

### 2.7.1 Fundament
- [ ] master.md per agent: instrukcje specyficzne dla domeny Mastera (jak minion.md)
- [ ] MasterLoader (wzor: MinionLoader): ladowanie, cache, walidacja, hot-reload
- [ ] MasterRunner z tool-calling loop (streamToCompleteWithTools)
- [ ] Przerobienie master_task na pelny runner (nie jednorazowe wywolanie)

### 2.7.2 Narzedzia Mastera
- [ ] Master dostaje narzedzia: plan_action, chat_todo, vault_write, vault_read, memory_search
- [ ] Per-agent konfiguracja narzedzi Mastera w UI
- [ ] Master wie ktory agent go wywolal, zna playbook, zna kontekst

### 2.7.3 UI
- [ ] Typing indicator: "Master analizuje..."
- [ ] Transparentnosc: blok w chacie pokazujacy co Master dostal i co odpowiedzial

---

## 2.8 SKILLE v2

> **Cel:** System skilli ktory naprawde dziala — nie tylko guziki w UI.
> **Wymaga:** 2.6 (personalizacja agenta — per-agent skille)
> **Szacunek:** 2-3 sesje
> **Odniesienie:** Checkpoint punkt 4 (system zjebany na kilku poziomach)

### 2.8.1 Per-agent skille (punkt 4b)
- [ ] Globalna biblioteka skilli (jak teraz) + per-agent kopia z modyfikacjami
- [ ] Przy dodawaniu skilla do agenta: otwarcie edytora i zapis wersji agenta
- [ ] Agent ma SWOJA wersje skilla (np. Lexie ma "write-article" z innym stylem niz Jaskier)

### 2.8.2 Kreator skilli (punkt 4a)
- [ ] Kreator skilli w UI: formularz z polami frontmatter + edytor tresci
- [ ] Alternatywa: Jaskier prowadzi przez tworzenie skilla rozmowa
- [ ] Edycja istniejacego skilla z Backstage (nie tylko podglad)

### 2.8.3 Pytania uzupelniajace (punkt 4f)
- [ ] Skill moze definiowac "zapytaj usera o: X, Y, Z zanim zaczniesz"
- [ ] Formularz pytan wstepnych przed uruchomieniem skilla

### 2.8.4 UI skilli (punkt 4e)
- [ ] Redesign: z plaskiego rzedu buttonow na grid/pasek z ikonami
- [ ] Kategorie skilli, scroll, skaluje sie na dziesiątki skilli

---

## 2.9 PAMIEC — NAPRAWA ZNANYCH PROBLEMOW

> **Cel:** Pamiec dziala POPRAWNIE (L2 czytane, brain czysty, minion odswiezalny).
> **Wymaga:** 2.1 (stabilny plugin)
> **Szacunek:** 1-2 sesje
> **Odniesienie:** Checkpoint punkt 6 (pamiec dziala ale bugi i luki)

- [ ] Fix: L2 nigdy nie czytane — getMemoryContext() musi uwzgledniac L2 (punkt 6a)
- [ ] Fix: brain.md brudny — mechanizm kompresji/czyszczenia (wywal stare, merguj duplikaty) (punkt 6b)
- [ ] Fix: zduplikowane pliki sesji (podwojny zapis) (punkt 6c)
- [ ] Przemyslec: mechanizm re-prepu miniona w trakcie sesji (nie tylko przy 1. wiadomosci) (punkt 6d)
- [ ] Przegladarka plikow pamieci w Agent Managerze (brain, sesje, L1, L2, archiwum) (punkt 8a)

---

## 2.10 UX CHATU — PROFESJONALNY WYGLAD

> **Cel:** Chat wyglada profesjonalnie, nie jak "zrobione przez AI".
> **Wymaga:** 2.5 (prompt transparency), 2.7 (masterrunner — zeby bylo co pokazywac)
> **Szacunek:** 3-4 sesje
> **Odniesienie:** Checkpoint punkt 11, punkt 15

### 2.10.1 Transparentnosc minion/master (punkt 11a)
- [ ] Osobne bloki w chacie dla akcji miniona (co czytal, jakie toole uzywal, co zwrocil)
- [ ] Osobne bloki w chacie dla akcji mastera (co dostal, co odpowiedzial)
- [ ] Styl jak ThinkingBlock (zwijalne, z tytulami)

### 2.10.2 Redesign chatu (punkt 11b)
- [ ] Odejscie od dymkow → styl Claude Code (czyste przedzielenie, profesjonalny layout)
- [ ] Kazda akcja agenta jako czesc flow (nie osobna wiadomosc)
- [ ] Tool calle, odpowiedzi, thinking — ladny, spojny styl

### 2.10.3 Token counter (punkt 11d)
- [ ] Dokladny: brany z API response `usage` field (nie szacowany)
- [ ] Podzial: input tokens, output tokens, cached tokens
- [ ] Podzial per model: Main / Minion / Master osobno
- [ ] Koszt wywolania w dolarach

### 2.10.4 Animacje i polish
- [ ] Typing effect z kursorem przy generowaniu odpowiedzi
- [ ] Responsywny design dla wszystkich elementow chatu

---

## 2.11 WARSTWA WIZUALNA — TOZSAMOSC PRODUKTU

> **Cel:** Plugin ma spojny, profesjonalny wyglad — nie generyczny "AI look".
> **Wymaga:** 2.10 (chat redesign gotowy)
> **Szacunek:** 2-3 sesje
> **Odniesienie:** Checkpoint punkt 15 (warstwa wizualna)

### 2.11.1 Design system
- [ ] Paleta kolorow, typografia, ikony, spacing — ustalone RAZ
- [ ] Styl: minimalistyczny jak Claude Code, ALE z naszym humorem i osobowoscia

### 2.11.2 Per-agent theming (punkt 15b)
- [ ] CSS variables per agent: --agent-primary, --agent-bg, --agent-accent
- [ ] Przelaczenie agenta = zmiana "skory" interfejsu (subtelne akcenty, tla)
- [ ] Kolory agenta z konfiguracji juz sa — teraz musza wplywac na UI

### 2.11.3 Dark/Light mode (punkt 15e)
- [ ] Upewnic sie ze KAZDY nasz element wyglada dobrze w obu trybach
- [ ] Respektowanie body.theme-dark / body.theme-light z Obsidiana

### 2.11.4 CSS injection (punkt 15d)
- [ ] Setting "Custom CSS": textarea lub wskazanie pliku w vaultcie
- [ ] Agent moze napisac CSS, user go wkleja/wlaczy
- [ ] Pliki w .pkm-assistant/themes/ ladowane automatycznie

---

## 2.12 INLINE INTERAKCJA — CONTEXT MENU + SKILLE

> **Cel:** Agent reaguje na to co user robi w edytorze — nie tylko w oknie chatu.
> **Wymaga:** 2.4 (oczko), 2.6 (personalizacja — per-agent akcje)
> **Szacunek:** 1-2 sesje
> **Odniesienie:** Checkpoint punkt 10 (inline interakcja)

- [ ] Konfigurowalne context menu per agent (punkt 10a)
- [ ] Przyklady akcji: "Sprawdz to", "Przetlumacz", "Popraw styl", "Przeanalizuj"
- [ ] Kazdy agent ma INNE opcje (Lexie: "Napisz draft", Dexter: "Wyszukaj zrodla")
- [ ] Konfiguracja w Agent Manager + dynamiczne budowanie menu
- [ ] Zaznaczenie tekstu + wybor akcji = agent dostaje tekst + instrukcje

---

## 2.13 NAPRAWA SIDEBARA + MANAGER

> **Cel:** Sidebar dziala dobrze, brakujaca zawartosc uzupelniona.
> **Wymaga:** 2.6 (personalizacja — nowe pola w managerze)
> **Szacunek:** 1 sesja
> **Odniesienie:** Checkpoint punkt 8 (sidebar + agent manager)

- [ ] Fix: statystyki zepsute po przeniesieniu z modalu do sidebaru (punkt 8b)
- [ ] Przegladarka plikow pamieci (brain, sesje, L1, L2, archiwum) — z podgladem i edycja (punkt 8a)
- [ ] Rozbudowa panelu uprawnien o per-folder access control (punkt 8c)

---

## 2.14 DOKUMENTACJA + ONBOARDING

> **Cel:** Nowy user NIE jest zgubiony. Jaskier prowadzi za reke.
> **Wymaga:** WSZYSTKO wczesniej musi dzialac (to jest OSTATNIA faza przed release)
> **Szacunek:** 3-4 sesje
> **Odniesienie:** Checkpoint punkt 18 (onboarding), punkt 19 (dokumentacja)

### 2.14.1 Wizard konfiguracji
- [ ] Ekran wyboru: klucz API lub Ollama (lub SaaS konto gdy gotowe)
- [ ] Walidacja klucza API (test call)
- [ ] Sugestia minion modelu + pomoc w konfiguracji
- [ ] One-click Ollama setup (wykrycie lokalnego serwera)
- [ ] Kazdy krok WYTLUMACZONY (co to jest API, dlaczego potrzebne, ile kosztuje)

### 2.14.2 Jaskier jako mentor
- [ ] Bardzo dokladny prompt startowy (nawet slabszy model ogarnie)
- [ ] Wita usera i PROPONUJE kilka wdrozen (nie wymusza)
- [ ] 3 sciezki: Obsidian / PKM / PKM Assistant (kazda interaktywna)
- [ ] Gotowe skille mentorskie (oprowadz, zbuduj agenta, analizuj vault)
- [ ] Jaskier ZNA dokumentacje pluginu (dostep do bazy wiedzy)

### 2.14.3 Dymki tutoriali
- [ ] Opcjonalne tooltips przy KAZDEJ sekcji ustawien agenta
- [ ] "Co to jest temperature?", "Ktory model wybrac?", "Co to jest minion?"
- [ ] Krotkie wyjasnienie + link do pelnego tutoriala

### 2.14.4 Baza wiedzy dla agentow
- [ ] Dokumentacja pluginu dostepna jako kontekst dla agentow
- [ ] Agent moze pomoc userowi stworzyc miniona, skill, skonfigurowac model
- [ ] Aktualne informacje o modelach (co potrafi, ile kosztuje)

### 2.14.5 Gra uczaca (milestones)
- [ ] System milestones prowadzonych przez Jaskiera
- [ ] "Stworz agenta" → "Napisz skill" → "Deleguj minionowi" → "Wyslij miedzy agentami"
- [ ] Kazdy milestone = user UZYWA funkcji (nie czyta o niej)
- [ ] Progressbar / odznaki (gamifikacja bez przesady)

---

## 2.15 SOLIDNOSC + BEZPIECZENSTWO + RELEASE v1.0

> **Cel:** Plugin gotowy do publicznego wydania.
> **Wymaga:** Wszystko wyzej ukonczone.
> **Szacunek:** 2-3 sesje
> **Odniesienie:** Checkpoint punkt 13 (prywatnosc), PLAN faza 7

### 2.15.1 Error handling
- [ ] Brak API → informacja dla usera (nie crash)
- [ ] Slow API → timeout + retry + informacja
- [ ] Czytelne komunikaty bledow (PL + EN)
- [ ] Log bledow do pliku (nie tylko konsola)

### 2.15.2 Bezpieczenstwo
- [ ] Normalizacja sciezek we wszystkich vault toolach (blokada ../, sciezek absolutnych)
- [ ] Dodac isProtectedPath() do vault_delete
- [ ] Separatory niezaufanej tresci w promptach (UNTRUSTED CONTENT)
- [ ] Sanityzacja wiadomosci miedzy agentami

### 2.15.3 Prywatnosc
- [ ] Wykrywacz wrazliwych danych PRZED wyslaniem (regex: hasla, klucze API, numery kart)
- [ ] LOCAL vs CLOUD wskaznik przy kazdym modelu (zielona/pomaranczowa ikona)
- [x] Blacklist plikow/folderow ("ten plik NIGDY nie idzie do AI") → No-Go zone (sesja 42)
- [ ] **🚨 WAŻNE: No-Go foldery — wykluczenie z indeksowania embeddings** (smart_sources musi pomijać No-Go foldery, nie tylko AccessGuard blokuje dostęp agentów — dane NIE MOGĄ trafić do indeksu wektorowego)

### 2.15.4 Testowanie
- [ ] Test na min. 5 platformach (DeepSeek, Ollama, OpenRouter, Anthropic, OpenAI)
- [ ] Test onboardingu od zera (nowy vault, nowy user)
- [ ] Test kazdego MCP toola
- [ ] Min. tydzien codziennego uzytkowania bez krytycznych bledow

### 2.15.5 Dokumentacja techniczna
- [ ] README.md (instalacja, konfiguracja, podstawy)
- [ ] Changelog
- [ ] Demo (video lub GIF)

### 2.15.6 Release
- [ ] v1.0.0 w manifest.json
- [ ] GitHub release z binarkami
- [ ] "Buy me a coffee" link w ustawieniach
- [ ] Opcjonalnie: zgloszenie do Obsidian Community Plugins

---

# ══════════════════════════════════════════
# CZESC 3: POST v1.0 (v1.5 / v2.0)
# ══════════════════════════════════════════

> Te elementy sa w WIZJA.md ale NIE blokuja release v1.0.
> Kazdy to osobny sprint po stabilnym wydaniu.

---

## 3.1 MOBILE [v1.5 — WYSOKI PRIORYTET]

> **Odniesienie:** Checkpoint punkt 12

- [ ] Audit kodu: brak Node-only API
- [ ] UI responsywne na malych ekranach (albo chat ALBO sidebar, nie oba)
- [ ] Touch-friendly interakcje
- [ ] Wykrywanie stanu sieci + tryb offline
- [ ] Miniony na najtanszych modelach (bateria)
- [ ] Lazy loading (nie laduj wszystkiego na start)
- [ ] Embeddingi: przywrócić Transformers.js provider + zmiana modelu na `multilingual-e5-small` (ONNX, ten sam model lokalnie na kompie i telefonie, kod adaptera już jest w external-deps/)
- [ ] Test Transformers.js na Obsidian Mobile (czy ONNX Runtime WebAssembly działa w WebView)

## 3.2 MULTI-MODAL [v1.5]

> **Odniesienie:** Checkpoint punkt 14

### Vision (obrazy input)
- [ ] Wklejanie obrazow do chatu (paste, drag & drop)
- [ ] Analiza obrazu przez vision API (GPT-4o, Claude Vision, Gemini)
- [ ] Graceful fallback: model bez vision → info dla usera

### Image generation (obrazy output)
- [ ] Integracja z DALL-E / Groq Image / ComfyUI
- [ ] Wyswietlanie wygenerowanych obrazow w chacie
- [ ] Zapis obrazu do vaulta

### Audio (voice)
- [ ] Przycisk mikrofonu w chacie (STT via Whisper)
- [ ] Agent odpowiada glosem (TTS)
- [ ] Rozne glosy per agent
- [ ] Tryb hands-free

### Transkrypcja
- [ ] Drag & drop plikow audio (.mp3, .wav, .m4a)
- [ ] Automatyczna transkrypcja
- [ ] Tworzenie notatki z transkrypcja

## 3.3 ZAAWANSOWANA PAMIEC [v1.5]

> **Odniesienie:** Checkpoint punkt 6 (rozszerzenia)

- [ ] Adaptive retrieval (proste pytanie = malo kontekstu, planowanie = duzo)
- [ ] Knowledge modules (vault podzielony na moduly wiedzy)
- [ ] Cross-agent memory (agent czyta pamiec innego za zgoda usera)
- [ ] Feedback loop (👍👎 na odpowiedzi, agent uczy sie z feedbacku)
- [ ] Poprawa embeddingu dla dlugich notatek (sliding window, hierarchiczny)

## 3.4 DEBATA AGENTOW [v1.5]

> **Odniesienie:** Checkpoint punkt 7a (multi-window), punkt 11

- [ ] Widok chatu z wieloma agentami naraz
- [ ] Kazdy agent generuje na swoim modelu
- [ ] User jako moderator
- [ ] Scenariusze: burza mozgow, ewaluacja, debata for/against

## 3.5 WYRWANIE SMART CONNECTIONS [osobny sprint]

> **Odniesienie:** Checkpoint punkt 9f (SC kula u nogi)

- [ ] Wyciagniecie 4-5 adapterow (Anthropic, OpenAI, DeepSeek, Ollama, OpenRouter) do src/
- [ ] Przepisanie SmartItemView na wlasny ObsekItemView
- [ ] Wyciagniecie SmartStreamer (SSE)
- [ ] Usuniecie external-deps/ (59 MB → build ~1-2 MB)
- [ ] Testy: streaming na wszystkich platformach

## 3.6 MARKETPLACE + SaaS [v2.0]

> **Odniesienie:** Checkpoint punkt 16, punkt 17

### Marketplace
- [ ] Backend: hosting repo z paczkami
- [ ] UI w pluginie: zakladka z kategoriami (agenci, skille, miniony, mastery, tematy CSS)
- [ ] System ocen, filtrowanie, one-click install
- [ ] Publikowanie: user wrzuca swojego agenta/skill

### SaaS (monetyzacja)
- [ ] System kont uzytkownikow
- [ ] Kredyty / subskrypcja (wzor OpenRouter — mala marza na API)
- [ ] Proxy do dostawcow AI
- [ ] "Buy me a coffee" od dnia 1
- [ ] Easy mode: jedno konto → od razu podlaczony model → zero konfiguracji

## 3.7 DEEP PERSONALIZATION [v2.0]

> **Odniesienie:** Checkpoint (daleka przyszlosc), WIZJA sekcja 15

- [ ] PLLM: profil usera budowany automatycznie z interakcji
- [ ] Pamiec epizodyczna + semantyczna (PRIME)
- [ ] Memory decay: starsze wspomnienia "bladna"
- [ ] Adaptery / LoRA: fine-tuning modeli na danych usera
- [ ] Concept routing: automatyczne tagowanie notatek

## 3.8 OBSIDIAN_COMMAND + OUTSIDE VAULT ACCESS [v2.0+]

> **Cel:** Agent moze "kliknac" dowolne polecenie Obsidiana — dostep do SETEK funkcji.
> **Przeniesione z CZESCI 2** (dawne 2.5) — wymaga solidnego permission systemu, whitelisty komend, community feedback.
> **Szacunek:** 3-5 sesji (wliczajac sandbox + bezpieczenstwo)
> **Odniesienie:** Checkpoint punkt 9e (Obsidian API goldmine)

### Obsidian Commands
- [ ] Bezpieczny sandbox: whitelist dozwolonych komend (nie wszystkie!)
- [ ] Permission system: user zatwierdza komendy przed wykonaniem
- [ ] app.commands.listCommands() — lista dostepnych polecen (read-only)
- [ ] app.commands.executeCommandById(id) — wykonanie z whitelisty
- [ ] Kategorie komend: editor, workspace, navigation, plugins
- [ ] Opis narzedzia z przykladami (QuickAdd, Templater, Dataview)
- [ ] Rejestracja w ToolRegistry + MCPClient
- [ ] Community feedback: jakie komendy sa bezpieczne?
- [ ] Test: agent odpalil polecenie z whitelisty

### Outside Vault Access (dodane sesja 42)
> Agent-programista (np. do pisania pluginow) potrzebuje dostepu POZA vault — pliki systemowe, node_modules, itp.
> Wymaga nowego permission `access_outside_vault` z dodatkowym sandbox.
- [ ] Nowy tool: file_read_external / file_write_external (oddzielne od vault_read/write)
- [ ] Whitelist sciezek poza vaultem (konfiguracja per-agent)
- [ ] Approval modal z informacja o sciezce POZA vaultem (wyrazne ostrzezenie)
- [ ] Sandbox: agent NIE moze czytac .env, credentials, kluczy API
- [ ] Integracja z AccessGuard — osobna logika dla sciezek poza vaultem

## 3.9 AGORA — TABLICA AKTYWNOSCI AGENTOW [v2.0] ✅ DONE (sesja 35)

> **Zrealizowane WCZESNIEJ niz planowano** — przeniesione z v2.0 do sesji 35 (CZESC 1.15)

- [x] Wspólna baza wiedzy .pkm-assistant/agora/ (profil + aktywność + mapa + projekty + dostęp)
- [x] Kazdy agent po sesji wpisuje co zrobil (activity board — broadcast)
- [x] Nowy agent czyta agore (kontekst w system prompcie via buildPromptContext)
- [x] Roznica vs komunikator: komunikator = 1-do-1, agora = broadcast + profil + projekty
- [x] Pełny sidebar UI z 5 zakładkami i inline CRUD
- [x] 3 nowe MCP tools + access control (admin/contributor/reader)

---

# ══════════════════════════════════════════
# PODSUMOWANIE
# ══════════════════════════════════════════

## Tabela postepu

| Czesc | Zakres | Checkboxy | Status |
|-------|--------|-----------|--------|
| **1. ZROBIONE** | Fundament + 15 systemow | ~178/178 | DONE |
| **2. DO v1.0** | 15 obszarow, ~89 checkboxow | ~4/~89 | NASTEPNE |
| **3. POST v1.0** | 8 duzych tematow, ~45 checkboxow | ~6/~45 | PRZYSZLOSC |
| **TOTAL** | | **~188/318** | **~59%** |

## Mapa zaleznosci (CZESC 2)

```
2.1 Stabilizacja (2-3 sesje)
 ├── 2.2 Opisy MCP Tools (1-2 sesje)
 │    └── 2.3 System Prompt (1-2 sesje)
 │         ├── 2.5 Prompt Transparency (2-3 sesje)
 │         └── 2.6 Personalizacja Agenta (3-4 sesje)
 │              ├── 2.8 Skille v2 (2-3 sesje)
 │              └── 2.12 Inline Interakcja (1-2 sesje)
 ├── 2.4 Oczko (1 sesja)
 ├── 2.7 MasterRunner (2-3 sesje)
 ├── 2.9 Pamiec fix (1-2 sesje)
 └── 2.13 Sidebar fix (1 sesja)

Wszystko powyzej → 2.10 UX Chatu (3-4 sesje)
                  → 2.11 Warstwa Wizualna (2-3 sesje)
                  → 2.14 Dokumentacja + Onboarding (3-4 sesje)
                  → 2.15 Release v1.0 (2-3 sesje)
```

## Szacunek do v1.0: ~22-32 sesji (po sesji 35)

**Priorytety (robic TERAZ):**
1. ~~2.1 Stabilizacja — 3 bugi~~ ✅ DONE + AGORA zaimplementowana (sesja 35)
2. ~~2.2 Opisy MCP Tools~~ ✅ DONE (sesja 36)
3. ~~2.3 System Prompt~~ ✅ DONE (sesja 37-38)
4. ~~2.4 Oczko~~ ✅ DONE (sesja 39)

**Srodek (po stabilizacji):**
5. ~~2.5 Prompt Transparency~~ ✅ DONE (sesja 40) — TokenTracker, SubAgentBlock, toggles, Backstage redesign
6. ~~2.6 Personalizacja Agenta Part 1~~ ✅ DONE (sesja 41) — Archetyp→Rola, RoleLoader, Role Creator, Memory tab
   - ~~2.6 Part 2: Access Control~~ ✅ DONE (sesja 42) — WHITELIST, denial, guidance mode, No-Go
   - ~~Tryby Pracy~~ ✅ DONE (sesja 43) — 4 modes, cascade, switch_mode, toolbar
   - ~~Prompt v2.1 + DT v2 + Prompt Builder~~ ✅ DONE (sesja 44) — 3-layer overrides, 24 instrukcji, unified panel
7. 2.7 MasterRunner — pelny ekosystem ← NASTEPNY
8. 2.8 Skille v2 — system ktory naprawde dziala
9. 2.9 Pamiec fix — bugi do naprawy

**Koniec (polish + release):**
10. 2.10 UX Chatu — profesjonalny wyglad
11. 2.11 Warstwa Wizualna — tozsamosc produktu
12. 2.12 Inline Interakcja — konfigurowalne menu
13. 2.13 Sidebar fix — uzupelnienie zawartosci
14. 2.14 Dokumentacja + Onboarding — ostatnia faza
15. 2.15 Release v1.0

---

*Stworzony: 2026-02-23 po sesji 30*
*Oparty na: CHECKPOINT_sesja28.md (19 punktow), weryfikacja kodu, STATUS.md, DEVLOG.md*
*Zastepuje: PLAN.md v1.0 (ktory zostal zbyt pomieszany sesjami/sprintami)*
*Kazdy punkt CZESCI 2 odpowiada konkretnemu obszarowi z checkpointu.*
