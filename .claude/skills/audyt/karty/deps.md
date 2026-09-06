# Karta: deps (moduł katalogu 18)

Bada łańcuch dostaw: co realnie wjeżdża do `dist/main.js`, czy któraś paczka wnosi podatność i czy
do repo albo do bundla nie wyciekł sekret. Plugin jedzie w rendererze Electrona z pełnym Node i bez
sandboxa - nie ma drugiej linii obrony, obcy kod w bundlu ma vault i klucze usera od razu.

## Zakres

Zweryfikowane na HEAD `962908d2`, stan 2026-08-22:

- `package.json` - **3 dependencies**: `@modelcontextprotocol/sdk` `^1.29.0`, `@orama/orama` `^3.1.18`,
  `obsidian` `latest`; **12 devDependencies**: `@types/node`, `archiver`, `ava`, `axios`, `dotenv`,
  `esbuild`, `eslint`, `eslint-plugin-obsidianmd`, `swagger-jsdoc`, `tsx`, `typescript`,
  `typescript-eslint`. Zero `preinstall`/`postinstall`/`prepare`/`prepublish`.
- `package-lock.json` - tylko nagłówek: `lockfileVersion: 3`, `pkm-assistant`, `2.1.0`; wersjonowany
- `esbuild.js` (lista `external`, wstrzykiwanie env), `.gitignore`, `.env.example` (386 B:
  `DEFAULT_OPEN_ROUTER_API_KEY`, `DESTINATION_VAULTS`)
- `dist/main.js` jako miejsce, gdzie sekret mógłby wylądować; historia gita (ograniczone przeszukanie)

Poza zakresem: nieużywany eksport i plik-sierota → `dead-code` (tu tylko paczka-widmo i martwa
ZALEŻNOŚĆ); granice zaufania serwerów MCP → `security`; waga paczki w bundlu jako metryka → `wydajnosc`.

## Poprzeczka

1. **Bramka delta na podatnościach** - alarm tylko na tym, co nowe (procedura niżej).
2. **Prod deps: zero HIGH/CRITICAL osiągalnych** - podatność w trzech paczkach produkcyjnych jedzie do usera, o ile paczka nie jest `external`.
3. **Zero sekretów poza `.env` i `harness/.env.local`.** Oba gitignorowane (`.gitignore` ma `.env`,
   `.env.*`, `!.env.example` oraz osobną linię `harness/.env.local`), więc gitleaks ZNAJDZIE lokalny
   `.env` i to oczekiwane. Znalezisko = sekret gdzie indziej: kod, test, fixture, `dist/main.js`, historia.
4. **Każda zależność używana, każdy import zadeklarowany** - w obie strony.

Jak obalacz sprawdza poprzeczkę: otwiera plik z `surowe/`, znajduje wpis, o którym mówi szukacz,
i potwierdza klasyfikację prod/dev własnym `npm ls <pakiet>`. Werdykt bez surowego outputu = NIEWERYFIKOWALNE.

## Kawałki startowe

| id | nazwa | zakres | poprzeczka kawałka |
|---|---|---|---|
| k1 | Prod deps | dependencies, `npm audit --omit=dev` | zero HIGH/CRITICAL w trzech paczkach produkcyjnych; dev osobno, `--include-dev-deps` |
| k2 | Paczki-widma | importy vs `package.json` | każdy import ma deklarację (znane: `js-yaml`) |
| k3 | Martwe zależności | `package.json` vs grep importów i 11 skryptów npm | każda deklaracja ma użycie (znane: `swagger-jsdoc`) |
| k4 | Pinowanie i lockfile | `package.json`, `package-lock.json`, `.gitignore` | brak `latest`/`*`; lockfile w repo (dziś `obsidian: "latest"`) |
| k5 | Sekrety w repo | gitleaks na katalogu | zero sekretów poza gitignorowanymi `.env` |
| k6 | Sekrety w bundlu i w historii | `dist/main.js`, `esbuild.js` `define`, `git log -S` | build nie zapieka klucza; nic nie wjechało do historii |
| k7 | Build na czystym klonie | `esbuild.js`, `.env` | `npm run build` przechodzi bez `.env` (znane 08-12) |
| k8 | Skrypty, rejestr, licencje | `package.json` scripts, `.npmrc`, `node_modules/*/LICENSE` | zero hooków instalacyjnych i tokenów rejestru; licencje prod zgodne z dystrybucją |

