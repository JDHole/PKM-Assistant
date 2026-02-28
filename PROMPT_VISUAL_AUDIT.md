# PROMPT STARTOWY — Visual Audit & Polish (element po elemencie)

> **Skopiuj cala tresc tego pliku i wklej jako pierwsza wiadomosc w nowej rozmowie z agentem AI.**

---

## KIM JESTEM

Jestem JDHole — tworca pluginu Obsek (fork Smart Connections v4.1.7 dla Obsidian). Jestem nie-programista, caly development robie przez vibe-coding z AI. Komunikuje sie po polsku.

## CO ROBIMY

Przegladamy KAZDY element UI pluginu Obsek — porownujemy z Design concept (referencja wizualna) i poprawiamy co trzeba. Robimy to RAZEM, element po elemencie. Ty pokazujesz mi co widzisz w kodzie, ja mowie czy to ok czy trzeba zmienic.

## PLIKI REFERENCYJNE (przeczytaj PRZED praca!)

1. **`Design concept`** (`c:/Users/jdziu/Desktop/Obsek/Design concept` — plik HTML bez rozszerzenia) — TAK MA WYGLADAC PLUGIN. To jest Twoja biblia wizualna.
2. **`PLAN_VISUAL_OVERHAUL_IMPL.md`** — instrukcje implementacji, zasady designu
3. **`MEMORY.md`** albo **`CLAUDE.md`** — kontekst projektu

## ZASADY PRACY

### NAJWAZNIEJSZE: Przegaduj ze mna KAZDY element!
```
1. Powiedz: "Teraz patrzymy na [element]. W kodzie wyglada tak: [opis]"
2. Powiedz czy jest zgodny z Design concept czy nie
3. Jesli nie — powiedz co chcesz zmienic i CZEKAJ na moje OK
4. Dopiero po moim OK — implementuj
5. npm run build — musi sie kompilowac
6. Nastepny element
```

### Kluczowe zasady designu:
- **border-radius: 2px** WSZEDZIE (wyjatkowo 3px). NIGDY 6px, 8px, 10px, rounded
- **Kolory subtelne** — rgba z 6-25% opacity, NIGDY pelna saturacja
- **Markery krysztalne** — nieregularne krysztaly (clip-path polygon), nie zwykle kwadraty rotate(45deg)
- **Shard-style** — left border 3px + kryształowy marker + gradient na gorze
- **Layout kompaktowy** — avatar/info NAD tekstem, nie obok
- **IconGenerator TYLKO** dla skilli, minionow, masterow. Reszta = UiIcons (semantyczne)
- **Przycisk wyslij** = diamond shape (clip-path)
- **Crystal toggles** = diamentowy thumb (rotate 45deg)
- **Emoji w UI = NIE** (tylko w prompt stringach, Logger, config data)
- **Nie nadpisuj zmiennych CSS Obsidiana**
- **CSS classes prefix: cs-*** dla Crystal Soul komponentow

### Czego NIE robic:
- NIE zmieniaj logiki biznesowej
- NIE ruszaj external-deps/
- NIE tworzYnowych plikow JS bez potrzeby
- Po kazdej zmianie: `npm run build` (w folderze `Obsek Plugin/`)

---

## ARCHITEKTURA (skrot)

- Build: `npm run build` w `Obsek Plugin/`
- CSS: `src/views/chat_view.css` (glowny), `src/views/sidebar/SidebarViews.css`, `src/styles.css`
- Crystal Soul: `src/crystal-soul/` (IconGenerator, CrystalGenerator, ColorPalette, UiIcons, ConnectorGenerator, SvgHelper)
- Rendering: Obsidian DOM API (`container.createDiv()`, `createEl()`, `createSpan()`)

---

## CHECKLIST — ELEMENT PO ELEMENCIE

Przejdz przez te elementy w kolejnosci. Przy kazdym:
1. Przeczytaj odpowiedni plik/funkcje
2. Porownaj z Design concept
3. Powiedz mi co widzisz i co jest zle
4. Czekaj na feedback

---

### BLOK 1: CHAT VIEW (najwazniejszy!)

