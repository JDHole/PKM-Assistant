# PKM Assistant (Obsek) - Status Projektu

> **Kopiuj ten plik do dowolnego czatu z AI** zeby dac kontekst o projekcie.
> Ostatnia aktualizacja: 2026-02-28 (sesja 62)

---

## Czym jest PKM Assistant?

Plugin do Obsidiana (wew. nazwa: Obsek). Fork Smart Connections v4.1.7.
Cel: Zespol AI agentow w Obsidianie - kazdy z wlasna osobowoscia, pamiecia, skillami i minionem (tanszym modelem-asystentem).

**Autor:** JDHole (non-programista, vibe-coding z AI)
**Lokalizacja:** `C:\Users\jdziu\Desktop\Obsek\Obsek Plugin\`
**Repo:** `https://github.com/JDHole/PKM-Assistant.git`
**Tech:** JavaScript (ES Modules), Obsidian API, esbuild, MCP

---

## Co NAPEWNO dziala (potwierdzone 2026-02-22)

- [x] Plugin laduje sie w Obsidianie bez bledow
- [x] Plugin indeksuje vault automatycznie
- [x] Chat z AI w Obsidianie (panel boczny, agent Jaskier)
- [x] Token counter w UI (np. 6627/100000)
- [x] AI widzi notatki uzytkownika (vault_read + vault_list dzialaja)
- [x] AI potrafi stworzyc nowa notatke (vault_write dziala)
- [x] Multi-provider: Claude Sonnet 4, DeepSeek V3.2/Reasoner, Ollama potwierdzone
- [x] System uprawnien DZIALA - blokuje vault_write az user zatwierdzi
- [x] MCP narzedzia: vault_list, vault_read, vault_write potwierdzone
- [x] Build: npm run build -> dist/main.js **6.7MB**, auto-kopia do vaultu
- [x] src/main.js zawiera wszystkie komponenty Obsek (ChatView, AgentManager, MCP, itd.)
- [x] brain.md tworzony automatycznie przy starcie (.pkm-assistant/agents/jaskier/memory/brain.md)
- [x] Tresc brain.md jest wstrzykiwana do system promptu przy kazdej wiadomosci
- [x] vault_read/vault_list/vault_write dzialaja na ukryte foldery (.pkm-assistant)
- [x] Agent zna sciezke do swojego brain.md i moze go aktualizowac via vault_write
- [x] Fazy 0+1+2 systemu pamieci zaimplementowane (streamHelper, brain boot-up, session lifecycle)
- [x] Session dropdown dziala - widzi sesje z AgentMemory, ladowanie sesji dziala
- [x] memory_search - nowy MCP tool do przeszukiwania pamieci agenta (sesje, brain, podsumowania)
- [x] Ribbon icon Obsek (zamiast 3 ikon Smart Connections) - otwiera chat
- [x] RAG indexuje z AgentMemory (nie z pustego SessionManager)
- [x] Faza 3: Memory Extraction DZIALA - consolidateSession() wyciaga fakty po sesji
- [x] MemoryExtractor.js - automatyczna ekstrakcja faktow z rozmow (przetestowane)
- [x] memoryWrite() + applyBrainUpdates() w AgentMemory - centralna funkcja zapisu pamieci
- [x] Minion Model - ustawienie w settings (tanszy model do operacji pamieci)
- [x] audit.log - kazda zmiana pamieci logowana
- [x] brain_archive.md - overflow z brain.md (gdy > 2000 znakow)
- [x] Prompt ekstrakcji wymusza 3. osobe ("User ma..." nie "Mam...")
- [x] Fuzzy dedup w _applyAppend() - wykrywa duplikaty po slowach kluczowych/liczbach
- [x] Prompt instruuje AI zeby sprawdzal istniejacy brain przed dodaniem faktow
- [x] Faza 4: Summarizer DZIALA - dwufazowa kompresja: Faza 1 trim tool results (70%, darmowe) + Faza 2 sumaryzacja (90%, API call)
- [x] Summarizer uzywa streamToComplete() (nie crashuje jak wczesniej)
- [x] RollingWindow: rozdzielony baseSystemPrompt od conversationSummary, tool definitions liczone w tokenach
- [x] Faza 7: RAG polish - RAGRetriever uzywa AgentMemory natywnie (nie przez workaround)
- [x] Faza 6: MCP tools pamieciowe - memory_update (zapamiętaj/zapomnij/czytaj brain) + memory_status (info o pamieci)
- [x] Voice commands - system prompt agenta rozpoznaje komendy: "zapamiętaj", "zapomnij", "co o mnie wiesz", "pokaż pamięć"
- [x] MCP narzedzia: 9 total (vault: read/list/write/delete/search + memory: search/update/status)
- [x] data.json: usunieta stara sekcja smart_chat_threads z adapterem ollama (powodowala crash)
- [x] Faza 5: L1/L2 konsolidacja DZIALA - automatyczna kompresja sesji (5 sesji -> L1, 5 L1 -> L2)
- [x] 10 plikow L1 + 2 pliki L2 utworzone z 48 sesji Jaskiera
- [x] L1 summaries wstrzykiwane do system promptu via getMemoryContext()
- [x] Frontmatter tracking - L1 pamięta które sesje zawiera, L2 pamięta które L1
- [x] Migracja folderow: weekly/monthly/yearly -> summaries/L1 + summaries/L2
- [x] memory_update read_brain nie wymaga juz uprawnien vault.write (fix permission)
- [x] Settings persistence: custom ustawienia Obsek w osobnym namespace `obsek` (nie giną po restarcie)
- [x] Minion model (Haiku) dziala - tańszy model do ekstrakcji pamieci, sumaryzacji, konsolidacji L1/L2
- [x] Platform auto-detection z nazw kluczy API (SC nie zapisuje `platform` explicite)
- [x] Wyczyszczone debug logi z konsoli (handle_chunk, handle_done, get_chat_model)
- [x] Rebranding UI: "Smart Connections" -> "Obsek / PKM Assistant" (sesja 11)
- [x] WIZJA.md kompletna - 21 sekcji, pelna wizja produktu (sesja 11, rozbudowana sesja 18)
- [x] PLAN.md kompletny - Master Plan z 15 fazami, 259 checkboxow (sesja 11, rozbudowany sesja 18)
- [x] Nazwa "PKM Assistant" w tytule chatu, ustawieniach i komendach (sesja 12)
- [x] vault_search potwierdzone dzialanie (sesja 12)
- [x] vault_delete potwierdzone dzialanie (sesja 12)
- [x] Ustawienia pluginu po polsku z czytelnymi nazwami (sesja 12)
- [x] Chat UI redesign: nowoczesny wyglad, babielki, welcome screen, input ChatGPT-style (sesja 12)
- [x] CSS bug fix: chat_view.css nie byl adoptowany do dokumentu (sesja 12)
- [x] Auto-foldery pamieci: nowy agent od razu tworzy foldery pamieci (sesja 13)
- [x] Duplikaty sesji naprawione: AgentMemory sledzi aktywna sesje, auto-save przez AgentMemory (sesja 13)
- [x] Czysty log konsoli: ~70 spam logow usuniete, zostalo 24 jednorazowych startowych (sesja 13)
- [x] Typing indicator z tekstem statusu: "Mysle...", "Szukam w vaultcie..." itp. (sesja 14)
- [x] Polskie nazwy narzedzi w tool call display (sesja 14)
- [x] Krotszy system prompt dla lokalnych modeli (Ollama/LM Studio) (sesja 14)
- [x] Toggle "Pamiec w prompcie" w ustawieniach (sesja 14)
- [x] DeepSeek V3.2 + Reasoner obslugiwane (reasoning_content) (sesja 14)
- [x] Fix Reasoner + tool calls: SC adapter rozszerzony o reasoning_content w streaming (sesja 14)
- [x] Fix nieskonczonej petli L1/L2 konsolidacji (break gdy AI fail) (sesja 14)
- [x] Minion cache invalidacja przy zmianie platformy (sesja 14)
- [x] PLAN.md: sekcja 7.3 - Optymalizacja lokalnych modeli (8 checkboxow) (sesja 14)
- [x] WIZJA.md: sekcja 13 rozbudowana o strategie lokalne (sesja 14)
- [x] **FAZA 1: Skill Engine** - centralna biblioteka skilli (sesja 15)
- [x] SkillLoader: laduje skille z .pkm-assistant/skills/, cache, auto-reload (sesja 15)
- [x] 4 starter skille: daily-review, vault-organization, note-from-idea, weekly-review (sesja 15)
- [x] MCP tool skill_list - lista skilli agenta z filtrem po kategorii (sesja 15)
- [x] MCP tool skill_execute - aktywacja skilla, zwraca pelny prompt (sesja 15)
- [x] Guziki skilli w UI chatu (pill/chip style, hover efekt, scrollowalne) (sesja 15)
- [x] Agent tworzy nowe skille przez vault_write do .pkm-assistant/skills/ (sesja 15)
- [x] Auto-reload po vault_write do /skills/ + odswiezenie guzikow (sesja 15)
- [x] Przypisanie skilli do agenta: skills[] w konfiguracji (JS built-in + YAML custom) (sesja 15)
- [x] Wersjonowanie pluginu: reset z 4.1.7 na 1.0.0, wlasne wersjonowanie Obsek (sesja 15)
- [x] MCP narzedzia: 11 total (9 dotychczasowych + skill_list + skill_execute) (sesja 15)
- [x] **Skill Engine przetestowany - daily-review i vault-organization dzialaja swietnie** (sesja 15)
- [x] **FAZA 2: Minion per Agent** - system minionow (tansza AI do ciezkiej pracy) (sesja 16)
- [x] MinionLoader: laduje konfiguracje minionow z .pkm-assistant/minions/ (sesja 16)
- [x] 3 starter miniony: jaskier-prep, dexter-vault-builder, ezra-config-scout (sesja 16)
- [x] MinionRunner: dwa tryby - auto-prep (1. wiadomosc) + minion_task (delegowanie) (sesja 16)
- [x] MCP tool minion_task - agent swiadomie deleguje ciezka prace minionowi (sesja 16)
- [x] streamToCompleteWithTools() - petla tool-calling dla miniona (sesja 16)
- [x] Auto-prep: minion przygotowuje kontekst TYLKO przy 1. wiadomosci w sesji (sesja 16)
- [x] Kazdy built-in agent ma przypisanego miniona (Jaskier, Dexter, Ezra) (sesja 16)
- [x] Graceful failure: jesli minion padnie -> normalna odpowiedz agenta (sesja 16)
- [x] Hot-reload: edycja minion.md -> natychmiastowe przeladowanie (sesja 16)
- [x] MCP narzedzia: 12 total (11 + minion_task) (sesja 16)
- [x] Build: 6.6MB (sesja 16)
- [x] **Minion przetestowany w Obsidianie** - agent deleguje z konkretnym zadaniem, minion uzywa MCP tools (sesja 17)
- [x] Fix: minion po 3 iteracjach robi ostatnie wywolanie BEZ narzedzi zeby podsumowac wyniki (sesja 17)
- [x] Fix: agent system prompt v3 - konkretne przyklady jak uzywac minion_task (sesja 17)
- [x] Fix: XML hallucination cleanup - tanie modele halucynuja tagi XML, regex je usuwa (sesja 17)
- [x] Guziki kopiowania w tool call display: kopiuj input, output, calosc (sesja 17)
- [x] **FAZA 2.4: Architektura 4 modeli** (sesja 19)
- [x] Bezpieczenstwo kluczy API: blokada .smart-env/ w VaultRead/List/Write, anti-key prompt w MemoryExtractor (sesja 19)
- [x] keySanitizer.js: utility do ochrony sciezek i maskowania kluczy (sesja 19)
- [x] Reorganizacja ustawien: 6 sekcji (Dostawcy AI, Modele, Embedding, Pamiec, RAG, Info) (sesja 19)
- [x] 8 platform: Anthropic, OpenAI, DeepSeek, Gemini, Groq, OpenRouter, Ollama, LM Studio (sesja 19)
- [x] 4 sloty modeli: Main (rozmowa), Minion (tlo), Master (geniusz), Embedding (wektory) (sesja 19)
- [x] MCP tool master_task: delegacja W GORE do Mastera (minion zbiera kontekst, master odpowiada) (sesja 19)
- [x] modelResolver.js: centralny utility do tworzenia modeli per rola (sesja 19)
- [x] Per-agent model overrides: kazdy agent moze miec inne modele (Agent.js + yamlParser) (sesja 19)
- [x] MCP narzedzia: 17 total (15 + chat_todo + plan_action) (sesja 25)
- [x] Build: 6.6MB, wersja 1.0.3 (sesja 19)
- [x] **master_task 3 tryby**: domyslny, z instrukcjami dla miniona, bez miniona (sesja 20)
- [x] skip_minion: agent pomija miniona i sam dostarcza kontekst do Mastera (sesja 20)
- [x] minion_instructions: agent mowi minionowi JAK i GDZIE szukac kontekstu (sesja 20)
- [x] System prompt agenta: pelne instrukcje 3 trybow z przykladami (sesja 20)
- [x] **Wszystkie 3 tryby przetestowane w Obsidianie** - Jaskier sam wybral odpowiedni tryb do kazdego testu (sesja 20)
- [x] **FAZA 2.5: Playbook + Vault Map per agent** (sesja 21)
- [x] PlaybookManager.js - zarzadzanie playbook.md i vault_map.md per agent (sesja 21)
- [x] Starter playbooki: Jaskier (orchestrator), Dexter (vault expert), Ezra (meta-agent) (sesja 21)
- [x] Starter vault mapy: rozne strefy dostepu per agent (sesja 21)
- [x] Auto-tworzenie playbook + vault_map przy starcie pluginu (sesja 21)
- [x] MinionRunner: auto-prep czyta playbook + vault_map i wstrzykuje do system promptu miniona (sesja 21)
- [x] Agent.js: lekki pointer do playbooka (nie pelna tresc) w system prompcie (sesja 21)
- [x] Hot-reload: detekcja edycji playbook/vault_map przez vault_write (sesja 21)
- [x] Build: 6.6MB, wersja 1.0.4 (sesja 21)
- [x] **FAZA 3: Agent Manager + Creator** (sesja 22)
- [x] AgentProfileModal: ujednolicony modal do tworzenia i edycji agentow z 5 zakladkami (sesja 22)
- [x] AgentDeleteModal: usuwanie agenta z opcja archiwizacji pamieci (sesja 22)
- [x] AgentSidebar rewrite: karty agentow z akcjami (profil, usun, przelacz) (sesja 22)
- [x] Tylko Jaskier jako built-in agent (Dexter/Ezra to szablony/archetypy) (sesja 22)
- [x] Built-in overrides: edycja Jaskiera zapisywana do _overrides.yaml (sesja 22)
- [x] Fallback: usuniecie ostatniego agenta -> auto-odtworzenie Jaskiera (sesja 22)
- [x] Skill create-agent: Jaskier prowadzi usera przez tworzenie agenta przez rozmowe (sesja 22)
- [x] Archiwizacja pamieci agenta do .pkm-assistant/archive/ przy usuwaniu (sesja 22)
- [x] Build: 6.6MB, wersja 1.0.5 (sesja 22)
- [x] **FAZA 4: Komunikator + Delegacja** (sesja 23)
- [x] KomunikatorManager.js: pliki inbox, parseMessages, writeMessage, markAsRead (sesja 23)
- [x] MCP tool agent_message - wysylanie wiadomosci miedzy agentami (sesja 23)
- [x] MCP tool agent_delegate - delegowanie zadania innemu agentowi (sesja 23)
- [x] KomunikatorModal: pelny UI (lista agentow + inbox + compose) (sesja 23)
- [x] AgentSidebar: sekcja komunikatora z badge'ami nieprzeczytanych (sesja 23)
- [x] SendToAgentModal + menu kontekstowe "Wyslij do asystenta" (sesja 23)
- [x] chat_view.js: przycisk delegacji gdy agent proponuje zmiane (sesja 23)
- [x] MinionRunner: czytanie inbox w auto-prep (sesja 23)
- [x] Agent.js: sekcja KOMUNIKATOR w system prompcie (sesja 23)
- [x] Build: 6.7MB, wersja 1.0.6 (sesja 23)
- [x] **FAZA 4 FIXES: Podwojny status + UI fixes + Delegacja autosend** (sesja 24)
- [x] KomunikatorManager: dual read status (NOWA/USER_READ/AI_READ/ALL_READ), backwards compat (sesja 24)
- [x] KomunikatorModal: CSS fixes (button fit, status dots user+AI), debounce renders (sesja 24)
- [x] AgentSidebar: "Nowy agent" przenieslony nad komunikator, debounce na events (sesja 24)
- [x] MinionRunner: auto markAsAIRead po inbox processing (sesja 24)
- [x] AgentDelegateTool: passes context_summary + from_agent do chat_view (sesja 24)
- [x] chat_view.js delegation: auto-sends "[Delegacja] context" jako 1. wiadomosc (sesja 24)
- [x] Agent.js: silniejszy prompt dla context_summary w agent_delegate (sesja 24)
- [x] Build: 6.7MB, wersja 1.0.6 (sesja 24)
- [x] **FAZA 5: Rozszerzony Chat + Inline** (sesja 25)
- [x] Extended Thinking: zwijany blok "Myslenie..." z reasoning_content (DeepSeek + Anthropic) (sesja 25)
- [x] Animacje CSS: streaming shimmer, slideDown tool calli, pulsujace pending (sesja 25)
- [x] Inline Comments: context menu "Komentarz do Asystenta" → modal → agent edytuje plik (sesja 25)
- [x] Todo Lists w chacie: MCP tool chat_todo, interaktywny widget z checkboxami i paskiem postepu (sesja 25)
- [x] Creation Plans: MCP tool plan_action, widget z numerowanymi krokami i przyciskiem "Zatwierdz plan" (sesja 25)
- [x] Quick link po vault_write: klikalny link do pliku w chacie (sesja 25)
- [x] Delegacja + artefakty: aktywne todo/plany automatycznie przekazywane przy delegacji (sesja 25)
- [x] Fix inline comment prompt: uproszczony format bez instrukcji narzdziowych (sesja 25)
- [x] MCP narzedzia: 17 total (15 + chat_todo + plan_action) (sesja 25)
- [x] ToolCallDisplay: polskie nazwy dla chat_todo i plan_action (sesja 25)
- [x] Ustawienie "Pokaz myslenie AI" (obsek.showThinking) (sesja 25)
- [x] Build: 6.7MB, wersja 1.0.6 (sesja 25)
- [x] **Sidebar Navigation System + Zaplecze** (sesja 26)
- [x] SidebarNav: stack-based nawigacja push/pop/replace/goHome (sesja 26)
- [x] Zero modali: profil agenta, komunikator, usuwanie - wszystko inline w sidebarze (sesja 26)
- [x] Zaplecze (Backstage): sekcja na ekranie glownym z linkami do Skills, Narzedzia MCP, Miniony (sesja 26)
- [x] BackstageViews: lista skilli (nazwa, opis, kategoria), browser narzedzi MCP (6 grup), lista minionow (sesja 26)
- [x] DetailViews: podglad szczegolowy skilla/miniona z pelnym promptem i cross-referencjami agentow (sesja 26)
- [x] Cross-referencing: z profilu agenta do skilla/miniona i odwrotnie (nawigacja kliknieciem) (sesja 26)
- [x] AgentProfileView: 5 zakladek inline (Profil, Uprawnienia, Umiejetnosci, Pamiec, Statystyki) (sesja 26)
- [x] CommunicatorView: inline komunikator w sidebarze (chipy agentow, inbox, compose) (sesja 26)
- [x] CSS bug fix: AgentSidebar.css importowany ale nigdy nie aplikowany via adoptedStyleSheets (sesja 26)
- [x] TOOL_INFO wyeksportowane z ToolCallDisplay.js do uzycia w Backstage (sesja 26)
- [x] Build: 6.7MB, wersja 1.0.7 (sesja 26)
- [x] **Sesja 27: Panel artefaktów + Todo v2 + Plan kreacji v2** (sesja 27)
- [x] ArtifactManager.js - zapis/odczyt artefaktow (todo, plany) na dysku jako JSON (sesja 27)
- [x] Persistence: artefakty przetrwaja restart pluginu (.pkm-assistant/agents/{name}/artifacts/) (sesja 27)
- [x] Auto-save: kazda zmiana todo/planu (checkbox, edycja, dodanie) zapisuje sie na dysk (sesja 27)
- [x] Layout chatu: flex row (main + toolbar), bottom panel (skille + input unified) (sesja 27)
- [x] Right toolbar: prawy pasek z ikonkami (artefakty, skille, tryby) (sesja 27)
- [x] Artifact panel: overlay z lista artefaktow sesji, klik scrolluje do widgetu (sesja 27)
- [x] Todo v2: inline edit (dblclick), dodawanie (+), usuwanie (x), modal pelnej edycji (sesja 27)
- [x] TodoEditModal.js - modal z edycja tytulu, elementow, checkboxow (sesja 27)
- [x] Plan kreacji v2: inline edit kroków, dodawanie/usuwanie, zmiana statusu kliknieciem (sesja 27)
- [x] Plan kreacji v2: komentarz do kroku -> wysylka do chatu, przycisk "Pelny widok" (sesja 27)
- [x] PlanEditModal.js - modal z edycja tytulu, kroków, statusów, opisów (sesja 27)
- [x] Session end: zapis artefaktów + czyszczenie store'ów przy nowej sesji (sesja 27)
- [x] Build: 6.8MB, wersja 1.0.7 (sesja 27)
- [x] **Sesja 27 kontynuacja: Subtaski w planie + Artefakty globalne** (sesja 27)
- [x] Plan subtaski: kazdy krok planu ma checklistę podzadan (subtasks: [{text, done}]) (sesja 27)
- [x] PlanTool.js: nowe akcje add_subtask, toggle_subtask (sesja 27)
- [x] PlanArtifact.js: rendering subtaskow z checkboxami, inline dodawanie, usuwanie (sesja 27)
- [x] PlanEditModal.js: edycja subtaskow w modalu (deep copy fix) (sesja 27)
- [x] ArtifactManager.js PRZEBUDOWA: globalny folder .pkm-assistant/artifacts/ (sesja 27)
- [x] Slugify: czytelne nazwy plikow z tytulu (np. Lista-zadan.json zamiast todo_1708123456789.json) (sesja 27)
- [x] Migracja: stare pliki z agents/{name}/artifacts/ przenoszone automatycznie (sesja 27)
- [x] Artefakty NIE znikaja przy nowej sesji - zyja globalnie, niezaleznie od agenta (sesja 27)
- [x] Artifact panel rozbudowany: pogrupowany typami, badge agenta, modal edit, kopiuj do vaulta, usun (sesja 27)
- [x] Artifact discovery: akcja "list" w chat_todo i plan_action + wstrzykiwanie do system promptu (sesja 27)
- [x] 3 sesje testowe: pelna weryfikacja subtaskow, globalnych artefaktow, discovery (sesja 27)
- [x] Build: 6.8MB, wersja 1.0.7 (sesja 27)
- [x] **Sesja 28: Strategiczny checkpoint polowy drogi** (sesja 28)
- [x] CHECKPOINT_sesja28.md - pelny przeglad 19 obszarow pluginu (zero zmian w kodzie) (sesja 28)
- [x] Glowne odkrycie: kod gotowy w ~90%, priorytetem sa PROMPTY (sesja 28)
- [x] Nowe koncepcje: monetyzacja (3 sciezki), onboarding wizard (Jaskier mentor), dokumentacja = edukacja (sesja 28)
- [x] Roadmap: 5 faz od stabilizacji do release v1.0 (sesja 28)
- [x] **Sesja 29: SC removal decyzja + aktualizacja WIZJA/PLAN** (sesja 29)
- [x] Pelna analiza SC dependency: 19 plikow, streaming flow, embeddingi (sesja 29)
- [x] Odkrycie: vault_search uzywa indexOf (glupie!), nie embeddingów (sesja 29)
- [x] Decyzja: SC removal = priorytet #1, Level 2 (wyrwac + wyrzucic) (sesja 29)
- [x] Sprint Roadmap: S1 SC removal → S2 embeddingi → S3-S9 (sesja 29)
- [x] WIZJA.md: +~300 linii (Prompt Transparency, Oczko, MasterRunner, VaultIndex, arch bez SC) (sesja 29)
- [x] PLAN.md: +~200 linii (Sprint Roadmap S1-S9 + checkboxy w FAZach) (sesja 29)
- [x] Handoffy SC removal przygotowane (podział na sesje) (sesja 29)
- [x] **Sesja 30: Sprint S1+S2 WYKONANY - Smart Connections WYRZUCONE** (sesja 30)
- [x] PKMEnv.js: zamiennik SmartEnv BEZ singletona window.smart_env (modul-scoped PKM_SCOPE) (sesja 30)
- [x] PKMPlugin.js: zamiennik SmartPlugin, rozszerza Obsidian Plugin bezposrednio (sesja 30)
- [x] main.js: SmartPlugin → PKMPlugin, SmartEnv → PKMEnv (sesja 30)
- [x] Embeddingi WLACZONE: process_embed_queue: true, vault indeksowany automatycznie (sesja 30)
- [x] vault_search SEMANTYCZNY: SmartSources.lookup() zamiast glupiego indexOf (sesja 30)
- [x] memory_search SEMANTYCZNY: EmbeddingHelper + cosine similarity (sesja 30)
- [x] Rebranding: 15 SC ghost strings usunietych (view types, codeblocks, links, logs) (sesja 30)
- [x] 5 martwych modulow SC usunietych (smart-actions/clusters/completions/directories) (sesja 30)
- [x] Koegzystencja: PKM Assistant + Smart Connections moga dzialac jednoczesnie (sesja 30)
- [x] Build: 6.8MB, wersja 1.0.9 (sesja 30)
- [x] **Sesja 32: Stabilizacja + Embedding fix + Pelny rebranding** (sesja 32) ✅
- [x] Logger.js: centralny system logowania z debug/info/warn/error (sesja 32)
- [x] Fix: ChatView crash w get_chat_model() (sesja 32)
- [x] Fix: minion_task permission — ACTION_TYPE_MAP nie mapowany (sesja 32)
- [x] Fix: _overrides agent skip — nie crashuje gdy brak pliku (sesja 32)
- [x] Fix: Concatenated tool calls — splitter rozdziela sklejone wywolania (sesja 32)
- [x] Fix: GitHub 404 w check_for_update — silenced (brak releases) (sesja 32)
- [x] Fix: Embedding model — TaylorAI → Ollama/snowflake-arctic-embed2 (sesja 32)
- [x] 4 dostawcy embeddingu: Ollama, OpenAI, Gemini, LM Studio w konfiguracji (sesja 32)
- [x] ObsekEmbeddingModels — default_provider_key czyta z ustawien usera (sesja 32)
- [x] AJSON wyczyszczony: 23 smieciowe TaylorAI → 1 poprawny Ollama (sesja 32)
- [x] Status bar: wlasny "PKM Assistant" zamiast "SmartEnv 2.2.7" (sesja 32)
- [x] Status bar: spinner + "Indeksowanie X/Y (Z%)" podczas embeddingu (sesja 32)
- [x] PKMNotices: naglowek "[PKM Assistant v1.0.9]" zamiast "[Smart Env v2.2.7]" (sesja 32)
- [x] 30+ powiadomien po polsku (Ladowanie, Zapisywanie, Indeksowanie...) (sesja 32)
- [x] Settings tab: "Ladowanie PKM Assistant..." zamiast "Smart Environment is loading..." (sesja 32)
- [x] SC status_bar component wylaczony (no-op w konfiguracji) (sesja 32)
- [x] Connections codeblock: polskie teksty (sesja 32)
- [x] Build: 6.8MB, wersja 1.0.9 (sesja 32)
- [x] **Sesja 33: Embedding loop fix + EmbeddingHelper rewrite + Batch optimization** (sesja 33) ✅
- [x] Fix: Re-embedding loop (2257 sources every restart) — SmartBlock.init()/queue_embed() conditional (sesja 33)
- [x] Fix: SmartEntity.init_without_embed() — lekki init bez vec setter side-effect (sesja 33)
- [x] Fix: EmbeddingHelper rewrite — adapter-first path (ta sama co vault_search) (sesja 33)
- [x] Fix: EmbeddingHelper.embedBatch() — naprawiony format inputu (sesja 33)
- [x] Fix: RAGRetriever batch indexing — 60 HTTP calls → 1-2 (limit 20 sesji) (sesja 33)
- [x] Fix: MemorySearchTool batch search — N HTTP calls → 1-2 (limit 30 docs) (sesja 33)
- [x] Timing logs w send_message pipeline (ensureRAG, system prompt, RAG, minion, total) (sesja 33)
- [x] Embed queue: 0 sources, 0 blocks po restarcie (potwierdzone!) (sesja 33)
- [x] **Sesja 34: Embedding fix "Invalid vectors" + Audyt SC** (sesja 34) ✅
- [x] Fix: "Invalid vectors for cosineSimilarity" spam — embedBatch() z trackingiem indeksow (sesja 34)
- [x] Fix: cosineSimilarity() cichy return 0 zamiast console.warn (sesja 34)
- [x] Fix: MemorySearchTool + RAGRetriever pre-filter pustych docs/sesji (sesja 34)
- [x] Audyt SC: 10 modulow uzywanych, 5 martwych (nie trafia do bundla) (sesja 34)
- [x] Embedding uzywany w 4 miejscach: vault_search, memory_search, RAG, connections panel (sesja 34)
- [x] Konsola czysta: ZERO warningow embedding po restarcie (sesja 34)
- [x] **Sesja 35: AGORA — Wspólna Baza Wiedzy Agentów** (sesja 35) ✅
- [x] AgoraManager.js: core moduł Agory (profil, aktywność, mapa, projekty, dostęp) (sesja 35)
- [x] 3 nowe MCP tools: agora_read, agora_update, agora_project (sesja 35)
- [x] MCP narzedzia: 20 total (17 + agora_read + agora_update + agora_project) (sesja 35)
- [x] AgoraView.js: pełny sidebar UI z 5 zakładkami (Profil, Aktywność, Projekty, Mapa, Dostęp) (sesja 35)
- [x] Inline CRUD: formularze zamiast raw file editorów, edit/delete per item (sesja 35)
- [x] Projekty współdzielone: tworzenie, zadania z checkboxami, dodawanie/usuwanie agentów, ping (sesja 35)
- [x] Access control: 3 poziomy (admin/contributor/reader), inline zmiana z UI (sesja 35)
- [x] Prompt context: buildPromptContext() wstrzykuje Agorę do system promptu agenta (sesja 35)
- [x] Minion context: buildMinionContext() daje minionowi wiedzę z Agory (sesja 35)
- [x] Usuwanie projektu z potwierdzeniem + wykluczanie agenta z projektu (sesja 35)
- [x] Build: 6.9MB, wersja 1.0.9 (sesja 35)
- [x] **Sesja 36: 2.2 Opisy MCP Tools — przepisanie 20 narzedzi + system prompt** (sesja 36) ✅
- [x] Opisy 20 MCP tools przepisane z ~25 tokenow na ~200-400 tokenow/tool (sesja 36)
- [x] Kazdy opis zawiera: KIEDY UZYWAC, KIEDY NIE UZYWAC, UWAGI, PRZYKLADY, guardrails (sesja 36)
- [x] 100% po polsku (wczesniej 5 narzedzi po angielsku) (sesja 36)
- [x] Agent.js system prompt: przepisany blok narzedzi (local + cloud model) (sesja 36)
- [x] Cloud model: structured sekcje Vault/Pamiec/Skille/Minion/Master/Komunikator/Artefakty/Agora (sesja 36)
- [x] Local model: zwiezla wersja z kluczowymi zasadami i wszystkimi 20 narzedziami (sesja 36)
- [x] ToolCallDisplay.js: 3 nowe pozycje Agory (agora_read, agora_update, agora_project) (sesja 36)
- [x] Drzewa decyzyjne: vault_search vs memory_search vs minion_task (sesja 36)
- [x] Guardrails: "nie nadpisuj bez pytania", "nie usuwaj bez prosby", "sprawdz duplikaty w brain" (sesja 36)
- [x] Parametry narzedzi: pelne opisy z przykladami i formatami (sesja 36)
- [x] Build: 6.9MB, wersja 1.0.9 (sesja 36)
- [x] **Sesja 37: 2.3 PromptBuilder + Prompt Inspector + Tool Filtering** (sesja 37) ✅
- [x] PromptBuilder.js: modularny system budowania promptu z sekcjami i tokenami (sesja 37)
- [x] Prompt Inspector: panel w Settings z sekcjami, tokenami, pogrupowany wg kategorii (sesja 37)
- [x] TOOL_GROUPS: 7 grup narzedzi MCP do filtrowania per-agent (sesja 37)
- [x] Per-agent tool filtering: enabledTools[] + UI w AgentProfileView (sesja 37)
- [x] Agent.js refaktor: monolityczny getSystemPrompt() → PromptBuilder.build() (sesja 37)
- [x] AgentManager: enriched context (_buildBaseContext + getPromptInspectorData) (sesja 37)
- [x] Build: 7.0MB, wersja 1.0.9 (sesja 37)
- [x] **Sesja 38: PromptBuilder fixes + 7 usprawnien promptu** (sesja 38) ✅
- [x] Fix: "Pokaz prompt" modal crash (dynamic import → static import Modal) (sesja 38)
- [x] Fix: agent bez MCP "obiecuje" narzedzia (dodany explicit "NIE MASZ NARZEDZI") (sesja 38)
- [x] Fix: agora_update po delegacji (dodana regula "PO DELEGACJI: koniec tury") (sesja 38)
- [x] Fix: permissions override resetowala mcp:false (_mergeBuiltInOverrides) (sesja 38)
- [x] PKM System + Srodowisko edytowalne z Settings (2x textarea, puste=default) (sesja 38)
- [x] L1 pointer zamiast pelnego tekstu (~1500 tok → ~50 tok oszczednosci) (sesja 38)
- [x] Inbox akcjowalny z vault_read sciezka + instrukcja dla agenta (sesja 38)
- [x] Zasady adaptacyjne wg permissions (bez MCP → tylko "po polsku") (sesja 38)
- [x] Komunikator z unread info + vault_read path do inbox (sesja 38)
- [x] Focus Folders przeniesione z Uprawnienia → Srodowisko (sesja 38)
- [x] PLAN_v2.md: dodany master_task per-agent toggle (sesja 38)
- [x] Build: 7.0MB, wersja 1.0.9 (sesja 38)
- [x] **Sesja 39: 2.4 Oczko — Świadomość Aktywnej Notatki** (sesja 39) ✅
- [x] _buildActiveNoteContext(): tytuł + ścieżka + frontmatter (z metadataCache) + treść do 2000 znaków (z cachedRead) (sesja 39)
- [x] Wstrzyknięcie w send_message() — po system prompcie, przed artefaktami (sesja 39)
- [x] Guzik 👁️ w toolbarze chatu — toggle enableOczko, klasa .active, zapis na dysk (sesja 39)
- [x] Toggle "Oczko" w Settings (sekcja Pamięć) — obsek.enableOczko, domyślnie WŁĄCZONE (sesja 39)
- [x] Filtr: tylko pliki .md, graceful fail przy braku pliku (sesja 39)
- [x] Build: 7.0MB, wersja 1.0.9 (sesja 39)
- [x] **Sesja 40: 2.5 Prompt Transparency — Pełna Transparentność** (sesja 40) ✅
- [x] TokenTracker: śledzenie tokenów per-wiadomość i per-sesja z podziałem main/minion/master (sesja 40)
- [x] streamHelper.js: propagacja usage z API (text + usage) do wszystkich callerów (sesja 40)
- [x] Token panel UI: klikalny counter → panel "Sesja: Xin/Yout · Main/Minion/Master" (sesja 40)
- [x] SubAgentBlock: zwijalne bloki w chacie dla auto-prep/minion_task/master_task (sesja 40)
- [x] Prompt Inspector toggles: włączanie/wyłączanie sekcji promptu z Settings (sesja 40)
- [x] Backstage MCP redesign: TOOL_DESCRIPTIONS po polsku, cross-ref agentów, kategoria Agora (sesja 40)
- [x] ThinkingBlock compact: mniejszy zwinięty dymek (~22px zamiast ~29px) (sesja 40)
- [x] Build: 7.0MB, wersja 1.0.9 (sesja 40)
- [x] Fix: TokenTracker liczy tokeny z tekstu (tiktoken) — nie polega na API usage (sesja 40)
- [x] Fix: Auto-prep SubAgentBlock wewnątrz bańki asystenta — nie znika przy scrollowaniu (sesja 40)
- [x] Fix: Token popup overlay z try-catch, "nie użyty" zamiast "brak użycia" (sesja 40)
- [x] **Sesja 41: 2.6 Personalizacja Agenta Part 1 — Archetyp → Rola + Memory tab** ✅
- [x] 4 archetypy (orchestrator, specialist, assistant, meta_agent) z behavior_rules wstrzykiwanymi do promptu (sesja 41)
- [x] 4 wbudowane role (jaskier-mentor, vault-builder, creative-writer, daily-assistant) (sesja 41)
- [x] RoleLoader: laduje role built-in + custom YAML z .pkm-assistant/roles/ (sesja 41)
- [x] Agent.js migracja: archetype = broad class, role = specific specialization (sesja 41)
- [x] AgentLoader._migrateArchetypeRole(): auto-konwersja starych YAML (sesja 41)
- [x] PromptBuilder: archetype pod tozsamoscia, rola nad osobowoscia (sesja 41)
- [x] AgentProfileView: nowy Creator flow (Archetyp dropdown → Rola dropdown z sugestiami) (sesja 41)
- [x] AgentProfileView: rola ZAWSZE nadpisuje dane, "Brak" = kasacja do domyslnych (sesja 41)
- [x] Memory tab redesign: 6 plikow collapsible (brain, playbook, vault_map, active_context, audit, sessions) (sesja 41)
- [x] Mini-formularze w memory tab: "Dodaj instrukcje" (playbook) + "Dodaj lokacje" (vault_map) (sesja 41)
- [x] Settings: sekcja "Role Agentow" z lista rol + Role Creator (RoleEditorModal) (sesja 41)
- [x] Role Creator: pelny formularz (nazwa, emoji, archetyp, opis, zasady, personality, skills, foldery, temp, permissions) (sesja 41)
- [x] Build: 7.0MB, wersja 1.0.9 (sesja 41)
- [x] **Sesja 42: 2.6 Part 2 — Access Control / WHITELIST System** ✅
- [x] AccessGuard.js — centralna klasa whitelist (checkAccess, filterResults, glob matching) (sesja 42)
- [x] Agent.js — focusFolders upgrade: string[] → {path, access}[] z normalizacja (sesja 42)
- [x] PermissionSystem.js — AccessGuard wpieta po hasPermission check (sesja 42)
- [x] MCPClient.js — post-filtering vault_list/search + denial memory (sesja 42)
- [x] MinionRunner.js — SECURITY FIX: route przez MCPClient zamiast direct execute (sesja 42)
- [x] ApprovalModal.js — full rewrite: polskie opisy, content preview, 2-click deny z powodem (sesja 42)
- [x] ApprovalManager.js — structured return {result, reason} zamiast boolean (sesja 42)
- [x] PromptBuilder.js — sekcja WHITELIST z ikonami + vault_map opisy z Agory (sesja 42)
- [x] AgentProfileView.js — autocomplete folder picker z chipami i togglem read/write (sesja 42)
- [x] AgoraView.js — cross-reference "Dostep agentow" z folder badges (sesja 42)
- [x] Compat fixes: AgoraManager.getVaultMapDescriptions(), AgentManager context, deprecated modal (sesja 42)
- [x] **Sesja 42 kontynuacja: Guidance mode + No-Go absolute + Autocomplete wszedzie** ✅
- [x] Guidance mode: nowy tryb dostepu — agent widzi caly vault (except No-Go), focus folders to priorytety (sesja 42k)
- [x] WHITELIST domyslny, guidance mode = opt-in toggle w uprawnieniach (sesja 42k)
- [x] No-Go ABSOLUTE: foldery No-Go niewidoczne nawet z YOLO + guidance mode (sesja 42k)
- [x] PermissionSystem.js — No-Go check PRZED YOLO bypass (sesja 42k)
- [x] PermissionsModal.js — sync z AgentProfileView (presety, memory, guidance_mode, disabled "Wkrotce") (sesja 42k)
- [x] AgoraView.js — autocomplete folder picker we WSZYSTKICH strefach + No-Go + agent whitelist (sesja 42k)
- [x] AgoraView.js — BUG FIX: _saveNoGoFolders() nie aktualizowalo AccessGuard w pamieci (sesja 42k)
- [x] PromptBuilder.js — "PRIORYTETOWE FOLDERY" (guidance) vs "WHITELIST" (strict) (sesja 42k)
- [x] Zone assign buttons na wszystkich 3 strefach (systemowe, uzytkownika, agentowe) (sesja 42k)
- [x] Build: 7.1MB, wersja 1.0.9, 0 bledow (sesja 42k)
- [x] **Sesja 43: Tryby Pracy Chatu (Work Modes)** ✅
- [x] WorkMode.js — 4 tryby: Rozmowa (💬), Planowanie (📋), Praca (🔨), Kreatywny (✨) (sesja 43)
- [x] Kazdy tryb kontroluje jakie MCP tools sa dostepne dla agenta (sesja 43)
- [x] Tryb kaskaduje: Main → Master → Minion (te same ograniczenia) (sesja 43)
- [x] 3 niezalezne warstwy: Tryb (tools exist) → WHITELIST (where) → YOLO (ask permission) (sesja 43)
- [x] SwitchModeTool.js — MCP tool switch_mode, agent moze proponowac/auto-zmieniac tryb (sesja 43)
- [x] Auto-change: off (wylaczony) / ask (propozycja+przycisk) / on (natychmiast) (sesja 43)
- [x] Domyslny tryb: per-agent (defaultMode) > globalny (globalDefaultMode) > 'rozmowa' (sesja 43)
- [x] Toolbar: reorganizacja TOP (ogolne) / BOTTOM (chat actions), mode popover z 4 trybami (sesja 43)
- [x] PromptBuilder: buildModePromptSection() — instrukcje zachowania per tryb (sesja 43)
- [x] AgentProfileView: dropdown domyslnego trybu per agent (sesja 43)
- [x] Settings: globalDefaultMode + autoChangeMode (sesja 43)
- [x] Prompt Inspector: przycisk "Kopiuj" w modalu podgladu promptu (sesja 43)
- [x] MCP narzedzia: 21 total (20 + switch_mode) (sesja 43)
- [x] Build: 7.1MB, wersja 1.0.9, 0 bledow (sesja 43)
- [x] **Sesja 44: Prompt v2.1 + Decision Tree v2 + Prompt Builder** ✅
- [x] PromptBuilder rewrite: 3-warstwowy override (factory < global < per-agent) (sesja 44)
- [x] Decision Tree v2: 24 instrukcji x 7 grup, granularna edycja, dynamiczne filtrowanie narzedzi (sesja 44)
- [x] Agent.js: nowe pola promptOverrides + agentRules, serialize/update (sesja 44)
- [x] AgentProfileView: nowy tab "Prompt" z per-agent overrides i DT instruction editor (sesja 44)
- [x] Settings: 4 textarea (environment/minion/master/rules) + DT editor + Agora scope checkboxy (sesja 44)
- [x] chat_view.js: workMode + artifacts przekazywane via context (nie append po fakcie) (sesja 44)
- [x] AgoraManager: scope parameter (profile/activity/projects) konfigurowalny (sesja 44)
- [x] **Prompt Builder panel** — unified panel zastepujacy 5 osobnych komponentow (sesja 44)
- [x] Agent selector dropdown — podglad promptu DOWOLNEGO agenta (nie tylko aktywnego) (sesja 44)
- [x] Wszystkie sekcje toggleable (usuniety required:true z identity/environment/rules) (sesja 44)
- [x] Expand/collapse z inline edytorami (textarea, DT editor, Agora checkboxy, read-only preview) (sesja 44)
- [x] Live token update — tokeny total + per-category aktualizuja sie natychmiast po toggle (sesja 44)
- [x] Fix bug: kategoria behavior (Tryb pracy, Drzewo decyzyjne, Minion, Master) niewidoczna w inspektorze (sesja 44)
- [x] AgentManager: getPromptInspectorDataForAgent(agentName) — podglad dowolnego agenta (sesja 44)
- [x] Build: 7.1MB, wersja 1.0.9, 0 bledow (sesja 44)
- [x] **Sesja 45: Delegacja v2 — Parallel + Multi-Minion + Decision Tree Overhaul** ✅
- [x] Parallel tool execution: Promise.all w streamHelper.js (minion) i chat_view.js (main chat) (sesja 45)
- [x] Multi-minion: parametr `minion` w minion_task, resolve args.minion > activeAgent.minion (sesja 45)
- [x] Min iterations: min_iterations w minion.md frontmatter, nudge wymuszajacy kontynuacje (sesja 45)
- [x] Decision Tree v2.1: 8 grup (+DELEGACJA order:0, +KOMUNIKACJA order:6), instrukcje minion/master rozproszone (sesja 45)
- [x] minionList w kontekscie AgentManager dla PromptBuilder dynamic inject (sesja 45)
- [x] 3-fazowe parallel tool calls w chat_view: create UI → execute → render (sesja 45)
- [x] KOMUNIKACJA: osobna toggleable grupa DT (agent_delegate + agent_message) (sesja 45)
- [x] minion_guide i master_guide zaktualizowane (krotsze, multi-minion, master nie szuka sam) (sesja 45)
- [x] Build: 7.1MB, wersja 1.0.9, 0 bledow (sesja 45)
- [x] **Sesja 46: MasterRunner + MasterLoader + Multi-Delegate + Creator + Pipeline Debug** ✅
- [x] MasterLoader.js: ladowanie masterow z .pkm-assistant/masters/, cache, walidacja, 2 startery (strateg, redaktor) (sesja 46)
- [x] MasterRunner.js: pelna petla tool-calling dla mastera (streamToCompleteWithTools), work mode cascade (sesja 46)
- [x] MinionMasterEditorModal.js: unified Creator/Editor dla minionow I masterow, tools picker, save/delete (sesja 46)
- [x] Agent.js multi-delegate: minions[]/masters[] jako tablice obiektow, MAX_DELEGATES=20, active/inactive, per-delegate overrides (sesja 46)
- [x] AgentManager.js: resolveMinionConfig + resolveMasterConfig z per-agent overrides (prompt_append, extra_tools, max_iterations) (sesja 46)
- [x] MasterTaskTool.js: kompletny rewrite — 3-fazowy flow (minion gather → master analyze → return), MasterRunner integration (sesja 46)
- [x] BackstageViews.js: Masters view z kartami, search, filter chips, przycisk "Nowy Master" (sesja 46)
- [x] DetailViews.js: Master detail view z meta info, tools, agenty, prompt rendering, edit (sesja 46)
- [x] Fix: parallel minion hang — modelResolver skip cache dla minion/master (SmartChatModel NOT concurrent-safe) (sesja 46)
- [x] Fix: 400 Bad Request po parallel tools — chat_view zapisuje PARSOWANE toolCalls (nie raw z API) (sesja 46)
- [x] Fix: safety timeout 60s w streamHelper — Promise.race na wszystkich model calls (sesja 46)
- [x] **PELNY PIPELINE PRZETESTOWANY END-TO-END:** Auto-prep → Main (Reasoner) → 2x Minion (parallel) → Master (Sonnet 4.5) → Final response (sesja 46)
- [x] Build: 7.1MB, wersja 1.0.9, 0 bledow (sesja 46)
- [x] **Sesja 47: Crystal Soul Design System — warstwa wizualna pluginu** ✅
- [x] Crystal Soul CSS variables: ~30 zmiennych `--cs-*` w styles.css mapujacych na Obsidian vars (dziala z kazdy themem) (sesja 47)
- [x] Agent cards reskin: shard border-left, diamond indicator (rotate 45deg + glow) zamiast ● (sesja 47)
- [x] Chat reskin: gradient accent na headerze, shard border na bubblach asystenta, diamond ::before na thinking/subagent (sesja 47)
- [x] Sidebar reskin: diamond markers przed section titles, shard hover na kartach (sesja 47)
- [x] Agent color system: Agent.crystalColor getter + deriveColor(name) hash → 8 presetow (amber/aqua/purple/blue/rose/emerald/slate/coral) (sesja 47)
- [x] data-agent-color atrybut na kartach agentow (HomeView) + avatarach w chacie (chat_view, 4 miejsca) (sesja 47)
- [x] Crystal toggles: diamond-shaped checkboxy na todo/plan items (sesja 47)
- [x] Streaming shimmer: crystal shimmer animation zamiast standardowej (sesja 47)
- [x] Theme customization: `.pkm-assistant/theme.css` ladowany przez _loadCrystalSoulTheme(), nadpisuje --cs-* (sesja 47)
- [x] Settings: sekcja "Crystal Soul" z przyciskami Generuj/Przeladuj motyw (sesja 47)
- [x] Fix: hardcoded rgba(255,255,255) → theme-aware vars, hardcoded #9b59b6 → color-mix (sesja 47)
- [x] Inspiracja: HTML mockup "Design concept" (~2600 linii) — krysztaly, diamenty, shard estetyka (sesja 47)
- [x] Build: 7.2MB, wersja 1.0.9, 0 bledow (sesja 47)
- [x] **Sesja 48: Skills v2 — Pelna implementacja (3 fazy) + DeepSeek Concat Fix** ✅
- [x] SkillLoader v2: SKILL.md format, saveSkill(), deleteSkill(), _slugify(), pliki pomocnicze awareness (sesja 48)
- [x] SkillEditorModal.js: unified Creator/Editor skilli (13 pol, 3 tryby: create/edit/override) (sesja 48)
- [x] SkillVariables.js: substituteVariables() — zamiana {{key}} na wartosci (sesja 48)
- [x] Chat UI: klik skill → prompt w inputcie (nie auto-send), pre-questions overlay z formularzem (sesja 48)
- [x] Per-agent skill overrides: Agent._normalizeSkillAssignments(), AgentManager.resolveSkillConfig() (sesja 48)
- [x] SkillExecuteTool: resolve per-agent overrides (prompt_append, model) (sesja 48)
- [x] PromptBuilder: rich skill descriptions w DT, auto-invoke instruction (sesja 48)
- [x] SkillListTool: icon, tags, allowedTools, has_pre_questions, tag filter (sesja 48)
- [x] BackstageViews: przycisk "+ Nowy Skill", DetailViews: pelny v2 podglad + SkillEditorModal (sesja 48)
- [x] Fix: Agent.js skills setter (brak settera → "Cannot set property skills") (sesja 48)
- [x] Fix: DeepSeek N-concat — rekurencyjny decompose tool names (backtracking), obsluguje dowolna liczbe sklejonych (sesja 48)
- [x] Ochrona concat w 3 miejscach: MCPClient (main), streamHelper (minion/master), chat_view (safety net) (sesja 48)
- [x] deep-topic-analysis: profesjonalny skill testowy (2 miniony parallel → user question → master → vault_write) (sesja 48)
- [x] **PELNY PIPELINE SKILLS v2 PRZETESTOWANY E2E:** pre-questions → variable substitution → 2 miniony → master → raport (sesja 48)
- [x] Build: 7.2MB, wersja 1.0.9, 0 bledow (sesja 48)

