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

### Zaleznosci miedzy fazami

```
FAZA 0 (stabilizacja)
  ├── FAZA 1 (skille)
  │     ├── FAZA 2 (minion per agent)
  │     │     └── FAZA 3 (agent manager) ─┐
  │     └────────────────────────────────┘ │
  ├── FAZA 4 (komunikator + delegacja)     │
  ├── FAZA 5 (inline + creation plans)     │
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

### 2.4 Playbook + Vault Map *(nowe - sesja 17)*
- [ ] playbook.md per agent: .pkm-assistant/agents/{name}/playbook.md
  - [ ] Format: lista narzedzi + skilli + procedur (markdown, czytelny dla miniona)
  - [ ] Starter playbook tworzony automatycznie dla wbudowanych agentow
  - [ ] Agent NIE ma playbooka w system prompcie (za duzo tokenow)
- [ ] vault_map.md per agent: .pkm-assistant/agents/{name}/vault_map.md
  - [ ] Mapa stref vaulta: foldery + opisy co w nich jest
  - [ ] Rozni agenci maja rozne mapy (rozne strefy dostepu)
  - [ ] Starter vault_map tworzony automatycznie (analiza vaulta)
- [ ] System prompt punkt 4 = lekki (3 linie: pointer do playbooka + uprawnienia)
- [ ] Auto-prep miniona czyta playbook.md i vault_map.md na starcie sesji
- [ ] minion_task: agent moze poprosic miniona o sprawdzenie playbooka w trakcie rozmowy
- [ ] Hot-reload: edycja playbook.md/vault_map.md przeladowuje config

---

## FAZA 3: AGENT MANAGER + CREATOR [v1.0]

> Cel: Pelna kontrola i przejrzystosc nad agentami z poziomu UI.
> Zalezy od: FAZA 1 (wyswietlanie skilli), FAZA 2 (konfiguracja miniona).

### 3.1 Agent Manager Panel
- [ ] Zakladka/panel w pluginie z lista wszystkich agentow
- [ ] Profil agenta: imie, emoji, opis, model, temperatura
- [ ] Podglad brain.md i active_context.md (bez grzebania w .pkm-assistant)
- [ ] Podglad i edycja uprawnien (read/write/delete/execute/mcp)
- [ ] Podglad i edycja stref vaulta
- [ ] Podglad MCP tools agenta
- [ ] Podglad i edycja skilli
- [ ] Konfiguracja miniona (model, instrukcje, zadania)
- [ ] Historia rozmow (lista sesji z nawigacja)
- [ ] Statystyki: liczba sesji, zuzycie tokenow, ostatnia aktywnosc

### 3.2 Agent Creator
- [ ] Formularz: imie, emoji, opis roli
- [ ] Archetyp (szablon osobowosci) lub custom personality
- [ ] Preset uprawnien: Safe / Standard / Full
- [ ] Konfiguracja stref vaulta
- [ ] Wybor modelu AI + minion
- [ ] Zapis nowego agenta do .pkm-assistant/agents/

### 3.3 Edycja i usuwanie agentow
- [ ] Edycja profilu istniejacego agenta z UI
- [ ] Edycja uprawnien i stref z UI
- [ ] Usuwanie agenta (z potwierdzeniem i opcja archiwizacji pamieci)

---

## FAZA 4: KOMUNIKATOR + DELEGACJA [v1.0]

> Cel: Agenci przekazuja sobie zadania i kontekst.
> Zalezy od: FAZA 0.

### 4.1 Komunikator
- [ ] Struktura: .pkm-assistant/komunikator/inbox_{agent}.md
- [ ] Agent zostawia wiadomosc w skrzynce innego agenta
- [ ] Agent czyta swoj inbox przy starcie sesji
- [ ] MCP tool: agent_message (wyslij wiadomosc do agenta)

### 4.2 Delegacja agentow
- [ ] Agent proponuje przelaczenie ("Moze przerzucimy na Lexie?")
- [ ] Przycisk w UI do zatwierdzenia delegacji
- [ ] Przy delegacji: sesja zapisana, kontekst w Komunikatorze
- [ ] Nowy agent laduje sie z kontekstem
- [ ] MCP tool: agent_delegate (przelacz na innego agenta z kontekstem)

---

## FAZA 5: INLINE + CREATION PLANS [v1.0]

> Cel: Interakcja z agentem poza oknem czatu.
> Zalezy od: FAZA 0.

### 5.1 Inline komentarze
- [ ] Context menu (prawy przycisk w notatce): "Komentarz do Asystenta"
- [ ] Formularz: user wpisuje uwage do zaznaczonego fragmentu
- [ ] Agent dostaje: zaznaczony fragment + komentarz + sciezka pliku
- [ ] Agent poprawia fragment bezposrednio w pliku

### 5.2 Creation Plans (artefakty)
- [ ] Agent tworzy plan krok-po-kroku przed wiekszym zadaniem
- [ ] Plan widoczny jako artefakt w chacie (lub jako notatka)
- [ ] User komentuje/poprawia poszczegolne kroki planu
- [ ] Po akceptacji planu - agent realizuje go z uzyciem skilli

---

## FAZA 6: ONBOARDING [v1.0]

> Cel: Nowy user instaluje plugin i nie jest zgubiony.
> Zalezy od: FAZA 1 (skill onboardingowy), wiekszosc FAZY 3 (agent creator).

### 6.1 Wizard konfiguracji
- [ ] Ekran wyboru: klucz API lub Ollama
- [ ] Walidacja klucza API (czy dziala)
- [ ] Sugestia minion modelu (tanio + dobrze)
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

> Cel: Agent nie tylko pisze - tworzy grafike, mowi, slucha.
> Zalezy od: v1.5 wydane.

### 14.1 Grafika
- [ ] Integracja z generatorem obrazow (ComfyUI itp.)
- [ ] Agent tworzy obrazy do notatek/artykulow

### 14.2 Voice
- [ ] Rozmowa glosowa z agentem (TTS + STT)
- [ ] Transkrypcja notatek glosowych (Whisper)

### 14.3 Muzyka
- [ ] Generowanie muzyki / soundscapes

---

═══════════════════════════════════════════
              v2.0 RELEASE
═══════════════════════════════════════════

---

## Podsumowanie

| Wersja | Fazy | Checkboxy | Status |
|--------|------|-----------|--------|
| v0.x | 0 | 15/16 | W TRAKCIE |
| v1.0 | 1-7 | 35/123 | W TRAKCIE (FAZA 2.1-2.3 gotowa, 2.4 playbook do zrobienia) |
| v1.5 | 8-11 | 0/30 | - |
| v2.0 | 12-14 | 0/17 | - |
| **TOTAL** | **0-14** | **50/186** | **27%** |

---

*Stworzony: 2026-02-21 (sesja 11)*
*Oparty na: WIZJA.md (sesja 11)*
*Kazdy punkt odpowiada konkretnemu elementowi wizji.*
*Gdy caly plan jest odznaczony [x] - wizja jest zrealizowana.*
