# Karta: testy (moduł katalogu 9, mutacje z modułu 17)

Bada, czy testy tego repo w ogóle potrafią PAŚĆ: czy strażnik, limit i bramka mają test,
który zaświeci na czerwono, gdy ktoś je po cichu wyłączy. Zielony pakiet, który nie umie
paść, nie jest zabezpieczeniem, tylko dekoracją.

## Zakres

W zakresie: wszystkie `*.test.ts` w repo (dziś 135 plików) razem z kodem, który obsługują;
`package.json` sekcja `ava` (globy `files`, `nodeArguments`, `workerThreads`) i skrypty
`test`, `harness`, `harness:selftest`, `harness:scenarios`; `harness/scenarios/`
(31 scenariuszy), `harness/scenarios/_asserts.ts`, `index.ts`, `_runner.ts`,
`harness/lib/report.ts`, `harness/lib/boot.ts`, `harness/README.md`; `config/limits.ts`
z `config/limits.test.ts`; `core/security/`.

Poza zakresem: poprawność kodu -> `code-review.md`; obejście bramki atakiem -> `security.md`;
dokument kłamiący liczbami -> `docs.md`; czas biegu -> `wydajnosc.md`; `catch` -> `bledy.md`.

## Poprzeczka

1. **Mutacja jest łapana.** Celowe zepsucie logiki kawałka (odwrócony warunek, usunięty
   strażnik, zmieniona wartość limitu) powoduje CZERWONY test. Procedura niżej - zawsze
   w tymczasowym worktree, NIGDY w głównym drzewie. Brak czerwieni = luka POTWIERDZONA,
   dowodem jest output ava.
2. **Strażnik ma obie strony.** Każdy limit z `config/limits.ts` i każda bramka
   (`core/security/`, No-Go, whitelisty narzędzi, `max_delegation_depth`, sufity subów)
   ma test, że przepuszcza dobre wejście, i test, że blokuje złe. "Default wynosi X"
   to pin wartości, nie test zachowania.
3. **Test sprawdza zachowanie, nie atrapę.** Asercja mierzy skutek w kodzie (plik powstał
   albo nie, `stoppedBy` ma wartość, blokada zadziałała), nie to, że mock został wywołany.
   Wzorzec z `harness/README.md`: inwarianty kodu, nie słowa modelu.

Obalacz otwiera wskazany plik testowy, czyta asercje, a przy zarzucie "nie umie paść"
POWTARZA mutację we własnym worktree i pokazuje output.

## Kawałki startowe

| nazwa | zakres | poprzeczka_kawalka |
|---|---|---|
| limity | `config/limits.ts`, `config/limits.test.ts` | każdy z 16 kluczy `DEFAULT_LIMITS` ma test min/ceiling/fallback ORAZ ktoś testuje skutek limitu w kodzie |
| bramki bezpieczeństwa | `core/security/` | AccessGuard, PermissionSystem, autonomy: test strony "blokuje" i strony "przepuszcza" |
| dostawcy modeli | `modules/models/providers/` | jakikolwiek test parsowania strumienia i ścieżki błędu dostawcy (16 plików testowych — 9 per platforma + 7 na wspólne zachowanie bazy, 170 testów, zielone) |
| pętla agenta | `modules/agent-loop/` | backstop, abort, odrzucenie streamu, sanityzacja transkryptu |
| subagenci | `modules/sub-agents/` | głębokość, szerokość, timeout, salvage, `stoppedBy` w zwrotce |
| pamięć i komunikator | `modules/memory/`, `modules/komunikator/` | zapis i cykl pamięci; rate limit, hop, duch adresata |
| narzędzia i czat | `modules/tools/`, `modules/chat/` | narzędzie: ścieżka udana, odmowa, zły argument; czat: logika bez DOM |
| scenariusze harnessa | `harness/scenarios/` | czy asercje kluczują na fs/trace, czy na tekście modelu |
| infrastruktura ava | `package.json` (`ava`), `harness/lib/` | czy każdy plik testowy jest w ogóle uruchamiany |

## Checklista szukacza

