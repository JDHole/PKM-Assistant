# PKM Assistant - Wizja Finalnego Produktu

> **Kopiuj ten plik do czatu z AI** zeby dac kontekst o tym DOKAD zmierzamy.
> Ostatnia aktualizacja: 2026-02-23 (sesja 29)

---

## Jednym zdaniem

**Platforma do budowania wlasnych agentow AI w Obsidianie** - z pelna przejrzystoscia
i kontrola nad kazdym elementem promptu. Kazdy agent z wlasna osobowoscia, pamiecia,
umiejetnosciami i minionem, ktorzy pomagaja budowac i zarzadzac baza wiedzy (PKM) uzytkownika.

### Filozofia produktu

**Inteligencja agenta = suma wszystkich tekstow ktore trafiaja do API.**
Skill, prompt, opis narzedzia, pamiec - to wszystko jest tekst.
User ma pelna kontrole nad kazdym kawalkiem tego tekstu.
Jaskier pomaga to skladac efektywnie.

Zadne z istniejacych narzedzi AI (Claude Code, Cursor, Antigravity) nie daje
userowi wgladu w to co sie dzieje pod maska. User nie widzi system promptu.
Nie wie jakie instrukcje dostaje model. Nie moze tego zmienic.

**PKM Assistant mowi: "Tu nie ma magii. Twoj agent to prompt. Oto z czego sie sklada. Zmien co chcesz."**

To jest fundamentalnie inne podejscie niz reszta rynku. Dajemy userowi:
1. **Strukture** - agent, skill, playbook, brain, opisy narzedzi
2. **Narzedzia do budowania** - UI edycji, Jaskier jako mentor
3. **Automatyzacje** - auto-prep, pamiec, artefakty
4. **Przejrzystosc** - user WIDZI co idzie do API

### Kluczowa zasada

Inteligencja agenta NIE zalezy od wielkosci modelu.
Agent z malym 11B modelem offline powinien dzialac prawie tak dobrze
jak agent z Opus 4.6, bo moc bierze ze **skilli, pamieci i minionow** - nie z samego LLM.

Jaki prompt bedzie - to zalezy od uzytkownika i jego modelu.
My dajemy jasna droge: "Patrz, masz agenta, ale to nic wiecej niz jeden prompt.
Ten prompt musi zawierac A, B, C... Z, zeby dal Ci oczekiwany rezultat.
Teraz patrz - tu masz WSZYSTKIE MOZLIWE OPCJE zmiany tego promptu.
Baw sie, a Jaskier pomoze Ci to robic skutecznie."

### Skala promptu - ile mamy do dyspozycji *(nowe - sesja 29)*

Dla porownania: Claude Code wysyla ~33,000 tokenow opisu narzedzi w KAZDYM zapytaniu.
Nasz plugin uzywa ~5,000 tokenow na CALY kontekst (system prompt + pamiec + narzedzia).
To znaczy ze mamy OGROMNY zapas na rozbudowe promptow bez wplywu na koszty.

**Opisy narzedzi to ukryty fundament jakosci:**
Kazde narzedzie AI wysyla do API szczegolowe opisy swoich toolow. Claude Code poswięca
~16,800 tokenow TYLKO na opisy 18 narzedzi. Dlatego model wie kiedy jakiego narzedzia
uzyc i jak. Im lepszy opis → tym mniej model zgaduje → tym mniej tokenow marnuje na bledy.
To jest **niewidoczny ale kluczowy element** jakosci agenta.

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

- **Jaskier** - jedyny wbudowany agent. Glowny orkiestrator, zna caly system, widzi wszystko.
  Pomaga userowi zbudowac pierwszego wlasnego agenta i prowadzi przez system.
- **Dexter** i **Ezra** to **archetypy/szablony** - gotowe osobowosci do uzycia przy tworzeniu
  nowych agentow, ale nie sa zainstalowani domyslnie.

### Jak powstaja nowi agenci

1. **Z Jaskierem** - user opisuje jakiego agenta chce, Jaskier pomaga go stworzyc
   (personality, uprawnienia, strefy, skille) - skill "create-agent" prowadzi caly proces
2. **Z Agent Managera** - panel UI do recznego tworzenia (formularz z zakladkami)
3. **Z marketplace** - gotowi agenci do sciagniecia jednym klikiem (przyszlosc)

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

### 6 kluczowych luk w systemie agentow *(zidentyfikowane - sesja 28/29)*

> Te punkty definiuja roznice miedzy "dekoracyjnym" a "prawdziwym" agentem.

**3a. Rola agenta musi wplywac na prompt + narzedzia**
Teraz: rola agenta (np. "vault builder") to dekoracja - kazdy agent dostaje te same narzedzia
i ten sam format system promptu. Docelowo: rola determinuje KTORE narzedzia sa aktywne,
JAKIE instrukcje sa w prompcie, JAK agent sie zachowuje.

**3b. Archetypy musza budowac CALEGO agenta**
Teraz: archetyp daje 1 linijke personality. Docelowo: archetyp to pelny szablon -
system prompt + lista skilli + konfiguracja miniona + playbook + vault_map + uprawnienia.
User klika "Dexter" i dostaje gotowego, skonfigurowanego agenta.

