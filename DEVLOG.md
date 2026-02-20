# Obsek Plugin - Dziennik Rozwoju (DEVLOG)

> Chronologiczny log wszystkich zmian, decyzji i nowych funkcji.
> Kazdy wpis AI dodaje automatycznie po sesji.

---

## Format wpisu

```
## [DATA] - Krotki opis
**Sesja z:** [ktore AI / narzedzie]
**Co zrobiono:**
- punkt 1
- punkt 2
**Pliki zmienione:**
- `sciezka/do/pliku.js` - co zmieniono
**Decyzje podjete:**
- decyzja i dlaczego
**Nastepne kroki:**
- co robic dalej
```

---

## 2026-02-20 (sesja 10) - Fix: Settings persistence + Minion model

**Sesja z:** Claude Code (Opus 4.6)

**Problem:**
User mial ustawiony Haiku jako minion model w settings, ale Claude Console pokazywala tylko Sonnet. Minion nie byl uzywany.

**Root cause (dwa bugi):**
1. **Settings persistence**: Wszystkie custom ustawienia Obsek (minionModel, enableRAG, maxContextTokens itd.) byly zapisywane na obiekcie `smart_chat_model` ktory jest zarzadzany przez Smart Connections. SC zapisuje TYLKO swoje klucze (`anthropic_api_key`, `anthropic_model`, `temperature`) - nasze custom klucze byly tracone po kazdym restarcie Obsidiana.
2. **Platform detection**: `_getMinionModel()` szukal `settings.platform` ale SC nie zapisuje tego klucza - platforma wynika z nazw kluczy API (`anthropic_api_key` -> anthropic).

**Fix:**
1. Stworzony osobny namespace `env.settings.obsek` w `smart_env.json` dla custom ustawien
2. Auto-detekcja platformy z nazw kluczy API (np. `anthropic_api_key` -> `anthropic`)
3. Wyczyszczone debug logi z konsoli (setki linii `handle_chunk`, `get_chat_model` itd.)

**Pliki zmienione:**
- `src/views/obsek_settings_tab.js` - custom settings -> namespace `obsek`
- `src/views/chat_view.js` - `_getMinionModel()` fix, `get_chat_model()` cleanup, usuniety debug spam
- `src/memory/RAGRetriever.js` - settings z `obsek` namespace
- `src/memory/SessionManager.js` - settings z `obsek` namespace

**Potwierdzone w konsoli:**
```
[ChatView] Minion model created: claude-haiku-4-5-20251001
[ChatView] consolidateSession model: MINION (claude-haiku-4-5-20251001)
```

**Wazna lekcja (Key Architecture Insight):**
- SC's `smart_chat_model` only persists its OWN keys - custom settings MUST use separate namespace
- SC doesn't persist `platform` key - must infer from `{platform}_api_key` names

**Nastepne kroki:**
- Rebranding UI: "Smart Connections" -> "Obsek"
- Weryfikacja pozostalych agentow (Iris, Dexter, Ezra)

---

## 2026-02-20 - Porzadki i system dokumentacji

**Sesja z:** Claude Code (Opus 4.6)

**Co zrobiono:**
- Przeglad calej struktury projektu
- Identyfikacja co dziala a co jest niepewne
- Stworzenie systemu dokumentacji:
  - `STATUS.md` - przenosny kontekst projektu (kopiuj do innych chatow)
  - `DEVLOG.md` - ten plik, dziennik zmian
  - Aktualizacja `CLAUDE.md` - realne MVP zamiast zyczen

**Stan projektu na start:**
- Baza: Smart Connections v4.1.7 (dziala)
- Chat z AI w Obsidianie (dziala)
- AI widzi notatki i tworzy nowe (dziala)
- System agentow, pamieci, uprawnien (istnieje w kodzie, nie zweryfikowane)
- Git zainicjowany, 1 commit, duzo niezapisanego kodu

**Decyzje podjete:**
- Traktujemy obecny kod jako wczesne MVP / fundament
- Nie zakladamy ze cokolwiek poza chatem dziala az nie zweryfikujemy
- Caly development bedzie vibe-codowany z AI
- Dokumentacja ma byc przenoszalna miedzy chatami

**Nastepne kroki:**
- Zweryfikowac co naprawde dziala z istniejacego kodu
- Zabezpieczyc prace na GitHubie (commit + push)
- Zdecydowac o pierwszym celu rozwoju

---

<!-- NOWE WPISY DODAWAJ PONIZEJ TEJ LINII -->

## 2026-02-20 (sesja 9) - Faza 5: Konsolidacja L1/L2 (OSTATNIA FAZA PAMIECI)

