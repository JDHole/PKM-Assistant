# Obsek Plugin - Dziennik Rozwoju (DEVLOG)

> Chronologiczny log wszystkich zmian, decyzji i nowych funkcji.
> Kazdy wpis AI dodaje automatycznie po sesji.

---

## Format wpisu

```
## [DATA] - Krotki opis
**Sesja z:** [ktore AI / narzedzie]
**Co zrobiono:**
- punkt 1
- punkt 2
**Pliki zmienione:**
- `sciezka/do/pliku.js` - co zmieniono
**Decyzje podjete:**
- decyzja i dlaczego
**Nastepne kroki:**
- co robic dalej
```

---

## 2026-02-22 (sesja 25) - FAZA 5: Rozszerzony Chat + Inline Comments

**Sesja z:** Claude Code (Opus 4.6)

**Typ sesji:** Implementacja FAZY 5 (sesja 25) - cala faza w jednej sesji

**Co zrobiono:**

### 5.4 Extended Thinking
- ThinkingBlock.js - zwijany/rozwijalny blok "Myslenie..." z ikona 💭
- chat_view.js: detekcja reasoning_content w handle_chunk, rendering bloku przed trescia
- anthropic.js adapter: obsluga bloków type:"thinking" + thinking_delta
- Ustawienie "Pokaz myslenie AI" (obsek.showThinking) w settings

### 5.5 Animacje CSS
- Streaming shimmer: animowana linia na dole babelka podczas streamowania
- slideDown keyframe na tool call containers
- Pulsujaca animacja na pending tool calls
- Klasa .streaming dodawana/usuwana w handle_chunk/handle_done

### 5.1 Inline Comments
- InlineCommentModal.js - modal z podgladem zaznaczenia + pole "Co zmienic"
- Context menu: "Komentarz do Asystenta" (obok "Wyslij do asystenta")
- sendInlineComment() w main.js - otwiera chat i wysyla sformatowana wiadomosc
- Agent.js: instrukcja KOMENTARZ INLINE w system prompcie

### 5.3 Todo Lists w chacie
- ChatTodoTool.js - MCP tool chat_todo z 5 akcjami (create/update/add_item/remove_item/save)
- ChatTodoList.js - interaktywny widget z checkboxami i paskiem postepu
- Stan w plugin._chatTodoStore (Map), user klika checkboxy bezposrednio
- Tryb "tymczasowy" vs "trwaly" (save do vaulta jako markdown)

### 5.2 Creation Plans
- PlanTool.js - MCP tool plan_action z 3 akcjami (create/update_step/get)
- PlanArtifact.js - widget z numerowanymi krokami, ikonami statusu, przyciskiem "Zatwierdz plan"
- Zatwierdzenie planu auto-wysyla wiadomosc do agenta
- Statusy kroków: pending (○), in_progress (◉ pulsuje), done (✓), skipped (—)

### Fixy po testach (sesja 25b)
- Fix inline comment prompt - uproszczony format (bez "prosze edytuj plik bezposrednio")
- Delegacja + artefakty - aktywne todo/plany automatycznie dolaczane do kontekstu delegacji
- Quick link po vault_write - klikalny link 📄 do pliku w chacie

**Nowe pliki:**
- `src/components/ThinkingBlock.js` - blok myslenia AI
- `src/components/ChatTodoList.js` - widget todo listy
- `src/components/PlanArtifact.js` - widget planu kreacji
- `src/mcp/ChatTodoTool.js` - MCP tool #16
- `src/mcp/PlanTool.js` - MCP tool #17
- `src/views/InlineCommentModal.js` - modal komentarzy inline

**Modyfikowane pliki:**
- `src/views/chat_view.js` - rendering widgetow, thinking block, streaming class, quick links, delegacja+artefakty
- `src/views/chat_view.css` - style: thinking, animacje, todo, plan, vault link
- `src/main.js` - rejestracja 2 nowych tooli, context menu, sendInlineComment
- `src/agents/Agent.js` - system prompt: LISTA ZADAN, PLAN DZIALANIA, KOMENTARZ INLINE
- `src/mcp/MCPClient.js` - ACTION_TYPE_MAP: chat_todo, plan_action
- `src/components/ToolCallDisplay.js` - TOOL_INFO: chat_todo, plan_action
- `src/views/obsek_settings_tab.js` - toggle "Pokaz myslenie AI"
- `external-deps/.../adapters/anthropic.js` - thinking blocks support

**Kluczowe decyzje:**
- Kolejnosc implementacji: 5.4 → 5.5 → 5.1 → 5.3 → 5.2 (od najlatwiejszego do najtrudniejszego)
- Artefakty (todo/plan) trzymane w pamięci pluginu (Map), nie w plikach - szybkie, bez I/O
- Plan zatwierdzany kliknieciem - auto-wysyla wiadomosc do agenta
- Delegacja automatycznie przekazuje aktywne artefakty z ich ID
- Pomysly na przyszlosc zapisane: Agora (5.8), Panel artefaktow (5.7), Manual edit, Alert create/delete (7.1b)

**Stan:**
- MCP tools: 17 total
- Build: 6.7MB
- FAZA 5: prawie DONE (2 backlog items: panel artefaktow, agora)
- Postep PLAN.md: ~130/270 (~48%)

---

## 2026-02-22 (sesja 24) - FAZA 4 fixes: podwojny status, delegacja, UI

**Sesja z:** Claude Code (Haiku 4.5)

**Typ sesji:** Bug fixes + polish (sesja 24)

**Co zrobiono:**

### FAZA 4 Fixes: Komunikator + Delegacja Polishing

Naprawienie problemy z podwojnym statusem wiadomosci, UI layout, debounce renderowan, auto-send delegacji oraz wzmocnienie prompta dla streszczenia kontekstu.

**Modyfikowane pliki:**
- `src/core/KomunikatorManager.js` - dual read status system: NOWA / USER_READ / AI_READ / ALL_READ (backwards compat PRZECZYTANA)
- `src/views/KomunikatorModal.js` - CSS layout fixes (button fit, modal sizing), status dots pokazujace (user read + AI read), debounce renders na komunikator events
- `src/views/AgentSidebar.js` - "Nowy agent" button przenieslony ponad komunikator section, debounce na events (nie duplikaty)
- `src/core/MinionRunner.js` - auto markAsAIRead po inbox processing (AI wiadomosci nie pokazuja sie jako nieprzeczytane)
- `src/mcp/AgentDelegateTool.js` - passes context_summary + from_agent_name do chat_view
- `src/views/chat_view.js` - delegation button: auto-sends "[Delegacja] context_summary" jako pierwsza wiadomosc do nowego agenta
- `src/agents/Agent.js` - silniejszy prompt dla agent_delegate z wytycznymi na context_summary (czym problem sie rozni, co wiesz o kontekscie)

**Kluczowe decyzje:**
- Dual status: USER_READ (user zobaczyl) + AI_READ (AI je przeczytala) - czyznosci agentow vs uzytkownika
- Backwards compatibility: stare PRZECZYTANA zmapowana na ALL_READ
- Debounce: 300ms na sidebar events + 500ms na KomunikatorModal renders - brak duplikatow
- Auto-delegation: nowy agent otrzymuje kontekst AUTOMATYCZNIE jako 1. wiadomosc (nie musi pytac uzytkownika)
- Context summary: AI tworzy streszczenie problemu/zadania przy delegacji (nie wysyla cala histori rozmowy)

**Build:** 6.7MB

**Wersja:** 1.0.6 (bez zmian)

**Nastepne kroki:**
- Test w Obsidianie: komunikacja, delegacja, status icons
- Sprawdzenie duplikatow renderowan (Console.log debounce timing)
- Stabilnosc codziennego uzytku - deadline 2026-02-24

---

## 2026-02-22 (sesja 23) - FAZA 4: Komunikator + Delegacja

**Sesja z:** Claude Code (Opus 4.6)

**Typ sesji:** Implementacja (cala faza w jednej sesji)

**Co zrobiono:**

### FAZA 4: Komunikator + Delegacja (CALA FAZA)

Pelna komunikacja miedzy agentami: wysylanie wiadomosci, delegowanie zadan, inbox z nieprzeczytanymi, UI do zarzadzania komunikacja.

**Nowe pliki:**
- `src/core/KomunikatorManager.js` - zarzadzanie komunikacja miedzy agentami: pliki inbox, parseMessages(), writeMessage(), markAsRead()
- `src/views/KomunikatorModal.js` - pelny UI komunikatora: lista agentow + inbox + compose (tworzenie nowej wiadomosci)
- `src/views/SendToAgentModal.js` - modal wysylania notatki/kontekstu do agenta + menu kontekstowe "Wyslij do asystenta"
- `src/mcp/AgentMessageTool.js` - MCP tool agent_message: wysylanie wiadomosci miedzy agentami
- `src/mcp/AgentDelegateTool.js` - MCP tool agent_delegate: delegowanie zadania innemu agentowi

**Modyfikowane pliki:**
- `src/views/AgentSidebar.js` - sekcja komunikatora z badge'ami nieprzeczytanych wiadomosci
- `src/views/chat_view.js` - przycisk delegacji gdy agent proponuje przelaczenie na innego agenta
- `src/core/MinionRunner.js` - czytanie inbox w auto-prep (minion sprawdza wiadomosci przy starcie sesji)
- `src/agents/Agent.js` - sekcja KOMUNIKATOR w system prompcie (instrukcje uzywania agent_message i agent_delegate)
- `src/main.js` - import + rejestracja agent_message i agent_delegate (15. i 16. MCP tool -> 15 total)
- `src/mcp/MCPClient.js` - agent_message + agent_delegate w ACTION_TYPE_MAP

**Kluczowe decyzje:**
- Komunikacja przez pliki inbox (nie pamiec RAM) - przezywa restart pluginu
- Agent dostaje sekcje KOMUNIKATOR w system prompcie z instrukcjami kiedy uzywac
- Minion czyta inbox przy auto-prep - agent wie o wiadomosciach od samego startu sesji
- Delegacja = propozycja (przycisk w chacie), nie automatyczne przelaczenie

**MCP tools:** 15 total (13 + agent_message + agent_delegate)

**Build:** 6.7MB

**Wersja:** 1.0.5 -> 1.0.6

**Nastepne kroki:**
- Test w Obsidianie: reload, sprawdzenie komunikacji miedzy agentami
- Stabilnosc codziennego uzytku
- FAZA 7.7: Optymalizacja tokenow

---

## 2026-02-22 (sesja 22) - FAZA 3: Agent Manager + Creator

**Sesja z:** Claude Code (Opus 4.6)

**Typ sesji:** Implementacja (cala faza w jednej sesji)

**Co zrobiono:**

### FAZA 3: Agent Manager + Creator (CALA FAZA - 23/24 checkboxow)

Pelna kontrola nad agentami z poziomu UI: tworzenie, edycja, usuwanie, podglad pamieci i statystyk. Tylko Jaskier jako wbudowany agent, Dexter/Ezra to archetypy/szablony.

