# PKM Assistant - Plan Implementacji 2.0 (MVP Refinement)

> **Status:** MVP gotowe ✅ - Czas na dopieszczanie i stabilizację
> **Data:** 2026-01-21 (aktualizacja: hierarchia agentów & miniony)
> **Strategia:** Podział na obszary funkcjonalne, systematyczne ulepszanie każdego z nich

---

## 📊 Przegląd Obszarów

| Obszar | Priorytet | Gotowość | Główne problemy |
|--------|-----------|----------|-----------------|
| 💬 CHAT | 🟢 Gotowy | 100% | Wdrożone awatary, akcje, streaming UX, input |
| 🛠️ NARZĘDZIA ASYSTENTA | 🔴 Wysoki | 50% | Brak task.md, web search, komentarze AI |
| 🔍 RAG | 🟡 Średni | 60% | Optymalizacja, feedback w UI |
| ⚙️ USTAWIENIA | 🟡 Średni | 40% | Zaawansowane opcje, CSS customization |
| 👤 TWORZENIE ASYSTENTÓW | 🔴 Wysoki | 70% | UX modal, walidacja, **hierarchia agentów** |
| 🔐 UPRAWNIENIA | 🟢 Niski | 80% | UI, edge cases |
| 📝 PAMIĘĆ | 🟡 Średni | 65% | Konsolidacja, sync |
| 💰 TOKENY I KOSZTY | 🔴 Wysoki | 30% | Brak trackingu, limity, **model tiers** |
| 🖥️ LOKALNE MODELE | 🔴 Wysoki | 40% | Ollama, **embedded minion (0.5B)** |

---

## 💬 OBSZAR 1: CHAT

### 1.1 Podział wiadomości User vs Assistant
**Problem:** Brak wyraźnego wizualnego odróżnienia wiadomości użytkownika od odpowiedzi AI

- [x] **Różne style bąbelków** - user po prawej (ciemniejszy), assistant po lewej (jaśniejszy)
- [x] **Awatary/ikony** - emoji agenta przy jego wiadomościach
- [x] **Timestamp** - opcjonalne wyświetlanie czasu
- [x] **Copy button** - przycisk kopiowania treści wiadomości
- [x] **Edit button** - możliwość edycji wysłanej wiadomości

### 1.2 Renderowanie Markdown
- [x] **Code blocks** - syntax highlighting z language detection
- [x] **Tables** - poprawne renderowanie tabel MD
- [x] **Lists** - nested lists, checkboxy
- [x] **Links** - klikalne wewnętrzne linki `[[notatka]]`
- [ ] **Math** - LaTeX rendering (jeśli włączony w Obsidian)

### 1.3 Streaming UX
- [x] **Typing indicator** - animacja "AI myśli..."
- [x] **Partial markdown render** - renderowanie w trakcie streamingu
- [x] **Scroll to bottom** - auto-scroll przy nowych wiadomościach (smart scroll)
- [x] **Stop button** - widoczny przycisk zatrzymania generacji (Esc support)

### 1.4 Akcje na wiadomościach
- [x] **Regenerate** - przycisk ponownego generowania odpowiedzi
- [ ] **Fork conversation** - rozgałęzienie rozmowy od wybranej wiadomości (Przesunięte)
- [x] **Delete message** - usunięcie wiadomości z historii
- [x] **React** - szybkie reakcje (👍👎) jako feedback

### 1.5 Input improvements
- [x] **Auto-resize textarea** - dynamiczna wysokość inputa
- [ ] **Drag & drop files** - wrzucanie plików/notatek do kontekstu (Przesunięte)
- [ ] **@ mentions** - `@notatka` do dodania do kontekstu (Przesunięte)
- [x] **Slash commands** - `/clear`, `/save`
- [x] **History navigation** - strzałki góra/dół do poprzednich wiadomości

---

## 🛠️ OBSZAR 2: NARZĘDZIA ASYSTENTA

### 2.1 Tymczasowe Task.md
**Problem:** Asystent nie ma gdzie zapisywać postępu pracy nad złożonymi zadaniami

