# PKM Assistant - Wizja Finalnego Produktu

> **Kopiuj ten plik do czatu z AI** zeby dac kontekst o tym DOKAD zmierzamy.
> Ostatnia aktualizacja: 2026-02-22 (sesja 18)

---

## Jednym zdaniem

**Zespol AI agentow w Obsidianie** - kazdy z wlasna osobowoscia, pamiecia, umiejetnosciami
i minionem, ktorzy pomagaja budowac i zarzadzac baza wiedzy (PKM) uzytkownika.

**Kluczowa zasada:** Inteligencja agenta NIE zalezy od wielkosci modelu.
Agent z malym 11B modelem offline powinien dzialac prawie tak dobrze
jak agent z Opus 4.6, bo moc bierze ze **skilli, pamieci i minionow** - nie z samego LLM.

---

## 1. Nazwa i identyfikacja

- **Nazwa publiczna:** PKM Assistant
- **ID wewnetrzne:** obsek (w kodzie, manifest.json)
- **Repo:** github.com/JDHole/PKM-Assistant
- **Open-source** - publiczny plugin dla spolecznosci Obsidian

---

## 2. Onboarding nowego uzytkownika

User instaluje PKM Assistant. Po pierwszym zaladowaniu:

```
┌─────────────────────────────────────────┐
│  Witaj w PKM Assistant!                 │
│  Gotowy wprowadzic AI do bazy wiedzy?   │
│                                         │
│  Podlacz swoje API lub lokalne modele   │
│  [Konfiguruj]                           │
└─────────────────────────────────────────┘
```

### Tryb startowy (do czasu monetyzacji)
- User podlacza wlasne klucze API (Anthropic, OpenAI, OpenRouter, Gemini, Groq, DeepSeek)
- Lub lokalne modele (Ollama)
- Lub jedno i drugie (rozne modele do roznych zadan)
- Konfiguracja musi byc BANALNA - nawet dla non-techow

### Easy mode (POZNIEJ - wymaga gotowego SaaS)
- User zaklada konto w naszym systemie
- Od razu podlaczony solidny model (np. Sonnet)
- Kredyty lub subskrypcja - zero myslenia o API
- Dostep do wszystkich modeli na rynku z jednego miejsca
- **To jest nasz SaaS** - deal z dostawcami AI, user placi nam
- Wdrazamy dopiero gdy plugin dziala stabilnie z wiekszocia funkcji

### Po konfiguracji

Wlacza sie **Jaskier** - domyslny orkiestrator. On:
- Wita uzytkownika w systemie
- Robi pelne wdrazanie (opowiada o funkcjach, agentach, skillach)
- Pomaga podlaczyc miniona (tanszy/mniejszy model do zadan w tle)
- Pomaga stworzyc pierwszego wlasnego agenta
- Zna CALY system PKM Assistant od podszewki

---

## 3. System agentow

### Filozofia

Agenci to **odrebne osoby AI** - nie sa generycznym chatbotem z inna nazwa.
Kazdy ma:
- Wlasna osobowosc (system prompt, styl, emoji, ton)
- Wlasna pamiec (brain.md, sesje, L1/L2 podsumowania)
- Wlasny playbook (notatka techniczna - narzedzia, skille, procedury)
- Wlasna mape vaulta (vault_map.md - strefy do ktorych ma dostep)
- Wlasne uprawnienia (co moze robic w vaultcie)
- Wlasne MCP tools (jakie narzedzia moze uzywac)
- Wlasne skille (instrukcje JAK wykonywac konkretne zadania)
- Wlasnego miniona (tanszy model do zadan w tle)
- Wlasny model AI (lub dziedziczony z ustawien globalnych)

### Co jest dostepne od razu

- **Jaskier** - glowny orkiestrator, zna caly system, widzi wszystko
- **Dexter** - specjalista techniczny, vault builder (skrypty, szablony, dashboardy)
- **Ezra** - specjalista od budowy agentow i konfiguracji systemu

### Jak powstaja nowi agenci

1. **Z Jaskierem** - user opisuje jakiego agenta chce, Jaskier pomaga go stworzyc
   (personality, uprawnienia, strefy, skille)
2. **Z Agent Creatorem** - panel UI do recznego tworzenia
3. **Z marketplace** - gotowi agenci do sciagniecia jednym klikiem
4. **Z Ezra** - specjalista od budowy agentow (dostepny na marketplace)

### 3 kluczowe pliki agenta

Kazdy agent ma 3 pliki ktore definiuja jego wiedze i mozliwosci:

```
.pkm-assistant/agents/{agent}/
├── memory/
│   └── brain.md          <- KIM JEST USER (fakty, preferencje, historia)
├── playbook.md           <- CO UMIE AGENT (narzedzia, skille, procedury)
└── vault_map.md          <- GDZIE MA DOSTEP (strefy vaulta, wazne sciezki)
```

**brain.md** - pamiec dlugoterminowa (juz zaimplementowane)
- Fakty o userze wyciagane z rozmow
- Preferencje, projekty, kontekst osobisty
- Budowana automatycznie przez miniona po kazdej sesji

**playbook.md** - notatka techniczna agenta
- Lista narzedzi (MCP tools) z opisami i przykladami uzycia
- Lista skilli z opisami i kiedy uzywac
- Konfiguracja miniona (co delegowac, co robic sam)
- Procedury: jak podchodzic do typowych zadan
- Agent NIE ma tego w system prompcie (za duzo tokenow!)
- Minion czyta playbook ZA agenta i podaje relevantne info

**vault_map.md** - mapa stref vaulta
- Foldery do ktorych agent ma dostep
- Krotki opis co jest w kazdym folderze
- Rozni agenci widza rozne strefy (np. Iris widzi Health/, Lexie widzi Writing/)
- Minion uzywa mapy zeby wiedziec GDZIE szukac

