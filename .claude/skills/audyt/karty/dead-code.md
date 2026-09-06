# Karta: dead-code (moduł katalogu 11)

Bada trupy i widma: eksporty, do których nikt nie sięga, pliki bez importerów, zależności
w `package.json` bez importu i - groźniejsza odwrotność - importy bez zależności. Wszystko
ląduje w jednym `dist/main.js`, więc trup nie tylko myli czytelnika: waży i płaci za siebie
podatnościami w audycie.

**ZASADA: NIGDY nie usuwasz. Zgłaszasz.** Nawet jedną linię, nawet "oczywisty" trup.
Decyzja o kasowaniu należy do Kuby i dzieje się poza audytem.

## Zakres

W zakresie: `package.json` (`dependencies` vs `devDependencies`, `scripts`), `esbuild.js`
(entry, `external`, `define`), `harness/esbuild.harness.ts`, `src/main.ts`, `release.js`,
`config/runtimeConfig.ts`, cały kod `core/ modules/ src/ config/ utils/`,
`.claude/worktrees/`, `core/i18n/`. Poza zakresem: podatności i sekrety -> `deps.md`
(ta karta oddaje tam listę martwych paczek); waga bundla -> `wydajnosc.md`; nagrobki
w dokumentach -> `docs.md`; jakość żywego kodu -> `code-review.md`.

## Poprzeczka

1. **Każdy eksport jest osiągalny** z `src/main.ts`, z pliku `*.test.ts` albo z entry
   harnessa (`harness/run.ts`, `harness/scenarios/_runner.ts`, `harness/esbuild.harness.ts`).
2. **Każda zależność z `package.json` ma import** w kodzie, teście albo skrypcie budującym.
3. **Każdy import ma zależność w `package.json`.** Odwrotność jest gorsza od trupa:
   paczka-widmo wchodzi do drzewa wyłącznie tranzytywnie, więc jej wersją steruje przypadek
   (znane: `js-yaml`).
4. **Zero plików-sierot** - plik `.ts` bez importera i niebędący entry.

Obalacz bierze nazwę symbolu albo paczki i sam szuka referencji (grep plus `npm ls`), zanim
uzna trupa. Jedno przeszukanie po nazwie nie wystarcza: sprawdź reeksport przez barrel
(`index.ts`), string w dynamicznym imporcie i użycie w skrypcie npm.

## Kawałki startowe

| nazwa | zakres | poprzeczka_kawalka |
|---|---|---|
| zależności produkcyjne | `package.json` (`dependencies`), `esbuild.js` | 3 paczki prod, każda z realnym importem w drzewie z `src/main.ts` |
| zależności deweloperskie | `package.json` (`devDependencies`, `scripts`) | 12 paczek dev, każda używana przez skrypt albo import |
| paczki-widma | importy vs `package.json` | zero importów paczek spoza `dependencies`/`devDependencies` |
| eksporty modułów AI | `modules/agent-loop/`, `modules/sub-agents/`, `modules/tools/` | każdy eksport osiągalny z entry albo z testu |
| eksporty modeli i rdzenia | `modules/models/`, `core/`, `src/core/` | jak wyżej, plus adaptery nieużywanych platform i API wystawiane globalnie |
| UI i widoki | `modules/ui-components/`, `modules/shell/`, `modules/onboarding/` | komponenty bez miejsca użycia |
| pozostałości po wyciętym forku | `config/runtimeConfig.ts` | dawny folder na resztki wyciętego forka już nie istnieje (zero pozostałości); `buildRuntimeConfig(deps)` jest dziś realną fabryką (56 linii) — sprawdzone 2026-09-06, zero śladów dawnego pustego obiektu configu z ery forka |
| lokalne trupy i i18n | całe repo, `core/i18n/` | zmienne, parametry i typy nieczytane; klucze bez odwołania |
| artefakty na dysku | `.claude/worktrees/`, `releases/`, `dist/` | katalogi-śmieci |

## Checklista szukacza

Stan zmierzony 2026-08-22, HEAD `962908d2`, Node v24.12.0, ripgrep 14.1.1.

1. **knip jako główny silnik** (config i komenda w "Narzędzia i komendy"). Wynik to SYGNAŁ,
   nie werdykt: każdą pozycję potwierdź własnym grepem, zanim wejdzie do znaleziska.
2. **Drugi silnik zależności.** `npx depcheck` - inne heurystyki. Pozycja pokazana przez
   OBA jest mocna; z jednego wymaga ręcznego potwierdzenia.
