# Karta: security (moduł katalogu 8)

Bada, czy da się przekroczyć granicę zaufania pluginu: wyciągnąć z vaulta treść albo sekret,
albo zmusić agenta do akcji, której user nie zlecił. To agentowy system AI z narzędziami do
plików, siecią, pocztą i pamięcią, w rendererze Electrona z pełnym Node i bez sandboxa,
więc jedynymi barierami są bramki w naszym własnym kodzie.

## Zakres

- `modules/tools/` - argumenty narzędzi jako zlewy: `ReadTool.ts`, `WriteTool.ts`, `DeleteTool.ts`,
  `SearchTool.ts`, `ListTool.ts`, `CreateFolderTool.ts`, `WebReadTool.ts`, `WebSearchTool.ts`,
  `MemorySaveTool.ts`, `MemoryDeleteTool.ts`, `DelegateTool.ts`, `AgentDelegateTool.ts`,
  `KomunikatorTools.ts`, `MCPClient.ts`, `ExternalMcpManager.ts`, `ServerManager.ts`,
  `ServerLoader.ts`, `ToolRegistry.ts`, `vault_path_validator.ts`, `vault_adapter_io.ts`,
  `server_timeout.ts`, `mcpServerPresets.ts`, `claudeConfigImport.ts`, `CLAUDE.md`
- `modules/sub-agents/` (`SubAgentRunner.ts`, `SubTaskRegistry.ts`, `SubAgentLoader.ts`, `framePrompt.ts`)
- `modules/agent-loop/` (`AgentLoop.ts`, `toolCallParser.ts`, `toolTranscriptSanitizer.ts`)
- `modules/memory/` (`MemoryAccessGuard.ts`, `AgentMemory.ts`, `RetrievalEngine.ts`)
- `modules/models/providers/` (baza `OpenAiCompatibleProvider.ts` + dziewięciu dostawców),
  `modules/models/registry.ts`, `modules/models/ChatModel.ts`
- `modules/chat/chat/` (`chat_streaming.ts`, `chat_messages.ts`, `chat_ui.ts`) - render i składanie tury
- `modules/komunikator/` (`KomunikatorManager.ts`, `visibility.ts`), `modules/web/` (`urlRegistry.ts`,
  `domainFilter.ts`), `modules/artifacts/artifactParser.ts`, `modules/prompts/PromptBuilder.ts`,
  `modules/agents/` (`accessPolicy.ts`, `toolAxis.ts`, `Agent.ts`, `AgentLoader.ts`),
  `modules/skills/SkillLoader.ts`, `modules/embedding/` (`orama_engine.ts`, `VaultIndexer.ts`)
- `core/security/` (9 plików + 8 testów), `core/utils/` (`Logger.ts`, `TraceLog.ts`, `LogFileSink.ts`,
  `vaultFs.ts`), `core/http/` (transport HTTP, dawny `http_request.ts`), `core/ui/safeHtml.ts`
  (dawny `core/PluginView.ts`), `core/runtime/PluginRuntime.ts` (dawny `core/PKMEnv.ts`),
  `core/PluginBase.ts` (dawny `core/PKMPlugin.ts`), `core/SECURITY.md`
- `src/main.ts`, `config/limits.ts`, `esbuild.js`, `SECURITY.md`

Poza zakresem: CVE zależności i sekrety w historii repo → karta `deps`; brak testu strażnika →
karta `testy`; pusty `catch` bez skutku dla granicy → karta `bledy`; koszt i czas → `wydajnosc`;
rozjazdy w dokumentach → `docs`.

## Poprzeczka

Trzy warstwy. Obalacz sprawdza tak samo w każdej: otwiera wskazany plik i pokazuje linię,
która realizuje obietnicę, albo pokazuje ścieżkę kodu, która ją omija.

### Warstwa A - obietnice z `SECURITY.md` (root) i `core/SECURITY.md`

Każdy wiersz to punkt do sprawdzenia. Sekcja "Co jest NA GŁOWIE USERA" to trust model,
NIE lista znalezisk.