**Dlaczego nie w system prompcie?**
System prompt agenta jest lekki (~500 tokenow). Zawiera:
1. Kim jestem (osobowosc)
2. Co pamietam (brain.md - skrot)
3. **Mam playbook i vault_map - minion je czyta gdy potrzebuje**
4. Uprawnienia (co wolno)

Cala "ciezka" wiedza techniczna jest w plikach na dysku.
Agent nie musi tego pamietac - ma miniona ktory to sprawdza.

### Osobowosci agentow to sprawa USERA

Plugin NIE narzuca osobowosci agentow. Jaskier i Iris to szablony.
User tworzy agentow jakich potrzebuje - moze to byc:
- Dexter (tech/vault builder), Lexie (pisanie), Silas (biznes), Kaia (podroze)...
- Albo zupelnie inni: Finansista, Dietetyk, Trener, Menedzer Projektow...
- Kazdy user buduje SWOJ zespol pod SWOJE potrzeby

---

## 4. Skille agentow

### Co to jest skill

Skill = zaawansowany prompt + opcjonalny kod, ktory mowi agentowi
JAK DOKLADNIE wykonac konkretne zadanie.

**Przyklad: Skill "Napisz artykul na X"**

```
.pkm-assistant/skills/write-x-article/
├── skill.md          <- Instrukcja: styl usera, format, dlugosc,
│                        gdzie szukac materialow, jak kompresowac
│                        zrodla, jaki output
└── formatter.js      <- Opcjonalny skrypt: formatuje output,
                         waliduje dlugosc, dodaje hashtagi
```

Skille sa w **centralnej bibliotece** (`.pkm-assistant/skills/`),
nie per agent. Kazdy agent ma liste przypisanych skilli w konfiguracji.

### Dlaczego skille sa kluczowe

- **Niweluja roznice miedzy modelami** - maly model z dobrym skillem
  pisze lepszy artykul niz duzy model bez skilla
- **Sa powtarzalne** - raz zrobiony skill dziala za kazdym razem
- **Sa dzielone** - user moze udostepnic skill na marketplace
- **Sa edytowalne** - user widzi i modyfikuje kazdy skill

### Jak user tworzy skille

1. Z agentem (np. Ezra) - opisuje co chce, agent pisze skill
2. Recznie - edytuje pliki .md w .pkm-assistant/
3. Z marketplace - sciaga gotowe skille
4. Przez iteracje - uzywa, daje feedback, agent poprawia skill

### Skille vs. system prompt

| Aspekt | System prompt | Skill |
|--------|---------------|-------|
| Kiedy | Zawsze aktywny | Ladowany na zadanie |
| Zawartosc | Kto jestem, jak sie zachowuje | JAK dokladnie zrobic X |
| Rozmiar | ~500-1000 tokenow | Moze byc duzy (2000+ tok) |
| Tworca | Jednorazowo przy tworzeniu agenta | Ciagle tworzone/doskonalone |
| Kod | Nigdy | Opcjonalnie (JS) |

---

## 5. Architektura AI

### Filozofia 4 modeli

Zaden model AI nie jest najlepszy do WSZYSTKIEGO. Plugin uzywa
**4 roznych modeli** do roznych zadan - kazdy robi to w czym jest najlepszy.

### 4 modele agenta

```
┌─────────────────────────────────────────────┐
│              AGENT (np. Jaskier)             │
├─────────────┬──────────┬──────────┬─────────┤
│    MAIN     │  MINION  │ EMBEDDING│ MASTER  │
│  rozmowa    │  robota  │  szukanie│  geniusz│
│  codziennie │  w tle   │  wektorow│  rzadko │
├─────────────┼──────────┼──────────┼─────────┤
│ DeepSeek    │ DeepSeek │ Nomic    │ Opus 4.6│
│ Chat        │ Chat     │ (lokalny)│         │
│ kazda msg   │ co sesje │ indeks   │ 1-2x/msc│
└─────────────┴──────────┴──────────┴─────────┘
```

- **Main** - model do codziennej rozmowy z userem. Kazda wiadomosc.
- **Minion** - tanszy model do pracy w tle (prep, ekstrakcja pamieci, szukanie).
- **Embedding** - wyspecjalizowany model do zamiany tekstu na wektory (szukanie semantyczne).
- **Master** - najmocniejszy model, wywoływany TYLKO do trudnych zadan (analiza, planowanie).

Kazdy model konfigurowalny **globalnie** (ustawienia pluginu) i **per agent**.
User nie musi ustawiac wszystkich 4 - domyslne wartosci dzialaja od razu.

### Jak Main deleguje prace

Main jest "centrum decyzyjnym" agenta:
- Proste zadania (szukaj pliku, sprawdz pamiec) → **deleguje W DOL do Miniona** (minion_task)
- Normalne zadania (rozmowa, odpowiedzi) → **robi sam**
- Trudne zadania (glebokie myslenie, analiza) → **deleguje W GORE do Mastera** (master_task)

Master ZAWSZE dostaje przygotowany kontekst:
1. Main decyduje ze potrzebny Master
2. Main → Minion: "przygotuj dane do tego pytania"
3. Minion zbiera kontekst z vaulta/pamieci
4. Przygotowany pakiet → Master
5. Master odpowiada → Main prezentuje userowi

### Minion - tani pracownik w tle

Minion = tanszy/mniejszy model AI pracujacy W TLE dla agenta.
Agent rozmawia z userem. Minion robi za niego "brudna robote".

Co robi minion:
- **Przeszukuje vault** - zbiera kontekst ZANIM agent odpowie
- **Przeszukuje pamiec** - wyciaga wspomnienia z sesji/L1/L2
- **Konsoliduje sesje** - po rozmowie wyciaga fakty do brain.md
- **Kompresuje** - tworzy L1/L2 podsumowania
- **Przygotowuje kontekst** - laczy informacje z roznych zrodel
- **Klasyfikuje** - taguje notatki, routuje zadania
- **Wykonuje skille** - niektorych nie musi robic glowny model