**Nowe pliki (3):**
- `src/views/AgentProfileModal.js` (~400 linii) - ujednolicony modal do tworzenia i edycji agentow
  - 5 zakladek: Profil, Uprawnienia, Umiejetnosci, Pamiec, Statystyki
  - Tryb tworzenia (agent=null) vs tryb edycji (agent=Agent)
  - Profil: nazwa, emoji, archetyp, rola, osobowosc, temperatura, focus folders, model
  - Uprawnienia: 3 presety (Safe/Standard/Full) + 9 toggleow
  - Umiejetnosci: checkboxy skilli + dropdown minionow + auto-prep toggle
  - Pamiec (tylko edycja): brain.md preview, lista sesji, ladowanie sesji
  - Statystyki (tylko edycja): grid z liczbami sesji/L1/L2/brain size + MCP tools
- `src/views/AgentProfileModal.css` (~200 linii) - style zakladkowego modala
- `src/views/AgentDeleteModal.js` (~90 linii) - potwierdzenie usuwania z archiwizacja pamieci

**Modyfikowane pliki (8):**
- `src/core/AgentManager.js` - nowe metody: updateAgent(), getAgentStats(), archiveAgentMemory(), _recreateJaskierFallback()
- `src/agents/AgentLoader.js` - loadBuiltInAgents() zwraca TYLKO Jaskiera, _mergeBuiltInOverrides(), saveBuiltInOverrides()
- `src/views/AgentSidebar.js` - rewrite: karty agentow z emoji, nazwa, rola, active badge, przyciski profil/usun
- `src/views/AgentSidebar.css` - nowe style kart + modala usuwania
- `src/views/AgentCreatorModal.js` - redirect do AgentProfileModal (backward compat)
- `src/skills/SkillLoader.js` - nowy starter skill: create-agent (Jaskier prowadzi przez tworzenie agenta)
- `src/agents/archetypes/HumanVibe.js` - skill create-agent w domyslnych, zaktualizowana osobowosc
- `src/agents/archetypes/index.js` - usuniete eksporty createDexter/createEzra
- `src/core/MinionLoader.js` - ensureStarterMinions() tworzy tylko jaskier-prep (nie Dexter/Ezra)

**Kluczowe decyzje:**
- Jeden modal do tworzenia i edycji (nie osobne)
- Jaskier jedyny built-in agent; Dexter/Ezra to szablony w archetypach
- Built-in overrides: edycja Jaskiera zapisywana do `_overrides.yaml` (nie modyfikuje JS)
- Fallback: usuniecie ostatniego agenta -> auto-odtworzenie Jaskiera
- Tryb bez agenta (agentless mode) - notatka w PLAN.md na przyszlosc

**Wersja:** 1.0.4 -> 1.0.5
**Build:** 6.6MB (bez zmian)

---

## 2026-02-22 (sesja 21) - FAZA 2.5: Playbook + Vault Map per agent

**Sesja z:** Claude Code (Opus 4.6)

**Typ sesji:** Implementacja

**Co zrobiono:**

### FAZA 2.5: Playbook + Vault Map (CALA FAZA - 11/11 checkboxow)

Kazdy agent dostaje dwa pliki-podręczniki: playbook.md (instrukcje i procedury) i vault_map.md (mapa terenu). Agent NIE nosi ich w system prompcie (za duzo tokenow) - minion czyta je przy auto-prep i wstrzykuje do kontekstu.

**Nowy plik:**
- `src/core/PlaybookManager.js` (~250 linii) - zarzadzanie playbook + vault_map
  - Starter playbooki dla 3 agentow (Jaskier, Dexter, Ezra) - rozne narzedzia, skille, procedury
  - Starter vault mapy dla 3 agentow - rozne strefy dostepu
  - Generic template dla custom agentow
  - readPlaybook() / readVaultMap() - odczyt z dysku
  - ensureStarterFiles() - auto-tworzenie jesli brak

**Modyfikowane pliki (4):**
- `src/core/AgentManager.js` - import PlaybookManager, init w initialize(), tworzenie playbook/vault_map przy createAgent()
- `src/core/MinionRunner.js` - runAutoPrep() czyta playbook + vault_map przez PlaybookManager, wstrzykuje do system promptu miniona
- `src/agents/Agent.js` - lekki pointer do playbooka w system prompcie (6 linii, nie pelna tresc)
- `src/views/chat_view.js` - hot-reload: detekcja edycji playbook.md/vault_map.md przez vault_write

**Architektura:**
- Playbook = "instrukcja obslugi agenta": narzedzia, skille, procedury krok-po-kroku
- Vault Map = "mapa terenu": foldery, strefy dostepu, co gdzie jest
- Sciezki: .pkm-assistant/agents/{name}/playbook.md i vault_map.md
- Minion dostaje pelna tresc w system prompcie przy auto-prep
- Agent dostaje TYLKO pointer (3 linie) - oszczednosc tokenow
- Agent moze poprosic miniona: minion_task(task: "Sprawdz w playbooku jak...")
- Hot-reload: vault_write do playbook/vault_map flaguje _playbookDirty

**Odznaczono takze:** Zmiana domyslnego modelu embeddingów (user ogarnal samodzielnie)

**Build:** 6.6MB - SUKCES

**Wersja po sesji:** 1.0.4

**PLAN.md stan:** 77/263 (29%), FAZA 2 KOMPLETNA (2.1-2.5 DONE)

**Nastepne kroki:**
- Test w Obsidianie: reload, sprawdzenie czy playbook.md/vault_map.md zostaly utworzone
- FAZA 3: Agent Manager + Creator
- Stabilnosc codziennego uzytku

---

## 2026-02-22 (sesja 20) - master_task: 3 tryby wywolania (kontrola miniona)

**Sesja z:** Claude Code (Opus 4.6)

**Typ sesji:** Rozszerzenie + testy

**Co zrobiono:**

### master_task: 3 tryby wywolania

Uzytkownik zauwazyl ze minion w master_task zbiera za malo kontekstu (3-4 zrodla) i agent nie ma kontroli nad procesem. Dodano 2 nowe parametry:

**MasterTaskTool.js:**
- `skip_minion` (boolean) - agent pomija miniona i sam dostarcza kontekst w polu `context`
- `minion_instructions` (string) - agent mowi minionowi JAK szukac (np. "Przeszukaj minimum 10 notatek z folderu Projects/")
- Logika: jesli skip_minion=true → minion sie nie odpala, jesli minion_instructions podane → zastepuja domyslny prompt
- Return value: `minion_skipped` field + odpowiedni `minion_context` message

**Agent.js system prompt:**
- Przepisana sekcja MASTER (EKSPERT) - zamiast jednego sposobu, teraz 3 tryby:
  - Tryb 1 (domyslny): master_task(task) → minion auto-zbiera
  - Tryb 2 (instrukcje): master_task(task, minion_instructions) → minion szuka wg wskazowek
  - Tryb 3 (skip): master_task(task, context, skip_minion: true) → agent sam dostarcza dane
- Konkretne przyklady uzycia kazdego trybu
- Instrukcje KIEDY uzyc ktory tryb

### Testy w Obsidianie (Jaskier)

Jaskier **sam z siebie** przetestowal wszystkie 3 tryby:

1. **Tryb 1** (domyslny): `minion_skipped: false`, `context_gathered: true` - minion zbieralz vaulta
2. **Tryb 2** (instrukcje): `minion_skipped: false`, instrukcje dotarly do miniona (1 plik z Projects/ + dane z memory)
3. **Tryb 3** (skip): `minion_skipped: true`, `minion_context: "(pominiety)"` - Jaskier sam wkleil fragment WIZJA.md, Master dostal precyzyjny kontekst

**Kluczowa obserwacja:** Tryb 3 dal najlepszy wynik - agent sam przygotowujacy kontekst > automatyczny minion. To potwierdza intuicje uzytkownika.

**Pliki zmienione:**
- `src/mcp/MasterTaskTool.js` - 2 nowe parametry (skip_minion, minion_instructions), zmiana logiki miniona
- `src/agents/Agent.js` - przepisana sekcja MASTER w system prompcie (3 tryby z przykladami)

**Build:** 6.6MB - SUKCES

**Decyzje podjete:**
- Agent powinien miec pelna kontrole nad master_task flow (nie tylko auto-pilot)
- 3 tryby daja elastycznosc: lazy (domyslny), precise (instrukcje), manual (skip)
- Minion szuka za plytko (3-4 zrodla) - to kwestia tuningu, nie architektury

**Nastepne kroki:**
- Tuning miniona (wiecej iteracji, lepszy prompt w minion.md)
- FAZA 2.5: Playbook + Vault Map per agent
- Stabilnosc codziennego uzytku

---

## 2026-02-22 (sesja 19) - FAZA 2.4: Architektura 4 modeli + bezpieczenstwo kluczy API

**Sesja z:** Claude Code (Opus 4.6)

**Typ sesji:** Implementacja

**Co zrobiono:**

### Bezpieczenstwo kluczy API (Krok 1)
- `keySanitizer.js` - nowy utility: isProtectedPath() blokuje dostepu do .smart-env/, data.json, .env
- VaultReadTool, VaultListTool, VaultWriteTool - guard na poczatku execute(), blokuje odczyt/zapis/listowanie plikow konfiguracji
- MemoryExtractor.js - nowa sekcja BEZPIECZENSTWO w prompcie ekstrakcji: "NIGDY nie wyciagaj kluczy API, hasel, tokenow"

### Reorganizacja ustawien (Krok 2)
- Kompletne przepisanie obsek_settings_tab.js (~400 linii)
- 6 sekcji: Dostawcy AI, Modele (4 sloty), Embedding, Pamiec, RAG, Informacje
- Sekcja Dostawcy AI: 8 platform (6 API + 2 lokalne), kazda z polem klucza/adresu, statusem, show/hide toggle
- Sekcja Modele: 4 sloty (Main, Minion, Master, Embedding) - dropdown platformy + pole modelu
- Przycisk "Re-indeksuj vault" w sekcji Embedding

### Master model + master_task (Krok 3)
- MasterTaskTool.js - nowy MCP tool (~120 linii po refaktorze)
- Flow: Minion zbiera kontekst → Agent buduje prompt → Master odpowiada → prosto do usera
- Graceful fallback: brak Mastera → blad z instrukcja konfiguracji
- Rejestracja: 13. MCP tool (main.js, MCPClient.js)
- System prompt agenta: sekcja MASTER (EKSPERT) z instrukcjami kiedy uzywac
- ToolCallDisplay: "Konsultacja z ekspertem" (polska etykieta)
- Typing indicator: "Konsultuje z ekspertem..."

### Per-agent model overrides (Krok 4)
- Agent.js: nowe pole `models` z override'ami per rola (main/minion/master)
- yamlParser.js: walidacja pola models w schemacie agenta
- modelResolver.js - nowy centralny utility (~110 linii)
  - createModelForRole(plugin, role, agent, minionConfig)
  - Resolution chain: agent.models.{role} → global obsek → SC platform → null
  - Cache z invalidacja, klucze API ZAWSZE z globalnej puli
- MasterTaskTool.js i MinionTaskTool.js: zamienione lokalne _createModel na modelResolver
- chat_view.js: _getMinionModel() deleguje do modelResolver

### Build + wersja
- Build: 6.6MB (rozmiar bez zmian)
- Version bump: 1.0.2 → 1.0.3
- MCP tools: 13 total (12 + master_task)

**Nowe pliki:** keySanitizer.js, MasterTaskTool.js, modelResolver.js
**Zmodyfikowane pliki:** VaultReadTool, VaultListTool, VaultWriteTool, MemoryExtractor, obsek_settings_tab, main.js, MCPClient, ToolCallDisplay, chat_view, Agent.js, yamlParser, MinionTaskTool, manifest.json, package.json

---

