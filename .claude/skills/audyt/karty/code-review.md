# Karta: code-review (NOWY, proponowany moduł katalogu 20)

Bada, czy kod modułu przeszedłby dziś recenzję seniora: czy trzyma udokumentowany standard repo
i czy realizuje kontrakt swojego modułu. Plugin ma 18 modułów, 19 dokumentów kontraktowych
(`core/CLAUDE.md` + `modules/*/CLAUDE.md`) i dwie osobne bramki lintu, więc "standard" nie jest
tu opinią - jest zapisany i sprawdzalny.

## Zakres

- Kod produkcyjny repo, kawałkami per katalog modułu: `modules/agent-loop/`, `modules/agents/`,
  `modules/artifacts/`, `modules/chat/`, `modules/crystal-soul/`, `modules/embedding/`,
  `modules/komunikator/`, `modules/memory/`, `modules/models/`, `modules/multimodal/`,
  `modules/onboarding/`, `modules/prompts/`, `modules/shell/`, `modules/skills/`,
  `modules/sub-agents/`, `modules/tools/`, `modules/ui-components/`, `modules/web/`,
  plus `core/`, `config/`, `src/`.
- Dokumenty standardu: root `CLAUDE.md`, `core/CLAUDE.md`, 18 plików `modules/*/CLAUDE.md`,
  `eslint.config.js`, `eslint.obsidian.config.js`, `tsconfig.json`.
- Dokumenty kontraktu: `Refaktor/Sprinty/*.md` (specy sprintów, na przykład
  `SPRINT_01_Quick_Wins_Security.md`, `S26_Harness_Szklane_Pudlo_SPEC.md`, `E2_9_Artefakty_SPEC.md`),
  ADR 001-005 w vaultcie: `40_Pracownie/Dev Desktop/Projekty/PKM Assistant/Dokumentacja/_Zrodla/ADR/`.

Poza zakresem: bezpieczeństwo → karta `security` (jedno zdanie sygnału, zero dublowania analizy);
wydajność → `wydajnosc`; brak testów → `testy`; martwy kod i nieużywane eksporty → `dead-code`;
kłamstwa w dokumentach (liczby, komendy, drzewka) → `docs`; zależności i CVE → `deps`.
Dawny folder na resztki wyciętego forka już nie istnieje: kod wycięto w Sprincie 02, a
tombstone `CLAUDE.md` skasowano później w porządkach clean-room (2026-09) - nie ma czego
obejmować zakresem.

## Poprzeczka

Dwie osie, sprawdzane osobno (mattpocock). Nie mieszamy ich w rankingu, bo kod może zdać jedną,
a oblać drugą.

**Oś STANDARDS** - udokumentowany standard repo wygrywa nad gustem recenzenta.

| Standard | Gdzie żyje | Jak obalacz sprawdza |
|---|---|---|
| Zakaz deep importów (tylko przez `index.ts` modułu) | `eslint.config.js:139-190` (`no-restricted-imports`, trzy bloki: reguła ogólna, wyjątek `src/main.ts`, wyjątek `config/runtimeConfig.ts`) | `npm run lint` i odczyt komunikatu reguły |
| Oficjalne wytyczne katalogu Obsidiana | `eslint.obsidian.config.js` (`eslint-plugin-obsidianmd`, `npm run lint:obsidian`) | uruchamia lint i porównuje z baseline |
| Kontrakt TypeScriptu | `tsconfig.json`: `strict: true`, `isolatedModules: true`, `noEmit`, świadomy wyjątek `alwaysStrict: false` (uzasadnienie w komentarzu, kontrakt TS-0) | `npm run typecheck` |
| Zasady projektu | root `CLAUDE.md`: "REGUŁA GŁÓWNA" (:78), "Komendy" (:179), "Git flow" (:201), "Commit message format" (:231), "Twarde reguły" (:239), "Co NIE-WOLNO" (:281), "Per-moduł CLAUDE.md" (:323), "Źródła prawdy" (:334), "Konflikt faktów" (:354), "Reguły ogólne" (:378) | otwiera wskazaną sekcję i czyta, czy naprawdę tak mówi |

