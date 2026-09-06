---
name: audyt-codex
description: Audyt pluginu PKM Assistant metodą gauntlet W DRUGIEJ WERSJI - szukacze i obalacze jadą jako workerzy Codex CLI na subie ChatGPT Kuby zamiast subagentów Anthropic. Użyj zamiast /audyt, gdy Kuba chce oszczędzać tokeny Anthropic (od 2026-08-24 to domyślna preferencja na biegi audytowe). Nie do naprawiania kodu.
---

# Audyt gauntlet v2 - silnik Codex

To jest `/audyt` z podmienionym silnikiem wykonania. **Obowiązuje CAŁY skill
`/audyt`** (`.claude/skills/audyt/SKILL.md`): żelazne prawo, karty, sufity,
role, fazy, szablony, ślad po biegu, red flags. Ten plik opisuje WYŁĄCZNIE
różnice. Przeczytaj najpierw tamten, potem wróć tu.

## Różnica jedna: kto wykonuje fazy 2-4

Zamiast Workflow z subagentami Anthropic (opus/sonnet), szukacze i obalacze
to procesy **`codex exec`** na subie ChatGPT Kuby:

- świeży kontekst per worker (każdy `codex exec` to nowa sesja, `--ephemeral`),
- sandbox **read-only** (`-s read-only`) - worker fizycznie nie może zmienić
  repo, czyli żelazne prawo nr 1 egzekwuje system operacyjny, nie prompt,
- kontrakt wyjścia wymuszony `--output-schema` (schematy w `schemas/`),
- ostatnia wiadomość do pliku przez `-o` - żadnego parsowania transkryptu.

Pętlę gauntletu (rundy, dedup, agregacja werdyktów, zbieżność) prowadzi
deterministycznie `runner.cjs` - port `workflow.js` z tą samą semantyką
(pady nie są werdyktami, wszyscy padli = przerwanie nie sucha runda, spory
zostają dla lidera).

## Jak lider odpala bieg

Fazy 1 (recon), 5 (synteza) i 6 (weryfikacja) - identycznie jak w `/audyt`
(recon tanim subagentem Anthropic to grosze; synteza może iść subagentem
albo ręcznie przez lidera - decyzja per bieg wg budżetu).

Fazy 2-4:

1. Zbuduj `args.json` DOKŁADNIE jak dla workflow (te same pola: repo,
   kartaPath, szablonSzukacz, szablonObalacz, poprzeczka, znane, nieFlagowac,
   kawalki, maxRund, maxSuche, obalaczyHigh). Pole `modele` jest ignorowane
   (model wybiera config Codexa); opcjonalnie dodaj:
   `"codex": { "concurrency": 4, "timeoutMin": 20, "model": null }`.
2. Sprawdź logowanie: `codex login status` → `Logged in using ChatGPT`.
3. Odpal w tle (Bash, run_in_background, timeout 600000):
   `node .claude/skills/audyt-codex/runner.cjs audyt/biegi/{id}/surowe/args.json`
4. Postęp: runner loguje rundy na stdout i dopisuje
   `audyt/biegi/{id}/surowe/codex/journal.jsonl` (jeden wiersz na workera).
   Wynik końcowy: `audyt/biegi/{id}/surowe/codex/wynik.json` - ten sam kształt
   co return workflow (znaleziska/kawalki/rundy/powod_stopu/co_dziala_dobrze/agentow).
5. Pad sesji w połowie biegu → ten sam runner z flagą `--wznow`: skończone
   wywołania wracają z journala, reszta jedzie na żywo.
6. `--dry` wypisuje plan pierwszej rundy (komendy, prompty skrócone) bez
   wydawania ani jednego tokena - do smoke-testu mechaniki.

Dalej (synteza, findings.json, walidator, RAPORT.md, ślad) - bez zmian,
`wynik.json` wchodzi tam, gdzie w `/audyt` wchodził wynik workflow.

## Ograniczenia względem v1 (świadome)

- **Workerzy nie mają worktree** - sandbox read-only wyklucza reprodukcję
  wymagającą zapisu. Worker zapisuje w `sprawdzone[]`, że reprodukcja wymaga
  zapisu, a wykonuje ją LIDER po biegu (przed syntezą). W kartach deps/docs/
  dead-code to margines; w kartach testy/bledy częstsze - tam rozważ v1.
- **Model per rola nie istnieje** - drabiny opus/sonnet nie ma, każdy worker
  jedzie domyślnym modelem Codexa. Drugi obalacz na HIGH nadal ma sens
  (świeży kontekst = niezależna próba obalenia).
- **Koszt idzie z limitów suba ChatGPT** - to jest cel tej wersji, ale limit
  tygodniowy tam też istnieje; przy dużym biegu (12 kawałków, pełne sufity)
  obserwuj, czy workerzy nie zaczynają padać na limicie (runner odróżnia pad
  od werdyktu, więc bieg się nie zafałszuje - ale może się przerwać).

## Składnia codex (zweryfikowana 2026-08-24, codex-cli 0.149.1)

- `codex exec -s read-only --ephemeral --skip-git-repo-check -C <repo>
  --output-schema <schema.json> -o <out.json> -` (prompt na stdin!)
- `--full-auto` już nie istnieje; `-s` gryzie się z `--approve-for-me`.
- Exit 0 nie gwarantuje poprawnego JSON-a - runner waliduje pola wymagane
  i robi jeden retry, potem liczy pad.
- **Schematy w `schemas/`: OpenAI structured outputs wymaga, żeby `required`
  wymieniało KAŻDY klucz z `properties`** (pole opcjonalne = wymagany string
  z opisem "pusty string, jeśli nie dotyczy"). Brak jednego klucza = 400
  `invalid_json_schema` i pad wszystkich workerów PRZED generacją (wtopa
  2026-08-25, bieg docs - zero kosztów, ale bieg wstaje dopiero po fixie).
- `waliduj.cjs` przyjmuje `srodowisko.wykonanie: "codex-runner"` (od 2026-08-25).
