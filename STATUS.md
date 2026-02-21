# PKM Assistant (Obsek) - Status Projektu

> **Kopiuj ten plik do dowolnego czatu z AI** zeby dac kontekst o projekcie.
> Ostatnia aktualizacja: 2026-02-21 (sesja 17)

---

## Czym jest PKM Assistant?

Plugin do Obsidiana (wew. nazwa: Obsek). Fork Smart Connections v4.1.7.
Cel: Zespol AI agentow w Obsidianie - kazdy z wlasna osobowoscia, pamiecia, skillami i minionem (tanszym modelem-asystentem).

**Autor:** JDHole (non-programista, vibe-coding z AI)
**Lokalizacja:** `C:\Users\jdziu\Desktop\Obsek\Obsek Plugin\`
**Repo:** `https://github.com/JDHole/PKM-Assistant.git`
**Tech:** JavaScript (ES Modules), Obsidian API, esbuild, MCP

---

## Co NAPEWNO dziala (potwierdzone 2026-02-21)

- [x] Plugin laduje sie w Obsidianie bez bledow
- [x] Plugin indeksuje vault automatycznie
- [x] Chat z AI w Obsidianie (panel boczny, agent Jaskier)
- [x] Token counter w UI (np. 6627/100000)
- [x] AI widzi notatki uzytkownika (vault_read + vault_list dzialaja)
- [x] AI potrafi stworzyc nowa notatke (vault_write dziala)
- [x] Multi-provider: Claude Sonnet 4, DeepSeek V3.2/Reasoner, Ollama potwierdzone
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
- [x] Rebranding UI: "Smart Connections" -> "Obsek / PKM Assistant" (sesja 11)
- [x] WIZJA.md kompletna - 21 sekcji, pelna wizja produktu (sesja 11)
- [x] PLAN.md kompletny - Master Plan z 15 fazami, 154 checkboxy (sesja 11)
- [x] Nazwa "PKM Assistant" w tytule chatu, ustawieniach i komendach (sesja 12)
- [x] vault_search potwierdzone dzialanie (sesja 12)
- [x] vault_delete potwierdzone dzialanie (sesja 12)
- [x] Ustawienia pluginu po polsku z czytelnymi nazwami (sesja 12)
- [x] Chat UI redesign: nowoczesny wyglad, babielki, welcome screen, input ChatGPT-style (sesja 12)
- [x] CSS bug fix: chat_view.css nie byl adoptowany do dokumentu (sesja 12)
- [x] Auto-foldery pamieci: nowy agent od razu tworzy foldery pamieci (sesja 13)
- [x] Duplikaty sesji naprawione: AgentMemory sledzi aktywna sesje, auto-save przez AgentMemory (sesja 13)
- [x] Czysty log konsoli: ~70 spam logow usuniete, zostalo 24 jednorazowych startowych (sesja 13)
- [x] Typing indicator z tekstem statusu: "Mysle...", "Szukam w vaultcie..." itp. (sesja 14)
- [x] Polskie nazwy narzedzi w tool call display (sesja 14)
- [x] Krotszy system prompt dla lokalnych modeli (Ollama/LM Studio) (sesja 14)
- [x] Toggle "Pamiec w prompcie" w ustawieniach (sesja 14)
- [x] DeepSeek V3.2 + Reasoner obslugiwane (reasoning_content) (sesja 14)
- [x] Fix Reasoner + tool calls: SC adapter rozszerzony o reasoning_content w streaming (sesja 14)
- [x] Fix nieskonczonej petli L1/L2 konsolidacji (break gdy AI fail) (sesja 14)
- [x] Minion cache invalidacja przy zmianie platformy (sesja 14)
- [x] PLAN.md: sekcja 7.3 - Optymalizacja lokalnych modeli (8 checkboxow) (sesja 14)
- [x] WIZJA.md: sekcja 13 rozbudowana o strategie lokalne (sesja 14)
- [x] **FAZA 1: Skill Engine** - centralna biblioteka skilli (sesja 15)
- [x] SkillLoader: laduje skille z .pkm-assistant/skills/, cache, auto-reload (sesja 15)
- [x] 4 starter skille: daily-review, vault-organization, note-from-idea, weekly-review (sesja 15)
- [x] MCP tool skill_list - lista skilli agenta z filtrem po kategorii (sesja 15)
- [x] MCP tool skill_execute - aktywacja skilla, zwraca pelny prompt (sesja 15)
- [x] Guziki skilli w UI chatu (pill/chip style, hover efekt, scrollowalne) (sesja 15)
- [x] Agent tworzy nowe skille przez vault_write do .pkm-assistant/skills/ (sesja 15)
- [x] Auto-reload po vault_write do /skills/ + odswiezenie guzikow (sesja 15)
- [x] Przypisanie skilli do agenta: skills[] w konfiguracji (JS built-in + YAML custom) (sesja 15)
- [x] Wersjonowanie pluginu: reset z 4.1.7 na 1.0.0, wlasne wersjonowanie Obsek (sesja 15)
- [x] MCP narzedzia: 11 total (9 dotychczasowych + skill_list + skill_execute) (sesja 15)
- [x] **Skill Engine przetestowany - daily-review i vault-organization dzialaja swietnie** (sesja 15)
- [x] **FAZA 2: Minion per Agent** - system minionow (tansza AI do ciezkiej pracy) (sesja 16)
- [x] MinionLoader: laduje konfiguracje minionow z .pkm-assistant/minions/ (sesja 16)
- [x] 3 starter miniony: jaskier-prep, dexter-vault-builder, ezra-config-scout (sesja 16)
- [x] MinionRunner: dwa tryby - auto-prep (1. wiadomosc) + minion_task (delegowanie) (sesja 16)
- [x] MCP tool minion_task - agent swiadomie deleguje ciezka prace minionowi (sesja 16)
- [x] streamToCompleteWithTools() - petla tool-calling dla miniona (sesja 16)
- [x] Auto-prep: minion przygotowuje kontekst TYLKO przy 1. wiadomosci w sesji (sesja 16)
- [x] Kazdy built-in agent ma przypisanego miniona (Jaskier, Dexter, Ezra) (sesja 16)
- [x] Graceful failure: jesli minion padnie -> normalna odpowiedz agenta (sesja 16)
- [x] Hot-reload: edycja minion.md -> natychmiastowe przeladowanie (sesja 16)
- [x] MCP narzedzia: 12 total (11 + minion_task) (sesja 16)
- [x] Build: 6.6MB (sesja 16)
- [x] **Minion przetestowany w Obsidianie** - agent deleguje z konkretnym zadaniem, minion uzywa MCP tools (sesja 17)
- [x] Fix: minion po 3 iteracjach robi ostatnie wywolanie BEZ narzedzi zeby podsumowac wyniki (sesja 17)
- [x] Fix: agent system prompt v3 - konkretne przyklady jak uzywac minion_task (sesja 17)
- [x] Fix: XML hallucination cleanup - tanie modele halucynuja tagi XML, regex je usuwa (sesja 17)
- [x] Guziki kopiowania w tool call display: kopiuj input, output, calosc (sesja 17)