#### 1.1 Wiadomosc uzytkownika (user message)
- **Plik:** `src/views/chat_view.js` → `render_messages()`
- **CSS:** `chat_view.css` → `.cs-message--user`
- **Design concept:** `.msg-user` — align-self flex-end, max-width 72%, border-right 3px, krysztaly marker ::before
- **Sprawdz:**
  - [ ] Wyrownanie do prawej (flex-end)
  - [ ] Max-width 72%
  - [ ] border-right: 3px solid rgba(agent-color, 0.25)
  - [ ] border-radius: 3px 2px 2px 3px (lekka asymetria)
  - [ ] Krysztaly marker po prawej (::before, rotate 45deg, 5x5px)
  - [ ] Tlo: rgba(agent-color, 0.06)
  - [ ] Border: 1px solid rgba(agent-color, 0.15)
  - [ ] Font: 0.76rem, line-height 1.5
  - [ ] Kolory wiadomosci multimodalnych (obrazki)

#### 1.2 Wiadomosc agenta (agent message)
- **Plik:** `src/views/chat_view.js` → `render_messages()`
- **CSS:** `chat_view.css` → `.cs-message--agent`
- **Design concept:** `.msg-agent` — border-left 3px, header z crystal + name, ::before gradient na gorze
- **Sprawdz:**
  - [ ] border-left: 3px solid rgba(agent-color, 0.25)
  - [ ] border-radius: 2px
  - [ ] Header: crystal avatar + nazwa agenta + separator
  - [ ] ::before gradient na gorze (1px, fading right)
  - [ ] Tekst: 0.76rem, line-height 1.65, color fg2
  - [ ] Brak emoji w renderingu (SVG only)
  - [ ] Strong/bold: color fg1

#### 1.3 Typing indicator ("Krystalizuje...")
- **Plik:** `src/views/chat_view.js` → szukaj "Krystalizuje" lub "typing"
- **CSS:** `chat_view.css` → typing-related classes
- **Design concept:** brak bezposredniego odpowiednika — powinno byc subtelne, krysztalne
- **Sprawdz:**
  - [ ] Tekst "Krystalizuje..." (nie "Typing..." ani emoji)
  - [ ] Crystal avatar animowany
  - [ ] Animacja cs-breathing lub cs-crystal-build

#### 1.4 Connector chain (lacznik miedzy akcjami)
- **Plik:** `src/crystal-soul/ConnectorGenerator.js`
- **CSS:** `chat_view.css` → `.cs-connector`
- **Sprawdz:**
  - [ ] Nieregularne krysztaly (polygon clip-path), NIE proste kwadraty
  - [ ] 6 roznych ksztaltow (pryzmat, diament, igla, klaster, heksagon, odlamek)
  - [ ] Linia pionowa + krysztaly dot
  - [ ] Kolory agent-color z niska opacity
  - [ ] Seed-based selection (powtarzalny wzor)

#### 1.5 ToolCallDisplay (rozwijane wiersze narzedzi)
- **Plik:** `src/components/ToolCallDisplay.js` → `createToolCallDisplay()`
- **CSS:** `chat_view.css` → `.cs-action-row`
- **Design concept:** `.exp-row` — border-bottom, hover background, icon+label+time+status+arrow
- **Sprawdz:**
  - [ ] Uzywa .cs-action-row (nie starych klas)
  - [ ] Header: ikona (UiIcons semantic) + label + czas + status crystal + strzalka
  - [ ] Status crystal: done (filled, agent-color) / pending (empty, animowany)
  - [ ] Body: JSON input/output w monospace
  - [ ] Klik = expand/collapse
  - [ ] TOOL_INFO: 22 narzedzia z polskimi nazwami i UiIcons
  - [ ] Fallback na IconGenerator TYLKO dla nieznanych narzedzi

