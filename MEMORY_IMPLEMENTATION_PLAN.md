# System Pamięci - Plan Implementacji

> Wersja: 2.0 (po walidacji) | Data: 2026-02-20
> Design: MEMORY_DESIGN.md
> Każda faza jest samodzielna - po każdej plugin działa lepiej niż przed.
> Walidowane: spójność z kodem, koszty tokenów, zależności między fazami.

---

## Stan obecny (co działa, co nie)

### Działa:
- RollingWindow trzyma historię rozmowy w RAM
- SessionManager zapisuje/ładuje sesje (auto-save co X minut)
- AgentMemory.initialize() tworzy foldery per agent
- AgentMemory.saveSession() działa na klik "Save"
- Token counter w UI

### Martwy kod (istnieje ale nie podłączony):
- Summarizer - nigdy nie tworzony, a nawet gdyby był to crashuje (zła metoda API)
- getActiveSystemPromptWithMemory() - istnieje, nigdy nie wywoływany
- saveActiveContext() / loadActiveContext() - nigdy nie wywoływane
- createWeeklySummary() / createMonthlySummary() - nigdy nie wywoływane
- updateBrain() - nigdy nie wywoływany

### Bugi:
- Auto-save używa hardcoded agent name 'default' zamiast aktualnego
- handleNewSession() NIE zapisuje bieżącej sesji przed wyczyszczeniem
- onClose() NIE zapisuje sesji przy zamykaniu Obsidiana
- handleAgentChange() NIE zapisuje sesji przy przełączaniu agenta

### Niespójności między kodem a designem:
- Sekcje brain.md w kodzie: "Kluczowe informacje o użytkowniku", "Ważne preferencje", "Powtarzające się tematy", "Notatki"
- Sekcje brain.md w designie: "User", "Preferencje", "Ustalenia", "Bieżące"
- Foldery w kodzie: weekly/, monthly/, yearly/
- Foldery w designie: summaries/L1/, summaries/L2/
- → Trzeba ujednolicić (design wygrywa, kod się dostosowuje)

---

## Faza 0: Stream Helper (fundament techniczny)

**Cel:** Stworzyć wspólną funkcję do wywoływania SmartChatModel w trybie non-streaming. Potrzebna w Fazach 3, 4 i 5.

**Problem:** SmartChatModel ma TYLKO `.stream()` (callback-based). Nie ma `.invoke()`, `.complete()`, `.call()`. Istniejący Summarizer próbuje tych metod i crashuje.

**Zmiana 0.1: Stwórz `streamToComplete()` utility**
- Nowy plik: `src/memory/streamHelper.js`
- Jedna funkcja: `streamToComplete(chatModel, messages)` → Promise<string>
- Wewnątrz: woła `.stream()`, zbiera chunki w callbacku, resolve na `done`
- Obsługuje error callback → reject
- Wpływ: ~40-50 linii kodu

**Dlaczego osobna faza:** Bez tego NIC z pamięci nie działa (extraction, summarization, consolidation). To musi być pierwsze.

**Zależności:** Brak.

---

## Faza 1: Brain Boot-up (agent "budzi się" z pamięcią)

**Cel:** Agent ładuje Brain + Active Context na start. Widoczna zmiana od pierwszej rozmowy.

**Zmiana 1.1: Ujednolić szablon brain.md**
- Plik: `src/memory/AgentMemory.js` → metoda `getBrain()` (~linia 252)
- Zmień sekcje na zgodne z designem:
  - `## User` (było: "Kluczowe informacje o użytkowniku")
  - `## Preferencje` (było: "Ważne preferencje")
  - `## Ustalenia` (nowa sekcja)
  - `## Bieżące` (było: "Powtarzające się tematy" + "Notatki")
- Uwaga: jeśli user JUŻ ma brain.md ze starymi sekcjami → NIE nadpisuj, tylko dopisz brakujące
- Wpływ: ~15 linii kodu