**3c. Playbook/vault_map jako czesc procesu tworzenia**
Tworzenie agenta MUSI obejmowac: "jakie pliki znasz? jakie narzedzia uzywasz?
jakie sa Twoje procedury?" - nie tylko "jak sie nazywasz i jaki masz emoji".

**3d. Uprawnienia → agent musi WIEDZIEC o swoich ograniczeniach**
Teraz: uprawnienia sa egzekwowane ale agent NIE WIE ze ich nie ma.
Wywoluje vault_delete, dostaje odmowe, probuje znowu. Docelowo: system prompt
mowi agentowi "NIE masz prawa usuwac plikow" - agent nawet nie probuje.

**3e. Focus folders → twarde blokowanie, nie miekka sugestia**
Teraz: vault_map.md mowi "masz dostep do Projects/" ale agent moze czytac wszedzie.
Docelowo: vault_read/list/search respektuja focus folders - agent FIZYCZNIE nie widzi
plikow poza swoimi strefami.

**3f. System prompt → rozbudowa z ~500 do ~2000+ tokenow**
Teraz: system prompt jest lekki (~500 tok). Za lekki. Docelowo: pelne instrukcje
zachowania, lista narzedzi z opisami, uprawnienia, kontekst roli, procedury.
Mamy zapas tokenow (patrz: Skala promptu) - warto go wykorzystac.

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

### Skille v2 - rozszerzenia *(nowe - sesja 29)*

**Per-agent wersje skilli:**
Globalna biblioteka skilli + mozliwosc per-agent copy. Agent ma swoja wersje skilla
ktora moze modyfikowac (np. Lexie ma "write-article" z innym stylem niz Jaskier).

**Auto-inject listy skilli do system promptu:**
Agent musi WIEDZIEC jakie skille ma dostepne - lista z krotkimi opisami
wstrzykiwana do system promptu (nie tylko guziki w UI).

**Kreator skilli w UI:**
Formularz do tworzenia skilla: nazwa, opis, prompt, kategoria, opcjonalny JS.
Alternatywa: Jaskier prowadzi przez tworzenie skilla rozmowa.

**Workflow engine:**
Skill moze definiowac SEKWENCJE: klik → minion zbiera kontekst → master planuje →
main realizuje. Kazdy krok automatycznie przekazuje wynik do nastepnego.

**Pytania uzupelniajace:**
Skill moze definiowac "zapytaj usera o X, Y, Z zanim zaczniesz" -
agent wie jakie informacje zebrac przed uruchomieniem skilla.

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

### MasterRunner - pelny ekosystem Mastera *(nowe - sesja 29)*

Master ma taki sam ekosystem jak Minion - nie jest jednorazowym wywolaniem:

```
.pkm-assistant/agents/{agent}/
├── minion.md      <- instrukcje dla miniona (juz jest)
└── master.md      <- instrukcje dla mastera (NOWE)
```

**master.md** - notatka techniczna Mastera:
- Kiedy Master jest potrzebny (typy zadan)
- Jak przygotowac kontekst (co zbierac z vaulta/pamieci)
- Format odpowiedzi (co Master powinien zwrocic)
- Ograniczenia i zasady

**MasterRunner** (wzor: MinionRunner):
- Auto-prep: zbiera kontekst ZANIM wysle do Mastera
- Tool-calling loop: Master moze uzywac narzedzi (vault_read, memory_search)
- Pelna petla agentowa (streamToCompleteWithTools)
- Typing indicator: "Master analizuje..."

Roznica vs obecny master_task:
- Teraz: jednorazowe wywolanie → Master dostaje prompt → odpowiada raz
- Docelowo: pelna petla → Master moze pytac o dodatkowe dane → iteruje → zwraca wynik

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

### Opisy narzedzi - ukryty fundament jakosci

Kazde narzedzie AI (Claude Code, Cursor, Antigravity) wysyla do API **szczegolowe opisy**
kazdego narzedzia. Claude Code poswięca ~16,800 tokenow TYLKO na opisy 18 narzedzi.
To dlatego model wie kiedy jakiego narzedzia uzyc i jak.

Nasz plugin musi robic to samo - kazdy MCP tool potrzebuje:
- **Co** robi (krotki opis)
- **Kiedy** go uzywac (a kiedy uzyc czegos innego)
- **Jak** go uzywac (przyklady parametrow)
- **Czego NIE robic** (pulapki, ograniczenia)
- **Alternatywy** (jesli to nie pasuje, uzyj tamtego)

Im lepszy opis narzedzia → tym mniej model zgaduje → tym mniej sie zapetla → tym mniej
tokenow marnuje na bledy. Dluzszy opis zzera wiecej tokenow na starcie, ale OSZCZEDZA
potem bo model nie robi 3 nieudane proby zanim trafi.

**Kluczowe:** User ma pelny wglad w opisy narzedzi i moze je edytowac.
To jest czesc filozofii "tu nie ma magii" - user widzi DOKLADNIE co agent wie o swoich narzedziach.

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