#### 1.6 ThinkingBlock (blok myslenia)
- **Plik:** `src/components/ThinkingBlock.js` → `createThinkingBlock()`
- **CSS:** `chat_view.css` → `.cs-action-row` (shared)
- **Sprawdz:**
  - [ ] Ikona: UiIcons.brain(14)
  - [ ] Label: "Myslenie" / "Myslenie..." (streaming)
  - [ ] Czas elapsed
  - [ ] Status crystal (pending animowany / done filled)
  - [ ] Body: plain text, nie markdown
  - [ ] Strzalka expand/collapse

#### 1.7 SubAgentBlock (minion/master)
- **Plik:** `src/components/SubAgentBlock.js` → `createSubAgentBlock()`
- **CSS:** `chat_view.css` → `.cs-action-row` (shared)
- **Design concept:** `.exp-minion` — border-left 2px zielony, mniejszy font
- **Sprawdz:**
  - [ ] Ikona: IconGenerator (seed-based, connect dla minion, arcane dla master)
  - [ ] Label: "Zadanie miniona [nazwa]" / "Konsultacja z Masterem [nazwa]"
  - [ ] Body: query + response + tool calls + tokeny
  - [ ] Pending state animowany
  - [ ] Error state: czerwony tekst

#### 1.8 Compression block
- **Plik:** `src/views/chat_view.js` → `_renderCompressionBlock()`
- **CSS:** `chat_view.css` → `.pkm-compression-*`
- **Sprawdz:**
  - [ ] Header z ikona (UiIcons.layers)
  - [ ] Rozwijane summary
  - [ ] Emergency mode: czerwony gradient, specjalna ikona
  - [ ] Toggle button

#### 1.9 Welcome message
- **Plik:** `src/views/chat_view.js` → `add_welcome_message()`
- **CSS:** `chat_view.css` → `.pkm-welcome-*`
- **Sprawdz:**
  - [ ] Crystal avatar (nie emoji)
  - [ ] Nazwa agenta
  - [ ] Tekst po polsku
  - [ ] Zgodny z ogolna stylistyka

#### 1.10 Ask User block
- **Plik:** `src/views/chat_view.js` → `_renderAskUserBlock()`
- **CSS:** `chat_view.css` → `.pkm-ask-user-*` / `.ask-user-*`
- **Sprawdz:**
  - [ ] Header z UiIcons.question()
  - [ ] Opcje jako klikalne przyciski
  - [ ] Custom input + submit
  - [ ] border-radius: 2px
  - [ ] Kolory: subtelne, agent-color

#### 1.11 Delegation/Mode change buttons
- **Plik:** `src/views/chat_view.js` → `_renderDelegationButton()`, `_renderModeChangeButton()`
- **CSS:** `chat_view.css` → `.pkm-delegation-*`, `.pkm-mode-proposal-*`
- **Sprawdz:**
  - [ ] Shard-style (left border + gradient)
  - [ ] Emoji w przyciskach (to jest ok — to dane z agenta)
  - [ ] border-radius: 2px
  - [ ] Kolory subtelne

---

### BLOK 2: INPUT AREA

#### 2.1 Input panel (textarea + przyciski)
- **Plik:** `src/views/chat_view.js` → `render_view()` (sekcja input)
- **CSS:** `chat_view.css` → `.cs-input-*`
- **Design concept:** `.chat-input-wrap`, `.ci-field`, `.ci-send`, `.ci-mode`
- **Sprawdz:**
  - [ ] Textarea: border-left 3px agent-color, border-radius 2px, bg0
  - [ ] Focus: border-color intensyfikuje sie
  - [ ] Marker obok inputu (krysztaly 6x6px)
  - [ ] Placeholder po polsku
  - [ ] Przycisk wyslij: DIAMOND SHAPE (clip-path polygon 50% 0, 100% 50%, 50% 100%, 0 50%)
  - [ ] Mode button: maly, border 2px, z kryształowym markerem
  - [ ] Mention chips + attachment chips bar

#### 2.2 Token counter / context circle
- **Plik:** `src/views/chat_view.js` → `_updateContextCircle()`
- **CSS:** `chat_view.css` → `.pkm-context-circle`, `.pkm-donut`
- **Sprawdz:**
  - [ ] SVG donut chart
  - [ ] Widoczny od 50%
  - [ ] Kolory: normal/warning/critical
  - [ ] Font monospace

