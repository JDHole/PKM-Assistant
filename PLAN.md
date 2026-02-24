# PKM Assistant - Master Plan

> **Swiety Gral #2** obok WIZJA.md.
> Odznaczaj `[x]` w miare postepow. NIE zmieniaj struktury.
> Kopiuj do kazdego czatu z AI razem z WIZJA.md i STATUS.md.
> Stworzony: 2026-02-21 (sesja 11)

---

## Jak czytac ten plan

- `[ ]` = do zrobienia
- `[x]` = gotowe i przetestowane
- Fazy sa w kolejnosci **zaleznosci** - nie przeskakuj
- W ramach jednej fazy kolejnosc podpunktow jest dowolna
- Po skonczeniu fazy: zaktualizuj STATUS.md

### Wersje

| Wersja | Fazy | Cel |
|--------|------|-----|
| **v0.x** | 0 | Stabilny fundament, codzienne uzytkowanie |
| **v1.0** | 1-7 | Publiczne wydanie z pelnym systemem agentow |
| **v1.5** | 8-11 | Marketplace, mobile, zaawansowana pamiec |
| **v2.0** | 12-14 | SaaS, deep AI, multi-modal |

### Wersjonowanie pluginu

> Wersja pluginu jest w `manifest.json` i `package.json`.
> Aktualizuj przy kazdej sesji roboczej (bump patch: 1.0.1 -> 1.0.2 -> ...).
> AI: na koncu sesji zrob bump wersji i wpisz tu nowa.

| Wersja | Data | Sesja | Opis |
|--------|------|-------|------|
| 4.1.7 | - | - | Odziedziczona z Smart Connections (STARA) |
| 1.0.0 | 2026-02-21 | 15 | Reset wersji - wlasne wersjonowanie Obsek |
| 1.0.1 | 2026-02-21 | 15 | FAZA 1 Skill Engine - centralna biblioteka skilli, MCP toole, guziki UI |
| 1.0.2 | 2026-02-21 | 16 | FAZA 2 Minion per Agent - system minionow, MinionLoader, MinionRunner, minion_task MCP tool, auto-prep |
| 1.0.3 | 2026-02-22 | 19 | FAZA 2.4 Architektura 4 modeli - modelResolver, keySanitizer, MasterTaskTool, reorganizacja ustawien |
| 1.0.4 | 2026-02-22 | 21 | FAZA 2.5 Playbook + Vault Map - PlaybookManager, starter playbooki/vault mapy, auto-prep z kontekstem |
| 1.0.5 | 2026-02-22 | 22 | FAZA 3 Agent Manager + Creator - AgentProfileModal, AgentDeleteModal, AgentSidebar rewrite, skill create-agent, tylko Jaskier built-in |
| 1.0.6 | 2026-02-22 | 23-25 | FAZA 4 Komunikator + Delegacja, FAZA 5 Rozszerzony Chat (thinking, todo, plan, inline comments) |
| 1.0.7 | 2026-02-23 | 26-27 | Sidebar Navigation, Zaplecze, Artifact Panel + Todo/Plan v2, Subtaski, Global Artifacts, Discovery |
| 1.0.8 | 2026-02-23 | 28-29 | Checkpoint review, Sprint Roadmap, WIZJA/PLAN update, SC removal plan |
| 1.0.9 | 2026-02-23 | 30 | **Sprint S1+S2 DONE:** PKMEnv/PKMPlugin (singleton fix), embeddingi, semantyczny search, rebranding, 5 dead modules removed |

### Zaleznosci miedzy fazami

```
FAZA 0 (stabilizacja)
  ├── FAZA 1 (skille)
  │     ├── FAZA 2 (minion per agent)
  │     │     └── FAZA 3 (agent manager) ─┐
  │     └────────────────────────────────┘ │
  ├── FAZA 4 (komunikator + delegacja)     │
  ├── FAZA 5 (rozszerzony chat + inline)   │
  │                                        │
  └── FAZA 6 (onboarding) ← wymaga 1,3    │
        └── FAZA 7 (release) ← wymaga 1-6
              │
         ═══ v1.0 ═══
              │
     ┌────┬────┬────┐
     8    9   10   11   (dowolna kolejnosc)
              │
         ═══ v1.5 ═══
              │
     ┌────┬────┐
    12   13   14   (dowolna kolejnosc)
              │
         ═══ v2.0 ═══
```

---

## SPRINT ROADMAP *(sesja 29)*

> **Spiralna roadmapa**: krotkie sprinty (2-4 sesje), kazdy dostarcza wartosc.
> Sprinty to OVERLAY na istniejace FAZy - nie zmieniaja ich struktury.
> ~~SC removal = priorytet #1~~ **DONE (sesja 30).** Nastepny: Sprint S3 (stabilizacja).

```
~~S1 (SC removal)~~ DONE ✓ → ~~S2 (semantyczny search)~~ DONE ✓ → S3 (stabilizacja) → S4 (prompt+oczko)
     sesja 30                     sesja 30                           2-3 sesje           2-3 sesje

→ S5 (personalizacja) → S6 (master+skille) → S7 (UX) → S8 (docs) → S9 (release)
      3-4 sesje             3-4 sesje         3-4 sesje    3-4 sesje    2-3 sesje
```

### Sprint S1: WYRZUCENIE SMART CONNECTIONS ~~(2-3 sesje)~~ DONE w 1 sesji!

> ~~**Priorytet: KRYTYCZNY.** Blokuje dalszy rozwoj.~~ **ZROBIONE (sesja 30)**
> Plugin stoi na wlasnych nogach. PKM Assistant + SC moga koegzystowac.
> **Podejscie zmienione**: zamiast kopiowac 11 adapterow, wyeliminowalismy singleton
> i zostawilismy adaptery w external-deps/ (dzialaja). Full extraction opcjonalna.

**Zamienniki SC (DONE - sesja 30):**
- [x] PKMPlugin (~95 LOC) - zastepuje SmartPlugin, rozszerza Obsidian.Plugin
- [x] PKMEnv (~160 LOC) - zastepuje SmartEnv (module-scoped PKM_SCOPE, bez singletona window.smart_env)
- [x] main.js: SmartPlugin → PKMPlugin, SmartEnv → PKMEnv

