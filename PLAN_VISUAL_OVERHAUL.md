# PLAN VISUAL OVERHAUL — Mega-redesign UI/UX

> **Cel:** Jeden wielki plan na calosciowa zmiane wizualna pluginu.
> **Inspiracja:** Design concept HTML (Antigravity) + Claude Code UI — nie kopiujemy 1:1, inspirujemy sie.
> **Zasada:** Kazdy punkt przegadujemy osobno przed implementacja. Dopoki user nie zatwierdzi KAZDEGO podpunktu — nie implementujemy.
> **Laczy:** Plany 2.10, 2.11, 2.12, 2.13 + nowe punkty (profil, ustawienia, sidebar, agora, ikony)

---

## FILOZOFIA — KRYSZTALY I DUSZE

> **Kazdy agent to krysztal Obsidiana z dusza w srodku.**
> Kazda wiadomosc, kazdy skill, kazdy MCP tool, kazda edycja prompta, kazdy minion — to czasteczki duszy dodawane do krysztalu.
> **FORMULARZYKI sa oknem do duszy krysztalu.** To przez nie user buduje agenta.
> Styl: minimalistyczny, schludny, profesjonalny — ale z tozsamoscia Crystal Soul.
> Dwa motywy: **Crystal Soul** (nasz, z kryształami i duszami) + **Classic** (standardowy Obsidian, dla nerdow).
> Teraz skupiamy sie na Crystal Soul. Classic pozniej.

### ZASADA TOTALNEJ ELIMINACJI EMOTIKON
- ZERO emoji w calym pluginie. Zadnych. Nigdzie.
- Wszystkie avatary agentow = unikalne krysztaly SVG (nie emoji)
- Wszystkie ikonki (skilli, procesow, menu, toolbar, chat) = wlasne SVG ikony
- Ikon musi byc DUZO i musza sie ROZNIC (wyobraz sobie 15 skilli x 13 agentow)
- Ikony musza byc spojne z konceptem krysztalow/dusz
- Ikony tematycznie powiazane: memory tools <-> memory skills, write tools <-> write skills, itd.

---

## REFERENCJE WIZUALNE (opisy screenow z sesji planowania)

> Screeny byly pokazywane w rozmowie planowania. Tutaj ich dokladne opisy dla kontekstu.

### REF-1: Obecny plugin — Tool Call Display (brzydki)
Rozowy header "Przeszukanie pamieci" z toggle i strzalka. Pod spodem sekcja "Input:" z surowym JSON-em (`{"query": "design wyglad interfejs UI..."}`). Ponizej "Output: (no output)". Na dole guzik "Kopiuj calosc". Ciemne tlo, kolorowe naglowki, surowe dane — wyglada amatorsko i nieczytelnie. TO JEST TO CO CHCEMY ZASTAPIC.

### REF-2: Claude Code — Chat UI (wzor dla naszego chatu)
Interfejs chatu Claude Code. User messages maja wyrazna obramowke/ramke — wyraznie odrozniaja sie od przestrzeni asystenta. Odpowiedzi asystenta to po prostu tekst w oknie — bez ciezkiej obramowki. Miedzy elementami (thinking, tool calls, odpowiedz) lacza sie KROPKI z PIONOWYMI LINIAMI — tworzac lancuch/flow. Calsc jest minimalistyczna, czysta, profesjonalna. Brak awatarow, brak emoji — czyste przedzielenie tresci.

### REF-3: Claude Code — Thinking indicator (wzor dla connectors)
Close-up na element "Thinking" w Claude Code: szara KROPKA (okragla, pelna) z napisem "Thinking" obok i malym chevronem (v) do rozwijania. Z kropki idzie PIONOWA LINIA w dol, laczaca z nastepnym elementem w lancuchu. Bardzo minimalistycznie — kropka + linia + tekst. U NAS: zamiast kropek beda male KRYSZTALKII (zaprojektowane przez nas, NIE diamenciki jak w obecnym koncepcie).

### REF-4: Claude Code — Loading animation (wzor dla animacji)
Pomaranczowa/koralowa ikona loading w Claude Code: ksztalt jak gwiazdka/asterisk z promieniami, ktora sie animuje — jakby "od srodka sie rozwija/pulsuje". U NAS: podobna koncepcja ale z krystalem — diament/krysztal ktory sie buduje od zewnatrz, albo migajacy glow narastajacy od srodka. Kolor animacji = kolor agenta (nie pomaranczowy).