### Model embeddingów i wyszukiwanie semantyczne

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

### VaultIndex - semantyczne przeszukiwanie vaulta *(nowe - sesja 29)*

Embedding model jest uzywany nie tylko do RAG (kontekst z przeszlych sesji),
ale do **pelnego semantycznego przeszukiwania** calego vaulta i pamieci agenta.

**VaultIndex** - centralny indeks embeddingów notatek:
- Przy starcie pluginu: skanuje vault, embeduje notatki
- Przechowuje: `.pkm-assistant/embeddings/vault-index.json`
- Przyrostowe: zmieniona notatka → odswiezy tylko jej embedding(i)
- Obserwuje zmiany: `app.vault.on('modify', ...)` → auto-update

**Block splitting - dlugie notatki NIE sa pomijane:**
Vault moze zawierac ksiazki, dlugie artykuly, notatki z dziesiatkami sekcji.
Model embeddingowy ma limit tokenow (512-8192 w zaleznosci od modelu).
Tekst dluzszy niz limit jest UCINANY - model nie widzi reszty!

Rozwiazanie: VaultIndex dzieli dlugie notatki na **bloki po naglowkach** (`## ...`).
Kazdy blok dostaje wlasny embedding. Dzieki temu wyszukiwanie znajduje
**konkretny fragment** dlugiej notatki - nie tylko poczatek.

```
Notatka "Ksiazka o PKM" (8000 slow, 15 sekcji)
  ↓ split po ## naglowkach
  ↓
Blok 1: "## Wprowadzenie" (400 slow) → embedding_1
Blok 2: "## Metoda Zettelkasten" (600 slow) → embedding_2
Blok 3: "## Linking vs Tagging" (500 slow) → embedding_3
...
Blok 15: "## Podsumowanie" (300 slow) → embedding_15
```

Kazdy blok pamieta: plik zrodlowy + naglowek + pozycja.
Krotkie notatki (< limit tokenow modelu) → jeden embedding na caly plik.
To jest inspirowane Smart Blocks z SC, ale bez frameworka (~30 LOC splitter vs tysiace LOC SC)

**vault_search (semantyczny):**
- Agent pyta "jak organizowac notatki" → embeduje pytanie → szuka w VaultIndex
- Zwraca notatki SEMANTYCZNIE podobne (nie tylko textowe dopasowanie)
- Fallback na indexOf jesli model embeddingowy niedostepny
- Wyniki posortowane po trafnosci (similarity score)

**memory_search (semantyczny):**
- To samo ale przeszukuje pamiec agenta (sesje, brain.md, L1/L2)
- Agent: "co robilem wczoraj" → znajduje sesje z wczorajsza data + powiazane tematy

**Dlaczego to fundamentalne:**

| Zapytanie agenta | Bez embeddingów (indexOf) | Z embeddingami (semantyczny) |
|---|---|---|
| "organizacja notatek" | Szuka DOKLADNIE tych slow | Znajduje "System zarzadzania wiedza", "Jak porzadkowac vault" |
| "co robilem wczoraj" | Szuka slowa "wczoraj" | Znajduje sesje z datami + powiazane notatki |
| "projekty z klientami" | Szuka frazy "projekty z klientami" | Znajduje "Lista zlecen", "CRM notatki", "Fakturowanie" |

To jest roznica miedzy **glupim** a **inteligentnym** wyszukiwaniem.
Embedding model (4. slot) pracuje w tle, a agent dostaje trafne wyniki bez marnowania tokenow.

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

## 7. Komunikacja miedzy agentami [ZAIMPLEMENTOWANE]

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

### Zaimplementowane (sesje 23-26)
- KomunikatorManager: pliki inbox per agent, parsowanie, zapis, markAsRead
- MCP tools: agent_message (wyslij), agent_delegate (deleguj z kontekstem)
- Delegacja: agent proponuje przelaczenie → przycisk w UI → sesja zapisana → nowy agent z kontekstem
- CommunicatorView: inline w sidebarze (nie modal)
- Context menu w notatce: "Wyslij do asystenta"
- Minion czyta inbox przy auto-prep

### Debata agentow (przyszlosc)

Mozliwosc rozmowy z KILKOMA agentami NARAZ:
- Kazdy agent ma podpiety swoj LLM
- Generuja odpowiedzi na podstawie rozmowy
- User uczestniczy jako moderator
- Przydatne do: burzy mozgow, decyzji, ewaluacji pomyslow

---

## 8. Agent Manager / Creator Panel [ZAIMPLEMENTOWANE]

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

**To jest serce filozofii "tu nie ma magii"** - user widzi KAZDY element
ktory sklada sie na prompt agenta i moze go zmienic.

### Zaimplementowane (sesje 22-26)
- AgentProfileView: 5 zakladek inline w sidebarze (Profil, Uprawnienia, Umiejetnosci, Pamiec, Statystyki)
- Agent Creator: formularz + tworzenie przez rozmowe z Jaskierem (skill create-agent)
- Usuwanie agenta z archiwizacja pamieci
- Tylko Jaskier built-in, Dexter/Ezra to archetypy/szablony
- SidebarNav: stack-based nawigacja (push/pop/replace/goHome) - zero modali
- Zaplecze (Backstage): listy skilli, narzedzi MCP (6 grup), minionow
- Cross-referencing: z profilu agenta do skilla/miniona i odwrotnie
- Edycja plikow ukrytych (brain.md, playbook.md) bezposrednio z UI

