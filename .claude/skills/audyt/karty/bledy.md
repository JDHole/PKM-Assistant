# Karta: bledy (moduł katalogu 10)

Bada obsługę awarii: czy błąd jest obsłużony, czy połknięty; czy user dostaje zdanie,
czy surową linię SSE; czy po awarii i po `onunload` nic nie zostaje żywe. Plugin ma
pętlę agenta, streamy i suby w tle, więc połknięty błąd nie jest brzydki, tylko drogi.

## Zakres

W zakresie: `modules/agent-loop/` (AgentLoop, MessageStore, toolCallParser);
`modules/models/providers/` (baza `OpenAiCompatibleProvider.ts` + dostawcy) i
`modules/models/ChatModel.ts` (strumień, bramka, abort); `modules/sub-agents/`
(SubAgentRunner, SubTaskRegistry, SubTaskNotifier); `modules/chat/chat/chat_streaming.ts`
i `chat_session.ts`; `modules/tools/` (kształt zwracanego błędu); `modules/memory/`
i `modules/komunikator/` (zapis, który padł, nie zostawia notatki-kadłubka; konsolidacja
przerwana w połowie); `src/main.ts` (`onunload` w linii 352, `registerInterval` w 917);
`core/PluginBase.ts` (klasa bazowa cyklu życia); `core/utils/TraceLog.ts`;
`harness/lib/report.ts`, `harness/lib/boot.ts`, `harness/run.ts`.

Poza zakresem: brak testu na ścieżkę błędu -> `testy.md`; błąd jako wektor ataku
-> `security.md`; styl i konwencje -> `code-review.md`; martwe `catch` w martwym kodzie
-> `dead-code.md`.

## Poprzeczka

Cztery reguły, każda sprawdzalna w kodzie:

1. **Żaden `catch` nie jest pusty.** Każdy albo obsługuje (naprawia stan, robi fallback),
   albo loguje Z KONTEKSTEM (moduł, operacja, dane wejściowe), albo rzuca dalej.
   `catch { }` i `catch (e) { }` to zawsze co najmniej LOW.
2. **Komunikat dla usera to zdanie.** Nie surowa linia SSE, nie zrzut JSON, nie stack.
   Techniczny szczegół idzie do loga i trace, człowiek dostaje "co się stało i co dalej".
3. **Wszystko, co żyje, jest zapięte do cyklu życia.** Timer, listener, strumień, bieg
   suba, uchwyt pliku: każdy ma właściciela, który go ubija w `onunload` albo `dispose`.
   Wzorzec repo to `registerInterval` (`src/main.ts:917`) i jawny `dispose()`
   (`subTaskNotifier`, `subTaskRegistry`, `traceLog` w `src/main.ts:352-370`).
4. **Awaria zostawia spójny stan.** Kod nie melduje "zrobione", gdy nie zrobił; nie zostawia
   biegu w połowie bez śladu; narzędzie odróżnia błąd od wyniku tak, żeby model to widział.

Jak obalacz to sprawdza: otwiera wskazane `plik:linia`, prześledza ŚCIEŻKĘ WYWOŁANIA w górę
(technika root-cause-tracing: kto to woła, z jaką wartością, skąd ta wartość) i pyta, czy
skutek jest realny, czy tylko teoretyczny.

## Kawałki startowe

| nazwa | zakres | poprzeczka_kawalka |
|---|---|---|
| pętla agenta | `modules/agent-loop/AgentLoop.ts` | każda ścieżka zejścia (natural/backstop/abort/error) domyka budziki i emituje `loop.end` |
| strumień modelu | `modules/models/providers/` (`OpenAiCompatibleProvider.ts` + dostawcy) | każdy błąd streamu ma właściciela promisy; async listener nie gubi odrzucenia |
| bramka i abort | `modules/models/ChatModel.ts` | slot bramki zwalnia się na KAŻDEJ ścieżce, timery są sprzątane |
| subagenci | `modules/sub-agents/` | bieg w tle ginie na unload; zlecający wie, JAK sub zszedł |
| czat | `modules/chat/chat/chat_streaming.ts`, `chat_session.ts` | timery per sesja zapięte do widoku; komunikat awarii po ludzku |
| narzędzia | `modules/tools/` | błąd narzędzia jest rozpoznawalny dla modelu i dla usera |
| cykl życia pluginu | `src/main.ts`, `core/PluginBase.ts` | `onunload` zamyka wszystko, co `onload` otworzyło |
| logi i trace | `core/utils/TraceLog.ts` | sink domyka się na unload, nie pisze w stare miejsce |
| pamięć i komunikator | `modules/memory/`, `modules/komunikator/` | zapis, który padł, nie zostawia notatki-kadłubka |
| harness jako czujnik | `harness/lib/report.ts`, `harness/lib/boot.ts` | co bieg realnie mierzy, a czego nie widzi |