## 2026-02-22 (sesja 18) - Planowanie: 4 modele, rozszerzony chat, multimodal + audyt

**Sesja z:** Claude Code (Opus 4.6)

**Typ sesji:** Czyste planowanie/dokumentacja - ZERO zmian w kodzie

**Co zrobiono:**

### Architektura 4 modeli + Embedding
- Zaprojektowano architekture 4 modeli AI: Main (rozmowa), Minion (tlo), Master (geniusz), Embedding (wektory)
- Master model: drogie, potezne modele (Opus, DeepSeek Reasoner R1) do zlozonych zadan
- Embedding model: oddzielny od chat modelu, dedykowany do wektorow (lokal lub API)
- Dodano do WIZJA.md sekcja 5 "Architektura AI" (rozbudowana z "Architektura 4 modeli")
- Dodano do PLAN.md: FAZA 2.5 Embedding model, FAZA 9 Master model

### Rozszerzony chat (FAZA 5)
- PLAN.md FAZA 5 przemianowana z "INLINE + CREATION PLANS" na "ROZSZERZONY CHAT + INLINE"
- Nowe podsekcje w PLAN.md:
  - 5.3 Todo listy w chacie (5 checkboxow) - interaktywne listy zadan w odpowiedziach AI
  - 5.4 Extended thinking (5 checkboxow) - wyswietlanie reasoning tokens (DeepSeek/Anthropic/OpenAI)
  - 5.5 Animacje i UI chatu (5 checkboxow) - typing effect, smooth scroll, progress bary
- WIZJA.md sekcja 11 przebudowana z "Creation Plans" na "Rozszerzony chat" z mockupami ASCII

### Multimodal (FAZA 14)
- PLAN.md FAZA 14 rozbudowana z 3 do 6 podsekcji:
  - 14.1 Grafika (rozbudowana)
  - 14.2 Image input - zdjecia w chacie (5 checkboxow)
  - 14.3 Video input (5 checkboxow)
  - 14.4 Voice - rozmowa glosowa (5 checkboxow)
  - 14.5 Transkrypcja audio (4 checkboxy)
  - 14.6 Muzyka (rozbudowana)
- WIZJA.md sekcja 14 calkowicie przebudowana z lakonicznego opisu na szczegolowa wizje z przykladami

### Audyt spojnosci WIZJA.md + PLAN.md
Znaleziono i naprawiono 13 problemow:
- Data WIZJA.md: sesja 11 -> sesja 18
- Literowka: "glebokeiego" -> "glebokiego"
- Sciezka skilli: per-agent -> centralna biblioteka
- Lista agentow: Iris -> Dexter + Ezra (faktyczne)
- Diagram architektury: kompletna przebudowa (Master model, nowe UI, MCP tools, SKILLS+MINIONS)
- Milestones sekcja 20: przepisane aby odzwierciedlac faktyczny stan
- PLAN dependency diagram: stara nazwa FAZY 5 -> nowa
- Permission preset: "YOLO" -> "Full" (spojnosc)
- Sekcja 5 przeladowana -> tytulem "Architektura AI" + separatory
- FAZA 3.2: +checkbox tworzenie agenta przez rozmowe z Jaskierem
- FAZA 6.1: +pomoc w konfiguracji minion modelu
- Tabela podsumowania: 54/259 (21%)
- Daty sekcji 21

**Pliki zmienione:**
- `WIZJA.md` - sekcje 3, 4, 5, 8, 11, 14, 19, 20, 21 (rozbudowa + poprawki spojnosci)
- `PLAN.md` - FAZA 2.5, 3.2, 5, 6.1, 9, 14 + tabela + diagram (rozbudowa + poprawki)
- `STATUS.md` - zaktualizowany do sesji 18
- `MEMORY.md` - zaktualizowane statystyki

**Decyzje podjete:**
- Nowe funkcje dodawane do ISTNIEJACYCH faz (nie tworzenie nowych) - zachowanie spojnosci planu
- 4 modele AI to docelowa architektura (Main, Minion, Master, Embedding)
- Extended thinking wyswietlane w zwijanych blokach (nie inline w odpowiedzi)
- Multimodal = daleka przyszlosc (v2.0+) ale warto miec plan

**Nastepne kroki:**
- FAZA 2.4: Playbook + Vault Map (implementacja)
- FAZA 2.5: Embedding model (oddzielny od chat modelu)
- Dalsze testy stabilnosci codziennego uzytku

---

## 2026-02-21 (sesja 17) - Testy miniona + fixy + copy buttons

**Sesja z:** Claude Code (Opus 4.6)

**Co zrobiono:**

### Testy miniona w Obsidianie (4 rundy)
Przetestowano minion_task w Obsidianie. Kazdy test ujawnil problem, kazdy naprawiony na biezaco.

### Fix 1: streamHelper.js - minion podsumowuje wyniki
- Problem: po 3 iteracjach narzedzi minion zwracal statyczny blad "(osiagnieto limit)" zamiast podsumowania
- Fix: dodano ostatnie wywolanie modelu BEZ narzedzi + user message "podsumuj TEKSTEM"
- Minion teraz musi podsumowac co znalazl zanim skonczy

### Fix 2: Agent.js system prompt - 3 iteracje ulepszania
- v1: slabe "masz miniona" - agent robil sam vault_search zamiast delegowac
- v2: wyrazna sekcja `--- MINION (WAZNE!) ---` z listami kiedy delegowac
- v3: KONKRETNY PRZYKLAD (`user pyta "co mam o wakacjach?" -> minion_task(task: "Przeszukaj vault...")`)
- v3 zadzialo - agent od razu delegowal z precyzyjnym zadaniem

### Fix 3: XML hallucination cleanup
- Problem: tanie modele (DeepSeek-chat) halucynuja tagi XML (`<|DSML|function_calls>`) zamiast tool calls
- Fix: regex w streamHelper.js usuwa wzorce DSML, function_calls, invoke z tekstu
- Plus: user message "NIE wywoluj narzedzi" przed ostatnim wywolaniem

### Copy buttons w ToolCallDisplay
- Kopiuj input (clipboard icon per sekcja)
- Kopiuj output (clipboard icon per sekcja)
- "Kopiuj calosc" (guzik na dole rozwinietego tool call)
- Feedback: ikona zmienia sie na checkmark na 1.5s
- Dodano etykiete "Zadanie miniona" do TOOL_INFO map

**Pliki zmienione:**
- `src/memory/streamHelper.js` - final call bez narzedzi + XML cleanup regex
- `src/agents/Agent.js` - system prompt sekcja minion v3 (z przykladem)
- `src/components/ToolCallDisplay.js` - copy buttons + minion_task w TOOL_INFO
- `src/views/chat_view.css` - style dla copy buttons

**Decyzje podjete:**
- Agent musi dostac PRZYKLAD uzycia minion_task (nie ogolne instrukcje) - to jest klucz
- XML hallucination to znany problem tanich modeli - regex cleanup wystarczy
- Copy buttons potrzebne do debugowania (user kopiuje wyniki z Obsidian do Claude Code)

**Uwaga usera na koniec:**
- Agent moze jeszcze lepiej formulowac komendy dla miniona - do dalszego dopracowania przy nastepnych testach

### Fix 4: AgentManager.js - toggle "Pamiec w prompcie" nie dzialal
- Problem: `getActiveSystemPromptWithMemory()` uzywal `this.env?.settings?.obsek` ale AgentManager nie ma `this.env`
- Fix: zmiana na `this.settings?.obsek?.injectMemoryToPrompt`
- Efekt: toggle w ustawieniach teraz faktycznie wlacza/wylacza pamiec w prompcie
- Znalezione przez code review sesji 12-17 (weryfikacja calego commita)

### Dokumentacja: playbook + vault_map w WIZJA.md i PLAN.md
- WIZJA.md sekcja 3: nowa podsekcja "3 kluczowe pliki agenta" (brain.md, playbook.md, vault_map.md)
- WIZJA.md sekcja 5: nowa podsekcja "Minion jako bibliotekarz" (flow krok po kroku)
- PLAN.md: nowa sekcja 2.4 Playbook + Vault Map (10 checkboxow)
- Diagram architektury i sekcja 21 zaktualizowane

**Build:** 6.6MB - SUKCES

**Nastepne kroki:**
- Dalsze testy minion_task z roznymi pytaniami
- Implementacja playbook.md + vault_map.md (PLAN.md 2.4)
- Stabilnosc codziennego uzytku

---

## 2026-02-21 (sesja 16) - FAZA 2: Minion per Agent

**Sesja z:** Claude Code (Opus 4.6)

**Co zrobiono:**

### Notatka o Prompt Caching
- Sekcja 7.6 w PLAN.md: dodano informacje ze prompt caching jest NIEISTOTNY dla projektu
- User uzywa DeepSeek (tanszy niz caching u Anthropic) - AI nie powinno o tym przypominac

### FAZA 2: Minion per Agent (CALA FAZA)

System minionow - kazdy agent moze delegowac ciezka prace do tanszego modelu AI ("miniona").

**Dwa tryby pracy miniona:**
1. **Auto-prep** - TYLKO przy 1. wiadomosci w sesji. Minion skanuje vault i pamiec, daje agentowi kontekst na start rozmowy ("poranna kawa").
2. **minion_task** - MCP tool. Agent SWIADOMIE decyduje kiedy i co delegowac. Daje minionowi dowolne zadanie + narzedzia, minion pracuje i zwraca wynik.

**Podzial pracy agent vs minion (analogia CEO/asystent):**
- Agent robi sam: proste lookup'y (vault_read jednego pliku), interakcje z userem, operacje pamieci
- Agent deleguje minionowi: ciazka praca (przeszukanie wielu plikow), analiza zbiorcza, zbieranie danych z wielu zrodel

**Nowe pliki (3):**
- `src/core/MinionLoader.js` - ladowanie konfiguracji minionow z .pkm-assistant/minions/{name}/minion.md, wzor: SkillLoader. 3 starter miniony w kodzie (jaskier-prep, dexter-vault-builder, ezra-config-scout). Kazdy minion.md ma sekcje: ROLA, NARZEDZIA, PROCEDURA, FORMAT ODPOWIEDZI, OGRANICZENIA.
- `src/core/MinionRunner.js` - silnik wykonania: runAutoPrep() + runTask(). Petla tool-calling (model -> tool_calls -> execute -> feedback -> powtorz). Max iteracji z konfiguracji. Graceful failure (minion padnie -> pusty wynik). Truncowanie wynikow narzedzi (3000 znakow).
- `src/mcp/MinionTaskTool.js` - MCP tool minion_task. Agent podaje zadanie (string) + opcjonalne dodatkowe narzedzia. Standalone _createMinionModel() (nie zalezy od ChatView). Lazy-initialized MinionRunner singleton.

**Modyfikowane pliki (9):**
- `src/agents/Agent.js` - +minion (string), +minionEnabled (bool), serialize, update, getSystemPrompt (info o minionie dla agenta)
- `src/utils/yamlParser.js` - walidacja nowych pol (minion: string, minion_enabled: boolean)
- `src/agents/archetypes/HumanVibe.js` - minion: 'jaskier-prep'
- `src/agents/archetypes/ObsidianExpert.js` - minion: 'dexter-vault-builder'
- `src/agents/archetypes/AIExpert.js` - minion: 'ezra-config-scout'
- `src/memory/streamHelper.js` - nowa funkcja streamToCompleteWithTools() (petla tool-calling)
- `src/core/AgentManager.js` - import MinionLoader, init w initialize(), reloadMinions(), getActiveMinionConfig()
- `src/views/chat_view.js` - _getMinionModel() per agent z cache Map, auto-prep w send_message() (1. wiadomosc), hot-reload minionow
- `src/main.js` - import + rejestracja MinionTaskTool (12. MCP tool)

