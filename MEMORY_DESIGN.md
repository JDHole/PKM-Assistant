# System Pamięci Agenta - Design Document

> Wersja: 1.0 | Data: 2026-02-20
> Ten dokument opisuje DOCELOWY system pamięci agentów w pluginie Obsek.

---

## 1. Filozofia

**Pamięć agenta działa jak ludzki mózg, nie jak baza danych.**

- Agent NIE ładuje wszystkiego na start - tylko to co "wie zawsze"
- Szczegóły przychodzą na żądanie (jak wspomnienie wywołane kontekstem)
- Agent ZAPOMINA - i to jest feature, nie bug
- Każdy poziom pamięci jest coraz bardziej skompresowany
- Konsolidacja następuje po ilości doświadczeń, nie po czasie

**Kontrola użytkownika: minimum musisz, maksimum możesz.**

- System działa automatycznie bez ingerencji usera 
- User MOŻE kontrolować pamięć głosowo ("zapamiętaj", "zapomnij")
- User MOŻE edytować pliki pamięci ręcznie (to zwykłe .md w vaulcie)

---

## 2. Architektura pamięci

### 2.1 Warstwy pamięci

```
WARSTWA              CO ZAWIERA                    KIEDY ŁADOWANA      KOSZT
─────────────────────────────────────────────────────────────────────────────
Identity Core        Persona agenta, ton, zasady   ZAWSZE (na start)   ~200 tok
Brain                Fakty o userze, ustalenia     ZAWSZE (na start)   ~300 tok
Active Context       Streszczenie ostatniej sesji  ZAWSZE (na start)   ~300 tok
─────────────────────────────────────────────────────────────────────────────
RAG Recall           Stare rozmowy (semantyczne)   NA ŻĄDANIE          0-500 tok
Archive              Pełne sesje, summaries L1/L2  NIGDY bezpośrednio  0 tok
─────────────────────────────────────────────────────────────────────────────
RAZEM na start: ~800 tokenów (<1% budżetu 100k)
```

### 2.2 Identity Core (~200 tokenów)

Stała część system promptu agenta. Definiuje KIM jest agent.
Źródło: definicja agenta (np. `agents/jaskier.yaml` lub inline w kodzie).

Zawiera:
- Imię i rola agenta
- Styl komunikacji (formalny/luźny, język)
- Zasady zachowania
- Instrukcje dot. pamięci (rozpoznawanie komend głosowych)

NIE zawiera: informacji o userze (to jest w Brain).

### 2.3 Brain (~300 tokenów, max ~500)

Plik `.pkm-assistant/agents/{agent_name}/memory/brain.md`

Trwała pamięć agenta o userze i ustaleniach. Aktualizowany po KAŻDEJ sesji.

Struktura:
```markdown
# {Agent} - Brain

## User
- [kluczowe fakty: imię, praca, sytuacja]

## Preferencje
- [jak user chce być traktowany]
- [język, styl, formaty]

## Ustalenia
- [decyzje: "zawsze X", "nigdy Y"]

## Bieżące
- [aktywne projekty, cele, tematy]
```

Zasady:
- Limit: ~500 tokenów. Przekroczenie → agent auto-streszcza i przenosi stare fakty do archiwum.
- Nowy fakt przeczący staremu → stary zastąpiony (nie dodany obok).
- User mówi "zapomnij" → fakt usunięty natychmiast.

### 2.4 Active Context (~300 tokenów)

Plik `.pkm-assistant/agents/{agent_name}/memory/active_context.md`

Streszczenie ostatniej sesji. Daje agentowi kontekst "co było ostatnio" bez ładowania pełnej rozmowy.

Nadpisywany po każdej sesji (zawsze zawiera TYLKO ostatnią).

### 2.5 RAG Recall (0-500 tokenów, na żądanie)

Moduł RAGRetriever szuka w archiwum starych sesji i podsumowań.

Działa TYLKO gdy:
- Embed model jest załadowany (Smart Connections)
- Ustawienie enableRAG = true
- Znaleziono wynik powyżej progu podobieństwa (0.5)

Wynik wstrzykiwany do system promptu jako dodatkowy kontekst.

### 2.6 Archive (0 tokenów)

Pliki w `.pkm-assistant/agents/{agent_name}/memory/`:
```
sessions/          ← pełne sesje (Markdown)
summaries/
  ├── L1/          ← podsumowania co 5 sesji
  └── L2/          ← podsumowania co 5 L1
```

Nigdy nie ładowane bezpośrednio. Dostępne przez RAG lub ręczne przeglądanie.

---

