# PLAN IMPLEMENTACJI — Visual Overhaul

> **Bliźniaczy plik do:** PLAN_VISUAL_OVERHAUL.md
> **Cel:** Krok-po-kroku instrukcja implementacji kompletnego redesignu UI/UX.
> **Zasada:** Agent implementujący czyta PLAN_VISUAL_OVERHAUL.md jako WIZJĘ (co chcemy), a ten plik jako INSTRUKCJĘ (jak to zrobić).
> **Kontekst:** Sesje 52-54 zrobiły TYLKO zamianę emoji→SVG (IconGenerator). To NIE JEST visual overhaul. Ten plan zaczyna redesign OD ZERA.
> **Referencja wizualna:** Design concept HTML = styl wizualny (angular, crystal markers, shard forms, subtlety). Claude Code = layout/struktura (messages, compactness).

---

## KLUCZOWE ZASADY DESIGNU

### 1. ANGULAR — NIE ROUNDED
- `border-radius: 2px` WSZĘDZIE (wyjątkowo 3px). NIGDY 12px, 16px, okrągłe.
- Kształty ostre, krystaliczne, geometryczne.

### 2. KOLORY — SUBTELNE (rgba)
- Kolor agenta ZAWSZE jako RGB triplet: `--cs-agent-color-rgb: 215, 153, 33`
- Użycie: `rgba(var(--cs-agent-color-rgb), 0.06)` do `rgba(var(--cs-agent-color-rgb), 0.35)`
- Nigdy pełna saturacja w tle/obramówce. Max opacity ~35% na akcentach.
- Tła: 3-8% opacity. Bordery: 15-30% opacity. Glow/shadow: 6-15% opacity.

### 3. MARKERY — NIEREGULARNE KRYSZTAŁY (NIE DIAMENCIKI)
- Dekoracyjne markery to KLUCZOWY element Crystal Soul.
- NIE są to zwykłe diamenty (kwadrat rotate(45deg)). Muszą być **nieregularne**, unikalne, kryształowe.
- ConnectorGenerator.js musi generować nieregularne kryształy (wielokąty, niesymetryczne).
- Rozmiar: 4-6px dla dekoracyjnych, 8-10px dla connectorów.
- Border: 1px solid rgba(agent, 0.3), Fill: rgba(agent, 0.08).

### 4. SHARD-STYLE — LEWY BORDER + KRYSZTAŁ
- Każdy "shard" (formularz, karta) ma: `border-left: 3px solid rgba(agent, 0.2)` + reszta `1px solid var(--border)`.
- Element `::after` = kryształowy marker na lewym borderze (pozycja absolute).
- Element `::before` = subtelny gradient na górze (1px height, zanikający w prawo).
- Filled vs Empty: filled ma tło + border, empty ma dashed border + mniejsze opacity.

### 5. LAYOUT — KOMPAKTOWY (CLAUDE CODE)
- Wiadomości usera: LEWA strona, glow w kolorze agenta — pozostaje jak jest, ale angular.
- Agent response: avatar/info NAD tekstem, NIE obok. Kompaktowo.
- Brak rozlazłych prostokątnych okienek — subtelne, delikatne separatory.
- Mało miejsca w sidebarze — każdy pixel się liczy.

### 6. IKONGENERATOR — SCOPE
- **IconGenerator.js** zostaje dla: skilli, minionów, masterów (seed-based wariacje).
  - Miniony: zmodyfikować generator żeby wszystkie miały CHARAKTERYSTYCZNY styl minionowy.
  - Masterzy: analogicznie, inny styl niż miniony.
- **UiIcons.js** — WSZYSTKIE przyciski UI, nagłówki, toolbar, statusy, nawigacja.
- **MCP tools** — semantyczne UiIcons (search→search, brain→brain, file→file).

---

## STAN WYJŚCIOWY — CO MAMY TERAZ

### Pliki do zmiany (kluczowe):
- `src/views/chat_view.js` (~3065 linii) — główny widok czatu
- `src/views/chat_view.css` (~900 linii) — style czatu
- `src/views/sidebar/AgentProfileView.js` (~900 linii) — profil agenta (6 tabów, Obsidian Setting API)
- `src/views/sidebar/HomeView.js` (~350 linii) — sidebar z kartami agentów
- `src/views/sidebar/BackstageViews.js` (~400 linii) — zaplecze (skille, miniony, masterzy)
- `src/views/sidebar/AgoraView.js` (~300 linii) — agora
- `src/views/sidebar/CommunicatorView.js` (~200 linii) — komunikator
- `src/views/sidebar/SidebarViews.css` — style sidebara
- `src/views/obsek_settings_tab.js` — ustawienia pluginu
- `src/components/ToolCallDisplay.js` (~180 linii) — wyświetlanie tool calls
- `src/components/ThinkingBlock.js` (~90 linii) — blok myślenia
- `src/components/SubAgentBlock.js` (~100 linii) — blok miniona/mastera
- `src/crystal-soul/` — generatory (IconGenerator, CrystalGenerator, ColorPalette, UiIcons, ConnectorGenerator, SvgHelper)
- `src/styles.css` — globalne style

### Co działa (zachowujemy logikę, zmieniamy wygląd):
- RollingWindow, Summarizer, AgentMemory — pamięć
- MCPClient, PromptBuilder — narzędzia i prompty
- AgentManager — zarządzanie agentami
- WorkMode — tryby pracy
- AttachmentManager, MentionAutocomplete — input
- TokenTracker — licznik tokenów
- Cała logika streamu, tool calling, delegacji

### Co z sesji 52-54 ZACHOWUJEMY:
- `CrystalGenerator.js` — generowanie kryształów agentów (OK)
- `ColorPalette.js` — 62 kolory (OK)
- `UiIcons.js` — semantyczne SVG ikony (~40+) — DOBRE, używamy do UI
- `SvgHelper.js` — helpery (OK)

### Co z sesji 52-54 WYRZUCAMY / ZASTĘPUJEMY:
- **IconGenerator.js w kontekście UI** — STOP używania abstrakcyjnych kształtów do przycisków/nagłówków.
- IconGenerator zostaje TYLKO do: ikony skilli, ikony minionów, ikony masterów.
- Wszędzie indziej → UiIcons.
- **ConnectorGenerator.js** — PRZEPISAĆ na nieregularne kryształy (nie diamenciki).

---

## ZMIENNE CSS — FUNDAMENT DESIGN SYSTEMU

Zanim zaczniemy jakąkolwiek fazę, zdefiniuj bazowe zmienne CSS.
Każdy komponent będzie ich używał.

**Plik: src/styles.css (lub src/crystal-soul/theme.css)**

```css
/* ===== CRYSTAL SOUL DESIGN SYSTEM — CSS Variables ===== */

/* Odziedziczone z Obsidiana: --background-primary, --background-secondary, --text-normal, --text-muted, --text-faint */
/* NIE nadpisujemy zmiennych Obsidiana! Dodajemy WŁASNE. */

/* Agent color — ustawiany per komponent via JS: el.style.setProperty('--cs-agent-color-rgb', '215, 153, 33') */
/* Użycie: rgba(var(--cs-agent-color-rgb), 0.06) */

/* Derived Crystal Soul colors */
.cs-root {
  --cs-border: rgba(var(--cs-fg-rgb, 235, 219, 178), 0.08);
  --cs-border-vis: rgba(var(--cs-fg-rgb, 235, 219, 178), 0.14);
  --cs-soul: rgba(var(--cs-fg-rgb, 235, 219, 178), 0.04);
  --cs-soul-vis: rgba(var(--cs-fg-rgb, 235, 219, 178), 0.08);
}

/* W jasnym motywie: inna baza */
.theme-light .cs-root {
  --cs-fg-rgb: 40, 40, 40;
}
```

**WAŻNE:** W JS przy ustawianiu koloru agenta, ZAWSZE konwertuj hex→rgb triplet:
```javascript
// Helper — dodaj do SvgHelper.js lub nowy utils:
function hexToRgbTriplet(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}
// Użycie:
el.style.setProperty('--cs-agent-color-rgb', hexToRgbTriplet(agent.color));
```

---

## ZASADY IMPLEMENTACJI

### 1. Rendering pattern
- Obsidian DOM API: `container.createDiv()`, `createEl()`, `createSpan()` — zachowujemy
- innerHTML TYLKO dla SVG (bo to string) — zachowujemy
- **NIGDY** nie piszemy raw CSS w JS (style.cssText) — wszystko w plikach CSS
- Jedyny wyjątek: `style.setProperty('--cs-agent-color-rgb', ...)` dla custom properties

