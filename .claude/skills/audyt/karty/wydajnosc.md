# Karta: wydajnosc (moduł katalogu 13)

Bada, czy liczby (boot, bundle, indeksowanie) nie odjechały od baseline'u i czy w ścieżce interaktywnej
nie ma pracy proporcjonalnej do rozmiaru vaulta. Plugin siedzi w rendererze Electrona Obsidiana -
każda sekunda bootu i każdy megabajt bundla to koszt, który user płaci przy każdym starcie.

## Zakres

Zweryfikowane `ls`/`grep` na HEAD `962908d2`, stan 2026-08-22:

- boot i cykl życia: `core/runtime/PluginRuntime.ts` (dawny `core/PKMEnv.ts`), `core/PluginBase.ts`
  (dawny `core/PKMPlugin.ts`) - oba zaimplementowane (clean-room, scalone 2026-09-06);
  `core/layoutReady.ts`, `core/waitForLoaded.ts`; `src/main.ts`; limity: `config/limits.ts`
- pomiar: `harness/run.ts`, `harness/lib/boot.ts`, `harness/lib/report.ts`, `harness/esbuild.harness.ts`
- bundle: `esbuild.js`, `dist/main.js` (dziś **2 240 301 B**)
- indeksowanie: `modules/embedding/` (`VaultIndexer.ts`, `orama_engine.ts` - bez zmian w clean-room;
  `EmbeddingModel.ts`, `EmbeddingRegistry.ts` + dostawcy `providers/{openai,ollama,lm_studio,gemini}.ts`
  - zaimplementowane, clean-room F4 scalone 2026-09-05/06, zielone pod testami)
- gorące ścieżki: `modules/chat/`, `modules/agent-loop/`, `modules/tools/`, `modules/memory/`,
  `modules/ui-components/`, `core/PluginVaultFs.ts`

Poza zakresem: podatność i supply chain → `deps` (tu tylko waga pozycji w bundlu); martwy kod →
`dead-code`; przeciek między sesjami jako granica zaufania → `security`; nieposprzątany timer jako
błąd cyklu życia → `bledy` (tu tylko ze zmierzonym kosztem).

## Poprzeczka

**Warstwa 1 - liczby.** Trzy metryki, każda z komendą, każda porównywana z baseline'em:
`boot_ms_median` (mediana z 3 biegów `npm run harness`), `bundle_bytes` (dziś 2 240 301),
`index_ms` (Orama na `harness/vault-fixture`, opcjonalne).

Harness **mierzy boot sam** - nie trzeba go do tego przerabiać:

```
harness/lib/boot.ts:117    const bootMs = Date.now() - t0;
harness/run.ts:144         line(`  boot time       : ${(bootMs / 1000).toFixed(2)}s`);
```

Ta sama liczba idzie do trace jako pole `boot_ms` (`harness/run.ts:129`). Dopiero gdy harness
nie wstaje, owijasz go PowerShellowym `Measure-Command`.

**Warstwa 2 - reguła strukturalna.** Zero pracy proporcjonalnej do rozmiaru vaulta w ścieżce
interaktywnej: keystroke, render tury czatu, pojedynczy tool call. Praca O(vault) wolno jej być
tylko w bootcie i w jawnym indeksowaniu, i tylko za debouncem.

Jak obalacz sprawdza poprzeczkę: powtarza pomiar (3 biegi, mediana) albo prześledza ścieżkę
wywołania od zdarzenia UI do zarzuconej pętli. "Wygląda na wolne" bez liczby albo bez ścieżki
wywołania = OBALONE.

## Kawałki startowe