## 3. Cykl życia sesji

### 3.1 "Budzenie się" (start sesji)

```
User otwiera chat / pisze pierwszą wiadomość
  │
  ├─ Załaduj Identity Core (z definicji agenta)
  ├─ Załaduj Brain (z pliku brain.md)
  ├─ Załaduj Active Context (z pliku active_context.md)
  └─ Gotowy do rozmowy (~800 tokenów kontekstu)
```

### 3.2 Rozmowa (w trakcie sesji)

```
User pisze wiadomość
  │
  ├─ RollingWindow.addMessage() - dodaje do historii
  ├─ RAG: szukaj w archiwum (jeśli włączony)
  ├─ Buduj payload: Identity + Brain + ActiveCtx + RAG + historia
  ├─ Wyślij do modelu AI
  ├─ Odpowiedź → RollingWindow.addMessage()
  │
  ├─ Za dużo tokenów (>70%)?
  │   └─ Summarizer: streszcz starszą część rozmowy
  │      (nie obcinaj brutalnie - kompresuj z sensem)
  │
  └─ Auto-save: zapisz surową rozmowę (backup, nie konsolidacja)
```

### 3.3 "Zasypianie" (koniec sesji)

Triggery końca sesji (od najwyższego priorytetu):

```
1. User klika "Nowa rozmowa"           → jawny, świadomy
2. User wraca po 30+ min nieaktywności → automatyczny, cichy
3. Obsidian się zamyka                  → automatyczny, awaryjny
```

Scenariusz 2 działa BEZ timerów w tle:
- Przy każdej nowej wiadomości: sprawdź czas ostatniej wiadomości
- Jeśli > próg (default 30 min) → zamknij starą sesję, zacznij nową
- Zero procesów w tle, zero obciążenia

Próg konfigurowalny w ustawieniach pluginu.

### 3.4 Konsolidacja (po zakończeniu sesji)

```
Sesja się kończy
  │
  ├─ 1. MEMORY EXTRACTION (jedno wywołanie API)
  │     Prompt analizuje rozmowę i wyciąga:
  │     [CORE]       → dopisz do Brain (trwałe fakty o userze)
  │     [PREFERENCE] → dopisz do Brain (preferencje)
  │     [DECISION]   → dopisz do Brain (ustalenia)
  │     [PROJECT]    → Active Context (bieżące tematy)
  │     [SKIP]       → nie zapamiętuj
  │
  ├─ 2. ACTIVE CONTEXT UPDATE
  │     Streszczenie sesji → nadpisz active_context.md
  │
  ├─ 3. SESSION ARCHIVE
  │     Zapisz pełną sesję do sessions/
  │
  └─ 4. CHECK CONSOLIDATION TRIGGERS
        Policz niezesumowane sesje:
        ├─ >= 5 sesji → stwórz Podsumowanie L1
        │   └─ >= 5 L1 → stwórz Podsumowanie L2
        └─ < 5 → nic
```

---

## 4. Konsolidacja objętościowa

### Dlaczego objętościowa, nie czasowa?

Agenci mają różną intensywność użycia:
- Jaskier (codziennie): 5 sesji / tydzień
- Dexter (okazjonalnie): 5 sesji / kilka miesięcy

Trigger czasowy (co tydzień, co miesiąc) tworzyłby puste podsumowania dla rzadko używanych agentów lub nie nadążał za intensywnie używanymi.

### Mechanizm

```
Próg L1: 5 sesji (konfigurowalny)
Próg L2: 5 podsumowań L1 (konfigurowalny)

Po zapisie sesji:
  niezesumowane = sessions/ - już_w_L1
  if niezesumowane >= 5:
    stwórz L1 z tych 5 sesji (wywołanie API)
    oznacz sesje jako "w L1"

    L1_niezesumowane = L1/ - już_w_L2
    if L1_niezesumowane >= 5:
      stwórz L2 z tych 5 L1 (wywołanie API)
      oznacz L1 jako "w L2"
```

### Format plików

**L1 (summaries/L1/L1_001.md):**
```markdown
---
sessions: [2026-02-15_001, 2026-02-16_001, ...]
created: 2026-02-20
token_count: ~300
---
# Podsumowanie sesji 1-5

[3-5 paragrafów streszczających kluczowe tematy, decyzje, postępy]
```

**L2 (summaries/L2/L2_001.md):**
```markdown
---
l1_summaries: [L1_001, L1_002, ...]
created: 2026-03-15
token_count: ~300
---
# Podsumowanie mega (sesje 1-25)

[2-3 paragrafy - wysoki poziom abstrakcji]
```