### 2. Kolejność zmian w każdym kroku
1. Najpierw CSS (nowa klasa / zmienione reguły)
2. Potem JS (nowa struktura DOM)
3. Potem test (npm run build + sprawdź w Obsidian)

### 3. Konwencja nazw CSS
- Prefix `cs-` dla Crystal Soul elementów
- BEM-lite: `.cs-chat-message--user`, `.cs-shard--filled`, `.cs-action-row__header`

### 4. Build & test
- `npm run build` po każdym kroku — musi się buildować (0 errors)
- Testuj w Obsidian po każdym kroku (dark + light mode)

---

## FAZA 0: PORZĄDKI — Zamiana IconGenerator→UiIcons w UI + ConnectorGenerator

> **Cel:** Usunąć abstrakcyjne kształty z przycisków. Zostawić IconGenerator TYLKO dla skill/minion/master ikon. Przepisać ConnectorGenerator na nieregularne kryształy.
> **Pliki:** chat_view.js, AgentProfileView.js, HomeView.js, BackstageViews.js, AgoraView.js, CommunicatorView.js, ToolCallDisplay.js, ThinkingBlock.js, SubAgentBlock.js, ConnectorGenerator.js + modale

### Krok 0.1: Mapowanie IconGenerator → UiIcons

Znajdź KAŻDE użycie `IconGenerator.generate(` w kodzie (poza skill/minion/master buttonami) i zamień na odpowiednią ikonę z UiIcons:

```
OBECNE UŻYCIE → ZAMIANA (UiIcons)
─────────────────────────────────────────────────────────────────────
chat_view.js:
  permissionsBtn → UiIcons.shield(16)
  memoryBtn → UiIcons.brain(14)
  compressionBlock → UiIcons.layers(14)
  toolbar: artifactBtn → UiIcons.clipboard(18)
  toolbar: skillsBtn → UiIcons.lightning(18)
  toolbar: oczkoBtn → UiIcons.eye(18)
  toolbar: modeBtn → per tryb: chat(16)/clipboard(16)/tool(16)/sparkles(16)
  skillPreQuestions title → IconGenerator OK (to jest skill ikona)
  skillButtons → IconGenerator OK (to jest skill ikona)

AgentProfileView.js:
  tab icons → UiIcons: eye/user/users/lightning/shield/brain/edit/settings
  nagłówki sekcji → UiIcons odpowiednie

HomeView.js:
  agents_header → UiIcons.users(16)
  sekcja komunikatora → UiIcons.chat(16)
  sekcja agory → UiIcons.globe(16)
  sekcja zaplecza → UiIcons.tool(16)

ToolCallDisplay.js:
  getToolIcon() → NOWE semantyczne UiIcons per tool (patrz Krok 1.3)

ThinkingBlock.js:
  thinking icon → UiIcons.brain(16)

SubAgentBlock.js:
  minion icon → IconGenerator OK (specjalny styl minionowy)
  master icon → IconGenerator OK (specjalny styl masterowy)
```

### Krok 0.2: Uzupełnij brakujące UiIcons

Sprawdź czy UiIcons.js ma wszystkie potrzebne ikony. Jeśli brakuje, dodaj:
- `shield` — uprawnienia
- `eye` — oczko/podgląd
- `compass` — nawigacja
- `users` — lista agentów
- `globe` — agora
- `tool` / `wrench` — narzędzia/zaplecze
- `layers` — kompresja/warstwy
- `chart` — statystyki
- `sparkles` — tryb kreatywny
- `settings` — zaawansowane/ustawienia
- `at` — mentions (@)
- `crown` — master
- `robot` — minion (alternatywnie: specjalny IconGenerator styl)
- `folder` — vault list
- `file` — vault read
- `x` — zamknięcie

### Krok 0.3: Przepisz ConnectorGenerator.js na nieregularne kryształy

**KLUCZOWE:** Obecny ConnectorGenerator tworzy zwykły diamencik (polygon 5,0 10,5 5,10 0,5). To za proste.

Nowy ConnectorGenerator musi tworzyć NIEREGULARNE mini-kryształy. Podejścia:
1. **Zestaw 4-6 predefiniowanych kształtów** — losowany z seed (nazwa agenta).
2. Każdy kształt to SVG polygon z niesymetrycznymi punktami.
3. Rozmiar: 8-10px dla connectorów, 4-6px dla dekoracyjnych markerów.

```javascript
// ConnectorGenerator.js — NOWY
export class ConnectorGenerator {
  // 6 predefiniowanych nieregularnych kształtów kryształu
  static CRYSTAL_SHAPES = [
    // Odłamek (asymetryczny, ostry)
    '2,0 8,2 10,7 6,10 0,8 1,3',
    // Igła (długi, wąski)
    '5,0 9,3 7,10 3,10 1,3',
    // Klaster (wielopunktowy)
    '3,0 7,1 10,4 8,8 5,10 1,7 0,3',
    // Pryzmat (trójkątny z odchyleniem)
    '5,0 10,6 7,10 2,10 0,4',
    // Kryształ podwójny (dwa szczyty)
    '3,0 7,0 10,5 7,10 3,10 0,5',
    // Odłamek II (krótki, szeroki)
    '1,1 6,0 10,3 9,8 4,10 0,6',
  ];

  static create(color = 'currentColor', isActive = false, seed = '') {
    const el = document.createElement('div');
    el.className = 'cs-connector' + (isActive ? ' cs-connector--active' : '');

    // Wybór kształtu z seed
    const idx = hashSeed(seed) % this.CRYSTAL_SHAPES.length;
    const shape = this.CRYSTAL_SHAPES[idx];

    el.innerHTML = `
      <div class="cs-connector__crystal">
        <svg viewBox="0 0 10 10" width="10" height="10">
          <polygon points="${shape}"
            fill="rgba(${color}, 0.08)"
            stroke="rgba(${color}, 0.3)" stroke-width="0.8"/>
        </svg>
      </div>
      <div class="cs-connector__line"></div>
    `;
    return el;
  }

  // Mały marker dekoracyjny (4-6px, do shard ::after itd.)
  static createMarker(color, seed = '') {
    const idx = hashSeed(seed) % this.CRYSTAL_SHAPES.length;
    const shape = this.CRYSTAL_SHAPES[idx];
    return `<svg viewBox="0 0 10 10" width="5" height="5">
      <polygon points="${shape}" fill="rgba(${color}, 0.08)" stroke="rgba(${color}, 0.3)" stroke-width="1"/>
    </svg>`;
  }
}
```

**UWAGA:** Kryształowe markery CSS (`::after` pseudo-elementy) mogą być prostsze — użyj `clip-path` z nieregularnym wielokątem zamiast zwykłego `rotate(45deg)`:
```css
/* Marker kryształowy — clip-path zamiast rotate(45deg) */
.cs-marker {
  width: 5px;
  height: 6px;
  clip-path: polygon(30% 0%, 100% 20%, 80% 100%, 0% 70%);
  background: rgba(var(--cs-agent-color-rgb), 0.12);
  border: 1px solid rgba(var(--cs-agent-color-rgb), 0.3);
}
```

### Krok 0.4: Modyfikacja IconGenerator dla minionów i masterów

**Cel:** Miniony mają CHARAKTERYSTYCZNY styl (np. mniejsze, bardziej fragmentaryczne kształty), Masterzy mają inny (np. większe, bardziej symetryczne, z "koroną").

W IconGenerator.js dodaj nowe kategorie lub modyfikatory:
- `generate(seed, 'minion', opts)` → generuje w stylu "fragment/odłamek"
- `generate(seed, 'master', opts)` → generuje w stylu "kompletny/majestatyczny"

### Krok 0.5: Wykonaj zamianę

W każdym pliku: zamień `IconGenerator.generate()` na `UiIcons.xxx()` tam gdzie to konieczne. Tam gdzie IconGenerator nie jest już potrzebny — usuń import.

**WYJĄTKI — IconGenerator ZOSTAJE:**
- `renderSkillButtons()` w chat_view.js — ikony skilli
- `_showSkillPreQuestions()` — tytuł skilla
- SubAgentBlock.js — ikony minionów i masterów
- Slim bar skill ikony
- AgentProfileView: skill grid, minion/master karty

---

## FAZA 1: REDESIGN CHATU — Struktura (A1 + A2/A3)

> **Cel:** Kompletnie nowy layout wiadomości łączący layout Claude Code z visual language Design concept.
> **Pliki:** chat_view.js (render_messages, render_view), chat_view.css, ToolCallDisplay.js, ThinkingBlock.js, SubAgentBlock.js, ConnectorGenerator.js