1. **Mapa kodu bez testu** (dziś: `modules/onboarding` 3/0, `modules/ui-components` 9/0):
   `for d in $(find modules core -maxdepth 1 -mindepth 1 -type d | sort); do n=$(find "$d" -name '*.test.ts' | wc -l); c=$(find "$d" -name '*.ts' -not -name '*.test.ts' | wc -l); if [ "$n" -eq 0 ] && [ "$c" -gt 0 ]; then echo "$d kod=$c testy=0"; fi; done`
2. **Pliki testowe, których ava NIE widzi.** Globy `ava.files` w `package.json` dziś pokrywają
   `*.test.ts`, `src/*.test.ts`, `config/*.test.ts`, `utils/*.test.ts`, `core/*.test.ts`,
   `core/security/*.test.ts`, `core/utils/*.test.ts`, `core/i18n/*.test.ts`,
   `core/runtime/*.test.ts`, `core/http/*.test.ts`, `core/ui/*.test.ts`, `modules/**/*.test.ts`,
   `harness/**/*.test.ts` - dawna luka (brak `src/**` i nowych podkatalogów `core/`, kiedyś
   zilustrowana przykładem `src/core/VaultZones.ts`, plik od tego czasu skasowany) jest dziś
   ZAMKNIĘTA, globy nadążyły za rozbiciem `core/` w clean-room. Sprawdź przy KAŻDYM nowym
   podkatalogu z testami: `find src utils -name '*.test.ts'` oraz
   `find core -name '*.test.ts' | sed 's|/[^/]*$||' | sort -u` i zderz z listą globów - nowy
   katalog bez wpisu to znalezisko.
3. **Dostawcy modeli.** `ls modules/models/providers/*.test.ts` - dziś 16 plików: PLIK TESTOWY
   PER PLATFORMA (9 sztuk: anthropic/deepseek/gemini/groq/lm_studio/ollama/open_router/openai/xai)
   + 7 plików na współdzielone zachowanie bazy (`authHeaders`, `multimodalStrip`,
   `openAiCompatibleDecoder`, `openAiCompatibleRequest`, `openAiShapeReasoning`,
   `ownRequestShape`, `toolCallsIndex`). Klaster jest zaimplementowany (clean-room, scalone
   2026-09-06): `npx ava "modules/models/providers/*.test.ts"` daje 170 testów, 0 czerwonych
   (zweryfikowane 2026-09-06). Testy naprawdę dotykają zachowania dostawcy — kształt żądania
   (`prompt_cache_key`, `cache_control`, forward `max_tokens`), parsowanie odpowiedzi (sekwencje
   SSE, sumowanie `usage`, akumulacja `tool_use` po indeksie) — nie tylko czystej funkcji obok
   (`ReasoningTagFilter.test.ts` i podobne).
4. **Strażniki bez strony "blokuje".** Dla każdego klucza `DEFAULT_LIMITS`
   (`rg -n '^  [a-z_]+:' config/limits.ts`) znajdź miejsce, gdzie limit COŚ odrzuca:
   `rg -n "<klucz>" --glob '*.ts' modules core src`. Test `getLimits` to walidacja configu,
   nie test strażnika.
5. **Testy bez asercji i asercje zawsze prawdziwe.** `rg -c 't\.(is|deepEqual|true|false|throws|throwsAsync|regex|like|notThrows)' --glob '*.test.ts' core modules src config utils`
   porównane z liczbą `test(` w pliku (`test(` przy zerze `t.` = pusty test), plus
   `rg -n 't\.true\(true\)|t\.is\(1, ?1\)|t\.pass\(\)' --glob '*.test.ts' core modules src config utils`
   i `t.truthy` na czymś, co nigdy nie bywa puste.
6. **`skip` / `only` / `todo` / `failing`.** `rg -n 'test\.(skip|only|todo|failing)' --glob '*.test.ts' core modules src config utils`
   Dziś jedyne trafienie to KOMENTARZ w `AgentLoop.streamRejection.test.ts:21`. Nowe
   trafienie: czy ma uzasadnienie i czy nie zamraża otwartego buga.
7. **Liczniki statyczne i wyścigi.** `rg -n 'static [a-zA-Z]+ ?(=|:)' --glob '*.test.ts' modules core`
   plus `rg -n 'let [a-z]+ = 0' --glob '*.test.ts'` poza ciałem testu. ava odpala testy
   Z JEDNEGO PLIKU równolegle, więc licznik statyczny dzieli dwóch sąsiadów.