**Sesja z:** Claude Code (Opus 4.6)

**Co zrobiono:**

### Faza 5 - Konsolidacja L1/L2 (DONE + TESTED)

Ostatnia brakujaca faza systemu pamieci. Sesje automatycznie kompresuja sie w podsumowania L1/L2.

**AgentMemory.js** - glowne zmiany (~200 linii):
- `this.paths`: weekly/monthly/yearly -> summaries/L1 + summaries/L2
- `initialize()`: tworzenie summaries/L1/ i summaries/L2/
- `_migrateOldFolders()`: jednorazowa migracja weekly/ -> summaries/L1/
- `getMemoryContext()`: czyta z L1 zamiast weekly
- `_parseFrontmatter()`: parser YAML frontmatter (do trackingu sesji w L1)
- `getUnconsolidatedSessions()`: sesje bez L1 (porownuje z frontmatter)
- `getUnconsolidatedL1s()`: L1 bez L2
- `createL1Summary(sessions, chatModel)`: AI kompresuje 5 sesji w L1
- `createL2Summary(l1Files, chatModel)`: AI kompresuje 5 L1 w L2
- Usuniete: createWeeklySummary(), createMonthlySummary() + helpery (martwy kod)
- Import streamToComplete() do wywolan AI

**chat_view.js** - trigger L1/L2:
- Po consolidateSession(), niezaleznie od extraction
- While-loop przetwarza WSZYSTKIE zaleglosci w jednym przebiegu
- Najpierw L1 (po 5 niezesumowanych sesji), potem L2 (po 5 L1)
- Graceful degradation: blad konsolidacji nie blokuje reszty

**MCPClient.js** - fix uprawnien:
- memory_update z read_brain mapowane na vault.read (nie vault.write)
- Wczesniej Jaskier nie mogl czytac brain.md przez MCP

**MemorySearchTool.js** + **MemoryStatusTool.js** - nowe foldery:
- ['weekly','monthly','yearly'] -> ['summaries/L1','summaries/L2']

**Pliki zmienione:**
- `src/memory/AgentMemory.js` - cala logika L1/L2 (~200 linii nowych, ~100 linii usunietych)
- `src/views/chat_view.js` - trigger konsolidacji (~20 linii)
- `src/mcp/MCPClient.js` - fix read_brain permission
- `src/mcp/MemorySearchTool.js` - nowe sciezki
- `src/mcp/MemoryStatusTool.js` - nowe sciezki

**Build:** npm run build -> 6.5MB - SUKCES

**Test w Obsidianie:** SUKCES
- 48 sesji przetworzone automatycznie: 10 plikow L1 + 2 pliki L2
- L1 zawiera sensowne streszczenia (tematy, fakty o userze, decyzje)
- L2 kompresuje 5 L1 w zwiezle podsumowanie
- getMemoryContext() wstrzykuje najnowszy L1 do system promptu
- Jaskier odpowiada z wiedza z L1 (van 2027, 180 dni, Kamil-test)
- read_brain MCP dziala po fixie uprawnien

**Bugi naprawione po drodze:**
1. Early return w extraction skippowal L1/L2 trigger -> wyciagniete z bloku extraction
2. Jeden batch na consolidateSession() -> while-loop przetwarza caly backlog
3. read_brain blokowany przez vault.write permission -> override na vault.read

**FAZY 0-7 KOMPLETNE! System pamieci GOTOWY.**

**Nastepne kroki:**
- Rebranding UI: "Smart Connections" -> "Obsek"
- Testy manualne calego systemu
- Nowe funkcje poza systemem pamieci

---

## 2026-02-20 (sesja 6) - Faza 3: Memory Extraction

**Sesja z:** Claude Code (Opus 4.6)

**Co zrobiono:**

### Implementacja Fazy 3 (~375 linii nowego kodu)