3. **Lokalne trupy przez kompilator.** Baseline `npx tsc --noEmit -p tsconfig.json` daje
   dziś exit 0; z flagami `--noUnusedLocals --noUnusedParameters` daje 129 błędów (123x
   TS6133 "declared but its value is never read", 6x TS6196). To lista kandydatów, nie 129
   znalezisk. Rozbicie: `... 2>&1 | grep -o "error TS[0-9]*" | sort | uniq -c | sort -rn`.
4. **Paczki-widma (import bez deklaracji).** Dla każdego importu paczki sprawdź, czy nazwa
   stoi w `package.json`. Kontrola wzorcowa: `grep -c "js-yaml" package.json` daje `0`, a
   `rg -n --glob '*.ts' "from ['\"]js-yaml" core modules src config utils` pokazuje
   `core/utils/yamlParser.ts:5` (produkcja!) i `modules/artifacts/basesView.test.ts:2`
   (dawny drugi importer produkcyjny, `src/core/VaultZones.ts`, wycięty 2026-09-03 jako martwy
   kod - dziś go nie ma); `npm ls js-yaml` potwierdza wejście wyłącznie tranzytywne (przez `ava`,
   `eslint`, `swagger-jsdoc`), w trzech wersjach.
5. **Martwe zależności.** Dla każdej z 15 paczek (`dependencies`: `@modelcontextprotocol/sdk`,
   `@orama/orama`, `obsidian`; `devDependencies`: `@types/node`, `archiver`, `ava`, `axios`,
   `dotenv`, `esbuild`, `eslint`, `eslint-plugin-obsidianmd`, `swagger-jsdoc`, `tsx`,
   `typescript`, `typescript-eslint`) odpal
   `rg -n "<paczka>" --glob '!node_modules' --glob '!package-lock.json' .` i przejdź
   WSZYSTKIE 11 skryptów npm. Kontrola: `swagger-jsdoc` ma dziś jedno trafienie,
   `package.json:49`, czyli własną deklarację.
6. **Eksporty bez referencji.** Kandydaci:
   `rg -o -N --glob '*.ts' --glob '!*.test.ts' '^export (async )?function ([A-Za-z0-9_]+)' -r '$2' core modules src config utils | sort -u`
   (dziś 527 nazw), potem per nazwa `rg -n "\b<nazwa>\b" --glob '*.ts' core modules src config utils harness | rg -v "^<plik definicji>"`.
   Rób to dla kawałka, nie dla całego repo naraz.
7. **Trzy drogi ucieczki przed werdyktem "martwy".** (a) barrel:
   `rg -n "export .*from" --glob 'index.ts' modules core`; (b) import dynamiczny:
   `rg -n --glob '*.ts' "await import\(|require\(" core modules src`; (c) API globalne:
   `rg -n --glob '*.ts' '\(window as|window\.[A-Za-z_]+ =|app\.plugins\.' core modules src`
   (dziś m.in. `src/main.ts:1041` wystawia globalnie `restart_plugin`).
8. **Pliki-sieroty.**
   `rg -n "<basename bez rozszerzenia>" --glob '*.ts' core modules src config utils harness | rg -v "^<sciezka pliku>"`
   Repo pisze specyfikatory z rozszerzeniem `.js` mimo plików `.ts` - uwzględnij to.
9. **Pozostałości po wyciętym frameworku.** Dawny folder na resztki forka już nie istnieje -
   próba wylistowania go dziś zwraca `No such file or directory` (folder skasowany
   w całości, nawet tombstone `CLAUDE.md` zniknął). Korzeniowy plik configu odziedziczony
   po forku przemianowano na `config/runtimeConfig.ts`: dziś to NIE pusty worek, tylko
   kontraktowa fabryka `buildRuntimeConfig(deps)` (56 linii, zaimplementowana i zielona pod
   testami — rejestruje dostawców czatu/embeddingu, klienta HTTP, transport streamu, pasek
   statusu). To nie są znaleziska kodu.
10. **Klucze i18n.** Klucze z `core/i18n/pl.ts` kontra
    `rg -n "t\('<klucz>'|t\(\"<klucz>\"" core modules src`. Zawsze INFO albo LOW.
11. **Artefakty na dysku.** `git worktree list` - dziś poza głównym drzewem trzy wpisy
    w gitignorowanym `.claude/worktrees/` (`elated-herschel-3c44c4`,
    `nostalgic-einstein-043e1c`, `ts3`). To cudze drzewa robocze: zgłaszasz, nie kasujesz.