### Krok 1.1: Nowa struktura wiadomości — CSS

**Plik: chat_view.css**

```css
/* ===== CRYSTAL SOUL CHAT v3 ===== */

/* Kontener wiadomości */
.cs-chat-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ─── USER MESSAGE ─── */
/* Lewa strona, glow w kolorze agenta, angular */
.cs-message--user {
  max-width: 80%;
  align-self: flex-start;
  padding: 10px 14px;
  background: rgba(var(--cs-agent-color-rgb), 0.06);
  border: 1px solid rgba(var(--cs-agent-color-rgb), 0.15);
  border-left: 3px solid rgba(var(--cs-agent-color-rgb), 0.25);
  border-radius: 2px;
  font-size: 0.76rem;
  line-height: 1.5;
  color: var(--text-normal);
  position: relative;
  /* GLOW — subtelny, w kolorze agenta */
  box-shadow: 0 0 12px rgba(var(--cs-agent-color-rgb), 0.08),
              inset 0 0 20px rgba(var(--cs-agent-color-rgb), 0.03);
}

/* Kryształowy marker na lewym borderze usera */
.cs-message--user::after {
  content: '';
  position: absolute;
  left: -4px;
  top: 50%;
  width: 5px;
  height: 6px;
  transform: translateY(-50%);
  clip-path: polygon(30% 0%, 100% 20%, 80% 100%, 0% 70%);
  background: rgba(var(--cs-agent-color-rgb), 0.12);
}

/* Subtelny gradient na górze */
.cs-message--user::before {
  content: '';
  position: absolute;
  top: 0;
  left: 3px;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, rgba(var(--cs-agent-color-rgb), 0.1), transparent 60%);
}

/* Hover: timestamp + akcje */
.cs-message--user .cs-message__meta {
  display: none;
  position: absolute;
  top: -20px;
  right: 0;
  font-size: 0.58rem;
  color: var(--text-faint);
  gap: 8px;
}
.cs-message--user:hover .cs-message__meta {
  display: flex;
}

/* ─── AGENT MESSAGE ─── */
/* Zawiera: header (avatar+nazwa), chain (akcje), text (odpowiedź) */
.cs-message--agent {
  border: 1px solid var(--cs-border, rgba(235,219,178,0.08));
  border-left: 3px solid rgba(var(--cs-agent-color-rgb), 0.25);
  border-radius: 2px;
  position: relative;
  overflow: hidden;
}

/* Subtelny gradient na górze bloku agenta */
.cs-message--agent::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, rgba(var(--cs-agent-color-rgb), 0.1), transparent 60%);
}

/* Header agenta — kryształ + nazwa + czas. NAD tekstem. */
.cs-message__agent-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--cs-border, rgba(235,219,178,0.08));
  font-size: 0.68rem;
  color: var(--text-muted);
}

.cs-message__agent-crystal {
  width: 16px;
  height: 16px;
  opacity: 0.7;
  flex-shrink: 0;
}

.cs-message__agent-name {
  font-weight: 500;
  color: var(--text-normal);
  font-size: 0.72rem;
}

/* Tekst odpowiedzi agenta */
.cs-message__text {
  padding: 10px 14px;
  font-size: 0.76rem;
  line-height: 1.65;
  color: var(--text-normal);
}

/* Hover meta */
.cs-message--agent .cs-message__meta {
  display: none;
  padding: 4px 12px 8px;
  font-size: 0.58rem;
  color: var(--text-faint);
  gap: 8px;
}
.cs-message--agent:hover .cs-message__meta {
  display: flex;
}

/* ─── EXPANDABLE ACTION ROWS ─── */
/* Thinking, tool call, minion, master — wewnątrz bloku agenta */
.cs-action-row {
  border-bottom: 1px solid var(--cs-border, rgba(235,219,178,0.08));
  cursor: pointer;
  transition: background 0.2s;
}
.cs-action-row:last-of-type {
  border-bottom: none;
}
.cs-action-row:hover {
  background: rgba(var(--cs-agent-color-rgb), 0.04);
}

.cs-action-row__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  font-size: 0.66rem;
  color: var(--text-muted);
}

.cs-action-row__icon {
  width: 14px;
  height: 14px;
  opacity: 0.5;
  flex-shrink: 0;
}

.cs-action-row__label {
  flex: 1;
  font-size: 0.68rem;
}

.cs-action-row__time {
  font-size: 0.58rem;
  color: var(--text-faint);
  font-family: monospace;
}

/* Status marker — kryształowy (nie diamencik!) */
.cs-action-row__status {
  width: 6px;
  height: 6px;
  clip-path: polygon(30% 0%, 100% 20%, 80% 100%, 0% 70%);
  flex-shrink: 0;
}
.cs-action-row__status--done {
  border: 1px solid rgba(var(--cs-agent-color-rgb), 0.4);
  background: rgba(var(--cs-agent-color-rgb), 0.12);
}
.cs-action-row__status--pending {
  border: 1px solid var(--cs-border, rgba(235,219,178,0.08));
  animation: cs-crystal-pulse 2s ease-in-out infinite;
}

/* Strzałka rozwijania */
.cs-action-row__arrow {
  width: 8px;
  height: 8px;
  opacity: 0.3;
  transition: transform 0.3s;
}
.cs-action-row.open .cs-action-row__arrow {
  transform: rotate(180deg);
}

/* Body (collapsed) */
.cs-action-row__body {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.4s ease;
}
.cs-action-row.open .cs-action-row__body {
  max-height: 300px;
}

.cs-action-row__content {
  padding: 6px 12px 8px 34px;
  font-size: 0.64rem;
  line-height: 1.6;
  color: var(--text-faint);
  font-family: 'Cascadia Code', 'Fira Code', monospace;
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}

/* Minion sub-block wewnątrz action row */
.cs-action-row__minion {
  margin: 0 12px 8px 12px;
  border: 1px solid var(--cs-border, rgba(235,219,178,0.08));
  border-left: 2px solid rgba(104, 157, 106, 0.2);
  border-radius: 2px;
}

/* ─── CONNECTOR (linia łącząca akcje) ─── */
.cs-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 14px;
  flex-shrink: 0;
}
.cs-connector__crystal {
  /* Nieregularny kryształ — SVG inline */
}
.cs-connector__line {
  width: 2px;
  flex: 1;
  background: rgba(var(--cs-agent-color-rgb), 0.12);
  min-height: 12px;
}
.cs-connector--active .cs-connector__crystal {
  animation: cs-crystal-pulse 2s ease-in-out infinite;
}

/* ─── ANIMACJE ─── */
@keyframes cs-crystal-pulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.15); }
}

@keyframes cs-message-enter {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.cs-message--user, .cs-message--agent {
  animation: cs-message-enter 0.25s ease-out;
}
```

### Krok 1.2: Nowa funkcja render_messages()

**Plik: chat_view.js**

Przepisz `render_messages()` (linia ~2413) aby tworzyć NOWĄ strukturę DOM:

```
STARA STRUKTURA (obecna):
  .pkm-chat-message.user / .assistant
    .pkm-chat-message-row
      .pkm-chat-avatar (tylko assistant)
      .pkm-chat-bubble
        .pkm-chat-actions
        .pkm-chat-content

NOWA STRUKTURA:
  .cs-message.cs-message--user
    [tekst usera]
    .cs-message__meta (hover: timestamp + copy/edit/delete)

  .cs-message.cs-message--agent
    .cs-message__agent-head
      .cs-message__agent-crystal (mini kryształ 16x16)
      .cs-message__agent-name ("Jaskier")
    [dla każdej akcji w kolejności:]
    .cs-action-row (thinking)
      .cs-action-row__head (ikona + "Myślenie" + czas + status + arrow)
      .cs-action-row__body (treść myślenia — collapsed)
    .cs-action-row (tool call)
      .cs-action-row__head (ikona toola + "Przeszukanie pamięci" + czas + status + arrow)
      .cs-action-row__body (input/output czytelnie)
    .cs-action-row (minion)
      .cs-action-row__head (ikona + "Minion: [zadanie]" + czas + status + arrow)
      .cs-action-row__body (co minion zrobił)
    .cs-message__text (odpowiedź tekstowa agenta — Markdown)
    .cs-message__meta (hover: timestamp + copy/thumbs/regen)
```