**Rebranding - 15 SC ghost strings (DONE - sesja 30):**
- [x] release_notes_view.js: view_type → 'pkm-release-notes-view', tytul po polsku
- [x] connections_item_view.js: view_type → 'pkm-connections-view'
- [x] lookup_item_view.js: view_type → 'pkm-lookup-view'
- [x] connections_codeblock.js + build_connections_codeblock.js: 'pkm-connections'
- [x] connections-list-item/v3.js: env.main, connections-view/v3.js: PKM Connections
- [x] settings_tab.js: GitHub links, connections_view_refresh_handler.js: PKM log

**Sprzatanie (DONE - sesja 30):**
- [x] Usuniecie 5 martwych modulow SC (smart-actions/clusters/cluster-groups/completions/directories)
- [x] releases/latest_release.md zastapiony trescia PKM Assistant
- [x] Build dziala: 6.8MB, zero bledow


**Testowanie S1:**
- [x] Build przechodzi bez bledow
- [ ] Streaming na min. 3 platformach (DeepSeek, Ollama, OpenRouter)
- [ ] Tool calling dziala
- [ ] Minion/Master wywolania dzialaja
- [ ] Nowa sesja + ladowanie starej sesji
- [ ] Komunikator miedzy agentami
- [ ] Artefakty (todo, plan) przezywaja restart

---

### Sprint S2: SEMANTYCZNY SEARCH ~~(2-3 sesje)~~ CORE DONE w sesji 30!

> ~~**Cel:** Semantyczny search w vault i pamieci. Koniec z glupim indexOf!~~
> **CORE ZROBIONY (sesja 30):** vault_search i memory_search sa semantyczne.
> Uzylismy istniejacego pipeline SmartSources/SmartEmbedModel (juz dziala!).
> VaultIndex jako wlasna implementacja - opcjonalnie w przyszlosci.

**Semantyczny search (DONE - sesja 30):**
- [x] vault_search semantyczny: SmartSources.lookup() z hypotheticals
- [x] Fallback na indexOf jesli model embeddingowy niedostepny
- [x] Wyniki posortowane po trafnosci (similarity score)
- [x] memory_search semantyczny: EmbeddingHelper + cosine similarity
- [x] Embeddingi WLACZONE: process_embed_queue: true


---

### Sprint S3: STABILIZACJA + DAILY USE (2-3 sesje)

> **Cel:** Plugin nadaje sie do CODZIENNEGO uzytku.
> **Wymaga:** S1 ukonczone.

- [ ] Fix: todo widget duplikacja przy aktualizacji agenta
- [ ] Fix: crash przy ladowaniu starej sesji
- [ ] Fix: petla retry uprawnien
- [ ] Rozbudowa opisow 17 MCP tools (z ~25 do ~500-1000 tokenow kazdy)
- [ ] Rozbudowa system promptu agenta (z ~500 do ~2000+ tokenow)
- [ ] Wywalenie SC "What's New" ghost (jesli zostal po S1)
- [ ] Min. 3 dni codziennego uzytkowania bez krytycznych bledow

---

### Sprint S4: PRZEJRZYSTOSC PROMPTU + OCZKO (2-3 sesje)

> **Cel:** USP - to czego NIKT inny nie ma.
> **Wymaga:** S1 ukonczone (wlasny ObsekEnv z czysta struktura promptu).

**Prompt Inspector:**
- [ ] Podglad pelnego promptu przed wyslaniem do API
- [ ] Podglad opisow narzedzi (tool descriptions) z liczba tokenow
- [ ] Podglad kontekstu auto-prep miniona
- [ ] Podglad aktywnych artefaktow i skilli w prompcie
- [ ] Edycja dowolnego elementu promptu z UI
- [ ] Metryki: tokeny per element, calkowity koszt wywolania

**Oczko (Active Note Awareness):**
- [ ] Agent widzi aktywna notatke: app.workspace.getActiveFile()
- [ ] Kontekst aktywnej notatki (tytul + ~500 tok + frontmatter) w prompcie
- [ ] Toggle w UI (wlacz/wylacz swiadomosc notatki)
- [ ] Agent odnosi sie do otwartej notatki bez pytania

**obsidian_command MCP tool:**
- [ ] Nowy MCP tool: obsidian_command (~50 LOC)
- [ ] Dostep do app.commands (setki polecen z pluginow)
- [ ] Agent moze "kliknac" dowolne polecenie Obsidiana

---

### Sprint S5: PERSONALIZACJA AGENTA (3-4 sesje)

> **Cel:** Agent ktory NAPRAWDE jest spersonalizowany (nie dekoracja).
> **Wymaga:** S3 ukonczone (stabilny plugin).

- [ ] Rola agenta wplywa na system prompt + filtr narzedzi
- [ ] Archetypy buduja CALEGO agenta (prompt + skille + minion + playbook + vault_map)
- [ ] Uprawnienia widoczne w system prompcie agenta (wie czego NIE moze)
- [ ] Per-tool permissions (nie all-or-nothing MCP toggle)
- [ ] Focus folders jako twarde blokowanie vault_read/list/search
- [ ] Playbook/vault_map jako czesc procesu tworzenia agenta
- [ ] Rozbudowa Agent Creator o nowe pola

---

### Sprint S6: MASTERRUNNER + SKILLE V2 (3-4 sesje)

> **Cel:** Pelna hierarchia Main/Minion/Master + rozbudowa skilli.
> **Wymaga:** S1 ukonczone.

**MasterRunner:**
- [ ] master.md per agent (jak minion.md - instrukcje, kiedy wywolywac, format)
- [ ] MasterLoader (wzor: MinionLoader) - ladowanie, cache, walidacja, hot-reload
- [ ] MasterRunner z auto-prep i tool-calling loop (streamToCompleteWithTools)
- [ ] Przerobienie master_task na pelny runner (nie jednorazowe wywolanie)
- [ ] Master dostaje narzedzia (plan_action, chat_todo, vault_write)
- [ ] Typing indicator: "Master analizuje..."

**Skille v2:**
- [ ] Per-agent wersje skilli (globalna biblioteka + kopia per agent)
- [ ] Auto-inject listy skilli do system promptu agenta
- [ ] Kreator skilli w UI (formularz lub przez rozmowe z Jaskierem)
- [ ] Pytania uzupelniajace (skill definiuje "zapytaj usera o X, Y, Z")

---

### Sprint S7: UX + WYGLAD (3-4 sesje)

> **Cel:** Plugin wyglada PROFESJONALNIE.
> **Wymaga:** S3-S6 ukonczone (stabilne funkcje do ostylowania).

