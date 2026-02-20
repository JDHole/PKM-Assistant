# 🚀 Vibe-Coding Masterclass 2026

> **Kompendium wiedzy o nowoczesnym programowaniu z AI**  
> Opracowane: 22.01.2026  
> Źródła: Addy Osmani, Anthropic, alexop.dev, antigravity.codes, OpenCode

---

## 📖 Spis Treści

1. [Filozofia Vibe-Codingu](#1-filozofia-vibe-codingu)
2. [Context Stacking - Przed Kodowaniem](#2-context-stacking---przed-kodowaniem)
3. [CLAUDE.md / GEMINI.md - Pamięć Projektu](#3-claudemd--geminimd---pamięć-projektu)
4. [Skills - Automatyczne Umiejętności](#4-skills---automatyczne-umiejętności)
5. [Architektura Subagentów](#5-architektura-subagentów)
6. [Multi-Model Workflow](#6-multi-model-workflow)
7. [MCP - Model Context Protocol](#7-mcp---model-context-protocol)
8. [Optymalizacja Tokenów](#8-optymalizacja-tokenów)
9. [Workflow Addy Osmani 2026](#9-workflow-addy-osmani-2026)
10. [Antigravity IDE - Specyfika](#10-antigravity-ide---specyfika)
11. [OpenCode CLI](#11-opencode-cli)
12. [Praktyczne Komendy i Skróty](#12-praktyczne-komendy-i-skróty)

---

## 1. Filozofia Vibe-Codingu

### Czym jest Vibe-Coding?

> "Vibe-coding to nie brak umiejętności — to umiejętność zarządzania nieskończoną mocą obliczeniową przy pomocy czystej intencji."

**Kluczowa zmiana paradygmatu:**
- ❌ Stary model: "AI pisze kod za mnie"
- ✅ Nowy model: "AI jest potężnym pair programmerem, który wymaga jasnych instrukcji, kontekstu i nadzoru"

### Zasada Simona Willisona
> "Traktuj LLM pair programmera jako **nadmiernie pewnego siebie i podatnego na błędy**. Pisze kod z pełnym przekonaniem — w tym bugi i bzdury — i nie powie Ci, że coś jest źle, dopóki sam tego nie wyłapiesz."

### AI Amplifikuje Twoje Umiejętności
- Jeśli masz solidne fundamenty → AI zwielokrotni Twoją produktywność
- Jeśli brakuje Ci podstaw → AI może tylko zwielokrotnić zamieszanie
- Wszystko co czyni kogoś senior developerem (projektowanie systemów, zarządzanie złożonością) teraz daje najlepsze wyniki z AI

---

## 2. Context Stacking - Przed Kodowaniem

### Warstwowanie Kontekstu (Hierarchia)

```
┌─────────────────────────────────────────┐
│  1. SYSTEM LEVEL                        │  ← Reguły bezpieczeństwa Antigravity
├─────────────────────────────────────────┤
│  2. GLOBAL LEVEL                        │  ← Twoje osobiste preferencje
│     (~/.config/antigravity/rules.md)    │     "zawsze po polsku", "prefer TypeScript"
├─────────────────────────────────────────┤
│  3. WORKSPACE LEVEL                     │  ← Standardy projektu (.clauderules)
│     (CLAUDE.md w root projektu)         │     Tech stack, konwencje, komendy
├─────────────────────────────────────────┤
│  4. LOCAL CONTEXT                       │  ← Folder-specific rules
│     (CLAUDE.md w podfolderze)           │     np. src/agents/CLAUDE.md
└─────────────────────────────────────────┘
```

### Przygotowanie Przed Kodowaniem

**Zanim napiszesz pierwszy prompt:**

1. **Stwórz spec.md** - opisz co budujesz:
   - Wymagania
   - Architektura
   - Modele danych
   - Strategia testowania

2. **Wygeneruj plan.md** - rozbij na kroki:
   - Logiczne, małe zadania
   - Milestones
   - Kolejność implementacji

3. **Przygotuj kontekst**:
   - CLAUDE.md z konwencjami
   - Przykłady kodu z projektu
   - Dokumentacja używanych bibliotek

> 💡 **Tip Addy Osmani:** "To jak robienie waterfall w 15 minut — szybka strukturalna faza planowania, która sprawia, że późniejsze kodowanie idzie gładko."

---

## 3. CLAUDE.md / GEMINI.md - Pamięć Projektu

### Co to jest?

Plik w głównym folderze projektu (lub podfolderach), który AI czyta automatycznie przy każdej sesji.

### Przykładowa struktura:

```markdown
# CLAUDE.md - Obsek Plugin

## Tech Stack
- TypeScript + esbuild
- Obsidian Plugin API
- Anthropic/OpenAI SDK dla providerów AI
- MCP SDK dla integracji narzędzi

## Konwencje Kodu
- Używamy ES modules
- Preferuj async/await nad callbacks
- Nazewnictwo: camelCase dla zmiennych, PascalCase dla klas
- Komentarze JSDoc dla publicznych funkcji

## Komendy
- `npm run dev` - development build z watch
- `npm run build` - production build
- `npm run lint` - ESLint check

## Architektura Agentów
- Główni agenci: Jaskier, Iris, Dexter, Ezra
- Miniony: mikro-zadania przez embedded models (0.5-1.5B)
- Model tier: minion < agent < oracle

## Czego NIE robić
- Nie używaj `any` w TypeScript
- Nie commituj API keys
- Nie modyfikuj plików w .obsidian/

## Kontekst Projektu
Plugin do Obsidiana z systemem AI agentów. MVP gotowe.
Aktualnie pracujemy nad hierarchią agentów i minionami.
```

### Hierarchiczne Ładowanie

Claude/Gemini czyta pliki CLAUDE.md/GEMINI.md hierarchicznie:
- Najpierw z root projektu
- Potem z aktualnego folderu
- Kontekst się kumuluje

---

## 4. Skills - Automatyczne Umiejętności

### Co to są Skills?

Skills to **modułowe pakiety instrukcji** które AI aktywuje automatycznie, gdy opis zadania pasuje do opisu skilla.

### Struktura Skilla

```
.claude/skills/
├── testing-expert/
│   ├── SKILL.md          # Główne instrukcje
│   ├── examples/         # Przykłady użycia
│   └── templates/        # Szablony kodu
├── frontend-design/
│   └── SKILL.md
└── deploy-verification/
    └── SKILL.md
```

### Przykład SKILL.md

```markdown
---
name: Testing Expert
description: Generowanie testów jednostkowych i integracyjnych
triggers:
  - "napisz testy"
  - "test coverage"
  - "unit test"
---

# Testing Expert Skill

## Kiedy się aktywuję
Gdy użytkownik prosi o testy lub gdy tworzony jest nowy komponent.

## Moje zasady
1. Zawsze używam Jest + Testing Library
2. Struktura: Arrange → Act → Assert
3. Każdy test ma opisową nazwę po polsku
4. Mockuję zewnętrzne zależności

## Format testu
[przykład kodu testu]
```

### Dlaczego Skills > Powtarzane Prompty

| Powtarzane Prompty | Skills |
|--------------------|--------|
| Kruche, łatwo zapomnieć | Trwałe, zawsze dostępne |
| Ręczne wklejanie | Automatyczna aktywacja |
| Brak wersjonowania | Git-tracked |
| Jedno-użytkowe | Reużywalne w zespole |

---

## 5. Architektura Subagentów

### Cel: Izolacja Kontekstu = Oszczędność Tokenów

```
┌─────────────────────────────────────────────────────┐
│           GŁÓWNY AGENT (The Planner)                │
│  Model: Claude Opus / Gemini Pro                    │
│  Rola: Planowanie, architektura, orkiestracja       │
│  Context: Twoja główna rozmowa                      │
└─────────────────────┬───────────────────────────────┘
                      │ Deleguje zadania ↓
    ┌─────────────────┼─────────────────┐
    ↓                 ↓                 ↓
┌─────────┐     ┌─────────┐     ┌─────────┐
│SUBAGENT │     │SUBAGENT │     │SUBAGENT │
│ Testy   │     │ Refactor│     │ Docs    │
│ Haiku   │     │ Flash   │     │ Flash   │
└─────────┘     └─────────┘     └─────────┘
   │                │                │
   └────────────────┴────────────────┘
           Izolowane konteksty!
           "Śmieci" nie zatruwają
           głównej rozmowy
```

### Jak to działa

1. **Główny agent** (drogi, mocny) tylko planuje i deleguje
2. **Subagenci** (tani, szybcy) wykonują faktyczną pracę
3. Każdy subagent ma **własne okno kontekstowe**
4. Setki linii kodu testowego NIE zapychają głównej sesji

### W Antigravity

Możesz używać `browser_subagent` do delegowania zadań:
- Subagent ma dostęp do przeglądarki
- Wykonuje zadanie w izolacji
- Zwraca tylko wynik (summary)
- Nagranie zapisuje się jako webp

---

## 6. Multi-Model Workflow

### Zasada: Nie używaj Opus do wszystkiego!

| Tier | Model | Użycie | Koszt |
|------|-------|--------|-------|
| 🔵 **Oracle** | Claude Opus, GPT-4 | Architektura, trudne decyzje | $$$ |
| 🟢 **Agent** | Claude Sonnet, Gemini Pro | Złożone implementacje | $$ |
| ⚡ **Minion** | Gemini Flash, Haiku, Local 0.5B | Atomowe zadania | ¢ |

### Optymalny Podział Zadań

**Claude Opus (Architekt):**
- Planowanie architektury
- Projektowanie CLAUDE.md
- Rozwiązywanie najtrudniejszych zagadek logicznych
- Code review z wysokiego poziomu

**Gemini Flash / Haiku (Robotnicy):**
- Generowanie boilerplate
- Dodawanie komentarzy JSDoc
- Proste refaktory
- Ekstrakcja tagów, klasyfikacja
- Tłumaczenia

**Lokalne modele 0.5-7B:**
- Batch operations na wielu plikach
- Offline work
- Operacje na prywatnych danych
- Zadania gdzie opóźnienie sieciowe przeszkadza

### Przykładowy Flow

```
1. [Ty → Opus] "Zaprojektuj system minionów dla pluginu"
2. [Opus] zwraca architekturę + plan
3. [Ty → Flash] "Zaimplementuj klasę MinionEngine wg tego planu"
4. [Flash] zwraca kod
5. [Ty → Opus] "Zrób code review tego kodu"
6. [Opus] zwraca uwagi
7. [Ty → Flash] "Popraw te uwagi"
8. [Flash] zwraca poprawiony kod
```

---

## 7. MCP - Model Context Protocol

### Co to jest MCP?

Standardowy protokół umożliwiający AI bezpośredni dostęp do zewnętrznych danych i narzędzi, **bez przechodzenia przez główne okno czatu**.

### Dlaczego MCP > Wklejanie Logów

| Tradycyjnie | Z MCP |
|-------------|-------|
| Kopiujesz logi do czatu | AI odpytuje system bezpośrednio |
| Tokeny zużyte na surowe dane | Tylko relevantne fragmenty |
| Ręczna praca | Automatyzacja |
| Dane mogą być nieaktualne | Real-time access |

### Twoje MCP Servery (już skonfigurowane)

Z Twojego pluginu masz dostęp do:
- `jdhole-obsidian` - dostęp do Twojego vaulta

### Typowe Narzędzia MCP

- **vault_search** - semantyczne przeszukiwanie notatek
- **vault_read** - czytanie zawartości plików
- **vault_write** - tworzenie/edycja notatek
- **get_agent_context** - kontekst konkretnego agenta
- **Chrome DevTools MCP** - dostęp do konsoli przeglądarki, DOM, sieci

### Progressive Disclosure

Nowoczesne implementacje MCP **nie ładują wszystkich narzędzi naraz**. AI ładuje tylko te, których potrzebuje w danej chwili → oszczędność tokenów.

---

## 8. Optymalizacja Tokenów

### Prompt Caching (Anthropic)

**Jak działa:**
1. System sprawdza czy prefix promptu jest już w cache
2. Jeśli tak → używa cache (10x taniej!)
3. Jeśli nie → przetwarza i cachuje na 5 min

**Ceny (per milion tokenów):**
- Cache write: 1.25x base price (5 min) lub 2x (1 godz)
- Cache read: **0.1x base price** (90% taniej!)

**Best Practices:**
- Stabilna treść (instrukcje, kontekst) na początku promptu
- Zmienna treść (aktualny request) na końcu
- Cache breakpoints przy długich konwersacjach

### Auto-Compacting Session

Narzędzia jak OpenCode automatycznie kompresują historię:
- Gdy rozmowa za długa → AI streszcza ustalenia
- Zwalnia tysiące tokenów na dalszą pracę

### Strategie Oszczędzania

1. **Subagenci** - izoluj brudną robotę
2. **Skills zamiast powtarzania** - instrukcje ładowane automatycznie
3. **MCP zamiast wklejania** - dane on-demand
4. **Tanie modele do prostych zadań** - Flash/Haiku do boilerplate
5. **Chunking** - małe zadania zamiast monolitów
6. **CLAUDE.md** - kontekst raz, nie w każdym prompcie

---

## 9. Workflow Addy Osmani 2026

### Faza 1: Planowanie (spec + plan)

```
1. Opisz ideę AI
2. AI zadaje pytania iteracyjnie
3. Wspólnie tworzycie spec.md
4. AI generuje plan implementacji (bite-sized tasks)
5. Iterujecie plan do perfekcji
6. DOPIERO TERAZ zaczynasz kodować
```

> "Inwestycja w planowanie z góry może wydawać się wolna, ale opłaca się ogromnie."

### Faza 2: Iteracyjne Kodowanie

```
Prompt: "Zaimplementuj Krok 1 z planu"
→ Kod → Test → Commit
Prompt: "Zaimplementuj Krok 2 z planu"  
→ Kod → Test → Commit
...
```

**Zasada:** Nigdy nie proś o duże, monolityczne outputy!

### Faza 3: Przegląd i Testy

- **Zawsze** testuj wygenerowany kod
- Traktuj kod AI jak od junior developera
- Używaj drugiego AI do code review
- Nie skipuj review tylko dlatego że AI napisało

### Faza 4: Commits jako Save Points

```bash
# Po każdym małym zadaniu:
git add .
git commit -m "feat: Krok 3 - dodano MinionEngine"
```

- Commity to Twoje "save points w grze"
- Jeśli AI coś zepsuje → `git reset`
- Używaj branches do eksperymentów

### Faza 5: Continuous Learning

- Pytaj AI o wyjaśnienia kodu
- Proś o alternatywne podejścia
- Używaj AI do nauki nowych technologii
- Czasem koduj bez AI (utrzymuj umiejętności)

---

## 10. Antigravity IDE - Specyfika

### Unikalne Cechy Antigravity

1. **Agent Manager** - dedykowana powierzchnia do zarządzania agentami
2. **Artifacts 2.0** - kod to nie tylko tekst, model może go uruchomić w izolacji
3. **Turbo Mode (`// turbo`)** - auto-approve dla bezpiecznych komend
4. **Browser Subagent** - delegowanie zadań z nagrywaniem

### Turbo Mode

```javascript
// turbo
npm run build
```

Komentarz `// turbo` przed komendą = AI wykona ją automatycznie bez pytania.

### Workflow Files (.agent/workflows/)

Możesz tworzyć własne workflows:

```markdown
---
description: Deploy i weryfikacja
---

1. Zbuduj projekt
// turbo
2. npm run build

3. Uruchom testy
// turbo  
4. npm test

5. Jeśli wszystko OK, commituj
```

### Komendy do Zarządzania Kontekstem

- `/context` - zobacz które pliki "pożerają" limit
- Usuń niepotrzebne pliki z aktywnej pamięci sesji

---

## 11. OpenCode CLI

### Co to jest?

Terminal-based AI coding agent napisany w Go:
- TUI (Terminal User Interface) 
- Multi-provider (OpenAI, Anthropic, Gemini, Ollama)
- Zarządzanie sesjami
- Integracja MCP i LSP

### Kluczowe Funkcje

- **Auto-Compact** - automatyczne kompresowanie historii
- **Custom Commands** - własne slash komendy
- **LSP Integration** - AI "widzi" strukturę kodu bez ładowania wszystkiego
- **Session Management** - zapisywanie i wznawianie rozmów

### Instalacja

```bash
# macOS/Linux
brew install opencode-ai/tap/opencode

# lub przez Go
go install github.com/opencode-ai/opencode@latest
```

### MCP w OpenCode

```yaml
# ~/.config/opencode/config.yaml
mcp:
  servers:
    - name: "jdhole-obsidian"
      command: "npx"
      args: ["@jdhole/mcp-obsidian"]
```

---

## 12. Praktyczne Komendy i Skróty

### Antigravity

| Akcja | Sposób |
|-------|--------|
| Nowy task boundary | `task_boundary` tool |
| Deleguj do przeglądarki | `browser_subagent` tool |
| Zapisz artefakt | `write_to_file` do brain/ |
| Sprawdź kontekst | `/context` |
| Auto-run komendy | `// turbo` komentarz |

### Git Workflow z AI

```bash
# Przed AI session
git checkout -b feature/ai-experiment

# Po każdym kroku AI
git add . && git commit -m "step X: ..."

# Jeśli AI coś zepsuje
git reset --hard HEAD~1

# Merge gdy OK
git checkout main && git merge feature/ai-experiment
```

### Prompty Ratunkowe

```
"Twój poprzedni kod nie działa. Oto error: [wklej]. 
Przeanalizuj i zaproponuj fix."

"Zatrzymaj się. Podsumuj co do tej pory zrobiliśmy 
i jaki jest następny krok."

"Ten kod jest zbyt skomplikowany. Uprość go, 
zachowując funkcjonalność."

"Wyjaśnij ten kod linijka po linijce. 
Chcę zrozumieć co robi."
```

---

## 🎯 Quick Reference Card

### Przed Rozpoczęciem Projektu
- [ ] Stwórz `spec.md` z wymaganiami
- [ ] Wygeneruj `plan.md` z krokami
- [ ] Przygotuj `CLAUDE.md` z konwencjami
- [ ] Skonfiguruj MCP jeśli potrzebne

### Podczas Kodowania
- [ ] Małe, iteracyjne zadania (nie monolity!)
- [ ] Commit po każdym kroku
- [ ] Testuj każdy wygenerowany kod
- [ ] Używaj tanich modeli do prostych tasków

### Oszczędzanie Tokenów
- [ ] CLAUDE.md zamiast powtarzania kontekstu
- [ ] Skills zamiast długich instrukcji
- [ ] Subagenci do brudnej roboty
- [ ] MCP zamiast wklejania danych
- [ ] Prompt caching dla powtarzalnych promptów

---

## 📚 Źródła

1. **Addy Osmani** - "My LLM coding workflow going into 2026" (Medium, Dec 2025)
2. **alexop.dev** - "Understanding Claude Code's Full Stack: MCP, Skills, Subagents"
3. **antigravity.codes** - Dokumentacja Google Antigravity IDE
4. **Anthropic** - "Code execution with MCP: building more efficient AI agents"
5. **Anthropic Docs** - "Prompt Caching"
6. **OpenCode GitHub** - github.com/opencode-ai/opencode
7. **Simon Willison** - Blog posts on LLM development

---

*Ostatnia aktualizacja: 22.01.2026*