8. **Atrapa zamiast zachowania i czas ścienny.** `class Fake*`/`class *Spy*`/`class *Mock*`
   w testach: czy asercja nie mierzy wyłącznie stanu atrapy. Do tego
   `rg -n 'setTimeout|Date\.now\(\)|await delay|sleep\(' --glob '*.test.ts' core modules src config utils`
   - test czekający N ms zamiast na warunek to bomba zegarowa na wolnej maszynie.
9. **Rejestr vs pliki.** `ls harness/scenarios/[0-9]*.ts | wc -l` (dziś 31) kontra tablica
   `SCENARIOS` w `harness/scenarios/index.ts` (dziś 31: s01-s14, s25-s41). Plik bez wpisu
   w rejestrze nie biegnie NIGDY.
10. **`liveSkip` bez powodu.** `rg -n 'liveSkip:' harness/scenarios/*.ts` (dziś 8 z realnym
    uzasadnieniem). Pusty lub ogólnikowy powód = znalezisko.
11. **Jakość asercji scenariusza.** `harness/scenarios/_asserts.ts` (321 linii) daje
    `assertToolErrored`, `assertToolOk`, `fileAbsent`, `fileUnchanged`, `assertTraceLacks`.
    Scenariusz kluczujący wyłącznie na `assertFinalText` mierzy słowa modelu i łamie
    zasadę asercji z `harness/README.md`.
12. **Sprzątanie po biegu.** `harness/lib/report.ts` NIE raportuje timerów (tylko narzędzia
    per iteracja, tokeny, `stoppedBy`, `iters`, `total_ms`). Timery liczy `harness/run.ts:109`
    (`wyczyszczono N timer(ów) registerInterval`) z `cleanupPlugin` (`harness/lib/boot.ts:141`).
    Timer NIEzarejestrowany przez `registerInterval` w tym liczniku nie występuje, więc
    test sprzątania oparty o ten log ma ślepą plamę.
13. **Test regresji per fix.** `git log --oneline -30 | grep -i fix` (dziś 3 commity), potem
    `git show --stat <sha>`: czy commit dotyka `*.test.ts` albo `harness/scenarios/`.
    To jest "zweryfikuj weryfikację" - patrz na listę plików, nie na opis commita.
14. **Mutacja dwóch najważniejszych strażników kawałka** (procedura niżej), zawsze gdy
    kawałek dotyka limitu, bramki albo warunku decyzyjnego. Na koniec bieg kontrolny
    `npx ava --verbose <plik.test.ts>` - nie cytuj wyniku z pamięci.

## Czego NIE flagować

1. **Brak testów DOM/UI.** Konwencja repo: zero testów dotykających DOM, logika siedzi
   w czystych modelach obok (wzorzec `subTaskPanelModel.ts` przy `subTaskStrip.ts`).
   Znaleziskiem jest logika decyzyjna schowana W widoku, nie sam brak testu widoku.
2. **Scenariusze `liveSkip` z uzasadnieniem w kodzie** (offline-only jest tam jedyną drogą).
3. **Brak e2e dla rzeczy pokrytej scenariuszem harnessa.** Najpierw sprawdź 31 scenariuszy.
4. **Pliki typów, barrele (`index.ts`), configi i i18n bez testów.**
5. **Kod harnessa i atrapy** (`harness/mock/`, `harness/lib/Harness*`) - narzędzie, nie produkt.
6. **"Za mało testów" bez konkretnej gałęzi.** Procent pokrycia nie jest znaleziskiem.
7. **Test pinujący wartość limitu.** Świadomy pin przed cichym cofnięciem, nie słaby test.
8. **Brak testu dla kodu skreślonego w CLAUDE.md modułu jako wycofywany.**

## Narzędzia i komendy

Stan zmierzony 2026-08-22 na HEAD `962908d2`, Node v24.12.0, ripgrep 14.1.1.