- [ ] Design system: paleta kolorow, typografia, ikony, spacing
- [ ] Redesign chatu: odejscie od dymkow → styl Claude Code
- [ ] Per-agent theming (CSS variables: --agent-primary, --agent-bg, --agent-accent)
- [ ] Transparentnosc minion/master w chacie (osobne bloki)
- [ ] Token counter z API usage field (input/output/cached/koszt)
- [ ] Typing effect z kursorem
- [ ] Responsywny design dla wszystkich elementow

---

### Sprint S8: DOKUMENTACJA + ONBOARDING (3-4 sesje)

> **Cel:** Nowy user NIE jest zgubiony.
> **Wymaga:** S7 ukonczone (gotowy UI).

- [ ] FAZA 6: Onboarding wizard (konfiguracja API/Ollama) (patrz checkboxy FAZY 6)
- [ ] FAZA 6: Jaskier jako mentor wdrazajacy
- [ ] Dymki tutoriali przy ustawieniach
- [ ] Baza wiedzy dostepna agentom (Jaskier zna dokumentacje)
- [ ] Gra uczaca: milestones + wyzwania z Jaskierem
- [ ] README.md, Changelog, demo (video/GIF)

---

### Sprint S9: RELEASE v1.0 (2-3 sesje)

> **Cel:** Plugin gotowy do publicznego wydania.
> **Wymaga:** S1-S8 ukonczone.

- [ ] FAZA 7: Error handling (patrz checkboxy FAZY 7)
- [ ] Test na min. 5 platformach (DeepSeek, Ollama, OpenRouter, Anthropic, OpenAI)
- [ ] Test onboardingu od zera (nowy vault)
- [ ] Prywatnosc: wykrywacz wrazliwych danych, LOCAL/CLOUD wskaznik, blacklist
- [ ] Bezpieczenstwo: prompt injection defense, path traversal fix
- [ ] Min. tydzien codziennego uzytkowania bez krytycznych bledow
- [ ] v1.0 w manifest.json, GitHub release, "Buy me a coffee"

---

## FAZA 0: STABILIZACJA [v0.x] ← JESTESMY TUTAJ

> Cel: Plugin nadaje sie do codziennego uzytku bez bledow.
> Zalezy od: niczego (fundament).

### 0.1 Rebranding
- [x] "Smart Connections" usuniete z widocznych miejsc UI
- [x] Komendy Obsidiana: prefiks "Obsek: ..."
- [x] package.json, manifest.json - metadane PKM Assistant
- [x] Linki w UI kieruja do GitHub JDHole/PKM-Assistant
- [x] WIZJA.md kompletna (21 sekcji, pelna wizja produktu)
- [x] PLAN.md kompletny (ten plik)
- [x] Nazwa "PKM Assistant" widoczna w tytule chatu i ustawieniach
- [x] Wlasna ikona pluginu (graf wiedzy zamiast buzki)

### 0.2 Naprawa agentow *(przeniesione do FAZY 3 - Agent Manager)*
- ~~Test Dextera~~ → FAZA 3
- ~~Test Ezry~~ → FAZA 3
- ~~Fix bledow~~ → FAZA 3
- [x] Kazdy agent automatycznie tworzy swoj folder pamieci

### 0.3 Czystosc danych
- [x] Zbadanie i naprawa duplikatow sesji
- [x] Weryfikacja vault_search (potwierdzone sesja 12)
- [x] Weryfikacja vault_delete (potwierdzone sesja 12)

### 0.4 Stabilnosc codziennego uzytku
- [ ] Minimum 3 dni codziennego uzywania bez krytycznych bledow
  - Start: 2026-02-21 (sesja 15). Deadline: 2026-02-24.
  - Bugi wpisywane w debugging note w vaulcie.
- [ ] Fix bledow znalezionych w uzytkowaniu
- [x] Czysty log konsoli (zero spamu warningow)

---

## FAZA 1: SKILL ENGINE [v1.0]

> Cel: Agenci laduja i uzywaja skilli - serce "niezaleznosci od modelu".
> Zalezy od: FAZA 0.

### 1.1 Format i struktura skilli
- [x] Definicja formatu skill.md (frontmatter: name, description, category, version, enabled)
- [x] Struktura: .pkm-assistant/skills/{skill_name}/skill.md (CENTRALNA BIBLIOTEKA)
- [x] skill.md = prompt rozszerzajacy mozliwosci agenta
- [ ] Opcjonalny kod JS (formatter.js, validator.js, helper.js) *(odlozone - sandbox potrzebny)*

### 1.2 SkillLoader
- [x] Ladowanie skilli z centralnej biblioteki przy starcie
- [x] Hot-reload: vault_write do /skills/ -> auto-reload + refresh guzikow UI
- [x] Lista dostepnych skilli przez MCP tool (skill_list)

### 1.3 SkillRunner
- [x] Aktywacja na polecenie usera (guziki w UI chatu)
- [x] Aktywacja przez agenta (MCP tool skill_execute)
- [x] Prompt skilla zwracany agentowi przez skill_execute
- [ ] Wykonanie opcjonalnego JS w sandboxie (bezpieczenstwo!) *(odlozone)*

### 1.4 Tworzenie i iteracja skilli
- [x] Agent potrafi stworzyc nowy skill (vault_write do .pkm-assistant/skills/)
- [x] User moze edytowac skill recznie (pliki MD w .pkm-assistant/skills/)
- [x] Cykl iteracji: user uzywa -> daje feedback -> agent poprawia skill

### 1.5 Wbudowane skille startowe
- [x] 4 starter skille: daily-review, vault-organization, note-from-idea, weekly-review
- [x] Skille tworzone automatycznie jesli folder pusty (ensureStarterSkills)

### 1.6 Nowe MCP tools
- [x] skill_list - lista skilli agenta (z filtrem po kategorii)
- [x] skill_execute - aktywuj skill po nazwie (zwraca pelny prompt)
- [ ] obsidian_settings - czytaj/zmieniaj ustawienia Obsidiana *(odlozone - osobny task)*

### 1.8 Skille v2 *(nowe - sesja 29, Sprint S6)*
- [ ] Auto-inject listy skilli do system promptu agenta (nie tylko guziki UI)
- [ ] Per-agent wersje skilli (globalna biblioteka + kopia per agent z modyfikacjami)

