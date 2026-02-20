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

## Co NAPEWNO dziala (potwierdzone 2026-02-20)

- [x] Plugin laduje sie w Obsidianie bez bledow
- [x] Plugin indeksuje vault automatycznie
- [x] Chat z AI w Obsidianie (panel boczny, agent Jaskier)
- [x] Token counter w UI (np. 6627/100000)
- [x] AI widzi notatki uzytkownika (vault_read + vault_list dzialaja)
- [x] AI potrafi stworzyc nowa notatke (vault_write dziala)
- [x] Multi-provider: Claude Sonnet 4 via API potwierdzone
- [x] System uprawnien DZIALA - blokuje vault_write az user zatwierdzi
- [x] MCP narzedzia: vault_list, vault_read, vault_write potwierdzone
- [x] Build: npm run build -> dist/main.js 882kb, auto-kopia do vaultu

## Co ISTNIEJE w kodzie ale NIE ZWERYFIKOWANE

- [ ] Pozostale agenty (Iris, Dexter, Ezra, Silas, Lexie) - Jaskier dziala!
- [ ] System pamieci (rolling window, summarizer, RAG)
- [ ] MCP narzedzia: vault_search, vault_delete
- [ ] Agent Creator Modal (tworzenie agentow z UI)
- [ ] Strefy vaulta (VaultZones - konfiguracja jest w .pkm-assistant/config.yaml)
- [ ] Workflow parser i loader
- [ ] Agent Sidebar (osobny panel z lista agentow)

## Co jest PLANOWANE (pelna wizja w WIZJA.md)

- [ ] Ciagloa pamiec agentow (hierarchiczna: sesja -> tydzien -> miesiac -> rok)
- [ ] Rebranding UI: "Smart Connections" -> "Obsek"
- [ ] Przelaczanie agentow w sidebar
- [ ] Agent Creator Modal
- [ ] Token tracking i limity
- [ ] Miniony (male lokalne modele)
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

## Dokumentacja projektu

| Plik | Cel |
|------|-----|
| **STATUS.md** (ten plik) | Co dziala, co nie, stan projektu |
| **WIZJA.md** | Dokad zmierzamy - finalny produkt |
| **DEVLOG.md** | Chronologiczny log zmian |
| **CLAUDE.md** | Konwencje kodu, tech stack |
| **CHEATSHEET.md** | Sciaga do pracy z Claude Code |

Kiedy kopiujesz kontekst do innego czatu z AI, daj mu:
1. **STATUS.md** + **WIZJA.md** - stan i cel
2. **DEVLOG.md** - co sie ostatnio zmienilo
3. Konkretny plik/pliki ktorych dotyczy pytanie