**MemoryExtractor.js** (`src/memory/MemoryExtractor.js` - NOWY PLIK):
- Klasa z metoda `extract(messages, currentBrain, chatModel)`
- Buduje prompt ekstrakcji z MEMORY_DESIGN.md sekcja 5
- Kategoryzuje fakty: [CORE], [PREFERENCE], [DECISION], [PROJECT], [UPDATE], [DELETE]
- Parser odporny na warianty formatu AI (szuka sekcji ## Fakty i ## Streszczenie)
- Uzywa `streamToComplete()` z Fazy 0

**AgentMemory.js rozszerzony:**
- `memoryWrite(updates, activeContextSummary)` - centralna funkcja zapisu pamieci
- `applyBrainUpdates(updates)` - parsuje brain.md na sekcje, aplikuje zmiany
- `_parseBrainSections()` / `_buildBrainFromSections()` - helpery do edycji brain.md
- `_applyAppend()` / `_applyUpdate()` / `_applyDelete()` - operacje na faktach
- `_archiveOverflow()` - przenosi stare fakty do brain_archive.md gdy brain > 2000 znakow
- `_appendAuditLog()` - loguje kazda zmiane do audit.log
- Komentarz `// TODO: autonomy check` jako furtka na Faze 9

**chat_view.js rozszerzony:**
- `consolidateSession()` - orchestracja konca sesji:
  1. Najpierw zapisuje surowa sesje (safety net)
  2. Pobiera brain.md
  3. Wywoluje MemoryExtractor.extract()
  4. Aplikuje wyniki przez agentMemory.memoryWrite()
  5. Graceful degradation: jesli brak modelu lub za malo wiadomosci -> skip
- `_getMinionModel()` - tworzy osobna instancje modelu dla tanszych operacji pamieci
- handleNewSession() -> consolidateSession() zamiast handleSaveSession()
- handleAgentChange() -> consolidateSession() zamiast handleSaveSession()
- Timeout w send_message() -> consolidateSession()
- onClose() -> BEZ ZMIAN (prosty save, bo async extraction nie zdazy)

**obsek_settings_tab.js:**
- Dodane pole "Minion Model" w sekcji Memory System
- Polecany: claude-haiku-4-5-20251001 (12x tanszy od Sonnet)
- Pusty = uzywa glownego modelu

**Pliki zmienione:**
- `src/memory/MemoryExtractor.js` - NOWY PLIK (~160 linii)
- `src/memory/AgentMemory.js` - dodane ~140 linii (memoryWrite, applyBrainUpdates, helpery)
- `src/views/chat_view.js` - dodane ~60 linii (consolidateSession, _getMinionModel, zmienione triggery)
- `src/views/obsek_settings_tab.js` - dodane ~15 linii (pole Minion Model)

**Build:** npm run build -> 6.5MB, auto-kopia do vaultu - SUKCES

**Do przetestowania w Obsidianie:**
1. Porozmawiaj z Jaskierem, podaj imie
2. Kliknij "Nowa rozmowa" -> sprawdz brain.md (czy imie sie pojawilo)
3. Sprawdz active_context.md (streszczenie rozmowy)
4. Sprawdz audit.log (wpisy o zmianach)
5. Nowa rozmowa -> agent powinien Cie pamietac

**Nastepne kroki:**
1. Test w Obsidianie
2. Faza 4: Naprawa Summarizera
3. Faza 5: Konsolidacja L1/L2

---

## 2026-02-20 (sesja 6 ciag dalszy) - Poprawki jakosci ekstrakcji pamieci

**Sesja z:** Claude Code (Opus 4.6)

**Co zrobiono:**

### Test Fazy 3 w Obsidianie - SUKCES
- Memory Extraction przetestowana i DZIALA
- Konsola potwierdza: extraction result, brain updated, consolidation complete
- Jaskier wyciagnal fakty: wzrost, oczy, numer buta, blond wlosy, marzenie o Jarvisie
- Ale znaleziono problemy jakosciowe (duplikaty, forma osobowa)

### Poprawki jakosci (A+B+C)

**A) Lepszy prompt ekstrakcji** (`src/memory/MemoryExtractor.js`):
- Dodane WAZNE ZASADY FORMATOWANIA: wymog 3. osoby ("User ma..." nie "Mam...")
- Dodane WAZNE ZASADY DEDUPLIKACJI: sprawdz Brain przed dodaniem, uzywaj [UPDATE] jesli nowe szczegoly
- Przyklad dobry/zly w prompcie

**B) Fuzzy duplicate detection** (`src/memory/AgentMemory.js`):
- `_applyAppend()` teraz uzywa keyword-based porownania zamiast dokladnego stringa
- `_extractKeywords()` - wyciaga liczby + znaczace slowa (pomija stopwords PL)
- `_keywordsOverlap()` - jesli te same liczby + wspolne slowa → duplikat
- Teraz "Ma 46 numer buta" i "Ma numer buta 46" wykrywane jako duplikat

**C) Posprzatanie brain.md w vaulcie:**
- Usuniety duplikat rozmiaru buta (2 wpisy → 1)
- Znormalizowane do 3. osoby: "User ma 180 cm wzrostu" zamiast "Mam 180 cm wzrostu"