---

## 8b. Przejrzystosc promptu *(nowe - sesja 29)*

> **Serce filozofii "tu nie ma magii"** - user widzi DOKLADNIE co idzie do API.

### Problem

Zadne z istniejacych narzedzi AI (Claude Code, Cursor, Antigravity, ChatGPT)
nie pokazuje userowi PELNEGO promptu ktory trafia do modelu. User nie wie:
- Jaki system prompt dostaje model
- Jakie opisy narzedzi sa wstrzykiwane (i ile tokenow to zjada)
- Jaki kontekst z pamieci/playbooka trafia do promptu
- Jak wyglada pelna wiadomosc po dodaniu artefaktow, skilli, RAG

PKM Assistant to zmienia. **User widzi KAZDY element promptu.**

### Podglad pelnego promptu

Przed wyslaniem wiadomosci do API user moze zobaczyc:
1. **System prompt** - osobowosc agenta, zasady, instrukcje
2. **Brain context** - co agent pamieta o userze
3. **Auto-prep** - wynik pracy miniona (kontekst z vaulta/pamieci)
4. **Tool descriptions** - opisy WSZYSTKICH narzedzi (ile tokenow kazdy zjada!)
5. **Aktywne artefakty** - todo/plany wstrzykiwane do promptu
6. **Aktywny skill** - jesli uruchomiony
7. **RAG context** - relevantny kontekst z przeszlych sesji
8. **Historia czatu** - kompresowana vs pelna

### Edycja kazdego elementu

User NIE TYLKO widzi - moze **edytowac**:
- Zmienic system prompt agenta
- Wylaczyc/wlaczyc poszczegolne elementy (np. wylacz RAG, wylacz opisy narzedzi)
- Zmodyfikowac opisy narzedzi (krotsze/dluzsze/dokladniejsze)
- Dodac/usunac instrukcje
- Jaskier pomaga optymalizowac prompt ("za duzo tokenow na narzedzia, skrocmy to")

### Metryki

W podgladzie widoczne:
- **Liczba tokenow** per element (system prompt: 450 tok, tools: 2100 tok, ...)
- **Calkowity koszt** wywolania (ile tokenow input/output, ile to kosztuje)
- **Cache hit** - ile tokenow jest z cache vs swiezych

To nie jest feature "dla zaawansowanych" - to jest **fundamentalna cecha produktu**.
Kazdy user powinien rozumiec z czego sklada sie jego agent.

## 8c. Oczko - swiadomosc aktywnej notatki *(nowe - sesja 29)*

> Agent wie co user ma otwarte w edytorze.

### Jak to dziala

Agent widzi **aktywna notatke** (ta ktora user wlasnie edytuje/czyta):
- `app.workspace.getActiveFile()` → sciezka i metadane
- Kontekst aktywnej notatki wstrzykiwany do promptu agenta
- Agent moze odniesc sie do tego co user wlasnie robi

### Scenariusze

1. User edytuje notatke "Projekt X" → pyta agenta "co o tym wiesz?" →
   agent WIE ze chodzi o Projekt X (bez koniecznosci podawania nazwy)
2. User czyta dziennik → agent proponuje "Chcesz podsumowac dzisiejszy dzien?"
3. User jest w folderze Projects/ → agent automatycznie skupia sie na projektach

### Konfiguracja

- Toggle w UI: wlacz/wylacz Oczko
- Gdy wylaczone: agent nie widzi co user ma otwarte
- Gdy wlaczone: kontekst aktywnej notatki (tytul, pierwsze ~500 tokenow, frontmatter)
  wstrzykiwany jako dodatkowy element promptu

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

### Obsidian API goldmine *(nowe - sesja 29)*

Obsidian udostepnia potezne API ktore agent moze wykorzystac:

**metadataCache** - graf wiedzy calego vaulta:
- Wszystkie tagi, backlinki, frontmatter properties
- Agent moze pytac "jakie notatki linkuja do X?" bez czytania plikow
- Mozliwosc budowania mapy powiazan calego vaulta

**app.commands** - orkiestracja calego ekosystemu Obsidiana:
- Dostep do SETEK polecen z zainstalowanych pluginow (QuickAdd, Templater, Dataview)
- Agent moze "kliknac" dowolne polecenie - jak user z klawiatury
- Np. "Stworz notatke z szablonu Daily Note" = jedno polecenie

**fileManager** - inteligentne operacje na plikach:
- Rename z automatycznym update backlinków (Obsidian to robi natywnie!)
- Agent przenosi/zmienia nazwe notatki - linki sie nie psuja

**obsidian_command MCP tool** (~50 LOC):
- Nowy tool dajacy agentowi dostep do commands API
- Agent moze uruchomic DOWOLNE polecenie Obsidiana
- Jeden tool = dostep do setek funkcji z pluginow