**Kluczowe zmiany w render_messages():**
1. Zamień klasy `.pkm-chat-message` → `.cs-message`, `.user` → `.cs-message--user`, `.assistant` → `.cs-message--agent`
2. User: tekst w angular block z glow, bez avatara
3. Agent: header z kryształem + nazwa NAD treścią, potem chain akcji, potem tekst
4. Actions (copy/delete/edit/thumbs/regen) — pojawiają się na HOVER w .cs-message__meta
5. Timestamp — na hover
6. Ustaw `--cs-agent-color-rgb` na każdym `.cs-message--agent`

**WAŻNE:** Akcje agenta (thinking, tool calls, minion, master) są teraz expandable rows WEWNĄTRZ jednego bloku agenta. Nie są osobnymi wiadomościami.

### Krok 1.3: Nowy ToolCallDisplay

**Plik: src/components/ToolCallDisplay.js**

Przepisz `createToolCallDisplay()` aby generować `.cs-action-row`:

```javascript
// Semantyczne ikony per MCP tool
const TOOL_ICONS = {
  vault_read:      () => UiIcons.file(14),
  vault_write:     () => UiIcons.edit(14),
  vault_search:    () => UiIcons.search(14),
  vault_list:      () => UiIcons.folder(14),
  vault_delete:    () => UiIcons.trash(14),
  memory_search:   () => UiIcons.brain(14),
  memory_update:   () => UiIcons.brain(14),
  memory_status:   () => UiIcons.chart(14),
  skill_list:      () => UiIcons.lightning(14),
  skill_execute:   () => UiIcons.lightning(14),
  minion_task:     () => UiIcons.robot(14),
  master_task:     () => UiIcons.crown(14),
  agent_message:   () => UiIcons.send(14),
  agent_delegate:  () => UiIcons.send(14),
  chat_todo:       () => UiIcons.clipboard(14),
  plan_action:     () => UiIcons.clipboard(14),
  web_search:      () => UiIcons.globe(14),
  ask_user:        () => UiIcons.chat(14),
  switch_mode:     () => UiIcons.compass(14),
  agora_read:      () => UiIcons.globe(14),
  agora_write:     () => UiIcons.globe(14),
  agora_list:      () => UiIcons.globe(14),
};

// Czytelne tłumaczenie inputu per tool (NIE surowy JSON!)
function formatToolInput(toolName, input) {
  try {
    const data = typeof input === 'string' ? JSON.parse(input) : input;
    switch (toolName) {
      case 'vault_search':
      case 'memory_search':
        return `Zapytanie: ${data.query || ''}`;
      case 'vault_read':
        return `Plik: ${data.path || ''}`;
      case 'vault_write':
        return `Plik: ${data.path || ''} — ${data.mode || 'write'}`;
      case 'vault_list':
        return `Folder: ${data.path || '/'}`;
      case 'vault_delete':
        return `Plik: ${data.path || ''}`;
      case 'web_search':
        return `Zapytanie: ${data.query || ''}`;
      case 'minion_task':
      case 'master_task':
        return `Zadanie: ${data.task || data.description || ''}`;
      default:
        return JSON.stringify(data).slice(0, 200);
    }
  } catch { return String(input).slice(0, 200); }
}
```

### Krok 1.4: Nowy ThinkingBlock i SubAgentBlock

**ThinkingBlock.js** — przepisz na `.cs-action-row`:
- Ikona: `UiIcons.brain(14)`
- Label: "Myślenie" + czas
- Status: kryształowy marker (pending podczas streaming, done po zakończeniu)
- Body: treść reasoning (collapsed domyślnie)

**SubAgentBlock.js** — przepisz na `.cs-action-row`:
- Minion: `IconGenerator.generate(seed, 'minion', {size: 14})` + "Minion: [nazwa zadania]" + czas
- Master: `IconGenerator.generate(seed, 'master', {size: 14})` + "Master: [nazwa]" + czas
- Body: co minion/master zrobił (tool calls, odpowiedź)

### Krok 1.5: Streaming — łańcuch buduje się w czasie rzeczywistym

W `chat_view.js` metoda streamowania musi:
1. Na start odpowiedzi agenta: stworzyć `.cs-message--agent` z headerem (crystal + nazwa)
2. Gdy pojawi się thinking: dodać `.cs-action-row` do bloku
3. Gdy pojawi się tool call: dodać `.cs-action-row` do bloku
4. Gdy pojawi się tekst: dodać/aktualizować `.cs-message__text`
5. Markery statusu ANIMUJĄ SIĘ podczas trwania (pending)
6. Po zakończeniu: animacja zatrzymuje się, marker → done, czas się uzupełnia

### Krok 1.6: Typing indicator — "Krystalizuje..."

```javascript
_showTypingIndicator() {
  const indicator = this.messages_container.createDiv({ cls: 'cs-typing' });
  const crystal = indicator.createDiv({ cls: 'cs-typing__crystal' });
  crystal.innerHTML = CrystalGenerator.generate(agentName, { size: 20, color: agentColor, glow: true });
  indicator.createSpan({ cls: 'cs-typing__text', text: 'Krystalizuje...' });
}
```

```css
.cs-typing {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
}
.cs-typing__crystal {
  animation: cs-crystal-pulse 2s ease-in-out infinite;
}
.cs-typing__text {
  font-size: 0.68rem;
  color: var(--text-faint);
  font-style: italic;
}
```

### Krok 1.7: Usunięcie starych klas CSS

Po zweryfikowaniu że nowe style działają:
1. Usuń stare reguły `.pkm-chat-message`, `.pkm-chat-bubble`, `.pkm-chat-avatar` itd.
2. Lub: napisz NOWY plik CSS z tylko nowymi regułami, a stary wykomentuj na czas migracji.

---

## FAZA 2: INPUT AREA (A4) + TOKEN COUNTER (A5)

> **Cel:** Nowy layout input area wg Design concept style + PLAN_VISUAL_OVERHAUL.md sekcja A4.
> **Pliki:** chat_view.js (render_view, input section), chat_view.css

### Krok 2.1: Nowy layout input area — CSS + JS

**Layout (z PLAN_VISUAL_OVERHAUL.md A4):**
```
┌──────────────────────────────────────────────┐
│  TEXTAREA (pełna szerokość)                  │
│                                              │
├──────────────────────────────────────────────┤
│  [Attachment chips]  [Mention chips]         │
├────────────── separator ─────────────────────┤
│  Tryb | Oczko | Summ | Perm | MCP | Tok   📎 @ ◆│
└──────────────────────────────────────────────┘
```

**CSS — styl Design concept (angular, crystal marker, left border accent):**

```css
.cs-input-panel {
  border-top: 1px solid var(--cs-border, rgba(235,219,178,0.08));
  background: var(--background-primary);
}

/* Textarea z left border accent jak w Design concept */
.cs-input-textarea {
  width: 100%;
  padding: 10px 14px;
  background: var(--background-secondary);
  border: 1px solid var(--cs-border, rgba(235,219,178,0.08));
  border-left: 3px solid rgba(var(--cs-agent-color-rgb), 0.15);
  border-radius: 2px;
  color: var(--text-normal);
  font-family: inherit;
  font-size: 0.8rem;
  outline: none;
  resize: none;
  min-height: 40px;
  max-height: 200px;
  transition: all 0.3s;
}
.cs-input-textarea:focus {
  border-color: var(--cs-border-vis, rgba(235,219,178,0.14));
  border-left-color: rgba(var(--cs-agent-color-rgb), 0.35);
}

/* Kryształowy marker obok textarea */
.cs-input-marker {
  width: 6px;
  height: 6px;
  clip-path: polygon(30% 0%, 100% 20%, 80% 100%, 0% 70%);
  border: 1px solid var(--cs-border, rgba(235,219,178,0.08));
  flex-shrink: 0;
  transition: all 0.3s;
}
.cs-input-textarea:focus ~ .cs-input-marker {
  border-color: rgba(var(--cs-agent-color-rgb), 0.3);
  background: rgba(var(--cs-agent-color-rgb), 0.08);
}

/* Chip bar */
.cs-input-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 0 14px 8px;
}
.cs-input-chips:empty { display: none; }

/* Separator */
.cs-input-separator {
  height: 1px;
  background: var(--cs-border, rgba(235,219,178,0.08));
  margin: 0 12px;
}

/* Bottom bar */
.cs-input-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
}
.cs-input-bar__left {
  display: flex;
  align-items: center;
  gap: 2px;
}
.cs-input-bar__right {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Kontrolki (tryb, oczko, summ, perm, mcp) */
.cs-input-ctrl {
  padding: 4px 10px;
  border: 1px solid var(--cs-border, rgba(235,219,178,0.08));
  border-radius: 2px;
  font-size: 0.58rem;
  color: var(--text-faint);
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  background: transparent;
}
.cs-input-ctrl:hover {
  border-color: var(--cs-border-vis, rgba(235,219,178,0.14));
  color: var(--text-muted);
}

/* Tokeny display */
.cs-input-tokens {
  font-size: 0.58rem;
  color: var(--text-faint);
  font-family: monospace;
  padding: 0 8px;
}

/* Przycisk wyślij — DIAMOND SHAPE (Design concept) */
.cs-input-send {
  width: 36px;
  height: 36px;
  border: 1px solid var(--cs-border, rgba(235,219,178,0.08));
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
}
.cs-input-send:hover {
  border-color: rgba(var(--cs-agent-color-rgb), 0.3);
  background: rgba(var(--cs-agent-color-rgb), 0.06);
}
.cs-input-send svg {
  width: 14px;
  height: 14px;
  opacity: 0.4;
}
```