---

## LEGENDA

- USTALONE = User zatwierdzil, decyzja podjeta
- ITERACYJNE = Ustalone ale szczegoly wizualne do dopracowania po pierwszej implementacji (user musi zobaczyc na zywo)
- DO ZAPROJEKTOWANIA = Trzeba zaprojektowac przed implementacja

---

## A. REDESIGN CHATU

### A1. Styl wiadomosci — USTALONE + ITERACYJNE
**Decyzja:** Wzorujemy sie na Claude Code (REF-2).
- Kompletnie olewamy obecny wyglad — robimy od nowa
- User bubble: WYRAZISTA OBRAMOWKA w kolorze agenta — nie delikatna! Mocno sie odroznia od przestrzeni agenta
  - Prawdopodobnie GLOW w kolorze agenta (ale user musi ZOBACZYC na zywo — glow vs border vs shadow)
- Agent response: jeden spojny blok z calym lancuchem akcji
  - Styl jak Claude Code (REF-2): tekst w oknie, BEZ ciezkiej obramowki
  - Male KRYSZTALKII (NIE diamenciki!) jako connectors miedzy elementami — jak kropki+linie w Claude (REF-3), ale nasze zaprojektowane krysztaly
  - Bardzo delikatna obramowka agenta (jesli w ogole) — glownie tekst w oknie
- Kolor agenta: JEDYNA RZECZ przy ktorej mozemy szalec — WSZYSTKIE kolory w chacie = kolor agenta
- Imie agenta: w zakladce wystarczy (nie potrzeba osobnego headera w bloku)
- Hover-timestamp: TAK — godzina + opcje
- Animacje przy wyslaniu wiadomosci PODOBNE do animacji przy zatwierdzaniu formularzy w profilu agenta

**ITERACYJNE (do dopracowania po implementacji):**
- Dokladny styl glow/border/shadow — user musi zobaczyc warianty na zywo
- Dokladny ksztalt krysztalkow-connectors — do dopracowania wizualnie

### A2 + A3. Transparentnosc akcji — USTALONE + ITERACYJNE
**Decyzja:** Jedna odpowiedz agenta = jeden blok z WSZYSTKIMI krokami.
- Kazda akcja: thinking, tool call, minion, master, skill, artifact
- Wszystko zwijalne (expandable rows) w jednym lancuchu
- Styl expandable: PODOBNY do Claude Code (REF-3) — moze z delikatna mini ramka (do zobaczenia na zywo)
- Domyslnie widoczna: nazwa + status (zwiniety)
- Kazda akcja opisana PO LUDZKU — nie surowy JSON (REF-1 to anty-wzor!)
- Ikony TEMATYCZNIE PODOBNE do akcji (pamiec = okreslony styl, szukanie = inny)
- Czas wykonania: tyle ile faktycznie trwa — mierzymy i pokazujemy
- WSZYSTKIE kolory = kolor agenta (minion, master, tool — ten sam kolor)
- Animacja w trakcie: krysztalkii-connector BUDUJE SIE od zewnatrz (albo glow narastajacy od srodka) — inspiracja REF-4, ale kolor agenta
- Connectors miedzy krokami: male krysztalkii + pionowe linie (jak REF-3 ale z krysztalkamii)

**ITERACYJNE:**
- Dokladny styl expandable row — do zobaczenia na zywo
- Mini ramka czy nie — do zobaczenia
- Styl animacji — testujemy warianty

### A4. Input area — USTALONE + ITERACYJNE
**Decyzja:** Wzorujemy sie na Claude Code input area.
- Input area PODSWIETLA SIE kolorem agenta — do przetestowania na zywo
- Kolor agenta wszedzie!

**Layout (ustalony):**
```
┌──────────────────────────────────────────────┐
│  TEXTAREA (zamyka gorna krawedz)             │
│                                              │
├──────────────────────────────────────────────┤
│  [Attachments chips]  [Mention chips]        │
├────────────── pionowa linia ─────────────────┤
│  Tryb | Oczko | Summ | Perm | MCP | Tok     │  attach  @  wyslij
└──────────────────────────────────────────────┘
```