**Inne:**
- `manifest.json` + `package.json` - wersja 1.0.2
- `PLAN.md` - FAZA 2 checkboxy [x], sekcja 7.6 (prompt caching), tabela wersji, podsumowanie 50/176 (28%)

**Kluczowe decyzje architektoniczne:**
- Miniony to PLIKI na dysku (.pkm-assistant/minions/{name}/minion.md) - nie inline stringi w JS
- YAML frontmatter (name, description, model, tools, max_iterations, enabled) + pelen prompt markdown
- Agent SWIADOMIE deleguje przez minion_task (nie slepy autopilot)
- Auto-prep TYLKO 1. wiadomosc (nie kazda)
- Brak konfliktu z pamiecia: extraction/L1/L2 = post-session, auto-prep = pre-first-msg, minion_task = on-demand
- Model resolution: minionConfig.model -> global obsek.minionModel -> main model
- Graceful failure: minion padnie -> agent odpowiada normalnie

**Bledy naprawione w trakcie:**
- MinionTaskTool: plugin.chatView nie istnieje (ChatView to workspace view). Fix: standalone _createMinionModel() w MinionTaskTool.js

**Build:** npm run build -> 6.6MB - SUKCES

**Wersja po sesji:** 1.0.2

**PLAN.md stan:** 50/176 (28%), FAZA 2 kompletna

**Nastepne kroki:**
- Test w Obsidianie: reload, auto-prep na 1. wiadomosc, minion_task delegowanie
- Sprawdzenie .pkm-assistant/minions/ z 3 starter minionami
- Codzienne uzywanie i lapanie bledow
- Nastepna faza do ustalenia z userem

---

## 2026-02-21 (sesja 15) - FAZA 1: Skill Engine + Reset wersjonowania

**Sesja z:** Claude Code (Opus 4.6)

**Co zrobiono:**

### Reset wersjonowania
- Zmiana z odziedziczonej wersji 4.1.7 (Smart Connections) na wlasne wersjonowanie
- manifest.json + package.json: 4.1.7 -> 1.0.0, potem bump do 1.0.1
- Tabela wersji w PLAN.md z historia zmian
- Daty stabilnosci w PLAN.md (start: 2026-02-21, deadline: 2026-02-24)

### FAZA 1: Skill Engine (CALA FAZA - 15/17 checkboxow)

Centralna biblioteka skilli - agent moze uzywac, tworzyc i edytowac "umiejetnosci" (pliki Markdown z instrukcjami).

**Nowe pliki (3):**
- `src/skills/SkillLoader.js` - centralna biblioteka skilli (.pkm-assistant/skills/), cache, walidacja, 4 starter skille, auto-reload
- `src/mcp/SkillListTool.js` - MCP tool: lista skilli agenta z filtrem po kategorii
- `src/mcp/SkillExecuteTool.js` - MCP tool: aktywacja skilla po nazwie, zwraca pelny prompt

**Modyfikowane pliki (8):**
- `src/agents/Agent.js` - pole skills[], info o skillach w system prompcie, instrukcje tworzenia skilli
- `src/core/AgentManager.js` - SkillLoader init, getActiveAgentSkills(), reloadSkills()
- `src/agents/archetypes/HumanVibe.js` - domyslne skille Jaskiera (4 sztuki)
- `src/views/chat_view.js` - guziki skilli w UI, TOOL_STATUS, auto-reload po vault_write do /skills/, refresh przy zmianie agenta
- `src/views/chat_view.css` - style paska guzikow (pill/chip, hover efekt, scrollowanie)
- `src/main.js` - import + rejestracja skill_list i skill_execute
- `src/mcp/MCPClient.js` - skill_list + skill_execute w ACTION_TYPE_MAP
- `src/components/ToolCallDisplay.js` - polskie nazwy: "Lista umiejetnosci", "Aktywacja skilla"
- `src/utils/yamlParser.js` - walidacja pola skills w validateAgentSchema()

**Kluczowe decyzje architektoniczne:**
- CENTRALNA biblioteka skilli (.pkm-assistant/skills/) - NIE per-agent
- Agent NIE dostaje listy skilli w system prompcie - wie tylko ze ma skill_list i skill_execute
- Aktywacja: guziki w UI + agent sam decyduje przez MCP tool
- Przypisanie skilli do agenta: skills[] w konfiguracji (JS built-in + YAML custom)
- Skille z internetu wymagaja minimalnej adaptacji (~2 min, dodanie naglowka YAML)

**Build:** npm run build -> 6.5MB - SUKCES

**Test w Obsidianie:** SUKCES
- daily-review: Jaskier dokladnie przeszedl notatki z dzisiaj, zadania, zaproponowal priorytety
- vault-organization: mega dokladna analiza struktury vaulta z konkretnymi propozycjami
- Guziki skilli widoczne nad polem do pisania
- User: "To jest rozpierdol mordko jak to dobrze dziala"

**Wersja po sesji:** 1.0.1

**Nastepne kroki:**
- Codzienne uzywanie i testowanie skilli
- Tworzenie wlasnych skilli (user moze sam lub przez agenta)
- FAZA 2: Minion per Agent (po zamknieciu FAZY 0)

---

## 2026-02-21 (sesja 14) - UI feedback + DeepSeek + Optymalizacja lokalnych modeli

**Sesja z:** Claude Code (Opus 4.6)

**Co zrobiono:**

### Nowy wskaznik statusu (typing indicator)
- Wieksze kropki (10px), kolor akcentu, wyzsza opacity (0.5 zamiast 0.25)
- Tekst statusu obok kropek: "Mysle...", "Szukam w vaultcie...", "Czytam notatke..." itp.
- Status zmienia sie dynamicznie podczas tool calls
- "Analizuje wyniki..." po wykonaniu narzedzia, przed odpowiedzia
- Metoda `updateTypingStatus()` pozwala zmieniac tekst bez usuwania wskaznika

### Polskie nazwy narzedzi w Tool Call Display
- vault_search -> "Wyszukiwanie w vaultcie", vault_read -> "Odczyt notatki" itp.
- Wszystkie 9 narzedzi z polskimi etykietami
- Usuniety spam log z ToolCallDisplay

### Optymalizacja systemu promptu dla lokalnych modeli
- Krotsze instrukcje narzedzi gdy platforma = Ollama/LM Studio (~150 tokenow mniej)
- Nowy toggle "Pamiec w prompcie" w ustawieniach (wylacz = -500-800 tokenow)
- Context `isLocalModel` przekazywany do Agent.getSystemPrompt()

### Obsluga DeepSeek (nowy dostawca)
- DeepSeek V3.2 (`deepseek-chat`) przetestowany i dzialajacy
- DeepSeek Reasoner (`deepseek-reasoner`) obslugiwany z reasoning_content
- RollingWindow.getMessagesForAPI() przekazuje `reasoning_content` dla DeepSeek Reasoner
- Fix filtrowania wiadomosci w getMessagesForAPI() (nie pomija tool results i reasoning messages)
- **Fix Reasoner + tool calls:** SC adapter nie zbieralreasonng_content ze streamu -> 400 error
  - Response adapter: `handle_chunk()` teraz akumuluje `delta.reasoning_content` z chunków
  - Response adapter: `_transform_message_to_openai()` dodaje reasoning_content do odpowiedzi
  - Request adapter: `_transform_single_message_to_openai()` wysyla reasoning_content z powrotem do API
  - Plik: `external-deps/jsbrains/smart-chat-model/adapters/deepseek.js`

### Fix nieskonczonej petli L1/L2 konsolidacji
- **Root cause:** `createL1Summary()` failowal -> zwracal null -> while loop nie mial break -> petla
- **Fix:** break gdy createL1Summary/createL2Summary zwroci null, retry przy nastepnej sesji
- Dodano invalidacja cache minion modelu gdy zmienia sie platforma/model

### PLAN.md + WIZJA.md - optymalizacja lokalna
- Nowa podsekcja 7.3 w PLAN.md: "Optymalizacja lokalnych modeli" (8 checkboxow)
- Rozbudowana sekcja 13 w WIZJA.md: strategia adaptive prompt, fallback tool calling, rekomendacje GPU

**Pliki zmienione:**
- `src/views/chat_view.js` - typing indicator, tool call status, DeepSeek reasoning_content, L1/L2 break, minion cache
- `src/views/chat_view.css` - nowe style wskaznika statusu
- `src/components/ToolCallDisplay.js` - polskie nazwy narzedzi
- `src/agents/Agent.js` - krotszy prompt dla lokalnych modeli
- `src/views/obsek_settings_tab.js` - toggle "Pamiec w prompcie"
- `src/core/AgentManager.js` - toggle injectMemoryToPrompt
- `src/memory/RollingWindow.js` - reasoning_content, lepsze filtrowanie wiadomosci
- `external-deps/jsbrains/smart-chat-model/adapters/deepseek.js` - reasoning_content w request + response adapter
- `PLAN.md` - sekcja 7.3 (8 nowych checkboxow)
- `WIZJA.md` - sekcja 13 rozbudowana

**Build:** npm run build -> 6.5MB - SUKCES

**Decyzje podjete:**
- DeepSeek V3.2 jako tanszy zamiennik Claude Sonnet (~17x taniej)
- Optymalizacja lokalnych modeli w FAZA 7 (przed release v1.0)
- deepseek-chat jako rekomendowany model (reasoner opcjonalny)

**Nastepne kroki:**
- Testowanie DeepSeek (chat + reasoner) w codziennym uzyciu
- Codzienne uzywanie i lapanie bledow (3 dni stabilnosci)
- Po zamknieciu FAZY 0 -> FAZA 1 (Skill Engine)

---

## 2026-02-21 (sesja 13) - Auto-foldery + Fix duplikatow sesji + Czysty log konsoli

**Sesja z:** Claude Code (Opus 4.6)

**Co zrobiono:**

### Auto-foldery pamieci agentow
- `AgentManager.createAgent()` teraz tworzy AgentMemory + initialize() dla nowego agenta
- Nowy agent od razu ma gotowa strukture: sessions/, summaries/L1/, summaries/L2/
- Wczesniej foldery tworzone dopiero po restarcie pluginu

### Naprawa duplikatow sesji
**Root cause:** Dwa problemy powodujace tworzenie zduplikowanych plikow sesji:
1. `AgentMemory.saveSession()` zawsze tworzyl nowy plik (nowy timestamp) zamiast nadpisywac istniejacy
2. Auto-save szedl przez SessionManager (shared folder `.pkm-assistant/sessions/`) zamiast AgentMemory

**Fix:**
- Dodano `activeSessionPath` w AgentMemory - kolejne zapisy nadpisuja ten sam plik
- Dodano `startNewSession()` w AgentMemory - resetuje tracker przy nowej sesji/zmianie agenta
- Auto-save przekierowany przez `handleSaveSession()` ktory uzywa AgentMemory (nie SessionManager)
- Czyszczenie timera auto-save w onClose()