## Checklista szukacza

Wszystkie komendy przetestowane 2026-08-22 na HEAD `962908d2` (ripgrep 14.1.1, Git Bash);
numery linii odświeżone 2026-08-23 na HEAD `a77339dd` (po naprawach K1-K23 - przesunięcia
NIE są stałe w obrębie pliku, szukaj po nazwach). Liczby trafień (6 / 108 / 43 / 73 / 69 / 46)
pochodzą z 962908d2.
Zakres katalogów wszędzie: `core modules src config utils`.

1. **Puste `catch`.** `rg -n --glob '*.ts' 'catch\s*(\([^)]*\))?\s*\{\s*\}' core modules src config utils`
   Dziś 6 trafień: `src/main.ts:992`, `src/main.ts:1137`, `modules/komunikator/CommunicatorView.ts:109`,
   `modules/chat/chat/chat_streaming.ts:1013`, `modules/chat/chat/SlashCommandsRegistry.ts:82`,
   `modules/shell/sidebar/HomeView.ts:244`. Wariant Git Bash (bez ripgrepa):
   `grep -rnE "catch[[:space:]]*\([^)]*\)[[:space:]]*\{[[:space:]]*\}" --include=*.ts core modules src config utils`
   (znajduje mniej, bo wymaga nawiasów). Pusty catch Z KOMENTARZEM wyjaśniającym to nie to samo
   co pusty bez niczego - najpierw przeczytaj linię, potem oceniaj.
2. **`catch` tylko z logiem.** `rg -U -n --glob '*.ts' 'catch\s*(\([^)]*\))?\s*\{\s*\r?\n\s*(console|log)\.[a-z]+\([^\n]*\);?\s*\r?\n\s*\}' core modules src config utils`
   Dziś 108 trafień w 36 plikach. To NIE jest 108 znalezisk. Filtruj: czy log ma kontekst
   (moduł + operacja), czy stan po tym logu jest spójny, czy wołający dostaje sygnał porażki.
3. **`.then(` bez `.catch`.** `rg -n --glob '*.ts' '\.then\(' core modules src config utils | rg -v '\.catch'`
   Dziś 43 linie. Sprawdzaj tylko te, gdzie odrzucenie ma dokąd polecieć (nie w `void`).
4. **Wywołanie fire-and-forget.** `rg -n --glob '*.ts' '^\s*[a-zA-Z_$][a-zA-Z0-9_$.]*\.(stream|dispose|flush|save|close|closeAll|run|send)\(' core modules src | rg -v 'await|return|=|\?\.'`
   Dziś 73 linie. Wzorzec z registeru to `model.stream(`: dziś w `modules/agent-loop/AgentLoop.ts:279`
   jest owinięte w `Promise.resolve(...)` z `.catch((err) => reject(err))` w linii 297
   (regresję pinuje `modules/agent-loop/AgentLoop.streamRejection.test.ts`). Szukaj analogicznych
   miejsc, których nikt jeszcze nie owinął.
5. **Async listener w mechanizmie zdarzeń streamu.** `rg -n --glob '*.ts' 'addEventListener\(\s*["'"'"'][a-z]+["'"'"']\s*,\s*async' core modules src`
   Historyczny przykład (`chat_adapter_base.ts:441-454`, `dispatchEvent` robiący
   `this.listeners[event.type].forEach((cb) => { cb(event); ... })`, więc promisa zwrócona
   przez `async` listener przepadała; listener `"message"` miał niechronione `await` w gałęzi
   `[DONE]`) siedział w pliku skasowanym w clean-room. Warstwa streamu żyje dziś w
   `modules/models/providers/` (`OpenAiCompatibleProvider.ts` + dostawcy) i
   `modules/models/ChatModel.ts`: sprawdzone 2026-09-06 — `handlers` jest tam POJEDYNCZYM
   obiektem callbacków (`chunk`/`done`/`error`), nie tablicą listenerów iterowaną `forEach`em,
   więc ta konkretna klasa błędu (gubienie odrzucenia w pętli po listenerach) strukturalnie
   nie ma dziś czego dotknąć. `handlers.done` jest jawnie awaitowany (`ChatModel.ts:649`,
   bo bywa asynchroniczny), a `chunk`/`error` lecą przez `_callHandler` — synchroniczny
   try/catch (`ChatModel.ts:639`), zgodny z kontraktem tych dwóch callbacków (SYNCHRONICZNE).
   `rg` powyżej po całym `core modules src` trafia dziś wyłącznie w kliknięcia UI
   (`addEventListener('click'/'change', async ...)` na przyciskach Ustawień/modali), nie
   w mechanizm streamu.
