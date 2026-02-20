# Obsek Plugin - Status Projektu

> **Kopiuj ten plik do dowolnego czatu z AI** zeby dac kontekst o projekcie.
> Ostatnia aktualizacja: 2026-02-20

---

## Czym jest Obsek?

Plugin do Obsidiana. Fork (kopia + modyfikacja) Smart Connections v4.1.7.
Cel: System specjalizowanych AI agentow w Obsidianie, ktorzy pomagaja zarzadzac notatkami, zdrowiem, kariera itd.

**Autor:** JDHole (non-programista, vibe-coding z AI)
**Lokalizacja:** `C:\Users\jdziu\Desktop\Obsek\Obsek Plugin\`
**Repo:** `https://github.com/JDHole/PKM-Assistant.git`
**Tech:** JavaScript, Obsidian API, esbuild, MCP

---

## Co NAPEWNO dziala (potwierdzone)

- [x] Chat z AI w Obsidianie (panel boczny)
- [x] AI widzi notatki uzytkownika i moze o nich rozmawiac
- [x] AI potrafi stworzyc nowa notatke i w niej pisac
- [x] Multi-provider: Claude, GPT, Ollama, OpenRouter
- [x] Plugin laduje sie w Obsidianie bez bledow

## Co ISTNIEJE w kodzie ale NIE WIADOMO czy dziala

- [ ] System 6 agentow (Jaskier, Iris, Dexter, Ezra, Silas, Lexie)
- [ ] System pamieci (rolling window, summarizer, RAG)
- [ ] System uprawnien (PermissionSystem, ApprovalManager)
- [ ] MCP narzedzia (odczyt/zapis/szukanie w vaulcie)
- [ ] Agent Creator Modal (tworzenie agentow z UI)
- [ ] Strefy vaulta (VaultZones)
- [ ] Workflow parser i loader

## Co jest PLANOWANE (jeszcze nie zaczete)

- [ ] Rebranding UI: "Smart Connections" -> "Obsek"
- [ ] Hierarchia agentow (parent-child)
- [ ] Miniony - male lokalne modele do prostych zadan
- [ ] Token tracking w UI
- [ ] Ollama one-click setup

---

## Struktura projektu (co gdzie jest)

```
Obsek Plugin/
├── src/                    # Caly kod pluginu
│   ├── main.js             # Punkt startowy - tu plugin sie wlacza
│   ├── core/               # Mozg: AgentManager, PermissionSystem, VaultZones
│   ├── agents/             # Definicje AI agentow
│   ├── mcp/                # Narzedzia: czytanie/pisanie/szukanie w vaulcie
│   ├── memory/             # Pamiec: RAG, rolling window, summarizer
│   ├── views/              # Wyglad: chat, sidebar, modalne, ustawienia
│   ├── utils/              # Male funkcje pomocnicze
│   ├── components/         # UI komponenty
│   ├── collections/        # Kolekcje danych
│   ├── items/              # Elementy danych
│   └── actions/            # Akcje (connections list)
├── dist/                   # Skompilowany plugin (NIE RUSZAC)
├── external-deps/          # Biblioteki Smart Connections (NIE RUSZAC)
├── node_modules/           # Paczki npm (NIE RUSZAC)
├── .pkm-assistant/         # Dane w vaulcie: agenci, workflow, sesje
├── jdhole-mcp-servers/     # Wlasne MCP serwery
├── jdhole-skills/          # Wlasne skile
├── manifest.json           # Metadane pluginu (nazwa, wersja)
├── package.json            # Konfiguracja projektu
├── esbuild.js              # Konfiguracja bundlera
└── .env                    # Klucze API (NIGDY nie commitowac!)
```

---

## Baza kodu (Smart Connections v4.1.7)

Plugin bazuje na Smart Connections - popularnym pluginie do Obsidiana.
Z bazy dostajemy za darmo:
- Embeddingi (indeksowanie notatek semantycznie)
- Semantic search (szukanie powiazanych notatek)
- System chat view
- Multi-provider AI (Anthropic, OpenAI, Ollama, OpenRouter)
- Smart Environment (framework pluginu)

Nasza warstwa (dodana na wierzch):
- System agentow
- System pamieci
- MCP integration
- Permission system
- Agent sidebar + creator

---

## Jak budowac i testowac

```bash
cd "C:\Users\jdziu\Desktop\Obsek\Obsek Plugin"
npm run dev       # Build z automatycznym odswiezaniem
npm run build     # Build produkcyjny
npm test          # Testy
```

Po buildzie: skopiuj `dist/` do folderu pluginu w vaulcie Obsidiana.

---

## Kontekst do rozmow z AI

Kiedy kopiujesz ten plik do innego czatu, dodaj tez:
1. **CLAUDE.md** - konwencje kodu i tech stack
2. **DEVLOG.md** - co sie ostatnio zmienilo
3. Konkretny plik/pliki ktorych dotyczy pytanie