### Czysty log konsoli (~70 logow usunietych)
Glowni sprawcy spamu:
- RAGRetriever (9 logow na kazde zapytanie, w petli po sesjach!)
- SessionManager (11 logow na kazdy auto-save co 5 min)
- MCPClient (4 logi na kazdy tool call)
- AgentMemory (13 logow - save, brain update, L1/L2, archive)
- MCP tools (8 plikow, 12 logow na kazde wywolanie narzedzia)
- chat_view.js (12 logow - RAG init, consolidation, permissions)
- AgentManager/Loader (14 logow - startup, switch, reload)
- PermissionSystem, RollingWindow, ToolRegistry, ToolLoader (7 logow)

**Przed:** ~90+ console.log w src/ | **Po:** 24 (jednorazowe, startowe) + 29 console.warn/error (uzasadnione)

**Pliki zmienione:**
- `src/core/AgentManager.js` - createAgent() z AgentMemory, usuniete logi
- `src/memory/AgentMemory.js` - activeSessionPath tracking, startNewSession(), usuniete logi
- `src/memory/SessionManager.js` - usuniete logi (11 sztuk)
- `src/views/chat_view.js` - auto-save przez handleSaveSession(), reset trackera sesji, usuniete logi
- `src/memory/RAGRetriever.js` - usuniete 9 logow
- `src/memory/EmbeddingHelper.js` - usuniety log embed result
- `src/mcp/MCPClient.js` - usuniete 4 logi
- `src/mcp/Vault*.js` (5 plikow) - usuniete logi execute
- `src/mcp/Memory*.js` (3 pliki) - usuniete logi execute
- `src/core/PermissionSystem.js` - usuniety log permission check
- `src/core/ToolRegistry.js` - usuniety log rejestracji
- `src/core/ToolLoader.js` - usuniete 3 logi
- `src/memory/RollingWindow.js` - usuniete 2 logi summarization
- `src/agents/AgentLoader.js` - usuniete 8 logow
- `PLAN.md` - zaktualizowany (14/16 Faza 0)
- `STATUS.md` - zaktualizowany (sesja 13)
- `DEVLOG.md` - ten wpis

**Build:** npm run build -> 6.5MB - SUKCES

**PLAN.md stan:** FAZA 0: 14/16 (zostaly: ikona pluginu + 3 dni stabilnosci)

**Nastepne kroki:**
- Wlasna ikona pluginu
- Codzienne uzywanie i lapanie bledow
- Po zamknieciu FAZY 0 -> FAZA 1 (Skill Engine)

---

## 2026-02-21 (sesja 12) - Rebranding finalny + Chat UI redesign + CSS fix

**Sesja z:** Claude Code (Opus 4.6)

**Co zrobiono:**

### Rebranding "PKM Assistant" (finalny)
- `chat_view.js`: display_text "PKM Assistant", fallback agent name
- `main.js`: komendy "PKM Assistant: Open chat" / "Random note" / "Insert connections"
- `main.js`: ribbon tooltip "PKM Assistant: Open chat"
- `obsek_settings_tab.js`: nazwa taba "PKM Assistant", header, polskie opisy

### Ustawienia po polsku
- Cala zakladka ustawien przepisana: polskie nazwy i opisy
- Sekcje: "Model AI", "Pamiec", "RAG (wyszukiwanie kontekstu)", "Informacje"
- Czytelne nazwy zamiast camelCase: "Platforma", "Temperatura", "Minion (model pomocniczy)"
- Sekcja Informacje: wersja, autor, link do GitHuba

### Chat UI redesign
- Nowy welcome screen: wycentrowany avatar (56px) + nazwa agenta + tekst powitalny
- Header: kompaktowy, ikony zamiast tekstu (⟳ nowa sesja, 💾 zapisz)
- Input area styl ChatGPT: textarea + send button (➤) w jednym zaokraglonym polu
- Babielki: wieksze (85% max-width), zaokraglone (16px), user z accent color + cien
- Avatar asystenta: zaokraglony kwadrat z gradientem
- Timestamp ukryty domyslnie, widoczny na hover
- Tool calls: zaokraglone 10px, czytelniejsze statusy
- Placeholder po polsku: "Napisz wiadomosc..."
- Token counter: subtelny, bez napisu "tokens"

### KRYTYCZNY BUG FIX: CSS nie byl ladowany!
- `chat_view.css` importowany jako CSSStyleSheet ale NIGDY adoptowany do dokumentu
- Chat dzialal caly czas BEZ naszego CSS!
- Fix: `document.adoptedStyleSheets` w `render_view()`

### PLAN.md aktualizacja
- vault_search i vault_delete odznaczone (potwierdzone dzialanie)
- Nazwa PKM Assistant odznaczona
- Testy agentow (Dexter/Ezra) przeniesione do FAZY 3 (Agent Manager)
- Nowy stan: 11/16 w Fazie 0

**Pliki zmienione:**
- `src/views/chat_view.js` - rebranding, redesign UI, CSS adoption fix
- `src/views/chat_view.css` - kompletny redesign (nowoczesny styl)
- `src/views/obsek_settings_tab.js` - polskie nazwy, lepszy layout
- `src/main.js` - rebranding komend i ribbon
- `PLAN.md` - zaktualizowany (11/16 Faza 0, testy agentow -> Faza 3)
- `STATUS.md` - zaktualizowany (sesja 12)
- `DEVLOG.md` - ten wpis

**Build:** npm run build -> 6.5MB - SUKCES

**Nastepne kroki (FAZA 0 - 5 zadan do zamkniecia):**
- Wlasna ikona pluginu
- Kazdy agent auto-tworzy folder pamieci
- Naprawa duplikatow sesji
- Stabilnosc codziennego uzytku (3 dni bez bledow)
- Czysty log konsoli

---

## 2026-02-21 (sesja 11) - Rebranding UI + WIZJA.md + PLAN.md

**Sesja z:** Claude Code (Opus 4.6)

**Co zrobiono:**

### Rebranding UI (Smart Connections -> PKM Assistant / Obsek)

Przegladniecie calego src/ pod katem widocznych referencji "Smart Connections".
Zmienione:
- `src/main.js`: klasa `SmartConnectionsPlugin` -> `ObsekPlugin`, komendy z prefiksem "Obsek:", usuniety SC onboarding (StoryModal), update checker -> JDHole/PKM-Assistant
- `src/views/chat_view.js`: display_text "Obsek", fallback agent name "Obsek"
- `src/components/connections_codeblock.js`: "Obsek Connections", settings tab ID "obsek"
- `src/components/connections-view/v3.js`: link help -> nasz GitHub
- `src/components/connections-settings/header.js`: usuniete "Getting started"/"Share workflow", linki bug/feature -> nasz GitHub
- `package.json`: name, description, author, repo, bugs, homepage

Build: 6.5MB - SUKCES.

### WIZJA.md - pelna wizja produktu (21 sekcji)

Kompletna przebudowa WIZJA.md na podstawie:
- Stara WIZJA.md (nic nie stracone)
- Masywny dump wizji od usera (onboarding, agenci, skille, miniony, marketplace, monetyzacja, mobile, PLLM, multi-modal)
- Badania PLLM (AI PERSONA, PRIME, SimpleMem, Knoll, NoteBar)
- Analiza Pinokio (orkiestrator lokalnych AI)
- Eksploracja vaulta usera (13 agentow, gamifikacja, pracownie)
- 2 rundy Q&A z userem

Sekcje: nazwa, onboarding, agenci, skille, miniony, pamiec, komunikator, agent manager, vault integration, inline, creation plans, mobile, prywatnosc, multi-modal, deep personalization, marketplace, monetyzacja, target users, architektura, milestones, current status.

Weryfikacja: 32/32 punktow z inputu usera pokryte.

### PLAN.md - Master Plan realizacji wizji

Stworzony kompletny plan od FAZY 0 (stabilizacja) do FAZY 14 (multi-modal):
- 15 faz, 154 checkboxy
- Diagram zaleznosci miedzy fazami
- Podzial na wersje: v0.x, v1.0, v1.5, v2.0
- Tabela podsumowujaca postep

### Krytyczny review wizji

Sprawdzona cala WIZJA.md pod katem sensu, wykonalnosci i wewnetrznej spojnosci:
- Skill-based intelligence: MOCNE (realne wyrownanie miedzy modelami)
- Model niezaleznosc: obietnica lekko za mocna (11B nie zrobi glebekiego myslenia)
- Debata agentow: technicznie najtrudniejszy punkt
- Mobile offline: wymaga osobnego frameworka (llama.cpp), nie natywnie w Obsidian
- Zmiana ustawien Obsidiana: brak publicznego API, potrzeba bezposredniego dostepu do .obsidian/
- Brak wewnetrznych sprzecznosci

**Pliki zmienione:**
- `src/main.js` - rebranding (klasa, komendy, onboarding, update checker)
- `src/views/chat_view.js` - rebranding (display_text, fallback name)
- `src/components/connections_codeblock.js` - rebranding (label, settings ID, help link)
- `src/components/connections-view/v3.js` - rebranding (help link)
- `src/components/connections-settings/header.js` - rebranding (buttons, links, modal)
- `package.json` - rebranding (name, desc, author, repo)
- `WIZJA.md` - PRZEBUDOWA (211 -> 668 linii, 21 sekcji)
- `PLAN.md` - NOWY PLIK (Master Plan, 15 faz, 154 checkboxy)
- `STATUS.md` - zaktualizowany (sesja 11)
- `DEVLOG.md` - zaktualizowany (ten wpis)

**Build:** npm run build -> 6.5MB - SUKCES

**Decyzje podjete:**
- WIZJA.md i PLAN.md to "Swiete Grale" projektu - najwazniejsze pliki
- HANDOFF.md zastapiony przez PLAN.md (lepszy format do sledzenia postepu)
- Easy mode onboardingu POZNIEJ (wymaga gotowego SaaS)
- Jaskier jedyny wbudowany agent, reszta to szablony/marketplace

**Nastepne kroki (FAZA 0 - Stabilizacja):**
- Nazwa "PKM Assistant" w tytule chatu i ustawieniach
- Wlasna ikona pluginu
- Test Dextera i Ezry
- Naprawa duplikatow sesji
- Weryfikacja vault_search i vault_delete
- Stabilnosc codziennego uzytku

---

## 2026-02-20 (sesja 10) - Fix: Settings persistence + Minion model

**Sesja z:** Claude Code (Opus 4.6)

**Problem:**
User mial ustawiony Haiku jako minion model w settings, ale Claude Console pokazywala tylko Sonnet. Minion nie byl uzywany.

**Root cause (dwa bugi):**
1. **Settings persistence**: Wszystkie custom ustawienia Obsek (minionModel, enableRAG, maxContextTokens itd.) byly zapisywane na obiekcie `smart_chat_model` ktory jest zarzadzany przez Smart Connections. SC zapisuje TYLKO swoje klucze (`anthropic_api_key`, `anthropic_model`, `temperature`) - nasze custom klucze byly tracone po kazdym restarcie Obsidiana.
2. **Platform detection**: `_getMinionModel()` szukal `settings.platform` ale SC nie zapisuje tego klucza - platforma wynika z nazw kluczy API (`anthropic_api_key` -> anthropic).

**Fix:**
1. Stworzony osobny namespace `env.settings.obsek` w `smart_env.json` dla custom ustawien
2. Auto-detekcja platformy z nazw kluczy API (np. `anthropic_api_key` -> `anthropic`)
3. Wyczyszczone debug logi z konsoli (setki linii `handle_chunk`, `get_chat_model` itd.)