6. **Timer bez rejestracji.** `rg -n --glob '*.ts' 'set(Timeout|Interval)\(' core modules src config utils | rg -v 'registerInterval|clearTimeout|clearInterval|\.test\.ts'`
   Dziś 69 linii. Kanon repo: `registerInterval` (`src/main.ts:917`,
   `modules/chat/chat/chat_session.ts:28` i `:41`) albo jawny `clearTimeout` w `finally`
   po rozstrzygnięciu wyścigu (wzór `AgentLoop._streamOnce`). Timer, który przeżyje unload,
   to znalezisko nawet gdy dziś nic nie psuje.
7. **`JSON.parse` bez `try`.** `rg -n -B2 --glob '*.ts' 'JSON\.parse\(' core modules src config utils`
   (dziś 46 plików z trafieniem). Interesują tylko te, gdzie wejście przychodzi z zewnątrz:
   odpowiedź modelu, plik ustawień, `data.json`, wynik serwera MCP.
8. **Surowy komunikat u usera.** `rg -n --glob '*.ts' 'new Notice\(' core modules src`
   i sprawdź, czy argument nie jest złapanym obiektem błędu. Osobno
   `rg -n --glob '*.ts' 'normalize_error' core modules src` - co ta funkcja zwraca, gdy
   wejście nie jest znanym kształtem, i czy to trafia do UI.
9. **Błąd narzędzia jako zwykły string.** `MCPClient.executeToolCall` z założenia nie rzuca
   (błąd wraca jako `{isError:true}`, opisane w `harness/README.md`). Sprawdź, czy każde
   narzędzie z `modules/tools/` ten kształt zachowuje, i czy tekst błędu nie wygląda dla
   modelu jak poprawny wynik. `rg -n --glob '*.ts' 'isError' modules/tools`
10. **Ścieżki `onunload`.** Przeczytaj `src/main.ts:352-370` linia po linii i dla każdego
    bytu otwartego w `onload`/`initialize` odpowiedz, kto go zamyka. `core/PluginBase.ts`
    (435 linii, zaimplementowana) NIE ma własnego `onunload` ani `registerInterval` - to klasa
    bazowa z `registerCommands`/`registerRibbonIcons`/`registerItemViews`; cały demontaż
    siedzi w `src/main.ts` i w `core/runtime/PluginRuntime.dispose` (dawniej `PKMEnv.unload_main`).
11. **`dispose()` bez wołacza.** `rg -n --glob '*.ts' 'dispose\s*\(' core modules src | rg -v 'test'`
    - każda metoda `dispose` musi mieć miejsce wywołania na ścieżce unload.
12. **Wyścig na sprzątaniu.** Szukaj `finally` z `clearTimeout`/`clearInterval` i sprawdź,
    czy spóźniony sygnał nie uzbraja NOWEGO budzika po sprzątnięciu (wzorzec `settled`
    w `AgentLoop._streamOnce`, linie 304-353).
13. **Meldunek niezgodny ze stanem.** Szukaj miejsc, gdzie kod zwraca sukces w gałęzi
    `catch` albo po timeoucie: `rg -n -A3 --glob '*.ts' 'catch' core modules src | rg -n 'success.*true|return true'`.
14. **Potwierdzenie dynamiczne.** `npm run harness` (dry-boot, raport DoD FAZY A) i
    `npm run harness:scenarios` (31 scenariuszy offline). Scenariusze ścieżek błędu:
    `02_backstop`, `06_edge_deny`, `26_settings_pancerz`, `27_settings_lastgood`,
    `41_sub_uczciwosc`. Cytuj output, nie wrażenie.
15. **Co harness widzi, a czego nie.** `harness/lib/report.ts` (245 linii) raportuje
    przebieg narzędzi per iteracja, blokady, `stop-reason`, iteracje, tokeny, chunki,
    czas pętli i DoD (`loop.start w trace`, `finalText niepusty`, `stoppedBy z trace`,
    `loop.end obecny`). NIE raportuje timerów ani sprzątania. Timery liczy dopiero
    `harness/run.ts:106-110` przez `cleanupPlugin` (`harness/lib/boot.ts:141-154`), które
    woła `plugin?.onunload?.()` w `try/catch`, czyści `settingsManager.save_timeout`
    i zwraca `cleared` z `shutdownHarnessRuntime()`. Konsekwencja: timer NIEzarejestrowany
    przez `registerInterval` nie pojawia się w tym liczniku, a wyjątek z `onunload` zostaje
    tylko `console.warn` i biegu nie czerwieni.