| id | nazwa | zakres | poprzeczka kawałka |
|---|---|---|---|
| k1 | Boot | `core/runtime/PluginRuntime.ts`, `core/PluginBase.ts`, `src/main.ts` | żadne okno czekania nie jest szeregowe bez powodu; boot < 2x baseline (dziś mierzalne i zielone: `npm run harness` → 0,04-0,05 s na 3 biegach, zweryfikowane 2026-09-06) |
| k2 | Bundle | `esbuild.js`, `dist/main.js` | rozmiar w granicach baseline'u; największe pozycje znane i uzasadnione |
| k3 | Indekser | `modules/embedding/VaultIndexer.ts`, `orama_engine.ts` | zmiana pliku nie wywołuje reindeksacji bez debounce'u |
| k4 | Dostawcy embeddingu | `modules/embedding/EmbeddingModel.ts`, `providers/*.ts` | batch zamiast pętli po plikach; backoff nie blokuje UI (zaimplementowane, clean-room F4 scalone 2026-09-06) |
| k5 | Tura czatu i narzędzia | `modules/chat/`, `modules/agent-loop/AgentLoop.ts`, `modules/tools/` | koszt tury nie rośnie z vaultem; tool call nie skanuje całości bez potrzeby |
| k6 | Pamięć i vault-fs | `modules/memory/RetrievalEngine.ts`, `core/PluginVaultFs.ts` | retrieval ma sufit; lista ścieżek budowana raz, nie per operacja |
| k7 | UI, cache, timery | `modules/ui-components/`, `modules/shell/`, całe `modules/` + `core/` | render nie ciągnie pełnej listy notatek per znak; każda rosnąca struktura ma ewikcję |

## Checklista szukacza

Komendy z korzenia repo. Liczby to stan 2026-08-22 - inny wynik u Ciebie sam w sobie jest tropem.

1. **`getFiles()` / `getMarkdownFiles()` w gorącej ścieżce.**
   `grep -rn "getFiles()\|getMarkdownFiles()" --include=*.ts modules core src config | grep -v ".test.ts"`
   → dziś **6 trafień**, z tego 4 realne wywołania: `modules/memory/RetrievalEngine.ts:401`
   (`for (const f of this.app.vault.getMarkdownFiles())`), `modules/tools/ListTool.ts:182`,
   `modules/ui-components/MentionAutocomplete.ts:126`, `core/PluginVaultFs.ts:81` (reszta to komentarz
   i JSDoc). Kto woła i jak często?
2. **Synchroniczne fs w rendererze.**
   `grep -rn "readFileSync" --include=*.ts modules core src config | grep -v ".test.ts"`
   → dziś **4 trafienia**. Każde: boot (dopuszczalne) czy gorąca ścieżka (znalezisko)?
3. **Interwały bez sufitu i bez rejestracji.**
   `grep -rn "setInterval" --include=*.ts modules core src config | grep -v ".test.ts" | wc -l`
   → lista plików i liczba do odświeżenia przy każdym biegu (grep dosłowny łapie też komentarze
   o typach timerów, nie tylko wywołania). Dziś trafienia siedzą w
   (`modules/chat/chat/chat_session.ts`, `modules/chat/ConsolidationProgressModal.ts`,
   `modules/chat/SaveSessionModal.ts`, `modules/multimodal/AudioRecorder.ts`,
   `core/waitForLoaded.ts`). `core/runtime/PluginRuntime.ts` (zaimplementowany, clean-room)
   NIE ma własnego `setInterval` — sprawdzone 2026-09-06: pętla synchronizacji vaulta
   (`_poczekajNaSynchronizacje`) czeka przez `setTimeout` WEWNĄTRZ pętli `for`, nie przez
   `setInterval`. `core/waitForLoaded.ts` ma swój `setInterval` (siatka bezpieczeństwa
   `WAIT_FOR_LOADED_POLL_MS = 250` ms), zaimplementowany i pokryty testem — ALE sprawdzone
   2026-09-06: funkcja `waitForLoaded()` ma dziś ZERO wołaczy poza własnym testem
   (`grep -rn "waitForLoaded(" modules core src config utils | grep -v test` → tylko definicja
   w `core/waitForLoaded.ts`), bo `PluginRuntime.whenLoaded()` ma WŁASNĄ, bezpollingową
   implementację (zbiór czekających + `queueMicrotask`) i tej funkcji nie woła. Ten konkretny
   `setInterval` istnieje w źródle i jest testowany, ale nie mieli dziś w żadnym realnym boocie
   pluginu. Kontrola:
   `grep -rn "registerInterval" --include=*.ts modules core src | grep -v ".test.ts" | wc -l`
   → dziś **7**. Rozjazd 14 vs 7 to lista do przejścia, nie gotowe znalezisko.
4. **Cache bez ewikcji.** `grep -rnE "= new Map\(\)" --include=*.ts modules core | grep -v ".test.ts" | wc -l`
   → dziś **46**. Dla każdej trzymającej dane per plik/wiadomość: czy coś kiedykolwiek usuwa
   (`.delete(`, `.clear(`, limit rozmiaru)?