Kluczowe reguły Obsidiana (nazwy z `eslint-plugin-obsidianmd`, włączone przez
`obsidianmd.configs.recommended` w `eslint.obsidian.config.js`): `obsidianmd/detach-leaves`,
`obsidianmd/no-plugin-as-component`, `obsidianmd/no-global-this`, `obsidianmd/no-nodejs-modules`,
`obsidianmd/no-static-styles-assignment`, `obsidianmd/prefer-create-el`,
`obsidianmd/prefer-window-timers`, `obsidianmd/prefer-file-manager-trash-file`,
`obsidianmd/no-tfile-tfolder-cast`, `obsidianmd/no-unsupported-api`, `obsidianmd/validate-manifest`.

**Oś SPEC** - kontrakt modułu. Źródła: `modules/<x>/CLAUDE.md` (sekcje "Co tu jest",
"Public API", "Gotchas / decyzje historyczne" - format opisany w root `CLAUDE.md:323-330`),
spec sprintu w `Refaktor/Sprinty/`, ADR 001-005, `Dokumentacja/00-09` w pracowni.

**Pytanie CTO** (zadaj przy każdym pliku kawałka): czy senior zablokowałby dziś merge tego pliku
w takim stanie i dlaczego? Brak konkretnego "dlaczego" = brak znaleziska.

**Pięć osi jako checklista** (addyosmani): poprawność, czytelność i prostota, architektura;
bezpieczeństwo i wydajność tylko jako jednozdaniowy sygnał do właściwej karty.

## Kawałki startowe

| Nazwa | Zakres | Poprzeczka kawałka |
|---|---|---|
| agent-loop | `modules/agent-loop/` + `CLAUDE.md` | pętla i parser trzymają kontrakt public API i cyklu życia |
| tools | `modules/tools/` + `CLAUDE.md` | każde narzędzie ma ten sam kształt kontraktu wejścia i błędu |
| sub-agents | `modules/sub-agents/` + `CLAUDE.md` + `SPRINT_05_NOTES.md` | runner i rejestr nie dublują logiki limitów |
| memory | `modules/memory/` + `CLAUDE.md` | jedna szkoła składania nagłówka notatki, jeden właściciel zapisu |
| models i dostawcy | `modules/models/` (w tym `providers/*.ts`, baza `OpenAiCompatibleProvider.ts`, `registry.ts`) | 9 dostawców trzyma jeden kontrakt bazy, bez kopiuj-wklej |
| chat | `modules/chat/` (w tym `chat/`) + `CLAUDE.md` | warstwa UI nie trzyma logiki decyzyjnej |
| komunikator | `modules/komunikator/` + `CLAUDE.md` | manager, widoczność i kolejka mają rozdzielone odpowiedzialności |
| agents | `modules/agents/` + `CLAUDE.md` | polityka dostępu w jednym miejscu, nie rozsypana po widokach |
| artifacts | `modules/artifacts/` + `CLAUDE.md` | parser i store nie znają się nawzajem od środka |
| prompts i skills | `modules/prompts/`, `modules/skills/` + `CLAUDE.md` | budowa promptu ma jedno wejście i jedno wyjście |
| embedding | `modules/embedding/` + `CLAUDE.md` | silnik i adaptery rozdzielone zgodnie z ADR 005 |
| web | `modules/web/` + `CLAUDE.md` | rejestr, filtr i cache mają rozłączne role |
| shell i ui-components | `modules/shell/`, `modules/ui-components/` + `CLAUDE.md` | brak logiki domenowej w warstwie prezentacji |
| core, config, src | `core/`, `config/`, `src/` + `core/CLAUDE.md` | `core/` zostaje wspólny, `src/main.ts` tylko składa (kryterium z ADR 003) |

## Checklista szukacza

0. **Szukacz nr 1 to wbudowany recenzent i odpala go LIDER**: `/code-review high <ścieżka kawałka>`
   na PEŁNYCH plikach, nie na diffie. Lider przepisuje wynik do FINDER_OUT z oryginalnym
   `plik:linia` i puszcza przez obalaczy jak każde inne znalezisko. Ta checklista to szukacz nr 2.
1. Przeczytaj `modules/<kawałek>/CLAUDE.md`, sekcje "Public API" i "Gotchas", potem
   `modules/<kawałek>/index.ts`. Rozjazd między deklarowanym a realnym eksportem = znalezisko kontraktu.