- **Gorna czesc:** Textarea na calej szerokosci
- **Srodek:** Chip bar z zalacznikami i mentions (nad kreska)
- **Dolna czesc (pod kreska, od lewej):**
  - Tryb chatu (klick → dropdown/dropup z lista trybow)
  - Oczko / Preview (nazwa aktualnie wyswietlanej notatki pokazywanej agentowi)
  - Sumaryzacja (z kolkiem zapelnienia kontekstu)
  - Uprawnienia
  - MCP (ikona → DROPDOWN z lista wszystkich aktywnych MCP tooli z profilu agenta — nazwa + ikona)
  - Tokeny in/out
- **Dolna czesc (od prawej):** Zalacznik, Mentions, Wyslij

**ITERACYJNE:**
- Dokladne ikony guzikow — do dopracowania
- Podswietlanie kolorem agenta — testujemy czy nie przerost formy
- Jesli cos nie pasuje po implementacji — zmienimy

### A5. Token counter — USTALONE
**Decyzja:**
- Token counter =/= Context counter! Dwie ZUPELNIE rozne rzeczy.
- Dokladna ilosc tokenow in/out z API. Nic wiecej. Zadnego kosztu. Zadnej relacji z context counter.
- Format: **"1.2k in / 34.4k out"**
- Glowny model: widoczny ZAWSZE
- Minion + Master: panel monospace bezposrednio NAD licznikiem, chowa sie po kliknieciu gdziekolwiek
- Wyswietlany w INPUT AREA + na SLIM BARZE (gorna czesc)

**Kwestia techniczna:** Czy mozemy sami dokladnie liczyc kazdy token in/out zamiast polegac na API `usage`? (rozne dostawcy moga roznie). Do zbadania przy implementacji.

### A6. Animacje — USTALONE
**Decyzja:**
- Krysztaly, glowy, cienie przy minimalistycznych ksztaltach
- Jak NAJWIECEJ animacji — tematycznie pasujacych do kategorii ikon
- Animacje wyslania wiadomosci TAKIE SAME jak zatwierdzania formularzy w profilu — spojny jezyk
- WYJEBANE W MOBILE — desktop only (Mac/Windows)
- Typing indicator: "Krystalizuje..." z pulsujacym krystalem
- Loading w stylu REF-4 ale z naszym krystalem i kolorem agenta

### A7. Chat topbar — ZAKLADKI — USTALONE + ITERACYJNE
**Decyzja:**
- ZAKLADKI CHATOW z wieloma agentami naraz
- Kazda zakladka: krysztalkii/avatar agenta + nazwa + solidne akcenty koloru agenta
  - Imie wystarczy do rozpoznania + kolor/krysztal
- NIE zamykamy z zakladki — zamykanie OBOK guzika konsolidacji (gorna czesc slim bara)
- Maks ~10 zakladek — plynne skalowanie (rozna szerokosc)
- Overflow: SCROLL
- Guzik "+" przy ostatnim tabie → MODAL: GRID KRYSZTALOW z nazwami agentow
  - Aktywni (juz otwarci) NIE pokazuja sie
  - Nie mozna miec dwoch chatow z tym samym agentem
- Zakladki NIE pokazuja nic na hover

**Sesje:** Niepotrzebne w topbarze. Jedna dziennie, stare z profilu agenta.

**ITERACYJNE:** Styl zakladek — do zobaczenia na zywo.

---

## B. SLIM BAR (prawy toolbar) — USTALONE

### B1. Struktura slim bara

**GORNA CZESC (stala):**
- Artefakty i rzeczy zwiazane z zapisem chatu
- Reset chatu
- Konsolidacja pamieci
- Zapis sesji
- Zamykanie chatu (przeniesione z zakladek)
- LICZNIK TOKENOW in/out (NIE context!)

**DOLNA CZESC (rosnie od dolu):**
- Skille aktywnego agenta
- Jeden rzad ikon (mozliwe 2-3 jak potrzeba)
- Tylko ikony — nazwa + krotki opis PO NAJECHANIU (tooltip)
- Ikony: glify/sigile w kierunku kryształowym (nie plemienny!)
  - PAMIEC = bardziej OKRAGLE
  - SZUKANIE = bardziej TROJKATNE
  - ZAPIS = bardziej KWADRATOWE
  - Wariacje i polaczenia
- User MOZE zmienic ikone skilla (kategorie to nasza propozycja/default)
- Rozmiar: dopasowuje sie