---

## 10. Inline interakcja z agentem [ZAIMPLEMENTOWANE]

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

### Zaimplementowane (sesja 25)
- InlineCommentModal: context menu "Komentarz do Asystenta" na zaznaczonym tekscie
- Agent dostaje: zaznaczony fragment + komentarz usera + sciezke pliku
- Agent poprawia fragment bezposrednio w pliku
- Dodatkowo: "Wyslij do asystenta" (SendToAgentModal) - wysyla zaznaczenie do wybranego agenta

---

## 11. Rozszerzony chat [WIEKSZOSĆ ZAIMPLEMENTOWANE]

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

### System artefaktow [ZAIMPLEMENTOWANE - sesje 25-27]

Artefakty to trwale obiekty tworzone przez agenta w chacie (todo listy, plany kreacji).
Zyja GLOBALNIE - niezaleznie od sesji i agenta. Przetrwaja restart pluginu.

**ArtifactManager** - centralny menedzer artefaktow:
- Zapis: `.pkm-assistant/artifacts/{slugified-title}.json` (czytelne nazwy plikow)
- Slugify: polskie znaki → ASCII (ą→a), spacje → myslniki, kolizje → suffix _2/_3
- Auto-save: kazda zmiana (checkbox, edycja, dodanie) od razu na dysk
- Migracja: stare per-agent artefakty przenoszone automatycznie
- Metadata: createdBy, createdAt, updatedAt w kazdym JSON
- Restore: ladowanie WSZYSTKICH artefaktow przy starcie pluginu

**Todo listy v2:**
- MCP tool `chat_todo` (create/update/add_item/remove_item/save/list)
- Interaktywny widget: checkboxy, pasek postepu, animacje
- Inline edit (double-click), dodawanie (+), usuwanie (x)
- TodoEditModal: pelna edycja tytulu i elementow
- Agent odznacza automatycznie w trakcie pracy

**Plany kreacji v2:**
- MCP tool `plan_action` (create/update_step/add_subtask/toggle_subtask/get/list)
- Widget: numerowane kroki, cykl statusow (klik zmienia), komentarze
- **Subtaski**: kazdy krok ma checklistę podzadan `[{text, done}]`
- PlanEditModal: pelna edycja kroków, statusow, subtaskow
- Przycisk "Zatwierdz plan" → agent zaczyna realizacje

**Panel artefaktow (toolbar):**
- Prawy pasek w chacie: ikony 📦 artefakty, ⚡ skille, ⚙️ tryby
- Overlay z lista WSZYSTKICH artefaktow (todo + plany)
- Pogrupowanie po typach, badge agenta twórcy
- Klik → modal edycji, kopiowanie do vaulta, usuwanie
- Artefakt discovery: summary wstrzykiwane do system promptu agenta

**Delegacja + artefakty:**
- Przy delegacji agenta aktywne todo/plany automatycznie przekazywane
- Nowy agent widzi artefakty z poprzedniej rozmowy

### Chat v2 - rozszerzenia *(nowe - sesja 29)*

**Transparentnosc minion/master:**
Dzialania miniona i mastera widoczne w chacie jako osobne bloki
(jak thinking block ale dla delegacji). User widzi co robi minion w tle.

**Odejscie od dymkow → styl Claude Code:**
Chat nie musi wygladac jak WhatsApp. Inspiracja: Claude Code - czytelny,
techniczny styl z sekcjami, narzędziami i kodem. Lepszy do pracy.

**Pelny zapis sesji:**
Totalnie WSZYSTKO co sie dzieje w sesji: system prompt, tool calls z inputem/outputem,
thinking, minion/master, timestamps. Plik .md do analizy i debugowania.

**Dokladny token counter:**
Nie szacowany - brany z API response `usage` field. Pokazuje:
input tokens, output tokens, cached tokens, koszt wywolania.

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

### Rozbudowana prywatnosc *(nowe - sesja 29)*

**Wykrywacz wrazliwych danych:**
Regex na hasla, klucze API, numery kart, dane osobowe.
Ostrzezenie ZANIM dane trafi do cloud API. Automatyczne maskowanie.

**Blacklist plikow/folderow:**
User mowi "ten folder NIGDY nie idzie do AI" - nawet jesli agent poprosil.
Konfiguracja w Agent Manager lub globalnie.

**Wykrywanie prompt injection:**
Skanowanie tresci z vaulta ZANIM zostanie wstrzyknieta do promptu.
Wzorce: "IGNORE PREVIOUS", "OVERRIDE", "ACT AS" w notatkach.

**LOCAL vs CLOUD wskaznik:**
Przy kazdym modelu wyswietlany wskaznik czy dane wychodza na zewnatrz.
Lokalne modele (Ollama, LM Studio) = zielona ikona. Cloud = pomaranczowa.

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

## 14b. Per-agent theming *(nowe - sesja 29)*

Kazdy agent moze miec wlasny styl wizualny:

**CSS variables per agent:**
```css
--agent-primary: #4A90D9;    /* kolor glowny (Jaskier = zielony, Dexter = niebieski) */
--agent-bg: #1A2332;         /* tlo chatu */
--agent-accent: #FFD700;     /* akcent (linki, przyciski) */
```

**CSS injection z vaulta:**
Agent moze miec plik `theme.css` w swoim folderze - ladowany automatycznie
przy przelaczeniu agenta. User moze go edytowac.

**Design system PRZED budowaniem UI:**
Paleta kolorow, typografia, ikony, spacing - ustalone raz, uzywane wszedzie.
Zeby dodanie nowego widgetu nie wymagalo pisania CSS od zera.

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

### Niezaleznosc od Smart Connections ✅ *(DONE - sesje 30-32)*

Plugin jest FORKIEM Smart Connections v4.1.7. **Niezaleznosc od SC osiagnieta w v1.0.9.**

**Co zrobiono (sesje 30-32):**
- PKMPlugin.js zastepuje SmartPlugin (extends Obsidian Plugin bezposrednio)
- PKMEnv.js zastepuje SmartEnv (module-scoped PKM_SCOPE, zero window.smart_env)
- ObsekEmbeddingModels — subclass z dynamicznym default_provider_key
- 4 dostawcy embeddingów: Ollama, OpenAI, Gemini, LM Studio
- 15 SC ghost strings rebranded, 5 dead modules removed
- 30+ polskich notice'ow (PKMNotices), wlasny status bar
- Embedding dziala przez Ollama + snowflake-arctic-embed2 (23k blokow zaindeksowane)

**Co zostalo (backlog, nieblokujace):**
- external-deps/ nadal w repo (~6.8 MB build) — pelna ekstrakcja adapterow opcjonalna
- Adaptery czatowe/embeddingowe nadal importowane z external-deps/ (dzialaja, ale nie sa "nasze")

```
┌─────────────────────────────────────────────────────┐
│                  PKM ASSISTANT PLUGIN                 │
├─────────────────────────────────────────────────────┤
│  UI LAYER                                            │
│  Chat │ Agent Sidebar (SidebarNav) │ Settings        │
│  Artifact Panel + Toolbar │ Skill Buttons            │
│  Todolists v2 │ Creation Plans v2 │ Thinking Block   │
│  Inline Comments │ Communicator │ Backstage          │
│  AgentProfileView │ TodoEditModal │ PlanEditModal    │
│  Prompt Inspector │ Oczko Toggle                     │
│  Image/Video Preview │ Voice Input │ Animations      │
├─────────────────────────────────────────────────────┤
│  CORE                                                │
│  AgentManager │ SkillEngine │ ArtifactManager        │
│  KomunikatorManager │ PlaybookManager                │
│  PermissionSystem │ VaultZones │ OnboardingWizard    │
│  MinionRunner │ MinionLoader │ MasterRunner (TODO)   │
│  SkillLoader │ VaultIndex (TODO)                     │
├─────────────────────────────────────────────────────┤
│  NARZEDZIA (17 MCP tools)                            │
│  vault_read │ vault_list │ vault_write │ vault_delete │
│  vault_search (semantyczny) │ memory_search (sem.)   │
│  memory_update │ memory_status                       │
│  skill_list │ skill_execute                           │
│  minion_task │ master_task                            │
│  agent_message │ agent_delegate                       │
│  chat_todo │ plan_action                              │
├─────────────────────────────────────────────────────┤
│  ADAPTERY (wlasne - bez SC)                          │
│  ObsekPlugin │ ObsekItemView │ ObsekEnv              │
│  ObsekEmbedder │ SmartStreamer │ HTTP Adapter         │
│  11 adapterow: Anthropic │ OpenAI │ DeepSeek │       │
│  Gemini │ Groq │ OpenRouter │ Ollama │ LM Studio │   │
│  Azure │ xAI │ Custom                                │
├─────────────────────────────────────────────────────┤
│  AI LAYER (4 modele per agent)                       │
│  Main Model │ Minion Model │ Embedding │ Master      │
│  modelResolver → per agent lub globalny              │
├─────────────────────────────────────────────────────┤
│  PAMIEC + EMBEDDING                                  │
│  RollingWindow │ Summarizer │ RAG │ Sessions         │
│  Brain │ L1/L2 │ MemoryExtractor │ Cross-Agent (TODO)│
│  VaultIndex (TODO) │ EmbeddingHelper                 │
├─────────────────────────────────────────────────────┤
│  SKILLS + MINIONS + MASTER                           │
│  SkillLoader │ MinionLoader │ MinionRunner           │
│  MasterLoader (TODO) │ MasterRunner (TODO)           │
│  streamToCompleteWithTools │ MarketplaceClient (TODO) │
└─────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  VAULT STORAGE (.pkm-assistant/)                     │
│  agents/{name}/memory/ │ agents/{name}/playbook.md   │
│  agents/{name}/vault_map.md │ agents/{name}/master.md│
│  artifacts/ (global) │ embeddings/ (VaultIndex)      │
│  skills/ │ minions/ │ komunikator/                   │
│  marketplace/ (TODO) │ config.yaml                   │
└─────────────────────────────────────────────────────┘
```