### Minion per agent

Kazdy agent moze miec:
- Wlasnego miniona (inny model, inne zadania)
- Konkretne instrukcje dla miniona (co szukac, gdzie, jak kompresowac)
- Minion moze byc:
  - Cloud: Haiku, GPT-4o-mini, Gemini Flash (tanio)
  - Lokalny: Phi-3, Gemma, Bielik, Llama (za darmo, offline)

### Minion jako bibliotekarz

Kluczowy wzorzec: minion jest **bibliotekarzem** agenta.
Agent NIE czyta sam swoich plikow referencyjnych (playbook.md, vault_map.md).
Zamiast tego:

```
1. User: "Zrob mi raport z projektow"
2. Agent -> Minion: "sprawdz playbook, co mamy do raportow?"
3. Minion czyta playbook.md -> znajduje: skill "weekly-review",
   narzedzia vault_search + vault_read, folder Projects/
4. Minion -> Agent: "masz skill weekly-review, pliki w Projects/,
   uzyj vault_search + vault_read"
5. Agent planuje: uzywam skilla, szukam w Projects/
6. Agent -> Minion: "przeszukaj Projects/ i daj mi podsumowanie"
7. Minion pracuje, zwraca wynik
8. Agent prezentuje userowi gotowy raport
```

**Dlaczego tak?**
- Agent ma LEKKI system prompt (szybki start, malo tokenow)
- Minion jest tani (maly model) - czytanie plikow go nie obciaza
- Agent ZAWSZE wie co ma w przyborniku (bo minion mu powie)
- Dziala nawet z malym 8B modelem (bo minion robi research)
- User widzi inteligentnego agenta, ktory wie co robi

### Tryb Agentic (natywny vs nasz)

Dostawcy AI (Claude, OpenAI) oferuja natywny "agentic mode" - model sam uzywa narzedzi
w petli az skonczy zadanie. Nasz system minion/main/master to DOKLADNIE to samo,
ale pod nasza pelna kontrola (streamToCompleteWithTools()).
Jesli dostawcy dodadza korzyści (tansze tokeny, dluzszy kontekst w trybie agentowym),
podepniemy pod istniejaca architekture. Nie wymaga osobnej implementacji.

### Minion na mobile

Na telefonie miniony dzialaja na malych lokalnych SLM
lub najtanszych cloud modelach - oszczednosc tokenow i baterii.

*--- Optymalizacje kosztow i jakosci ---*

### Prompt Caching (optymalizacja kosztow API)

Przy kazdej wiadomosci plugin wysyla do API caly kontekst:
system prompt + brain.md + pamiec L1/L2 + historie czatu.
Bez cachowania placi sie pelna cene za te same tokeny za kazdym razem.

**Prompt caching** pozwala API "zapamietac" powtarzajaca sie czesc
i liczyc ja znacznie taniej.

**Roznice miedzy providerami:**

| | Anthropic | OpenAI | Lokalne (Ollama) |
|---|---|---|---|
| Cache | Trzeba oznaczyc (`cache_control`) | Automatyczny | Nie dotyczy |
| Rabat | **90% taniej** | **50% taniej** | Brak kosztow |
| Wymagany rozmiar | min 1024-2048 tokenow | min 1024 tokenow | - |
| Czas zycia cache | 5 min od ostatniego uzycia | 5-60 min | - |
| Max breakpointy | 4 na request | Bez limitu | - |

**Co cachujemy (kolejnosc od najbardziej stalego):**
1. System prompt agenta (staly) - ZAWSZE cachowany
2. Brain.md + pamiec L1/L2 (zmienia sie rzadko) - cachowany
3. Historia czatu (rosnie, ale prefix staly) - cachowany do breakpointu
4. Nowa wiadomosc usera - NIE cachowana (zmienia sie zawsze)

**Kluczowa zasada:** Stale elementy MUSZA byc na poczatku promptu.
Jesli cos w srodku sie zmieni, cache od tego miejsca "peka".

**Oczekiwany efekt:**
- **70-80% oszczednosci** na kosztach API w typowej sesji (20 wiadomosci)
- Szybszy czas odpowiedzi (cached tokeny przetwarzane szybciej)
- Zero wplywu na jakosc odpowiedzi

### Model embeddingów

Model embeddingów zamienia tekst na wektor liczb (embedding). Dwa teksty
o podobnym znaczeniu maja podobne wektory - to jest serce wyszukiwania semantycznego.

**Dlaczego wybor modelu jest wazny:**
- **Wymiary** (384 vs 1024) - ile "detali" model widzi w tekscie
- **Max tokenow** (512 vs 8192) - ile tekstu model moze zobaczyc na raz.
  Tekst dluzszy niz limit jest UCINANY - model nie widzi reszty!
- **Jezyki** - model trenowany na angielskim slabo rozumie polski

**Domyslny model: Nomic-embed-text v1.5** (lokalny, 768 dim, 2048 tok, multilingual).
Sciagany automatycznie przy pierwszym uzyciu (~150MB).

User nie musi o tym myslec - domyslny model "po prostu dziala".
Power user moze zmienic w ustawieniach na:
- Lekki (bge-micro, 17MB) - dla slabych komputerow
- Standardowy (Nomic) - domyslny
- Zaawansowany (Jina-v2, 8192 tok) - najlepsza jakosc
- API (OpenAI/Mistral) - najlepsza mozliwa jakosc (platne)

---

## 6. Pamiec agenta [ZAIMPLEMENTOWANE]

Hierarchiczna pamiec juz dziala (fazy 0-7 DONE):

```
.pkm-assistant/agents/{agent}/memory/
├── brain.md              <- Dlugoterminowa pamiec (fakty o userze)
├── active_context.md     <- Co wlasnie robimy
├── audit.log             <- Log zmian pamieci
├── sessions/             <- Pojedyncze rozmowy
└── summaries/
    ├── L1/               <- Kompresja 5 sesji -> 1 streszczenie
    └── L2/               <- Kompresja 5 L1 -> 1 mega-streszczenie
```