| Obietnica | Gdzie w kodzie szukać |
|---|---|
| Klucze API mieszkają w `.pkm-assistant/settings.json`, nie w kodzie | `core/runtime/PluginRuntime.ts` (`saveSettings` — zaimplementowana: pisze `JSON.stringify(settings)` pod `SETTINGS_PATH` = `.pkm-assistant/settings.json`, stała w `core/runtime/contracts.ts:324`), dawniej `core/PKMEnv.ts:948` (`data_fs.write('settings.json', ...)`) |
| `isProtectedPath` blokuje agentom settings, backupy i legacy (`data.json`, `.env`) | `core/security/keySanitizer.ts:11` (lista), użycia: `core/security/PermissionSystem.ts`, `modules/tools/vault_path_validator.ts` |
| Plugin dopisuje pliki z kluczami do `.gitignore` vaulta przy starcie | `src/main.ts:404-406` |
| Tylko jawny `admin_access` otwiera chronione ścieżki i NIE omija `sanitizePath` | `core/security/AccessGuard.ts`, `core/security/PermissionSystem.ts`, `modules/agents/Agent.ts` |
| Logger maskuje klucze przed zapisem | `core/utils/Logger.ts`, `core/security/SensitiveDataGuard.ts` |
| Klucze można zaszyfrować hasłem głównym (AES-GCM) | `core/security/SecretsStorage.ts`, `core/security/MasterPasswordModal.ts` |
| Narzędzie zewnętrznego serwera jest RED zawsze (`source:'user'`) | `core/security/autonomy.ts:103` (`classifyToolRisk`), `modules/tools/ToolRegistry.ts`, `modules/tools/ExternalMcpManager.ts` |
| "Zawsze zezwalaj" per konkretne narzędzie (`external.call::<serwer>__<narzędzie>`) | `core/security/ApprovalManager.ts` (`alwaysApprovedRules`) |
| Modal approvalu pokazuje pełne argumenty (przycinane ~1500 znaków) | `grep -rn "1500" core/security/ modules/shell/ApprovalModal.ts` |
| Znaczniki `_invocation*` odcinane przed wysyłką do cudzego serwera | `modules/tools/ExternalMcpManager.ts`, `modules/tools/MCPClient.ts` |
| Timeout per wywołanie 60 s, twardy sufit 180 s | `modules/tools/server_timeout.ts:9-10` |
| Statusy połączeń tylko w pamięci (`stripRuntimeFields`) | `modules/tools/ExternalMcpManager.ts`, `modules/tools/SettingsContent.ts` |
| Kill-switch per serwer i opt-in per agent (`mcp_servers[]`) | `modules/tools/SettingsContent.ts`, `modules/agents/Agent.ts`, `modules/agents/AgentLoader.ts` |
| Głębokość delegacji 1 (sufit 3), znacznik z runtime, nie od modelu | `config/limits.ts:89`, `modules/tools/DelegateTool.ts`, `modules/sub-agents/SubAgentRunner.ts` (`_invocationDelegationDepth`) |
| Równoległość delegacji 5 | `config/limits.ts:95` |
| Zakres suba = PRZECIĘCIE z rodzicem, tnie też wyniki `search`/`list`, fail-closed mimo `admin_access` rodzica | `core/security/AccessGuard.ts`, `core/security/sub_scope_guard.test.ts`, `modules/sub-agents/SubAgentRunner.ts` (`scopeFolders`) |
| Poczta: 20 wiadomości / 10 min per para, licznik odbić 3, duchy niewidzialne | `config/limits.ts:100`, `modules/tools/KomunikatorTools.ts:166-168` (`HOP_LIMIT`), `modules/komunikator/visibility.ts` |
| Agent nigdy nie wpisuje bloku kodu do artefaktu (`code_forbidden`) | `modules/artifacts/artifactParser.ts` |
| `guidance_mode:false` + puste `focus_folders` = zero dostępu do zwykłego vaulta | `modules/agents/accessPolicy.ts`, `core/security/vaultGroups.ts` |
| Autonomia (`yolo`/`edge`/`all`) tylko zdejmuje pytania, nie daje uprawnień | `core/security/autonomy.ts:38-47` |
| Nieznana akcja i nieznane narzędzie = fail closed (RED) | `core/security/PermissionSystem.ts`, `core/security/autonomy.ts` |
| `todo` to jedyny wyjątek od domyślnie wyłączonej grupy `artifacts` | `modules/agents/toolAxis.ts:63` (`DEFAULT_ENABLED_EXCEPTIONS`) |

### Warstwa B - OWASP Agentic ASI01-ASI10 zmapowane na plugin