### Analiza pozostalych faz
- Faza 4 (Summarizer): ~70 linii, MEDIUM
- Faza 5 (L1/L2): ~230 linii, MEDIUM-HARD
- Faza 6 (Voice/MCP tools): ~170 linii, SIMPLE (nadaje sie dla slabszych modeli)
- Faza 7 (RAG polish): ~60 linii, SIMPLE (nadaje sie dla slabszych modeli)

**Pliki zmienione:**
- `src/memory/MemoryExtractor.js` - lepszy prompt ekstrakcji (+14 linii)
- `src/memory/AgentMemory.js` - fuzzy dedup: _extractKeywords(), _keywordsOverlap() (+60 linii)
- `.pkm-assistant/agents/jaskier/memory/brain.md` (w vaulcie) - posprzatany

**Build:** npm run build -> 6.5MB - SUKCES

**Nastepne kroki:**
1. Faza 4: Naprawa Summarizera (~70 linii)
2. Faza 7: RAG polish (~60 linii) - Sonnet da rade
3. Faza 6: Voice commands (~170 linii) - Sonnet da rade
4. Faza 5: L1/L2 konsolidacja (~230 linii) - najtrudniejsza, na koniec

---

## 2026-02-20 (sesja 7) - Faza 4: Naprawa Summarizera

**Sesja z:** Claude Code (Opus 4.6)

**Co zrobiono:**

### Faza 4 - Naprawa Summarizera (DONE + TESTED)

**Summarizer.js** (`src/memory/Summarizer.js`):
- Wywalony zepsuty chain `invoke/complete/call` (te metody nie istnieja w SmartChatModel)
- Teraz uzywa `streamToComplete()` z streamHelper.js (ten sam wzorzec co MemoryExtractor)
- Import dodany, kod uproszczony z ~80 linii do ~45 linii

**RollingWindow.js** (`src/memory/RollingWindow.js`) - Layer collision fix:
- Problem: `performSummarization()` doklejala summary do systemPrompt przy kazdej summaryzacji -> systemPrompt rosl w nieskonczonosc
- Fix: rozdzielony na `baseSystemPrompt` (staly: brain + agent context + RAG) i `conversationSummary` (nadpisywany)
- Nowy getter `systemPrompt` sklada oba dynamicznie
- `setSystemPrompt()` zmienia tylko base
- `clear()` czysci tez summary

**chat_view.js** (`src/views/chat_view.js`):
- Import `Summarizer`
- Nowy helper `_createRollingWindow()` - centralnie tworzy RollingWindow z opcjonalnym Summarizerem
- Summarizer uzywa minion modelu (jesli ustawiony) lub glownego modelu
- Wszystkie 4 miejsca tworzenia RollingWindow zamienione na `_createRollingWindow()`
- RAG integration poprawiony: czyta `baseSystemPrompt` zamiast gettera (unikniecie duplikacji summary)

**Pliki zmienione:**
- `src/memory/Summarizer.js` - przepisany na streamToComplete()
- `src/memory/RollingWindow.js` - layer collision fix (baseSystemPrompt + conversationSummary)
- `src/views/chat_view.js` - import Summarizer, _createRollingWindow(), RAG fix

**Build:** npm run build -> 6.5MB - SUKCES

**Test w Obsidianie:** SUKCES
- Summarizer odpala sie przy ~70% limitu tokenow
- Logi: "RollingWindow: Performing summarization..." -> "Summarization complete. History compressed."
- Rozmowa kontynuuje normalnie po kompresji (tool calls, streaming, odpowiedzi)
- Brak layer collision - summary nadpisywane, nie doklejane

**Nastepne kroki:**
1. Faza 7: RAG polish (~60 linii, SIMPLE)
2. Faza 6: Voice commands / MCP tools (~170 linii, SIMPLE)
3. Faza 5: L1/L2 konsolidacja (~230 linii, MEDIUM-HARD)

---

## 2026-02-20 (sesja 8) - Faza 7: RAG Polish + Faza 6: Voice Commands

**Sesja z:** Claude Code (Opus 4.6)

**Co zrobiono:**

### Faza 7 - RAG Polish (DONE)

**RAGRetriever.js** (`src/memory/RAGRetriever.js`):
- Rename `sessionManager` -> `agentMemory` (RAG teraz natywnie wie o AgentMemory)
- Usuniety nieuzywany import `EmbeddingHelper` i zduplikowana metoda `_cosineSimilarity()`
- Usuniety zbedny parametr `vault` z konstruktora
- Plik skurczony z 143 do 120 linii

**chat_view.js** (`src/views/chat_view.js`):
- `ensureRAGInitialized()` uproszczone: przekazuje `agentMemory` bezposrednio, bez fallbacka do SessionManager
- RAG wymaga aktywnego agenta - jesli brak, skip (zamiast fallbacku do starego systemu)