## Czego NIE flagować

1. **Best-effort `catch` z komentarzem i logiem** - świadoma decyzja, nie przeoczenie
   (wzór: `try { ... } catch { /* best-effort */ }` w ścieżkach flush).
2. **`catch` w ścieżkach sprzątania** (`dispose`, `onunload`, `cleanup`), gdzie rzucenie
   dalej zablokowałoby demontaż reszty.
3. **Kod harnessa, atrap i mocków** (`harness/mock/`, `harness/lib/Harness*`) - to narzędzie.
4. **Błędy celowo połykane zgodnie z CLAUDE.md modułu** - najpierw przeczytaj ten dokument.
5. **Brak testu na ścieżkę błędu** - to karta `testy.md`, nie ta.
6. **"Można by ładniej logować" bez skutku.** Log bez kontekstu jest znaleziskiem tylko
   wtedy, gdy potrafisz pokazać śledztwo, w którym to zaboli.
7. **`catch (e) { reject(e) }` i podobne przekazania dalej** - to jest obsługa.
8. **Timery w kodzie testów.**

## Narzędzia i komendy

```bash
npm run harness                # dry-boot + DoD FAZY A; na końcu licznik timerów
npm run harness:scenarios      # 31 scenariuszy offline
npm run harness:selftest       # pełny cykl pętli na fake-serwerze SSE
npx ava --verbose modules/agent-loop/AgentLoop.streamRejection.test.ts
git log -S "catch" --oneline -20 -- <plik>   # kiedy ta obsługa powstała
```

**CRLF.** Repo ma `core.autocrlf=true`, pliki mają terminatory CRLF. Ripgrep bez `--crlf`
gubi wzorce z `$`: `rg -c '\) \{$' modules/agent-loop/AgentLoop.ts` daje 0 trafień (exit 1),
`rg -c --crlf` na tym samym pliku daje 29. `grep -E '\) \{$'` w Git Bash daje 29 bez flag.
W rg z `$` zawsze `--crlf`. `grep -P` w tym środowisku pada
("supports only unibyte and UTF-8 locales") - używaj `grep -E` z klasami POSIX.
Ripgrep NIE ma lookbehind (`(?<!await )` to błąd parsera) - filtruj drugim `rg -v`.

**Reprodukcja wymagająca zmiany kodu** (np. wstrzyknięcie rzutu, żeby zobaczyć, gdzie
błąd wyleci): tylko w tymczasowym worktree, `git worktree add --detach $SCRATCH/wt-<id> HEAD`,
po robocie `git worktree remove --force`. Pełna procedura z junctionem na `node_modules`
jest w karcie [testy](testy.md). W głównym drzewie nie zmieniasz ani bajtu.

## Severity w tej domenie

- **HIGH** - błąd ukrywa utratę danych, zostawia osierocony bieg albo strumień, ALBO
  wprowadza usera w błąd meldunkiem "zrobione", gdy nie zrobione.
- **MEDIUM** - surowy komunikat techniczny w UI, brak sprzątania bez widocznego dziś
  skutku (timer na martwym pluginie), błąd połknięty tam, gdzie wołający potrzebuje sygnału.
- **LOW** - jakość logów: log bez kontekstu, `catch` z gołym `console.error(e)`.
- **INFO** - obserwacja-budulec: niespójność wzorca obsługi w obrębie modułu.

CRITICAL zarezerwowany dla przypadku, w którym błąd sam z siebie kasuje albo psuje dane
w vaultcie usera bez jego akcji. Jeśli to wektor ataku, znalezisko idzie do `security.md`.

## Dowód wymagany

1. `plik:linia` samego `catch`, wywołania albo timera, z dosłownym cytatem (max 3 linie).
2. Ścieżka wywołania w górę: skąd przychodzi błąd i kto woła to miejsce, z `plik:linia`
   dla każdego piętra. To jest sedno root-cause-tracing - bez tego jest tylko objaw.
3. Skutek: co się dzieje, gdy ta gałąź się wykona (co user widzi, co zostaje w pamięci,
   co ginie). "Może się wysypać" nie jest skutkiem.