## Checklista szukacza

1. **`npm audit` w dwóch wariantach.** Prod: `npm audit --omit=dev --json`. Pełny: `npm audit --json`.
   Podatność obecna TYLKO w pełnym = devDependency.
2. **Klasyfikacja każdego trafienia.** `npm ls <pakiet>` pokazuje, przez kogo paczka wchodzi.
   Bez tego nie wolno napisać "prod" ani "dev".
3. **Osiągalność w bundlu.** Podatność w prod dep liczy się dopiero, gdy paczka realnie ląduje
   w `dist/main.js`. Lista `external` w `esbuild.js` to dziś `electron`, `obsidian`, `crypto`,
   `http`, `https`, `url` - co jest `external`, tego w bundlu nie ma.
4. **Trivy i gitleaks.** Trivy domyślnie NIE raportuje dev dependencies - `--include-dev-deps` to
   zmienia; domyślne skanery to `vuln,secret`, `misconfig` i `license` zostawiamy wyłączone.
   Gitleaks: `gitleaks dir .` na katalogu roboczym, odsiej `.env` i `harness/.env.local`, reszta
   jest kandydatem.
5. **Wstrzykiwanie env do bundla.** `esbuild.js` ma w `define`:
   ```
       'process.env.DEFAULT_OPEN_ROUTER_API_KEY': JSON.stringify(process.env.DEFAULT_OPEN_ROUTER_API_KEY || ''),
   ```
   Build z ustawionym `.env` ZAPIEKA wartość klucza w `dist/main.js` jako literał, a nazwa zmiennej
   po podstawieniu znika (dziś `grep -c "DEFAULT_OPEN_ROUTER_API_KEY" dist/main.js` → **0**).
   Szukaj wzorców klucza, nie nazwy.
6. **Grep bundla po wzorcach kluczy.**
   `grep -cE "sk-or-v1-[A-Za-z0-9]|sk-ant-[A-Za-z0-9]|AIza[A-Za-z0-9]{20}|ghp_[A-Za-z0-9]{20}" dist/main.js`
   → dziś **0**. Gdy kiedyś będzie > 0 - to CRITICAL i pierwsze zdanie raportu.
7. **Historia gita.** `git log -p --all -S "sk-or-v1-" -- . | head -200` (analogicznie `sk-ant-`,
   `AIza`, `ghp_`). Ograniczaj `head`, inaczej utopisz kontekst.
8. **Paczka-widmo.** `grep -rn "from 'js-yaml'" --include=*.ts core modules src config utils | grep -v ".test.ts"`
   → dziś 1 plik produkcyjny: `core/utils/yamlParser.ts:5` (drugi ówczesny importer,
   `src/core/VaultZones.ts`, wycięty 2026-09-03 jako martwy kod - dziś go nie ma), a
   `grep -c "js-yaml" package.json` → **0**. Wzorzec do powtórzenia: wyciągnij specyfikatory importów
   niezaczynające się od `.` i zderz z `package.json`.
9. **Martwa zależność.** Odwrotność: dla każdej z 15 paczek sprawdź, czy jest importowana albo używana
   przez skrypt npm. Dziś `swagger-jsdoc` nie ma importu i nie dotyka go żaden z 11 skryptów.