### 1.7 UI skilli w chacie *(nowe - sesja 15)*
- [x] Guziki skilli nad polem do pisania (pill/chip style)
- [x] Klikniecie guzika -> wysyla "Uzyj skilla: {nazwa}" do agenta
- [x] Guziki odswiezaja sie przy zmianie agenta
- [x] Przypisanie skilli do agenta: pole skills[] w konfiguracji (JS + YAML)

---

## FAZA 2: MINION PER AGENT [v1.0]

> Cel: Kazdy agent ma wlasnego miniona z wlasnymi instrukcjami.
> Zalezy od: FAZA 0 (globalny minion juz dziala), FAZA 1 (minion uzywa skilli).

### 2.1 Konfiguracja per agent
- [x] System plikow minionow: .pkm-assistant/minions/{name}/minion.md (frontmatter + prompt)
- [x] MinionLoader: laduje, cache, waliduje, hot-reload (wzor: SkillLoader)
- [x] 3 starter miniony: jaskier-prep, dexter-vault-builder, ezra-config-scout
- [x] Pole minion w Agent.js (wskazuje na nazwe minion config)
- [x] Pole minion_enabled w Agent.js (mozliwosc wylaczenia)
- [x] Walidacja nowych pol w yamlParser.js
- [x] Fallback modelu: minionConfig.model -> global obsek.minionModel -> main model
- [x] Cache modelu per agent w _getMinionModel()

### 2.2 Rozszerzone zadania miniona
- [x] MinionRunner: silnik z dwoma trybami (auto-prep + task)
- [x] streamToCompleteWithTools: petla tool-calling w streamHelper.js
- [x] Auto-prep: przeszukanie vaulta + pamieci PRZED pierwsza wiadomoscia sesji
- [x] Sugestia skilli: minion podpowiada ktory skill pasuje
- [x] MCP tool minion_task: agent deleguje zadania minionowi na zadanie
- [x] Agent decyduje kiedy uzyc miniona (proste robi sam, ciezka robota -> minion)
- [ ] Wykonywanie prostych skilli przez miniona *(odlozone)*

### 2.3 Integracja z chatem
- [x] Auto-prep odpala sie na pierwszej wiadomosci sesji
- [x] Typing indicator: "Minion przygotowuje kontekst..."
- [x] Wynik miniona wstrzykiwany do system promptu glownego modelu
- [x] System prompt agenta zawiera info o minionie i kiedy go uzywac
- [x] minion_task jako 12. MCP tool (agent deleguje swiadomie)
- [x] Hot-reload: vault_write do /minions/ przeladowuje konfiguracje
- [x] Graceful failure: minion padnie -> main model odpowiada normalnie

### 2.4 Architektura 4 modeli *(nowe - sesja 18)*

> 4 modele per agent: Main (rozmowa), Minion (robota w tle), Embedding (wektory), Master (geniusz).
> Kazdy konfigurowalny globalnie i per agent. Domyslne wartosci dzialaja od razu.

- [x] Ustawienia globalne: 4 pola modelu (Main, Minion, Embedding, Master)
- [x] Ustawienia per agent: override globalnych modeli w konfiguracji agenta
- [x] Zmiana domyslnego modelu embeddingów: bge-micro-v2 → Nomic-embed-text v1.5
  - [x] Zmiana defaulta w konfiguracji SC (external-deps)
  - [x] Opcja wyboru modelu embeddingów w ustawieniach Obsek
  - [x] Re-indeksowanie vaulta po zmianie modelu (info dla usera)
- [x] MCP tool master_task: agent deleguje trudne zadania W GORE do Mastera
  - [x] master_task automatycznie odpala Miniona po kontekst ZANIM wysle do Mastera
  - [x] System prompt agenta: instrukcje kiedy uzywac master_task
  - [x] Typing indicator: "Konsultuje z ekspertem..."
  - [x] Graceful fallback: brak Mastera → Main odpowiada sam
- [x] UI: sekcja "Modele" w ustawieniach z 4 polami + opisami po polsku

### 2.6 MasterRunner *(nowe - sesja 29, Sprint S6)*
- [ ] MasterRunner z tool-calling loop (per-agent master.md, narzedzia, auto-prep)
- [ ] Per-agent master.md (instrukcje specyficzne dla domeny Mastera)
- [ ] Master dostaje narzedzia (plan_action, chat_todo, vault_write, vault_read)

### 2.5 Playbook + Vault Map *(nowe - sesja 17)*
- [x] playbook.md per agent: .pkm-assistant/agents/{name}/playbook.md
  - [x] Format: lista narzedzi + skilli + procedur (markdown, czytelny dla miniona)
  - [x] Starter playbook tworzony automatycznie dla wbudowanych agentow
  - [x] Agent NIE ma playbooka w system prompcie (za duzo tokenow)
- [x] vault_map.md per agent: .pkm-assistant/agents/{name}/vault_map.md
  - [x] Mapa stref vaulta: foldery + opisy co w nich jest
  - [x] Rozni agenci maja rozne mapy (rozne strefy dostepu)
  - [x] Starter vault_map tworzony automatycznie (analiza vaulta)
- [x] System prompt punkt 4 = lekki (3 linie: pointer do playbooka + uprawnienia)
- [x] Auto-prep miniona czyta playbook.md i vault_map.md na starcie sesji
- [x] minion_task: agent moze poprosic miniona o sprawdzenie playbooka w trakcie rozmowy
- [x] Hot-reload: edycja playbook.md/vault_map.md przeladowuje config

---

## FAZA 3: AGENT MANAGER + CREATOR [v1.0]

> Cel: Pelna kontrola i przejrzystosc nad agentami z poziomu UI.
> Zalezy od: FAZA 1 (wyswietlanie skilli), FAZA 2 (konfiguracja miniona).

### 3.1 Agent Manager Panel
- [x] Zakladka/panel w pluginie z lista wszystkich agentow
- [x] Profil agenta: imie, emoji, opis, model, temperatura
- [x] Podglad brain.md i active_context.md (bez grzebania w .pkm-assistant)
- [x] Podglad i edycja uprawnien (read/write/delete/execute/mcp)
- [x] Podglad i edycja stref vaulta
- [x] Podglad MCP tools agenta
- [x] Podglad i edycja skilli
- [x] Konfiguracja miniona (model, instrukcje, zadania)
- [x] Historia rozmow (lista sesji z nawigacja)
- [x] Statystyki: liczba sesji, zuzycie tokenow, ostatnia aktywnosc