---

## C. DESIGN SYSTEM

### C1. Paleta kolorow — USTALONE
- Plugin dziedziczy kolory z motywu Obsidiana — NIE nadpisujemy
- Jedyne kolory dodawane = kolory agentow i kolor usera

### C2. Per-agent theming — USTALONE
- 30-50 wariantow kolorow — FAKTYCZNIE CIEKAWE ODCIENIE (nie nudne)
- Wyraziste, unikalne barwy pasujace do Crystal Soul, z glowami
- Kolor ustawiany w Creatorze agenta (tab Persona)
- Kolor wszedzie: chat, sidebar, profil, input area
- User tez dostaje kolor — ustawiany w AGORZE
- Research kolorow przy implementacji
- Mocnosc akcentow: do przetestowania na zywo

### C3. Dark/Light mode — USTALONE
- Respektujemy motyw usera
- Audit w obu trybach
- Testowac z popularnymi themes

### C4. Motywy pluginu — USTALONE
1. **Crystal Soul** — budujemy TERAZ
2. **Classic** — POZNIEJ
- User moze wklejac wlasne motywy (plik CSS)
- Ustawienie: **Settings > Interfejs**
- Technicznie: osobny plik CSS per motyw

---

## D. REDESIGN PROFILU AGENTA — TOTALNA ZMIANA

### D0. Filozofia — USTALONE
- Agent = sedno pluginu. Kazdy formularzyk = czastka duszy
- Shard-style (filled/empty) zamiast Obsidian setting-item
- Obecny profil CALY do wyrzucenia

### D1. Nowa struktura tabow — USTALONE
**Nazwy tabow:** Przeglad | Persona | Ekipa | Umiejetnosci | Uprawnienia | Pamiec | System Prompt | Zaawansowane

**TAB 1: Przeglad**
- Duzy krysztal agenta (unikalny, kolor, animacja breathe)
- Wyjebane w levele na razie
- Statystyki: pliki pamieci, toolsy, sesje, tokeny

**TAB 2: Persona**
- Nazwa, Avatar/Krysztal, Kolor (30-50), Archetyp, Rola, Osobowosc

**TAB 3: Ekipa**
- Minion Prepper: skoncentrowany na playbooku + vault map, dedykowany prompt, pamiec agenta
- Minioni + Masterzy — dodawanie/edycja/usuwanie

**TAB 4: Umiejetnosci**
- Skille + MCP tools
- TABY WEWNETRZNE (Skills | MCP) + GRID layout
- Bez duzego scrollowania
- Zapisz zawsze dostepny
- Filtrowanie/szukanie na gorze
- Klik kafelka = rozwijanie edycji in-place

**TAB 5: Uprawnienia**
- Crystal toggles (diamentowy thumb!)
- Vault Map z white lista
- **PLAYBOOK** (structured form):
  1. Specjalizacja (textarea — co agent robi i jak)
  2. Procedury (lista — auto-dodawane z decision tree, edytowalne)
  3. Skille (auto-lista — kiedy uzywac kazdego, auto-dopisuja sie)
  4. Wyjatki/reguly (lista — czego NIE robic)
  - Rozni sie per agent, fallback gdy nie wie co robic

**TAB 6: Pamiec**
- Przegladanie (nie edycja, poza usuwaniem)
- Sesje: data+godzina + wlasny tytul
- Brain.md podglad

**TAB 7: System Prompt**
- Prompt Builder przeniesiony TUTAJ
- User widzi na biezo + wplywa na kazdy element
- GAMECHANGER

**TAB 8: Zaawansowane**
- Modele (agent/minion/master)
- Opcje auto
- USUWANIE AGENTA (z potwierdzeniem)

**ITERACYJNE (caly profil):**
- Shard-style formularze: dokladny styl filled vs empty — do zobaczenia na zywo
- Rozmiar i proporcje duzego krysztalu w Przegladzie — testujemy
- Crystal toggles: styl diamentowego thumb — do dopracowania
- Playbook: ile pol widocznych od razu vs zwijanych — iteracyjnie
- Prompt Builder: czytelnosc zywego podgladu — do przetestowania
- Ogolny flow miedzy tabami — czy 8 tabow nie za duzo, moze grupowanie — do oceny na zywo

---

## E. REDESIGN SIDEBARA