**Pliki zmienione:**
- `src/views/obsek_settings_tab.js` - custom settings -> namespace `obsek`
- `src/views/chat_view.js` - `_getMinionModel()` fix, `get_chat_model()` cleanup, usuniety debug spam
- `src/memory/RAGRetriever.js` - settings z `obsek` namespace
- `src/memory/SessionManager.js` - settings z `obsek` namespace

**Potwierdzone w konsoli:**
```
[ChatView] Minion model created: claude-haiku-4-5-20251001
[ChatView] consolidateSession model: MINION (claude-haiku-4-5-20251001)
```

**Wazna lekcja (Key Architecture Insight):**
- SC's `smart_chat_model` only persists its OWN keys - custom settings MUST use separate namespace
- SC doesn't persist `platform` key - must infer from `{platform}_api_key` names

**Nastepne kroki:**
- Rebranding UI: "Smart Connections" -> "Obsek"
- Weryfikacja pozostalych agentow (Iris, Dexter, Ezra)

---

## 2026-02-20 - Porzadki i system dokumentacji

**Sesja z:** Claude Code (Opus 4.6)

**Co zrobiono:**
- Przeglad calej struktury projektu
- Identyfikacja co dziala a co jest niepewne
- Stworzenie systemu dokumentacji:
  - `STATUS.md` - przenosny kontekst projektu (kopiuj do innych chatow)
  - `DEVLOG.md` - ten plik, dziennik zmian
  - Aktualizacja `CLAUDE.md` - realne MVP zamiast zyczen

**Stan projektu na start:**
- Baza: Smart Connections v4.1.7 (dziala)
- Chat z AI w Obsidianie (dziala)
- AI widzi notatki i tworzy nowe (dziala)
- System agentow, pamieci, uprawnien (istnieje w kodzie, nie zweryfikowane)
- Git zainicjowany, 1 commit, duzo niezapisanego kodu

**Decyzje podjete:**
- Traktujemy obecny kod jako wczesne MVP / fundament
- Nie zakladamy ze cokolwiek poza chatem dziala az nie zweryfikujemy
- Caly development bedzie vibe-codowany z AI
- Dokumentacja ma byc przenoszalna miedzy chatami

**Nastepne kroki:**
- Zweryfikowac co naprawde dziala z istniejacego kodu
- Zabezpieczyc prace na GitHubie (commit + push)
- Zdecydowac o pierwszym celu rozwoju

---

<!-- NOWE WPISY DODAWAJ PONIZEJ TEJ LINII -->

## 2026-02-20 (sesja 9) - Faza 5: Konsolidacja L1/L2 (OSTATNIA FAZA PAMIECI)

**Sesja z:** Claude Code (Opus 4.6)

**Co zrobiono:**

### Faza 5 - Konsolidacja L1/L2 (DONE + TESTED)

Ostatnia brakujaca faza systemu pamieci. Sesje automatycznie kompresuja sie w podsumowania L1/L2.

**AgentMemory.js** - glowne zmiany (~200 linii):
- `this.paths`: weekly/monthly/yearly -> summaries/L1 + summaries/L2
- `initialize()`: tworzenie summaries/L1/ i summaries/L2/
- `_migrateOldFolders()`: jednorazowa migracja weekly/ -> summaries/L1/
- `getMemoryContext()`: czyta z L1 zamiast weekly
- `_parseFrontmatter()`: parser YAML frontmatter (do trackingu sesji w L1)
- `getUnconsolidatedSessions()`: sesje bez L1 (porownuje z frontmatter)
- `getUnconsolidatedL1s()`: L1 bez L2
- `createL1Summary(sessions, chatModel)`: AI kompresuje 5 sesji w L1
- `createL2Summary(l1Files, chatModel)`: AI kompresuje 5 L1 w L2
- Usuniete: createWeeklySummary(), createMonthlySummary() + helpery (martwy kod)
- Import streamToComplete() do wywolan AI

**chat_view.js** - trigger L1/L2:
- Po consolidateSession(), niezaleznie od extraction
- While-loop przetwarza WSZYSTKIE zaleglosci w jednym przebiegu
- Najpierw L1 (po 5 niezesumowanych sesji), potem L2 (po 5 L1)
- Graceful degradation: blad konsolidacji nie blokuje reszty

**MCPClient.js** - fix uprawnien:
- memory_update z read_brain mapowane na vault.read (nie vault.write)
- Wczesniej Jaskier nie mogl czytac brain.md przez MCP

**MemorySearchTool.js** + **MemoryStatusTool.js** - nowe foldery:
- ['weekly','monthly','yearly'] -> ['summaries/L1','summaries/L2']

**Pliki zmienione:**
- `src/memory/AgentMemory.js` - cala logika L1/L2 (~200 linii nowych, ~100 linii usunietych)
- `src/views/chat_view.js` - trigger konsolidacji (~20 linii)
- `src/mcp/MCPClient.js` - fix read_brain permission
- `src/mcp/MemorySearchTool.js` - nowe sciezki
- `src/mcp/MemoryStatusTool.js` - nowe sciezki

**Build:** npm run build -> 6.5MB - SUKCES

**Test w Obsidianie:** SUKCES
- 48 sesji przetworzone automatycznie: 10 plikow L1 + 2 pliki L2
- L1 zawiera sensowne streszczenia (tematy, fakty o userze, decyzje)
- L2 kompresuje 5 L1 w zwiezle podsumowanie
- getMemoryContext() wstrzykuje najnowszy L1 do system promptu
- Jaskier odpowiada z wiedza z L1 (van 2027, 180 dni, Kamil-test)
- read_brain MCP dziala po fixie uprawnien

**Bugi naprawione po drodze:**
1. Early return w extraction skippowal L1/L2 trigger -> wyciagniete z bloku extraction
2. Jeden batch na consolidateSession() -> while-loop przetwarza caly backlog
3. read_brain blokowany przez vault.write permission -> override na vault.read

**FAZY 0-7 KOMPLETNE! System pamieci GOTOWY.**

**Nastepne kroki:**
- Rebranding UI: "Smart Connections" -> "Obsek"
- Testy manualne calego systemu
- Nowe funkcje poza systemem pamieci

---

## 2026-02-20 (sesja 6) - Faza 3: Memory Extraction

**Sesja z:** Claude Code (Opus 4.6)

**Co zrobiono:**

### Implementacja Fazy 3 (~375 linii nowego kodu)

**MemoryExtractor.js** (`src/memory/MemoryExtractor.js` - NOWY PLIK):
- Klasa z metoda `extract(messages, currentBrain, chatModel)`
- Buduje prompt ekstrakcji z MEMORY_DESIGN.md sekcja 5
- Kategoryzuje fakty: [CORE], [PREFERENCE], [DECISION], [PROJECT], [UPDATE], [DELETE]
- Parser odporny na warianty formatu AI (szuka sekcji ## Fakty i ## Streszczenie)
- Uzywa `streamToComplete()` z Fazy 0

**AgentMemory.js rozszerzony:**
- `memoryWrite(updates, activeContextSummary)` - centralna funkcja zapisu pamieci
- `applyBrainUpdates(updates)` - parsuje brain.md na sekcje, aplikuje zmiany
- `_parseBrainSections()` / `_buildBrainFromSections()` - helpery do edycji brain.md
- `_applyAppend()` / `_applyUpdate()` / `_applyDelete()` - operacje na faktach
- `_archiveOverflow()` - przenosi stare fakty do brain_archive.md gdy brain > 2000 znakow
- `_appendAuditLog()` - loguje kazda zmiane do audit.log
- Komentarz `// TODO: autonomy check` jako furtka na Faze 9

**chat_view.js rozszerzony:**
- `consolidateSession()` - orchestracja konca sesji:
  1. Najpierw zapisuje surowa sesje (safety net)
  2. Pobiera brain.md
  3. Wywoluje MemoryExtractor.extract()
  4. Aplikuje wyniki przez agentMemory.memoryWrite()
  5. Graceful degradation: jesli brak modelu lub za malo wiadomosci -> skip
- `_getMinionModel()` - tworzy osobna instancje modelu dla tanszych operacji pamieci
- handleNewSession() -> consolidateSession() zamiast handleSaveSession()
- handleAgentChange() -> consolidateSession() zamiast handleSaveSession()
- Timeout w send_message() -> consolidateSession()
- onClose() -> BEZ ZMIAN (prosty save, bo async extraction nie zdazy)

**obsek_settings_tab.js:**
- Dodane pole "Minion Model" w sekcji Memory System
- Polecany: claude-haiku-4-5-20251001 (12x tanszy od Sonnet)
- Pusty = uzywa glownego modelu

**Pliki zmienione:**
- `src/memory/MemoryExtractor.js` - NOWY PLIK (~160 linii)
- `src/memory/AgentMemory.js` - dodane ~140 linii (memoryWrite, applyBrainUpdates, helpery)
- `src/views/chat_view.js` - dodane ~60 linii (consolidateSession, _getMinionModel, zmienione triggery)
- `src/views/obsek_settings_tab.js` - dodane ~15 linii (pole Minion Model)

**Build:** npm run build -> 6.5MB, auto-kopia do vaultu - SUKCES

**Do przetestowania w Obsidianie:**
1. Porozmawiaj z Jaskierem, podaj imie
2. Kliknij "Nowa rozmowa" -> sprawdz brain.md (czy imie sie pojawilo)
3. Sprawdz active_context.md (streszczenie rozmowy)
4. Sprawdz audit.log (wpisy o zmianach)
5. Nowa rozmowa -> agent powinien Cie pamietac

**Nastepne kroki:**
1. Test w Obsidianie
2. Faza 4: Naprawa Summarizera
3. Faza 5: Konsolidacja L1/L2

---

## 2026-02-20 (sesja 6 ciag dalszy) - Poprawki jakosci ekstrakcji pamieci

**Sesja z:** Claude Code (Opus 4.6)

**Co zrobiono:**

### Test Fazy 3 w Obsidianie - SUKCES
- Memory Extraction przetestowana i DZIALA
- Konsola potwierdza: extraction result, brain updated, consolidation complete
- Jaskier wyciagnal fakty: wzrost, oczy, numer buta, blond wlosy, marzenie o Jarvisie
- Ale znaleziono problemy jakosciowe (duplikaty, forma osobowa)

### Poprawki jakosci (A+B+C)

**A) Lepszy prompt ekstrakcji** (`src/memory/MemoryExtractor.js`):
- Dodane WAZNE ZASADY FORMATOWANIA: wymog 3. osoby ("User ma..." nie "Mam...")
- Dodane WAZNE ZASADY DEDUPLIKACJI: sprawdz Brain przed dodaniem, uzywaj [UPDATE] jesli nowe szczegoly
- Przyklad dobry/zly w prompcie

**B) Fuzzy duplicate detection** (`src/memory/AgentMemory.js`):
- `_applyAppend()` teraz uzywa keyword-based porownania zamiast dokladnego stringa
- `_extractKeywords()` - wyciaga liczby + znaczace slowa (pomija stopwords PL)
- `_keywordsOverlap()` - jesli te same liczby + wspolne slowa → duplikat
- Teraz "Ma 46 numer buta" i "Ma numer buta 46" wykrywane jako duplikat

**C) Posprzatanie brain.md w vaulcie:**
- Usuniety duplikat rozmiaru buta (2 wpisy → 1)
- Znormalizowane do 3. osoby: "User ma 180 cm wzrostu" zamiast "Mam 180 cm wzrostu"