### 3.2 Agent Creator
- [x] Formularz: imie, emoji, opis roli
- [x] Archetyp (szablon osobowosci) lub custom personality
- [x] Preset uprawnien: Safe / Standard / Full
- [x] Konfiguracja stref vaulta
- [x] Wybor modelu AI + minion
- [x] Zapis nowego agenta do .pkm-assistant/agents/
- [x] Tworzenie agenta przez rozmowe z Jaskierem (alternatywa dla formularza)

### 3.3 Edycja i usuwanie agentow
- [x] Edycja profilu istniejacego agenta z UI
- [x] Edycja uprawnien i stref z UI
- [x] Usuwanie agenta (z potwierdzeniem i opcja archiwizacji pamieci)

### 3.4 Architektura agentow *(nowe - sesja 22)*
- [x] Tylko Jaskier jako wbudowany agent (Dexter/Ezra to szablony/archetypy)
- [x] Built-in overrides: edycja Jaskiera zapisywana do _overrides.yaml
- [x] Fallback: usuniecie ostatniego agenta -> auto-odtworzenie Jaskiera
- [ ] Tryb bez agenta (agentless mode) - chat bez systemu agentow *(notatka na przyszlosc)*

### 3.5 Personalizacja agenta *(nowe - sesja 29, Sprint S5)*
- [ ] Rola agenta wplywa na system prompt + filtr narzedzi (nie tylko dekoracja)
- [ ] Archetypy buduja CALEGO agenta (prompt + skille + minion + playbook + vault_map)
- [ ] Uprawnienia widoczne w system prompcie (agent WIE czego nie moze)
- [ ] Per-tool permissions (nie all-or-nothing MCP toggle)
- [ ] Focus folders jako twarde blokowanie vault_read/list/search

---

## FAZA 4: KOMUNIKATOR + DELEGACJA [v1.0]

> Cel: Agenci przekazuja sobie zadania i kontekst.
> Zalezy od: FAZA 0.

### 4.1 Komunikator
- [x] Struktura: .pkm-assistant/komunikator/inbox_{agent}.md
- [x] Agent zostawia wiadomosc w skrzynce innego agenta
- [x] Agent czyta swoj inbox przy starcie sesji
- [x] MCP tool: agent_message (wyslij wiadomosc do agenta)

### 4.2 Delegacja agentow
- [x] Agent proponuje przelaczenie ("Moze przerzucimy na Lexie?")
- [x] Przycisk w UI do zatwierdzenia delegacji
- [x] Przy delegacji: sesja zapisana, kontekst w Komunikatorze
- [x] Nowy agent laduje sie z kontekstem
- [x] MCP tool: agent_delegate (przelacz na innego agenta z kontekstem)

---

## FAZA 5: ROZSZERZONY CHAT + INLINE [v1.0]

> Cel: Ulepszone funkcje chatu + interakcja z agentem poza oknem czatu.
> Zalezy od: FAZA 0.

### 5.1 Inline komentarze *(sesja 25)*
- [x] Context menu (prawy przycisk w notatce): "Komentarz do Asystenta"
- [x] Formularz: user wpisuje uwage do zaznaczonego fragmentu
- [x] Agent dostaje: zaznaczony fragment + komentarz + sciezka pliku
- [x] Agent poprawia fragment bezposrednio w pliku

### 5.2 Creation Plans (artefakty) *(sesja 25)*
- [x] Agent tworzy plan krok-po-kroku przed wiekszym zadaniem
- [x] Plan widoczny jako artefakt w chacie (lub jako notatka)
- [x] User komentuje/poprawia poszczegolne kroki planu *(sesja 27: subtaski + inline edit + modal)*
- [x] Po akceptacji planu - agent realizuje go z uzyciem skilli

### 5.3 Todo listy w chacie *(sesja 25)*
- [x] Agent tworzy tymczasowa liste zadan w chacie (interaktywny artefakt)
- [x] Checkboxy odznaczane w trakcie pracy (agent odznacza automatycznie)
- [x] User moze dodawac/usuwac/edytowac punkty na liscie *(sesja 27: inline edit + modal)*
- [x] Dwa tryby: tymczasowy (w chacie, znika po sesji) vs trwaly (zapisany jako notatka w vaultcie)
- [x] Animacja postępu: pasek / procent ukonczenia

### 5.4 Extended thinking *(sesja 25)*

> Wyswietlanie procesu myslenia AI - chain of thought, reasoning tokens.
> Dotyczy modeli: DeepSeek Reasoner, Anthropic (extended thinking), OpenAI o-series.

- [x] Odbieranie reasoning_content / thinking z API (DeepSeek juz dziala, rozszerzyc na inne)
- [x] Zwijany/rozwijalny blok "Myslenie..." w babelku odpowiedzi
- [x] Animacja "agent mysli" z podgladem chain of thought w czasie rzeczywistym
- [x] Graceful fallback: model bez thinking → normalny babelek bez bloku myslenia
- [x] Ustawienie: wlacz/wylacz wyswietlanie myslenia (nie kazdy chce to widziec)

### 5.5 Animacje i UI chatu *(sesja 25)*
- [x] Plynne animacje ladowania i generowania odpowiedzi
- [ ] Animacja wpisywania (typing effect) z kursorem
- [x] Animacje przejsc: todolists, plans, thinking bloki
- [x] Animacja tool call (rozwijanie/zwijanie, ikony narzedzi)
- [ ] Responsywny design dla wszystkich nowych elementow chatu

### 5.9 Nowe funkcje chatu *(nowe - sesja 29, Sprinty S4/S7)*
- [ ] Prompt transparency - podglad pelnego promptu w UI (Sprint S4)
- [ ] "Oczko" - active note awareness toggle (Sprint S4)
- [ ] obsidian_command MCP tool (Sprint S4)
- [ ] Transparentnosc minion/master (osobne bloki w chacie) (Sprint S7)
- [ ] Redesign chatu - odejscie od dymkow → styl Claude Code (Sprint S7)
- [ ] Token counter z API usage field (Sprint S7)

### 5.7 Panel artefaktow *(sesja 27)*
- [x] Zakladka/mini-menu w chacie pokazujace wszystkie artefakty (todo, plany) - globalny panel z pogrupowaniem
- [x] Szybki dostep do kazdego artefaktu bez scrollowania po chacie - klik otwiera modal edycji
- [x] Manualna edycja planow i todo (dodawanie/usuwanie/zmiana bez posrednictwa AI) - inline + modal