12. **Klasyfikacja przed werdyktem.** Dla martwej paczki `npm ls <paczka>` (prod czy dev,
    przez kogo wchodzi) plus lista `external` z `esbuild.js:130-140` (`electron`, `obsidian`,
    `crypto`, `http`, `https`, `url`) - `external` nie wchodzi do bundla i to zmienia wagę.

## Czego NIE flagować

1. **Dawny folder na resztki wyciętego forka** - skasowany w całości w porządkach clean-room
   (2026-09): nawet tombstone `CLAUDE.md` już nie istnieje. Nie ma już czego flagować.
2. **API wystawiane globalnie albo innym pluginom** (`window.*`, `app.plugins.*`).
3. **Mocki i pomocniki harnessa** (`harness/mock/`, `harness/lib/Harness*`) - wołane przez
   scenariusze, często przez wstrzyknięcie, nie przez import.
4. **Helpery testowe i eksporty typów używane tylko w testach** - test jest legalnym
   konsumentem (dlatego `*.test.ts` jest w `entry` konfiguracji knipa).
5. **Paczki `external` z `esbuild.js`** jako "nieużywane w bundlu" - one z definicji
   zostają poza bundlem.
6. **Kod jawnie oznaczony w CLAUDE.md modułu jako szkielet do reaktywacji** (wzór:
   `modules/onboarding/` wyłączony w v2.0 z decyzją o powrocie w v3.0).
7. **Trupy w `dist/`, `releases/`, `harness/dist/`** - to artefakty budowania, nie kod.
8. **Wynik knipa albo depchecka bez własnego potwierdzenia grepem.** Narzędzie to sygnał.
9. **Nieużywany parametr wymagany przez sygnaturę interfejsu** (handler, callback API
   Obsidiana) - TS6133 potrafi tu kłamać.

## Narzędzia i komendy

`knip` NIE jest zainstalowany w repo (`npm ls knip` daje pusto), więc pierwsze `npx knip`
pobiera paczkę z rejestru npm - potrzebna sieć, a w nocy zgoda wg kontraktu nocy. Lider
zapisuje poniższy blok do `audyt/biegi/{id}/knip.json`:

```json
{
  "$schema": "https://unpkg.com/knip@6/schema.json",
  "entry": [
    "src/main.ts",
    "esbuild.js",
    "release.js",
    "harness/esbuild.harness.ts",
    "harness/run.ts",
    "harness/scenarios/_runner.ts",
    "harness/scenarios/index.ts",
    "**/*.test.ts"
  ],
  "project": ["**/*.ts"],
  "ignore": ["dist/**", "harness/dist/**", "releases/**", ".claude/**", "node_modules/**"]
}
```

Entry zweryfikowane w kodzie: `esbuild.js:96` bierze `process.argv[2] || 'src/main.ts'`,
`harness/esbuild.harness.ts:26-29` deklaruje DWA entry (`harness/run.ts` i
`harness/scenarios/_runner.ts`; `scenarios/index.ts` to rejestr importowany przez runnera,
trzymamy jawnie), `release.js` odpala skrypt `npm run release`.

Komendy (z KORZENIA repo, nie z katalogu biegu):

```bash
npx knip --config audyt/biegi/{id}/knip.json --reporter json > audyt/biegi/{id}/surowe/knip-raport.json
npx knip --config audyt/biegi/{id}/knip.json                      # wersja czytelna na stdout
npx depcheck                                                      # drugi silnik zależności
npx tsc --noEmit --noUnusedLocals --noUnusedParameters -p tsconfig.json
npm ls <paczka>                                                   # klasyfikacja prod/dev
git worktree list                                                 # artefakty na dysku
```

**Ścieżki w configu - sprawdź przy pierwszym biegu.** Dokumentacja knipa
(`overview/configuration`, `reference/configuration`, `reference/cli`,
`guides/configuring-project-files`) NIE mówi wprost, czy globy idą względem katalogu
roboczego, czy pliku konfiguracyjnego. Twarda przesłanka jest jedna: osobna flaga
`--directory` / `-D` opisana jako "uruchamia proces z innego katalogu (domyślnie bieżący)",
czyli anchorem jest katalog roboczy. Wołaj więc knipa Z KORZENIA repo i zrób test
przytomności: raport o zerze plików projektu albo zerze entry znaczy, że globy poszły
względem katalogu configu. Fallback: skopiuj ten sam JSON do korzenia jako
`knip.audyt.json`, odpal `npx knip --config knip.audyt.json`, po biegu skasuj kopię
z korzenia (config biegu zostaje w `audyt/biegi/{id}/knip.json`).