10. **`npx knip`** - drugi silnik na te same pytania; konfiguracja w karcie `dead-code`, lider zapisuje
    ją do `audyt/biegi/{id}/knip.json`. **`npm outdated --json`** - materiał na LOW, nie na alarm.
11. **Pinowanie i lockfile.** `grep -nE '"[^"]+": *"(\*|latest|>=)' package.json` → dziś
    **`"obsidian": "latest"`**. Zanim zgłosisz: `obsidian` jest `external` (p. 3), więc w bundlu go
    nie ma - to zmienia promień rażenia, nie kasuje sprawy (API i typy płyną między buildami).
    Lockfile: `grep -n "package-lock" .gitignore` → dziś zero trafień, tak ma być.
12. **Skrypty instalacyjne i rejestr.**
    `node -e "const s=require('./package.json').scripts;console.log(['preinstall','postinstall','prepare','prepublish'].map(k=>k+': '+(s[k]||'BRAK')).join('\n'))"`
    → dziś wszystkie BRAK. Plus `ls -la .npmrc` (dziś pliku nie ma) i `grep -rn "_authToken" .npmrc 2>/dev/null`
    - token npm w repo to CRITICAL.
13. **Build na czystym klonie.** Sprawdź w `esbuild.js`, czy `define` ma fallback `|| ''` (dziś ma,
    p. 5). To zamyka znane 08-12; potwierdź, że nie wróciło.
14. **Licencje prod deps.** `npm ls --depth=0` + `head -3 node_modules/<pakiet>/LICENSE`.

## Czego NIE flagować

1. **Podatność w devDependency jako HIGH.** Devowa to MEDIUM najwyżej i tylko gdy paczka bierze udział
   w buildzie z niezaufanym wejściem; `ava`, `eslint`, `typescript` mielą własny kod repo.
2. **`.env` i `harness/.env.local` znalezione przez gitleaks** - oba gitignorowane (zweryfikowane).
   To samo `.env.example`: puste wartości (`DEFAULT_OPEN_ROUTER_API_KEY=""`) i jawne odwyjątkowanie
   w `.gitignore` (`!.env.example`).
3. **Advisory bez dostępnego fixa** - INFO ze statusem, nie HIGH z pretensją. **Auto-bump**: NIGDY nie
   podnosisz wersji, nie odpalasz `npm audit fix`, nie ruszasz lockfile'a.
4. **Podatność w paczce z listy `external`** jako "podatność w bundlu". Sprawdź `external`, zanim
   napiszesz "jedzie do usera".
5. **Rzeczy zgłoszone 21.08** (`js-yaml`, `swagger-jsdoc`) - patrz Znane, tylko status.
6. **Nieużywany eksport wewnątrz repo** - karta `dead-code`, nie ta. Szumy narzędzi
   (`npm notice` o nowej wersji npm) też nie są znaleziskiem.

## Narzędzia i komendy

Trivy 0.74.0 i gitleaks 8.30.1 są zainstalowane przez winget w zasięgu usera:

```
C:\Users\jdziu\AppData\Local\Microsoft\WinGet\Packages\AquaSecurity.Trivy_Microsoft.Winget.Source_8wekyb3d8bbwe\trivy.exe
C:\Users\jdziu\AppData\Local\Microsoft\WinGet\Packages\Gitleaks.Gitleaks_Microsoft.Winget.Source_8wekyb3d8bbwe\gitleaks.exe
```

W świeżo otwartej powłoce oba są na PATH; w powłoce otwartej PRZED instalacją nie ma ich - odśwież
PATH bez restartu: `$env:Path = [Environment]::GetEnvironmentVariable("Path","User") + ";" + $env:Path`.
Sprawdzenie przed biegiem: `trivy --version` (dziś `Version: 0.74.0`), `gitleaks version` (dziś
`8.30.1`). Któregokolwiek brak → bieg jedzie bez niego, a raport odnotowuje to w Środowisku.