---

## 20. Kamienie milowe

### v0.x - Fundament [PRAWIE GOTOWE]
- [x] Fork Smart Connections v4.1.7
- [x] Chat z AI dziala w Obsidianie
- [x] System agentow (Jaskier built-in, Dexter/Ezra jako archetypy)
- [x] MCP tools (17 narzedzi: vault + memory + skille + minion + master + komunikator + artefakty)
- [x] System uprawnien
- [x] Pamiec hierarchiczna (fazy 0-7 DONE)
- [x] Minion model (konfigurowalny per agent)
- [x] Skill Engine (centralna biblioteka, MCP tools, guziki UI)
- [x] Minion per agent (auto-prep + minion_task, 3 starter miniony)
- [x] Rebranding UI (Smart Connections -> PKM Assistant)
- [x] **Wyrzucenie Smart Connections** (sesje 30-32: PKMPlugin, PKMEnv, rebranding, embedding fix)
- [x] Stabilizacja — 6 bug fixow (sesja 32) + Logger + status bar + polskie notice'y

### v1.0 - Publiczne wydanie
- [x] Architektura 4 modeli (Main, Minion, Embedding, Master)
- [x] Playbook + Vault Map per agent (minion jako bibliotekarz)
- [x] Agent Creator/Manager panel (pelna kontrola nad agentami)
- [x] Komunikator (wiadomosci miedzy agentami)
- [x] Delegacja agentow (przelaczanie z kontekstem)
- [x] Rozszerzony chat: todo listy, extended thinking, animacje
- [x] Inline komentarze (prawy przycisk -> asystent)
- [x] Creation plans (artefakty w chacie)
- [x] System artefaktow (ArtifactManager, globalny, persistence, panel)
- [x] Sidebar Navigation (SidebarNav, Zaplecze, zero modali)
- [x] **Embedding dziala** (Ollama/snowflake-arctic-embed2, vault_search + memory_search semantyczne)
- [ ] **VaultIndex** (wlasny block splitting, optymalizacja — backlog)
- [ ] **Przejrzystosc promptu**: user widzi i edytuje CALY prompt ktory idzie do API
- [ ] **Oczko**: agent widzi aktywna notatke usera
- [ ] **MasterRunner**: pelny ekosystem Mastera (master.md, auto-prep, tool loop)
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

## 20b. Dokumentacja = Edukacja *(nowe - sesja 29)*

Dokumentacja to NIE afterthought - to feature produktu.

**Dymki tutoriali przy ustawieniach:**
Kazde ustawienie ma malego (i) z wyjasnieniem po polsku i angielsku.
Np. przy "Model Minion": "Tanszy model do pracy w tle. Szuka w vaultcie
i pamieci ZANIM agent odpowie. Rekomendacja: DeepSeek Chat lub Phi-3."

**Baza wiedzy dostepna agentom:**
Agenci maja dostep do dokumentacji pluginu jako skill/kontekst.
User pyta Jaskiera "jak dodac nowego agenta?" - Jaskier WIE
bo ma dokumentacje w swoim playbooku.

**Gra uczaca z milestones:**
System wyzwan z Jaskierem jako mentorem:
- "Stworz pierwszego agenta" → odblokuj archetypy
- "Napisz pierwszy skill" → odblokuj kreator skilli
- "Deleguj zadanie minionowi" → odblokuj MasterRunner
Milestones widoczne w Agent Manager + nagrody (custom CSS theme?).

---

## 21. Pomysly na przyszlosc (backlog)

### Agora (tablica aktywnosci agentow) *(backlog - sesja 25)*
Wspolne miejsce w vaultcie (np. `.pkm-assistant/agora.md`) gdzie kazdy agent wpisuje co zrobil
z userem. Cos jak publiczny devlog, ale w wersji ludzkiej. Dzieki temu kazdy agent wie co sie
dzialo - nawet jesli nie uczestniczyl w rozmowie. Roznica vs komunikator: komunikator to 1-do-1,
agora to broadcast dla wszystkich.

### ~~Panel artefaktow~~ [DONE - sesja 27]
~~Zakladka lub rozwijane mini-menu w chacie, ktore pokazuje wszystkie artefakty z sesji.~~
Zaimplementowany jako prawy toolbar + overlay z lista artefaktow. Opis w sekcji 11.

### ~~Manualna edycja planow i todo~~ [DONE - sesja 27]
~~User moze recznie edytowac kroki planu i elementy todo listy.~~
Zaimplementowane: inline edit, dodawanie, usuwanie, modalne pelnej edycji. Opis w sekcji 11.

### Alert o tworzeniu/usuwaniu plikow *(backlog - sesja 25)*
Wyrazniejsze powiadomienia gdy agent tworzy lub usuwa notatki w vaultcie.
Approval system juz istnieje, ale potrzebuje lepszego UI - moze modal z podgladem
zmian zanim zostaną zastosowane.

### ~~Przejrzystosc promptu~~ [PROMOTED - sesja 29]
~~Przeniesione do sekcji 8b jako pelna sekcja wizji (nie backlog).~~
Patrz: **sekcja 8b. Przejrzystosc promptu**

