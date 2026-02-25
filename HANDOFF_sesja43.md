# HANDOFF — Sesja 43: Tryby Pracy Chatu

> Skopiuj ten plik + STATUS.md + PLAN_v2.md do nowego czatu z AI.
> Data: 2026-02-25

---

## Kontekst

JDHole — non-programista, vibe-coding z AI, komunikacja PO POLSKU.
Plugin PKM Assistant (Obsek) — Obsidian, fork SC v4.1.7, JavaScript ES Modules.
Kod: `c:\Users\jdziu\Desktop\Obsek\Obsek Plugin\`

## Co zrobiono w sesji 42

Sesja 42 zajela sie pelnym systemem uprawnien i dostepu agentow:
- Focus folders jako TWARDE blokowanie (vault_read/list/search/write/delete odmawiaja poza focusFolders)
- Minion/Master dziedzicza ograniczenia folderowe agenta
- Sensowny feedback przy odmowie usera (agent wie DLACZEGO odmowiono, nie powtarza)
- Czytelniejsze approval dialogi (po polsku, ludzki opis, podglad tresci)
- Panel per-folder w UI (wizualne drzewko/lista z read/write/none zamiast textarea)
- Agora vault map integracja z permissions (mapa = zrodlo prawdy o strukturze)

Przeczytaj STATUS.md i PLAN_v2.md zeby zobaczyc aktualny stan po sesji 42.

## Zadanie na sesje 43: Tryby Pracy Chatu

User chce system trybow pracy calego chatu zmienialnych jednym kliknieciem. Pomysl:

**Tryby** (wstepna koncepcja usera):
- Agent WIE jaki ma tryb pracy — wiec wie czy planujemy, czy pracujemy, czy debugujemy
- Tryb wplywa na zachowanie agenta (prompt), dostepne narzedzia, moze temperature
- Przelaczanie jednym kliknieciem z UI chatu

**Kontekst z sesji 42:**
- W prawym toolbarze chatu sa 3 ikonki: artefakty, skille toggle, **tryby (placeholder)** — ikona trybow juz istnieje ale nic nie robi
- Extended thinking (reasoning_content) jest powiazane — to moze byc jeden z trybow
- PromptBuilder.js jest modularny — latwo dodac sekcje "tryb pracy" do promptu
- TOOL_GROUPS (7 grup) + enabledTools[] juz istnieja — tryb moze wlaczac/wylaczac grupy

**Pytania do przegadania z userem:**
- Jakie konkretne tryby? (planowanie, praca, debug, kreatywny, rozmowa?)
- Czy tryb zmienia temperature modelu?
- Czy tryb zmienia dostepne narzedzia? (np. tryb rozmowy wylacza vault_write)
- Czy tryby sa per-agent czy globalne?
- Czy agent moze sam zaproponowac zmiane trybu?
- Jak to sie ma do extended thinking — czy "deep thinking" to osobny tryb?

**Pliki do przeczytania:**
- `src/views/chat_view.js` — toolbar z ikonka trybow (placeholder)
- `src/core/PromptBuilder.js` — budowanie promptu (dodac sekcje trybu)
- `src/core/AgentManager.js` — kontekst agenta
- `src/mcp/MCPClient.js` — TOOL_GROUPS, filtrowanie narzedzi
- `src/agents/Agent.js` — konfiguracja agenta

To jest temat do PELNEGO przegadania z userem — nie zaczynaj kodowac bez jego wizji.

---

*Wygenerowany po sesji 42*