---

### BLOK 3: TAB BAR (gora chatu)

#### 3.1 Chat tabs (multi-agent)
- **Plik:** `src/views/chat_view.js` → `_renderTabBar()`
- **CSS:** `chat_view.css` → `.cs-chat-topbar`, `.cs-tab`
- **Design concept:** `.chat-topbar` — flex, crystal icon + name + separator + session tag + tokens
- **Sprawdz:**
  - [ ] Tab: crystal avatar (CrystalGenerator) + nazwa agenta
  - [ ] Active tab: podkreslenie agent-color
  - [ ] Separator miedzy elementami (1px linia)
  - [ ] Session tag (border 2px, maly font)
  - [ ] Token count (monospace, prawy margines auto)
  - [ ] + button do nowego agenta
  - [ ] Kontrolki: refresh, save, compress, memory (UiIcons)

---

### BLOK 4: SLIM BAR (prawa strona, 66px)

#### 4.1 Skill bar
- **Plik:** `src/views/chat_view.js` → `_renderSlimBar()`, `renderSkillButtons()`
- **CSS:** `chat_view.css` → `.cs-skillbar`
- **Design concept:** `.skill-bar` — 66px wide, bg1, border-left, sections + grid
- **Sprawdz:**
  - [ ] Szerokosc: 66px
  - [ ] Top: utility buttons (artifacts, new chat, consolidate, save, compress, close)
  - [ ] Bottom: 2-kolumnowy grid skilli
  - [ ] Skill ikony: 28x28px, border rgba(agent, 0.18), border-radius 2px
  - [ ] Tooltip na hover (data-tip, ::after)
  - [ ] Sekcje oddzielone border-bottom
  - [ ] Labels: uppercase, 0.46rem, letter-spacing 0.1em

---

### BLOK 5: SIDEBAR — HOME VIEW

#### 5.1 Agent cards
- **Plik:** `src/views/sidebar/HomeView.js` → `renderAgentCard()`
- **CSS:** `SidebarViews.css` → `.cs-agent-card`
- **Design concept:** `.agent-card` — flex, 10px 12px padding, crystal avatar 28px, left bar ::before, status dot
- **Sprawdz:**
  - [ ] Crystal avatar (CrystalGenerator, 28x28px)
  - [ ] Lewa belka kolorowa (::before, 2px wide, agent-color 35%)
  - [ ] Nazwa: 0.78rem, font-weight 500
  - [ ] Rola: 0.6rem, gray
  - [ ] Status dot: 6x6px, border-radius 50%, agent-color
  - [ ] Hover: background soul, border-color border-vis
  - [ ] border-radius: 3px (wyjatkowo!)

#### 5.2 Communicator section
- **Plik:** `src/views/sidebar/HomeView.js` → `renderCommunicatorSection()`
- **CSS:** `SidebarViews.css` → `.cs-home-section`, `.cs-comm-row`
- **Sprawdz:**
  - [ ] Header z ikona + count badge
  - [ ] Message rows z agent badge
  - [ ] border-radius: 2px

#### 5.3 Agora section
- **Plik:** `src/views/sidebar/HomeView.js` → `renderAgoraSection()`
- **CSS:** `SidebarViews.css` → `.cs-home-section`, `.cs-home-row`
- **Sprawdz:** jak Communicator section

#### 5.4 Zaplecze section
- **Plik:** `src/views/sidebar/HomeView.js` → `renderZapleczeSection()`
- **Sprawdz:** jak powyzej

---

### BLOK 6: SIDEBAR — AGENT PROFILE (8 tabow)

#### 6.1 Profile header + tab bar
- **Plik:** `src/views/sidebar/AgentProfileView.js` → `renderAgentProfileView()`
- **CSS:** `SidebarViews.css` → `.cs-profile__header`, `.cs-profile-tabs`
- **Design concept:** `.cryst-head` — crystal hero 72x88px, breathing animation, progress bar
- **Sprawdz:**
  - [ ] Crystal hero: 72x88px, animacja breathe (8s)
  - [ ] Progress bar: max-width 160px, 2px height, shimmer animation
  - [ ] Nazwa agenta + rola
  - [ ] 8 tabow: Przeglad, Persona, Umiejetnosci, Ekipa, Uprawnienia, Pamiec, Prompt, Zaawansowane
  - [ ] Tab: 0.66rem, border-bottom 2px, agent-color na active
  - [ ] Ikony tabow: UiIcons (eye, user, zap, users, shield, brain, edit, settings)