### Krok 2.2: JS — Input area

Przepisz sekcję input w `render_view()`:

```javascript
// Bottom panel (new layout)
const bottomPanel = chatMain.createDiv({ cls: 'cs-input-panel' });

// Row: marker + textarea
const inputRow = bottomPanel.createDiv({ cls: 'cs-input-row' });
const marker = inputRow.createDiv({ cls: 'cs-input-marker' });
this.input_area = inputRow.createEl('textarea', {
  cls: 'cs-input-textarea',
  attr: { placeholder: 'Napisz wiadomość...', rows: '1' }
});

// Chip bar
this.chipBar = bottomPanel.createDiv({ cls: 'cs-input-chips' });

// Separator
bottomPanel.createDiv({ cls: 'cs-input-separator' });

// Bottom bar
const bar = bottomPanel.createDiv({ cls: 'cs-input-bar' });
const left = bar.createDiv({ cls: 'cs-input-bar__left' });
const right = bar.createDiv({ cls: 'cs-input-bar__right' });

// Left: Tryb, Oczko, Summ, Perm, MCP, Tokeny
const modeBtn = left.createEl('button', { cls: 'cs-input-ctrl' });
modeBtn.innerHTML = UiIcons.compass(12) + '<span>Rozmowa</span>';

const oczkoBtn = left.createEl('button', { cls: 'cs-input-ctrl' });
oczkoBtn.innerHTML = UiIcons.eye(12);

const summBtn = left.createEl('button', { cls: 'cs-input-ctrl' });
summBtn.innerHTML = UiIcons.layers(12);

const permBtn = left.createEl('button', { cls: 'cs-input-ctrl' });
permBtn.innerHTML = UiIcons.shield(12);

const mcpBtn = left.createEl('button', { cls: 'cs-input-ctrl' });
mcpBtn.innerHTML = UiIcons.tool(12);

const tokenDisplay = left.createDiv({ cls: 'cs-input-tokens' });

// Right: Attach, @, Send
const attachBtn = right.createEl('button', { cls: 'cs-input-ctrl' });
attachBtn.innerHTML = UiIcons.paperclip(14);

const mentionBtn = right.createEl('button', { cls: 'cs-input-ctrl' });
mentionBtn.innerHTML = UiIcons.at(14);

this.send_button = right.createEl('button', { cls: 'cs-input-send' });
this.send_button.innerHTML = UiIcons.send(14);
```

### Krok 2.3: Token counter (A5)

Format: `"↑1.2k ↓34.4k"` — widoczny ZAWSZE w input bar `.cs-input-tokens`.
Klik → panel monospace NAD licznikiem (overlay popup) z rozbiciem Main/Minion/Master.
Przepisz `updateTokenCounter()` i `_updateTokenPanel()`.

### Krok 2.4: MCP dropdown

Klik w MCP button → dropdown z listą AKTYWNYCH tooli agenta.
Każdy tool: ikona (z TOOL_ICONS) + nazwa polska (z TOOL_INFO).
Styl dropdown: angular (2px border-radius), `border: 1px solid var(--cs-border-vis)`.

---

## FAZA 3: ZAKŁADKI CZATÓW (A7) + HEADER

> **Cel:** Multi-agent tabs w topbarze. Jedno ciągłe conversation per agent.
> **Pliki:** chat_view.js, chat_view.css

### Krok 3.1: Architektura tabów

**WAŻNE USTALENIA:**
- Default agent (Jaskier, konfigurowalny w ustawieniach) pojawia się automatycznie.
- "+" obok zakładki → modal/dropdown z dostępnymi agentami (ci co nie mają otwartego chatu).
- Nie można otworzyć dwóch chatów z tym samym agentem.
- NIE MA historii sesji w zakładkach. Sesje są w profilu agenta (tab Pamięć).
- Jedno ciągłe conversation per agent.
- Zamykanie NIE z samej zakładki — w slim barze (góra).

```javascript
// W ChatView:
this.chatTabs = []; // [{agentName, isActive}]
// Każdy agent ma SWOJE: rollingWindow, tokenTracker, currentMode — w AgentManager
```

### Krok 3.2: Tab bar UI

Zastąp obecny `header` (`pkm-chat-header`):

```css
.cs-chat-topbar {
  display: flex;
  align-items: center;
  gap: 0;
  border-bottom: 1px solid var(--cs-border, rgba(235,219,178,0.08));
  background: var(--background-secondary);
  padding: 0;
  overflow-x: auto;
}

/* Tab */
.cs-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 0.72rem;
  color: var(--text-faint);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
  white-space: nowrap;
  flex-shrink: 0;
}
.cs-tab:hover {
  color: var(--text-muted);
}
.cs-tab--active {
  color: var(--text-normal);
  border-bottom-color: rgba(var(--cs-agent-color-rgb), 0.5);
}

.cs-tab__crystal {
  width: 14px;
  height: 14px;
  opacity: 0.6;
}
.cs-tab--active .cs-tab__crystal {
  opacity: 1;
}

.cs-tab__name {
  font-weight: 500;
}

/* Plus button */
.cs-tab--add {
  padding: 8px 10px;
  opacity: 0.4;
}
.cs-tab--add:hover {
  opacity: 0.7;
}
```

### Krok 3.3: JS — Tab rendering

```javascript
_renderTabBar(container) {
  const topbar = container.createDiv({ cls: 'cs-chat-topbar' });

  for (const tab of this.chatTabs) {
    const tabEl = topbar.createDiv({
      cls: `cs-tab ${tab.isActive ? 'cs-tab--active' : ''}`
    });
    const agent = this.plugin.agentManager.getAgent(tab.agentName);
    const color = agent?.color || '#928374';
    tabEl.style.setProperty('--cs-agent-color-rgb', hexToRgbTriplet(color));

    // Crystal mini
    const crystal = tabEl.createDiv({ cls: 'cs-tab__crystal' });
    crystal.innerHTML = CrystalGenerator.generate(tab.agentName, { size: 14, color });

    // Name
    tabEl.createSpan({ cls: 'cs-tab__name', text: tab.agentName });

    tabEl.addEventListener('click', () => this._switchTab(tab.agentName));
  }

  // Plus button
  const addTab = topbar.createDiv({ cls: 'cs-tab cs-tab--add' });
  addTab.textContent = '+';
  addTab.addEventListener('click', () => this._openAgentPickerModal());
}
```

### Krok 3.4: Agent picker — MODAL z gridem kryształów

**Decyzja: MODAL** (nie dropdown). Grid kryształów na środku ekranu.

```javascript
_openAgentPickerModal() {
  // MODAL z gridem kryształów
  // Pokazuje TYLKO agentów bez otwartego taba
  // Grid: kryształ + imię per agent (shard-style karty)
  // Klik w agenta = otwiera nowy tab + zamyka modal
  // Styl: angular, 2px border-radius, overlay z ciemnym tłem
}
```

### Krok 3.5: Przełączanie tabów

```javascript
_switchTab(agentName) {
  // 1. Zapisz scrollPosition obecnego taba
  // 2. Przełącz isActive
  // 3. Załaduj agenta (rollingWindow, mode, tokenTracker)
  // 4. Re-render messages
  // 5. Ustaw --cs-agent-color-rgb na panelu
  // 6. Przywróć scrollPosition nowego taba
}
```

### Krok 3.6: Domyślny agent w ustawieniach

Nowe ustawienie: `obsek.defaultAgent` (domyślnie: 'Jaskier').
W `obsek_settings_tab.js` dodaj dropdown z listą agentów.

---