**Visual Overhaul Fazy 2-5 (sesja 53-54):**
- [x] ToolCallDisplay.js: TOOL_INFO z category zamiast emoji, getToolIcon() helper, SVG statusy/toggle/copy (sesja 53)
- [x] ThinkingBlock.js: SVG icon + timing (elapsed seconds) + SVG chevron (sesja 53)
- [x] SubAgentBlock.js: SVG icons, categories w TYPE_CONFIG, cs-breathing pending (sesja 53)
- [x] ConnectorGenerator.js: male krysztaly + linie laczace akcje w chacie (sesja 53)
- [x] SvgHelper.js: toElement(), crystalAvatar(), toolIcon() (sesja 53)
- [x] chat_view.js: ~50 edycji — crystal avatary, kolorowane user bubbles, "Krystalizuje..." typing, SVG buttony (sesja 53)
- [x] AgentProfileView.js: 51 emoji→SVG, crystal title, tabs z iconSeed/iconCat (sesja 53)
- [x] HomeView.js: 22 emoji→SVG, crystal agent cards (sesja 53)
- [x] BackstageViews.js: 32 emoji→SVG, TOOL_CATEGORIES z iconSeed (sesja 53)
- [x] AgoraView.js: 42 emoji→SVG, crystal agent badges, SVG access legend (sesja 54)
- [x] CommunicatorView.js: 14 emoji→SVG, crystal agent chips (sesja 54)
- [x] Agent.js: deriveColor()→pickColor() (62 kolorow zamiast 8), CRYSTAL_PALETTE→ALL_COLORS (sesja 54)
- [x] 5 modali + obsek_settings_tab + ApprovalModal + 7 innych: SVG headers/buttons (sesja 54)
- [x] UiIcons.js: ~40+ semantycznych SVG (trash, edit, clipboard, send, eye, lock...) (sesja 54)
- [x] styles.css: 4 nowe animacje + light theme overrides (sesja 54)
- [x] WorkMode.js: mode icons SVG (sesja 54)
- [x] Global sweep: ~20 plikow, zero emoji w DOM rendering (sesja 54)
- [x] Build: 7.4MB, 0 bledow (sesja 54)
- [ ] **ZNANY PROBLEM:** wiele buttonow uzywa abstrakcyjnych IconGenerator zamiast semantycznych UiIcons — potrzebna iteracja