### Faza 6 - Voice Commands / MCP Tools (DONE)

**MemoryUpdateTool.js** (`src/mcp/MemoryUpdateTool.js` - NOWY PLIK, ~100 linii):
- MCP tool `memory_update` z 3 operacjami:
  - `read_brain` - czytaj brain.md
  - `update_brain` - dodaj/aktualizuj fakt (przez AgentMemory.memoryWrite() -> audit trail + fuzzy dedup)
  - `delete_from_brain` - usun fakt z brain.md
- Obsługuje sekcje: ## User, ## Preferencje, ## Ustalenia, ## Bieżące

**MemoryStatusTool.js** (`src/mcp/MemoryStatusTool.js` - NOWY PLIK, ~90 linii):
- MCP tool `memory_status` raportuje:
  - Rozmiar brain (znaki, ~tokeny, linie)
  - Liczba sesji
  - Liczba podsumowań (weekly/monthly/yearly)
  - Rozmiar brain_archive
  - Liczba wpisow audit log

**Agent.js** (`src/agents/Agent.js`):
- Usunięta stara instrukcja "uzywaj vault_write do brain.md" (teraz jest dedykowany memory_update)
- Dodane instrukcje komend pamieciowych w system prompcie:
  - "zapamiętaj że..." -> memory_update(update_brain)
  - "zapomnij o..." -> memory_update(delete_from_brain)
  - "co o mnie wiesz?" -> memory_update(read_brain)
  - "pokaż swoją pamięć" -> memory_status
  - "czy pamiętasz...?" -> memory_search

**main.js** - import + rejestracja memory_update i memory_status
**MCPClient.js** - dodane do ACTION_TYPE_MAP: memory_update -> vault.write, memory_status -> vault.read

### Fix: Crash Obsidian przy starcie (ollama_api_key)

**Problem:** data.json zawierala stara sekcje `smart_chat_threads` z `"adapter": "ollama"` i pustym `"ollama": {}`. SC base code probowal czytac `ollama_api_key` z undefined i crashowal Obsidian.
**Fix:** Usunieta stara sekcja `smart_chat_threads` z data.json - nasz plugin jej nie uzywa.

**Pliki zmienione:**
- `src/memory/RAGRetriever.js` - refactor sessionManager -> agentMemory
- `src/views/chat_view.js` - uproszczone ensureRAGInitialized()
- `src/mcp/MemoryUpdateTool.js` - NOWY PLIK
- `src/mcp/MemoryStatusTool.js` - NOWY PLIK
- `src/agents/Agent.js` - voice commands w system prompcie
- `src/main.js` - rejestracja nowych tools
- `src/mcp/MCPClient.js` - permission map
- `.obsidian/plugins/obsek/data.json` - usuniety smart_chat_threads (crash fix)

**Build:** npm run build -> 6.5MB - SUKCES

**Do przetestowania w Obsidianie:**
1. "Zapamiętaj że lubię kawę" -> agent wywołuje memory_update
2. "Co o mnie wiesz?" -> agent czyta brain.md
3. "Zapomnij o kawie" -> agent usuwa z brain.md
4. "Pokaż swoją pamięć" -> agent pokazuje statystyki

**Nastepne kroki:**
1. Faza 5: L1/L2 konsolidacja (~230 linii, MEDIUM-HARD)
2. Testy manualne Fazy 6 w Obsidianie

---

## 2026-02-20 (sesja 5) - Audit + naprawa sesji + memory_search + ribbon icon

**Sesja z:** Claude Code (Opus 4.6)

**Co zrobiono:**

### Audit calego projektu
- Porownanie biezacego kodu z backupem (Obsek BU) - backup to stary snapshot z 13.01
- Weryfikacja ze prawdziwy vault (Google Drive) ma najnowszy build (6.78MB) - OK
- Weryfikacja planu pamieci (MEMORY_IMPLEMENTATION_PLAN.md) vs kod - Fazy 0-2 DONE, Fazy 3-7 nadal aktualne
- Potwierdzenie ze Sonnet pracowal na wlasciwych plikach

### Naprawa session dropdown (BUG)
**Problem:** Sesje zapisywaly sie do AgentMemory (.pkm-assistant/agents/jaskier/memory/sessions/) ale dropdown czytal z SessionManager (.pkm-assistant/sessions/) - DWA ROZNE foldery!
**Fix:**
- `updateSessionDropdown()` czyta z AgentMemory gdy agent aktywny
- `handleLoadSession()` laduje z AgentMemory gdy agent aktywny
- `handleSaveSession()` aktualizuje dropdown po zapisie przez AgentMemory
- `AgentMemory.loadSession()` przyjmuje string, sciezke lub obiekt {path, name}

