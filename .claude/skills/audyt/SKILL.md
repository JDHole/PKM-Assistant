---
name: audyt
description: Audyt pluginu PKM Assistant metodą gauntlet - szukacze i obalacze ze świeżym kontekstem, pętla do zbieżności, jeden format znalezisk. Użyj, gdy Kuba prosi o audyt modułu albo karty (security, code-review, testy, bledy, dead-code, docs, wydajnosc, deps), o pełny audyt pluginu albo gdy nocna rotacja z Katalogu Audytów wskazuje moduł 8-13, 18 lub code review. Nie do naprawiania kodu.
allowed-tools: Bash(npm:*), Bash(npx:*), Bash(node:*), Bash(trivy:*), Bash(gitleaks:*), Bash(git diff:*), Bash(git log:*), Bash(git show:*), Bash(git rev-parse:*), Bash(git status:*), Bash(git worktree:*), Bash(ls:*), Bash(wc:*)
---

# Audyt gauntlet

## Overview

Audyt to ODKRYWANIE, nie naprawianie: znajdujesz i dowodzisz, a co z tym zrobić
decyduje Kuba poza tym skillem. Znalezisko żyje tylko wtedy, gdy ma dowód w kodzie
(plik:linia + dosłowny cytat), konkretny scenariusz i przetrwało obalanie przez agenta,
który nie widział rozumowania szukacza.

## Żelazne prawo

```
1. ZERO ZMIAN W KODZIE PRODUKCYJNYM. NAPRAWY TO OSOBNY FLOW, /simplify ZAKAZANY.
2. ZERO "POTENCJALNIE", "TEORETYCZNIE", "MOZE". DOWOD ALBO NIE MA ZNALEZISKA.
3. OBALACZ NIE WIDZI ROZUMOWANIA SZUKACZA. DOSTAJE TWIERDZENIE + DOWOD + KOD.
4. "SUKCES" OD SUBAGENTA TO NIE DOWOD. DOWOD TO SWIEZY OUTPUT KOMENDY ALBO TWOJ ODCZYT KODU.
```

Łamanie litery tych zasad jest łamaniem ich ducha.

## Kiedy używać, kiedy NIE

Używaj, gdy Kuba prosi o audyt karty albo modułu, gdy ma być pełny przegląd pluginu
(`wszystkie`), gdy nocna rotacja z Katalogu wskazuje moduł 8-13 albo 18, gdy przed
wydaniem chcesz wiedzieć, gdzie jest krew.

NIE używaj, gdy masz konkretny bug do naprawienia (to debugowanie), gdy recenzujesz
świeży diff przed commitem (`/code-review`), gdy zadanie brzmi "popraw" albo "dopisz
testy" (osobny flow, osobny branch). Audyt kończy się raportem, nie patchem.

## Wejście

`$ARGUMENTS` = `{karta} [noc]`. Bez drugiego słowa tryb = `dzien`.

| Karta | Moduł | Plik | Co bada |
|---|---|---|---|
| security | 8 | [security](karty/security.md) | czy obietnice z SECURITY.md trzymają w kodzie i czy da się przekroczyć granicę zaufania agenta |
| code-review | nowy (propozycja 20) | [code-review](karty/code-review.md) | czy kod trzyma standard repo i kontrakt modułu na tyle, żeby senior puścił merge |
| testy | 9 (+17) | [testy](karty/testy.md) | czy testy łapią zepsucie logiki, czy tylko przez nią przechodzą |
| bledy | 10 | [bledy](karty/bledy.md) | czy awaria zostawia spójny stan, sprzątnięte zasoby i zdanie dla usera zamiast surowego SSE |
| dead-code | 11 | [dead-code](karty/dead-code.md) | co jest nieosiągalne z `src/main.ts`, testu i harnessa oraz co nie zgadza się z `package.json` |
| docs | 12 | [docs](karty/docs.md) | czy dokument nie kłamie: komendy, liczby, drzewka i obietnice kontra kod |
| wydajnosc | 13 | [wydajnosc](karty/wydajnosc.md) | boot, rozmiar bundla, indeksowanie oraz praca proporcjonalna do rozmiaru vaulta na gorącej ścieżce |
| deps | 18 | [deps](karty/deps.md) | podatności, sekrety i paczki widma w łańcuchu dostaw |