## Co ISTNIEJE w kodzie ale NIE ZWERYFIKOWANE

- [ ] Pozostale agenty (Dexter, Ezra) - testy przeniesione do FAZY 3 (Agent Manager)
- [ ] Agent Creator Modal (tworzenie agentow z UI)
- [ ] Strefy vaulta (VaultZones - konfiguracja jest w .pkm-assistant/config.yaml)
- [ ] Workflow parser i loader
- [ ] Agent Sidebar (osobny panel z lista agentow)

## Nastepne kroki (pelny plan w PLAN.md)

Aktualnie: **FAZA 0** (14/16) + **FAZA 1** (15/17) + **FAZA 2 - Minion per Agent** (DONE + TESTED!)
- Postep: 50/176 checkboxow (28%)
- Wersja: 1.0.2
- Uwaga usera: agent moze lepiej formulowac komendy dla miniona - do dalszego dopracowania
- [ ] Stabilnosc codziennego uzytku (3 dni bez bledow + fix bledow) - deadline: 2026-02-24
- [ ] obsidian_settings MCP tool (odlozone)
- [ ] JS sandbox w skillach (odlozone)

## Wazne sciezki

- **Vault:** `C:/Users/jdziu/Mój dysk/JDHole_OS_2.0/`
- **Plugin w vaultcie:** `.obsidian/plugins/obsek/`
- **Pamiec Jaskiera:** `.pkm-assistant/agents/jaskier/memory/`
- **Brain Jaskiera:** `.pkm-assistant/agents/jaskier/memory/brain.md`
- **Sesje Jaskiera:** `.pkm-assistant/agents/jaskier/memory/sessions/`
- **Podsumowania L1:** `.pkm-assistant/agents/jaskier/memory/summaries/L1/`
- **Podsumowania L2:** `.pkm-assistant/agents/jaskier/memory/summaries/L2/`
- **Skille:** `.pkm-assistant/skills/{name}/skill.md`
- **Miniony:** `.pkm-assistant/minions/{name}/minion.md`
- **Build:** `npm run build` w `C:\Users\jdziu\Desktop\Obsek\Obsek Plugin\`

---

## Struktura projektu (co gdzie jest)

```
Obsek Plugin/
├── src/                    # Caly kod pluginu
│   ├── main.js             # Punkt startowy - tu plugin sie wlacza
│   ├── core/               # Mozg: AgentManager, PermissionSystem, VaultZones
│   ├── agents/             # Definicje AI agentow
│   ├── skills/             # SkillLoader - centralna biblioteka skilli
│   ├── core/               # AgentManager, MinionLoader, MinionRunner, PermissionSystem
│   ├── mcp/                # Narzedzia: vault, pamiec, skille, minion_task
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

| Plik | Cel | Priorytet |
|------|-----|-----------|
| **WIZJA.md** | Dokad zmierzamy - finalny produkt | Swiety Gral #1 |
| **PLAN.md** | Master Plan realizacji wizji (checkboxy) | Swiety Gral #2 |
| **STATUS.md** (ten plik) | Co dziala, co nie, stan projektu | Kontekst |
| **DEVLOG.md** | Chronologiczny log zmian | Historia |
| **CLAUDE.md** | Konwencje kodu, tech stack | Dla AI |

Kiedy kopiujesz kontekst do innego czatu z AI, daj mu:
1. **WIZJA.md** + **PLAN.md** - cel i droga do niego
2. **STATUS.md** - aktualny stan
3. Konkretny plik/pliki ktorych dotyczy pytanie