- [ ] **Auto-create task.md** - przy złożonych zadaniach asystent tworzy tymczasowy plik
- [ ] **Format checklisty** - `[ ]` do śledzenia postępu
- [ ] **Sidebar widget** - podgląd aktualnego task.md
- [ ] **Auto-cleanup** - usuwanie po zakończeniu lub po X dniach
- [ ] **Location:** `.pkm-assistant/tasks/YYYY-MM-DD_task-name.md`

### 2.2 Przeszukiwanie Internetu (Web Search)
- [ ] **Brave Search API** - integracja z darmowym API
- [ ] **DuckDuckGo fallback** - backup bez API key
- [ ] **Result summarization** - AI podsumowuje wyniki przed odpowiedzią
- [ ] **Source citations** - linki do źródeł w odpowiedzi
- [ ] **Permission toggle** - włączanie/wyłączanie per agent

### 2.3 Komentarze AI dla zaznaczonego tekstu
**Problem:** Użytkownik chce feedback AI na konkretny fragment notatki

- [ ] **Context menu action** - "Zapytaj AI o zaznaczony tekst"
- [ ] **Inline comment** - wstawianie komentarza jako `%%AI: ...%%`
- [ ] **Side panel comment** - komentarz w osobnym panelu
- [ ] **Quick prompts** - "Rozwiń", "Uprość", "Sprawdź błędy", "Przetłumacz"
- [ ] **Highlight source** - podświetlenie którego tekstu dotyczy komentarz

### 2.4 Czytanie aktualnej notatki
- [ ] **Active note context** - automatyczne dołączanie aktywnej notatki
- [ ] **Note metadata** - frontmatter, tagi, linki
- [ ] **Selection context** - tylko zaznaczony fragment
- [ ] **Cursor position** - kontekst wokół kursora

### 2.5 Operacje na plikach (rozszerzenie MCP)
- [ ] **vault_create_folder** - tworzenie folderów
- [ ] **vault_move** - przenoszenie/zmiana nazwy
- [ ] **vault_duplicate** - duplikowanie notatki
- [ ] **vault_template** - tworzenie z szablonu
- [ ] **vault_append** - dopisywanie do notatki (bez nadpisywania)

### 2.6 Kalendarz i przypomnienia
- [ ] **Integracja z Daily Notes** - dostęp do dziennych notatek
- [ ] **Create reminder** - tworzenie przypomnień
- [ ] **Date parsing** - "jutro", "za tydzień", "w piątek"
- [ ] **Tasks plugin integration** - odczyt/zapis tasków

---

## 🔍 OBSZAR 3: RAG (Retrieval-Augmented Generation)

### 3.1 UI Feedback
- [ ] **Retrieved notes indicator** - pokazanie które notatki zostały użyte
- [ ] **Relevance score** - poziom dopasowania każdej notatki
- [ ] **Click to open** - kliknięcie otwiera notatkę w nowej karcie
- [ ] **Exclude from context** - przycisk wykluczenia notatki

### 3.2 Optymalizacja retrieval
- [ ] **Chunk size tuning** - optymalna wielkość fragmentów
- [ ] **Hybrid search** - połączenie semantic + keyword
- [ ] **Re-ranking** - ponowne sortowanie wyników
- [ ] **MMR (Maximal Marginal Relevance)** - różnorodność wyników

### 3.3 Indeksowanie
- [ ] **Incremental indexing** - tylko zmienione pliki
- [ ] **Index status UI** - postęp indeksowania
- [ ] **Force re-index** - przycisk przebudowy indeksu
- [ ] **Exclude patterns** - wykluczanie folderów/plików

### 3.4 Context window management
- [ ] **Token budget visualization** - ile miejsca zajmuje RAG vs history
- [ ] **Priority weighting** - które źródła ważniejsze
- [ ] **Summarize long notes** - kompresja długich notatek

---

## ⚙️ OBSZAR 4: USTAWIENIA

### 4.1 Zaawansowane opcje modeli
- [ ] **Per-agent model override** - różne modele dla różnych agentów
- [ ] **Temperature slider** - z podglądem "kreatywność"
- [ ] **Max tokens** - limit odpowiedzi
- [ ] **Top-p, frequency penalty** - dla zaawansowanych
- [ ] **System prompt preview** - podgląd pełnego system prompta