`wszystkie` = kolejne karty po kolei, każda własnym biegiem (tylko tryb dzień).
Brak karty albo nazwa spoza tabeli: wypisz tabelę i zapytaj Kubę, nie zgaduj.

## Setup biegu

1. REPO = katalog roboczy albo `git rev-parse --show-toplevel`.
   VAULT lokalnie = `C:\Users\jdziu\Mój dysk\JDHole_OS_2.0`, w chmurze katalog klonu
   vaulta. SCRATCH = `{REPO}/.claude/worktrees` (gitignorowany, tam i tylko tam wolno
   robić tymczasowe worktree). Zakazy twarde: żadnych junctionów ani symlinków do
   `node_modules` i żadnego `rm -rf` na worktree (incydent 2026-08-22: agent skasował
   tak `node_modules` repo); sprząta wyłącznie `git worktree remove --force`.
   Po biegu lider sprawdza `git worktree list` i `ls node_modules | wc -l`.
2. Środowisko, do zapisania w biegu: `git rev-parse --short HEAD`,
   `git branch --show-current`, `node --version`, OS, `ls harness/.env.local`
   (jest albo nie ma), tryb wykonania (`workflow` albo `agent`).
3. Id biegu `YYYY-MM-DD_{karta}`; jeśli katalog już jest, sufiks `_2`, `_3`.
   Utwórz `audyt/biegi/{id}/` i `audyt/biegi/{id}/surowe/` (surowe outputy narzędzi,
   gitignorowane).
4. Skopiuj [workbench](szablony/workbench.md) do `audyt/biegi/{id}/workbench.md`
   i podstaw placeholdery.
5. Przeczytaj kartę. Przepisz jej POPRZECZKĘ do workbencha (sekcja "Poprzeczka").
6. Pamięć biegów: przeczytaj `findings.json` poprzednich biegów TEJ karty
   (`audyt/biegi/*_{karta}*/findings.json`) i sekcję "Risk register" Katalogu
   (`C:\Users\jdziu\Mój dysk\JDHole_OS_2.0\40_Pracownie\Dev Desktop\Projekty\PKM Assistant\Katalog_Audytow.md`).
   Zbuduj listę ZNANE: skrót lub id + jedno zdanie. Szukacze dostają ją, żeby nie
   odkrywać tego samego drugi raz; raport ma sekcję "Znane - czy nadal" ze statusem
   każdej pozycji (nadal / naprawione / nie sprawdzono).
7. Sufity. To bezpiecznik, nie cel; Kuba może je zmienić słowem w rozmowie.

| Sufit | dzień (oszczędny, domyślny od 2026-08-22) | dzień pełny (na słowo Kuby) | noc |
|---|---|---|---|
| rundy maks. | 2 | 4 | 2 |
| suche rundy do zbieżności | 1 | 2 | 1 |
| kawałków | 8 | 12 | 6 |
| szukacz: model | runda 1 opus, runda 2+ sonnet | opus | sonnet |
| obalaczy na HIGH lub CRITICAL | 2 (opus + sonnet) | 2 | 1 (opus) |
| obalaczy na MEDIUM | 1 (opus) | 1 | 1 (sonnet) |
| obalaczy na LOW i INFO | 1 (sonnet) | 1 | 1 (sonnet) |

Koszt biegu (pomiar, nie szacunek): pierwszy bieg `security` na sufitach pełnych
(12 kawałków, 3 rundy realne, 35 szukaczy opus, 93 obalania) zjadł 20,3 mln tokenów
subagentów w Workflow plus ok. 3 mln na ręczne obalania, syntezę i weryfikatora,
i trafił w limit sesji Claude. Runda 3 dała 25 zgłoszeń, z czego 12 nowych,
reszta duplikaty; malejące zyski zaczynają się po rundzie 2. Tryb oszczędny ma
dawać ok. 3-4x taniej przy niewielkiej stracie pokrycia: mniej kawałków,
2 rundy, sonnet w rundzie 2 i na obalaniu niskich severity. Duplikaty między
kawałkami sklej PRZED obalaniem (lider, po kluczu plik+linie i po tytule),
żeby nie płacić obalaczom za to samo trzy razy. Bieg na sufitach pełnych
wyłącznie na wyraźne słowo Kuby, najlepiej jako drugi bieg po naprawach.

## Role i granice