### 5.8 Agora - tablica aktywnosci agentow *(backlog - sesja 25)*
- [ ] Wspolna tablica `.pkm-assistant/agora.md` z wpisami agentow
- [ ] Kazdy agent po sesji wpisuje co zrobil (broadcast dla wszystkich)
- [ ] Nowy agent czyta agore przed rozpoczeciem pracy (kontekst "co sie dzialo")
- [ ] Roznica vs komunikator: komunikator = 1-do-1, agora = broadcast

### 5.6 Tryb Agentic *(notatka - sesja 25)*

> **Juz zaimplementowane** przez nasz system minion/main/master.
> Natywny "agentic mode" dostawcow (Claude, OpenAI) to w praktyce to samo co nasz
> streamToCompleteWithTools() - petla: model → tool call → wynik → model → ...
> Jesli dostawcy dodadza natywny agentic z korzyściami (tansze tokeny, dluzsz kontekst),
> podepniemy pod istniejaca architekture jako alternatywe dla naszej petli.
> **Nie wymaga osobnej implementacji - monitorowac API dostawcow.**

---

## FAZA 6: ONBOARDING [v1.0]

> Cel: Nowy user instaluje plugin i nie jest zgubiony.
> Zalezy od: FAZA 1 (skill onboardingowy), wiekszosc FAZY 3 (agent creator).

### 6.1 Wizard konfiguracji
- [ ] Ekran wyboru: klucz API lub Ollama
- [ ] Walidacja klucza API (czy dziala)
- [ ] Sugestia minion modelu (tanio + dobrze) + pomoc w konfiguracji
- [ ] One-click Ollama setup (wykrycie lokalnego serwera, rekomendacja modeli)

### 6.2 Wdrazanie przez Jaskiera
- [ ] Jaskier automatycznie wita nowego usera
- [ ] Opowiada o systemie (agenci, skille, narzedzia, pamiec)
- [ ] Pomaga stworzyc pierwszego wlasnego agenta
- [ ] Pomaga z podstawami PKM / Obsidiana (jesli user nowy)
- [ ] Skill "onboarding" - szczegolowa instrukcja prowadzenia usera

---

## FAZA 7: SOLIDNOSC + RELEASE [v1.0]

> Cel: Plugin gotowy do publicznego wydania.
> Zalezy od: FAZY 1-6 ukonczone.

### 7.1 Error handling
- [ ] Brak API -> informacja dla usera (nie crash)
- [ ] Slow API -> timeout + retry + informacja
- [ ] Czytelne komunikaty bledow (PL + EN)
- [ ] Log bledow do pliku (nie tylko konsola)

### 7.1b Alert o tworzeniu/usuwaniu plikow *(backlog - sesja 25)*
- [ ] Wyrazniejszy UI dla approval systemu (modal z podgladem zamiast console.warn)
- [ ] Powiadomienie po vault_write/delete z mozliwoscia cofniecia (undo)

### 7.2 Testowanie
- [ ] Test kazdego MCP toola
- [ ] Test kazdego wbudowanego agenta
- [ ] Test onboardingu od zera (nowy vault)
- [ ] Test na roznych providerach (Anthropic, OpenAI, Ollama, OpenRouter)
- [ ] Test na malym i duzym vaultcie

### 7.3 Optymalizacja lokalnych modeli (Ollama / LM Studio)
- [ ] Adaptive system prompt - automatyczne skracanie promptu dla malych modeli
- [ ] Inteligentne wstrzykiwanie pamieci - tylko brain dla <14B, pelny kontekst dla >30B
- [ ] Optymalizacja tool descriptions - krotsze opisy narzedzi dla lokalnych modeli
- [ ] Rekomendacje modeli w onboardingu (per GPU tier: 8GB/12GB/24GB/48GB VRAM)
- [ ] Fallback strategy - jesli tool calling nie dziala, agent pyta wprost i parsuje odpowiedz
- [ ] Benchmark local models - testy vault_search/read/write na popularnych modelach
- [ ] Dokumentacja: ktore modele najlepiej obsluguja tool calling
- [ ] Tryb "lekki" - mozliwosc wylaczenia RAG, pamieci, minionow dla maksymalnej szybkosci

### 7.3b Bezpieczenstwo *(backlog - sesja 25, audyt)*

> Audyt bezpieczenstwa wykazal brak sanityzacji tresci wstrzykiwanych do promptow AI
> oraz luki w walidacji sciezek plikow. Przy early access (znajomi) ryzyko niskie,
> ale przed publicznym release trzeba to ogarnac.

**Path traversal + ochrona plikow:**
- [ ] Normalizacja sciezek we wszystkich vault toolach (blokada ../, sciezek absolutnych)
- [ ] Dodac isProtectedPath() do vault_delete (jedyny tool bez tego sprawdzenia!)
- [ ] Rozszerzyc isProtectedPath() o warianty: .env.local, folder/.env, case-insensitive
- [ ] Usunac adapter fallback w VaultReadTool (omija zabezpieczenia)

**Prompt injection defense:**
- [ ] Separatory niezaufanej tresci: oznaczanie danych z vaulta/pamieci/skilli jako "UNTRUSTED CONTENT"
- [ ] Walidacja brain.md przed wstrzyknieciem (wykrywanie wzorcow injection: IGNORE, OVERRIDE itp.)
- [ ] Sanityzacja wiadomosci miedzy agentami (KomunikatorManager)
- [ ] Sanityzacja tresci skilli i playbookow przed wstrzyknieciem do promptu
- [ ] Ochrona MemoryExtractor przed wyciaganiem zloslliwych "faktow" z rozmow

**Lepszy approval system:**
- [ ] Modal z podgladem TRESCI (nie tylko "Content length: 123")
- [ ] Rozroznienie append vs replace w vault_write (replace = destrukcyjne)
- [ ] Audit log: co dokladnie agent zmienil w kazdym pliku

### 7.3c Prywatnosc rozszerzona *(nowe - sesja 29, Sprint S9)*
- [ ] Wykrywacz wrazliwych danych (regex na hasla, klucze API, numery kart)
- [ ] LOCAL vs CLOUD wskaznik przy modelu (zielona/pomaranczowa ikona)
- [ ] Blacklist plikow/folderow (user mowi "ten plik NIGDY do AI")

### 7.4 Dokumentacja
- [ ] README.md (instalacja, konfiguracja, podstawy)
- [ ] Dokumentacja online (wiki lub docs site)
- [ ] Demo (video lub GIF)
- [ ] Changelog