---

## 5. Memory Extraction Prompt

Kluczowy prompt uruchamiany raz po zakończeniu sesji.

```
Przeanalizuj poniższą rozmowę między agentem "{agent_name}" a użytkownikiem.
Wyciągnij TYLKO fakty warte zapamiętania na stałe.

Aktualny Brain agenta:
{current_brain}

Kategoryzuj każdy fakt:
[CORE]       - Kim jest user (imię, praca, rodzina, sytuacja życiowa)
[PREFERENCE] - Preferencje usera (styl, język, nawyki, gusty)
[DECISION]   - Ustalenia i decyzje ("zawsze rób X", "nigdy Y")
[PROJECT]    - Bieżące projekty, cele, postępy
[UPDATE]     - Korekta istniejącego faktu w Brain (zastąp stary)
[DELETE]     - User poprosił o zapomnienie (usuń z Brain)
[SKIP]       - Nie warte zapamiętania

Sygnały ważności:
- User się poprawia / koryguje agenta → ★★★★★
- User mówi wprost "zapamiętaj" → ★★★★★
- Osobista informacja → ★★★★
- Powtórzenie z poprzednich sesji → ★★★★
- Decyzja/ustalenie → ★★★
- Jednorazowy kontekst → ★ (SKIP)
- Szczegóły techniczne → ★ (SKIP)

Zasady:
- Maks 5-8 faktów na sesję. Mniej = lepiej.
- Jeśli nowy fakt PRZECZY staremu w Brain → oznacz jako [UPDATE]
- Jeśli user powiedział "zapomnij/usuń/nie pamiętaj" → oznacz jako [DELETE]
- NIE zapamiętuj: jednorazowych nastrojów, szczegółów technicznych, tymczasowego kontekstu

Podaj też streszczenie sesji (3-5 zdań) do Active Context.

Format odpowiedzi:
## Fakty
- [KATEGORIA] fakt
- [KATEGORIA] fakt
...

## Streszczenie sesji
[3-5 zdań]
```

---

## 6. Kanały kontroli pamięci

### 6.1 Automatyczny (domyślny, zawsze aktywny)

Memory Extraction Prompt po każdej sesji. Zero wysiłku od usera.

### 6.2 Głosowy (w trakcie rozmowy)

Agent rozpoznaje frazy pamięciowe z kontekstu rozmowy:

```
FRAZA USERA                             AKCJA AGENTA
────────────────────────────────────────────────────────
"Zapamiętaj że..."                  →   Dopisz do Brain natychmiast
"Zapomnij o tym"                    →   Usuń z Brain natychmiast
"To nieważne, nie zapamiętuj"       →   Oznacz jako SKIP w extraction
"Co o mnie wiesz/pamiętasz?"        →   Przeczytaj Brain na głos
"Pokaż swoją pamięć"               →   Wyświetl Brain + statystyki
"Wyczyść pamięć o [temat]"         →   Usuń sekcję z Brain
```

Implementacja: instrukcje w Identity Core agenta + MCP tool `memory_update`.

### 6.3 Ręczny (pliki w vaulcie)

User otwiera pliki w Obsidianie i edytuje:
```
.pkm-assistant/agents/{agent}/memory/
├── brain.md              ← edytuj bezpośrednio
├── active_context.md     ← edytuj bezpośrednio
├── sessions/             ← przeglądaj historię
└── summaries/            ← przeglądaj streszczenia
```

Wszystko jest zwykłym Markdownem. Zero specjalnego UI potrzebnego.

---

## 7. Zabezpieczenia

### 7.1 Brain nie puchnie

- Limit: ~500 tokenów
- Po przekroczeniu: agent auto-streszcza, przenosi rzadko używane fakty do `brain_archive.md`
- `brain_archive.md` jest dostępny przez RAG, ale nie ładowany na start

### 7.2 Summarizer w trakcie rozmowy

Kiedy rozmowa przekroczy 70% limitu tokenów:
- Summarizer kompresuje starszą część rozmowy (zachowuje ostatnie 4 wiadomości)
- Zamiast brutalnego obcinania (jak teraz) → inteligentne streszczenie
- User nie traci kontekstu rozmowy

### 7.3 Graceful degradation

- Brak embed modelu → RAG wyłączony, reszta działa
- Brak klucza API przy konsolidacji → sesja zapisana bez extraction (retry następnym razem)
- Brak pliku brain.md → agent działa bez pamięci, tworzy brain.md po pierwszej sesji
- Uszkodzony plik → agent informuje usera, tworzy nowy

---