**CRLF.** Repo ma `core.autocrlf=true` i pliki z terminatorami CRLF. Ripgrep bez `--crlf`
gubi wzorce zakotwiczone na `$`: `rg -c '\) \{$' modules/agent-loop/AgentLoop.ts` daje
0 trafień (exit 1), `rg -c --crlf` na tym samym pliku daje 29; `grep -E '\) \{$'` w Git Bash
daje 29 bez flag, a `grep -P` pada tu na "supports only unibyte and UTF-8 locales".
Uwaga na ripgrepa: `-r` to REPLACE, nie `--recursive` - `rg -rn "wzorzec"` po cichu podmieni
wynik na literę `n`.

## Severity w tej domenie

- **MEDIUM** - paczka-widmo w kodzie PRODUKCYJNYM (kształt: `js-yaml` w
  `core/utils/yamlParser.ts`) albo martwa zależność ciągnąca za sobą podatność.
- **LOW** - nieużywany eksport, plik-sierota, martwa devDependency bez podatności,
  nieużywana zmienna lub parametr.
- **INFO** - nieużywany klucz i18n, artefakt na dysku (stary worktree), niespójność wzorca.

HIGH i CRITICAL tu nie występują: martwy kod sam z siebie nie kasuje danych. Jeśli martwa
paczka ma aktywną podatność albo trzyma sekret, znalezisko jest o TAMTYM i idzie do `deps.md`.

## Dowód wymagany

1. Nazwa symbolu, pliku albo paczki plus `plik:linia` DEFINICJI (dla paczki: linia
   w `package.json` albo wprost napisany jej brak).
2. Komenda narzędzia i wynik: plik w `surowe/` plus cytowany fragment raportu knipa,
   depchecka albo `tsc`.
3. Linia "szukałem referencji" z DOKŁADNĄ komendą grepa i jej wynikiem, plus potwierdzenie,
   że sprawdziłeś barrel `index.ts`, import dynamiczny i użycie globalne.
4. Dla paczki: output `npm ls <paczka>` (prod czy dev, przez kogo wchodzi do drzewa).

## Znane

Z Risk registeru `Katalog_Audytow.md`. Nie odkrywaj ponownie - ustal status i wpisz do
`znane_status`. Każdy wiersz: sprawdzić czy nadal.

- **2026-08-21** - `js-yaml` to paczka-widmo: importuje ją plik produkcyjny
  `core/utils/yamlParser.ts:5` (drugi ówczesny importer, `src/core/VaultZones.ts`, wycięty
  2026-09-03 jako martwy kod), a w `package.json` nie ma jej ani w `dependencies`, ani
  w `devDependencies` - wpada wyłącznie tranzytywnie.
- **2026-08-22** - domknięcie pomiarowe powyższego: metafile esbuilda pokazał, że `js-yaml`
  realnie ląduje w `dist/main.js` i waży w nim 44 KB.
- **2026-08-21** - `swagger-jsdoc` w `devDependencies` jest martwy: zero importów, zero
  wywołań, żaden skrypt npm go nie dotyka, a płaci za siebie podatnością w audycie.
- **2026-08-21** - dawny folder na resztki wyciętego forka (moduł 11) ZAMKNIĘTY; od porządków
  clean-room (2026-09) skasowany w całości, tombstone `CLAUDE.md` też już nie istnieje -
  nieaktualne też w karcie `docs.md`.
- **2026-08-11** - stare worktree'y w `.claude/worktrees/` jako śmieć na dysku zawyżający
  statystyki repo. Nazwy z registeru są sprzed dwóch tygodni, dziś są inne.

## Źródła

- addyosmani/agent-skills, skill `code-review-and-quality`, sekcja "Dead Code Hygiene", MIT,
  https://github.com/addyosmani/agent-skills - wypisz jawnie i zapytaj, nie kasuj po cichu.
- Dokumentacja knip, https://knip.dev (`overview/configuration`, `reference/configuration`,
  `reference/cli`, `guides/configuring-project-files`) - pola konfiguracji, flagi `--config`,
  `--directory`, `--reporter`, `--production`.
- Repo PKM Assistant (`package.json`, `esbuild.js`, `harness/esbuild.harness.ts`) jako
  materiał faktograficzny.