### 4.2 CSS Customization
- [ ] **Theme support** - różne motywy chatu
- [ ] **Custom CSS input** - własne style CSS
- [ ] **Font size** - regulacja wielkości czcionki
- [ ] **Compact mode** - mniej paddingu, więcej treści
- [ ] **Color scheme** - kolory bąbelków, akcentów

### 4.3 Eksport/Import
- [ ] **Export settings** - zapis konfiguracji do JSON
- [ ] **Import settings** - wczytanie konfiguracji
- [ ] **Export agents** - pakowanie agentów do ZIP
- [ ] **Share agent** - link do pobrania agenta

### 4.4 Integracje
- [ ] **API Keys management** - bezpieczne przechowywanie
- [ ] **Test connection** - sprawdzanie poprawności klucza
- [ ] **Usage stats** - ile tokenów zużyte, szacunkowy koszt
- [ ] **Rate limiting** - limity zapytań per minuta/dzień

### 4.5 Debugging & Logs
- [ ] **Debug mode toggle** - włączanie logów
- [ ] **Log viewer** - przeglądarka logów w UI
- [ ] **Request/response inspector** - podgląd raw API calls
- [ ] **Performance metrics** - czas odpowiedzi, tokeny/s

---

## 👤 OBSZAR 5: TWORZENIE ASYSTENTÓW

### 5.1 Agent Creator Modal improvements
- [ ] **Step-by-step wizard** - podział na kroki
- [ ] **Archetype preview** - podgląd jak zachowuje się wybrany archetyp
- [ ] **Personality templates** - gotowe przykłady personality
- [ ] **Test conversation** - tryb testowy przed zapisaniem

### 5.2 Walidacja i feedback
- [ ] **Real-time validation** - sprawdzanie YAML w locie
- [ ] **Preview system prompt** - podgląd końcowego prompta
- [ ] **Character counter** - długość personality
- [ ] **Duplicate name check** - ostrzeżenie przy duplikacie

### 5.3 Agent management
- [ ] **Edit existing agent** - edycja przez modal
- [ ] **Duplicate agent** - kopia z nową nazwą
- [ ] **Delete with confirmation** - bezpieczne usuwanie
- [ ] **Agent statistics** - ile rozmów, tokenów, kiedy ostatnio używany

### 5.4 Agent sharing
- [ ] **Export to YAML** - pobieranie definicji
- [ ] **Import from file** - wczytywanie definicji
- [ ] **Gallery** - przeglądanie community agents (future)

### 5.5 Hierarchia agentów (Główny → Miniony) 🆕
**Cel:** Główni agenci (Jaskier, Iris, Dexter) orkiestrują miniony do atomowych zadań

- [ ] **Parent-child relationships** - główny agent może mieć przypisane miniony
- [ ] **Minion definition schema** - YAML schema dla minionów (prostsze niż agent)
- [ ] **Minion orchestration workflow** - jak agent woła miniona (jako tool)
- [ ] **Permission inheritance** - miniony dziedziczą uprawnienia z głównego agenta
- [ ] **Minion is NOT user-facing** - użytkownik nie mówi do miniona bezpośrednio

### 5.6 Quick Action Buttons (Minion-powered) 🆕
**Cel:** Guziki w UI które wołają miniony do konkretnych zadań

- [ ] **Button registry** - lista dostępnych quick actions
- [ ] **Auto-tag notatki** - minion wyciąga tagi
- [ ] **Wyciągnij frontmatter** - minion parsuje YAML
- [ ] **Zaklasyfikuj typ** - daily/project/reference/inbox
- [ ] **Generuj summary** - krótkie streszczenie notatki
- [ ] **Button placement** - ribbon/context menu/command palette

---

## 🔐 OBSZAR 6: UPRAWNIENIA

### 6.1 UI improvements
- [ ] **Visual permission matrix** - siatka agent × uprawnienia
- [ ] **Quick presets** - Safe/Standard/YOLO jako przyciski
- [ ] **Permission explanations** - tooltips wyjaśniające każde uprawnienie
- [ ] **History log** - co agent próbował zrobić, co zostało zablokowane