```bash
npm audit --omit=dev --json > audyt/biegi/{id}/surowe/audit-prod.json
npm audit --json > audyt/biegi/{id}/surowe/audit-full.json
trivy fs --scanners vuln,secret --include-dev-deps --format json --output audyt/biegi/{id}/surowe/trivy.json .
gitleaks dir . --report-path audyt/biegi/{id}/surowe/gitleaks.json --report-format json
npx knip --config audyt/biegi/{id}/knip.json
npm outdated --json > audyt/biegi/{id}/surowe/outdated.json
npm ls <pakiet>
npm ls --depth=0
```

Składnia zweryfikowana w docs narzędzi i w ich `--help`: `trivy fs` bierze `-f/--format` i `-o/--output`,
`--scanners` przyjmuje `vuln,misconfig,secret,license` (domyślnie `vuln,secret`), `--include-dev-deps`
włącza raportowanie dev dependencies pomijanych domyślnie (npm, yarn, gradle). Gitleaks: `dir` to
komenda do skanu katalogu (dawne `detect` przestarzałe od 8.19.0), `-r/--report-path` to plik raportu,
`-f/--report-format` przyjmuje `json`, `csv`, `junit`, `sarif`, `template`. Kody wyjścia gitleaks:
0 = czysto, 1 = wycieki albo błąd, 126 = nieznana flaga - exit 1 NIE jest awarią biegu.

### Baseline `audyt/baseline/deps.json`

```json
{
  "generated": "2026-08-22",
  "head": "962908d2",
  "source": "npm audit --json",
  "findings": [
    { "package": "js-yaml", "severity": "high", "range": "<3.13.1", "dev": true }
  ],
  "totals": { "critical": 0, "high": 0, "moderate": 0, "low": 0 }
}
```

Wpis w `findings` to ILUSTRACJA formatu, nie pomiar - pierwszy bieg wypełnia plik realnym `npm audit`.

### Bramka delta - krok po kroku

1. **Fingerprint** znaleziska = `pakiet|severity|range`. Nic więcej - numer advisory potrafi się zmienić
   przy tej samej podatności.
2. `ls audyt/baseline/deps.json`. **Nie ma** → zbuduj plik z dzisiejszego `npm audit --json`, zgłoś
   JEDNO znalezisko `INFO` ("baseline założony, N podatności"), zero alarmu.
3. **Jest** → wczytaj i zbuduj dwa zbiory fingerprintów: baseline i dzisiejszy.
4. Fingerprint dzisiejszy spoza baseline → **ALARM**, severity wg sekcji niżej. To samo, gdy
   `totals.critical`/`totals.high` wzrosło mimo zgodnych fingerprintów (advisory podniosło ocenę).
5. Fingerprint zniknął albo `totals` spadły → cicho, bez znaleziska.
6. Po biegu **zawsze** nadpisz `deps.json` dzisiejszym stanem - także po alarmie. Baseline, którego
   się nie odświeża, alarmuje w kółko tym samym.
7. Zmienił się `source` (inne narzędzie, inna wersja npm) → nie porównuj, załóż baseline od nowa
   i napisz o tym w Środowisku raportu.
8. Trivy i gitleaks NIE wchodzą do `deps.json` - ich wyniki idą do `surowe/` i do raportu wprost; sekret nigdy nie jest "znany".

## Severity w tej domenie

- **CRITICAL** - sekret w `dist/`, w repo albo w historii gita. Przykład: klucz OpenRoutera zapieczony w `dist/main.js` przez build z `.env`; token npm w `.npmrc`.
- **HIGH** - produkcyjna zależność z HIGH/CRITICAL CVE realnie lądująca w bundlu (nie `external`), np. CVE w `@modelcontextprotocol/sdk` albo `@orama/orama`.
- **MEDIUM** - paczka-widmo w kodzie produkcyjnym; martwa zależność z podatnością; devDependency podatna
  w ścieżce builda. Przykład: `js-yaml` - dwa importy produkcyjne, wersja tranzytywnie po dev.