| ASI | Gdzie u nas (plik) | Co sprawdzić |
|---|---|---|
| ASI01 Przejęcie celu | `modules/prompts/PromptBuilder.ts`, `modules/sub-agents/framePrompt.ts`, `modules/agent-loop/AgentLoop.ts` | czy treść notatki, strony albo odpowiedzi MCP wchodzi do kanału instrukcji bez ogrodzenia |
| ASI02 Nadużycie narzędzia | `modules/tools/ToolRegistry.ts`, `modules/tools/*Tool.ts`, `core/security/PermissionSystem.ts` | czy argumenty są walidowane w handlerze narzędzia, a nie tylko opisane w prompcie |
| ASI03 Tożsamość i uprawnienia | `core/security/AccessGuard.ts`, `modules/agents/accessPolicy.ts`, `modules/sub-agents/SubAgentRunner.ts` | czy sub albo MCP dziedziczy więcej niż potrzebuje; czy tożsamość pochodzi z runtime |
| ASI04 Łańcuch dostaw agentowy | `modules/tools/ExternalMcpManager.ts`, `modules/tools/claudeConfigImport.ts`, `modules/tools/mcpServerPresets.ts`, `esbuild.js` | co plugin przyjmuje z cudzej konfiguracji bez pytania; czy sekret wchodzi do bundla |
| ASI05 Niespodziewane wykonanie kodu | `modules/artifacts/artifactParser.ts`, `core/ui/safeHtml.ts` (dawny `core/PluginView.ts`), `grep -rn "new Function\|eval(" core/ modules/ src/` | czy da się dowieźć wykonywalny kod do vaulta albo do renderera |
| ASI06 Zatrucie pamięci i kontekstu | `modules/memory/`, `modules/embedding/orama_engine.ts`, `modules/prompts/PromptBuilder.ts` | czy zapis pamięci i retrieval oddzielają dane od instrukcji i respektują zakres agenta |
| ASI07 Komunikacja między agentami | `modules/komunikator/KomunikatorManager.ts`, `modules/tools/KomunikatorTools.ts` | czy nadawcę ustala runtime, a nie argument modelu; czy limity są w narzędziu |
| ASI08 Kaskada awarii | `config/limits.ts`, `modules/sub-agents/SubTaskRegistry.ts`, `modules/agent-loop/AgentLoop.ts` | czy każdy limit ma miejsce egzekucji i czy awaria nie zostawia żywego biegu |
| ASI09 Nadużycie zaufania człowieka | `modules/chat/chat/chat_messages.ts`, `modules/shell/ApprovalModal.ts` | czy user widzi prawdziwe argumenty akcji, którą zatwierdza |
| ASI10 Zbuntowany agent | `modules/agents/AgentLoader.ts`, `modules/skills/SkillLoader.ts`, `modules/sub-agents/SubAgentLoader.ts` | czy profil, skill albo sub wczytany z pliku vaulta może podnieść sobie uprawnienia |

### Warstwa C - klasy Cloudflare AI/LLM przełożone na plugin

Wstrzyknięcie pośrednie: treść notatki, wynik `web_read`, odpowiedź serwera MCP, nazwa pliku,
poczta komunikatora. Zlewy: ścieżka w vaultcie, URL w `web_read`, cel delegacji, zapis pamięci,
argumenty narzędzia MCP. Możliwości agenta, których user nie ma wprost. Składanie promptu
(delimitery, role). Nadmierna autonomia (tryby, whitelisty). Pętle bez sufitu (iteracje,
łańcuch auto-tur). Dziedziczenie zaufania sub/MCP (`scopeFolders`, głębokość, klucze).
Render wyjścia (obrazek albo link w markdownie jako kanał, `innerHTML`). Sekrety w kontekście
i logach (`SensitiveDataGuard`, `TraceLog`). Przeciek między sesjami i tabami.

## Kawałki startowe

