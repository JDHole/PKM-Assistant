# Karta: docs (moduł katalogu 12)

Bada jedno: czy dokument nie kłamie. W tym repo `CLAUDE.md` to nie ozdoba, tylko instrukcja
dla agenta - zła liczba w bramce merge zamyka zadanie, które nie jest domknięte, a komenda
widmo w README wysyła nowego człowieka w ścianę.

## Zakres

Zweryfikowane `ls` na HEAD `962908d2` (branch `feat/skills-audyt`), stan 2026-08-22:

- root: `CLAUDE.md` (388 linii), `README.md` (249), `QUICK_START.md` (412), `SECURITY.md` (167),
  `CHANGELOG.md` (155), `RELEASE_PROCESS.md` (47), `MIGRATION_v2.md` (82)
- `core/CLAUDE.md` (333), `core/SECURITY.md`
- `harness/README.md` (175)
- 18 plików `modules/*/CLAUDE.md` - dokładnie po jednym na każdy z 18 katalogów modułów
  (`agent-loop`, `agents`, `artifacts`, `chat`, `crystal-soul`, `embedding`,
  `komunikator`, `memory`, `models`, `multimodal`, `onboarding`, `prompts`, `shell`, `skills`,
  `sub-agents`, `tools`, `ui-components`, `web`). Pokrycie 18/18 - zweryfikowane pętlą, nie na oko.
  (Dawny 19. katalog, folder na resztki wyciętego forka, skasowany w całości w porządkach
  clean-room 2026-09 - nie ma go już czym liczyć.)
- komentarze JSDoc, ale TYLKO gdy twierdzą coś sprawdzalnego o ścieżkach/typach (znane 08-21)

Poza zakresem tej karty:
- treść merytoryczna `SECURITY.md` jako obietnice do sprawdzenia w kodzie → karta `security`
- `Refaktor/`, `Nauka/`, `releases/` - archiwum z datą, nie żywa instrukcja
- dokumentacja w vaultcie (`40_Pracownie/Dev Desktop/Projekty/PKM Assistant/Dokumentacja/`,
  w tym ADR 001-005 w `Dokumentacja/_Zrodla/ADR/`) - poza repo, poza tą kartą
- martwy kod, o którym dokument pisze → karta `dead-code` (tu zgłaszasz sam dokument)

## Poprzeczka

Cztery zdania, każde sprawdzalne komendą:

1. **Każda komenda w docs istnieje w `package.json`.** Repo ma 11 skryptów: `build`, `release`,
   `test`, `typecheck`, `lint`, `lint:obsidian`, `harness:build`, `harness`, `harness:selftest`,
   `harness:scenarios`, `harness:scenarios:live`.
2. **Każda liczba zgadza się z pomiarem** (scenariusze, testy, wersja, liczba modułów).
3. **Każde drzewko plików zgadza się z `ls`.**
4. **Każda obietnica/kontrakt ma kod**, który ją realizuje.

Plus **test na ślepo**, rozłożony na role silnika: Recon (Explore) czyta WYŁĄCZNIE kod modułu,
bez `CLAUDE.md`, i oddaje 10 linii "co robi, wejścia, komendy, kontrakty" w polu `co_robi`
kawałka. Szukacz dostaje ten opis w `{{KAWALEK}}` i dopiero wtedy otwiera `CLAUDE.md` modułu,
wyciągając z niego twierdzenia. Rozjazd opisu z dokumentem, którego nie da się wytłumaczyć
skrótem redakcyjnym, to znalezisko; obalacz sprawdza rozjazd w kodzie, nie w opisie.

Jak obalacz sprawdza poprzeczkę: odpala tę samą komendę, którą podał szukacz, i porównuje
output z cytatem z dokumentu. Bez świeżego outputu werdykt to NIEWERYFIKOWALNE, nie POTWIERDZONE.

## Kawałki startowe