### 6.2 Vault Zones refinement
- [ ] **Zone visualization** - mapa vaulta z kolorami stref
- [ ] **Drag & drop zone creation** - tworzenie stref przez przeciąganie
- [ ] **Inheritance** - dziedziczenie uprawnień z parent folderu
- [ ] **Temporary overrides** - "zezwól raz" bez zmiany stałych ustawień

### 6.3 Approval flow
- [ ] **Batch approval** - zatwierdzanie wielu akcji naraz
- [ ] **Expiring permissions** - "zezwól na 1 godzinę"
- [ ] **Reason display** - dlaczego AI chce wykonać tę akcję
- [ ] **Diff preview** - podgląd zmian przed zatwierdzeniem

---

## 📝 OBSZAR 7: PAMIĘĆ I SESJE

### 7.1 Session management UI
- [ ] **Session browser** - lepszy widok listy sesji
- [ ] **Search sessions** - wyszukiwanie w archiwum
- [ ] **Session preview** - podgląd bez pełnego ładowania
- [ ] **Favorite sessions** - oznaczanie ważnych rozmów

### 7.2 Memory consolidation
- [ ] **Auto-summary trigger** - konfigurowalny próg
- [ ] **Weekly digest** - automatyczne podsumowanie tygodnia
- [ ] **Memory browser** - przeglądanie kondensowej pamięci
- [ ] **Manual consolidation** - wymuszenie podsumowania

### 7.3 Context persistence
- [ ] **Remember preferences** - pamiętanie preferencji użytkownika
- [ ] **Cross-session context** - ważne informacje między sesjami
- [ ] **Pinned context** - ręczne przypinanie faktów do pamięci

---

## 🎨 OBSZAR 8: UI/UX OGÓLNE

### 8.1 Responsywność
- [ ] **Mobile-friendly** - działanie na telefonach (Obsidian Mobile)
- [ ] **Keyboard shortcuts** - pełna nawigacja klawiaturą
- [ ] **Focus management** - prawidłowe focusy przy przełączaniu

### 8.2 Accessibility
- [ ] **Screen reader support** - aria labels
- [ ] **High contrast mode** - dla słabowidzących
- [ ] **Reduced motion** - wyłączenie animacji

### 8.3 Polish & animations
- [ ] **Smooth transitions** - płynne przejścia między stanami
- [ ] **Loading states** - skeleton loaders
- [ ] **Error boundaries** - graceful error handling w UI
- [ ] **Empty states** - ładne stany "brak danych"

---

## � OBSZAR 9: TOKENY I KOSZTY

### 9.1 Śledzenie użycia tokenów
- [ ] **Real-time counter** - licznik tokenów w UI podczas rozmowy
- [ ] **Per-message breakdown** - ile tokenów zużyła każda wiadomość (input/output)
- [ ] **Session totals** - suma tokenów w bieżącej sesji
- [ ] **Historical usage** - historia zużycia per dzień/tydzień/miesiąc
- [ ] **Export usage data** - eksport do CSV/JSON

### 9.2 Limity i budżety
- [ ] **Daily token limit** - dzienny limit tokenów
- [ ] **Per-request limit** - max tokenów na pojedyncze zapytanie
- [ ] **Warning thresholds** - ostrzeżenie przy 80% limitu
- [ ] **Hard stop** - zatrzymanie przy przekroczeniu limitu
- [ ] **Per-agent budgets** - osobne budżety dla każdego agenta

### 9.3 Kalkulacja kosztów
- [ ] **Cost per model** - ceny dla każdego modelu (input/output)
- [ ] **Real-time cost display** - szacunkowy koszt w czasie rzeczywistym
- [ ] **Session cost summary** - podsumowanie kosztu sesji
- [ ] **Monthly cost tracking** - miesięczne statystyki kosztów
- [ ] **Budget alerts** - powiadomienia o zbliżaniu się do budżetu

### 9.4 Optymalizacja tokenów
- [ ] **Context compression** - automatyczna kompresja długich kontekstów
- [ ] **Smart truncation** - inteligentne przycinanie (nie w środku zdania)
- [ ] **Cache responses** - cache dla powtarzających się zapytań
- [ ] **Token efficiency tips** - podpowiedzi jak zmniejszyć zużycie