**Zmiana 1.2: Użyj async wersji system promptu**
- Plik: `src/views/chat_view.js` → `send_message()` (~linia 441-445)
- Zmień: `agentManager.getActiveSystemPrompt()` → `await agentManager.getActiveSystemPromptWithMemory()`
- Metoda `getActiveSystemPromptWithMemory()` już istnieje w AgentManager.js (linia 210)
- Wywołuje `AgentMemory.getMemoryContext()` który czyta brain.md
- Wpływ: ~5 linii kodu

**Zmiana 1.3: Rozszerz getMemoryContext() o Active Context**
- Plik: `src/memory/AgentMemory.js` → metoda `getMemoryContext()` (~linia 287)
- Obecna wersja czyta: brain.md + latest weekly summary
- Dodaj: czytaj też active_context.md (ale TYLKO jeśli istnieje i ma treść)
- Graceful: jeśli plik nie istnieje lub pusty → pomiń (nie crashuj)
- Wpływ: ~15 linii kodu

**Test:**
- Ręcznie wpisz coś do brain.md (np. "User ma na imię Kuba")
- Build → otwórz chat → agent powinien wiedzieć jak masz na imię
- UWAGA: Active Context będzie pusty dopóki Faza 3 nie zacznie go zapisywać. To OK - graceful degradation.

**Zależności:** Brak. Można zacząć od razu (równolegle z Fazą 0).

**Szacunek:** ~35 linii kodu

---

## Faza 2: Session Lifecycle (czyste granice sesji)

**Cel:** Sesja ma jasny początek i koniec. Żadna rozmowa nie ginie.

**Zmiana 2.1: Zapisz sesję PRZED wyczyszczeniem (Nowa rozmowa)**
- Plik: `src/views/chat_view.js` → `handleNewSession()` (~linia 1017)
- Dodaj na początek: `if (this.rollingWindow.messages.length > 0) await this.handleSaveSession()`
- WAŻNE: save PRZED clear, bo po clear messages są puste
- Wpływ: ~5 linii kodu

**Zmiana 2.2: Zapisz sesję przy przełączaniu agenta**
- Plik: `src/views/chat_view.js` → `handleAgentChange()` (~linia 1126)
- Dodaj: `if (this.rollingWindow.messages.length > 0) await this.handleSaveSession()`
- Wpływ: ~5 linii kodu

**Zmiana 2.3: Best-effort zapis przy zamknięciu Obsidiana**
- Plik: `src/views/chat_view.js` → `onClose()` (~linia 1001)
- Problem: Obsidian `onClose()` jest SYNCHRONICZNY. `vault.adapter.write()` jest ASYNC. Nie ma sync write API.
- Rozwiązanie:
  a) Odpal `handleSaveSession()` fire-and-forget (bez await) - **best-effort**, może się nie zapisać
  b) DODATKOWO: zarejestruj `window.addEventListener('beforeunload', ...)` w `onOpen()` - daje dodatkową szansę
  c) Auto-save (już istniejący) jest GŁÓWNĄ siatką bezpieczeństwa - jeśli onClose nie zdąży, auto-save miał ostatnią kopię
- To NIE jest idealnie niezawodne. Zaakceptować jako known limitation.
- Wpływ: ~15 linii kodu

**Zmiana 2.4: Detekcja powrotu po nieaktywności**
- Plik: `src/views/chat_view.js` → `send_message()` (~linia 403)
- Dodaj pole: `this.lastMessageTimestamp = Date.now()` (aktualizuj przy każdej wiadomości)
- Na początku send_message: sprawdź czy `Date.now() - this.lastMessageTimestamp > timeout`
- Jeśli tak → zamknij starą sesję (save), wyczyść, zacznij nową
- Timeout: `this.env.settings.sessionTimeoutMinutes || 30` (konfigurowalny)
- Wpływ: ~20 linii kodu + nowe ustawienie w settings

**Zmiana 2.5: Auto-save z prawidłową nazwą agenta**
- Plik: `src/views/chat_view.js` → `initSessionManager()` (~linia 41)
- Zmień hardcoded `agent: 'default'` na: `this.plugin?.agentManager?.getActiveAgent()?.name || 'default'`
- Uwaga: agentManager może nie być gotowy przy initSessionManager - użyj fallback
- Wpływ: ~3 linie kodu

