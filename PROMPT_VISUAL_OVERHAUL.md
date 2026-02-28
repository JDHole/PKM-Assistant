# PROMPT STARTOWY — Visual Overhaul Implementation

> **Skopiuj całą treść tego pliku i wklej jako pierwszą wiadomość w nowej rozmowie z agentem AI.**

---

## KIM JESTEM

Jestem JDHole — twórca pluginu Obsek (fork Smart Connections v4.1.7 dla Obsidian). Jestem nie-programistą, cały development robię przez vibe-coding z AI. Komunikuję się po polsku.

## CO ROBIMY

Implementujemy KOMPLETNY visual overhaul pluginu Obsek — nowy wygląd, nowy UX, Crystal Soul Design System. To nie jest mały refactor — to przepisanie wyglądu CAŁEGO pluginu od zera.

## PLIKI KTÓRE MUSISZ PRZECZYTAĆ (w tej kolejności!)

Zanim napiszesz JEDNĄ LINIJKĘ kodu, przeczytaj:

1. **`PLAN_VISUAL_OVERHAUL.md`** — WIZJA. Co chcemy osiągnąć. Filozofia, decyzje, referencje wizualne.
2. **`PLAN_VISUAL_OVERHAUL_IMPL.md`** — INSTRUKCJA. Krok po kroku jak to zaimplementować. CSS, JS, DOM struktury, kolejność faz.
3. **`Design concept`** (plik w `c:/Users/jdziu/Desktop/Obsek/`, bez rozszerzenia, to HTML) — REFERENCJA WIZUALNA. Tak ma wyglądać plugin. Przeczytaj cały CSS i HTML.
4. **`Crystal Soul Test.html`** i **`Crystal Soul Palette.html`** (w tym samym folderze) — generatory kryształów, ikony, paleta kolorów.
5. **`CLAUDE.md`** lub **`MEMORY.md`** — kontekst projektu, architektura, co już istnieje.

## ZASADY PRACY

### Kolejność faz (NIE ZMIENIAJ!)
```
FAZA 0: Porządki IconGenerator→UiIcons + ConnectorGenerator
FAZA 1: Redesign chatu (wiadomości + chain + typing)         ← NAJWAŻNIEJSZE
FAZA 2: Input area + token counter
FAZA 3: Zakładki czatów (multi-agent tabs)
FAZA 4: Slim bar (66px, Design concept style)
FAZA 5: Profil agenta (8 tabów, shard-style, playbook)       ← NAJWIĘKSZE
FAZA 6: Sidebar (karty, zaplecze)
FAZA 7: Komunikator + Agora + MCP + Settings
FAZA 8: Animacje + Polish + Dark/Light audit
```

### Przy KAŻDEJ fazie:
1. Powiedz mi co zamierzasz zrobić (krótko)
2. Zrób CSS NAJPIERW, potem JS
3. `npm run build` po każdym kroku — MUSI się kompilować
4. NIE łam istniejącej funkcjonalności
5. Po fazie — pokaż mi co zrobiłeś, poczekaj na feedback

### Kluczowe zasady designu (szczegóły w PLAN_VISUAL_OVERHAUL_IMPL.md):
- **border-radius: 2px** WSZĘDZIE (NIGDY rounded!)
- **Kolory subtelne** — rgba z 6-25% opacity, NIGDY pełna saturacja
- **Markery to NIEREGULARNE kryształy** — nie zwykłe diamenciki (rotate 45deg)
- **Shard-style formularze** — lewy border 3px + kryształowy marker + gradient na górze
- **Layout kompaktowy** — avatar/info NAD tekstem, nie obok. Żadnych rozlazłych okienek.
- **IconGenerator TYLKO** dla skilli, minionów, masterów. Reszta = UiIcons (semantyczne).
- **Przycisk wyślij** = diamond shape (clip-path)
- **Crystal toggles** = diamentowy thumb (rotate 45deg)

### Czego NIE robić:
- NIE zmieniaj logiki biznesowej (RollingWindow, MCPClient, PromptBuilder, AgentManager, etc.)
- NIE ruszaj external-deps/
- NIE twórz nowych plików JS bez potrzeby — edytuj istniejące
- NIE używaj emoji NIGDZIE w kodzie UI (tylko w prompt stringach i Logger)
- NIE nadpisuj zmiennych CSS Obsidiana

## ARCHITEKTURA (skrót)

- Plugin Obsidian, JavaScript ES Modules, bundled z esbuild
- Build: `npm run build` (w folderze `Obsek Plugin/`)
- Główne pliki do zmiany: `src/views/chat_view.js` (~3065 linii), `chat_view.css`, `AgentProfileView.js`, `HomeView.js`, `BackstageViews.js`, `AgoraView.js`, `CommunicatorView.js`
- Komponenty: `ToolCallDisplay.js`, `ThinkingBlock.js`, `SubAgentBlock.js`
- Crystal Soul: `src/crystal-soul/` — IconGenerator, CrystalGenerator, ColorPalette, UiIcons, ConnectorGenerator, SvgHelper
- Rendering: Obsidian DOM API (`container.createDiv()`, `createEl()`, `createSpan()`)
- CSS: `src/views/chat_view.css`, `SidebarViews.css`, `src/styles.css`

## ZACZNIJ

Przeczytaj pliki wymienione wyżej. Potem zacznij od FAZY 0. Powiedz mi co zamierzasz zrobić i ruszaj.

Jeśli masz pytania — pytaj. Ale nie pytaj o rzeczy które są jasno opisane w planach.