## FAZA 4: SLIM BAR (B)

> **Cel:** Redesign prawego toolbara wg Design concept.
> **Pliki:** chat_view.js (_renderToolbar), chat_view.css

### Krok 4.1: Nowa struktura slim bar

```css
.cs-skillbar {
  width: 66px;
  min-height: 100%;
  background: var(--background-secondary);
  border-left: 1px solid var(--cs-border, rgba(235,219,178,0.08));
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  overflow-y: auto;
}

/* Sekcja z labelem */
.cs-skillbar__section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--cs-border, rgba(235,219,178,0.08));
}

.cs-skillbar__label {
  font-size: 0.46rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-faint);
  margin-bottom: 2px;
  opacity: 0.5;
}

/* Grid 2-kolumnowy */
.cs-skillbar__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
}

/* Ikona w gridzie (28x28) */
.cs-skillbar__icon {
  width: 28px;
  height: 28px;
  border: 1px solid rgba(var(--cs-agent-color-rgb), 0.18);
  border-radius: 2px;
  background: rgba(var(--cs-agent-color-rgb), 0.03);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}
.cs-skillbar__icon:hover {
  border-color: rgba(var(--cs-agent-color-rgb), 0.35);
  background: rgba(var(--cs-agent-color-rgb), 0.08);
  box-shadow: 0 0 8px rgba(var(--cs-agent-color-rgb), 0.06);
}
.cs-skillbar__icon svg {
  width: 16px;
  height: 16px;
  opacity: 0.5;
  transition: opacity 0.3s;
}
.cs-skillbar__icon:hover svg {
  opacity: 0.8;
}

/* Tooltip (lewa strona, bo bar jest po prawej) */
.cs-skillbar__icon::after {
  content: attr(data-tip);
  position: absolute;
  right: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
  padding: 3px 8px;
  background: var(--background-modifier-border);
  border: 1px solid var(--cs-border, rgba(235,219,178,0.08));
  border-radius: 2px;
  font-size: 0.56rem;
  color: var(--text-muted);
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 10;
}
.cs-skillbar__icon:hover::after {
  opacity: 1;
}

/* Pojedynczy button (nie w gridzie) */
.cs-skillbar__single {
  width: 28px;
  height: 28px;
  border: 1px solid var(--cs-border, rgba(235,219,178,0.08));
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  background: transparent;
}
.cs-skillbar__single:hover {
  border-color: rgba(var(--cs-agent-color-rgb), 0.25);
  background: rgba(var(--cs-agent-color-rgb), 0.04);
}
.cs-skillbar__single svg {
  width: 16px;
  height: 16px;
  opacity: 0.35;
}
```

### Krok 4.2: JS — Slim bar layout

**GÓRA:** (stałe elementy — singles)
- Artefakty — `UiIcons.clipboard(16)` → `data-tip="Artefakty"`
- Reset chatu — `UiIcons.refresh(16)` → `data-tip="Nowy chat"`
- Konsolidacja — `UiIcons.brain(16)` → `data-tip="Konsolidacja"`
- Zapis sesji — `UiIcons.save(16)` → `data-tip="Zapisz sesję"`
- Zamknięcie chatu — `UiIcons.x(16)` → `data-tip="Zamknij chat"`
- Tokeny: mały tekst wertykalny

**DÓŁ:** (skille agenta — grid 2-kolumnowy, rosną od dołu)
- Ikony skilli (IconGenerator OK tutaj — seed-based)
- `data-tip="[nazwa skilla]"`
- Klik = wstaw prompt skilla do inputa

---

## FAZA 5: REDESIGN PROFILU AGENTA (D)

> **Cel:** Kompletnie nowy profil z 8 tabami, shard-style formularze wg Design concept.
> **NAJWIĘKSZY KROK.**
> **Pliki:** src/views/sidebar/AgentProfileView.js, SidebarViews.css

### Krok 5.0: Shard-style forms — Design System

**KLUCZOWE:** Formularze wyglądają jak w Design concept — left border, crystal marker, filled/empty stany.

```css
/* ===== SHARD SYSTEM ===== */

/* Kontener shard grid */
.cs-shards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px;
  margin: 14px 0;
}

/* Shard — pojedynczy formularz/pole */
.cs-shard {
  border: 1px solid var(--cs-border, rgba(235,219,178,0.08));
  border-left: 3px solid transparent;
  border-radius: 2px;
  padding: 12px;
  position: relative;
  transition: all 0.3s;
  overflow: hidden;
}

.cs-shard--filled {
  background: rgba(var(--cs-agent-color-rgb), 0.04);
  border-left-color: rgba(var(--cs-agent-color-rgb), 0.2);
}
.cs-shard--filled:hover {
  background: rgba(var(--cs-agent-color-rgb), 0.08);
}

.cs-shard--empty {
  border-style: dashed;
  opacity: 0.7;
}

/* Crystal marker na wypełnionym shardzie */
.cs-shard--filled::after {
  content: '';
  position: absolute;
  left: -2px;
  top: 20px;
  width: 5px;
  height: 5px;
  clip-path: polygon(30% 0%, 100% 20%, 80% 100%, 0% 70%);
  background: rgba(var(--cs-agent-color-rgb), 0.12);
}

/* Subtelny gradient na górze */
.cs-shard--filled::before {
  content: '';
  position: absolute;
  top: 0;
  left: 3px;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, rgba(var(--cs-agent-color-rgb), 0.1), transparent 60%);
}

/* Shard big (pełna szerokość, np. textarea) */
.cs-shard--big {
  grid-column: 1 / -1;
}

/* Labels */
.cs-shard__label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 6px;
}
.cs-shard__main-label {
  font-size: 0.72rem;
  color: var(--text-normal);
  font-weight: 500;
}
.cs-shard__sub-label {
  font-size: 0.58rem;
  color: var(--text-faint);
}

/* Wartość */
.cs-shard__value {
  font-size: 0.74rem;
  color: var(--text-muted);
  padding: 4px 0;
}
.cs-shard__value--has {
  color: var(--text-normal);
}

/* Input wewnątrz sharda */
.cs-shard__input {
  width: 100%;
  padding: 4px 0;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--cs-border, rgba(235,219,178,0.08));
  color: var(--text-normal);
  font-size: 0.74rem;
  outline: none;
}
.cs-shard__input:focus {
  border-bottom-color: rgba(var(--cs-agent-color-rgb), 0.3);
}

.cs-shard__textarea {
  width: 100%;
  padding: 6px;
  background: rgba(var(--cs-agent-color-rgb), 0.02);
  border: 1px solid var(--cs-border, rgba(235,219,178,0.08));
  border-radius: 2px;
  color: var(--text-normal);
  font-size: 0.72rem;
  font-family: inherit;
  resize: vertical;
  min-height: 60px;
  outline: none;
}
```

### Crystal Toggle (diamentowy thumb)

```css
.cs-toggle {
  width: 38px;
  height: 18px;
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
}
.cs-toggle__track {
  position: absolute;
  inset: 0;
  border: 1px solid var(--cs-border, rgba(235,219,178,0.08));
  border-radius: 2px;
  transition: all 0.35s;
  background: transparent;
}
.cs-toggle__thumb {
  position: absolute;
  width: 10px;
  height: 10px;
  top: 50%;
  left: 3px;
  transform: translateY(-50%) rotate(45deg);
  border: 1px solid var(--cs-border, rgba(235,219,178,0.08));
  border-radius: 1px;
  transition: all 0.35s;
  background: var(--background-primary);
}
.cs-toggle--on .cs-toggle__track {
  border-color: rgba(var(--cs-agent-color-rgb), 0.3);
  background: rgba(var(--cs-agent-color-rgb), 0.06);
}
.cs-toggle--on .cs-toggle__thumb {
  left: 23px;
  border-color: rgba(var(--cs-agent-color-rgb), 0.5);
  background: rgba(var(--cs-agent-color-rgb), 0.15);
}
```

### Permission Row (z crystal toggle)

```css
.cs-perm-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 0;
  border-bottom: 1px solid var(--cs-border, rgba(235,219,178,0.08));
}

/* Crystal marker przed permission */
.cs-perm-row::before {
  content: '';
  width: 4px;
  height: 4px;
  clip-path: polygon(30% 0%, 100% 20%, 80% 100%, 0% 70%);
  border: 1px solid var(--cs-border, rgba(235,219,178,0.08));
  flex-shrink: 0;
  margin-right: 10px;
  opacity: 0.3;
}
.cs-perm-row--on::before {
  border-color: rgba(var(--cs-agent-color-rgb), 0.3);
  background: rgba(var(--cs-agent-color-rgb), 0.08);
  opacity: 0.7;
}

.cs-perm-row__info { flex: 1; }
.cs-perm-row__name { font-size: 0.76rem; color: var(--text-normal); }
.cs-perm-row__desc { font-size: 0.6rem; color: var(--text-faint); margin-top: 1px; }
```