### 7.5 Release
- [ ] Wersja 1.0.0 w manifest.json
- [ ] GitHub release z binarkami
- [ ] "Buy me a coffee" link w ustawieniach
- [ ] Zgloszenie do Obsidian Community Plugins (opcjonalnie)

### 7.6 Prompt Caching (optymalizacja kosztow API)

> **NIEISTOTNE** - uzywamy DeepSeek, ktory jest tani sam w sobie.
> Prompt caching ma sens glownie dla Anthropic/OpenAI, gdzie koszty sa duzo wyzsze.
> **AI: NIE przypominaj o tym w kazdym nowym czacie.** To jest swiadoma decyzja, nie zaleglosc.
> Jesli kiedykolwiek zmienimy glownego providera na drozszego - wtedy wrocic do tego punktu.

- [ ] Zbadanie jak SmartChatModel buduje requesty do API (kolejnosc elementow promptu)
- [ ] Uporzadkowanie kolejnosci kontekstu: stale elementy na poczatku (system prompt → brain → pamiec → historia → nowa wiadomosc)
- [ ] Anthropic: dodanie cache_control breakpointow:
  - [ ] Breakpoint 1: system prompt agenta
  - [ ] Breakpoint 2: brain.md + kontekst pamieci L1/L2
  - [ ] Breakpoint 3: historia czatu (prefix)
- [ ] OpenAI: weryfikacja ze automatyczny cache dziala (stabilna struktura promptu)
- [ ] Test: porownanie kosztow z/bez cache (sprawdzenie `cache_creation_input_tokens` i `cache_read_input_tokens` w odpowiedzi API)
- [ ] Opcjonalnie: UI indicator zuzycia cache (ile tokenow cached vs fresh)

### 7.7 Optymalizacja zuzycia tokenow (kompresja historii)

> Slabsze modele (lokalne, tanie API) guba sie po 3-4 wiadomosciach przez zbyt duzy kontekst.
> Dotyczy WSZYSTKICH modeli, nie tylko lokalnych.

- [ ] Wczesniejsza kompresja historii - prog 50% zamiast 70% limitu tokenow (konfigurowalny)
- [ ] Max wiadomosci w oknie (rolling window np. 10-15) - twarde ciecie zeby kontekst nie puchl
- [ ] Przycisk "Kompresuj" w UI - reczne odchudzenie rozmowy gdy model sie gubi
- [ ] Adaptacyjna pamiec - L1 summaries tylko w pierwszej wiadomosci sesji, potem sam brain.md

---

═══════════════════════════════════════════
              v1.0 RELEASE
═══════════════════════════════════════════

---

## FAZA 8: MARKETPLACE [v1.5]

> Cel: Wbudowany sklep z agentami, skillami i narzedziami.
> Zalezy od: v1.0 wydane.

### 8.1 Backend
- [ ] Hosting repo z paczkami (GitHub repo lub dedykowane API)
- [ ] Format paczki: YAML config + pliki MD/JS
- [ ] System wersjonowania paczek

### 8.2 UI w pluginie
- [ ] Zakladka "Marketplace" w pluginie
- [ ] Przegladanie: agenci, skille, MCP tools, szablony vaulta
- [ ] Wyszukiwanie i filtrowanie
- [ ] System ocen (gwiazdki + komentarze)
- [ ] One-click install

### 8.3 Publikowanie
- [ ] User moze opublikowac swojego agenta/skill
- [ ] Automatyczny scan bezpieczenstwa (JS w skillach!)
- [ ] Podzial: oficjalne (od nas) vs community

### 8.4 Fix i finalne dopracowanie Agent Managera *(nowe - sesja 22)*
- [ ] Kosmetyka UI: dopracowanie wygladu Agent Managera, Sidebara, modali
- [ ] Integracja z Marketplace: instalacja agentow/skilli z poziomu Agent Managera
- [ ] Przeglad i fix bledow znalezionych podczas uzywania FAZY 3-8

---

## FAZA 9: MOBILE [v1.5]

> Cel: PKM Assistant dziala na Obsidian Mobile.
> Zalezy od: v1.0 wydane.

### 9.1 Kompatybilnosc
- [ ] Audit kodu: brak Node-only API
- [ ] UI responsywne na malych ekranach
- [ ] Touch-friendly interakcje

### 9.2 Offline
- [ ] Wykrywanie stanu sieci
- [ ] Tryb offline: cache + lokalne modele
- [ ] Sync pamieci po powrocie online

### 9.3 Optymalizacja
- [ ] Miniony na najtanszych modelach (bateria)
- [ ] Lazy loading (nie laduj wszystkiego na start)
- [ ] Kompresja kontekstu dla malych modeli

---

## FAZA 10: ZAAWANSOWANA PAMIEC [v1.5]

> Cel: Inteligentniejsze wyszukiwanie i uzycie kontekstu.
> Zalezy od: v1.0 wydane.

### 10.1 Adaptive retrieval
- [ ] Klasyfikacja zapytania (proste vs zlozone)
- [ ] Dynamiczna ilosc kontekstu (malo dla prostych, duzo dla zlozonych)

### 10.2 Knowledge modules
- [ ] Vault podzielony na moduly wiedzy (foldery + tagi + instrukcje)
- [ ] Agent dynamicznie sklada kontekst z odpowiednich modulow

### 10.3 Cross-agent memory
- [ ] Agent czyta pamiec innego agenta (za zgoda usera)
- [ ] Wspolne fakty (shared brain)
- [ ] Privacy rules: co mozna dzielic, co nie

### 10.4 Feedback loop
- [ ] 👍👎 na odpowiedzi agenta
- [ ] Feedback poprawia skille i pamiec z czasem
- [ ] Agent uczy sie preferencji z feedbacku

### 10.5 Poprawa embeddingu dla dlugich notatek
- [ ] Sliding window z nakladka (overlap miedzy blokami, zeby kontekst na granicy nie ginal)
- [ ] Hierarchiczny embedding: cala notatka -> rozdzialy -> sekcje (drill-down od ogolu do szczegolu)
- [ ] Konfigurowalny rozmiar bloku (nie tylko po naglowkach, ale tez po liczbie tokenow)
- [ ] Obsluga bardzo dlugich notatek (ksiazki, transkrypcje) bez utraty tresci

---

## FAZA 11: DEBATA AGENTOW [v1.5]