### Nowy tool: memory_search (KLUCZOWE)
**Problem:** vault_search uzywal app.vault.getMarkdownFiles() ktore NIE widzi ukrytych folderow (.pkm-assistant). Agent szukal "koszulka" i dostawal 0 wynikow mimo ze info bylo w 8+ sesjach.
**Rozwiazanie:** Osobny tool `memory_search` dedykowany pamieci agenta:
- Przeszukuje sesje, brain.md i podsumowania (weekly/monthly/yearly)
- Uzywa adapter.read() (omija indeks Obsidiana)
- Parametr scope: all/sessions/brain/summaries
- Czysty podzial: vault_search = notatki usera, memory_search = pamiec agenta
**Wynik:** Agent zapytany "jaki mam kolor koszulki?" uzywa memory_search i ZNAJDUJE odpowiedz!

### Ribbon icon Obsek
- Usuniete 3 ikony Smart Connections (connections, lookup, dice)
- Dodana 1 ikona Obsek (buzka) - otwiera chat
- Nowa metoda `open_chat_view()` w main.js

### RAG fix
- `ensureRAGInitialized()` teraz uzywa AgentMemory zamiast SessionManager jako zrodlo sesji

**Pliki zmienione:**
- `src/views/chat_view.js` - session dropdown, load, save, RAG init
- `src/mcp/MemorySearchTool.js` - NOWY PLIK
- `src/mcp/VaultSearchTool.js` - dodano hint w opisie o memory_search
- `src/mcp/MCPClient.js` - plugin jako 3ci arg execute(), memory_search w ACTION_TYPE_MAP
- `src/agents/Agent.js` - system prompt z instrukcjami memory_search
- `src/memory/AgentMemory.js` - loadSession() elastyczniejszy (string/object)
- `src/main.js` - import+rejestracja memory_search, ribbon icon Obsek, open_chat_view()
- `src/utils/add_icons.js` - dodana ikona obsek-icon

**Potwierdzone dzialanie:**
- Session dropdown widzi i laduje sesje z AgentMemory
- memory_search znajduje "pomaranczowa koszulka" w sesjach
- Ribbon icon Obsek otwiera chat

**Nastepne kroki:**
1. Faza 3: Memory Extraction (~450 linii) - minion automatycznie wyciaga fakty do brain.md po sesji
2. Duplikaty sesji - sa pary identycznych plikow (np. 14-45-03 i 14-45-07), do zbadania

---

## 2026-02-20 (sesja 3+4) - Implementacja Faz 0+1+2 systemu pamieci + naprawa src/main.js

**Sesja z:** Claude Code (Sonnet 4.6)

**Co zrobiono:**

### KRYTYCZNA NAPRAWA: src/main.js
Odkryto ze `src/main.js` to byl oryginalny plik Smart Connections bez zadnych customowych komponentow Obsek.
Kazdy `npm run build` tworzyl 882KB (sam SC) zamiast 6.5MB (pelny Obsek).
Naprawiono przez dodanie wszystkich importow i inicjalizacji.

**Dodane importy do src/main.js:**
- `ObsekSettingsTab` (zamiast `ScEarlySettingsTab`)
- `ChatView` (dodany do `item_views`)
- `AgentManager`, `VaultZones`, `PermissionSystem`, `ApprovalManager`
- `ToolRegistry`, `MCPClient`, `ToolLoader`
- `createVaultReadTool`, `createVaultListTool`, `createVaultWriteTool`, `createVaultDeleteTool`, `createVaultSearchTool`
- `registerAgentSidebar` (wywolywany w `onload()`)

**`initialize()` teraz tworzy caly system:**
1. AgentManager (+ `initialize()` tworzy foldery pamieci dla kazdego agenta)
2. VaultZones + PermissionSystem + ApprovalManager
3. ToolRegistry + MCPClient
4. Rejestruje 5 narzedzi vault
5. ToolLoader (wczytuje custom tools)

### Implementacja Faz 0+1+2

**Faza 0 - Stream Helper** (`src/memory/streamHelper.js` - NOWY PLIK):
- Owija `chatModel.stream()` callbacki w Promise
- Potrzebny do Faz 3-5 (AI-driven memory extraction)