#### 6.2 Tab: Przeglad (Overview)
- **Plik:** `renderOverviewTab()`
- **CSS:** `.cs-shards`, `.cs-shard`
- **Design concept:** `.shards` — flex column, gap 3px, shard z left-border + marker
- **Sprawdz:**
  - [ ] Grid z cs-shard kartami
  - [ ] Filled: background soul, border-left rgba(agent, 0.25)
  - [ ] Empty: dashed border, opacity 0.7
  - [ ] Marker ::after na lewej krawedzi (5x5px, rotate 45deg)
  - [ ] Top gradient ::before (1px, fading right)
  - [ ] Label: 0.76rem, fg2 | Sub: 0.6rem, gray
  - [ ] Value box: bg0, border 2px, 0.72rem

#### 6.3 Tab: Persona (Profile)
- **Plik:** `renderProfileTab()`
- **CSS:** `.cs-shard__input`, `.cs-shard__select`, `.cs-shard__slider`, `.cs-shard__textarea`
- **Sprawdz:**
  - [ ] Inputy/selecty w shard-style
  - [ ] Textarea: bg0, border 2px, monospace
  - [ ] Slider: custom styling
  - [ ] border-radius: 2px WSZEDZIE

#### 6.4 Tab: Umiejetnosci (Skills) — sub-taby Skille|MCP
- **Plik:** `renderSkillsTab()`, `_renderSkillsGrid()`, `_renderMcpSection()`
- **CSS:** `.cs-profile-tab`, `.cs-shards`, `.cs-shard`
- **Sprawdz:**
  - [ ] Sub-taby: "Skille" | "MCP"
  - [ ] Skills grid: shard karty z IconGenerator ikonami
  - [ ] Filled/Empty state
  - [ ] Klik = toggle assign
  - [ ] Edit button na przypisanych
  - [ ] MCP: lista narzedzi z toggle

#### 6.5 Tab: Ekipa (Team) — miniony + mastery
- **Plik:** `renderEkipaTab()`, `renderDelegateSection()`
- **CSS:** agent-minion-card klasy
- **Sprawdz:**
  - [ ] Dwie sekcje: Miniony | Mastery
  - [ ] Karty delegatow z crystal avatar
  - [ ] Enable/disable toggle
  - [ ] Override panel (skill/model/prompt)
  - [ ] Add new delegate form
  - [ ] UWAGA: klasy `agent-minion-*` nie maja prefixu cs- — do weryfikacji

#### 6.6 Tab: Uprawnienia (Permissions)
- **Plik:** `renderPermissionsTab()`, `renderToggle()`
- **CSS:** `.cs-perm-row`, `.cs-toggle__track`, `.cs-toggle__thumb`
- **Design concept:** `.perm-row`, `.crystal-toggle`
- **Sprawdz:**
  - [ ] Permission row: flex, marker ::before (4x4px rotate 45deg)
  - [ ] On state: marker filled agent-color
  - [ ] Crystal toggle: 38x18px, diamond thumb (10x10px rotate 45deg)
  - [ ] On state thumb: przesuwa sie + agent-color fill
  - [ ] Track ::after: gradient na gorze
  - [ ] Preset buttons: border 2px, crystal marker
  - [ ] Focus folders: chip bar + autocomplete

#### 6.7 Tab: Pamiec (Memory)
- **Plik:** `renderMemoryTab()`, `renderCollapsibleFile()`
- **CSS:** `memory-*` klasy
- **Design concept:** `.mem-card`, `.mem-path`
- **Sprawdz:**
  - [ ] Memory cards: border-left 3px, collapsible
  - [ ] Has-content: agent-color left border
  - [ ] Expand arrow
  - [ ] Markdown preview (Obsidian MarkdownRenderer)
  - [ ] Add forms (dashed border, italic placeholder)
  - [ ] UWAGA: klasy `memory-*` nie maja prefixu cs- — do weryfikacji