| Rola | Kto | Kontekst | Wolno | Nie wolno |
|---|---|---|---|---|
| Lider | sesja główna | pełny | pisać pliki biegu, decydować, syntetyzować, rozstrzygać spory | delegować obalania samemu sobie |
| Recon | Explore, tani model (haiku/sonnet) | świeży | czytać repo, zwracać mapę kawałków | pisać pliki |
| Szukacz | general-purpose, opus | świeży, jeden na kawałek | czytać repo, komendy read-only, testy; reprodukcja tylko w tymczasowym worktree w SCRATCH | modyfikować repo, spawnować agentów, obalać własne znaleziska |
| Obalacz | general-purpose, opus (drugi obalacz: sonnet) | świeży, jeden na znalezisko | to co szukacz | widzieć rozumowanie szukacza, spawnować |
| Synteza | general-purpose, opus | świeży | dedup, klastry, ranking, TLDR | dopisywać nowe znaleziska |
| Weryfikator raportu | general-purpose, sonnet | świeży | sprawdzać każde twierdzenie faktograficzne raportu w kodzie | zmieniać werdykty merytoryczne |

Jedyny pisarz plików to lider. Nikt nie spawnuje "drugiej opinii" na własną rękę.
Spór obalaczy (jeden POTWIERDZONE, drugi OBALONE): lider sam czyta wskazane miejsce,
rozstrzyga i dopisuje do `obalanie[]` wpis z `model: "lider"`.

## Fazy

**1. Recon.** Agent Explore dostaje z karty sekcje Zakres, Kawałki startowe, Poprzeczka,
do tego listę ZNANE i limit kawałków. Zwraca kawałki
`{id, nazwa, zakres[], co_robi, granice_zaufania, poprzeczka_kawalka}`.
Granice zaufania to cztery pytania: jaką tożsamością i uprawnieniem działa ten kod,
co trafia do jego kontekstu i wejścia, kto może to wejście napisać, dokąd idzie wyjście.
Recon ZAPISUJE swój JSON do pliku w scratchpadzie sesji (ogólny agent z Write, tani model) -
wynik oddany tylko w odpowiedzi ginie w powiadomieniu (lekcja 2026-08-23); lider kopiuje go
do `audyt/biegi/{id}/recon.json` z własnymi poprawkami (priorytety w dużych kawałkach,
korekty numerów linii z karty).
Lider zapisuje kawałki do workbencha, w trybie dzień wysyła Kubie 5 linii streszczenia
(kawałki + poprzeczka) i JEDZIE DALEJ bez czekania. Kuba przerywa, kiedy chce.

**2. Szukacze.** Jeden szukacz na kawałek, prompt z [szukacz](szablony/szukacz.md)
z podstawionymi placeholderami. W rundzie większej niż 1 `{{FOCUS}}` =
`najwieksza_luka` z poprzedniej rundy tego kawałka. Wyjście: FINDER_OUT.

**3. Obalacze.** Jeden przebieg na NOWE znalezisko. Dedup kluczem
`kawalek|dowod[0].plik|dowod[0].linie` względem wszystkiego, co bieg już widział,
także obalonego - inaczej pętla nie zbiegnie. Prompt z [obalacz](szablony/obalacz.md):
obiekt znaleziska BEZ pól `kierunek` i `powiazane`, bez narracji szukacza, plus sekcja
"Czego NIE flagować" z karty i poprzeczka. HIGH i CRITICAL idą do dwóch obalaczy,
POTWIERDZONE wymaga zgody obu. Werdykty: POTWIERDZONE / OBALONE / NIEWERYFIKOWALNE.

**4. Pętla.** Po rundzie policz nowe POTWIERDZONE. Zero w całej rundzie: `suche++`,
inaczej `suche = 0`. Kawałek bez nowych potwierdzonych przez dwie rundy jest `zbiezny`
i kolejne rundy go pomijają. Stop, gdy `suche == maxSuche` albo `runda == maxRund`,
albo wszystkie kawałki zbieżne. Po każdej rundzie workbench: tabela kawałków, liczniki,
log rundy; w trybie dzień dwie linie do Kuby.
Pady agentów (limit sesji, błąd API) to NIE werdykty: padnięty szukacz nie robi rundy
suchej, padnięty obalacz nie robi znaleziska niezweryfikowalnym. Po biegu lider
sprawdza log workflow pod kątem `failed` i dokańcza brakujące obalania ręcznym
fan-outem (ten sam szablon), zanim zacznie syntezę. Zbieżność, której nie dowiodła
realna runda, jest w raporcie nazwana formalną.