- **LOW** - paczka przeterminowana bez znanej podatności; nieprzypięta wersja bez skutku dziś.
  **INFO** - advisory bez fixa; założenie baseline'u; licencja do odnotowania.

## Dowód wymagany

Trzy elementy, wszystkie trzy: (1) **output narzędzia** - nazwa pliku w `audyt/biegi/{id}/surowe/`
+ zacytowany fragment (nie cały JSON, tylko wpis, o którym mówisz; sekret cytujesz ZAWSZE
zamaskowany - pierwsze 4 znaki i długość, nigdy pełna wartość); (2) **`npm ls <pakiet>`** - świeży
output dowodzący klasyfikacji prod/dev i pokazujący ścieżkę w drzewie; (3) **`plik:linia`** importu
albo skryptu, który paczki używa - a przy martwej zależności odwrotnie: `sprawdzone[]` z komendami,
którymi szukałeś użycia i nie znalazłeś.

Bez punktu 2 znalezisko jest OBALANE jako "klasyfikacja nieuzasadniona" - `npm audit` sam nie mówi, czy paczka jedzie do usera.

## Znane

Z Risk registeru Katalogu; w raporcie status nadal / naprawione / nie sprawdzono.

- **2026-08-21** - PRIORYTET: kod produkcyjny stoi na paczce, której nie ma w `package.json` -
  `js-yaml` importuje `core/utils/yamlParser.ts:5` (drugi ówczesny importer,
  `src/core/VaultZones.ts`, wycięty 2026-09-03 jako martwy kod), a do drzewa wpada
  wyłącznie tranzytywnie ścieżkami devowymi. Sprawdzić czy nadal.
- **2026-08-22** - domknięcie pomiarowe tamtego: `js-yaml` waży w `dist/main.js` 44 KB, zmierzone
  metafile'em. Sprawdzić czy nadal.
- **2026-08-21** - PRIORYTET: `swagger-jsdoc` (`^6.2.8`, devDependencies) to martwa zależność bez
  importu i bez skryptu npm, płacąca za siebie podatnością w audycie. Sprawdzić czy nadal.
- **2026-08-12** - PRIORYTET: `npm run build` padał na czystym klonie przez brak fallbacku w
  `esbuild.js`. Sprawdzić czy nadal - na HEAD `962908d2` fallback `|| ''` w `define` jest.
- **2026-08-11** - baseline `npm audit`: 7 podatności (3 moderate, 4 high, m.in. `js-yaml`); status
  "otwarte", do przejrzenia, czy fix nie wymaga bumpów majorów. Sprawdzić czy nadal.

## Źródła

- getsentry/skills, `skills/security-review/references/supply-chain.md`
  (https://github.com/getsentry/skills, Apache-2.0) - adaptowane części mające sens dla pluginu
  npm/Node bez serwera: wzorce nieprzypiętych wersji (`latest`, `*`, `>=`), wymóg lockfile'a w repo,
  przegląd skryptów `preinstall`/`postinstall`, poświadczenia rejestru w `.npmrc`, wskaźniki złośliwej
  paczki, grepy detekcyjne. POMINIĘTE: CI/CD i GitHub Actions (repo nie ma workflowów), rejestry
  prywatne, SBOM, wendorowanie, część pythonowa.
- Trivy docs (https://trivy.dev/docs/latest/guide/target/filesystem/ oraz
  https://trivy.dev/docs/latest/coverage/language/nodejs/) - `trivy fs`, `--scanners`, `--include-dev-deps`.
- Gitleaks README (https://github.com/gitleaks/gitleaks) - `gitleaks dir`, `--report-path`,
  `--report-format`, kody wyjścia.
- Repo PKM Assistant, HEAD `962908d2` - wszystkie liczby, cytaty i ścieżki zmierzone 2026-08-22.
