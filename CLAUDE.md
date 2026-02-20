# CLAUDE.md - Obsek Plugin

> **Cel:** Kontekst dla AI asystentow pracujacych nad tym projektem.
> **Aktualizacja:** 2026-02-20

---

## O Projekcie

**Obsek Plugin** to plugin do Obsidian - fork Smart Connections v4.1.7.
- **Status:** Wczesne MVP - chat z AI dziala, reszta do weryfikacji
- **Autor:** JDHole (non-programista, vibe-coding)
- **Metoda pracy:** Caly kod powstaje przez vibe-coding z AI

---

## Tech Stack

| Warstwa | Technologia |
|---------|-------------|
| Runtime | Obsidian (Electron/Node.js) |
| Jezyk | JavaScript (ES Modules) |
| Bundler | esbuild |
| AI Providers | Anthropic, OpenAI, Ollama, OpenRouter |
| Tool Protocol | MCP SDK |
| Embeddings | SmartEmbedModel (lokalne) |
| Baza | Smart Connections v4.1.7 |

---

## Co dziala (potwierdzone)

- Chat z AI w panelu bocznym Obsidiana
- AI widzi notatki uzytkownika
- AI tworzy nowe notatki
- Multi-provider (Claude, GPT, Ollama, OpenRouter)
- Plugin laduje sie bez bledow

## Co istnieje w kodzie ale WYMAGA WERYFIKACJI

- System agentow (src/agents/, src/core/AgentManager.js)
- System pamieci (src/memory/)
- System uprawnien (src/core/PermissionSystem.js)
- MCP narzedzia (src/mcp/)
- Agent sidebar + creator modal (src/views/)

---

## Struktura Projektu

```
src/
├── main.js              # Entry point
├── core/                # AgentManager, PermissionSystem, VaultZones
├── agents/              # Definicje AI agentow
├── mcp/                 # MCP: odczyt/zapis/szukanie w vaulcie
├── memory/              # Pamiec: RAG, rolling window, summarizer
├── views/               # UI: chat, sidebar, modalne, ustawienia
├── components/          # UI komponenty
├── utils/               # Funkcje pomocnicze
├── collections/         # Kolekcje danych
├── items/               # Elementy danych
└── actions/             # Akcje

.pkm-assistant/          # Vault storage (agenci, workflow, sesje)
jdhole-mcp-servers/      # Wlasne MCP serwery
jdhole-skills/           # Wlasne skile
```

---

## Komendy

```bash
npm run dev              # Build z watch mode
npm run build            # Production build
npm test                 # Testy
```

---

## Konwencje Kodu

- ES Modules (`import/export`)
- Async/await (nie callbacks)
- camelCase dla zmiennych i funkcji
- PascalCase dla klas
- Komentarze po polsku OK
- Git: konwencjonalne commity (`feat:`, `fix:`, `docs:`, `refactor:`)

---

## Czego NIE Robic

1. **NIE commituj API keys** - uzywa .env
2. **NIE modyfikuj** plikow w `external-deps/` bez powodu
3. **NIE edytuj** `dist/` recznie - generuje sie automatycznie
4. **NIE tworzono monolitycznych zmian** - male kroki

---

## Dokumentacja projektu

- **STATUS.md** - Przenosny kontekst (kopiuj do innych chatow)
- **DEVLOG.md** - Chronologiczny dziennik zmian
- **CLAUDE.md** - Ten plik, kontekst dla AI

---

## Wskazowki dla AI

1. **Uzytkownik jest non-programista** - tlumacz prostym jezykiem
2. **Vibe-coding** - planuj, tlumacz, koduj krokami
3. **Nie zakladaj ze cos dziala** - weryfikuj przed budowaniem na tym
4. **Male iteracje** - jeden krok, test, commit
5. **Aktualizuj DEVLOG.md** po kazdej sesji pracy
6. **Aktualizuj STATUS.md** gdy zmieni sie status jakiejs funkcji