### 9.5 UI dla tokenów
- [ ] **Token meter widget** - widoczny pasek zużycia w header chatu
- [ ] **Breakdown popup** - kliknięcie pokazuje szczegóły
- [ ] **Color coding** - zielony/żółty/czerwony w zależności od limitu
- [ ] **Settings integration** - łatwy dostęp do konfiguracji limitów

### 9.6 Model Tier System (Cost Guards) 🆕
**Cel:** Zabezpieczenie przed przypadkowym użyciem drogich modeli do batch operations

- [ ] **Tier definitions** - minion (0-3B, MUSI być local), agent (3-70B), oracle (API)
- [ ] **Tier assignment UI** - przypisywanie tier do agentów w ustawieniach
- [ ] **Batch op restrictions** - operacje na wielu plikach = TYLKO minion tier
- [ ] **Cost guards** - blokada modeli API dla minionów
- [ ] **Daily cost limits per tier** - osobne limity dla każdego tier
- [ ] **Confirmation for oracle tier** - wymagane potwierdzenie dla drogich modeli

---

## 🖥️ OBSZAR 10: LOKALNE MODELE

### 10.1 One-click Ollama setup
- [ ] **Detect Ollama** - automatyczna detekcja zainstalowanej Ollamy
- [ ] **Install guide** - krok-po-kroku instrukcja instalacji (z linkami)
- [ ] **Auto-configure** - automatyczna konfiguracja po wykryciu
- [ ] **Health check** - sprawdzanie czy Ollama działa
- [ ] **Restart button** - przycisk restartu Ollamy z pluginu

### 10.2 Model browser
- [ ] **Available models list** - lista dostępnych modeli z Ollama library
- [ ] **Model cards** - opis, rozmiar, wymagania dla każdego modelu
- [ ] **One-click download** - pobieranie modelu jednym kliknięciem
- [ ] **Download progress** - pasek postępu pobierania
- [ ] **Model management** - usuwanie pobranych modeli

### 10.3 Rekomendowane modele
- [ ] **Preset configurations** - gotowe zestawy dla różnych use-cases:
  - 💬 Chat: `llama3.2`, `mistral`
  - 📝 Writing: `gemma2`, `phi3`  
  - 💻 Coding: `codellama`, `deepseek-coder`
  - 🔍 RAG: `nomic-embed-text`
- [ ] **Hardware detection** - sugerowanie modeli na podstawie RAM/GPU
- [ ] **Performance benchmarks** - tokeny/s dla każdego modelu

### 10.4 Konfiguracja lokalna
- [ ] **Custom Ollama URL** - dla zdalnych instancji
- [ ] **GPU/CPU toggle** - wybór akceleratora
- [ ] **Context length** - konfiguracja długości kontekstu
- [ ] **Quantization options** - wybór wersji modelu (Q4, Q8, etc.)
- [ ] **Threads/batch size** - zaawansowane opcje wydajności

### 10.5 Fallback i hybrydowe użycie
- [ ] **Fallback to cloud** - przełączenie na API gdy Ollama niedostępna
- [ ] **Hybrid mode** - lokalne embeddingi + cloud LLM
- [ ] **Cost-aware routing** - automatyczne kierowanie tanich zapytań lokalnie
- [ ] **Offline indicator** - widoczny status online/offline

### 10.6 Embedded Micro-model (Minion Engine) 🆕
**Cel:** Wbudowany model ~0.5B do atomowych zadań, działa nawet na telefonie

- [ ] **Transformers.js integration** - wbudowany model w plugin (zero setup dla usera)
- [ ] **Model selection** - Xenova/multilingual-e5-small lub podobny (~100-200MB)
- [ ] **Lazy loading** - ładowanie modelu dopiero przy pierwszym użyciu
- [ ] **Mobile support** - działanie na Obsidian Mobile (iOS/Android)
- [ ] **WASM backend** - WebAssembly dla wydajności

### 10.7 Minion Tasks Registry 🆕
**Cel:** Pre-defined, atomowe zadania które minion może wykonać