5. **Reindeksacja bez debounce'u.** `VaultIndexer.ts:322` pina hook (`vault.on('modify', handler('modify'))`),
   a `:45-46` ma dwa debounce'y:
   ```
   const DEFAULT_DEBOUNCE_MS = 2000; // debounce kolejki zmian z hooków
   const DEFAULT_PERSIST_MS = 30000; // debounce zapisu na dysk po zmianach
   ```
   Debounce ISTNIEJE - nie zgłaszaj jego braku. Sprawdzaj: czy każda ścieżka zmiany idzie przez
   kolejkę (`:362` `this._debounceTimer = setTimeout(...)`), czy istnieje droga omijająca, i czy
   `DEFAULT_BATCH_SIZE = 16` nie spada gdzieś do 1.
6. **Serializacja i liczenie tokenów per tura.**
   `grep -rn "JSON.stringify" --include=*.ts modules core src | grep -v ".test.ts" | wc -l` → dziś **109**
   (zawęź do trace/logów w pętli agenta i do historii czatu) oraz
   `grep -rniE "count_?tokens|estimate_?tokens|tokenCount|updateTokenCounter" --include=*.ts modules core config | grep -v ".test.ts"`
   - licznik przelicza całość czy przyrost?
7. **`await` w pętli i regex po treści vaulta.** `await` w `for` liczy się tylko przy kolekcji
   rosnącej z vaultem albo przy sieci; regex - gdy karmiony wynikiem `cachedRead` w pętli po plikach.
8. **Bundle - rozmiar.** `node -e "console.log(require('fs').statSync('dist/main.js').size)"` → **2 240 301**; porównaj z baseline'em.
9. **Bundle - co w nim siedzi.** `esbuild.js` **nie ma** `metafile` (`grep -c metafile esbuild.js` → **0**).
    NIE DODAWAJ go - audyt nie zmienia kodu produkcyjnego. Rozbicie robisz jednorazowym buildem
    w tymczasowym worktree (`git worktree add {{SCRATCH}}/wt-perf HEAD`), tam wolno dopisać
    `metafile: true`, po pomiarze `git worktree remove --force`. W raporcie zaznacz, że to pomiar
    z worktree, nie z repo.