### E1. Ogolna struktura — USTALONE
- Bazujemy na obecnym (najlepszy element pierwszej przerobki)
- Crystal Soul, NIE przesadzamy — turbo czytelny
- Sekcje ZAWSZE WIDOCZNE — bez rozwijania
- Stack navigation (push/pop) zachowane

### E2. Agent cards — USTALONE
- 2 w rzedzie jesli 6 lub mniej agentow
- Kazdy nastepny → nowy TRZECI rzad (7+ = 3 kolumny)
- W kwadraciku: KRYSZTAL + pod nim IMIE
- Klik w KRYSZTAL = otwiera profil agenta
- Klik POZA krystalem/imieniem = MODAL ze statystykami
- "Nowy agent" dashed kwadracik (+)
- Usuwanie w profilu (Zaawansowane)

### E3. Sekcje + ZAPLECZE — USTALONE + ITERACYJNE
- Komunikator i Agora: restyle Crystal Soul
- **ZAPLECZE — NOWY LAYOUT:**
  - Osobne wejscia w Skille, Miniony (jak teraz)
  - PLUS ogolne "Zaplecze" → caly sidebar z zakladkami: **Skille | Miniony | Masterzy | MCP**
  - Wewnatrz: grid/lista z rozwijaniem in-place
  - FILTROWANIE obowiazkowe (100 skilli, 70 minionow mozliwe)
  - Przejrzyste i czytelne mimo duzej ilosci

**ITERACYJNE:**
- Grid vs lista — co lepiej wyglada przy duzej ilosci (testujemy oba)
- Rozmiar kafelkow w gridzie — do dopracowania
- Styl zakladek Zaplecza (Skille|Miniony|Masterzy|MCP) — do zobaczenia na zywo
- Filtrowanie: searchbar na gorze vs dropdown z kategoriami — testujemy
- In-place rozwijanie: ile szczegolow widocznych domyslnie vs po rozwinieciu — iteracyjnie
- Styl "dodaj nowy" przycisku — do dopracowania

### E4. Fix statystyk — NIEAKTUALNE (nowe w D1)

---

## F. USTAWIENIA — USTALONE
- STANDARDOWY styl Obsidiana, delikatne akcenty
- Sekcje: Polaczenia | Modele | Interfejs | Pamiec | Bezpieczenstwo | Zaawansowane

---

## G. VIEW NAVIGATION — NIEAKTUALNE

## H. INLINE INTERAKCJA — PRZENIESIONE (do PLAN_v2.md 2.12)

## I. KOMUNIKATOR — USTALONE + ITERACYJNE
- Restyle Crystal Soul + nasze ikony SVG
- Wiadomosci miedzy agentami: styl spojny z chatem (krysztalkii-connectors)
- Inbox/Outbox: czytelny layout, kolor agenta-nadawcy

**ITERACYJNE:**
- Styl wiadomosci w komunikatorze — do zobaczenia na zywo
- Ikonki statusow (przeczytane/nieprzeczytane) — do dopracowania
- Layout listy wiadomosci vs podglad — testujemy warianty

## J. MCP/NARZEDZIA — USTALONE + ITERACYJNE
- Zaprojektuje, user zweryfikuje
- Grid/lista narzedzi z ikonami z generatora (tematycznie powiazane)
- Grupowanie po kategoriach (vault, memory, skill, komunikacja, agora, inne)
- Kazdy tool: ikona + nazwa + krotki opis + status aktywny/nieaktywny

**ITERACYJNE:**
- Rozmiar kafelkow/listy — do zobaczenia na zywo
- Styl aktywny vs nieaktywny — testujemy
- Czy hover pokazuje opis czy widoczny od razu — do przetestowania

## K. AGORA — USTALONE + ITERACYJNE
- Profil usera: shard-style, wlasny kolor (ustawiany tutaj)
- Tablica aktywnosci, Projekty, Strefy agentowe

**ITERACYJNE:**
- Layout sekcji Agory — do zobaczenia na zywo (ile sekcji widocznych od razu, ile zwijanych)
- Styl kart projektow — testujemy warianty
- Strefy agentowe: jak wyglada powiazanie agent↔strefa — do dopracowania
- Profil usera: ile pol widocznych, jak wyglada edycja — iteracyjnie

---

## SYSTEM IKON — DO ZAPROJEKTOWANIA (KLUCZOWE!)