- [ ] **Task schema** - input/output/prompt dla każdego zadania
- [ ] **extract_frontmatter** - wyciąganie YAML z notatki
- [ ] **classify_note_type** - kategoryzacja (daily/project/reference/inbox)
- [ ] **extract_tags** - sugestie tagów na podstawie treści
- [ ] **detect_intent** - klasyfikacja intencji wiadomości usera
- [ ] **summarize_short** - streszczenie do 2-3 zdań
- [ ] **Output validation layer** - walidacja output przed zapisem (regex/schema)
- [ ] **Escalation to main agent** - gdy walidacja failed → główny agent przejmuje

---

## 🎯 Obszar 11: FEEDBACK & LEARNING

**Cel:** Wykorzystanie reakcji użytkownika (👍👎) do poprawy jakości asystenta

### 11.1 Zbieranie feedbacku
- [ ] **Persystowanie reakcji** - zapisywanie lajków/dislajków do pliku JSON
- [ ] **Struktura danych** - timestamp, query, response, reaction, agent
- [ ] **Export do CSV** - możliwość eksportu do analizy

### 11.2 Kontekst dla AI
- [ ] **Styl preferowany** - AI wie jakie odpowiedzi user lubił
- [ ] **Prompt injection** - "User preferuje krótkie/długie odpowiedzi"
- [ ] **Per-agent learning** - każdy agent uczy się osobno

### 11.3 Analytics Dashboard
- [ ] **Statystyki jakości** - % pozytywnych reakcji
- [ ] **Trending topics** - najczęściej zadawane pytania
- [ ] **Agent comparison** - porównanie jakości między agentami

### 11.4 Fine-tuning Ready
- [ ] **Format dla fine-tuningu** - export w formacie OpenAI/Anthropic
- [ ] **Filtrowanie** - tylko pozytywne przykłady
- [ ] **Anonimizacja** - usuwanie wrażliwych danych przed exportem

---

## 🗓️ Sugerowana kolejność implementacji

### Sprint 1: Chat Core (1-2 tygodnie) ✅ DONE
1. ~~Podział wiadomości user/assistant (1.1)~~
2. ~~Renderowanie Markdown (1.2)~~
3. ~~Streaming UX (1.3)~~

### Sprint 2: Tools Essentials (1-2 tygodnie)
1. Tymczasowe task.md (2.1)
2. Czytanie aktualnej notatki (2.4)
3. Komentarze AI (2.3)

### Sprint 3: Settings & CSS (1 tydzień)
1. CSS Customization (4.2)
2. Zaawansowane opcje modeli (4.1)
3. Debug mode (4.5)

### Sprint 4: RAG & Memory (1-2 tygodnie)
1. UI Feedback dla RAG (3.1)
2. Session management UI (7.1)
3. Context persistence (7.3)

### Sprint 5: Agent Hierarchy & Minion Foundation 🆕 (1-2 tygodnie)
1. Hierarchia agentów (5.5) - parent-child relationships
2. Agent Creator improvements (5.1)
3. Agent management (5.3)
4. Quick Action Buttons podstawy (5.6)

### Sprint 6: Embedded Minion Engine 🆕 (1-2 tygodnie)
1. Transformers.js integration (10.6)
2. Minion Tasks Registry (10.7)
3. Output validation layer
4. Mobile testing (Obsidian Mobile)

### Sprint 7: Token Management & Tier System (1-2 tygodnie)
1. Real-time token counter (9.1)
2. Limity i budżety (9.2)
3. Model Tier System (9.6) 🆕
4. Kalkulacja kosztów (9.3)

### Sprint 8: Local Models & Ollama (1-2 tygodnie)
1. One-click Ollama setup (10.1)
2. Model browser (10.2)
3. Rekomendowane modele (10.3) - w tym Bielik v3 11B
4. Fallback i hybrid mode (10.5)

### Sprint 9: Web Search & Advanced Tools (1-2 tygodnie)
1. Web Search (2.2)
2. Rozszerzone operacje MCP (2.5)
3. Kalendarz i przypomnienia (2.6)

---

## 📋 Tracking Progress

Każdy obszar ma swój progress tracker. Oznaczenia:
- `[ ]` - do zrobienia
- `[/]` - w trakcie
- `[x]` - gotowe
- `[!]` - wymaga decyzji/dyskusji

---

*Plan utworzony: 2026-01-18*
*Wersja: 2.0*