10. **Boot - okna czekania.** Sprawdzone 2026-09-06 na REALNEJ implementacji
    `core/runtime/PluginRuntime.ts` (prywatna `_przebieg()`, za `boot()`/`_start()`) — kolejność
    jest SZEREGOWA i celowa (uzasadnienie w komentarzach kodu):
    1. `await waitForLayoutReady(this.host?.app?.workspace)` (`core/layoutReady.ts`) — ZDARZENIE
       `workspace.onLayoutReady`, zero timera; brak `workspace`/`onLayoutReady` (poza Obsidianem)
       rozwiązuje się NATYCHMIAST (`Promise.resolve()`).
    2. `this._postawPasek()` — synchroniczne, stawia pasek statusu zaraz po layoucie i PRZED I/O
       ustawień (user ma widzieć żywy pasek podczas dalszego ładowania).
    3. `await this._poczekajNaSynchronizacje()` — JEDYNE odpytywanie na ścieżce startu: pętla
       `for` z krokiem `VAULT_SYNC_POLL_MS = 100` ms, sufit `VAULT_SYNC_MAX_POLLS = 30` obrotów
       (czyli maks. 3000 ms). Choć JEDEN obrót leci TYLKO, gdy
       `app.internalPlugins.plugins.sync.instance` istnieje I jego `syncStatus` zawiera
       `"sync"` a nie zawiera `"fully"` — poza Obsidianem albo bez aktywnego Sync-u
       `_instancjaSynchronizacji()` zwraca `null` i funkcja wraca natychmiast, zero obrotów.
    4. `await this.loadSettings()` — realny odczyt `.pkm-assistant/settings.json` przez
       `loadSettingsWithArmor` (pancerz + fallback), potem podmiana CAŁEGO worka
       (`this.settingsStore.settings = worek`, bez planowania zapisu — kontrakt S-07).
    5. Błąd na KTÓRYMKOLWIEK z kroków wyżej degraduje do `cloneConfig(this.config?.defaults)`
       zamiast rzucać — `boot()` z kontraktu NIE rzuca.
    6. `_state = 'loaded'` → budzi czekających → `events.emit('loaded')`.
    `PluginRuntime.whenLoaded()` (czekanie NA gotowość, używane przez resztę pluginu) jest
    BEZ POLLINGU — zbiór czekających + `queueMicrotask`, nie `setInterval`/`setTimeout`. Osobna
    siatka bezpieczeństwa `waitForLoaded()` (`core/waitForLoaded.ts`, `WAIT_FOR_LOADED_POLL_MS
    = 250` ms) istnieje i ma własny test, ale `PluginRuntime` jej dziś NIE woła (zero wołaczy
    poza testem — patrz checklista #3); to zamierzony, udokumentowany stan „poza grafem"
    (`core/CLAUDE.md`), nie błąd. Strażnik kontraktu: `core/runtime/PluginRuntime.test.ts` +
    `core/layoutReady.test.ts` + `core/waitForLoaded.test.ts`.
11. **Boot - pomiar.** `npm run harness` trzy razy, zapisz `boot time` z każdego, weź medianę.
    Zmierzone 2026-09-06 na realnej implementacji: **0,05 s / 0,04 s / 0,04 s** → mediana
    **0,04 s** (DoD FAZY A: GREEN na wszystkich trzech biegach, `env state: loaded`,
    `settings loaded: true`). Historyczny baseline sprzed clean-room (stara implementacja, dziś
    skasowana): dry-boot 0,15 s, produkcja 8,09 s — zmierzony na INNYM kodzie i NIEPOROWNYWALNY
    1:1 z liczbą wyżej (środowisko harnessu bez Obsidiana i tak omija layout/sync); traktuj jako
    kontekst historyczny, **załóż nowy baseline z liczb 2026-09-06**. Surowe outputy do
    `audyt/biegi/{id}/surowe/harness-boot-{1,2,3}.txt`.
12. **Limity i listenery UI.** `config/limits.ts` - czy sufity (iteracje pętli, obcinanie wyniku
    narzędzia, timeout delegacji) nie są tak wysokie, że w praktyce nie działają. Dla każdego
    handlera w `modules/ui-components/` i `modules/chat/`: co robi synchronicznie, zanim odda kontrolę.

## Czego NIE flagować

1. **Okna czekania na starcie** - NAPRAWIONE 2026-08-23 w STAREJ implementacji sprzed clean-room
   (`core/PKMEnv.ts`, dziś skasowany). Dzisiejsza implementacja (`core/runtime/PluginRuntime.ts`,
   scalona 2026-09-06) dziedziczy tę samą filozofię: `waitForLayoutReady` czeka na ZDARZENIE
   `workspace.onLayoutReady` (zero timera), a jedyne odpytywanie na ścieżce startu
   (`_poczekajNaSynchronizacje`, krok `VAULT_SYNC_POLL_MS = 100` ms, sufit
   `VAULT_SYNC_MAX_POLLS = 30`) czeka na WARUNEK (flaga synchronizacji Obsidiana) i wykonuje
   zero obrotów, gdy nie ma czego pytać (poza Obsidianem, bez aktywnego Sync-u). Metodologia:
   nie flaguj okna czekania, które czeka na ZDARZENIE albo WARUNEK, tylko ślepy zegar bez
   warunku wyjścia. Znaleziskiem jest NOWY ślepy zegar na ścieżce startu — z pomiarem, ile kosztuje.
2. **Koszty jednorazowe startu udokumentowane w `CLAUDE.md`.**
3. **"Dałoby się szybciej" bez liczby** - bez pomiaru albo bez ścieżki wywołania nie ma znaleziska.
   To samo mikrooptymalizacje: `for` vs `forEach`, konkatenacja stringów, `Map` vs obiekt.
4. **Brak `metafile` w `esbuild.js`** - świadomy stan, nie brak. Nie proponuj dodania.
5. **Kod harnessa, mocków i fixture'ów** (`harness/mock/`, `harness/vault-fixture/`) - nie jedzie u usera.
6. **Rozmiar bundla sam w sobie** - 2,2 MB to baseline, nie defekt. Znaleziskiem jest wzrost ponad
   próg albo pozycja, której nikt nie zamawiał.
7. **Rzeczy zgłoszone 22.08** (osiem sekund bootu — NAPRAWIONE 23.08, i18n 374 KB) - patrz Znane, tylko status.
8. **Podatność albo martwa zależność** - nawet gdy waży w bundlu. To karta `deps`.

## Narzędzia i komendy

```bash
node -e "console.log(require('fs').statSync('dist/main.js').size)"   # dziś 2 240 301
npm run harness | tee audyt/biegi/{id}/surowe/harness-boot-1.txt     # x3, bierzesz "boot time"
grep -rn "getFiles()\|getMarkdownFiles()" --include=*.ts modules core src config | grep -v ".test.ts"
grep -rn "readFileSync" --include=*.ts modules core src config | grep -v ".test.ts"
grep -rn "setInterval" --include=*.ts modules core src config | grep -v ".test.ts"
grep -rn "registerInterval" --include=*.ts modules core src | grep -v ".test.ts"
grep -rnE "= new Map\(\)" --include=*.ts modules core | grep -v ".test.ts"
grep -c metafile esbuild.js                                          # dziś 0 - tak ma zostać
```

PowerShell, gdy mierzysz z zewnątrz: `1..3 | ForEach-Object { (Measure-Command { npm run harness }).TotalMilliseconds }`
oraz `(Get-Item dist/main.js).Length`.

### Baseline `audyt/baseline/wydajnosc.json`

```json
{
  "data": "2026-08-22",
  "head": "962908d2",
  "boot_ms_median": 0,
  "bundle_bytes": 2240301,
  "index_ms": null,
  "env": { "os": "Windows 11", "node": "v24.12.0", "tryb": "dzien" }
}
```

### Bramka delta - krok po kroku

1. `ls audyt/baseline/wydajnosc.json`.
2. **Nie ma** → zmierz wszystko, zapisz plik, zgłoś JEDNO znalezisko `INFO` ("baseline założony,
   liczby: ..."). Zero alarmu - pierwszy bieg nie może być regresją.
3. **Jest** → zmierz to samo dziś i policz `delta = (dzis - baseline) / baseline` na każdej metryce.
4. `boot_ms_median` > 2x baseline → **HIGH**; wzrost > 15% i <= 100% → **MEDIUM**. `bundle_bytes`
   wzrost > 15% → **MEDIUM**. `index_ms` wzrost > 15% → **MEDIUM**, ale tylko gdy obie liczby
   zmierzone tym samym fixture'em; inaczej pomijasz metrykę i piszesz o tym w raporcie.
5. Metryka spadła, bez zmian albo wzrosła <= 15% → cicho, zero alarmu.
6. Zmienił się `env` (inny Node, inna maszyna) → NIE porównujesz liczb; zakładasz drugi baseline
   i mówisz o tym w Środowisku raportu. Boot z laptopa vs boot z chmury to nie ta sama metryka.
7. Baseline nadpisujesz **zawsze** po biegu, także po alarmie - inaczej ten sam alarm wraca jutro.

## Severity w tej domenie

- **HIGH** - praca O(rozmiar vaulta) w ścieżce interaktywnej (keystroke, render, pojedynczy tool
  call) ALBO boot dłuższy niż 2x baseline. Przykład: autocomplete wołające `getMarkdownFiles()`
  na każdy wpisany znak.
- **MEDIUM** - zmierzona regresja > 15% na dowolnej metryce ALBO struktura rosnąca bez ograniczenia
  (cache bez ewikcji, kolejka bez sufitu) na ścieżce przechodzonej codziennie.
- **LOW** - higiena: podwójny odczyt pliku w turze, `await` w pętli po kilkunastu elementach, gęsty timer.
- **INFO** - pomiar bez werdyktu: założenie baseline'u, waga pozycji w bundlu, liczba trafień grepa.

CRITICAL rezerwujemy na zawieszenie Obsidiana albo wysypanie procesu, i tylko z reprodukcją.

## Dowód wymagany

Jedno z dwóch, nigdy mniej. **A. Pomiar** - komenda + surowy output (do
`audyt/biegi/{id}/surowe/`) + liczby: baseline, dziś, delta w %; mediana z 3 biegów, nie z jednego.
**B. Analiza statyczna** - `plik:linia` + dosłowny cytat + wyjaśnienie złożoności (co rośnie i z czym)
+ **ścieżka wywołania** dowodząca, że to gorąca ścieżka: od zdarzenia UI albo od tool calla do tej
linii, każdy przystanek jako `plik:linia`.

Bez ścieżki wywołania wariant B jest OBALANY z automatu - "ta pętla jest kwadratowa" nic nie znaczy,
jeżeli woła ją tylko migracja odpalana raz.

## Znane

Z Risk registeru Katalogu. Nie odkrywaj ponownie - w raporcie status nadal / naprawione / nie sprawdzono.

- **2026-08-22** - ✅ NAPRAWIONE 2026-08-23 (`refactor/v2.2-szybki-start`), w STAREJ implementacji
  sprzed clean-room: plugin wstawał osiem sekund, z czego osiem sekund czekał na dwa szeregowe okna
  odziedziczone po starym frameworku bazowym. Wtedy `env_start_wait_time` dostał fallback 0
  (nadal nastawialny z configu), ślepy sen 3000 ms w `ready_to_load_collections()` został
  wycięty, a `load()` zaczął czekać na zdarzenie `workspace.onLayoutReady`. Dry-boot
  3,20 s → 0,15 s; produkcja 8,09 s → ~0,2 s. Ten kod (`core/PKMEnv.ts` i jego strażnik
  `core/PKMEnv.boot_timing.test.ts`) jest dziś skasowany - zastąpił go `core/runtime/
  PluginRuntime.ts` (zaimplementowany, clean-room scalone 2026-09-06), który dziedziczy tę
  samą filozofię zdarzenie/warunek-nie-zegar (patrz checklista #10). **Zmierzone od nowa
  2026-09-06:** `npm run harness` × 3 → 0,05 s / 0,04 s / 0,04 s, mediana 0,04 s, DoD GREEN.
  Baseline historyczny (0,15 s dry-boot) NIEPOROWNYWALNY 1:1 (inny kod), ale rząd wielkości ten
  sam albo lepszy — nowy baseline to liczby z 2026-09-06.
- **2026-08-22** - największa pojedyncza pozycja w bundlu to tłumaczenia: `core/i18n` waży 374 KB,
  czyli 17,1% z 2 240 301 B, bo `core/i18n/index.ts:9-10` importuje statycznie oba języki. Zmierzone
  metafile'em (639 wejść), świadomie NIE priorytet. Sprawdzić czy nadal.
- **2026-08-22** - `js-yaml` realnie ląduje w `dist/main.js` i waży w nim 44 KB (waga sprawy: karta `deps`). Sprawdzić czy nadal.
- **2026-08-11** - multi-tab dzieli cache'owaną instancję modelu głównego, `stream()` nieodporny;
  znany dług ze śledztwa zwisów. Sprawdzić czy nadal.
- **katalog** - dawny wpis „twarde `setTimeout` 3 s w `core/PKMEnv.ts:801` jest udokumentowane
  i zamierzone" jest PODWÓJNIE NIEAKTUALNY: 2026-08-23 sen wyleciał (patrz wpis wyżej), a sam
  plik `core/PKMEnv.ts` jest dziś skasowany - zastąpił go `core/runtime/PluginRuntime.ts`
  (zaimplementowany, clean-room scalone 2026-09-06). Sprawdzone 2026-09-06: na ścieżce startu
  nie ma żadnego twardego, bezwarunkowego `setTimeout` — jedyne odpytywanie
  (`_poczekajNaSynchronizacje`) czeka na WARUNEK (flaga syncu Obsidiana) z sufitem
  `VAULT_SYNC_MAX_POLLS × VAULT_SYNC_POLL_MS` = 30 × 100 ms = 3000 ms, i wykonuje zero obrotów,
  gdy nie ma czego pytać.

## Źródła

- addyosmani/agent-skills, `references/performance-checklist.md`
  (https://github.com/addyosmani/agent-skills, MIT) - adaptowane pozycje mające sens bez przeglądarki:
  sprzątanie listenerów i interwałów, zapytania bez sufitu, audyt wagi bundla, brak ciężkiej pracy
  synchronicznej w handlerze, operacje wsadowe zamiast pętli pojedynczych wywołań. Sekcje Core Web
  Vitals, Images, CSS, Fonts, Network i Infrastructure POMINIĘTE - nie ma tu LCP, CDN ani bazy danych.
- Repo PKM Assistant, HEAD `962908d2` - wszystkie liczby, cytaty i ścieżki zmierzone 2026-08-22.