**Input Chatu v2 (sesja 49):**
- [x] WebSearchTool + WebSearchProvider: multi-provider (Jina darmowy, Tavily, Brave, Serper, SearXNG) (sesja 49)
- [x] AskUserTool: agent pyta usera inline w chacie, czeka na odpowiedz, YOLO auto-select (sesja 49)
- [x] MentionAutocomplete: @notatka, @folder:, fuzzy search, nawigacja klawiatura (sesja 49)
- [x] AttachmentManager: 📎 file picker, drag & drop, Ctrl+V paste, chipy, miniaturki (sesja 49)
- [x] Multimodal: obrazki → base64 content blocks, tekst/PDF → text context, RollingWindow array support (sesja 49)
- [x] Adaptery: OpenAI/DeepSeek pass-through, Anthropic konwersja, Ollama text+images (sesja 49)
- [x] CSS: dropdown mentions, chipy, drag overlay, miniaturki, fullscreen overlay (sesja 49)
- [x] Build: 7.3MB, wersja 1.0.9, 0 bledow (sesja 49)

**Mentions v2 — inline @[Name] + bugfix (sesja 50):**
- [x] Bug fix: mentions dzialaja bez zalacznikow (resolve PRZED clear w send_message) (sesja 50)
- [x] Inline @[Name] w textarea zamiast chipow-only (sesja 50)
- [x] Badge mention w babelce usera (pkm-mention-badge) z kontrastowym stylem (sesja 50)
- [x] Enter/Tab nie wysyla wiadomosci gdy dropdown otwarty (stopImmediatePropagation) (sesja 50)
- [x] Metadane mentions ukryte w UI (displayText vs apiContent separacja) (sesja 50)
- [x] Decision Tree: instrukcja search_mention w grupie SZUKANIE (sesja 50)
- [x] removeMention() usuwa @[Name] z textarea (sesja 50)
- [x] CSS: badge kontrastowy w babelce usera (bialy tekst na accent tle) (sesja 50)
- [x] Build: 7.3MB, 0 bledow (sesja 50)