**5. Synteza.** Agent z [synteza](szablony/synteza.md) dostaje wszystkie znaleziska
(potwierdzone, obalone z powodem, niezweryfikowalne), ZNANE, `co_dziala_dobrze`
od szukaczy i liczby biegu. Zwraca SYNTEZA_OUT. Lider pisze `audyt/biegi/{id}/findings.json`
wg [findings.schema.json](szablony/findings.schema.json) i `RAPORT.md` wg szkieletu niżej.
Mechanikę składania robi [lider.cjs](szablony/lider.cjs) (kolejność: `journal` -> `ids` ->
`prompt-synteza` -> agent syntezy -> `zloz` -> walidator -> `raport`); przy dużym biegu
(60+ znalezisk) synteza dostaje wersję KOMPAKTOWĄ znalezisk (scenariusz i uzasadnienia
obalaczy przycięte, pełne dane w `surowe/znaleziska_z_id.json` do doczytania), bo pełny
JSON nie mieści się w kontekście. Spory obalaczy lider rozstrzyga PRZED syntezą, wpisem
`model: "lider"` w `obalanie[]`. Korekta severity do HIGH przez syntezę oznacza drugiego
obalacza po syntezie - walidator wymaga dwóch werdyktów na HIGH.

**6. Weryfikacja.** (a) `node .claude/skills/audyt/szablony/waliduj.cjs audyt/biegi/{id}/findings.json`
musi być zielone; błąd dowodu to sygnał, że lider poprawia dowód albo degraduje
znalezisko do NIEWERYFIKOWALNE. (b) Weryfikator raportu (świeży sonnet) dostaje
`RAPORT.md` i `findings.json` z jednym poleceniem: "każde zdanie raportu, które
zawiera ścieżkę, liczbę albo cytat, sprawdź w kodzie i w findings.json; zwróć listę
rozjazdów w formacie `linia raportu -> co jest naprawdę`; nie zmieniaj werdyktów
merytorycznych". Rozjazdy poprawia lider w raporcie.

### Szkielet `RAPORT.md`

```
# Audyt {karta} - {data} ({id})
Poprzeczka: ...
## TLDR
## Liczby
kawałki N (zbieżne M), rundy R (stop: ...), zgłoszone/obalone/potwierdzone/niezweryfikowalne, agentów
## Znaleziska potwierdzone (ranking)
### {id} [{severity}] {tytuł}
twierdzenie / dowód (plik:linie + cytat) / scenariusz (+ granica) / reprodukcja / obalanie (werdykty po jednej linii) / kierunek
## Klastry systemowe
## Znane - czy nadal
## Obalone (id, tytuł, powód - jedna linia)
## Niezweryfikowalne
## Co działa dobrze
## Środowisko biegu
```

## Ślad po biegu

Dzień:
1. kopia `RAPORT.md` do vaulta:
   `C:\Users\jdziu\Mój dysk\JDHole_OS_2.0\40_Pracownie\Dev Desktop\Projekty\PKM Assistant\Audyty\{id}.md`
   (katalog `Audyty` powstaje przy pierwszym biegu) z frontmatterem `type: audyt-raport`,
   `karta`, `data`, `head`, `potwierdzone: N`, `obalone: N`;
2. w Katalogu: kolumny "Ostatni przebieg" i "Wynik" w wierszu modułu (jedna linia)
   plus wiersz w sekcji "Historia przebiegów";
3. TLDR do Kuby w czacie razem ze ścieżką raportu;
4. decyzje o naprawach należą do Kuby i zapadają poza tym skillem;
5. jeśli sesja jest wcieleniem Claudzika: wiersz w
   `C:\Users\jdziu\Mój dysk\JDHole_OS_2.0\40_Pracownie\Dev Desktop\Rejestr dev.md`
   (kategoria log) wg jego regulaminu.