| Nazwa | Zakres | Poprzeczka kawałka |
|---|---|---|
| Wejście niezaufane | `modules/tools/WebReadTool.ts`, `WebSearchTool.ts`, `ReadTool.ts`, `SearchTool.ts`, `modules/web/` | treść z sieci i z vaulta nie staje się instrukcją ani nie otwiera nowego adresu |
| MCP zewnętrzny | `modules/tools/ExternalMcpManager.ts`, `MCPClient.ts`, `server_timeout.ts`, `mcpServerPresets.ts`, `claudeConfigImport.ts` | odpowiedź serwera to dane; RED i approval per narzędzie nie do obejścia |
| Delegacja i suby | `modules/tools/DelegateTool.ts`, `AgentDelegateTool.ts`, `modules/sub-agents/` | przecięcie zakresu i głębokość z runtime; sub nie widzi więcej niż rodzic |
| Poczta agentów | `modules/tools/KomunikatorTools.ts`, `modules/komunikator/` | nadawca z runtime, limity w narzędziu, duchy niewidzialne |
| Ścieżki w vaultcie | `core/security/keySanitizer.ts`, `AccessGuard.ts`, `core/utils/vaultFs.ts`, `modules/tools/vault_path_validator.ts` | żadna ścieżka od modelu nie wychodzi poza vault ani do plików chronionych |
| Uprawnienia i autonomia | `core/security/PermissionSystem.ts`, `autonomy.ts`, `ApprovalManager.ts`, `modules/agents/accessPolicy.ts`, `toolAxis.ts` | nieznane fail-closed; autonomia nie dodaje uprawnień |
| Sekrety | `core/security/SecretsStorage.ts`, `SensitiveDataGuard.ts`, `core/utils/Logger.ts`, `TraceLog.ts`, `LogFileSink.ts`, `esbuild.js` | klucz nie wychodzi do loga, trace, kontekstu modelu ani do `dist/main.js` |
| Składanie promptu | `modules/prompts/PromptBuilder.ts`, `modules/sub-agents/framePrompt.ts`, `modules/agent-loop/toolTranscriptSanitizer.ts` | dane są ogrodzone i nie udają roli systemowej ani wyniku narzędzia |
| Render wyjścia | `modules/chat/chat/chat_messages.ts`, `chat_ui.ts`, `core/ui/safeHtml.ts` (dawny `core/PluginView.ts`), `modules/artifacts/artifactParser.ts` | wyjście modelu nie wykonuje się i nie pobiera samo zdalnych zasobów |
| Pamięć i retrieval | `modules/memory/`, `modules/embedding/orama_engine.ts`, `VaultIndexer.ts` | zapis pamięci nie jest trwałym wstrzyknięciem; retrieval respektuje zakres agenta |
| Pętle i budżety | `config/limits.ts`, `modules/agent-loop/AgentLoop.ts`, `modules/sub-agents/SubTaskRegistry.ts`, `modules/chat/chat/chat_streaming.ts` | każda pętla ma sufit egzekwowany w kodzie, także łańcuch auto-tur |

## Checklista szukacza