| id | nazwa | zakres | poprzeczka kawałka |
|---|---|---|---|
| k1 | Komendy i bramki | `CLAUDE.md`, `README.md`, `QUICK_START.md`, `package.json` | każda komenda istnieje, każda liczba w bramce zgadza się z biegiem |
| k2 | Liczby projektu | `CLAUDE.md`, `harness/README.md` | scenariusze, testy, LOC, rozmiar bundla vs pomiar |
| k3 | Wersja i wydania | `CLAUDE.md`, `manifest.json`, `package.json`, `CHANGELOG.md`, `RELEASE_PROCESS.md` | jedna wersja w całym repo, changelog nadąża |
| k4 | Drzewka struktury | `CLAUDE.md`, `core/CLAUDE.md` | każde drzewko = `ls` |
| k5 | Dokumenty modułów A | `modules/{agent-loop,tools,sub-agents,memory,models}/CLAUDE.md` | test na ślepo + ścieżki |
| k6 | Dokumenty modułów B | `modules/{chat,komunikator,web,embedding,skills}/CLAUDE.md` | test na ślepo + ścieżki |
| k7 | Dokumenty modułów C | `modules/{artifacts,agents,shell,ui-components,prompts,multimodal,onboarding,crystal-soul}/CLAUDE.md` | test na ślepo + ścieżki |
| k8 | Nagrobki | sekcje "status/TODO/WIP" wszędzie (dawny wzorcowy przykład, tombstone folderu na resztki wyciętego forka, dziś usunięty w całości razem z dokumentem) | rzecz zamknięta nie jest opisana w czasie teraźniejszym |
| k9 | Onboarding | `README.md`, `QUICK_START.md`, `MIGRATION_v2.md` | ktoś obcy przejdzie krok po kroku bez ściany |
| k10 | Sito datowe | wszystkie docs vs katalogi kodu | dokument nie jest starszy od kodu, który opisuje, o więcej niż jeden sprint |
| k11 | JSDoc ze ścieżkami | `modules/**/*.ts` | `import('...')` w JSDoc wskazuje istniejący plik |

## Checklista szukacza

Każdy punkt: CO sprawdzić + JAK. Komendy odpalaj z korzenia repo.

1. **Komendy widmo.** Zestaw komend z docs z listą skryptów:
   `grep -rhoE "npm run [a-z:-]+" *.md core/CLAUDE.md modules/*/CLAUDE.md harness/README.md | sort | uniq -c`
   → dziś: `build` 8, `typecheck` 5, `harness:selftest` 5, `harness:scenarios` 5, `lint` 4,
   `lint:obsidian` 3, `harness` 2, **`dev` 2**, `harness:scenarios:live` 1, `harness:build` 1.
   Lista skryptów: `node -e "console.log(Object.keys(require('./package.json').scripts).join('\n'))"`.
   `dev` w skryptach NIE MA - to komenda widmo (`CLAUDE.md:182`, `README.md:183`).
2. **Liczba scenariuszy harnessa.** `ls harness/scenarios/[0-9]*.ts | wc -l` → dziś **31**.
   Porównaj z każdym miejscem, gdzie docs podaje liczbę scenariuszy.
   Dziś rozjazd: `CLAUDE.md:188` mówi "14 scenariuszy-łamaczy", `harness/README.md:18` mówi "31".
3. **Liczba testów.** Pliki: `find . -name "*.test.ts" -not -path "./node_modules/*" -not -path "./.claude/*" | wc -l`
   → dziś **135** (`core` 22, `modules` 112, `config` 1). Przypadki (proxy):
   `grep -rhoE "^\s*test(\.[a-z]+)?\(" --include=*.test.ts core modules config | wc -l` → dziś **1640**.
   UWAGA: docs podaje liczbę PRZYPADKÓW, nie plików - `CLAUDE.md:173` "1403 testy AVA",
   `CLAUDE.md:22` "1398 testów". Twardy pomiar to `npm test`; grep jest proxy i tak go opisz.
4. **Wersja.** `node -e "const p=require('./package.json'),m=require('./manifest.json'); console.log(p.version, m.version)"`
   → dziś **2.1.0 / 2.1.0**. Szukaj innych wartości w docs:
   `grep -rnE "v?[0-9]+\.[0-9]+\.[0-9]+" CLAUDE.md README.md QUICK_START.md | grep -v "^.*Historia"`.
   Dziś: `CLAUDE.md:7` "Wersja: 2.1.0", `CLAUDE.md:29` "Plugin jest w produkcji (v1.2.1)".
5. **Liczba modułów.** `ls -d modules/*/ | wc -l` → dziś **18** (spadek z 19 - dawny folder na
   resztki wyciętego forka skasowany w całości w porządkach clean-room). Pokrycie dokumentacją:
   `for d in modules/*/; do [ -f "$d/CLAUDE.md" ] || echo "BRAK: $d"; done` → dziś pusto (18/18).