Noc: ślad wg sekcji "Zasady nocy audytowej" Katalogu i aktualnego kontraktu nocy
(brief Ezry w `C:\Users\jdziu\Mój dysk\JDHole_OS_2.0\10_Agenci\Claudzik\_Dla_Agenta\`):
maks. 3 znaleziska do wrzutni, reszta do risk registeru, wiersz Historii, TLDR po ludzku.
Ten skill NIE dubluje reguł nocy; przy rozjeździe wygrywa kontrakt nocy.
Wynik zawsze z zapisanym środowiskiem biegu.

## Tryb wykonania

Domyślnie Workflow z treścią [workflow.js](szablony/workflow.js) podaną INLINE w polu `script`
(`scriptPath` odbija się o walidator dialogu zgody - „znaki sterujące" mimo czystego pliku;
biegi 2026-08-23). Argumenty (`args`) lider zapisuje też do `audyt/biegi/{id}/surowe/args.json`.
Wywołanie `/audyt` przez Kubę jest zgodą na orkiestrację wieloagentową. Workflow działa
lokalnie, w `-p` i w rutynach chmurowych. Argumenty buduje lider (karta, biegId, repo,
ścieżki karty i szablonów, kawałki, znane, sekcja "Czego NIE flagować", sufity, modele).

Gdy narzędzia Workflow nie ma w sesji: ręczny fan-out przez Agent tool, te same fazy,
równolegle w jednym bloku (najpierw wszyscy szukacze, potem wszyscy obalacze). Logika
identyczna, tylko wykonanie inne; zapisz to w `srodowisko.wykonanie`.

Lider ZAWSZE robi Recon (faza 1) oraz syntezę i weryfikację (fazy 5-6) poza workflow,
bo tylko on pisze pliki. Workflow obsługuje fazy 2-4.

## Red flags

- "To oczywiste, nie trzeba obalać" - STOP i puść przez obalacza. Każde znalezisko, bez wyjątku.
- "Poprawię przy okazji, to jedna linia" - STOP i wróć do raportu. Audyt nie dotyka kodu.
- "OWASP mówi, że to podatność" - STOP i pokaż przekroczoną granicę. Checklista to nie bug.
- "Brakuje warstwy B" przy działającej warstwie A - STOP i zapisz to jako hardening note, nie finding.
- Dziesięć LOW dla grubości raportu - STOP i wytnij. Trzy realne MEDIUM są warte więcej.
- "Subagent napisał, że sprawdził" - STOP i sprawdź sam: świeży output albo własny odczyt kodu.
- "Nic nie znalazłem, dorzucę coś dla bezpieczeństwa" - STOP. Pusty bieg to poprawny wynik.

## Racjonalizacje

| Wymówka | Rzeczywistość |
|---|---|
| "Dowód jest oczywisty z kontekstu" | Nie ma cytatu plik:linia, nie ma znaleziska. |
| "Obalacz i tak potwierdzi" | To zgadywanie wyniku. Obalacz jest po to, żeby próbował obalić. |
| "Sam sobie obalę, znam ten kod" | Znasz też swoje rozumowanie. Dlatego obalać ma ktoś inny. |
| "Runda była sucha, ale poszukam jeszcze raz tak samo" | Sucha runda to sygnał zbieżności, nie zaproszenie do powtórki. Zmień FOCUS albo skończ. |
| "To potencjalnie da się wykorzystać" | Słowo "potencjalnie" oznacza, że nie doszedłeś do końca. Albo scenariusz, albo nic. |
| "Naprawa zajmie mniej niż opisanie" | Nie o to chodzi. Audyt bez zmian w kodzie jest wiarygodny, z nimi nie. |
| "Test padł, ale to pewnie flaky" | Uruchom drugi raz i zapisz output. "Pewnie" nie jest wynikiem. |
| "Karta tego nie obejmuje, ale zgłoszę jako LOW" | Zakres jest ostrością, nie płotem: zgłoś, jeśli to realny bug, ale opisz w scenariuszu, nie sztucznie w tej karcie. |
| "Sufit rund minął, dorzucę jeszcze jedną" | Sufit to bezpiecznik. Chcesz więcej rund, pytasz Kubę. |
| "Kuba i tak przeczyta tylko TLDR" | Tak. Dlatego TLDR ma być prawdziwy, a nie ładny. |

## Źródła

- Gauntlet loop (metoda pętli szukacz/obalacz): https://somethingbig.ai/gauntlet-loop
- cloudflare/security-audit-skill (MIT): https://github.com/cloudflare/security-audit-skill
- obra/superpowers (MIT): https://github.com/obra/superpowers
- getsentry/skills (Apache-2.0): https://github.com/getsentry/skills
- addyosmani/agent-skills (MIT): https://github.com/addyosmani/agent-skills
- mattpocock/skills (MIT): https://github.com/mattpocock/skills