#### 6.8 Tab: Prompt
- **Plik:** `renderPromptTab()`
- **CSS:** `dt-*` klasy
- **Sprawdz:**
  - [ ] 8 grup Decision Tree
  - [ ] Toggleable instrukcje
  - [ ] UWAGA: klasy `dt-*` nie maja prefixu cs- — do weryfikacji

#### 6.9 Tab: Zaawansowane (Advanced)
- **Plik:** `renderAdvancedTab()`
- **CSS:** `.cs-shards`, danger zone
- **Sprawdz:**
  - [ ] Model shards (main, minion, master)
  - [ ] Danger zone: delete button z ostrzezeniem
  - [ ] border-radius: 2px

---

### BLOK 7: SIDEBAR — BACKSTAGE VIEWS

#### 7.1 Skills browser
- **Plik:** `src/views/sidebar/BackstageViews.js` → `renderSkillsView()`
- **CSS:** `SidebarViews.css` → `.cs-item-list`, `.cs-item-card`
- **Sprawdz:**
  - [ ] Filter bar z chipami
  - [ ] Search input
  - [ ] Skill cards (name, desc, agent links)
  - [ ] border-radius: 2px

#### 7.2 Tools browser
- **Plik:** `renderToolsView()`
- **CSS:** `.cs-tool-card`, `.cs-tool-group`
- **Sprawdz:**
  - [ ] Grupowane po kategorii
  - [ ] Tool card: icon (UiIcons) + name + label + desc
  - [ ] Agent links

#### 7.3 Minions/Masters browser
- **Plik:** `renderMinionsView()`, `renderMastersView()`
- **Sprawdz:** jak Skills browser

---

### BLOK 8: AGORA VIEW

#### 8.1 Agora tabs (5 tabow)
- **Plik:** `src/views/sidebar/AgoraView.js` → `renderAgoraView()`
- **CSS:** `SidebarViews.css` → `agora-*` klasy
- **Design concept:** brak bezposredniego odpowiednika, ale styl = Crystal Soul
- **Sprawdz:**
  - [ ] 5 tabow: Profil, Aktywnosc, Projekty, Mapa, Dostep
  - [ ] Editable items: inline edit/save/cancel
  - [ ] Projects: task rows z checkboxami, progress bar
  - [ ] Map: folder badges, zone assignment
  - [ ] Access: permission matrix
  - [ ] SVG ikony (UiIcons) zamiast raw SVG
  - [ ] border-radius: 2px WSZEDZIE
  - [ ] UWAGA: klasy `agora-*` nie maja prefixu cs- — do weryfikacji

---

### BLOK 9: COMMUNICATOR VIEW

#### 9.1 Inbox + compose
- **Plik:** `src/views/sidebar/CommunicatorView.js` → `renderCommunicatorView()`
- **CSS:** `SidebarViews.css` → `communicator-*` klasy
- **Design concept:** `.komm-view`, `.komm-tabs`, `.komm-compose`
- **Sprawdz:**
  - [ ] Agent strip (horizontal scroll)
  - [ ] Unread badge
  - [ ] Message cards (from, subject, body, context)
  - [ ] Compose form (textarea + send)
  - [ ] border-radius: 2px WSZEDZIE
  - [ ] UWAGA: klasy `communicator-*` nie maja prefixu cs- — do weryfikacji

---

### BLOK 10: GLOBALNE CSS

#### 10.1 .cs-root zmienne
- **Plik:** `src/styles.css`
- **Sprawdz:**
  - [ ] .cs-root istnieje w styles.css (globalnie)
  - [ ] --cs-fg-rgb, --cs-border, --cs-border-vis, --cs-soul, --cs-soul-vis
  - [ ] .theme-light .cs-root override
  - [ ] NIE MA duplikatu w chat_view.css