> Nowy jezyk wizualny calego pluginu.

### Bazowe ksztalty per kategoria:
- **PAMIEC** = bardziej OKRAGLE (kola, elipsy, kregi, spirale)
- **SZUKANIE** = bardziej TROJKATNE (strzalki, pryzmy, kierunki)
- **ZAPIS** = bardziej KWADRATOWE (prostokaty, siatki, ramki)
- Wariacje + polaczenia = ogromna ilosc ikon

### GENERATOR IKON — do zbudowania!
- Algorytmiczny generator z seed-based wariacjami
- Bazowy ksztalt + transformacje + dekoracje = unikalna ikona
- User MOZE zmienic ikone (default = wygenerowana)
- Kategorie to NASZA PROPOZYCJA — user moze zmienic

### Potrzebujemy ikon dla:
1. Typy akcji w chacie (thinking, tool, minion, master, skill, artifact)
2. Kazdy MCP tool (~24) — tematycznie powiazane ze skillami
3. Kazdy skill (50-70 wariantow z generatora)
4. Nawigacja/menu, Statusy, Elementy formularzy

### Zasady:
- SVG, minimalistyczne, glify/sigile — komunikacyjny/kryształowy (NIE plemienny)
- Glowy i cienie dynamicznie per kolor agenta
- Animowalne (idle / active / loading — styl REF-4 ale z krystalem)
- Widoczne i zapamietywalne

---

## KRYSZTAL AGENTA — DO ZAPROJEKTOWANIA (KLUCZOWE!)

> Kazdy agent = unikalny krysztal. Drugi (obok koloru) znak rozpoznawczy.

- Widoczny: sidebar (maly), zakladka chatu, profil (DUZY), wszedzie jako avatar
- UNIKALNY ksztalt per agent, glow w kolorze agenta
- NIE diamenciki — zaprojektowane krysztaly obsidianowe
- Jak generowac, ile wariantow, skalowanie — do zaprojektowania
- Profesjonalizm — testujemy na zywo

---

## PODSUMOWANIE STATUSOW

| # | Temat | Status |
|---|-------|--------|
| A1 | Styl wiadomosci | USTALONE + ITERACYJNE |
| A2+A3 | Transparentnosc | USTALONE + ITERACYJNE |
| A4 | Input area | USTALONE + ITERACYJNE |
| A5 | Token counter | USTALONE |
| A6 | Animacje | USTALONE |
| A7 | Zakladki | USTALONE + ITERACYJNE |
| B | Slim bar | USTALONE |
| C1-C4 | Design system | USTALONE |
| D | Profil agenta | USTALONE + ITERACYJNE |
| E | Sidebar + Zaplecze | USTALONE + ITERACYJNE |
| F | Ustawienia | USTALONE |
| I | Komunikator | USTALONE + ITERACYJNE |
| J | MCP widok | USTALONE + ITERACYJNE |
| K | Agora | USTALONE + ITERACYJNE |
| IKONY | System ikon + GENERATOR | DO ZAPROJEKTOWANIA |
| KRYSZTALY | Krysztal agenta | DO ZAPROJEKTOWANIA |

---

## PROPONOWANA KOLEJNOSC

**Faza 1: Fundament**
- System ikon + GENERATOR
- Krysztaly agentow
- Paleta kolorow (30-50 ciekawych odcieni)
- CSS: Crystal Soul base + per-agent accent

**Faza 2: Chat**
- A1: styl wiadomosci (glow usera, blok agenta, krysztalkii-connectors)
- A2+A3: expandable bloki akcji z ikonami
- A4: input area (nowy layout)
- A7: zakladki chatow
- A5: token counter
- B: slim bar

**Faza 3: Profil agenta**
- D: 8 tabow, shard-style, Playbook, Prompt Builder

**Faza 4: Sidebar + reszta**
- E: agent cards grid + Zaplecze z zakladkami
- K: Agora | I: Komunikator | J: MCP widok

**Faza 5: Polish**
- A6: animacje (pelny system)
- C3: dark/light audit
- F: settings cleanup

---

> **Zaden punkt nie jest implementowany dopoki user nie zatwierdzi.**
> Elementy ITERACYJNE: implementujemy pierwsza wersje, user ocenia na zywo, dopracowujemy.
> GENERATOR IKON i KRYSZTALY musza byc zaprojektowane PRZED implementacja.