6. **Drzewka.** Dla każdego bloku ``` z drzewkiem: `ls <katalog>` i porównaj plik po pliku.
   Blok kodu w `CLAUDE.md`: `grep -n '^```' CLAUDE.md` → dziś 10 znaczników (5 bloków).
7. **Sito datowe.** `git log -1 --format=%ci -- <plik>` vs `git log -1 --format=%ci -- <katalog kodu>`.
   Dziś: `CLAUDE.md` 2026-08-02, `core/CLAUDE.md` 2026-08-02, `README.md` 2026-07-30,
   `harness/README.md` 2026-08-15 vs `modules` 2026-08-17, `core` 2026-08-17, `harness` 2026-08-17,
   `config` 2026-08-17. Dokument o 15 dni starszy od kodu = miejsce do sprawdzenia, NIE znalezisko samo w sobie.
8. **Nagrobki.** `grep -rniE "TODO|DO USUNIĘCIA|TEMPORARY|WIP|w toku|obecnie|planowane" CLAUDE.md core/CLAUDE.md modules/*/CLAUDE.md`
   - dla każdego trafienia sprawdź, czy rzecz nie jest już zamknięta (git log katalogu / `ls`).
9. **Dokument modułu vs `ls` modułu.** Dla każdego `modules/X/CLAUDE.md`: wypisz z niego nazwy
   plików (`grep -oE "[A-Za-z_]+\.(ts|js)" modules/X/CLAUDE.md | sort -u`) i zderz z `ls modules/X`.
10. **Kontrakty bez kodu.** Każde zdanie "plugin robi/gwarantuje/zawsze/nigdy" w dokumencie
    modułu → znajdź linię kodu, która to realizuje. Brak = znalezisko (dowód: cytat + "szukałem: <grep>").
11. **JSDoc ze ścieżkami.** `grep -rn "@param {import(" --include=*.ts modules core src | head -30`
    - dla każdego trafienia sprawdź, czy plik pod tą ścieżką istnieje względem pliku źródłowego.
12. **CHANGELOG.** `git log --oneline $(git log -1 --format=%H -- CHANGELOG.md)..HEAD | wc -l`
    = ile commitów weszło od ostatniego dotknięcia changeloga. Status "nadal", nie nowe znalezisko.
13. **Linki wewnętrzne.** `grep -rhoE "\]\(([^)]+\.md)\)" *.md core/CLAUDE.md modules/*/CLAUDE.md`
    - dla każdej ścieżki `ls` względem pliku, w którym link stoi.
14. **Komendy z flagami.** Docs czasem podaje flagę, której skrypt nie ma
    (np. `--live`, `--dry-boot`, `--offline`): zderz z `package.json` i z parserem w `harness/run.ts`.
15. **Decyzje bez zapisu.** ADR-y projektu (001-005) żyją w vaultcie, nie w repo - w repo NIE MA
    katalogu `docs/adr/` (zweryfikowane `find . -iname "*adr*"` = 0 trafień). Jeżeli dokument repo
    powołuje się na ADR numerem, sprawdź, czy numer istnieje. Nie proponuj zakładania ADR-ów - to decyzja Kuby.
16. **Test na ślepo** (patrz Poprzeczka) dla kawałków k5-k7.

## Czego NIE flagować

1. **Sekcje jawnie historyczne z datą.** `CLAUDE.md` ma bloki "Historia (era v2.0)" i "Nota
   historyczna (2026-08-02)" - one mają prawo opisywać nieistniejący stan. Nagrobek to coś innego:
   czas teraźniejszy bez daty.
2. **Styl, ton, długość, ortografia, emoji.** Nie recenzujesz redakcji.
3. **Opóźnienie `CHANGELOG.md`** - znane 08-20, Kuba zdecydował "zabrać się". Tylko status "nadal",
   zero nowego znaleziska.
4. **Dokumentacja w vaultcie** (pracownia, Katalog, Dokumentacja/00-09) - poza zakresem tej karty.
5. **"Brakuje sekcji X"** bez wskazania, kto i kiedy się o nią rozbił. Brak dokumentu nie jest
   kłamstwem dokumentu.
6. **Rozjazd liczby, która z definicji płynie** (LOC, liczba commitów, "~67,8k") - chyba że
   dokument używa jej jako bramki merge.
7. **Dokument starszy od kodu** sam w sobie. Data to trop, znaleziskiem jest konkretne zdanie,
   które przestało być prawdą.
8. **Dawny folder-tombstone po wyciętym forku jako martwy kod** - zamknięty (08-21) i od
   porządków clean-room (2026-09) skasowany w całości, łącznie z samym dokumentem - nie ma już
   czego flagować.

## Narzędzia i komendy

Wszystkie read-only, wszystkie sprawdzone na HEAD `962908d2`:

```bash
grep -rhoE "npm run [a-z:-]+" *.md core/CLAUDE.md modules/*/CLAUDE.md harness/README.md | sort | uniq -c
node -e "console.log(Object.keys(require('./package.json').scripts).join('\n'))"
ls harness/scenarios/[0-9]*.ts | wc -l
find . -name "*.test.ts" -not -path "./node_modules/*" -not -path "./.claude/*" | wc -l
node -e "const p=require('./package.json'),m=require('./manifest.json');console.log(p.version,m.version)"
ls -d modules/*/ | wc -l
for d in modules/*/; do [ -f "$d/CLAUDE.md" ] || echo "BRAK: $d"; done
git log -1 --format=%ci -- CLAUDE.md
git log --oneline $(git log -1 --format=%H -- CHANGELOG.md)..HEAD | wc -l
grep -rn "@param {import(" --include=*.ts modules core src
```

Uwaga na `.claude/worktrees/` - jest w `.gitignore`, ale `find` go widzi i zawyża liczby
(dziś 504 dodatkowe pliki `*.test.ts`). Zawsze wykluczaj `-not -path "./.claude/*"`.

## Severity w tej domenie

- **HIGH** - dokument każe użyć komendy albo bramki, której nie ma, albo podaje liczbę bramki
  z innej epoki. Przykład: `CLAUDE.md:188` każe domknąć zadanie wynikiem 14/14, gdy scenariuszy
  jest 31; `npm run dev` reklamowany w dwóch dokumentach, a skryptu nie ma.
- **MEDIUM** - dokument modułu przeczy strukturze kodu albo sam sobie. Przykład: drzewko w
  `core/CLAUDE.md` wymienia pliki, które ten sam dokument 80 linii niżej ogłasza skasowanymi.
- **LOW** - nieaktualne sformułowanie bez skutku operacyjnego. Przykład: wersja podana dwa razy
  w dwóch wartościach (`2.1.0` w nagłówku, `v1.2.1` pięć akapitów niżej).
- **INFO** - obserwacja-budulec: dokument starszy od kodu o dwa tygodnie, brak linku, martwy
  odnośnik do pliku archiwalnego.

CRITICAL w tej karcie nie występuje - kłamstwo w dokumencie nie kasuje danych. Jeżeli dokument
obiecuje zabezpieczenie, którego nie ma, to znalezisko należy do karty `security`, nie tutaj.

## Dowód wymagany

Dwa cytaty, zawsze oba:

1. **Cytat z dokumentu** - `plik:linia` + dosłowny fragment (max 3 linie).
2. **Kontrdowód z kodu** - `plik:linia` z kodu ALBO komenda z jej świeżym outputem.

Plus w `sprawdzone[]`: czym szukałeś kontrdowodu, żeby lider widział, że "nie ma" znaczy
"szukałem i nie ma", a nie "nie widziałem".

Zabronione: "dokumentacja jest nieaktualna" bez wskazania zdania. Zdanie albo nic.

## Znane

Z Risk registeru Katalogu (`40_Pracownie/Dev Desktop/Projekty/PKM Assistant/Katalog_Audytow.md`,
sekcja "Risk register"). Nie odkrywaj ponownie - w raporcie daj status nadal / naprawione / nie sprawdzono.

- **2026-08-20** - `npm run dev` to komenda widmo: stoi w `CLAUDE.md` i w `README.md`, a nigdy
  nie było jej w `package.json`. Sprawdzić czy nadal.
- **2026-08-20** - główny `CLAUDE.md` opisuje bramki merge liczbami z innej epoki: `harness:scenarios`
  jako "14 scenariuszy" i `npm test` jako 1403/1398, gdy realny bieg to 31. Sprawdzić czy nadal.
- **2026-08-20** - `core/CLAUDE.md` przeczy sam sobie w odległości 80 linii (trzy pliki
  SC-derived w drzewku i ogłoszone skasowanymi niżej) i nie zna połowy własnego katalogu. Sprawdzić czy nadal.
- **2026-08-20** - główny `CLAUDE.md` podaje wersję pluginu w dwóch miejscach i dwóch wartościach
  (nagłówek 2.1.0, priorytet nr 1 "w produkcji v1.2.1"). Sprawdzić czy nadal.
- **2026-08-20** - `CHANGELOG.md` urwał się 297 commitów temu (ostatni wpis: Komunikator v3, S28,
  2026-07-29). Werdykt Kuby: "zabrać się". Tylko status, nie nowe znalezisko.
- **2026-08-21** - dawny folder-tombstone po wyciętym forku miał dokument opisany w czasie
  teraźniejszym: katalog miał wtedy jeden plik (ten dokument), a tabela wyliczała ~8400 LOC
  w 11 folderach. Od porządków clean-room (2026-09) cały folder, razem z dokumentem, jest
  skasowany - zamknięte, nie odkrywać ponownie.
- **2026-08-21** - `modules/agents/AgentProfileView.ts:48` i `modules/komunikator/CommunicatorView.ts:17`
  mają w JSDoc `@param {import('./SidebarNav.js')}`, a `SidebarNav.ts` leży w `modules/shell/sidebar/`.
  Sprawdzić czy nadal.

## Źródła

- mattpocock/skills, `skills/engineering/improve-codebase-architecture/SKILL.md`
  (https://github.com/mattpocock/skills, MIT) - pojęcie ADR jako zapisu decyzji, którego audyt
  nie relitygiuje; stąd punkt 15 checklisty.
- Repo PKM Assistant, HEAD `962908d2` - wszystkie liczby i ścieżki w tej karcie zmierzone
  2026-08-22, nie przepisane.