1. Zlewy ścieżek: `grep -rn "validateVaultPath\|sanitizePath" modules/tools/*.ts` - czy KAŻDE narzędzie z argumentem `path` waliduje przed adapterem. Szukaj wywołań `vault_adapter_io.ts` z gołym argumentem.
2. Zlew URL: przeczytaj `modules/tools/WebReadTool.ts:88-95` i `modules/web/urlRegistry.ts:78`. Potem ustal, KTO wpisuje adres do rejestru: `grep -rn "urlRegistry\|rememberUrl" modules/ --include=*.ts | grep -v test`. Wpis pochodzący z wyniku narzędzia albo z auto-tury omija bramkę.
3. Tożsamość w delegacji: `grep -n "_invocation" modules/tools/DelegateTool.ts modules/tools/AgentDelegateTool.ts modules/sub-agents/SubAgentRunner.ts` - czy głębokość i nazwa agenta pochodzą z runtime, czy da się je podać w argumentach.
4. Przecięcie zakresu suba: przeczytaj `SubAgentRunner.ts` wokół `scopeFolders` i porównaj OBIE gałęzie wykonania narzędzia (przez `MCPClient` oraz fallback `_executeTool`) - czy obie nakładają zakres.
5. Poczta: `modules/tools/KomunikatorTools.ts` - czy nadawca bierze się z `ctx.meName`, a nie z argumentu; czy `HOP_LIMIT` i rate-limit da się ominąć drugą drogą (`grep -rn "sendMessage(" modules/ --include=*.ts`).
6. Fail closed: `core/security/PermissionSystem.ts` i `core/security/autonomy.ts:103` - znajdź gałąź domyślną dla nieznanej akcji i nieznanego narzędzia; ma być odmowa albo RED.
7. Autonomia: `grep -rn "yolo" core/ modules/ --include=*.ts | grep -v test` - czy `yolo` gdziekolwiek WŁĄCZA narzędzie albo poszerza zakres, zamiast tylko pominąć pytanie.
8. Sekret w kontekście: `grep -rn "apiKey\|api_key\|Authorization" modules/prompts/ modules/agent-loop/ modules/chat/ --include=*.ts | grep -v test` - czy klucz albo nagłówek trafia do promptu, transkryptu narzędzi lub treści błędu widzianej przez model.
9. Sekret w logach: `core/utils/Logger.ts` plus `core/security/SensitiveDataGuard.ts` - `core/SECURITY.md` obiecuje maskowanie w `warn()` i `error()`; sprawdź `info`/`debug`, a potem `core/utils/TraceLog.ts` i `LogFileSink.ts` (co ląduje w `.pkm-assistant/logs/trace.log`).
10. Sekret w bundlu: `grep -n "DEFAULT_OPEN_ROUTER_API_KEY" esbuild.js` (linia 145, `define` + fallback `|| ''`), potem `grep -c "sk-or-\|sk-ant-\|AIza\|ghp_" dist/main.js`. Jeśli `.env` ma wartość, sprawdź, czy wchodzi do artefaktu.
11. Render: `grep -rn "innerHTML\|outerHTML\|insertAdjacentHTML\|createContextualFragment" core/ modules/ src/ --include=*.ts | grep -v test`, potem przeczytaj `core/ui/safeHtml.ts` (dawny `core/PluginView.ts:25-45`) - czy czyszczenie obejmuje `script`, `on*`, `javascript:` i zdalne `src`. Sprawdzone 2026-09-06 na realnej implementacji (325 linii, własny tolerancyjny parser HTML, nie regex na całości): `fragmentFromHtml` kasuje w całości znaczniki `script`/`style`/`iframe`/`frame`/`frameset`/`object`/`embed`/`applet`/`base`/`meta`/`link` (`FORBIDDEN_TAGS`), zdejmuje KAŻDY atrybut zaczynający się na `on` i blokuje schematy `javascript:`/`vbscript:`/`data:text/html` na atrybutach adresowych (`href`/`src`/`srcset`/`action`/`formaction`/`poster`/`data`/`xlink:href`) oraz na `style`, po dekodowaniu encji liczbowych i usunięciu znaków sterujących (łapie też `java\tscript:` i `&#106;avascript:`). NIE blokuje `http(s)://` w `src` — to filtr SCHEMATU wykonującego kod, nie filtr pochodzenia zasobu, więc zdalny obrazek/zasób nadal się załaduje.
12. Kanał obrazkowy: `grep -rn "MarkdownRenderer" modules/chat/ --include=*.ts` - ustal, czym renderowana jest odpowiedź modelu i czy zdalne `![](http...)` jest pobierane. Jeśli tego nie widać w repo, to `niezweryfikowalne`, nie finding.
13. Artefakty: `modules/artifacts/artifactParser.ts` - `code_forbidden` blokuje fence w `set_section`/`add_item`; sprawdź inne drogi zapisu: `grep -rn "importInstance\|writeBody\|applyPatch" modules/artifacts/ --include=*.ts`.
14. Pamięć: `modules/memory/MemoryAccessGuard.ts` plus `modules/tools/MemorySaveTool.ts` - czy agent zapisze poza swój katalog albo do cudzej pamięci; czy zapisany tekst wraca do promptu bez ogrodzenia (`modules/memory/RetrievalEngine.ts`).
15. Retrieval: `modules/embedding/orama_engine.ts` i `VaultIndexer.ts` - czy filtr zakresu agenta jest w SAMYM zapytaniu, czy dopiero na wynikach.
16. Składanie promptu: `modules/prompts/PromptBuilder.ts` i `modules/sub-agents/framePrompt.ts` - czy treść notatki i wynik narzędzia są ogrodzone i czy nie da się w nich podrobić nagłówka roli.
17. Transkrypt: `modules/agent-loop/toolTranscriptSanitizer.ts` - co czyści, a czego nie; czy wynik narzędzia może udawać wiadomość systemową.
18. Sufity: dla KAŻDEGO limitu z `config/limits.ts` znajdź miejsce egzekucji: `grep -rn "chat_max_iterations\|max_delegation_depth\|max_parallel_delegations\|kom_send_rate_max\|subagent_result_max_chars" modules/ core/ --include=*.ts | grep -v test`. Limit bez egzekucji to znalezisko.
19. Auto-tury: `grep -rn "injectedText\|_deliverSubTaskResult" modules/ --include=*.ts` - czy istnieje licznik tur odpalonych z automatu z rzędu (znane 08-16).
20. Cykl życia: `modules/sub-agents/SubTaskRegistry.ts:489` (`dispose`) - czy uchwyty abortu są WOŁANE, czy tylko czyszczone; bieg przeżywający `onunload` przekracza granicę sesji (znane 08-16).
21. Import cudzej konfiguracji: `modules/tools/claudeConfigImport.ts` i `mcpServerPresets.ts` - co plugin bierze z pliku (komenda, `env`, nagłówki) i czy ląduje w ustawieniach bez zgody.
22. Multi-tab: `grep -rn "cache" modules/models/modelResolver.ts` - czy dwie zakładki dzielą instancję modelu i czy stan streamu jednej trafia do drugiej (znane 08-11).
23. Trzy pytania przed zgłoszeniem (Cloudflare): czy wejście jest naprawdę pod kontrolą atakującego; czy zlew jest osiągalny MIMO bramek wyżej; jaki jest promień rażenia. Plus czwarte: czy `SECURITY.md` albo `CLAUDE.md` modułu opisuje to jako zamierzone.