**Faza 1 - Brain Boot-up:**
- `AgentMemory.getBrain()` - nowy szablon brain.md z sekcjami: `## User`, `## Preferencje`, `## Ustalenia`, `## Biezace`
- `AgentMemory.getMemoryContext()` - laczy brain + active_context + ostatnie podsumowanie tygodniowe
- `chat_view.js` - uzywa `getActiveSystemPromptWithMemory()` zamiast `getActiveSystemPrompt()`

**Faza 2 - Session Lifecycle:**
- `handleNewSession()` zapisuje sesje przed czyszczeniem
- `handleAgentChange()` async, zapisuje przed zmiana agenta
- `onClose()` zapisuje sesje + removeEventListener beforeunload
- Session timeout detection (30 min domyslnie) w `send_message()`
- Auto-save uzywa prawdziwej nazwy agenta (bylo hardcoded 'default')

### Naprawa narzedzi vault dla ukrytych sciezek

**Problem:** Obsidian nie indeksuje folderow zaczynajacych sie od `.`, wiec `getAbstractFileByPath('.pkm-assistant')` zwraca null.
- Agentowi nie znajdowal swojego brain.md przez vault_read
- Nie mogl zapisac zmian przez vault_write

**Naprawione:**
- `VaultReadTool.js` - fallback do `adapter.read()` gdy plik nie w indeksie
- `VaultListTool.js` - fallback do `adapter.list()` gdy folder nie w indeksie
- `VaultWriteTool.js` - dla sciezek zaczynajacych sie od `.` uzywa `adapter.write()` bezposrednio

### Sciezka brain.md w systemowym prompcie

Dodano instrukcje do `Agent.getSystemPrompt()`:
- Agent dostaje informacje ZE sciezka do jego brain.md jest `.pkm-assistant/agents/{name}/memory/brain.md`
- Agent wie ze moze uzywac `vault_write` z `mode="replace"` do aktualizacji pamieci

**Pliki zmienione:**
- `src/main.js` - KRYTYCZNA NAPRAWA, dodane wszystkie Obsek komponenty
- `src/memory/streamHelper.js` - NOWY PLIK (Faza 0)
- `src/memory/AgentMemory.js` - nowy szablon brain.md, getMemoryContext z active_context (Fazy 1.1, 1.3)
- `src/views/chat_view.js` - session lifecycle (Fazy 1.2, 2.1-2.5)
- `src/mcp/VaultReadTool.js` - wsparcie dla ukrytych sciezek
- `src/mcp/VaultListTool.js` - wsparcie dla ukrytych sciezek
- `src/mcp/VaultWriteTool.js` - wsparcie dla ukrytych sciezek
- `src/agents/Agent.js` - sciezka brain.md w system prompcie
- `manifest.json` - id zmienione z "smart-connections" na "obsek"
- `.env` - DESTINATION_VAULTS zmienione na absolutna sciezke do prawdziwego vaultu
- `esbuild.js` - wsparcie dla absolutnych sciezek, folder "obsek" zamiast "smart-connections"

**Wynik buildu:** 6.5MB (bylo 882KB) - SUKCES

**Potwierdzone dzialanie:**
- brain.md tworzony automatycznie przy starcie pluginu
- Tresc brain.md widoczna w system prompcie (AI pamieata informacje z brain.md)
- Jaskier moze aktualizowac brain.md przez vault_write (ukryte sciezki dzialaja)

**Znane problemy / do debugowania:**
- Zapis sesji do `sessions/` prawdopodobnie nie dziala - brak potwierdzenia, potrzeba logi z konsoli
- Faza 3 (automatyczna ekstrakcja informacji do brain.md przez minion) - jeszcze nie zaimplementowana

**Nastepne kroki:**
1. Debug zapisu sesji (Ctrl+Shift+I w Obsidian, sprawdzic bledy przy klikaniu "Save")
2. Potwierdzic ze brain.md jest poprawnie aktualizowany przez Jaskiera po sesji
3. Implementacja Fazy 3: Memory Extraction (minion wyciaga fakty po sesji)

## 2026-02-20 - Dzien 1: Commit bazowy + naprawa builda

**Sesja z:** Claude Code (Sonnet 4.6)

**Co zrobiono:**
- Zrobiono porzadek z git: commitujemy caly kod ktory istnial ale nie byl w repo
- Wykluczone z repo: external-deps/ (59MB bibl.), jdhole-skills/, jdhole-mcp-servers/ (wlasne git repo)
- Zaktualizowany .gitignore
- PROBLEM ZNALEZIONY: projekt zostal przeniesiony z "Moj dysk" na Desktop, symlinki w node_modules byly zepsute
- NAPRAWIONE: package.json - zmiana sciezek z `file:../` na `file:./external-deps/`
- Usuniete nieistniejace zaleznosci: smart-chunks, smart-instruct-model
- npm install przebudowal symlinki, build dziala
- npm run build: dist/main.js 882kb w 158ms - SUKCES