### Krok 5.1: Nowa struktura 8 tabów

Zmień tablicę `TABS` w AgentProfileView.js:

```javascript
const TABS = [
  { id: 'overview',    label: 'Przegląd',       icon: () => UiIcons.eye(14) },
  { id: 'persona',     label: 'Persona',         icon: () => UiIcons.user(14) },
  { id: 'team',        label: 'Ekipa',           icon: () => UiIcons.users(14) },
  { id: 'skills',      label: 'Umiejętności',    icon: () => UiIcons.lightning(14) },
  { id: 'permissions', label: 'Uprawnienia',     icon: () => UiIcons.shield(14) },
  { id: 'memory',      label: 'Pamięć',          icon: () => UiIcons.brain(14) },
  { id: 'prompt',      label: 'System Prompt',   icon: () => UiIcons.edit(14) },
  { id: 'advanced',    label: 'Zaawansowane',    icon: () => UiIcons.settings(14) },
];
```

**Styl tabów (jak w Design concept):**
```css
.cs-profile-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--cs-border, rgba(235,219,178,0.08));
  margin: 16px 0 14px 0;
  overflow-x: auto;
}
.cs-profile-tab {
  padding: 8px 12px;
  font-size: 0.7rem;
  color: var(--text-faint);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
}
.cs-profile-tab:hover { color: var(--text-muted); }
.cs-profile-tab--active {
  color: var(--text-normal);
  border-bottom-color: rgba(var(--cs-agent-color-rgb), 0.5);
}
```

### Krok 5.2: Tab Przegląd (D1)

```javascript
function renderOverviewTab(el) {
  // Duży kryształ agenta (animacja breathe)
  const crystalBox = el.createDiv({ cls: 'cs-profile__crystal' });
  crystalBox.innerHTML = CrystalGenerator.generate(formData.name, {
    size: 120, color: agentColor, glow: true
  });

  // Nazwa agenta
  el.createEl('h2', { text: formData.name, cls: 'cs-profile__name' });

  // Statystyki (shard grid)
  const grid = el.createDiv({ cls: 'cs-shards' });
  for (const stat of [
    { label: 'Pliki pamięci', value: memoryFileCount },
    { label: 'Narzędzia', value: toolCount },
    { label: 'Sesje', value: sessionCount },
    { label: 'Tokeny', value: totalTokens },
  ]) {
    const shard = grid.createDiv({ cls: 'cs-shard cs-shard--filled' });
    shard.createDiv({ cls: 'cs-shard__value cs-shard__value--has', text: String(stat.value) });
    shard.createDiv({ cls: 'cs-shard__main-label', text: stat.label });
  }
}
```

### Krok 5.3: Tab Persona (D2)

Zastąp `new Setting(el)` na shard-style forms.

**Helper: renderShard()**
```javascript
function renderShard(container, label, sublabel, value, type, onChange) {
  const shard = container.createDiv({
    cls: `cs-shard ${value ? 'cs-shard--filled' : 'cs-shard--empty'}`
  });
  const labelDiv = shard.createDiv({ cls: 'cs-shard__label' });
  labelDiv.createDiv({ cls: 'cs-shard__main-label', text: label });
  if (sublabel) labelDiv.createDiv({ cls: 'cs-shard__sub-label', text: sublabel });

  if (type === 'text') {
    const input = shard.createEl('input', {
      cls: 'cs-shard__input', attr: { type: 'text', value: value || '' }
    });
    input.addEventListener('change', e => {
      onChange(e.target.value);
      shard.className = `cs-shard ${e.target.value ? 'cs-shard--filled' : 'cs-shard--empty'}`;
    });
  } else if (type === 'textarea') {
    const textarea = shard.createEl('textarea', {
      cls: 'cs-shard__textarea', text: value || ''
    });
    textarea.rows = 5;
    textarea.addEventListener('change', e => onChange(e.target.value));
  }
}
```

Formularze Persona: Nazwa, Kolor (picker z crystal preview), Archetyp (dropdown), Rola (dropdown), Osobowość (textarea), Temperatura (slider).

### Krok 5.4: Tab Ekipa (D3)

- Shard per minion/master (filled = ma konfigurację)
- Ikony: IconGenerator ze stylem minionowym/masterowym
- Przycisk "Dodaj miniona" — dashed shard z "+"
- Edycja → MinionMasterEditorModal (istniejący, ale restyled)

### Krok 5.5: Tab Umiejętności (D4)

Sub-taby (Skills | MCP) + GRID layout.
```javascript
function renderSkillsTab(el) {
  // Sub-tabs
  const subtabs = el.createDiv({ cls: 'cs-profile-tabs' });
  // Skills | MCP

  // Grid
  const grid = el.createDiv({ cls: 'cs-shards' });
  for (const skill of allSkills) {
    const shard = grid.createDiv({
      cls: `cs-shard ${isAssigned ? 'cs-shard--filled' : 'cs-shard--empty'}`
    });
    // Ikona (IconGenerator — skill)
    shard.innerHTML = IconGenerator.generate(skill.name, skill.icon_category || 'arcane', { size: 24 });
    shard.createDiv({ cls: 'cs-shard__main-label', text: skill.name });
    // Klik = toggle assign/unassign
  }
}
```

### Krok 5.6: Tab Uprawnienia (D5)

Crystal toggles + shard-style:
- Każde uprawnienie = `.cs-perm-row` z `.cs-toggle`
- Vault Map z white listą
- **PLAYBOOK** — structured form:
  1. Specjalizacja (textarea shard) — co agent robi i jak
  2. Procedury (lista shard) — auto-dodawane z decision tree + edytowalne
  3. Skille (auto-lista) — auto-dopisują się aktualne skille z opisami
  4. Miniony/Masterzy (auto-lista) — auto-dopisują się z opisami
  5. Wyjątki/reguły (lista) — user dopisuje ręcznie

### Krok 5.7: Tab Pamięć (D6)

**Memory cards (jak w Design concept):**
```css
.cs-mem-card {
  border: 1px solid var(--cs-border, rgba(235,219,178,0.08));
  border-left: 3px solid transparent;
  border-radius: 2px;
  overflow: hidden;
  transition: all 0.4s ease;
}
.cs-mem-card--has {
  border-left-color: rgba(var(--cs-agent-color-rgb), 0.2);
}
.cs-mem-card__head {
  padding: 11px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: background 0.3s;
}
.cs-mem-card__head:hover {
  background: rgba(var(--cs-agent-color-rgb), 0.04);
}
.cs-mem-card__body {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.cs-mem-card.open .cs-mem-card__body {
  max-height: 600px;
}
```

Zawartość:
- Lista sesji: data + godzina + tytuł (expandable)
- Brain.md podgląd (read-only, markdown render)
- Przycisk usuwania per plik

### Krok 5.8: Tab System Prompt (D7 — GAMECHANGER)

Przenieś Prompt Builder tutaj:
- Live preview: agent widzi na bieżąco swój system prompt
- Toggleable sekcje (Decision Tree)
- Token count na żywo
- User może wpływać na każdy element
- Styl: monospace text w shard-style containr

### Krok 5.9: Tab Zaawansowane (D8)

- Modele (agent/minion/master) — dropdowny shard-style
- Opcje auto (toggles)
- USUWANIE AGENTA — przycisk z potwierdzeniem (red accent)

---

## FAZA 6: REDESIGN SIDEBARA (E)

> **Cel:** Nowy layout kart agentów, sekcje, Zaplecze.
> **Pliki:** HomeView.js, BackstageViews.js, SidebarViews.css

### Krok 6.1: Agent cards — grid layout (Design concept style)

```css
.cs-agent-grid {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
}
.cs-agent-grid--2col { grid-template-columns: repeat(2, 1fr); }
.cs-agent-grid--3col { grid-template-columns: repeat(3, 1fr); }

.cs-agent-card {
  padding: 8px 10px;
  border: 1px solid var(--cs-border, rgba(235,219,178,0.08));
  border-left: 3px solid transparent;
  border-radius: 2px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transition: all 0.3s;
  position: relative;
}
.cs-agent-card:hover {
  border-color: var(--cs-border-vis, rgba(235,219,178,0.14));
  background: rgba(var(--cs-agent-color-rgb), 0.04);
  border-left-color: rgba(var(--cs-agent-color-rgb), 0.3);
}

.cs-agent-card__crystal {
  width: 32px;
  height: 38px;
  opacity: 0.7;
}
.cs-agent-card__name {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--text-normal);
}

/* New agent — dashed */
.cs-agent-card--add {
  border-style: dashed;
  opacity: 0.5;
  justify-content: center;
  min-height: 60px;
}
.cs-agent-card--add:hover {
  opacity: 0.8;
}
```

