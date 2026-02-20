# Obsek Plugin - Status Projektu

> **Kopiuj ten plik do dowolnego czatu z AI** zeby dac kontekst o projekcie.
> Ostatnia aktualizacja: 2026-02-20 (sesja 10)

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
- [x] Build: npm run build -> dist/main.js **6.5MB**, auto-kopia do vaultu
- [x] src/main.js zawiera wszystkie komponenty Obsek (ChatView, AgentManager, MCP, itd.)
- [x] brain.md tworzony automatycznie przy starcie (.pkm-assistant/agents/jaskier/memory/brain.md)
- [x] Tresc brain.md jest wstrzykiwana do system promptu przy kazdej wiadomosci
- [x] vault_read/vault_list/vault_write dzialaja na ukryte foldery (.pkm-assistant)
- [x] Agent zna sciezke do swojego brain.md i moze go aktualizowac via vault_write
- [x] Fazy 0+1+2 systemu pamieci zaimplementowane (streamHelper, brain boot-up, session lifecycle)
- [x] Session dropdown dziala - widzi sesje z AgentMemory, ladowanie sesji dziala
- [x] memory_search - nowy MCP tool do przeszukiwania pamieci agenta (sesje, brain, podsumowania)
- [x] Ribbon icon Obsek (zamiast 3 ikon Smart Connections) - otwiera chat
- [x] RAG indexuje z AgentMemory (nie z pustego SessionManager)
- [x] Faza 3: Memory Extraction DZIALA - consolidateSession() wyciaga fakty po sesji
- [x] MemoryExtractor.js - automatyczna ekstrakcja faktow z rozmow (przetestowane)
- [x] memoryWrite() + applyBrainUpdates() w AgentMemory - centralna funkcja zapisu pamieci
- [x] Minion Model - ustawienie w settings (tanszy model do operacji pamieci)
- [x] audit.log - kazda zmiana pamieci logowana
- [x] brain_archive.md - overflow z brain.md (gdy > 2000 znakow)
- [x] Prompt ekstrakcji wymusza 3. osobe ("User ma..." nie "Mam...")
- [x] Fuzzy dedup w _applyAppend() - wykrywa duplikaty po slowach kluczowych/liczbach
- [x] Prompt instruuje AI zeby sprawdzal istniejacy brain przed dodaniem faktow
- [x] Faza 4: Summarizer DZIALA - automatyczne podsumowanie rozmowy przy 70% limitu tokenow
- [x] Summarizer uzywa streamToComplete() (nie crashuje jak wczesniej)
- [x] RollingWindow: rozdzielony baseSystemPrompt od conversationSummary (brak layer collision)
- [x] Faza 7: RAG polish - RAGRetriever uzywa AgentMemory natywnie (nie przez workaround)
- [x] Faza 6: MCP tools pamieciowe - memory_update (zapamiętaj/zapomnij/czytaj brain) + memory_status (info o pamieci)
- [x] Voice commands - system prompt agenta rozpoznaje komendy: "zapamiętaj", "zapomnij", "co o mnie wiesz", "pokaż pamięć"
- [x] MCP narzedzia: 9 total (vault: read/list/write/delete/search + memory: search/update/status)
- [x] data.json: usunieta stara sekcja smart_chat_threads z adapterem ollama (powodowala crash)
- [x] Faza 5: L1/L2 konsolidacja DZIALA - automatyczna kompresja sesji (5 sesji -> L1, 5 L1 -> L2)
- [x] 10 plikow L1 + 2 pliki L2 utworzone z 48 sesji Jaskiera
- [x] L1 summaries wstrzykiwane do system promptu via getMemoryContext()
- [x] Frontmatter tracking - L1 pamięta które sesje zawiera, L2 pamięta które L1
- [x] Migracja folderow: weekly/monthly/yearly -> summaries/L1 + summaries/L2
- [x] memory_update read_brain nie wymaga juz uprawnien vault.write (fix permission)
- [x] Settings persistence: custom ustawienia Obsek w osobnym namespace `obsek` (nie giną po restarcie)
- [x] Minion model (Haiku) dziala - tańszy model do ekstrakcji pamieci, sumaryzacji, konsolidacji L1/L2
- [x] Platform auto-detection z nazw kluczy API (SC nie zapisuje `platform` explicite)
- [x] Wyczyszczone debug logi z konsoli (handle_chunk, handle_done, get_chat_model)

## Co ISTNIEJE w kodzie ale NIE ZWERYFIKOWANE

- [ ] Pozostale agenty (Iris, Dexter, Ezra, Silas, Lexie) - Jaskier dziala!
- [ ] MCP narzedzia: vault_search, vault_delete
- [ ] Agent Creator Modal (tworzenie agentow z UI)
- [ ] Strefy vaulta (VaultZones - konfiguracja jest w .pkm-assistant/config.yaml)
- [ ] Workflow parser i loader
- [ ] Agent Sidebar (osobny panel z lista agentow)

## Co jest PLANOWANE (pelna wizja w WIZJA.md)

- [x] Faza 4: Naprawa Summarizera - DONE (sesja 7)
- [x] Faza 7: RAG polish - DONE (sesja 8)
- [x] Faza 6: Voice commands / MCP tools - DONE (sesja 8)
- [x] Faza 5: Konsolidacja L1/L2 - DONE (sesja 9) - WSZYSTKIE FAZY PAMIECI GOTOWE!
- [x] Minion model fix - DONE (sesja 10) - settings persistence + platform detection
- [ ] Rebranding UI: "Smart Connections" -> "Obsek"
- [ ] Ollama one-click setup

## Wazne sciezki

- **Vault:** `C:/Users/jdziu/Mój dysk/JDHole_OS_2.0/`
- **Plugin w vaultcie:** `.obsidian/plugins/obsek/`
- **Pamiec Jaskiera:** `.pkm-assistant/agents/jaskier/memory/`
- **Brain Jaskiera:** `.pkm-assistant/agents/jaskier/memory/brain.md`
- **Sesje Jaskiera:** `.pkm-assistant/agents/jaskier/memory/sessions/`
- **Podsumowania L1:** `.pkm-assistant/agents/jaskier/memory/summaries/L1/`
- **Podsumowania L2:** `.pkm-assistant/agents/jaskier/memory/summaries/L2/`
- **Build:** `npm run build` w `C:\Users\jdziu\Desktop\Obsek\Obsek Plugin\`

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