2. Deep importy: `npm run lint`. Przy błędzie przeczytaj wzorzec w `eslint.config.js:139-190` i
   sprawdź, czy plik nie łapie się na jeden z dwóch udokumentowanych wyjątków.
3. Typy: `npm run typecheck`, potem `grep -rn "as any\|as unknown\|@ts-expect-error\|!\." modules/<kawałek> --include=*.ts | grep -v test`.
   Każda taka granica ma mieć obok komentarz z powodem (konwencja `// TS-any:` opisana w `eslint.obsidian.config.js`).
4. Bramka Obsidiana: `npm run lint:obsidian`, policz errory i porównaj z baseline. Znaleziskiem
   są tylko NOWE errory względem baseline, nie cały stos.
5. `manifest.json` `minAppVersion` vs użyte API: `grep -n "minAppVersion" manifest.json` i wynik
   reguły `obsidianmd/no-unsupported-api`. Znany rozjazd (`setDisabled` wymaga 1.2.3) jest opisany
   w komentarzu konfigu - nie zgłaszaj go jako nowość.
6. Rozmiar i struktura: `wc -l modules/<kawałek>/*.ts`. Znaleziskiem jest plik rosnący bez dekompozycji
   PLUS konkretny nowy warunek doklejony do obcego przepływu, nie sama liczba linii.
7. Duplikaty helperów: dla podejrzanej funkcji `grep -rn "function <nazwa>\|const <nazwa> =" modules/ core/ --include=*.ts`.
   Bespoke bliźniak kanonicznego helpera = znalezisko architektoniczne.
8. Kierunek zależności: czy logika jednego modułu wylądowała w `core/` albo `modules/ui-components/`
   (kryterium podziału: ADR 003 `003_core_vs_modules_kryterium.md`).
9. Zapachy Fowlera jako judgement call z cytatem hunka: Mysterious Name, Duplicated Code,
   Feature Envy, Data Clumps, Primitive Obsession, Repeated Switches, Shotgun Surgery,
   Divergent Change, Speculative Generality, Message Chains, Middle Man, Refused Bequest.
   Udokumentowany standard repo zawsze przebija ten baseline.
10. Powtarzalne `switch`/`if` na tym samym kształcie: `grep -n "switch (" modules/<kawałek>/*.ts` -
    dwa albo więcej rozgałęzień na ten sam typ = brakujący model lub dispatcher.
11. Limity: czy nowa stała limitu siedzi w `config/limits.ts` (jego nagłówek mówi wprost, że stałe
    były wcześniej rozsypane i się rozjeżdżały), czy została wpisana lokalnie.
12. i18n: `grep -rn "t('" modules/<kawałek> --include=*.ts | head` i porównaj z tekstami wpisanymi
    na twardo - nowy tekst UI ma iść przez `core/i18n`.
13. Sad path: przejdź `catch`, gałęzie `else`, timeouty i sprzątanie. Czy błąd zostawia spójny stan.
    Skutek runtime'owy zgłaszasz do karty `bledy`; tutaj interesuje Cię złamany kontrakt modułu.
14. Verify the verification: `git log --oneline -20 -- modules/<kawałek>`. Dla commitów-fixów
    sprawdź, czy jest test regresji; brak = sygnał do karty `testy`, ale rozjazd z "Twardymi regułami"
    (`CLAUDE.md:239`) jest znaleziskiem tej karty.
15. Higiena historii: `git log --oneline -20 -- modules/<kawałek>` vs "Commit message format"
    (`CLAUDE.md:231`) i zakaz dotykania dwóch modułów w jednym commicie (`CLAUDE.md:281`).
16. Dokumentacja modułu: root `CLAUDE.md:378` ("Reguły ogólne", punkt 6) mówi wprost, że dokumentacja,
    która kłamie, jest traktowana jak błąd. Rozjazd public API vs `CLAUDE.md` modułu to TA karta;
    liczby, komendy i drzewka to karta `docs`.
17. Spec sprintu: znajdź spec dotykający kawałka (`ls Refaktor/Sprinty/`) i sprawdź trzy rzeczy -
    czego spec chciał, a nie ma; co jest, a spec o to nie prosił; co wygląda na zrobione, ale robi
    coś innego. Każde z cytatem linii ze speca.