### Zaimplementowane
- Brain boot-up, session lifecycle, memory extraction
- Summarizer, RAG na pamieci agenta, L1/L2 konsolidacja
- MCP tools: memory_search, memory_update, memory_status
- Minion model do operacji pamieciowych
- Fuzzy deduplikacja faktow, audit trail

### Do zrobienia (deep memory - przyszlosc)
- **PLLM (Personalized LLM)** - agent buduje profil usera z czasem
  (inspiracja: AI PERSONA, PRIME - pamiec epizodyczna + semantyczna)
- **Adaptive retrieval** - main decyduje ILE pamieci potrzeba
  (prosta odpowiedz = malo, planowanie projektu = duzo)
- **Memory decay** - starsze wspomnienia "bladna" (nizszy priorytet)
- **Cross-agent memory** - agenci moga czytac pamiec innych (za zgoda)
- **Adaptery/LoRA** - fine-tuning modeli na danych usera (daleka przyszlosc)

---

## 7. Komunikacja miedzy agentami

### Komunikator

System wiadomosci miedzy agentami (inspiracja: folder Komunikator w vaultcie usera):

```
.pkm-assistant/komunikator/
├── inbox_jaskier.md
├── inbox_iris.md
├── inbox_lexie.md
└── ...
```

Agent moze:
- Zostawic wiadomosc dla innego agenta
- Przekazac kontekst (np. "user chce artykul, oto materialy")
- Poprosic o pomoc (np. Jaskier -> Dexter: "user potrzebuje skryptu")

### Delegacja agentow

Jaskier (lub inny agent) moze zaproponowac przelaczenie:

```
Jaskier: Masz artykul do napisania na X.
         Moze przerzucimy sie na Lexie?
         [Przelacz na Lexie] [Zostan z Jaskierem]
```

Po kliknieciu:
1. Sesja Jaskra sie zapisuje (memory extraction)
2. Jaskier zostawia wiadomosc w Komunikatorze dla Lexie z kontekstem
3. Lexie sie laduje i od razu wie o co chodzi
4. User kontynuuje z Lexie

### Debata agentow (przyszlosc)

Mozliwosc rozmowy z KILKOMA agentami NARAZ:
- Kazdy agent ma podpiety swoj LLM
- Generuja odpowiedzi na podstawie rozmowy
- User uczestniczy jako moderator
- Przydatne do: burzy mozgow, decyzji, ewaluacji pomyslow

---

## 8. Agent Manager / Creator Panel

Osobna zakladka w pluginie (lub panel) z PELNA kontrola nad agentami.

### Co widac w panelu

Dla KAZDEGO agenta:
- **Profil** - imie, emoji, osobowosc, archetyp, model, temperatura
- **Pliki systemowe** - brain.md, active_context.md, audit.log
  (LATWE do wgladu i edycji - Obsidian nie pokazuje .pkm-assistant latwol)
- **Uprawnienia** - co moze robic (read/write/delete/mcp/execute...)
- **Strefy vaulta** - do jakich folderow ma dostep
- **MCP Tools** - ktore narzedzia moze uzywac (i ktore POWINIEN)
- **Skille** - lista skilli agenta, podglad, edycja
- **Ustawienia miniona** - model, instrukcje, zadania
- **Historia rozmow** - przeglad sesji (z latwa nawigacja!)
- **Pamiec** - brain.md, L1/L2 podsumowania, aktywny kontekst
- **Statystyki** - ile sesji, ile tokenow, ostatnia aktywnosc

### Agent Creator

Formularz do tworzenia nowego agenta:
- Imie, emoji, opis roli
- Archetyp (szablon osobowosci) lub pelny custom
- Uprawnienia (preset: Safe / Standard / Full)
- Strefy vaulta
- Model AI
- Minion (model + instrukcje)

### Dlaczego to wazne

User MUSI miec pelna kontrole i przejrzystosc:
- Wie co agent pamieta (i moze to edytowac)
- Wie co agent moze robic (i moze to zmienic)
- Wie jak agent dziala (i moze to ulepszyc)
- Ukryte foldery (.pkm-assistant) nie sa juz czarna skrzynka

---

## 9. Integracja z vaultem - agent MUSI znac Obsidiana

### Fundamental

PKM Assistant dziala W Obsidianie i musi byc na niego SUPER sfocusowany.
Agenci musza znac i umiec:

- **Strukture vaulta** - foldery, pliki, linki, tagi, properties
- **YAML frontmatter** - metadata notatek, Dataview queries
- **Dataview / DataviewJS** - dynamiczne widoki, tabele, listy
- **CustomJS** - skrypty JavaScript w vaultcie
- **Szablony (Templater)** - tworzenie notatek z szablonow
- **CSS snippets** - personalizacja wygladu
- **Ustawienia Obsidiana** - hotkeys, pluginy, preferencje
  (agent moze zmieniac ustawienia Obsidiana - za zgoda usera!)
- **Techniki PKM** - Zettelkasten, PARA, MOC, daily notes, tags vs links

### Agent jako vault builder