## Co ISTNIEJE w kodzie ale NIE ZWERYFIKOWANE

- [ ] Workflow parser i loader

## Nastepne kroki (pelny plan w PLAN_v2.md)

> **PLAN_v2.md** zastapil stary PLAN.md (ktory zostal zbyt pomieszany sesjami/sprintami).
> Nowy plan: CZESC 1 (zrobione ~170 checkboxow) + CZESC 2 (do v1.0 ~95 checkboxow) + CZESC 3 (post v1.0)

- Postep: **~290/320 checkboxow (~90%)**
- Wersja: 1.0.9
- **Kluczowy wniosek (sesja 28):** Kod gotowy w ~90%. Problem jest w PROMPTACH.
- **Sesja 44:** Prompt v2.1 + Decision Tree v2 + Prompt Builder panel ZROBIONE.
- **Sesja 45:** Delegacja v2 ZROBIONE — parallel tools, multi-minion, min_iterations, DT overhaul, KOMUNIKACJA.
- **Sesja 46:** MasterRunner+Loader+Creator ZROBIONE, multi-delegate arrays, pipeline debug (3 fixy), pelny E2E test.
- **Sesja 47:** Crystal Soul Design System — CSS vars, agent colors, diamond markers, shard borders, theme customization.
- **Sesja 48:** Skills v2 ZROBIONE — 3 fazy (fundament+overrides+polish), SkillEditorModal, pre-questions, per-agent overrides, DeepSeek N-concat fix, deep-topic-analysis skill E2E.
- **Sesja 49:** Input Chatu v2 ZROBIONE — Web Search (Jina+4 providery), ask_user (inline pytanie w chacie), @ Mentions (autocomplete+resolve), Zalaczniki (📎+drag+paste+multimodal).
- **Sesja 50:** Mentions v2 ZROBIONE — bug fix (resolve przed clear), inline @[Name] w textarea, badge w babelce, Enter fix, metadane ukryte, DT instrukcja.
- **Sesja 51:** Pamiec fix 2.9 ZROBIONE — Plan 2.9 (5 sesji) zamkniety. Strukturalny Summarizer (8 sekcji jak Claude Code), dwutryb sumaryzacji (soft po tasku + hard emergency), compression blocks w chacie, SVG context circle, emergency task context (todos+plan), session path w summary, L3 consolidation, garbage detection, brain dedup, opcjonalna konsolidacja.
- **Sesja 52:** Visual Overhaul Faza 1 — PLAN_VISUAL_OVERHAUL.md (mega-plan, 3 rundy feedbacku). Fundament: IconGenerator.js (proceduralne SVG ikony, 3 kategorie, 24 szablony), CrystalGenerator.js (8 ksztaltow krysztalow agentow), ColorPalette.js (62 kolory kamieni szlachetnych, 8 rodzin). CSS Crystal Soul v2 (hex zamiast HSL, color-mix warianty, nowe animacje). Crystal Soul Palette.html (demo wizualne z glow hover).
- **Sesja 53-54:** Visual Overhaul Fazy 2-5 — migracja emoji→SVG w ~30 plikach. Faza 2: chat redesign (crystal avatary CrystalGenerator, ToolCallDisplay z categories+getToolIcon, ThinkingBlock+SubAgentBlock SVG+timing, ConnectorGenerator, typing "Krystalizuje..." z pulsujacym krystalem, ~50 edycji w chat_view.js). Faza 3: AgentProfileView (51 emoji→SVG, crystal title, tabs z iconSeed), HomeView (22 emoji→SVG, crystal cards), BackstageViews (32 emoji→SVG, TOOL_CATEGORIES). Faza 4: AgoraView (42 emoji→SVG, crystal badges), CommunicatorView (14 emoji→SVG), Agent.js (deriveColor→pickColor 62 kolorow), 5 modali. Faza 5: UiIcons.js (~40 semantycznych SVG), animacje (cs-send-pulse, cs-message-enter), global sweep (~20 plikow). **ZNANY PROBLEM:** wiele buttonow uzywa abstrakcyjnych IconGenerator zamiast semantycznych UiIcons — potrzebna iteracja #2.
- **Sesja 56:** Visual Audit Chatu — bugfixy (crystal header flag, thinking order, connector dynamic, scroll cap), ToolCallDisplay przerobiony (formatToolOutput 22 case'y, polskie opisy zamiast JSON), SubAgentBlock (UiIcons robot/crown, nazwa agenta w labelu). Audyt 1.5-1.10 z PROMPT_VISUAL_AUDIT.md.
- **Sesja 57:** Visual Audit: Agent Profile BLOK 6 — tab Przegląd przebudowany (hero card z opisem+kryształem, Crystal Soul palette picker 62 kolory, edytowalny opis agenta, daty utworzenia/aktywności, shardy Sesje/Skille/Miniony/Mastery/Model/L1/L2/Brain). Tab bar redesign (grid 4×2, shard-style). Nowe pola Agent.js: description, createdAt, color. AgentLoader whitelist fix. Error handling async tabs.
- **Sesja 58:** Dwufazowa Kompresja Kontekstu (jak Claude Code) — Faza 1: darmowe skracanie starych tool results (próg 70%), Faza 2: pełna sumaryzacja (próg 90%, tylko jeśli Faza 1 nie wystarczyła). Tool definitions liczone w tokenach kontekstu. UI: trim bubble (styl user message, rozwijalne szczegóły). Nowy setting: toolTrimThreshold. Pliki: RollingWindow.js, chat_view.js/css, obsek_settings_tab.js.
- **Sesja 59:** Visual Audit Chatu — ToolCallDisplay refactor. ask_user fix (YOLO bypass usunięty — zawsze czeka na usera). Crystal Soul redesign ask_user block. ToolCallDisplay pełna transparentność: nowy `formatToolInputDetail()` (pełne argumenty w rozwiniętym body), `formatToolOutput()` rozbudowany dla 24 narzędzi (polskie opisy, czytelne dane zamiast surowego JSON). Brakujące case'y w header: memory_update, memory_status, skill_list, agora_read/update/project. CSS: `.cs-action-row__pre` (monospace blok), `.cs-action-row__detail` (max-height 300px, scroll). Pliki: ToolCallDisplay.js, AskUserTool.js, chat_view.css.
- **Sesja 60:** Visual Audit 1.11 (delegation/mode change buttons → shard-style). Fixy krytyczne: "undefined Praca/undefined [agent]" w przyciskach (data.icon/data.to_emoji nie istniały → getModeInfo + btn.innerHTML), usunięte mod-cta. SwitchModeTool fix — agent nie zatrzymywał się po propozycji → używał ask_user na własną rękę (duplikacja); naprawione przez: description narzędzia, message proposal "ZATRZYMAJ SIĘ", auto-kontynuacja po kliknięciu przycisku. switch_mode niewidoczny w profilu agenta (MCP tab) — naprawione: dodane do TOOL_GROUPS (mode:[]), DECISION_TREE_GROUPS (tryb), DECISION_TREE_DEFAULTS (2 instrukcje), MODE_BEHAVIORS zaktualizowane (konkretne wywołania switch_mode zamiast mglistego "zaproponuj"). Permissions przebudowane jako Crystal Soul popover (identyczny mechanizm jak mode popover): 3 presety, 8 diamond toggleów, auto-save bez przycisku "Zapisz".
- **Sesja 61:** Playbook v2 Design — brainstorming architektura (system prompt = AGENT czyta, playbook = MINION czyta). PLAYBOOK_DRAFT.md: pełny draft 15 sekcji (~340 linii). Weryfikacja 24 MCP schematów. Auto-prep = dead code.
- **Sesja 62:** Visual Audit: Playbook Builder + HiddenFileEditor + Ekipa tab + Detail Views. Playbook Builder UI w tabie Umiejętności (4 auto-sekcje z AUTO/EDYTOWANE badge, custom rules "Gdy X → Zrób Y", kompilacja). HiddenFileEditorModal Crystal Soul (CSS adoption fix, agent-color gradient header, styled textarea). Ekipa tab rewrite na sub-taby + shard grid (identyczny schemat jak Skills/MCP). Override forms Crystal Soul (skill + delegate). Detail Views Crystal Soul (3 widoki read-only, usunięte przyciski Edytuj). 7 plików zmienionych.
- **DO ZROBIENIA:** Visual Audit kontynuacja (Bloki 2-12): Input Area, pozostałe taby profilu. System prompt triage/behavior. Skill Creator optymalizacja. Inline+Sidebar (2.12-13). Docs+Release.

### Kolejnosc do v1.0 (z PLAN_v2.md):
1. ~~2.1 Stabilizacja~~ ✅
2. ~~2.2 Opisy MCP Tools~~ ✅ (sesja 36)
3. ~~2.3 System Prompt~~ ✅ (sesja 37-38)
4. ~~2.4 Oczko~~ ✅ (sesja 39)
5. ~~2.5 Prompt Transparency~~ ✅ (sesja 40)
6. ~~2.6 Personalizacja Part 1~~ ✅ (sesja 41) — Archetyp→Rola, RoleLoader, Role Creator, Memory tab
7. ~~2.6 Part 2: Access Control~~ ✅ (sesja 42) — WHITELIST, denial, approval, autocomplete, minion security
8. ~~Tryby Pracy Chatu~~ ✅ (sesja 43) — 4 modes, cascade, switch_mode, toolbar UI
9. ~~Delegacja v2~~ ✅ (sesja 45) — parallel tools, multi-minion, DT overhaul
10. ~~2.7 MasterRunner + Minion/Master Creator~~ ✅ (sesja 46) — MasterLoader, MasterRunner, multi-delegate, Creator
11. ~~2.8 Skille v2~~ ✅ (sesja 48) — SkillEditor, per-agent overrides, pre-questions, auto-invoke, DeepSeek fix
12. ~~2.11 Warstwa Wizualna~~ ✅ (sesja 47) — Crystal Soul Design System
13. ~~2.8.5 Input Chatu v2~~ ✅ (sesja 49) — Web Search, ask_user, @ Mentions, Zalaczniki (multimodal)
14. ~~2.9 Pamiec fix~~ ✅ (sesja 51) — Plan 2.9 zamkniety, strukturalny Summarizer, dwutryb, UI kompresji
15. ~~Visual Overhaul~~ ✅ (sesja 52-55) — Crystal Soul v3 COMPLETE: chat redesign, input area, multi-agent tabs, slim bar, 8-tab profil (Ekipa), shard grid skills, CSS cleanup
16. 2.12-2.13 Inline + Sidebar fixy
15. 2.14 Dokumentacja + Onboarding
16. 2.15 Release v1.0

## Wazne sciezki

- **Vault:** `C:/Users/jdziu/Mój dysk/JDHole_OS_2.0/`
- **Plugin w vaultcie:** `.obsidian/plugins/obsek/`
- **Pamiec Jaskiera:** `.pkm-assistant/agents/jaskier/memory/`
- **Brain Jaskiera:** `.pkm-assistant/agents/jaskier/memory/brain.md`
- **Sesje Jaskiera:** `.pkm-assistant/agents/jaskier/memory/sessions/`
- **Podsumowania L1:** `.pkm-assistant/agents/jaskier/memory/summaries/L1/`
- **Podsumowania L2:** `.pkm-assistant/agents/jaskier/memory/summaries/L2/`
- **Artefakty (globalne):** `.pkm-assistant/artifacts/` (czytelne nazwy: Lista-zadan.json)
- **Skille:** `.pkm-assistant/skills/{name}/skill.md`
- **Miniony:** `.pkm-assistant/minions/{name}/minion.md`
- **Build:** `npm run build` w `C:\Users\jdziu\Desktop\Obsek\Obsek Plugin\`

---

## Struktura projektu (co gdzie jest)

```
Obsek Plugin/
├── src/                    # Caly kod pluginu
│   ├── main.js             # Punkt startowy - tu plugin sie wlacza
│   ├── core/               # Mozg: AgentManager, PermissionSystem, VaultZones
│   ├── agents/             # Definicje AI agentow
│   ├── skills/             # SkillLoader - centralna biblioteka skilli
│   ├── core/               # AgentManager, MinionLoader, MinionRunner, PermissionSystem
│   ├── mcp/                # Narzedzia: vault, pamiec, skille, minion_task
│   ├── memory/             # Pamiec: RAG, rolling window, summarizer
│   ├── views/              # Wyglad: chat, sidebar (z nawigacja), modalne, ustawienia
│   │   └── sidebar/        # Sidebar views: SidebarNav, Home, Profile, Communicator, Backstage, Detail
│   ├── utils/              # Male funkcje pomocnicze
│   ├── components/         # UI komponenty
│   ├── collections/        # Kolekcje danych
│   ├── items/              # Elementy danych
│   └── actions/            # Akcje (connections list)
├── dist/                   # Skompilowany plugin (NIE RUSZAC)
├── external-deps/          # Biblioteki Smart Connections (NIE RUSZAC)
├── node_modules/           # Paczki npm (NIE RUSZAC)
├── .pkm-assistant/         # Dane w vaulcie: agenci, workflow, sesje
├── jdhole-mcp-servers/     # Wlasne MCP serwery
├── jdhole-skills/          # Wlasne skile
├── manifest.json           # Metadane pluginu (nazwa, wersja)
├── package.json            # Konfiguracja projektu
├── esbuild.js              # Konfiguracja bundlera
└── .env                    # Klucze API (NIGDY nie commitowac!)
```

---

## Baza kodu - stan po Sprint S1+S2 (sesja 30)

> **SC singleton WYELIMINOWANY** (sesja 30). Plugin stoi na wlasnych nogach.
> PKM Assistant moze dzialac obok Smart Connections bez konfliktu.

**Co zrobiono (sesja 30):**
- **PKMEnv** zastapil SmartEnv - module-scoped `PKM_SCOPE` zamiast `window.smart_env`
- **PKMPlugin** zastapil SmartPlugin - rozszerza Obsidian.Plugin bezposrednio
- **Embeddingi WLACZONE** - vault automatycznie indeksowany przy starcie
- **vault_search SEMANTYCZNY** - SmartSources.lookup() zamiast indexOf
- **memory_search SEMANTYCZNY** - EmbeddingHelper + cosine similarity
- **15 SC ghost strings** usunietych z UI (view types, codeblocks, links)
- **5 martwych modulow SC** usunietych

**Co pozostaje z SC (external-deps/):**
- Adaptery streamingowe (11 platform) - uzywane przez SmartChatModel
- SmartSources/SmartBlocks - pipeline embeddingowy (juz dziala!)
- SmartItemView - bazowa klasa widokow (dziala z PKMEnv)
- **Opcjonalnie do zrobienia pozniej**: pelna ekstrakcja adapterow do src/ i usuniecie external-deps/ (build 6.8MB → ~1-2MB)

Nasza warstwa:
- PKMEnv + PKMPlugin (wlasny fundament)
- System agentow, pamiec, MCP, permission system
- Semantyczny vault_search + memory_search
- Agent sidebar + creator, komunikator, artefakty

---

## Jak budowac i testowac

```bash
cd "C:\Users\jdziu\Desktop\Obsek\Obsek Plugin"
npm run dev       # Build z automatycznym odswiezaniem
npm run build     # Build produkcyjny
npm test          # Testy
```

Po buildzie: skopiuj `dist/` do folderu pluginu w vaulcie Obsidiana.

---

## Dokumentacja projektu

| Plik | Cel | Priorytet |
|------|-----|-----------|
| **WIZJA.md** | Dokad zmierzamy - finalny produkt | Swiety Gral #1 |
| **PLAN.md** | Master Plan realizacji wizji (checkboxy) | Swiety Gral #2 |
| **STATUS.md** (ten plik) | Co dziala, co nie, stan projektu | Kontekst |
| **DEVLOG.md** | Chronologiczny log zmian | Historia |
| **CLAUDE.md** | Konwencje kodu, tech stack | Dla AI |

Kiedy kopiujesz kontekst do innego czatu z AI, daj mu:
1. **WIZJA.md** + **PLAN.md** - cel i droga do niego
2. **STATUS.md** - aktualny stan
3. Konkretny plik/pliki ktorych dotyczy pytanie