**Test:**
- Klik "Nowa rozmowa" → stara sesja zapisana automatycznie
- Przełącz agenta → stara sesja zapisana
- Wróć po 35 min → system wykrywa przerwę, startuje nową sesję
- Zamknij Obsidian, otwórz → sesja powinna być w auto-save (jeśli był aktywny)

**Zależności:** Brak. Równolegle z Fazą 0 i 1.

**Szacunek:** ~50 linii kodu

---

## Faza 3: Memory Extraction (agent się uczy automatycznie)

**Cel:** Po każdej sesji agent wyciąga fakty i aktualizuje Brain.

**KOSZTY TOKENÓW:**
- Typowa sesja (20 msg): ~3000-5000 tok na extraction (jedno wywołanie API)
- Długa sesja (50 msg): ~10,000-16,000 tok na extraction
- → OPTYMALIZACJA: użyj tańszego modelu (Haiku) do extraction. Koszt spada ~10x.

**Zmiana 3.1: Stwórz MemoryExtractor (nowy moduł)**
- Nowy plik: `src/memory/MemoryExtractor.js`
- Klasa z jedną główną metodą: `extract(messages, currentBrain, chatModel)`
- Buduje Memory Extraction Prompt (patrz MEMORY_DESIGN.md sekcja 5)
- Używa `streamToComplete()` z Fazy 0 do wywołania modelu
- Parsuje odpowiedź: wyciąga fakty [CORE], [PREFERENCE], [DECISION], [PROJECT], [UPDATE], [DELETE]
- Zwraca: `{ brainUpdates: [...], activeContextSummary: string }`
- Parser musi być odporny na lekko inny format odpowiedzi (AI nie jest deterministyczne)
- Wpływ: ~150-180 linii kodu (nowy plik)

**Zmiana 3.2: Stwórz memoryWrite() - centralna funkcja zapisu**
- Dodaj do `src/memory/AgentMemory.js`
- Sygnatura: `memoryWrite(section, content, { targetAgent, sourceAgent, operation })`
- `targetAgent` = domyślnie self (furtka na cross-agent: sekcja 10 w designie)
- `operation` = 'append' | 'update' | 'delete' | 'replace'
- Na razie: BEZ sprawdzania poziomu autonomii, ale z komentarzem `// TODO: autonomy check (MEMORY_DESIGN.md sekcja 9)`
- Loguje każdą zmianę: prosty append do `memory/audit.log` (data, co, kto)
- Wpływ: ~60-80 linii kodu