18. Speculative generality: parametr, hook albo opcja bez wołacza -
    `grep -rn "<nazwa>" modules/ core/ src/ --include=*.ts | grep -v test`. Zero wołaczy → karta
    `dead-code`; tutaj zgłaszasz tylko wtedy, gdy realnie utrudnia czytanie.
19. Mapowanie severity z wbudowanego recenzenta: Critical → HIGH, Important → MEDIUM, Minor → LOW.
    CRITICAL rezerwuj na utratę danych albo bezpieczeństwo (i wtedy sprawdź, czy to nie karta `security`).
20. Zanim zgłosisz: wskaż standard albo kontrakt, który kod łamie, i konkretny skutek.
    Bez jednego z tych dwóch to nie jest znalezisko, tylko preferencja.

## Czego NIE flagować

- Styl, który łapie eslint. Odpal `npm run lint` zamiast opisywać to w raporcie.
- "Ja bym zrobił inaczej" bez wskazanego standardu repo (root albo modułowy `CLAUDE.md`, eslint,
  `tsconfig.json`, ADR, spec sprintu).
- Brakujące feature'y spoza speca. To zamawianie roboty, nie recenzja.
- Errory `lint:obsidian` już policzone w baseline. Bramka jest delta, nie bezwzględna.
- Reguły zdegradowane do `warn` w `eslint.obsidian.config.js` (bloki TS-1, TS-3, TS-4). Każda ma
  uzasadnienie w komentarzu i wynika z kontraktu "zero diffu runtime" kampanii TS.
- Kontrakt warstwy dostawców: `modules/models/contracts.ts` (`NormalizedError`) każe odrzucać
  strumień obiektem tego kształtu, nie instancją `Error` - to udokumentowana decyzja
  (`modules/agent-loop` na niej stoi), nie bug. Dawne umiejscowienie tego kontraktu,
  `chat_adapter_base.ts`, zostało skasowane w clean-room.
- `TODO` i `FIXME` bez ukrytego buga pod spodem.
- Sama długość pliku. Liczy się struktura wynikowa i konkretny nowy warunek, nie licznik linii.
- Brak testów DOM. Konwencja repo: zero testów DOM, logika siedzi w modelach (znane 08-16).
- Dawny folder na resztki wyciętego forka - skasowany w całości (kod wycięty w Sprincie 02,
  tombstone `CLAUDE.md` skasowany później w porządkach clean-room) - nie ma już czego flagować.
- Bezpieczeństwo i wydajność. Jedno zdanie sygnału i odesłanie do karty `security` albo `wydajnosc`.

## Narzędzia i komendy

```
/code-review high <ścieżka kawałka>   # wbudowany recenzent, pełne pliki; odpala LIDER, nie szukacz
npm run lint                          # architektura: zakaz deep importów
npm run lint:obsidian                 # oficjalne reguły katalogu Obsidiana, bramka delta
npm run typecheck                     # tsc --noEmit, strict
wc -l modules/<kawalek>/*.ts
git log --oneline -20 -- modules/<kawalek>
ls Refaktor/Sprinty/                  # spec dotykający kawałka
```

Szukacz NIE spawnuje agentów - `/code-review` jest w rękach lidera, a jego wynik wchodzi do biegu
jako zwykłe znaleziska i przechodzi przez obalaczy.

## Severity w tej domenie

- **CRITICAL** - tylko utrata danych albo bezpieczeństwo. Przykład: ścieżka zapisu, która przy
  błędzie kasuje treść notatki usera. Sprawdź najpierw, czy to nie należy do karty `security`.
- **HIGH** (Critical u recenzentów) - bug na normalnej ścieżce albo złamany jawny kontrakt modułu.
  Przykład: `index.ts` nie eksportuje tego, co `CLAUDE.md` ogłasza jako Public API, a inny moduł
  sięga po to deep importem.
- **MEDIUM** (Important) - problem architektoniczny albo obsługa błędu psująca utrzymanie.
  Przykład: logika jednego modułu wstawiona do `core/` wbrew kryterium z ADR 003.
- **LOW** (Minor) - czytelność, nazwy, martwy parametr, komentarz mylący czytelnika.
- **INFO** - obserwacja o strukturze bez skutku, budulec pod inne znalezisko.