**Pliki zmienione:**
- `.gitignore` - external-deps/, jdhole-*, dodane do ignorowanych
- `package.json` - naprawione sciezki zaleznosci
- `package-lock.json` - przebudowany po npm install
- 58 nowych plikow src/ i dokumentacja (commit 2)

**Co zostalo POTWIERDZONE:**
- Plugin buduje sie bez bledow (npm run build)
- Plugin kopiuje sie automatycznie do vaultu Obsidiana

**Co NIE ZOSTALO zweryfikowane (nastepny krok):**
- Czy plugin laduje sie w Obsidianie bez bledow
- Czy chat z AI dziala
- Czy system agentow dziala
- Czy MCP, pamiec, uprawnienia dzialaja

**WYNIK TESTOW (w tej samej sesji):**

Plugin odpalony w Obsidianie - doslownie po buildzie. Wynik:
- Plugin laduje sie: TAK
- Indeksuje vault: TAK
- Chat z Jaskierem: TAK (agent gada po polsku, widzi vault)
- Token counter: TAK (6627/100000 widoczne w UI)
- MCP vault_list: TAK (listuje foldery)
- MCP vault_read: TAK (czyta notatki)
- MCP vault_write: TAK (po zatwierdzeniu uprawnien)
- System uprawnien: TAK! (vault_write zablokowany domyslnie, X czerwony, user musi zatwierdzic)
- Notatka stworzona w vaultcie: TAK

Model uzywany: Claude Sonnet 4 (via API)

**Nastepne kroki:**
- Przetestowac pozostalych agentow (Iris, Dexter, Ezra, Silas, Lexie)
- Sprawdzic vault_search i vault_delete
- Przetestowac system pamieci (czy Jaskier pamieata pomiedzy sesjami)
- Sprawdzic Agent Sidebar i Agent Creator Modal
- Zdecydowac o pierwszym celu rozwoju

---

## 2026-02-20 - Design systemu pamieci agentow

**Sesja z:** Claude Code (Opus 4.6)

**Co zrobiono:**
- Pelna analiza istniejacego kodu pamieci (10 plikow w src/memory/)
- Zidentyfikowane co dziala, co jest martwe, co jest zepsute
- Zaprojektowany system pamieci od podstaw (MEMORY_DESIGN.md)
- Stworzony plan implementacji w 8 fazach (MEMORY_IMPLEMENTATION_PLAN.md)
- Plan przeszedl 2 rundy walidacji (analiza kodu + analiza kosztow tokenow)
- Poprawiony plan do wersji 2.0 z naniesionymi uwagami

**Kluczowe decyzje architektoniczne:**
- Pamiec jak ludzki mozg: Identity Core + Brain + Active Context na start (~800 tok)
- RAG na zadanie (stare wspomnienia), archive nigdy nie ladowany
- Konsolidacja OBJETOSCIOWA (co 5 sesji) nie CZASOWA (nie co tydzien)
- Trigger konca sesji: guzik "Nowa rozmowa", powrot po 30min, zamkniecie Obsidiana
- Kontrola usera: automatycznie (default), glosowo ("zapamietaj/zapomnij"), recznie (edycja .md)
- "Minion" - tanszy model do background operacji pamieci (extraction, summarization, konsolidacja)
- Furtki na przyszlosc: poziomy autonomii pamieci, cross-agent memory access

**Znalezione problemy w istniejacym kodzie:**
- Summarizer nigdy nie tworzony, crashowalby (zla metoda API - .invoke() zamiast .stream())
- getActiveSystemPromptWithMemory() istnieje ale nigdy nie wywolywany
- handleNewSession() nie zapisuje sesji przed czyszczeniem
- onClose() nie zapisuje sesji
- handleAgentChange() nie zapisuje sesji
- Auto-save uzywa hardcoded agent name 'default'
- Sekcje brain.md w kodzie nie pasuja do designu

**Pliki stworzone:**
- `MEMORY_DESIGN.md` - pelny design systemu pamieci (10 sekcji)
- `MEMORY_IMPLEMENTATION_PLAN.md` - plan implementacji w 8 fazach (~1145 linii kodu)

**Nastepne kroki:**
- Implementacja Faz 0+1+2 (Stream Helper + Brain Boot-up + Session Lifecycle) ~135 linii
- Potem Faza 3 (Memory Extraction) ~450 linii - serce systemu
- Potem Fazy 4-7 w dowolnej kolejnosci