> Cel: Wielu agentow w jednym chacie naraz.
> Zalezy od: FAZA 4 (komunikator), v1.0 wydane.

### 11.1 Multi-chat
- [ ] Widok chatu z wieloma agentami
- [ ] Kazdy agent generuje na swoim modelu
- [ ] User jako moderator (moze pytac konkretnego agenta)

### 11.2 Scenariusze
- [ ] Burza mozgow (wielu agentow podaje pomysly)
- [ ] Ewaluacja (agenci oceniaja z roznych perspektyw)
- [ ] Debata for/against

---

═══════════════════════════════════════════
              v1.5 RELEASE
═══════════════════════════════════════════

---

## FAZA 12: PKM SAAS [v2.0]

> Cel: Monetyzacja - user placi nam, my dajemy AI.
> Zalezy od: v1.5 wydane.

### 12.1 Backend
- [ ] System kont uzytkownikow
- [ ] Kredyty / subskrypcja
- [ ] Proxy do dostawcow AI (Anthropic, OpenAI, Gemini, etc.)
- [ ] Billing i rozliczenia

### 12.2 Easy mode w pluginie
- [ ] Logowanie kontem (zero konfiguracji API)
- [ ] Rekomendacje modeli (ktory do czego)
- [ ] Dashboard uzycia tokenow i kosztow

---

## FAZA 13: DEEP PERSONALIZATION [v2.0]

> Cel: Agent naprawde zna usera - glebiej niz brain.md.
> Zalezy od: v1.5 wydane.

### 13.1 PLLM (Personalized LLM)
- [ ] Profil usera budowany automatycznie z interakcji
- [ ] Pamiec epizodyczna + semantyczna (inspiracja: PRIME)

### 13.2 Memory decay
- [ ] Starsze wspomnienia "bladna" (nizszy priorytet retrieval)
- [ ] Wazne wspomnienia nie bladna (user moze oznaczyc)

### 13.3 Adaptery / LoRA
- [ ] Fine-tuning modeli na danych usera
- [ ] Integracja z Ollama + LoRA

### 13.4 Concept routing
- [ ] Automatyczne tagowanie notatek (maly encoder)
- [ ] User feedback (👍👎) poprawia klasyfikacje z czasem

---

## FAZA 14: MULTI-MODAL [v2.0]

> Cel: Agent widzi, slucha, tworzy - nie tylko pisze.
> Zalezy od: v1.5 wydane.

### 14.1 Grafika
- [ ] Integracja z generatorem obrazow (ComfyUI itp.)
- [ ] Agent tworzy obrazy do notatek/artykulow
- [ ] Podglad wygenerowanego obrazu w chacie
- [ ] Zapis obrazu do vaulta (jako attachment)

### 14.2 Image input (zdjecia w chacie) *(rozbudowane - sesja 18)*
- [ ] Wklejanie obrazow do chatu (paste, drag & drop, przycisk kamery)
- [ ] Analiza obrazu przez multimodal model (GPT-4o, Claude, Gemini)
- [ ] Podglad wklejonego obrazu w historii chatu
- [ ] Obsluga formatow: PNG, JPG, GIF, WebP, SVG
- [ ] Graceful fallback: model bez vision → info dla usera ze nie obsluguje obrazow

### 14.3 Video input *(nowe - sesja 18)*
- [ ] Upload filmow do chatu (drag & drop, przycisk)
- [ ] Automatyczna transkrypcja audio z video (Whisper / API)
- [ ] Analiza kluczowych klatek video (multimodal model)
- [ ] Streszczenie video: transkrypcja + kluczowe kadry + podsumowanie
- [ ] Limit dlugosci video (rozsadny dla tokenow)

### 14.4 Voice (rozmowa glosowa) *(rozbudowane - sesja 18)*
- [ ] Przycisk mikrofonu w chacie: user mowi zamiast pisze (STT)
- [ ] Agent odpowiada glosem (TTS)
- [ ] Wybor glosu per agent (rozne glosy dla roznych osobowosci)
- [ ] Tryb hands-free: cala rozmowa glosowa (bez klawiatury)
- [ ] Integracja z natywnymi API: Web Speech API, Whisper, ElevenLabs, OpenAI TTS

### 14.5 Transkrypcja *(rozbudowane - sesja 18)*
- [ ] Drag & drop plikow audio do chatu (.mp3, .wav, .m4a, .ogg)
- [ ] Automatyczna transkrypcja przez Whisper (lokalny lub API)
- [ ] Tworzenie notatki z transkrypcja (z formatowaniem, timestamps)
- [ ] Obsluga dlugich nagrań: chunk-based transcription

### 14.6 Muzyka
- [ ] Generowanie muzyki / soundscapes
- [ ] Integracja z lokalnymi narzędziami muzycznymi

---

═══════════════════════════════════════════
              v2.0 RELEASE
═══════════════════════════════════════════

---

## Podsumowanie

| Wersja | Fazy | Checkboxy (FAZy) | Checkboxy (Sprinty) | Status |
|--------|------|-----------|------------|--------|
| v0.x | 0 | 13/15 | ~~S1~~: **DONE** | ~~SC removal~~ ZROBIONE (sesja 30) |
| v1.0 | 1-7 + S2-S9 | ~130/185 | S2 core: **DONE**, S3-S9: 0/~60 | FAZA 1-5 prawie gotowa, S3+ do zrobienia |
| v1.5 | 8-11 | 0/40 | - | - |
| v2.0 | 12-14 | 0/40 | - | - |
| **TOTAL** | **0-14 + S1-S9** | **~143/280** | **~18/96** | **~43% (161/376)** |

### Kolejnosc pracy (sesja 30+)

```
~~S1 (SC removal)~~ DONE ✓  ~~S2 (semantyczny search)~~ DONE ✓
TERAZ → S3 (stabilizacja) → S4 (prompt+oczko) → S5 (personalizacja)
     → S6 (master+skille) → S7 (UX) → S8 (docs+onboarding) → S9 (release v1.0)
```

---

*Stworzony: 2026-02-21 (sesja 11)*
*Oparty na: WIZJA.md (sesja 11)*
*Zaktualizowany sesja 30: Sprint S1+S2 DONE (PKMEnv, semantyczny search, rebranding). SC WYKRESLONY.*
*Kazdy punkt odpowiada konkretnemu elementowi wizji.*
*Gdy caly plan jest odznaczony [x] - wizja jest zrealizowana.*