## Czego NIE flagować

- Klucze plaintext w `.pkm-assistant/settings.json` - udokumentowane w `SECURITY.md` i w ostrzeżeniu w ustawieniach (`core/i18n/pl.ts:1402`); szyfrowanie jest opt-in i to świadoma decyzja.
- `nodeIntegration` i brak sandboxa renderera - ustawia to Obsidian, nie my.
- "Model da się wstrzyknąć" bez przekroczonej granicy. Nazwij granicę albo nie ma znaleziska.
- Brak warstwy B, gdy warstwa A broni - to hardening note do `co_dziala_dobrze`, nie finding, i nie podbijaj severity.
- Złośliwy serwer MCP zainstalowany świadomie przez usera - trust model z sekcji "Co jest NA GŁOWIE USERA". Findingiem jest wyłącznie złamana obietnica z warstwy A.
- Serwer `stdio` robiący cokolwiek w systemie - z definicji poza kontrolą pluginu. Sprawdzasz tylko, CO wychodzi z pluginu do niego i czy approval działa.
- Wartości ustawień, którymi steruje user (limity, whitelisty, tryb autonomii) - to konfiguracja operatora, nie wejście atakującego.
- Guardrail w prompcie ("nie ujawniaj systemowego") - NIE liczy się jako zabezpieczenie, ale jego brak też nie jest findingiem.
- Pliki testowe, mocki i fixtury harnessa, kod zakomentowany.
- Rozjazd nazw plików w dokumentach (`core/SECURITY.md` pisze `keySanitizer.js`, w repo jest `keySanitizer.ts`) - to karta `docs`.

## Narzędzia i komendy

```
npx ava --verbose core/security/keySanitizer.test.ts        # i pozostałe testy strażników
npx ava --verbose core/security/sub_scope_guard.test.ts
npx ava --verbose core/security/security_hardening.test.ts core/security/security_integration.test.ts
npm run harness:scenarios                                    # scenariusze-łamacze offline
grep -c "sk-or-\|sk-ant-\|AIza\|ghp_" dist/main.js           # sekret w bundlu
git log --oneline -20 -- core/security modules/tools         # co ostatnio ruszało bramki
git worktree add <SCRATCH>/wt-sec HEAD                       # reprodukcja wymagająca mutacji
git worktree remove --force <SCRATCH>/wt-sec
```

`npm test` w całości potrafi paść poza laptopem Kuby (hook `tsx` w worker threadach, znane 08-12) -
celuj w pojedynczy plik przez `npx ava`.

## Severity w tej domenie

- **CRITICAL** - eksfiltracja treści vaulta albo sekretu BEZ akcji usera, z samej treści notatki,
  strony lub odpowiedzi MCP. Przykład: notatka wciągnięta do kontekstu powoduje pobranie adresu
  z doklejoną treścią innej notatki.
- **HIGH** - pokonana jawna granica (whitelista `isUrlKnown`, No-Go, zakres suba, zgoda na
  narzędzie MCP, `admin_access`) albo eksfiltracja po jednej niewinnej akcji usera.
  Przykład: sub czyta plik spoza swojego `scopeFolders`.