### Analiza pozostalych faz
- Faza 4 (Summarizer): ~70 linii, MEDIUM
- Faza 5 (L1/L2): ~230 linii, MEDIUM-HARD
- Faza 6 (Voice/MCP tools): ~170 linii, SIMPLE (nadaje sie dla slabszych modeli)
- Faza 7 (RAG polish): ~60 linii, SIMPLE (nadaje sie dla slabszych modeli)

**Pliki zmienione:**
- `src/memory/MemoryExtractor.js` - lepszy prompt ekstrakcji (+14 linii)
- `src/memory/AgentMemory.js` - fuzzy dedup: _extractKeywords(), _keywordsOverlap() (+60 linii)
- `.pkm-assistant/agents/jaskier/memory/brain.md` (w vaulcie) - posprzatany

**Build:** npm run build -> 6.5MB - SUKCES

**Nastepne kroki:**
1. Faza 4: Naprawa Summarizera (~70 linii)
2. Faza 7: RAG polish (~60 linii) - Sonnet da rade
3. Faza 6: Voice commands (~170 linii) - Sonnet da rade
4. Faza 5: L1/L2 konsolidacja (~230 linii) - najtrudniejsza, na koniec

---

## 2026-02-20 (sesja 7) - Faza 4: Naprawa Summarizera

**Sesja z:** Claude Code (Opus 4.6)

**Co zrobiono:**

### Faza 4 - Naprawa Summarizera (DONE + TESTED)

**Summarizer.js** (`src/memory/Summarizer.js`):
- Wywalony zepsuty chain `invoke/complete/call` (te metody nie istnieja w SmartChatModel)
- Teraz uzywa `streamToComplete()` z streamHelper.js (ten sam wzorzec co MemoryExtractor)
- Import dodany, kod uproszczony z ~80 linii do ~45 linii

**RollingWindow.js** (`src/memory/RollingWindow.js`) - Layer collision fix:
- Problem: `performSummarization()` doklejala summary do systemPrompt przy kazdej summaryzacji -> systemPrompt rosl w nieskonczonosc
- Fix: rozdzielony na `baseSystemPrompt` (staly: brain + agent context + RAG) i `conversationSummary` (nadpisywany)
- Nowy getter `systemPrompt` sklada oba dynamicznie
- `setSystemPrompt()` zmienia tylko base
- `clear()` czysci tez summary

**chat_view.js** (`src/views/chat_view.js`):
- Import `Summarizer`
- Nowy helper `_createRollingWindow()` - centralnie tworzy RollingWindow z opcjonalnym Summarizerem
- Summarizer uzywa minion modelu (jesli ustawiony) lub glownego modelu
- Wszystkie 4 miejsca tworzenia RollingWindow zamienione na `_createRollingWindow()`
- RAG integration poprawiony: czyta `baseSystemPrompt` zamiast gettera (unikniecie duplikacji summary)

**Pliki zmienione:**
- `src/memory/Summarizer.js` - przepisany na streamToComplete()
- `src/memory/RollingWindow.js` - layer collision fix (baseSystemPrompt + conversationSummary)
- `src/views/chat_view.js` - import Summarizer, _createRollingWindow(), RAG fix

**Build:** npm run build -> 6.5MB - SUKCES

**Test w Obsidianie:** SUKCES
- Summarizer odpala sie przy ~70% limitu tokenow
- Logi: "RollingWindow: Performing summarization..." -> "Summarization complete. History compressed."
- Rozmowa kontynuuje normalnie po kompresji (tool calls, streaming, odpowiedzi)
- Brak layer collision - summary nadpisywane, nie doklejane

**Nastepne kroki:**
1. Faza 7: RAG polish (~60 linii, SIMPLE)
2. Faza 6: Voice commands / MCP tools (~170 linii, SIMPLE)
3. Faza 5: L1/L2 konsolidacja (~230 linii, MEDIUM-HARD)

---

## 2026-02-20 (sesja 8) - Faza 7: RAG Polish + Faza 6: Voice Commands

**Sesja z:** Claude Code (Opus 4.6)

**Co zrobiono:**

### Faza 7 - RAG Polish (DONE)

**RAGRetriever.js** (`src/memory/RAGRetriever.js`):
- Rename `sessionManager` -> `agentMemory` (RAG teraz natywnie wie o AgentMemory)
- Usuniety nieuzywany import `EmbeddingHelper` i zduplikowana metoda `_cosineSimilarity()`
- Usuniety zbedny parametr `vault` z konstruktora
- Plik skurczony z 143 do 120 linii

**chat_view.js** (`src/views/chat_view.js`):
- `ensureRAGInitialized()` uproszczone: przekazuje `agentMemory` bezposrednio, bez fallbacka do SessionManager
- RAG wymaga aktywnego agenta - jesli brak, skip (zamiast fallbacku do starego systemu)

### Faza 6 - Voice Commands / MCP Tools (DONE)

**MemoryUpdateTool.js** (`src/mcp/MemoryUpdateTool.js` - NOWY PLIK, ~100 linii):
- MCP tool `memory_update` z 3 operacjami:
  - `read_brain` - czytaj brain.md
  - `update_brain` - dodaj/aktualizuj fakt (przez AgentMemory.memoryWrite() -> audit trail + fuzzy dedup)
  - `delete_from_brain` - usun fakt z brain.md
- Obsługuje sekcje: ## User, ## Preferencje, ## Ustalenia, ## Bieżące

**MemoryStatusTool.js** (`src/mcp/MemoryStatusTool.js` - NOWY PLIK, ~90 linii):
- MCP tool `memory_status` raportuje:
  - Rozmiar brain (znaki, ~tokeny, linie)
  - Liczba sesji
  - Liczba podsumowań (weekly/monthly/yearly)
  - Rozmiar brain_archive
  - Liczba wpisow audit log

**Agent.js** (`src/agents/Agent.js`):
- Usunięta stara instrukcja "uzywaj vault_write do brain.md" (teraz jest dedykowany memory_update)
- Dodane instrukcje komend pamieciowych w system prompcie:
  - "zapamiętaj że..." -> memory_update(update_brain)
  - "zapomnij o..." -> memory_update(delete_from_brain)
  - "co o mnie wiesz?" -> memory_update(read_brain)
  - "pokaż swoją pamięć" -> memory_status
  - "czy pamiętasz...?" -> memory_search

**main.js** - import + rejestracja memory_update i memory_status
**MCPClient.js** - dodane do ACTION_TYPE_MAP: memory_update -> vault.write, memory_status -> vault.read

### Fix: Crash Obsidian przy starcie (ollama_api_key)

**Problem:** data.json zawierala stara sekcje `smart_chat_threads` z `"adapter": "ollama"` i pustym `"ollama": {}`. SC base code probowal czytac `ollama_api_key` z undefined i crashowal Obsidian.
**Fix:** Usunieta stara sekcja `smart_chat_threads` z data.json - nasz plugin jej nie uzywa.

**Pliki zmienione:**
- `src/memory/RAGRetriever.js` - refactor sessionManager -> agentMemory
- `src/views/chat_view.js` - uproszczone ensureRAGInitialized()
- `src/mcp/MemoryUpdateTool.js` - NOWY PLIK
- `src/mcp/MemoryStatusTool.js` - NOWY PLIK
- `src/agents/Agent.js` - voice commands w system prompcie
- `src/main.js` - rejestracja nowych tools
- `src/mcp/MCPClient.js` - permission map
- `.obsidian/plugins/obsek/data.json` - usuniety smart_chat_threads (crash fix)

**Build:** npm run build -> 6.5MB - SUKCES

**Do przetestowania w Obsidianie:**
1. "Zapamiętaj że lubię kawę" -> agent wywołuje memory_update
2. "Co o mnie wiesz?" -> agent czyta brain.md
3. "Zapomnij o kawie" -> agent usuwa z brain.md
4. "Pokaż swoją pamięć" -> agent pokazuje statystyki

**Nastepne kroki:**
1. Faza 5: L1/L2 konsolidacja (~230 linii, MEDIUM-HARD)
2. Testy manualne Fazy 6 w Obsidianie

---

## 2026-02-20 (sesja 5) - Audit + naprawa sesji + memory_search + ribbon icon

**Sesja z:** Claude Code (Opus 4.6)

**Co zrobiono:**

### Audit calego projektu
- Porownanie biezacego kodu z backupem (Obsek BU) - backup to stary snapshot z 13.01
- Weryfikacja ze prawdziwy vault (Google Drive) ma najnowszy build (6.78MB) - OK
- Weryfikacja planu pamieci (MEMORY_IMPLEMENTATION_PLAN.md) vs kod - Fazy 0-2 DONE, Fazy 3-7 nadal aktualne
- Potwierdzenie ze Sonnet pracowal na wlasciwych plikach

### Naprawa session dropdown (BUG)
**Problem:** Sesje zapisywaly sie do AgentMemory (.pkm-assistant/agents/jaskier/memory/sessions/) ale dropdown czytal z SessionManager (.pkm-assistant/sessions/) - DWA ROZNE foldery!
**Fix:**
- `updateSessionDropdown()` czyta z AgentMemory gdy agent aktywny
- `handleLoadSession()` laduje z AgentMemory gdy agent aktywny
- `handleSaveSession()` aktualizuje dropdown po zapisie przez AgentMemory
- `AgentMemory.loadSession()` przyjmuje string, sciezke lub obiekt {path, name}

### Nowy tool: memory_search (KLUCZOWE)
**Problem:** vault_search uzywal app.vault.getMarkdownFiles() ktore NIE widzi ukrytych folderow (.pkm-assistant). Agent szukal "koszulka" i dostawal 0 wynikow mimo ze info bylo w 8+ sesjach.
**Rozwiazanie:** Osobny tool `memory_search` dedykowany pamieci agenta:
- Przeszukuje sesje, brain.md i podsumowania (weekly/monthly/yearly)
- Uzywa adapter.read() (omija indeks Obsidiana)
- Parametr scope: all/sessions/brain/summaries
- Czysty podzial: vault_search = notatki usera, memory_search = pamiec agenta
**Wynik:** Agent zapytany "jaki mam kolor koszulki?" uzywa memory_search i ZNAJDUJE odpowiedz!

### Ribbon icon Obsek
- Usuniete 3 ikony Smart Connections (connections, lookup, dice)
- Dodana 1 ikona Obsek (buzka) - otwiera chat
- Nowa metoda `open_chat_view()` w main.js

### RAG fix
- `ensureRAGInitialized()` teraz uzywa AgentMemory zamiast SessionManager jako zrodlo sesji

**Pliki zmienione:**
- `src/views/chat_view.js` - session dropdown, load, save, RAG init
- `src/mcp/MemorySearchTool.js` - NOWY PLIK
- `src/mcp/VaultSearchTool.js` - dodano hint w opisie o memory_search
- `src/mcp/MCPClient.js` - plugin jako 3ci arg execute(), memory_search w ACTION_TYPE_MAP
- `src/agents/Agent.js` - system prompt z instrukcjami memory_search
- `src/memory/AgentMemory.js` - loadSession() elastyczniejszy (string/object)
- `src/main.js` - import+rejestracja memory_search, ribbon icon Obsek, open_chat_view()
- `src/utils/add_icons.js` - dodana ikona obsek-icon