### Krok 6.2: Sekcje sidebara

Stałe sekcje (zawsze widoczne):
1. Agenci (grid kart)
2. Komunikator (mini-preview)
3. Agora (link)
4. Zaplecze (link → osobny widok)

**Section title (Design concept):**
```css
.cs-section-title {
  font-size: 0.68rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-faint);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}
```

### Krok 6.3: Zaplecze — osobny widok z zakładkami

**Taby:** Skille | Miniony | Masterzy | MCP

```javascript
function renderBackstageView(container, plugin, nav) {
  // Tabs
  const tabBar = container.createDiv({ cls: 'cs-profile-tabs' });
  // ... render tabs (Skille | Miniony | Masterzy | MCP)

  // Search
  const search = container.createEl('input', {
    cls: 'cs-shard__input', attr: { placeholder: 'Szukaj...' }
  });

  // Grid/lista
  const grid = container.createDiv({ cls: 'cs-shards' });
  // Render items based on active tab
  // Klik w item = rozwijanie in-place
}
```

---

## FAZA 7: KOMUNIKATOR (I) + AGORA (K) + MCP WIDOK (J) + USTAWIENIA (F)

> **Czas:** Restyle, nie nowa logika

### Krok 7.1: Komunikator — Crystal Soul restyle

- Wiadomości między agentami: angular styl, crystal markers
- Inbox/outbox: shard-style layout, kolor agenta-nadawcy
- Taby (Design concept style): `cs-profile-tabs` reuse

### Krok 7.2: Agora — restyle

- Profil usera: shard-style, własny kolor
- Tablica aktywności, Projekty, Strefy agentowe
- Angular, subtle colors

### Krok 7.3: MCP widok

- Grid narzędzi z ikonami (UiIcons per tool — te same co w TOOL_ICONS)
- Grupowanie po kategoriach (vault, memory, skill, komunikacja, agora)
- Status aktywny/nieaktywny (crystal toggle)

### Krok 7.4: Ustawienia

- STANDARDOWY styl Obsidiana, delikatne akcenty Crystal Soul
- Sekcje z nagłówkami (UiIcons + `cs-section-title`)
- Sekcja "Interfejs" z przyszłym przełącznikiem motywów
- Nowe ustawienie: `obsek.defaultAgent` (dropdown)

---

## FAZA 8: ANIMACJE (A6) + DARK/LIGHT AUDIT (C3) + POLISH

### Krok 8.1: System animacji

```css
/* Pulse na wysłaniu */
@keyframes cs-send-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(0.92); }
  100% { transform: scale(1); }
}

/* Crystal build — kryształ się buduje */
@keyframes cs-crystal-build {
  from { opacity: 0; transform: scale(0.3); clip-path: inset(50%); }
  to { opacity: 1; transform: scale(1); clip-path: inset(0%); }
}

/* Breathing crystal (profil agenta) */
@keyframes cs-breathe {
  0%, 100% { filter: drop-shadow(0 0 4px rgba(var(--cs-agent-color-rgb), 0.3)); }
  50% { filter: drop-shadow(0 0 12px rgba(var(--cs-agent-color-rgb), 0.5)); }
}

/* Tab switch fade */
@keyframes cs-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Save/confirm — pulse z glow */
@keyframes cs-save-confirm {
  0% { transform: scale(1); }
  50% { transform: scale(0.95); box-shadow: 0 0 12px rgba(var(--cs-agent-color-rgb), 0.3); }
  100% { transform: scale(1); }
}

/* Shimmer (loading) */
@keyframes cs-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

### Krok 8.2: Dark/Light mode audit

- Przetestuj WSZYSTKIE nowe elementy w obu trybach
- `rgba(var(--cs-agent-color-rgb), ...)` działa dobrze w obu
- Light theme: słabszy glow, mocniejsze bordery (zwiększ opacity o ~10%)
- Dodaj `.theme-light` overrides tam gdzie potrzeba

### Krok 8.3: Responsywność

- Wąski panel (sidebar): mniejsze fonty, compact shards
- Slim bar chowa się na ekranach <600px szerokości panelu
- Taby: horizontal scroll zamiast wrap

---

## PROPONOWANA KOLEJNOŚĆ IMPLEMENTACJI

```
FAZA 0: Porządki IconGenerator→UiIcons + ConnectorGenerator    [~2-3h]
FAZA 1: Redesign chatu (wiadomości + chain + typing)          [~4-6h]  ← NAJWAŻNIEJSZE
FAZA 2: Input area + token counter                            [~2-3h]
FAZA 3: Zakładki czatów (multi-agent tabs)                    [~3-4h]
FAZA 4: Slim bar (66px, Design concept style)                 [~1-2h]
FAZA 5: Profil agenta (8 tabów, shard-style, playbook)        [~6-8h]  ← NAJWIĘKSZE
FAZA 6: Sidebar (karty, zaplecze)                             [~3-4h]
FAZA 7: Komunikator + Agora + MCP + Settings                  [~2-3h]
FAZA 8: Animacje + Polish + Dark/Light audit                  [~2-3h]
                                                        TOTAL: ~26-36h
```

**WAŻNE:** Każda faza musi kończyć się DZIAŁAJĄCYM buildem. Nie zostawiaj połamanych rzeczy.

---

## PLIKI DO STWORZENIA (NOWE)

1. **Żadnych nowych plików JS** — edytujemy istniejące (z wyjątkiem ewentualnych helperów)
2. Być może: `src/components/ShardForm.js` — reużywalny komponent shard-style formularzy
3. Być może: `src/components/CrystalToggle.js` — reużywalny toggle
4. CSS: nowe reguły w istniejących plikach CSS lub nowy `src/crystal-soul/crystal-soul.css`

---

## CHECKLIST PRZED KAŻDĄ FAZĄ

- [ ] Przeczytaj odpowiednią sekcję z PLAN_VISUAL_OVERHAUL.md (WIZJA)
- [ ] Przeczytaj odpowiednią sekcję z tego pliku (INSTRUKCJA)
- [ ] Zidentyfikuj WSZYSTKIE pliki do zmiany
- [ ] `npm run build` — punkt startowy kompiluje się?
- [ ] Zaplanuj zmiany CSS NAJPIERW

## CHECKLIST PO KAŻDEJ FAZIE

- [ ] `npm run build` — 0 errors
- [ ] Otwórz Obsidian — plugin się ładuje?
- [ ] Przetestuj w dark mode
- [ ] Przetestuj w light mode
- [ ] Żadna istniejąca funkcjonalność nie jest zepsuta

---

## KLUCZOWE RÓŻNICE: STARY PLAN vs NOWY

| Element | STARY (błędny) | NOWY (prawidłowy) |
|---------|----------------|-------------------|
| border-radius | 12-16px (rounded) | **2px** (angular, crystalline) |
| User message | glow, rounded bubble | **left border 3px + angular + glow** |
| Agent message | transparent block | **contained block, left border 3px + header** |
| Markery | diamenty (rotate 45deg) | **nieregularne kryształy (clip-path / polygon)** |
| Kolory | heavy glow/shadow | **subtelne rgba (6-25% opacity)** |
| Shard forms | rounded cards | **left border 3px + crystal marker + subtle bg** |
| Skill bar | 40px | **66px, 2-column grid** |
| Send button | rounded rectangle | **diamond clip-path** |
| IconGenerator scope | only skills | **skills + minions + masters** |
| Toggle thumb | round | **diamond/crystal (rotate 45deg)** |
| Input field | plain textarea | **left border accent + crystal marker** |
| Agent layout | avatar beside text | **avatar NAD tekstem (compact)** |

---

> **Ten plan jest INSTRUKCJĄ IMPLEMENTACJI.**
> **PLAN_VISUAL_OVERHAUL.md jest WIZJĄ (co chcemy).**
> **Agent implementujący MUSI czytać OBA pliki + mieć dostęp do Design concept HTML.**
> **Elementy ITERACYJNE — zrób pierwszą wersję, user oceni na żywo.**