4. Reprodukcja, gdy była: komenda i fragment outputu; inaczej `reprodukcja: "source-only"`.

## Znane

Z Risk registeru `Katalog_Audytow.md`. Nie odkrywaj ponownie - ustal status i wpisz do
`znane_status`. Numery linii z registeru zdążyły się przesunąć, więc szukaj po nazwach.
Od 2026-08-23 karta ma pierwszy pełny bieg (`audyt/biegi/2026-08-23_bledy/findings.json`,
55 potwierdzonych w 7 klastrach) - lider buduje z niego listę ZNANE w kroku 6 setupu;
lista niżej zostaje dla pozycji nocnych z registeru. Stan po biegu: Z1/Z4/Z5/Z6 naprawione,
Z3 i Z7 nadal (Z7 = AUD-bledy-056/054), Z2 i Z8 nie sprawdzono.

- **2026-08-12** - `AgentLoop._streamOnce` wołał `model.stream()` bez `await` i bez `.catch`,
  co dawało `ERR_UNHANDLED_REJECTION` i pad runnera. Sprawdzić czy nadal: dziś
  `AgentLoop.ts:279` ma `Promise.resolve(...)` i `.catch` w linii 297 plus test regresji.
- **2026-08-12** - stary streamer (`chat_adapter_base.ts`, plik skasowany w clean-room) gubił
  promisy z `async` listenerów w `dispatchEvent`, a listener `"message"` miał niechronione
  `await` w gałęzi `[DONE]`. Warstwa streamu żyje dziś w `modules/models/providers/` i
  `modules/models/ChatModel.ts`. Sprawdzone 2026-09-06: `handlers` jest tam pojedynczym
  obiektem callbacków, nie tablicą listenerów w `forEach`— ten kształt błędu nie występuje;
  `handlers.done` jest jawnie awaitowany (`ChatModel.ts:649`).
- **2026-08-13** - stara klasa modelu czatu sprzed clean-room (plik skasowany, dziś
  `modules/models/ChatModel.ts`) planowała w metodzie zwolnienia po cooldownie goły
  `setTimeout` bez rejestracji w cyklu życia.
  Dzisiejszy odpowiednik to seam `ChatModel.scheduleGateRelease` / `GATE_RELEASE_COOLDOWN_MS`
  (`ChatModel.ts:523-525`, cooldown 150 ms) — zaimplementowany i zielony pod testami, ale
  sprawdzone 2026-09-06: `scheduleGateRelease` dalej woła goły `setTimeout` bez zachowanego
  uchwytu i bez `clearTimeout` gdziekolwiek w pliku.
- **2026-08-14** - `LogFileSink.dispose()`: po unloadzie dziennik pisze dalej w stare
  miejsce (wiersz registeru uszkodzony przy renderze, początek zdania przepadł).
  Sprawdzić czy nadal, wchodząc przez `core/utils/TraceLog.ts:102-107`.
- **2026-08-14/15** - backstop suba umierał na timeoucie i oddawał zaślepkę, a trace nie
  odróżniał backstopu z wynikiem od backstopu z zaślepką. Sprawdzić czy nadal: dziś
  `AgentLoop.ts:631-635` emituje `loop.end` z polem `fallback: 1`.
- **2026-08-15** - `stoppedBy` nie wracało do zlecającego, więc agent nie wiedział, czy sub
  skończył robotę, czy iteracje. Sprawdzić czy nadal: dziś `SubAgentRunner` niesie
  `stoppedBy` w zwrotce (`SubAgentRunner.ts:66`, `:276`, `:289`, `:313`).
- **2026-08-16** - sub odpalony w tle przeżywa `onunload` i mieli dalej; `SubTaskRegistry.dispose()`
  porzucał uchwyty abortu. Sprawdzić czy nadal.
- **2026-08-16** - po `onunload` sub wywala się na zdemontowanym streamie, a komunikat błędu
  to SUROWA linia SSE zamiast zdania. Sprawdzić czy nadal.

## Źródła

- obra/superpowers, skill `systematic-debugging`, MIT, https://github.com/obra/superpowers
  - cztery fazy, próg trzech nieudanych napraw jako sygnał problemu architektonicznego.
- obra/superpowers, `systematic-debugging/root-cause-tracing.md`, MIT - śledzenie w górę
  stosu do pierwotnego wyzwalacza zamiast łatania w miejscu objawu.
- Repo PKM Assistant (`harness/README.md`, `harness/lib/report.ts`, `src/main.ts`) jako
  materiał faktograficzny.
