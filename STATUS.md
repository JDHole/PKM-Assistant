# PKM Assistant (Obsek) - Status Projektu

> **Kopiuj ten plik do dowolnego czatu z AI** zeby dac kontekst o projekcie.
> Ostatnia aktualizacja: 2026-02-25 (sesja 41)

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
- [x] Faza 4: Summarizer DZIALA - automatyczne podsumowanie rozmowy przy 70% limitu tokenow
- [x] Summarizer uzywa streamToComplete() (nie crashuje jak wczesniej)
- [x] RollingWindow: rozdzielony baseSystemPrompt od conversationSummary (brak layer collision)
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

## Co ISTNIEJE w kodzie ale NIE ZWERYFIKOWANE

- [ ] Strefy vaulta (VaultZones - konfiguracja jest w .pkm-assistant/config.yaml)
- [ ] Workflow parser i loader

## Nastepne kroki (pelny plan w PLAN_v2.md)

> **PLAN_v2.md** zastapil stary PLAN.md (ktory zostal zbyt pomieszany sesjami/sprintami).
> Nowy plan: CZESC 1 (zrobione ~170 checkboxow) + CZESC 2 (do v1.0 ~95 checkboxow) + CZESC 3 (post v1.0)

- Postep: **~220/300 checkboxow (~73%)**
- Wersja: 1.0.9
- **Kluczowy wniosek (sesja 28):** Kod gotowy w ~90%. Problem jest w PROMPTACH.
- **Sesja 40:** 2.5 Prompt Transparency ZROBIONE — TokenTracker, SubAgentBlock, toggles, Backstage MCP redesign.
- **Sesja 41:** 2.6 Part 1 ZROBIONE — Archetyp→Rola system, RoleLoader, Role Creator w Settings, Memory tab redesign.

### Kolejnosc do v1.0 (z PLAN_v2.md):
1. ~~2.1 Stabilizacja~~ ✅
2. ~~2.2 Opisy MCP Tools~~ ✅ (sesja 36)
3. ~~2.3 System Prompt~~ ✅ (sesja 37-38)
4. ~~2.4 Oczko~~ ✅ (sesja 39)
5. ~~2.5 Prompt Transparency~~ ✅ (sesja 40)
6. ~~2.6 Personalizacja Part 1~~ ✅ (sesja 41) — Archetyp→Rola, RoleLoader, Role Creator, Memory tab
7. **2.6 Part 2: Access Control** — focus folders enforcement, permission denial loop, vault visibility
8. 2.7 MasterRunner + 2.8 Skille v2
9. 2.9 Pamiec fix + 2.10 UX Chatu + 2.11 Warstwa Wizualna
10. 2.12-2.13 Inline + Sidebar fixy
11. 2.14 Dokumentacja + Onboarding
12. 2.15 Release v1.0

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