- **MEDIUM** - wymaga nietypowej konfiguracji (`yolo`, wyłączeni strażnicy) albo skutek ograniczony
  do własnej sesji z kosztem operatora. Przykład: pętla auto-tur pali tokeny Kuby.
- **LOW** - ujawnienie danych niesekretnych. Przykład: pełna ścieżka vaulta w komunikacie błędu
  oddanym modelowi.
- **INFO** - potwierdzona obserwacja bez samodzielnego skutku, budulec pod inne znalezisko.

## Dowód wymagany

- Linia, KTÓRA UFA: bramka albo zlew, `plik:linia` plus dosłowny cytat do 3 linii.
- Ścieżka skażenia: źródło (kto pisze wejście) → kolejne `plik:linia` → zlew. Bez ścieżki nie ma znaleziska.
- Nazwana granica w polu `granica`, na przykład "zakres folderów suba", "whitelista adresów
  `web_read`", "zgoda usera na narzędzie MCP", "granica sesji po `onunload`".
- Kto jest atakującym i czyja sesja wykonuje ładunek.
- Jeśli skutek zależy od zachowania Obsidiana lub renderera, którego nie widać w repo:
  `pewnosc: niezweryfikowalne`, nie finding.

## Znane

Nie odkrywać ponownie. Do raportu wchodzi status: nadal / naprawione / nie sprawdzono.

- 2026-08-17 - raport suba dostarczony jako auto-tura nadaje adresom prowieniencję "user to wpisał"
  i otwiera kanał obok bramki `isUrlKnown` (`WebReadTool.ts:88`). Sprawdzić, czy nadal.
- 2026-08-17 - awaryjna ścieżka `SubAgentRunner._executeTool` przenosi głębokość delegacji,
  ale nie `scopeFolders`; bariera folderów żyje tylko w gałęzi przez `MCPClient`. Sprawdzić, czy nadal.
- 2026-08-16 - sub odpalony w tle przeżywa `onunload`, bo `SubTaskRegistry.dispose()` porzuca
  uchwyty abortu (`_aborts.clear()` bez wywołania). Sprawdzić, czy nadal.
- 2026-08-16 - łańcuch auto-tur po subach nie ma sufitu: nic nie liczy, ile razy z rzędu turę
  odpalił automat zamiast człowieka. Sprawdzić, czy nadal.
- 2026-08-19 - sufit `subagent_result_max_chars` w turze czatu pilnuje drogi, która niczego długiego
  nie wozi (`chat_streaming.ts:442-444`). Sprawdzić, czy nadal.
- 2026-08-18 - ten sam sufit 60k ma pokrytą tylko jedną z dwóch dróg powrotu (druga to
  `perToolOverride` w `chat_streaming.ts:443-444`). Test to karta `testy`; tu sprawdź samą drogę.
- 2026-08-11 - multi-tab dzieli cache'owaną instancję modelu głównego, `stream()` nieodporny.
  Sprawdzić, czy nadal.
- `SECURITY.md` "Known Issues" 1-3 (sandbox MCP, path traversal w narzędziach serwerów, brak
  normalizacji `..` w `AccessGuard`) są opisane jako ROZWIĄZANE. Sprawdzić, czy nadal rozwiązane,
  zamiast odkrywać je od nowa.

## Źródła

- Cloudflare `security-audit-skill` (MIT) - https://github.com/cloudflare/security-audit-skill -
  `AI-AND-LLM.md` (klasy i reguły walidacji), `HUNTING.md`, `SKILL.md` (Core Principles, Anti-Patterns).
- agamm/claude-code-owasp (MIT) - https://github.com/agamm/claude-code-owasp - OWASP LLM Top 10 2025,
  OWASP Agentic Top 10 2026 (ASI01-ASI10), sekcja "Before Reporting a Finding".
- getsentry/skills (Apache-2.0) - https://github.com/getsentry/skills - Confidence Levels, Do Not Flag.
- OWASP GenAI Security Project - https://genai.owasp.org/ - źródło obu list.
- Repo: `SECURITY.md`, `core/SECURITY.md`, `modules/tools/CLAUDE.md`.
- Vault: `40_Pracownie/Dev Desktop/Projekty/PKM Assistant/Katalog_Audytow.md` (Risk register).
