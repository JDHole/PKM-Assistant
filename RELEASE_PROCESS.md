# Release process (v2.2+)

> Zastępuje runbook epoki v2.0 — przeniesiony do archiwum: [`releases/RELEASE_PROCESS_v2.0_ARCHIWUM.md`](releases/RELEASE_PROCESS_v2.0_ARCHIWUM.md) (publikował RC przez martwy branch `refactor/v2.0`, pomijał 5 z 7 bramek). Ten plik opisuje, co skrypty repo REALNIE robią dziś — sprawdzone czytaniem `release.js`, `utils/releaseNotes.ts` i `esbuild.js` na HEAD, nie z pamięci.

## Zasada: wersja i tag idą z plików, nigdy ze sztywnego zapisu

Źródło prawdy to `package.json` (`version`), `manifest.json` (`version` + `minAppVersion`), `package-lock.json` (`version`) i `versions.json` (mapa wersja→minAppVersion). `release.js` twardo sprawdza `package.json.version === manifest.json.version` i przerywa (`exit 1`) na niezgodności — nie ma żadnego automatu, który to za ciebie naprawi.

**Tag release'u = `manifest.json.version`, znak w znak, BEZ litery `v`.** To wymóg katalogu
społeczności Obsidiana, nie nasza preferencja: katalog szuka release'u o tagu równym wersji
z manifestu i dopiero z niego bierze `main.js`, `manifest.json` i `styles.css`. Tagi
`v1.2.1`, `v2.0.0`, `v2.1.0` zostają w historii jako świadectwo epoki sprzed katalogu —
**od `2.2.0` tagujemy bez prefiksu** (szczegóły przy Kroku 5.2).

## Wymagania maszyny releasującej

Poza Node (`engines.node` w `package.json`) i `GH_TOKEN`/`GH_REPO` w `.env` (Krok 5.6), skrypt
wymaga binarki **`curl` w PATH, w wersji ≥7.55** (AUD-dead-code-159, 2026-09-02). Wszystkie
assety release'u — zip, `main.js`, `manifest.json`, `styles.css`, `THIRD-PARTY-LICENSES.md` —
idą przez `exec('curl …')` (Krok 5.8), **PO TYM** jak release na GitHubie już istnieje (Krok 5.7).
Wersja ma znaczenie: token trafia do curla przez plik (`-H "@plik"`, Krok 5.9), a składnia
`@plik` w nagłówku jest wspierana dopiero od curl 7.55. Brak curla albo za stara wersja
kończy się release'em bez assetów — trzeba je dogrywać ręcznie przez UI GitHuba. Skrypt
dziś NIE sprawdza obecności/wersji curla z góry (`curl --version` przed Krokiem 5.7).

---

## Krok 1 — branch od main

```bash
git checkout main
git pull origin main
git checkout -b refactor/v2.2-release-<wersja>
```

## Krok 2 — bump wersji

- `package.json` → pole `version` (to jest właściwe źródło prawdy — czyta je i `esbuild.js`, i `release.js`).
- `package-lock.json` → pole `version` w dwóch miejscach (root + `packages[""]`).
- `versions.json` → dopisz nowy wpis `"<wersja>": "<minAppVersion>"`, gdzie `<minAppVersion>` to aktualna wartość `manifest.json.minAppVersion` (na HEAD to `1.2.3` — zweryfikuj, bo mogła się zmienić).
- `manifest.json` → pole `version` możesz zostawić bez ręcznej edycji: **`npm run build` nadpisuje je wartością z `package.json` automatycznie** (stemplowanie manifestu w `esbuild.js` — dzieje się przy KAŻDYM buildzie). Masz `npm run build` w bramkach kroku 3, więc do tego momentu `manifest.json` i tak się zsynchronizuje.

⚠️ **Pułapka:** ten auto-zapis `manifest.json` przez `npm run build` zostawia zmianę w working tree. Zanim zrobisz commit release prep, sprawdź `git status` — `manifest.json` MUSI wejść do tego samego commita, inaczej `release.js` odbije się o guard niezgodności wersji.

Commituj bump (i przebudowany `manifest.json`) na branchu roboczym.

## Krok 3 — bramki, wszystkie zielone

```bash
npm test
npm run typecheck
npm run lint
npm run lint:obsidian
npm run build
npm run harness:selftest
npm run harness:scenarios
```