#### 10.2 Border-radius audit
- **Plik:** wszystkie CSS
- **Znane problemy (z ostatniego audytu):**
  - chat_view.css: 23 instancje border-radius WIEKSZEGO niz 2px (3px, 6px, 8px, 10px)
  - SidebarViews.css: 4 instancje (3px, 6px)
- **Sprawdz:** czy kazdy border-radius to 2px (lub 3px w agent-card, wyjatkowo)

#### 10.3 Hardcoded colors
- **Znane problemy:**
  - SidebarViews.css linie ~1741-1802: 8 hardcoded hex colors w status badge (.status-success, .status-info, .status-error)
  - styles.css linie ~546-552: 3 hex colors (#ffcccc, #ff0000) — legacy Smart Connections
- **Sprawdz:** zamien na --cs-* lub var(--text-error) itp.

#### 10.4 !important audit
- **Znane problemy:** 18 !important deklaracji (7 chat_view, 1 SidebarViews, 10 styles.css)
- **Sprawdz:** ktore mozna usunac bezpiecznie

#### 10.5 Stare klasy do prefixowania (opcjonalne)
- Klasy BEZ cs- prefixu: `agora-*`, `communicator-*`, `memory-*`, `dt-*`, `agent-minion-*`, `focus-folder-*`
- **To jest DUZE zadanie** — jesli nie mamy czasu, zostawmy na potem
- **Priorytet:** najpierw poprawnosc wizualna, potem naming convention

---

### BLOK 11: ANIMACJE

#### 11.1 Crystal Soul animacje
- **Plik:** `chat_view.css` (definicje @keyframes)
- **Design concept:** breathe, shimmer, spin-slow, pulse-crystal, scan-lines
- **Sprawdz:**
  - [ ] cs-crystal-build — budowanie krysztalu (typing)
  - [ ] cs-glow-pulse — pulsowanie swiatla
  - [ ] cs-send-pulse — puls przycisku wyslij
  - [ ] cs-message-enter — wejscie wiadomosci
  - [ ] cs-connector-pulse — puls connectorow
  - [ ] cs-tab-switch — przesuniecie taba
  - [ ] cs-breathing — oddychanie crystal avatar
  - [ ] breathe (8s) — crystal hero w profilu
  - [ ] shimmer (6s) — progress bar

---

### BLOK 12: MODALE I INNE

#### 12.1 SkillEditorModal
- **Plik:** `src/views/SkillEditorModal.js`
- **Sprawdz:**
  - [ ] SVG section headers
  - [ ] Shard-style formularze
  - [ ] border-radius: 2px

#### 12.2 MinionMasterEditorModal
- **Plik:** `src/views/MinionMasterEditorModal.js`
- **Sprawdz:** jak SkillEditorModal

#### 12.3 Settings tab
- **Plik:** prawdopodobnie w `src/settings.js` lub `styles.css`
- **Sprawdz:**
  - [ ] SVG section headers
  - [ ] Provider dots
  - [ ] border-radius: 2px

---

## PODSUMOWANIE PRIORYTETOW

```
KRYTYCZNE (musi byc idealnie):
1. Wiadomosci chatu (user + agent) — border-radius, kolory, layout
2. Input area — diamond send, shard input
3. Tab bar — crystal avatars, active styling
4. Agent cards — crystal avatar, left bar

WAZNE (powinno byc zgodne):
5. ToolCall / Thinking / SubAgent blocks — cs-action-row
6. Agent Profile tabs — shard grid, crystal toggles, memory cards
7. Slim bar — 66px, grid, tooltips
8. Backstage views — card styling

NICE-TO-HAVE (jesli starczy czasu):
9. CSS naming cleanup (agora-* → cs-agora-*)
10. !important removal
11. Hardcoded colors fix
12. Animation fine-tuning
```

## ZACZNIJ

Przeczytaj Design concept (plik HTML). Potem zacznij od BLOKU 1.1 (wiadomosc uzytkownika). Pokaz mi co widzisz w kodzie i czy jest zgodne z Design concept.

Pamietaj: PRZEGADUJ ze mna KAZDY element. Nie rob zmian bez mojego OK.
