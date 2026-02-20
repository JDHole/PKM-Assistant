# Handoff: PKM Assistant 2.0 - Obszar 2

## 📋 Kontekst projektu

**Plugin:** PKM Assistant dla Obsidian  
**Cel:** AI assistant zintegrowany z vault, agenci, MCP tools, RAG  
**Status:** MVP gotowe, teraz refinement wg `Plan implementacji 2.0.md`

## ✅ Obszar 1: CHAT - UKOŃCZONY

Zaimplementowano w 4 batchach:

### Batch 1: Visual enhancements
- Awatary (emoji agenta) przy wiadomościach AI
- Timestamp pod każdą wiadomością
- Copy button na hover

### Batch 2: Message actions
- Delete button (usuwa wiadomość z historii)
- Edit button (user only - wkleja do inputa)
- Regenerate button (ostatnia wiadomość AI)
- React buttons (👍👎) - zapisuje do metadata

### Batch 3: Streaming UX
- Typing indicator (3 animowane kropki)
- Smart scroll (nie scrolluje jeśli user przewinął w górę)
- Escape zatrzymuje generowanie

### Batch 4: Input improvements
- Auto-resize textarea
- Historia inputa (strzałki góra/dół)
- Slash commands: `/clear`, `/save`

### Batch 5: Markdown & Code blocks (skipped)
- ✅ Już działa przez Obsidian's `MarkdownRenderer`
- Syntax highlighting, wikilinks, LaTeX - out of the box

### Poprawki CSS
- Kompletny redesign layoutu wiadomości
- Wyraźny podział user (prawo, accent) vs assistant (lewo, z awatarem)
- Style w głównym `src/styles.css` (nie CSS modules)

## 🔧 Workflow implementacji

1. **Orchestrator (ten chat)** tworzy szczegółowe prompty dla każdego batcha
2. **User** przekazuje prompt do osobnego Gemini 3 Pro
3. **Gemini 3 Pro** implementuje zmiany
4. **User** wraca z wynikami
5. **Orchestrator** weryfikuje build i przechodzi do następnego batcha
6. Na końcu obszaru - wielki check i poprawki

## 📁 Kluczowe pliki

```
src/
├── views/
│   ├── chat_view.js          # Główna logika chatu
│   └── chat_view.css         # Style (ale główne są w styles.css!)
├── styles.css                 # GŁÓWNE STYLE - tu są pkm-chat-* klasy
├── memory/
│   ├── RollingWindow.js      # Zarządzanie kontekstem
│   └── SessionManager.js     # Sesje rozmów
├── agents/
│   └── AgentManager.js       # Zarządzanie agentami
└── mcp/
    ├── ToolRegistry.js       # Rejestr narzędzi
    └── MCPClient.js          # Wykonywanie tool calls
```

## 🎯 Następny: Obszar 2 - NARZĘDZIA ASYSTENTA

Z `Plan implementacji 2.0.md`:

### 2.1 Tymczasowe task.md
- [ ] Tworzenie pliku task.md w vault
- [ ] Aktualizacja statusu zadań przez AI
- [ ] Parsowanie checkboxów `[ ]`, `[x]`, `[/]`

### 2.2 Web Search
- [ ] Integracja z API (Brave/SerpAPI/Perplexity)
- [ ] Formatowanie wyników jako kontekst
- [ ] UI wskaźnik "szuka w internecie"

### 2.3 Komentarze AI
- [ ] Dodawanie komentarzy `%%AI: ...%%` do notatek
- [ ] Tryb sugestii vs bezpośrednia edycja
- [ ] UI pokazujące pending comments

### 2.4 Czytanie aktualnej notatki
- [ ] Automatyczny context z otwartej notatki
- [ ] UI pokazujące "analizuję: nazwa.md"
- [ ] Opcja wyłączenia auto-context

### 2.5 MCP Operations
- [ ] Bulk operacje (rename, move)
- [ ] Template filling
- [ ] Folder structure creation

## ⚠️ Ważne uwagi

1. **CSS** - style PKM chatu są w `src/styles.css` na końcu, nie w `chat_view.css`
2. **Build** - `npm run build` kopiuje do `JDHole_OS_2.0\.obsidian\plugins\obsek`
3. **Reload** - po zmianach trzeba przeładować plugin w Obsidian (Ctrl+Shift+R)
4. **Like/Dislike** - zapisuje tylko do `message.metadata.reaction`, AI tego nie widzi (future: Obszar 11)

## 🚀 Jak zacząć Obszar 2

1. Przejrzyj `Plan implementacji 2.0.md` sekcję "Obszar 2"
2. Podziel na batche (sugestia: 2.4 → 2.1 → 2.3 → 2.2 → 2.5)
3. Dla każdego batcha stwórz szczegółowy prompt z kodem
4. Przekaż do Gemini, zweryfikuj build
5. Na końcu wielki test

Good luck! 🎉