**Potwierdzone dzialanie:**
- Session dropdown widzi i laduje sesje z AgentMemory
- memory_search znajduje "pomaranczowa koszulka" w sesjach
- Ribbon icon Obsek otwiera chat

**Nastepne kroki:**
1. Faza 3: Memory Extraction (~450 linii) - minion automatycznie wyciaga fakty do brain.md po sesji
2. Duplikaty sesji - sa pary identycznych plikow (np. 14-45-03 i 14-45-07), do zbadania

---

## 2026-02-20 (sesja 3+4) - Implementacja Faz 0+1+2 systemu pamieci + naprawa src/main.js

**Sesja z:** Claude Code (Sonnet 4.6)

**Co zrobiono:**

### KRYTYCZNA NAPRAWA: src/main.js
Odkryto ze `src/main.js` to byl oryginalny plik Smart Connections bez zadnych customowych komponentow Obsek.
Kazdy `npm run build` tworzyl 882KB (sam SC) zamiast 6.5MB (pelny Obsek).
Naprawiono przez dodanie wszystkich importow i inicjalizacji.

**Dodane importy do src/main.js:**
- `ObsekSettingsTab` (zamiast `ScEarlySettingsTab`)
- `ChatView` (dodany do `item_views`)
- `AgentManager`, `VaultZones`, `PermissionSystem`, `ApprovalManager`
- `ToolRegistry`, `MCPClient`, `ToolLoader`
- `createVaultReadTool`, `createVaultListTool`, `createVaultWriteTool`, `createVaultDeleteTool`, `createVaultSearchTool`
- `registerAgentSidebar` (wywolywany w `onload()`)

**`initialize()` teraz tworzy caly system:**
1. AgentManager (+ `initialize()` tworzy foldery pamieci dla kazdego agenta)
2. VaultZones + PermissionSystem + ApprovalManager
3. ToolRegistry + MCPClient
4. Rejestruje 5 narzedzi vault
5. ToolLoader (wczytuje custom tools)

### Implementacja Faz 0+1+2

**Faza 0 - Stream Helper** (`src/memory/streamHelper.js` - NOWY PLIK):
- Owija `chatModel.stream()` callbacki w Promise
- Potrzebny do Faz 3-5 (AI-driven memory extraction)

**Faza 1 - Brain Boot-up:**
- `AgentMemory.getBrain()` - nowy szablon brain.md z sekcjami: `## User`, `## Preferencje`, `## Ustalenia`, `## Biezace`
- `AgentMemory.getMemoryContext()` - laczy brain + active_context + ostatnie podsumowanie tygodniowe
- `chat_view.js` - uzywa `getActiveSystemPromptWithMemory()` zamiast `getActiveSystemPrompt()`

**Faza 2 - Session Lifecycle:**
- `handleNewSession()` zapisuje sesje przed czyszczeniem
- `handleAgentChange()` async, zapisuje przed zmiana agenta
- `onClose()` zapisuje sesje + removeEventListener beforeunload
- Session timeout detection (30 min domyslnie) w `send_message()`
- Auto-save uzywa prawdziwej nazwy agenta (bylo hardcoded 'default')

### Naprawa narzedzi vault dla ukrytych sciezek

**Problem:** Obsidian nie indeksuje folderow zaczynajacych sie od `.`, wiec `getAbstractFileByPath('.pkm-assistant')` zwraca null.
- Agentowi nie znajdowal swojego brain.md przez vault_read
- Nie mogl zapisac zmian przez vault_write

**Naprawione:**
- `VaultReadTool.js` - fallback do `adapter.read()` gdy plik nie w indeksie
- `VaultListTool.js` - fallback do `adapter.list()` gdy folder nie w indeksie
- `VaultWriteTool.js` - dla sciezek zaczynajacych sie od `.` uzywa `adapter.write()` bezposrednio

### Sciezka brain.md w systemowym prompcie

Dodano instrukcje do `Agent.getSystemPrompt()`:
- Agent dostaje informacje ZE sciezka do jego brain.md jest `.pkm-assistant/agents/{name}/memory/brain.md`
- Agent wie ze moze uzywac `vault_write` z `mode="replace"` do aktualizacji pamieci

**Pliki zmienione:**
- `src/main.js` - KRYTYCZNA NAPRAWA, dodane wszystkie Obsek komponenty
- `src/memory/streamHelper.js` - NOWY PLIK (Faza 0)
- `src/memory/AgentMemory.js` - nowy szablon brain.md, getMemoryContext z active_context (Fazy 1.1, 1.3)
- `src/views/chat_view.js` - session lifecycle (Fazy 1.2, 2.1-2.5)
- `src/mcp/VaultReadTool.js` - wsparcie dla ukrytych sciezek
- `src/mcp/VaultListTool.js` - wsparcie dla ukrytych sciezek
- `src/mcp/VaultWriteTool.js` - wsparcie dla ukrytych sciezek
- `src/agents/Agent.js` - sciezka brain.md w system prompcie
- `manifest.json` - id zmienione z "smart-connections" na "obsek"
- `.env` - DESTINATION_VAULTS zmienione na absolutna sciezke do prawdziwego vaultu
- `esbuild.js` - wsparcie dla absolutnych sciezek, folder "obsek" zamiast "smart-connections"

**Wynik buildu:** 6.5MB (bylo 882KB) - SUKCES

**Potwierdzone dzialanie:**
- brain.md tworzony automatycznie przy starcie pluginu
- Tresc brain.md widoczna w system prompcie (AI pamieata informacje z brain.md)
- Jaskier moze aktualizowac brain.md przez vault_write (ukryte sciezki dzialaja)

**Znane problemy / do debugowania:**
- Zapis sesji do `sessions/` prawdopodobnie nie dziala - brak potwierdzenia, potrzeba logi z konsoli
- Faza 3 (automatyczna ekstrakcja informacji do brain.md przez minion) - jeszcze nie zaimplementowana

**Nastepne kroki:**
1. Debug zapisu sesji (Ctrl+Shift+I w Obsidian, sprawdzic bledy przy klikaniu "Save")
2. Potwierdzic ze brain.md jest poprawnie aktualizowany przez Jaskiera po sesji
3. Implementacja Fazy 3: Memory Extraction (minion wyciaga fakty po sesji)

## 2026-02-20 - Dzien 1: Commit bazowy + naprawa builda

**Sesja z:** Claude Code (Sonnet 4.6)

**Co zrobiono:**
- Zrobiono porzadek z git: commitujemy caly kod ktory istnial ale nie byl w repo
- Wykluczone z repo: external-deps/ (59MB bibl.), jdhole-skills/, jdhole-mcp-servers/ (wlasne git repo)
- Zaktualizowany .gitignore
- PROBLEM ZNALEZIONY: projekt zostal przeniesiony z "Moj dysk" na Desktop, symlinki w node_modules byly zepsute
- NAPRAWIONE: package.json - zmiana sciezek z `file:../` na `file:./external-deps/`
- Usuniete nieistniejace zaleznosci: smart-chunks, smart-instruct-model
- npm install przebudowal symlinki, build dziala
- npm run build: dist/main.js 882kb w 158ms - SUKCES

**Pliki zmienione:**
- `.gitignore` - external-deps/, jdhole-*, dodane do ignorowanych
- `package.json` - naprawione sciezki zaleznosci
- `package-lock.json` - przebudowany po npm install
- 58 nowych plikow src/ i dokumentacja (commit 2)

**Co zostalo POTWIERDZONE:**
- Plugin buduje sie bez bledow (npm run build)
- Plugin kopiuje sie automatycznie do vaultu Obsidiana

**Co NIE ZOSTALO zweryfikowane (nastepny krok):**
- Czy plugin laduje sie w Obsidianie bez bledow
- Czy chat z AI dziala
- Czy system agentow dziala
- Czy MCP, pamiec, uprawnienia dzialaja

**WYNIK TESTOW (w tej samej sesji):**

Plugin odpalony w Obsidianie - doslownie po buildzie. Wynik:
- Plugin laduje sie: TAK
- Indeksuje vault: TAK
- Chat z Jaskierem: TAK (agent gada po polsku, widzi vault)
- Token counter: TAK (6627/100000 widoczne w UI)
- MCP vault_list: TAK (listuje foldery)
- MCP vault_read: TAK (czyta notatki)
- MCP vault_write: TAK (po zatwierdzeniu uprawnien)
- System uprawnien: TAK! (vault_write zablokowany domyslnie, X czerwony, user musi zatwierdzic)
- Notatka stworzona w vaultcie: TAK

Model uzywany: Claude Sonnet 4 (via API)

**Nastepne kroki:**
- Przetestowac pozostalych agentow (Iris, Dexter, Ezra, Silas, Lexie)
- Sprawdzic vault_search i vault_delete
- Przetestowac system pamieci (czy Jaskier pamieata pomiedzy sesjami)
- Sprawdzic Agent Sidebar i Agent Creator Modal
- Zdecydowac o pierwszym celu rozwoju

---

## 2026-02-20 - Design systemu pamieci agentow

**Sesja z:** Claude Code (Opus 4.6)

**Co zrobiono:**
- Pelna analiza istniejacego kodu pamieci (10 plikow w src/memory/)
- Zidentyfikowane co dziala, co jest martwe, co jest zepsute
- Zaprojektowany system pamieci od podstaw (MEMORY_DESIGN.md)
- Stworzony plan implementacji w 8 fazach (MEMORY_IMPLEMENTATION_PLAN.md)
- Plan przeszedl 2 rundy walidacji (analiza kodu + analiza kosztow tokenow)
- Poprawiony plan do wersji 2.0 z naniesionymi uwagami

**Kluczowe decyzje architektoniczne:**
- Pamiec jak ludzki mozg: Identity Core + Brain + Active Context na start (~800 tok)
- RAG na zadanie (stare wspomnienia), archive nigdy nie ladowany
- Konsolidacja OBJETOSCIOWA (co 5 sesji) nie CZASOWA (nie co tydzien)
- Trigger konca sesji: guzik "Nowa rozmowa", powrot po 30min, zamkniecie Obsidiana
- Kontrola usera: automatycznie (default), glosowo ("zapamietaj/zapomnij"), recznie (edycja .md)
- "Minion" - tanszy model do background operacji pamieci (extraction, summarization, konsolidacja)
- Furtki na przyszlosc: poziomy autonomii pamieci, cross-agent memory access

**Znalezione problemy w istniejacym kodzie:**
- Summarizer nigdy nie tworzony, crashowalby (zla metoda API - .invoke() zamiast .stream())
- getActiveSystemPromptWithMemory() istnieje ale nigdy nie wywolywany
- handleNewSession() nie zapisuje sesji przed czyszczeniem
- onClose() nie zapisuje sesji
- handleAgentChange() nie zapisuje sesji
- Auto-save uzywa hardcoded agent name 'default'
- Sekcje brain.md w kodzie nie pasuja do designu

**Pliki stworzone:**
- `MEMORY_DESIGN.md` - pelny design systemu pamieci (10 sekcji)
- `MEMORY_IMPLEMENTATION_PLAN.md` - plan implementacji w 8 fazach (~1145 linii kodu)

**Nastepne kroki:**
- Implementacja Faz 0+1+2 (Stream Helper + Brain Boot-up + Session Lifecycle) ~135 linii
- Potem Faza 3 (Memory Extraction) ~450 linii - serce systemu
- Potem Fazy 4-7 w dowolnej kolejnosci