```bash
npm test                                  # npx ava --verbose; dziś 1650 pass, 0 fail
npx ava --verbose config/limits.test.ts   # jeden plik (26 testów, wszystkie zielone)
npm run harness                           # build + dry-boot, raport DoD FAZY A
npm run harness:scenarios                 # 31 scenariuszy offline, deterministycznie
npx tsc --noEmit -p tsconfig.json         # dziś exit 0
# liczby do porównań (w dowodzie podaj KOMENDĘ, nie samą liczbę):
find core modules src config utils -name "*.ts" -not -name "*.test.ts" -not -name "*.d.ts" | wc -l  # 334
find core modules src config utils -name "*.test.ts" | wc -l                                        # 135
ls harness/scenarios/[0-9]*.ts | wc -l                                                              # 31
```

**Uwaga CRLF.** Repo ma `core.autocrlf=true` i pliki z terminatorami CRLF. Ripgrep bez
`--crlf` gubi wzorce zakotwiczone na `$`: `rg -c '\) \{$' modules/agent-loop/AgentLoop.ts`
daje 0 trafień (exit 1), `rg -c --crlf` na tym samym pliku daje 29. `grep -E '\) \{$'`
w Git Bash daje 29 bez flag. Zasada: w rg z `$` zawsze `--crlf`; w grep używaj `-E`
z klasami POSIX, bo `grep -P` pada tu na "supports only unibyte and UTF-8 locales".

**Uwaga o Node.** Register 12.08: `npm test` poza laptopem Kuby (Node 22) padał na hooku
`tsx` w worker threadach. Dziś `package.json` ma `ava.workerThreads: false`, czyli kontrę
na tamten objaw - ale NIE orzekaj "naprawione" z samego pola: potwierdź biegiem na Node 22
albo zapisz `nie_sprawdzono`. W chmurze jedź tym, co przewiduje kontrakt nocy.

### Mutacja ręczna - procedura

**NIGDY nie mutujesz w głównym drzewie roboczym** - zostaje nietknięte przez cały bieg.
Mutacja żyje wyłącznie w tymczasowym worktree w SCRATCH z silnika
(`{REPO}/.claude/worktrees`, gitignorowany). Kroki zweryfikowane 2026-08-22:

```bash
WT="$SCRATCH/wt-<id-kawalka>"                 # $SCRATCH = {REPO}/.claude/worktrees
cd "$REPO"
git worktree add --detach "$WT" HEAD          # --detach: bez zakładania brancha
cd "$WT"
# Świeży worktree NIE MA node_modules i NIE WOLNO mu go podlinkować (junction/symlink).
# Incydent 2026-08-22: `rm -rf` worktree wszedł przez junction i skasował node_modules
# głównego repo. Zamiast tego uruchamiaj ava z node_modules głównego repo przy
# cwd = worktree; importy testu same znajdą node_modules repo wędrując w górę:
# 1. ZMIEŃ jedną rzecz (odwróć warunek, usuń strażnik, podmień wartość limitu)
node "$REPO/node_modules/ava/entrypoints/cli.mjs" --verbose <plik.test.ts>
# (zweryfikowane 2026-08-22: config/limits.test.ts 26 zielonych z worktree bez node_modules;
#  `npx ava` w worktree NIE działa - ściąga obcą avę i pada na "extensions option")
# 2. CZERWONO = strażnik pilnowany, luki nie ma. ZIELONO = luka POTWIERDZONA.
cd "$REPO"
git worktree remove --force "$WT"             # TYLKO tak; NIGDY `rm -rf` na worktree
git worktree list                             # kontrola: nie ma wpisu wt-<id-kawalka>
git status --short                            # kontrola: główne drzewo bez zmian
```

Kolejność sprzątania jest istotna: junction zdejmuje `rmdir` (NIE `rm -rf`, bo to weszłoby
w katalog docelowy), dopiero potem znika worktree; obie komendy kontrolne to dowód, że repo
zostało czyste. Przykład przejścia procedury (2026-08-22): zmiana `max_delegation_depth: 1`
na `2` i `npx ava config/limits.test.ts` dały `1 test failed` z diffem `- 2 / + 1`
w `config/limits.test.ts:115`, czyli strażnik głębokości delegacji ma pin.

## Severity w tej domenie

- **HIGH** - strażnik, limit albo bramka bez testu strony "blokuje", ALBO test, który po
  mutacji nie pada. Kształt: bramka odmawiająca dostępu do folderu ma wyłącznie test
  ścieżki udanej, więc wycięcie warunku odmowy zostawia pakiet zielony.