To te same siedem komend co w root `CLAUDE.md` (sekcja „Git flow"). `lint:obsidian` nie ma żadnego wyjątku ani porównania z baseline — ma wyjść zielony (`exit 0`), tak jak reszta. Czerwone cokolwiek → STOP, napraw, dopiero potem dalej.

> Jeśli masz `DESTINATION_VAULTS` ustawione w swoim `.env` (auto-deploy pluginu do vaulta po buildzie, patrz `esbuild.js`), `npm run build` w tym kroku (i drugi raz wewnątrz `release.js` w kroku 5) wdroży bieżący build do tych vaultów jak przy zwykłej pracy deweloperskiej — to nie jest coś specjalnego dla release'u, ale warto wiedzieć, że się dzieje.

## Krok 4 — merge do main

```bash
git push origin refactor/v2.2-release-<wersja>
git checkout main
git merge --no-ff refactor/v2.2-release-<wersja>
git push origin main
```

## Krok 5 — `npm run release` (na czystym `main`)

Co skrypt (`release.js`, helpery w `utils/releaseNotes.ts`, `utils/releaseGithub.ts`) robi krok po kroku:

1. **Walidacja wersji.** Czyta `version` z `package.json` i `manifest.json` — różnica = `exit 1`. Skrypt SAM niczego nie bumpuje, to musiało się stać w kroku 2.
2. **Potwierdzenie wersji — wciśnij ENTER.** Skrypt pyta na konsoli `Confirm release version (X.Y.Z): `. **Enter bierze GOŁĄ wartość z `package.json`, BEZ prefiksu `v` — i to jest zachowanie POPRAWNE.** To, co wpiszesz (albo zatwierdzisz Enterem), leci prosto do `tag_name` i `name` release'u, a także do nazwy pliku notatek `releases/<wersja>.md`.

   ⚠️ **Katalog społeczności Obsidiana wymaga, żeby tag release'u był DOKŁADNIE równy `manifest.json.version` — bez litery `v`.** Katalog pobiera `main.js`, `manifest.json` i `styles.css` z release'u o tagu równym wersji z manifestu; tag `v2.2.0` przy `"version": "2.2.0"` = plugin nie do zainstalowania z katalogu. Dlatego stary zapis tej instrukcji („wpisz ręcznie `vX.Y.Z`") jest ODWRÓCONY względem wymogu katalogu i został wycofany.

   **Tagi historyczne `v1.2.1`, `v2.0.0`, `v2.1.0` zostają jak są** — to historia sprzed drogi do katalogu, nie ruszamy jej. **Od `2.2.0` w górę tagi są bez `v`.** Rozjazd w liście tagów jest świadomy i zamierzony.
3. **Notatki wydania.** Jeśli `releases/<wersja>.md` już istnieje, bierze go 1:1. Jeśli nie — łączy najnowszy istniejący numerowany plik z `releases/` (jeśli jest) z opisem, o który zapyta na konsoli, i zapisuje wynik do `releases/<wersja>.md`.
   ⚠️ Ten punkt opisuje docelowe zachowanie po naprawie z równoległej sesji 2026-08-27 (AUD-docs-009): bez niej pusty `releases/` — czyli ANI jednego pliku `X.Y.Z.md` — wywalał skrypt na zapisie do `null` (`fs.writeFileSync(null, …)` na ścieżce liczonej WYŁĄCZNIE do odczytu). Naprawa: ścieżka zapisu (`resolveNotesTarget`) jest dziś zawsze-nie-null i nie dotyka dysku — helper do odczytu poprzednich notatek (`latestReleaseFile`) służy odtąd tylko do tego.
4. **`releases/latest_release.md`.** Generuje sformatowaną wersję not (nagłówek + zwinięte starsze patch'e) pod widok w samym pluginie (`ReleaseNotesView` — ekran „co nowego" po starcie).
5. **Rebuild.** Odpala build jeszcze raz — `node esbuild.js` wprost przez bieżącego Node'a (to samo, co `npm run build`; `spawnSync('npm.cmd')` bez powłoki pada na Windows z `EINVAL` od Node ≥ 20.12) — świeży `dist/` dokładnie pod potwierdzoną wersję. Błąd builda przerywa cały release (nie leci dalej na pół-udanym `dist/`).
6. **Autoryzacja GitHub.** Wymaga `GH_TOKEN` (personal access token) i `GH_REPO` (format `właściciel/repo`, czyli `JDHole/pkm-assistant`) w `.env` w rocie repo. Brak jednego z nich = czytelny błąd i `exit 1`.
   ⚠️ `.env.example` na HEAD wymienia TYLKO `DESTINATION_VAULTS` — `GH_TOKEN`/`GH_REPO` dopisz do własnego `.env` ręcznie (plik jest gitignorowany, nigdy nie commituj go ani nie wklejaj tokena do żadnego dokumentu).
7. **Release na GitHubie.** Tworzy go przez REST API (`POST /repos/<GH_REPO>/releases`) z `tag_name`/`name` = wersja z kroku 2, `body` = notatki z kroku 3. `prerelease` jest ZAWSZE `false` — skrypt nie zna już trybu RC/prerelease ze starego runbooku. `draft` jest `true` tylko gdy odpalisz `npm run release -- --draft` (wtedy release wisi na GitHubie niepublikowany, do ręcznego zatwierdzenia).
8. **Assety.** Pakuje `dist/` do `<manifest.id>-<wersja>.zip` (dziś `manifest.id` = `pkm-assistant`), dokłada do zipa `THIRD-PARTY-LICENSES.md` jeśli plik istnieje (ostrzega na konsoli, jeśli nie — release i tak leci dalej bez niego). Wrzuca na GitHuba osobno: zip, każdy plik z `dist/` (`main.js`, `manifest.json`, `styles.css`) i `THIRD-PARTY-LICENSES.md` jeszcze raz jako samodzielny asset. Kasuje lokalny zip po 3 sekundach.
9. **Bezpieczeństwo tokena** (AUD-deps-002). Token nigdy nie ląduje w argumentach widocznych w liście procesów systemu ani w wypisanym błędzie — do curla trafia przez tymczasowy plik (`-H "@plik"`, kasowany w `finally` i na `SIGINT`/`SIGTERM`), a każdy komunikat konsoli jest maskowany.

## Krok 6 — zsynchronizuj lokalne tagi

`release.js` tworzy tag WYŁĄCZNIE zdalnie, przez API GitHuba — nie ma tu lokalnego `git tag` ani `git push --tags`. Po sukcesie ściągnij go do swojego klonu:

```bash
git fetch --tags
```

Sprawdź, co przyjechało — nowy tag ma być gołą wersją (`2.2.0`), obok starszych z prefiksem:

```bash
git tag --list --sort=-v:refname | head -5
```

## Krok 7 — zweryfikuj na GitHubie

Release istnieje, **tag jest BEZ prefiksu `v` i znak w znak równy `manifest.json.version`**
(czyli `2.2.0`, nie `v2.2.0`), `body` wygląda sensownie, a assety to: zip, `main.js`,
`manifest.json`, `styles.css` i `THIRD-PARTY-LICENSES.md` (5 sztuk, jeśli plik licencji
istniał w kroku 5.8). Trzy pliki z tej piątki (`main.js`, `manifest.json`, `styles.css`)
to dokładnie to, co pobiera katalog — muszą leżeć jako osobne assety, nie tylko w zipie.

## Krok 8 — zgłoszenie do katalogu społeczności (robi Kuba)

Tylko przy pierwszym wejściu do katalogu; kolejne wersje katalog podbiera sam z nowych
release'ów, bez ponownego zgłaszania.

Instrukcja źródłowa: <https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin>.
Na dziś (wrzesień 2026) opisuje ona portal <https://community.obsidian.md> — logowanie
kontem Obsidian, podpięcie konta GitHub, wskazanie repozytorium i automatyczna
weryfikacja. **Sprawdź tę stronę w dniu zgłoszenia** — nasze notatki z lipca opisywały
jeszcze starszą ścieżkę (ręczny PR do repo `obsidianmd/obsidian-releases`) i mogą być
nieaktualne w drugą stronę.

Zanim klikniesz „zgłoś", w repo musi być:

- **`README.md`** — opis pluginu; to jest strona pluginu w katalogu.
- **`LICENSE`** — pełny tekst licencji (u nas GPL-3.0).
- **`manifest.json` na HEAD domyślnego brancha** (`main`) — katalog czyta manifest
  właśnie stamtąd, nie z release'u. `id` = `pkm-assistant` (bez słowa „obsidian" w id
  i w nazwie — wymóg), `version` w formacie semver bez `v`, `minAppVersion` zgodne
  z rzeczywiście używanym API.
- **Release o tagu równym `manifest.version`** z assetami `main.js`, `manifest.json`
  i `styles.css` (Krok 7).

To jest **krok Kuby (baza)**, nie sesji roboczej: wymaga zalogowania się na konto
Obsidian i konto GitHub. Sesja robocza przygotowuje repo do tego kroku i nic więcej.

---

## Czym się różni od runbooku v2.0 (archiwum)

- **Branch:** `refactor/v2.2-<nazwa>` → `main` bezpośrednio. Nie ma już pośredniego `refactor/v2.0` — ten branch jest dziś kotwicą historyczną, merge do niego zabroniony (patrz root `CLAUDE.md`).
- **Bramki:** siedem komend (test, typecheck, lint, lint:obsidian, build, harness:selftest, harness:scenarios), nie dwie (test+build).
- **Publikacja:** `npm run release` sam tworzy tag + release + wszystkie assety przez API GitHuba. Nie ma już osobnych ręcznych wywołań `gh release create` / `gh release upload`.
- **Brak trybu RC/prerelease:** stary runbook publikował `vX.Y.0-rc.1` jako prerelease, czekał tydzień na smoke, dopiero potem promował do stable. Dzisiejszy `release.js` nie zna `--prerelease` — każde uruchomienie bez `--draft` publikuje pełny, niedraftowy release od razu. Praktyka od v2.1.0 już to potwierdza: brak taga `-rc.1` w historii tego wydania.