## Dowód wymagany

- `plik:linia` plus dosłowny cytat do 3 linii.
- ORAZ jedno z dwóch: (a) cytat ze standardu, który kod łamie (plik standardu, sekcja lub linia),
  albo (b) cytat z kontraktu lub speca (`CLAUDE.md` modułu, `Refaktor/Sprinty/*.md`, ADR).
- ORAZ konkretny skutek: co się psuje teraz albo co kosztuje przy następnej zmianie.
  "Nieładne" i "niespójne" to nie jest skutek.
- Dla znalezisk z `/code-review`: lider przepisuje je z ORYGINALNYM `plik:linia`, a obalacz
  weryfikuje cytat u źródła, nie w streszczeniu.

## Znane

Nie odkrywać ponownie. Do raportu wchodzi status: nadal / naprawione / nie sprawdzono.

> **Pierwszy pełny bieg karty: `audyt/biegi/2026-08-30_code-review/findings.json`** — 80
> potwierdzonych (2 CRITICAL, 8 HIGH), 8 klastrów systemowych. Kolejny bieg zaczyna listę ZNANE
> od tego pliku + Risk registeru Katalogu; poniższe punkty to stan na 2026-08-30.

- 2026-08-30 - baseline `lint:obsidian` = **0 errorów, bramka BINARNA** (fala lint-zero 27.08,
  `78b664c`); pin `restrict-template-expressions` (dawna klasa modelu czatu sprzed clean-room
  w linii 391 pliku od tego czasu skasowanego - dziś `modules/models/ChatModel.ts`;
  `DelegateTool.ts:555`) zamknięty 28.08. Sprawdzone 2026-09-06 po realnej implementacji
  clean-room: `npx eslint --config eslint.obsidian.config.js modules/models/ChatModel.ts
  modules/tools/DelegateTool.ts` nie zgłasza dziś ani jednego `restrict-template-expressions`.
  Stare wpisy o 89/91 errorach — nieaktualne.
- 2026-08-21 - `modules/agents/AgentProfileView.ts:48` i `modules/komunikator/CommunicatorView.ts:18`
  mają w JSDoc `@param {import('./SidebarNav.js').SidebarNav}`, a `SidebarNav.ts` leży
  w `modules/shell/sidebar/`. Bieg 30.08: **nadal** (risk register 30.08).
- 2026-08-20 - `core/CLAUDE.md` przeczy sam sobie (drzewko `core/utils/` vs E3.7). To karta `docs`;
  tutaj tylko gdy kłamie kontrakt public API — bieg 30.08 znalazł osobno AUD-048 (sekcja
  "Publiczne API" nie wymienia 8 realnych eksportów barrela).
- 2026-08-21 - nagrobek dawnego folderu na resztki wyciętego forka zamknięty. Od porządków
  clean-room (2026-09) folder skasowany w całości, tombstone też już nie istnieje. Poza zakresem
  tej karty.

## Źródła

- obra/superpowers (MIT) - https://github.com/obra/superpowers - szablon recenzenta
  (`requesting-code-review/code-reviewer.md`): kategorie Critical/Important/Minor, zakaz spawnowania
  drugiej opinii, wymóg `plik:linia`.
- mattpocock/skills (MIT) - https://github.com/mattpocock/skills - dwie osie Standards i Spec,
  baseline zapachów Fowlera ("Refactoring", rozdział 3), zasada "repo overrides".
- addyosmani/agent-skills (MIT) - https://github.com/addyosmani/agent-skills - pięć osi recenzji,
  Structural Remedies, Verify the Verification, Dead Code Hygiene, tabela racjonalizacji.
- google-gemini/gemini-cli (Apache-2.0) - https://github.com/google-gemini/gemini-cli -
  preflight przed recenzją (uruchom bramki, zanim zaczniesz czytać).
- Repo: root `CLAUDE.md`, `core/CLAUDE.md` i 18 plików `modules/*/CLAUDE.md`, `eslint.config.js`,
  `eslint.obsidian.config.js`, `tsconfig.json`, `Refaktor/Sprinty/`.
- Vault: `40_Pracownie/Dev Desktop/Projekty/PKM Assistant/Katalog_Audytow.md` (Risk register),
  `Dokumentacja/_Zrodla/ADR/001-005`.