Agent (np. Dexter u JDHole'a) musi umiec:
- Pisac skrypty JS dla vaulta (widgety, automatyzacje)
- Tworzyc szablony notatek
- Budowac dashboardy (DataviewJS)
- Modyfikowac config.js / utils.js
- Optymalizowac strukture folderow
- Tworzyc CSS snippety

Jesli user powie "Potrzebuje nowy widget do finansow" - agent go ROBI.

### Onboarding nowego usera do Obsidiana

Jesli ktos instaluje PKM Assistant nigdy nie widziac Obsidiana,
Jaskier musi umiec:
- Wytlumaczyc podstawy PKM i Obsidiana
- Pomoc zbudowac pierwszy vault od zera
- Zaproponowac strukture folderow
- Pomoc z daily notes, tagami, szablonami
- Byc cierpliwym i przyjaznym mentorem

### Typy notatek

Agenci MUSZA rozumiec kontekst:
- Iris wie ze "raport zdrowotny" = plik .md w vaultcie (nie PDF!)
- Dexter wie ze "skrypt" = plik .js w odpowiednim folderze
- Lexie wie ze "artykul na X" = notatka z odpowiednim fronmatterem
- Kazdy agent tworzy notatki w FORMACIE Obsidiana - zawsze

---

## 10. Inline interakcja z agentem

### Prawy przycisk w notatce

User zaznacza fragment tekstu w notatce, prawy przycisk:

```
[Kopiuj]
[Wytnij]
[Daj komentarz do Asystenta]  <- NOWE
```

Po kliknieciu:
1. Maly formularz - user wpisuje co mu sie nie podoba
2. Wysyla do aktywnego agenta (lub wybranego w ustawieniach)
3. Agent dostaje: zaznaczony fragment + komentarz usera + sciezke pliku
4. Agent moze od razu poprawic dany fragment w pliku

### Usecase

User czyta artykul napisany przez Lexie. Jeden akapit jest zly.
Zaznacza, pisze "tu zhalucynowala, popraw na podstawie X".
Lexie dostaje to, poprawia akapit, user widzi zmiane.

---

## 11. Rozszerzony chat

### Creation Plans (artefakty)

Kiedy agent dostaje wieksze zadanie (np. "napisz artykul"):

1. Agent wypisuje **creation plan** - krok po kroku co zrobi
2. Plan pojawia sie jako artefakt w chacie (lub jako notatka)
3. User moze **komentowac poszczegolne kroki** (zaznacz + komentarz)
4. Po 1-2 iteracjach planu - agent zaczyna prace
5. Agent uzywa skilla do wykonania zadania

Creation plan to jak "implementation plan" dla tresci -
user kontroluje CO agent zrobi zanim zacznie pisac.

### Todo listy w chacie

Agent moze tworzyc **interaktywne listy zadan** w oknie chatu:

```
┌─ Reorganizacja folderu Projects/ ──────────┐
│ ✅ Przeskanowac istniejace pliki           │
│ ✅ Znalezc duplikaty                       │
│ ⬜ Przeniesc pliki do nowych folderow      │
│ ⬜ Zaktualizowac linki                     │
│ ████████░░░░░░░ 50%                        │
└────────────────────────────────────────────┘
```

- Agent odznacza kroki automatycznie w trakcie pracy
- User widzi na zywo co jest gotowe, a co jeszcze trwa
- User moze dodac/usunac/edytowac punkty
- Dwa tryby: **tymczasowy** (znika po sesji) lub **trwaly** (zapisany jako notatka)

### Extended thinking (rozszerzone myslenie)

Nowoczesne modele AI maja tryb "glebokiego myslenia" (reasoning):
- **DeepSeek Reasoner** - reasoning_content (juz obslugujemy!)
- **Anthropic** - extended thinking
- **OpenAI o-series** - chain of thought

Plugin wyswietla ten proces myslenia w chacie:

```
┌─ Agent mysli... ───────────────────────────┐
│ Najpierw musze sprawdzic jakie pliki sa    │
│ w folderze Projects/. Potem porownac z     │
│ tym co user opisal w brain.md...           │
│                              [Zwin ▲]      │
└────────────────────────────────────────────┘

Oto co znalazlem w twoich projektach:
...
```

- Blok myslenia jest **zwijany** (domyslnie rozwiniety, user moze zwinac)
- Animacja w czasie rzeczywistym (tekst pojawia sie jak agent mysli)
- Mozna wylaczyc w ustawieniach (nie kazdy chce widziec myslenie)

### Animacje i UI

Caly chat musi dzialac **plynnie i nowocześnie**:
- Typing effect z kursorem przy generowaniu odpowiedzi
- Plynne rozwijanie/zwijanie blokow (thinking, tool calls, todolists)
- Animacja tool call (ikona narzedzia + nazwa + wynik)
- Pasek postepu przy dluzszych operacjach
- Responsywny design - dziala na roznych rozmiarach panelu

---

## 12. Mobile i offline

### Cel

PKM Assistant dziala na telefonie w PELNYM trybie:
- Agenci + pamiec + narzedzia + miniony
- Mozliwosc pracy OFFLINE z lokalnymi SLM

### Jak to dziala

- **Online:** Normalne API (Claude, GPT, etc.)
- **Offline:** Miniony na malych modelach (Phi-3, Gemma, Bielik)
  - Agent dostaje kontekst od miniona
  - Odpowiada z mniejsza precyzja ale DZIALA
  - Idealny scenariusz: Jaskier z Bielikiem v3 na telefonie offline
    prowadzi codzienne rozmowy o tresci vaulta

### Model niezaleznosc

User z 11B modelem lokalnym nie powinien widziec OGROMNEJ roznicy
w codziennym uzytkowaniu vs Gemini Pro czy Sonnet.
Bo agent bierze inteligencje z:
1. **Skilli** (dokladne instrukcje)
2. **Pamieci** (wie co user lubi, jak pisze, co robi)
3. **Minionow** (przygotowany kontekst)
4. **Narzedzi** (MCP tools, vault access)

Wielki model potrzebny jest do GLEBOKIEGO myslenia
(np. analiza biznesowa, debugging kodu) - nie do codziennej rozmowy.

---

## 13. Prywatnosc i lokalnosc

### 100% lokalna opcja

Jesli user uzywa TYLKO lokalnych modeli (Ollama):
- **ZADNE dane nie wychodza na zewnatrz**
- Pelna prywatnosc
- Zero kosztow po instalacji
- Dziala offline

### Prosta droga do lokalnosci

User nie musi byc technicznym zeby uzyc Ollama:
- One-click setup w ustawieniach pluginu
- Rekomendacja najlepszych modeli do roznych zadan
- Minion auto-konfiguracja

### Optymalizacja pod lokalne modele

Lokalne modele (8B-70B) maja inne ograniczenia niz cloud (Claude, GPT):
- **Mniejsze okno kontekstowe** - kazdy token system promptu kosztuje
- **Slabszy tool calling** - nie kazdy model radzi sobie z MCP narzdziami
- **Wolniejsze generowanie** - user musi widziec CO sie dzieje

Plugin MUSI sie adaptowac do mozliwosci modelu:

1. **Adaptive prompt** - im mniejszy model, tym krotszy system prompt:
   - <14B: tylko lista narzedzi + 1 zasada, brak pamieci w prompcie
   - 14-30B: pelne instrukcje, brain.md, bez L1/L2
   - 30B+: pelny kontekst jak cloud

2. **Fallback tool calling** - jesli model nie wywoluje narzedzi:
   - Agent pyta usera wprost ("Chcesz zebym przeszukal vault?")
   - Parsowanie odpowiedzi z tekstu zamiast z tool_calls
   - Sugestie narzedzi jako przyciski w UI

3. **Rekomendacje modeli per GPU** - user wpisuje ile ma VRAM:
   - 8GB: qwen3:8b (rozmowa), phi-3-mini (minion)
   - 12GB: qwen3:14b (rozmowa), qwen3:8b (minion)
   - 24GB: qwen3:30b lub llama3.1:70b Q4
   - 48GB+: llama3.3:70b (pelna jakosc, porownywalna z cloud)

4. **Tryb lekki** - uzytkownik moze wylaczyc:
   - RAG, pamiec w prompcie, miniony
   - Dla maksymalnej szybkosci z lokalnymi modelami
   - Przycisk "turbo" w chacie albo automatyczna detekcja platformy

---

## 14. Multi-modal

### Cel

Agent nie tylko czyta i pisze tekst - **widzi obrazy, slucha audio,
analizuje video i odpowiada glosem**. Chat staje sie prawdziwie multimedialny.

### Zdjecia i obrazy w chacie

User wkleja zdjecie/screenshot do chatu:
- **Paste** (Ctrl+V), **drag & drop**, lub **przycisk kamery**
- Agent widzi obraz i moze go analizowac (multimodal model: GPT-4o, Claude, Gemini)
- Obraz widoczny w historii chatu

```
User: [wkleja zdjecie tablicy z notatkami]
      "Przepisz to do notatki"

Agent: Widze tablice z 3 sekcjami...
       [tworzy notatke z zawartoscia tablicy]
```

**Graceful fallback:** jesli model nie obsluguje obrazow - agent mowi
o tym userowi i sugeruje model z vision.

### Video w chacie

User uploaduje krotki film:
- Agent automatycznie **transkrybuje audio** (Whisper)
- Agent analizuje **kluczowe kadry** (multimodal model)
- Wynik: streszczenie video z transkrypcja + najwazniejsze momenty

Przydatne do: wyklad na YT, notatki z meetingu, tutorial do opisania.

### Rozmowa glosowa

Przycisk **mikrofonu** w chacie:
- User mowi zamiast pisze (STT - speech to text)
- Agent odpowiada **glosem** (TTS - text to speech)
- Kazdy agent moze miec **inny glos** (dopasowany do osobowosci)
- **Tryb hands-free** - cala rozmowa bez klawiatury

Technologie: Web Speech API (darmowe), Whisper (lokalny), ElevenLabs/OpenAI TTS (API).

### Transkrypcja audio do notatek

User przeciaga plik audio (.mp3, .wav, .m4a) do chatu:
- Automatyczna transkrypcja przez Whisper (lokalny lub API)
- Agent tworzy sformatowana notatke z transkrypcja
- Timestamps, rozdzielenie mowcow (jesli mozliwe)
- Obsluga dlugich nagran (dzielenie na chunki)

### Generowanie grafiki

Agent tworzy obrazy do notatek i artykulow:
- Integracja z ComfyUI, DALL-E, Midjourney API
- Podglad w chacie, zapis do vaulta jako attachment

### Generowanie muzyki

- Soundscapes, jingle, ambient do pracy
- Integracja z lokalnymi narzędziami muzycznymi

---

## 15. Deep personalization (daleka przyszlosc)

Inspiracja: badania PLLM (Personalized LLM)

### Pamiec epizodyczna + semantyczna (PRIME)
- Epizodyczna: konkretne interakcje ("w piatek pisalismy artykul o X")
- Semantyczna: uogolnione preferencje ("user lubi krotkie paragrafy")
- Agent jawnie odwoluje sie do obu warstw przy odpowiadaniu

### Adaptive retrieval (SimpleMem/CMA)
- Retrieval sterowany typem zadania
- Proste pytanie = malo kontekstu, szybka odpowiedz
- Planowanie projektu = duzo kontekstu, gleboki retrieval

### Knowledge modules (Knoll)
- Vault podzielony na moduly wiedzy (foldery/tagi + instrukcje)
- Agent dynamicznie sklada kontekst z odpowiednich modulow
- Rozne prompty i zasady dla roznych modulow

### Adaptery / fine-tuning (LoRA)
- Trening adapterow na danych usera
- Wplywaja na to jak model "czyta" wagi
- Agent z fine-tuningiem lepiej rozumie styl i preferencje usera
- Wymaga: integracja z Ollama + LoRA, ewentualnie cloud fine-tuning

### Concept routing (NoteBar-style)
- Maly encoder do automatycznego tagowania notatek
- Routing konceptow: jedna notatka -> wiele kategorii
- User feedback (👍👎) poprawia klasyfikacje z czasem

### Poprawa embeddingu dla dlugich notatek
SC dzieli notatki na bloki po naglowkach Markdown - to jest sensowne, ale ma limity:
- Pojedynczy blok (np. dlugi rozdzial) moze przekroczyc okno modelu embeddingów
- Brak nakladki (overlap) miedzy blokami = kontekst na granicy ginie
- Brak hierarchicznego wyszukiwania (najpierw znajdz rozdzial, potem sekcje)

Rozwiazanie: sliding window z nakladka + hierarchiczny embedding
(cala notatka -> rozdzialy -> sekcje). Przydatne do ksiazek, transkrypcji,
dlugich artykulow. Wymaga lepszego modelu embeddingów (min. 2048 tokenow).

---

## 16. Marketplace

### Zakladka w pluginie

Wbudowany browser do przegladania i instalacji:
- **Agenci** - gotowe persony z promptami i skillami
- **Skille** - instrukcje do konkretnych zadan
- **MCP Tools** - nowe narzedzia dla agentow
- **Szablony vaulta** - gotowe struktury folderow/notatek

### Zrodla

- **Oficjalne** (od nas) - zweryfikowane, bezpieczne
- **Community** - od uzytkownikow, z systemem ocen
- **GitHub repo** - proste pliki YAML/MD do sciagniecia

### Przyklad

User: "Chce agenta od finansow"
Marketplace: "Salvator - agent finansowy. 4.8/5, 200+ pobranie.
             Zawiera: 5 skilli (budzet, inwestycje, raporty...),
             3 szablony notatek, konfiguracja stref vaulta."
[Zainstaluj] -> gotowe.

---

## 17. Monetyzacja

### Model biznesowy

1. **PKM Assistant Credits / Subskrypcja** (glowne zrodlo)
   - SaaS: user kupuje kredyty u nas
   - Ma dostep do WSZYSTKICH modeli AI z jednego miejsca
   - Nie musi myslec o API, kluczach, rozliczeniach
   - Zawsze najlepsze modele + wyrazne rekomendacje
     (ktory model do czego, ktory minion bedzie najlepszy)
   - Wdrozenie POZNO (dlugo po premierze) chyba ze sytuacja wymusi wczesniej

2. **"Buy me a coffee"** - od samego poczatku jako opcja

3. **Darmowe uzytkowanie** - ZAWSZE mozliwe
   - Wlasne API keys
   - Lokalne modele (zero kosztow)
   - Nasz SaaS to opcja dla "turbo leniwych" lub tych co chca wygode
   - Przy dzialajacym systemie MAIN+Minion moze byc nawet BARDZIEJ oplacalna

### Filozofia

- Plugin jest open-source i DARMOWY
- Monetyzacja to wartosc dodana, nie paywall
- Furta na SUPER tanie uzytkowanie (lokalne modele, tanie miniony)
- Sluzy tez: mniej technicznym userom (Easy mode)

---

## 18. Docelowy uzytkownik

### Glowny target

- **Knowledge workers** - ludzie ktory buduja baze wiedzy w Obsidianie
- **Non-programisci** - plugin musi byc PROSTY
- **Ludzie chcacy AI "z charakterem"** - nie generyczny chatbot
- **Nowi w Obsidianie** - Jaskier jako mentor PKM


### Scenariusze uzycia

1. **Codzienne zarzadzanie** - "co dzis robimy?", planowanie, refleksja
2. **Tworzenie tresci** - artykuly, posty, scenariusze
3. **Zdrowie/wellness** - dziennik nastroju, nawyki, sen
4. **Nauka** - organizacja kursow, notatek, materialow
5. **Biznes** - CRM, projekty, finanse, social media
6. **Budowa vaulta** - szablony, skrypty, automatyzacje
7. **Podroze** - planowanie, dziennik, checkllisty

---

## 19. Architektura (pelna)

```
┌─────────────────────────────────────────────────────┐
│                  PKM ASSISTANT PLUGIN                 │
├─────────────────────────────────────────────────────┤
│  UI LAYER                                            │
│  Chat │ Agent Manager │ Marketplace │ Settings       │
│  Agent Sidebar │ Inline Comments │ Skill Buttons     │
│  Todolists │ Creation Plans │ Thinking Block         │
│  Image/Video Preview │ Voice Input │ Animations      │
├─────────────────────────────────────────────────────┤
│  CORE                                                │
│  AgentManager │ SkillEngine │ Komunikator            │
│  PermissionSystem │ VaultZones │ OnboardingWizard    │
│  MinionRunner │ MinionLoader │ SkillLoader           │
├─────────────────────────────────────────────────────┤
│  NARZEDZIA (MCP)                                     │
│  vault_read │ vault_write │ vault_search │ ...       │
│  memory_search │ memory_update │ memory_status       │
│  skill_list │ skill_execute │ minion_task             │
│  master_task │ agent_delegate │ agent_message         │
├─────────────────────────────────────────────────────┤
│  AI LAYER (4 modele per agent)                       │
│  Main Model │ Minion Model │ Embedding │ Master      │
│  Anthropic │ OpenAI │ DeepSeek │ Ollama │ OpenRouter │
├─────────────────────────────────────────────────────┤
│  PAMIEC                                              │
│  RollingWindow │ Summarizer │ RAG │ Sessions         │
│  Brain │ L1/L2 │ Komunikator │ Cross-Agent Memory    │
├─────────────────────────────────────────────────────┤
│  SKILLS + MINIONS                                    │
│  SkillLoader │ SkillRunner │ MinionLoader            │
│  MinionRunner │ MarketplaceClient                    │
└─────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  VAULT STORAGE (.pkm-assistant/)                     │
│  agents/{name}/memory/ │ agents/{name}/playbook.md   │
│  agents/{name}/vault_map.md │ skills/ │ minions/     │
│  komunikator/ │ marketplace/ │ config.yaml           │
└─────────────────────────────────────────────────────┘
```

---

## 20. Kamienie milowe

### v0.x - Fundament [JESTESMY TUTAJ]
- [x] Fork Smart Connections v4.1.7
- [x] Chat z AI dziala w Obsidianie
- [x] System agentow (Jaskier + Dexter + Ezra wbudowani)
- [x] MCP tools (12 narzedzi: vault + memory + skille + minion_task)
- [x] System uprawnien
- [x] Pamiec hierarchiczna (fazy 0-7 DONE)
- [x] Minion model (konfigurowalny per agent)
- [x] Skill Engine (centralna biblioteka, MCP tools, guziki UI)
- [x] Minion per agent (auto-prep + minion_task, 3 starter miniony)
- [x] Rebranding UI (Smart Connections -> PKM Assistant)
- [ ] Stabilizacja - codzienne uzytkowanie bez bledow

### v1.0 - Publiczne wydanie
- [ ] Architektura 4 modeli (Main, Minion, Embedding, Master)
- [ ] Playbook + Vault Map per agent (minion jako bibliotekarz)
- [ ] Agent Creator/Manager panel (pelna kontrola nad agentami)
- [ ] Komunikator (wiadomosci miedzy agentami)
- [ ] Delegacja agentow (przelaczanie z kontekstem)
- [ ] Rozszerzony chat: todo listy, extended thinking, animacje
- [ ] Inline komentarze (prawy przycisk -> asystent)
- [ ] Creation plans (artefakty w chacie)
- [ ] Onboarding wizard (konfiguracja API/Ollama + Jaskier wdrazanie)
- [ ] Solidna obsluga bledow + dokumentacja

### v1.5 - Rozszerzenia
- [ ] Marketplace (zakladka w pluginie)
- [ ] Mobile support (Obsidian Mobile z minionami)
- [ ] Zaawansowana pamiec (adaptive retrieval, knowledge modules, feedback)
- [ ] Debata agentow (multi-chat)
- [ ] Poprawa embeddingu dla dlugich notatek

### v2.0 - Deep AI + Monetyzacja
- [ ] **PKM SaaS (Easy mode)** - konto, kredyty/subskrypcja, wszystkie modele
- [ ] PLLM personalization (profil usera ewoluujacy w czasie)
- [ ] Fine-tuning / LoRA adaptery
- [ ] Multi-modal (zdjecia, video, voice, transkrypcja, grafika, muzyka)
- [ ] Concept routing (automatyczne tagowanie)

---

## 21. Pomysly na przyszlosc (backlog - sesja 25)

### Agora (tablica aktywnosci agentow)
Wspolne miejsce w vaultcie (np. `.pkm-assistant/agora.md`) gdzie kazdy agent wpisuje co zrobil
z userem. Cos jak publiczny devlog, ale w wersji ludzkiej. Dzieki temu kazdy agent wie co sie
dzialo - nawet jesli nie uczestniczyl w rozmowie. Roznica vs komunikator: komunikator to 1-do-1,
agora to broadcast dla wszystkich.

### Panel artefaktow
Zakladka lub rozwijane mini-menu w chacie, ktore pokazuje wszystkie artefakty z sesji:
todo listy, plany kreacji, stworzone pliki. User nie gubi sie w dlugim chacie
i ma szybki dostep do wszystkiego co agent stworzyl.

### Manualna edycja planow i todo
User moze recznie edytowac kroki planu i elementy todo listy bez posrednictwa AI.
Dodawanie, usuwanie, zmiana kolejnosci, edycja tekstu - bezposrednio w widgecie.
Powiazane z panelem artefaktow.

### Alert o tworzeniu/usuwaniu plikow
Wyrazniejsze powiadomienia gdy agent tworzy lub usuwa notatki w vaultcie.
Approval system juz istnieje, ale potrzebuje lepszego UI - moze modal z podgladem
zmian zanim zostaną zastosowane.

### Bezpieczenstwo: Prompt Injection + Path Traversal (audyt sesja 25)
Audyt wykazal ze plugin nie sanityzuje tresci wstrzykiwanych do promptow AI. Notatki,
pamiec (brain.md), skille, playbooki, wiadomosci miedzy agentami - wszystko trafia do
promptu bez zadnej walidacji. Atakujacy (lub przypadkowa tresc w notatce) moze zmanipulowac
zachowanie agenta. Dodatkowo: vault_delete nie ma ochrony sciezek, adapter fallback omija
zabezpieczenia, sciezki nie sa normalizowane (../ dziala).

Rozwiazania:
- Separatory niezaufanej tresci w promptach ("BEGIN UNTRUSTED / END UNTRUSTED")
- Normalizacja i walidacja sciezek we wszystkich vault toolach
- Wykrywanie wzorcow injection w brain.md i treściach z vaulta
- Approval z podgladem tresci (nie tylko dlugosci)
- Audit log zmian plikow

Priorytet: przed publicznym release (FAZA 7). Przy early access (znajomi) ryzyko minimalne.

---

## 22. Co JUZ jest zrobione (status 2026-02-22, sesja 18)

Pelna lista w STATUS.md. Najwazniejsze:
- Plugin dziala, chat dziala, Jaskier dziala
- 12 MCP tools (vault + memory + skille + minion_task)
- Pamiec hierarchiczna (brain, sesje, L1/L2, RAG)
- Skill Engine: centralna biblioteka, ladowanie, MCP tools, guziki UI
- Minion per agent: auto-prep + minion_task, 3 starter miniony
- Settings persistence, platform auto-detection
- Rebranding UI (Smart Connections -> PKM Assistant)
- **Nastepny krok:** playbook.md + vault_map.md per agent (minion jako bibliotekarz)

---

*Wizja skonsolidowana z: stara WIZJA.md, wizja usera z sesji 11,
badania PLLM, analiza Pinokio, analiza vaulta usera.*
*Ten plik opisuje DOKAD zmierzamy, nie CO juz zrobiono (to jest w STATUS.md)*