- **MEDIUM** - moduł z logiką decyzyjną bez żadnego testu (kształt: `modules/onboarding`
  i `modules/ui-components`, razem 12 plików kodu i zero testów), albo strażnik pokryty
  tylko na jednej z dwóch dróg wywołania.
- **LOW** - higiena: plik testowy poza globami `ava.files`, test zależny od czasu
  ściennego, licznik statyczny w klasie pomocniczej testu, `skip` bez uzasadnienia.
- **INFO** - rozjazd liczby plików scenariuszy z rejestrem, brak testu dla kodu jawnie
  oznaczonego jako wycofywany.

CRITICAL tu nie występuje: brak testu sam w sobie nie kasuje danych usera. Jeśli pozwala
na coś groźnego, znalezisko jest o TAMTEJ dziurze i idzie do `security.md` lub `bledy.md`.

## Dowód wymagany

1. `plik:linia` kodu produkcyjnego z nazwą funkcji albo gałęzi.
2. Lista PRZESZUKANYCH plików testowych z komendą, która ją dała (np.
   `rg -l "<symbol>" --glob '*.test.ts' core modules src config utils`). "Nie ma testu"
   bez tej listy jest twierdzeniem, nie dowodem.
3. Wynik mutacji, gdy była: zmiana, komenda `npx ava ...` i fragment outputu
   (`N tests passed` albo `N test failed` z diffem). Bez mutacji: `reprodukcja: "source-only"`.

## Znane

Z Risk registeru `Katalog_Audytow.md`. Nie odkrywaj ponownie - sprawdź status i wpisz do
`znane_status` (nadal / naprawione / nie_sprawdzono). Każdy wiersz: sprawdzić czy nadal.

- **2026-08-13** - stara warstwa adapterów (plik bazowy i 11 adapterów czatu, wszystkie
  skasowane w clean-room) była bez ani jednego pliku testowego. Dzisiejszy klaster
  (`modules/models/providers/`, 9 dostawców) ma test PER DOSTAWCA od startu - inny stan,
  zamknięte.
- **2026-08-13** - w starej klasie modelu czatu sprzed clean-room (plik skasowany) atrapa
  współbieżności trzymała liczniki w polach STATYCZNYCH, a ava odpala testy z jednego pliku
  równolegle. Dzisiejszy odpowiednik to `modules/models/ChatModel.concurrent.test.ts` —
  zaimplementowany i zielony; sprawdzone 2026-09-06: CAŁY plik jest `test.serial` (komentarz
  w linii 4), a test cooldownu (`GATE_RELEASE_COOLDOWN_MS`) nadpisuje stałą na lokalnej
  podklasie `SeamModel` zamiast mutować pole bazowej klasy dzielone między testami.
- **2026-08-13** - `GATE_RELEASE_COOLDOWN_MS` wjechał bez testu; ZAMKNIĘTE trzema pinami
  zweryfikowanymi mutacją (sprawdź, czy piny żyją).
- **2026-08-18** - sufit `subagent_result_max_chars` (60k) ma test tylko na JEDNEJ z dwóch
  dróg powrotu; druga (`perToolOverride` w `chat_streaming.ts`) wisi na `obsidian`.
- **2026-08-16** - `subTaskStrip.ts` bez testu to KONWENCJA repo (zero testów DOM), nie luka.
- **2026-08-14** - runner scenariuszy zna tylko GREEN/RED/SKIP i na żywym modelu nie umie
  powiedzieć "bieg niczego nie dowiódł".
- **2026-08-12** - `npm test` padał poza laptopem Kuby (Node 22, hook `tsx` w workerach);
  dziś w `package.json` stoi `ava.workerThreads: false`.

## Źródła

- obra/superpowers, skill `verification-before-completion`, MIT,
  https://github.com/obra/superpowers - dowód przed twierdzeniem, cykl red-green.
- addyosmani/agent-skills, skill `code-review-and-quality`, sekcja "Verify the
  Verification", MIT, https://github.com/addyosmani/agent-skills.
- Repo PKM Assistant (`harness/README.md`, `package.json`) jako materiał faktograficzny.