**Zmiana 3.3: Brain updater - parsuj i aplikuj zmiany**
- Dodaj do `src/memory/AgentMemory.js` lub osobny helper
- Metoda: `applyBrainUpdates(updates)` wywoływana przez memoryWrite
- Parsuj brain.md jako sekcje (## header → content)
- Mapowanie kategorii → sekcje:
  - [CORE] → ## User
  - [PREFERENCE] → ## Preferencje
  - [DECISION] → ## Ustalenia
  - [PROJECT] → ## Bieżące
  - [UPDATE] → znajdź fakt do zastąpienia w odpowiedniej sekcji
  - [DELETE] → usuń linię z odpowiedniej sekcji
- Po zmianach: sprawdź rozmiar. Jeśli > ~500 tokenów → przenieś najstarsze fakty z ## User i ## Bieżące do `brain_archive.md`
- brain_archive.md: prosty append, dostępny przez RAG
- Wpływ: ~100-120 linii kodu

**Zmiana 3.4: Ustawienie Miniona (model do operacji pamięci)**
- Plik: settings (dodaj nowe ustawienie `minionModel`)
- Ręczne pole tekstowe: user wpisuje ID modelu (np. `claude-haiku-4-5-20251001`)
- Default: pusty = używa głównego modelu (zero konfiguracji na start)
- MemoryExtractor, Summarizer, konsolidacja L1/L2 - wszystkie używają Miniona jeśli ustawiony
- Dropdown z listą modeli = przyszłość, na razie ręczne wpisywanie
- Wpływ: ~20-30 linii kodu

**Zmiana 3.5: Metoda consolidateSession()**
- Plik: `src/views/chat_view.js`
- Nowa metoda orchestrująca koniec sesji:
  1. Pobierz messages z rollingWindow (PRZED clearowaniem!)
  2. Pobierz aktualny brain z AgentMemory.getBrain()
  3. Wywołaj MemoryExtractor.extract(messages, brain, model)
  4. Aplikuj updates przez memoryWrite()
  5. Zapisz activeContextSummary do active_context.md
  6. Zapisz sesję do AgentMemory.saveSession()
  7. Sprawdź trigger konsolidacji L1/L2 (Faza 5 - na razie placeholder)
- Graceful degradation: jeśli get_chat_model() = null → pomiń extraction, zapisz tylko surową sesję
- Wywołuj z: handleNewSession(), handleAgentChange(), detekcja nieaktywności
- NIE wywołuj z onClose() - bo async extraction nie zdąży. onClose robi TYLKO prosty save.
- Wpływ: ~50-60 linii kodu

**Test:**
- Porozmawiaj z agentem, powiedz mu swoje imię
- Klik "Nowa rozmowa" (trigger consolidation)
- Sprawdź brain.md → powinno być Twoje imię
- Sprawdź active_context.md → streszczenie rozmowy
- Zacznij nową rozmowę → agent Cię pamięta bez pytania

**Zależności:** Faza 0 (streamHelper), Faza 1 (brain loaded), Faza 2 (session lifecycle)

**Szacunek:** ~400-470 linii kodu (GŁÓWNA FAZA)

---

## Faza 4: Summarizer w rozmowie (kompresja zamiast cięcia)

**Cel:** Kiedy tokeny się kończą, agent kompresuje rozmowę zamiast brutalnie obcinać.

**KOSZTY TOKENÓW - UWAGA:**
- Summarizer przy 70% progu wysyła ~70,000 tokenów w jednym strzale.
- To jest NAJDROŻSZA operacja w całym systemie pamięci.
- Rozważ: obniżyć próg do ~30,000 tokenów (stała wartość zamiast %) → przewidywalny koszt.
- Użyj taniego modelu (jak w Fazie 3.4).

**Zmiana 4.1: Napraw Summarizer.js**
- Plik: `src/memory/Summarizer.js`
- Zmień: wywołania .invoke()/.complete()/.call() → `streamToComplete()` z Fazy 0
- Wpływ: ~15 linii kodu

**Zmiana 4.2: Podłącz Summarizer do RollingWindow**
- Plik: `src/views/chat_view.js` → constructor + handleNewSession + handleLoadSession
- Przy tworzeniu RollingWindow: `new RollingWindow({ maxTokens, summarizer })`
- Problem: chatModel może nie być gotowy przy construction time
- Rozwiązanie: lazy init - stwórz Summarizer PRZED pierwszym użyciem (nie w constructorze), albo ustaw summarizer po inicjalizacji modelu
- Wpływ: ~15-20 linii kodu

**Zmiana 4.3: Napraw kolizję system promptów w performSummarization()**
- Plik: `src/memory/RollingWindow.js` → `performSummarization()` (~linia 45)
- PROBLEM: Obecny kod robi `setSystemPrompt("summary + stary prompt")`. Jeśli Brain/ActiveCtx są w system prompt, to summary się dokłada Z KAŻDĄ summaryzacją → nieskończony wzrost!
- FIX: Rozdziel system prompt na warstwy:
  - `this.baseSystemPrompt` = Identity + Brain + ActiveCtx (stały)
  - `this.conversationSummary` = streszczenie starej części rozmowy (rośnie)
  - `getMessagesForAPI()` łączy: base + summary + messages
- Wpływ: ~30-40 linii kodu (refactor RollingWindow)

**Zmiana 4.4: Zmień próg z procentowego na stały**
- Zamiast `triggerThreshold: 0.7` (70% maxTokens = 70,000 tok)
- Użyj stałej wartości: `summarizeAtTokens: 30000` (konfigurowalny w settings)
- Bardziej przewidywalny koszt, łatwiejszy do zrozumienia dla usera
- Wpływ: ~10 linii kodu

**Test:**
- Długa rozmowa → przekrocz próg tokenów
- Zamiast "zapomnieć" początek → agent ma streszczenie
- Token counter spada ale kontekst zostaje
- SPRAWDŹ: brain/activeContext NIE zostały nadpisane przez summary

**Zależności:** Faza 0 (streamHelper), Faza 3.4 (tani model)

**Szacunek:** ~80-100 linii kodu

---

## Faza 5: Konsolidacja objętościowa (L1/L2)

**Cel:** Stare sesje automatycznie kompresują się w podsumowania.

**KOSZTY TOKENÓW:**
- L1 (5 sesji): ~15,500 tok w jednym strzale. Raz na 5 sesji.
- L2 (5 L1): ~2,000 tok. Raz na 25 sesji. Tanie.
- → Użyj taniego modelu (Faza 3.4).
- → Rozważ: zapytaj usera przed L1 ("Mam 5 sesji do podsumowania. OK?")

**Zmiana 5.0: Migracja folderów**
- Plik: `src/memory/AgentMemory.js`
- Zmień `this.paths`: weekly/ → summaries/L1/, monthly/ → summaries/L2/
- Zmień `initialize()`: twórz summaries/L1/ i summaries/L2/ zamiast weekly/monthly/yearly/
- Dodaj migrację: jeśli istnieje stary folder weekly/ → przenieś pliki do summaries/L1/
- Zaktualizuj `getMemoryContext()` (czyta z paths.weekly → zmień na paths.l1)
- Wpływ: ~40 linii kodu

**Zmiana 5.1: Tracking niezesumowanych sesji**
- Plik: `src/memory/AgentMemory.js`
- Nowa metoda: `getUnconsolidatedSessions()` → zwraca sesje nie ujęte w żadnym L1
- Implementacja: L1 pliki mają w frontmatter `sessions: [lista_nazw]`. Porównaj z sessions/.
- WAŻNE: trzeba też zmienić format zapisu L1 żeby ZAWIERAŁ listę sesji w frontmatter (istniejący kod tego nie robi)
- Wpływ: ~40-50 linii kodu

**Zmiana 5.2: Nowa metoda createL1Summary() (zastępuje createWeeklySummary)**
- Plik: `src/memory/AgentMemory.js`
- NIE "rename" starej metody - stara używa time-based filtering (7 dni). Trzeba przepisać logikę na count-based (N sesji).
- Przyjmuje: listę sesji do streszczenia
- Czyta treść tych sesji, buduje prompt, używa streamToComplete()
- Zapisuje do summaries/L1/ z frontmatter zawierającym `sessions: [...]`
- Wpływ: ~60-70 linii kodu (przepisanie, nie refactor)

**Zmiana 5.3: Nowa metoda createL2Summary()**
- Analogicznie do 5.2 ale streszcza 5 L1 (nie surowe sesje)
- Czyta L1 pliki, buduje prompt, zapisuje do summaries/L2/
- Tanie (~2000 tok) bo L1 już są skompresowane
- Wpływ: ~50-60 linii kodu

**Zmiana 5.4: Trigger w consolidateSession()**
- Plik: `src/views/chat_view.js` → `consolidateSession()` (placeholder z Fazy 3.5)
- Po zapisie sesji: sprawdź `getUnconsolidatedSessions().length >= 5`
- Jeśli tak → stwórz L1, potem sprawdź czy 5 L1 → L2
- Wpływ: ~15 linii kodu

**Test:**
- Przeprowadź 5+ sesji z agentem
- Po 5-tej: pojawi się plik w summaries/L1/ z listą sesji w frontmatter
- Po 25 sesjach: pojawi się plik w summaries/L2/

**Zależności:** Faza 0 (streamHelper), Faza 3 (consolidateSession)

**Szacunek:** ~200-240 linii kodu

---

## Faza 6: Komendy głosowe (user kontroluje pamięć z czatu)

**Cel:** User mówi "zapamiętaj/zapomnij" a agent reaguje natychmiast.

**Zmiana 6.1: Instrukcje pamięciowe w personie agenta**
- Plik: definicje agentów (src/agents/ lub pliki YAML)
- Dodaj do system promptu sekcję o rozpoznawaniu komend pamięciowych
- Lista fraz: "zapamiętaj", "zapomnij", "co o mnie wiesz", "pokaż pamięć", "wyczyść pamięć o..."
- Agent wywołuje MCP tool memory_update w odpowiedzi
- Wpływ: ~20 linii tekstu w system prompt

**Zmiana 6.2: MCP tool `memory_update`**
- Nowy plik w src/mcp/
- Operacje: `read_brain`, `update_brain`, `delete_from_brain`
- Agent wywołuje go jak vault_read/vault_write
- Przechodzi przez memoryWrite() (furtka na autonomię - sekcja 9 designu)
- Wpływ: ~80-100 linii kodu (nowy MCP tool)

**Zmiana 6.3: MCP tool `memory_status`**
- Info o pamięci: ile sesji, ile L1/L2, rozmiar brain w tokenach, audit log
- Agent może odpowiedzieć na "pokaż swoją pamięć"
- Wpływ: ~40-50 linii kodu

**Test:**
- Powiedz: "Zapamiętaj że lubię kawę"
- Sprawdź brain.md → jest
- Powiedz: "Co o mnie wiesz?" → agent wymienia fakty z brain
- Powiedz: "Zapomnij o kawie" → znikło z brain.md
- Sprawdź audit.log → widać wpisy

**Zależności:** Faza 3 (memoryWrite musi istnieć), Faza 1 (brain musi być ładowany)

**Szacunek:** ~170 linii kodu

---

## Faza 7: RAG Polish (pamięć długoterminowa na żądanie)

**Cel:** Agent automatycznie przywołuje stare rozmowy kiedy temat pasuje.

**Zmiana 7.1: Respektuj ustawienie enableRAG**
- Plik: `src/views/chat_view.js` → `ensureRAGInitialized()`
- Dodaj: sprawdź `this.env.settings.enableRAG` przed inicjalizacją
- Wpływ: ~3 linie kodu

**Zmiana 7.2: RAG per-agent**
- Plik: `src/memory/RAGRetriever.js`
- Obecnie szuka w globalnym SessionManager → zmień na AgentMemory danego agenta
- Indeksuj: sessions/ + summaries/L1/ + summaries/L2/
- Furtka: parametr `includeOtherAgents: false` (cross-agent recall na przyszłość)
- Wpływ: ~30-40 linii kodu

**Zmiana 7.3: Lepsze formatowanie RAG context**
- Obecny format to surowy tekst
- Zmień na format z datami: `[2026-02-15] Rozmowa o wakacjach: ...`
- Agent wie KIEDY coś się działo, nie tylko CO
- Wpływ: ~15 linii kodu

**Test:**
- Porozmawiaj o wakacjach w sesji 1
- W sesji 10 powiedz "a pamiętasz te wakacje?"
- Agent powinien przywołać kontekst z sesji 1

**Zależności:** Faza 5 (L1/L2 do indeksowania), Faza 1 (brain boot-up)

**Szacunek:** ~60 linii kodu

---

## Kolejność i priorytety (poprawiona po walidacji)

```
Faza 0: Stream Helper           ██░░░░░░░░  ~50 linii
  │                              FUNDAMENT. Start TUTAJ.
  │
  ├─ Faza 1: Brain Boot-up      ██░░░░░░░░  ~35 linii
  │    (równolegle z Fazą 0)     Agent budzi się z pamięcią.
  │
  ├─ Faza 2: Session Lifecycle   ███░░░░░░░  ~50 linii
  │    (równolegle z Fazą 0)     Żadna rozmowa nie ginie.
  │
  └─ Faza 3: Memory Extraction  █████████░  ~450 linii
       │  (po Fazach 0+1+2)      SERCE SYSTEMU.
       │
       ├─ Faza 4: Summarizer    ████░░░░░░  ~100 linii
       │    Kompresja rozmowy.
       │
       ├─ Faza 5: Konsolidacja  ██████░░░░  ~230 linii
       │    L1/L2 objętościowe.
       │    │
       │    └─ Faza 7: RAG      ███░░░░░░░  ~60 linii
       │         Per-agent + L1/L2.
       │
       └─ Faza 6: Voice Cmds   █████░░░░░  ~170 linii
            "Zapamiętaj/zapomnij".
```

**Łącznie: ~1145 linii kodu** (nowy + zmodyfikowany)

**Sugerowana kolejność pracy:**
1. Fazy 0+1+2 razem (mało kodu, szybki efekt, bez zależności) → ~135 linii
2. Faza 3 (główna praca) → ~450 linii
3. Fazy 4-7 w dowolnej kolejności po Fazie 3

---

## Koszty tokenów - podsumowanie dla usera

| Scenariusz | Tokeny/sesja | Komentarz |
|---|---|---|
| Bez pamięci (obecny stan) | ~3,000 | Bazowy koszt |
| Z pamięcią (Fazy 0-3) | ~7,000 | +2x, akceptowalne |
| + RAG (lokalne embeddingi) | ~7,500 | Embeddingi gratis |
| Długa sesja (50 msg) | ~18,000 | Extraction droższa |
| Trigger Summarizera (Faza 4) | +30,000 | Jednorazowo, konfigurowalny próg |
| Konsolidacja L1 (Faza 5) | +15,500 | Raz na 5 sesji |

**Główna optymalizacja:** Ustawienie Miniona (Faza 3.4) - np. Haiku zamiast Sonnet - obcina koszty pamięci o ~80%.

---

## Furtki na przyszłość (NIE implementować teraz)

Architektura musi POZWALAĆ na te features bez przebudowy:

### F1: Poziomy autonomii pamięci (sekcja 9 w MEMORY_DESIGN.md)
- **Furtka:** Każdy zapis do pamięci przechodzi przez `memoryWrite()` (Faza 3.2)
- **Kiedy dodać:** Po Fazie 6
- **Zmiana:** Dodaj `switch(autonomyLevel)` w `memoryWrite()`

### F2: Cross-agent memory (sekcja 10 w MEMORY_DESIGN.md)
- **Furtka:** `memoryWrite()` przyjmuje `targetAgent` (Faza 3.2), RAG ma `includeOtherAgents` (Faza 7.2)
- **Kiedy dodać:** Kiedy wielu agentów działa
- **Zmiana:** Permission check w `memoryWrite()` + MCP tool `cross_agent_memory`

### F3: Konsolidacja L3 (roczna)
- **Furtka:** System L1/L2 jest generyczny (Faza 5)
- **Kiedy dodać:** Po roku działania pluginu
- **Zmiana:** Dodaj próg L3 + nowy folder

### F4: Memory UI w sidebar
- **Furtka:** Brain i sesje to pliki .md - UI to widok na nie
- **Kiedy dodać:** Kiedy Agent Sidebar działa
- **Zmiana:** Komponent wyświetlający brain.md + stats

### F5: Potwierdzenie przed drogimi operacjami
- **Furtka:** consolidateSession() i createL1Summary() są osobnymi metodami
- **Kiedy dodać:** Kiedy koszty tokenów stają się istotne
- **Zmiana:** Modal "Chcę streszczić 5 sesji (~15k tokenów). OK?" przed L1

---

## Known limitations (akceptowane)

1. **onClose() nie jest niezawodny** - async zapis przy zamknięciu Obsidiana to best-effort. Auto-save jest główną siatką bezpieczeństwa.
2. **Memory Extraction nie jest deterministyczna** - AI może różnie parsować te same rozmowy. Parser musi być odporny na warianty formatu.
3. **Brain ma limit** - ~500 tokenów. Po przekroczeniu fakty archiwizowane. User nie zobaczy ich w brain.md ale RAG je znajdzie.
4. **Pierwszy start jest pusty** - dopóki user nie porozmawia i nie kliknie "Nowa rozmowa", brain jest pusty. To OK - system uczy się z czasem.