## 8. Struktura plików (per agent)

```
.pkm-assistant/
└── agents/
    └── jaskier/
        └── memory/
            ├── brain.md                 # trwała pamięć (~500 tok max)
            ├── brain_archive.md         # overflow z brain (dla RAG)
            ├── active_context.md        # streszczenie ostatniej sesji
            ├── sessions/
            │   ├── 2026-02-20_001.md    # pełne sesje
            │   ├── 2026-02-20_002.md
            │   └── ...
            └── summaries/
                ├── L1/
                │   ├── L1_001.md        # co 5 sesji
                │   └── ...
                └── L2/
                    ├── L2_001.md        # co 5 L1
                    └── ...
```

---

## 8.1 Konfiguracja modeli

```
Ustawienia pluginu:
  Główny model:    [wpisz ID modelu]     ← do rozmów z userem
  Minion:          [wpisz ID modelu]     ← do operacji pamięci (tańszy/szybszy)
```

**Minion** to model używany do wszystkich "background" operacji:
- Memory Extraction (wyciąganie faktów po sesji)
- Summarization (kompresja rozmowy w trakcie)
- Konsolidacja L1/L2 (streszczenia archiwalne)

Nie musi być mądry - musi umieć wyciągnąć fakty z tekstu i streszczać. Idealny kandydat: `claude-haiku-4-5-20251001` (~12x tańszy od Sonnet).

**Default:** Jeśli Minion nie ustawiony → używa głównego modelu (zero konfiguracji na start).

Na razie: oba pola jako ręczne wpisywanie ID modelu. Dropdown z listą = przyszłość.

---

## 9. Autonomia pamięci (FUTURE - przygotuj furtkę)

> Napisane przez Kube, rozwinięte przez AI. Do implementacji w przyszłych fazach.

User chce mieć wpływ na to **w jakim stopniu** agent sam zmienia swoją pamięć.

### 9.1 Poziomy autonomii (per agent, konfigurowalny)

```
POZIOM      NAZWA            CO AGENT MOŻE
────────────────────────────────────────────────────────────
0           Read-only        Tylko CZYTA pamięć, nigdy nie pisze.
                             User ręcznie zarządza brain.md.

1           Suggest          Agent PROPONUJE zmiany w pamięci,
                             ale czeka na potwierdzenie usera.
                             "Chciałbym zapamiętać że lubisz X. OK?"

2           Auto (default)   Agent sam dodaje/usuwa fakty.
                             User może przeglądać i korygować.

3           Full             Agent ma pełną kontrolę, włącznie
                             z reorganizacją i archiwizacją.
```

### Implikacja architektoniczna

Każda operacja zapisu do pamięci musi przechodzić przez jedną funkcję (np. `memoryWrite()`), która:
1. Sprawdza poziom autonomii agenta
2. Przy poziomie 1: buforuje zmianę i pyta usera
3. Przy poziomie 2+: zapisuje bezpośrednio
4. Loguje każdą zmianę (audit trail)

To oznacza: **nie pisać bezpośrednio do plików** z Memory Extraction ani Voice Commands.
Zawsze przez `memoryWrite()` → wtedy dodanie poziomów autonomii to zmiana w JEDNYM miejscu.

---

## 10. Współdzielona pamięć między agentami (FUTURE - przygotuj furtkę)

### Wizja

Agenci mogą czytać i modyfikować pamięć INNYCH agentów:
- Jaskier: "Hej Dexter, user zaczął nowy projekt - zaktualizuj sobie"
- Iris: Czyta brain.md Jaskiera żeby wiedzieć kontekst usera

### Implikacja architektoniczna

Funkcje pamięci (`memoryRead`, `memoryWrite`) muszą przyjmować **target agent** jako parametr:

```
memoryWrite(targetAgent, section, content, sourceAgent)
  ├─ targetAgent: "dexter" (czyja pamięć)
  ├─ section: "brain" | "active_context"
  ├─ content: co zapisać
  └─ sourceAgent: "jaskier" (kto zapisuje - audit trail)
```

NIE zakładać że agent pisze TYLKO do swojej pamięci.
Domyślnie: `targetAgent = self`, ale architektura pozwala na cross-agent.

### Uprawnienia cross-agent (przyszłość)

```
RELACJA                  DOMYŚLNY DOSTĘP
─────────────────────────────────────────
Agent → własna pamięć    Read + Write (wg poziomu autonomii)
Agent → inny agent       Read-only (domyślnie)
Agent → inny agent       Write wymaga uprawnienia w config
```

To łączy się z istniejącym Permission System w pluginie.