### Inline skille *(nowe - sesja 29)*
Konfigurowalne context menu per agent - kazdy agent ma swoje akcje w prawym przycisku.
Np. Lexie: "Popraw styl" | "Skroc o polowe" | "Przetlumacz na EN"
Agent sam definiuje jakie opcje sa dostepne na zaznaczonym tekscie.

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

## 22. Co JUZ jest zrobione (status 2026-02-23, sesja 29)

Pelna lista w STATUS.md. Podsumowanie:

### Fundament (FAZA 0)
- Plugin dziala w Obsidianie, chat dziala, build 6.8MB
- Rebranding: Smart Connections → PKM Assistant
- Wersja 1.0.7, wlasne wersjonowanie (reset z SC 4.1.7)

### 17 MCP tools
- Vault: read, list, write, delete, search
- Pamiec: memory_search, memory_update, memory_status
- Skille: skill_list, skill_execute
- Delegacja: minion_task, master_task
- Komunikator: agent_message, agent_delegate
- Artefakty: chat_todo, plan_action

### System agentow (FAZY 1-3 DONE)
- Skill Engine: centralna biblioteka, 4 starter skille, guziki UI, hot-reload
- Minion per agent: auto-prep + minion_task, 3 starter miniony, streamToCompleteWithTools
- Architektura 4 modeli: Main/Minion/Master/Embedding, modelResolver, 8 platform
- Playbook + Vault Map per agent, minion jako bibliotekarz
- Agent Manager: sidebar z nawigacja, 5 zakladek, creator, usuwanie, archetypy
- Tylko Jaskier built-in (Dexter/Ezra = szablony)

### Pamiec (FAZY 0-7 DONE)
- Brain.md, sesje, L1/L2 konsolidacja, RAG, MemoryExtractor
- Voice commands: "zapamietaj", "zapomnij", "co o mnie wiesz"
- Minion model do operacji pamieciowych

### Komunikator + Delegacja (FAZA 4 DONE)
- Inbox per agent, wiadomosci, delegacja z kontekstem
- CommunicatorView inline w sidebarze
- Context menu "Wyslij do asystenta"

### Rozszerzony chat (FAZA 5 ~90% DONE)
- Extended thinking (DeepSeek Reasoner + Anthropic)
- Todo listy v2 + Plany kreacji v2 z subtaskami
- System artefaktow: ArtifactManager, globalny, persistence, panel, discovery
- Inline komentarze z context menu
- Animacje CSS, tool call display z polskimi nazwami

### Sidebar Navigation (sesja 26)
- SidebarNav: stack-based push/pop/replace/goHome
- Zaplecze: listy skilli, narzedzi MCP, minionow
- Cross-referencing miedzy agentami, skillami, minionami
- Zero modali - wszystko inline

### Nastepny krok: OPISY MCP TOOLS + SYSTEM PROMPT *(priorytet — sesja 33)*

> **Kluczowy wniosek z sesji 28:** Kod jest GOTOWY w ~90%. Problem jest w PROMPTACH.
> To jest faza PROMPTOW i POLISH, nie faza kodu.

**DONE:**
- ~~Sprint S1: Wyrzucenie SC~~ ✅ (sesje 30-32, PKMPlugin/PKMEnv/rebranding/embedding)
- ~~Sprint S2: Embeddingi~~ ✅ (Ollama + snowflake-arctic-embed2, 23k blokow)
- ~~Stabilizacja~~ ✅ (6 bug fixow, Logger, status bar, polskie notice'y)

**Do zrobienia do v1.0 (sekwencja z PLAN_v2.md):**
1. Opisy MCP Tools — agent przestaje sie gubic (1-2 sesje, czysta praca tekstowa)
2. System Prompt — agent wie kim jest (1-2 sesje)
3. Oczko + obsidian_command — szybkie wygrane (1-2 sesje)
4. Przejrzystosc promptu — USP produktu (2-3 sesje)
5. Personalizacja Agenta — NAJWAZNIEJSZY GAP (3-4 sesje)
6. MasterRunner + Skills v2 (2-3 sesje)
7. Pamiec, UX, warstwa wizualna (3-5 sesji)
8. Dokumentacja + Onboarding (3-4 sesje)
9. Testowanie + Release v1.0 (2-3 sesje)

---

*Wizja skonsolidowana z: stara WIZJA.md, wizja usera z sesji 11,
badania PLLM, analiza Pinokio, analiza vaulta usera.*
*Zaktualizowana sesja 28: nowa filozofia produktu, status implementacji, system artefaktow.*
*Zaktualizowana sesja 29: SC removal jako priorytet #1, Sprint Roadmap, Prompt Transparency,
Oczko, MasterRunner, VaultIndex/semantyczny search, niezaleznosc od SC.*
*Zaktualizowana sesja 33: SC removal DONE, embeddingi DONE, stabilizacja DONE, roadmap wyrownany z PLAN_v2.md.*
*Ten plik opisuje DOKAD zmierzamy, nie CO juz zrobiono (to jest w STATUS.md)*
