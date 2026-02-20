# Obsek - Wizja Finalnego Produktu

> **Kopiuj ten plik do czatu z AI** zeby dac kontekst o tym DOKAD zmierzamy.
> Skonsolidowane z: Plan implementacji 1.0, 2.0, PLAN-9-DNI, PLAN JDHole Agents
> Ostatnia aktualizacja: 2026-02-20

---

## Jednym zdaniem

**"Roo Code dla knowledge work"** - system specjalizowanych agentow AI w Obsidianie,
kazdy z wlasna osobowoscia, pamiecia i umiejetnosciami, ktorzy pomagaja zarzadzac
notatkami, zdrowiem, kariera i projektami.

---

## Kluczowe filary

### 1. Agenci ze stalą pamiecią i osobowoscią

Kazdy agent to odrebna "osoba AI" ktora:
- Ma wlasna osobowosc (system prompt, styl komunikacji, emoji)
- PAMIETA rozmowy miedzy sesjami (hierarchiczna pamiec)
- Ma wlasne uprawnienia (co moze, czego nie moze)
- Uzywa wlasnego modelu AI (tani vs drogi, lokalny vs cloudowy)
- Ma wlasne workflow/instrukcje (ladowane dynamicznie przez RAG)

**Hierarchiczna pamiec agenta:**
```
.pkm-assistant/agents/jaskier/memory/
├── active_context.md     <- Co wlasnie robimy
├── sessions/             <- Pojedyncze rozmowy z podsumowaniami
├── weekly/               <- Podsumowania tygodni
├── monthly/              <- Podsumowania miesiecy
└── yearly/               <- "Mozg" - dlugoterminowa pamiec
```

Automatyczna agregacja: sesje -> tydzien -> miesiac -> rok.
Agent wie co robil z userem tydzien temu, miesiac temu, rok temu.

### 2. Gleboka integracja z vaultem

AI nie tylko gada - DZIALA w vaultcie:
- **Czyta** notatki (vault_read, vault_list)
- **Tworzy** nowe notatki (vault_write)
- **Szuka** semantycznie (vault_search + RAG embeddingi)
- **Usuwa** z potwierdzeniem (vault_delete)
- **System uprawnien** - blokuje niebezpieczne operacje
- **Vault Zones** - strefy z dodatkowymi zabezpieczeniami (np. folder Finanse)

### 3. Multi-provider AI

Uzytkownik wybiera skad bierze AI:
- **Claude** (Anthropic) - najlepszy do rozmow
- **GPT** (OpenAI) - alternatywa
- **Ollama** (lokalnie) - prywatnosc, bez kosztow
- **OpenRouter** - dostep do wielu modeli

Kazdy agent moze uzywac INNEGO modelu.

### 4. Hierarchia: Agenci + Miniony

**Glowni agenci** (rozmowa z userem):
- Jaskier - orkiestrator, codzienne sprawy, organizacja
- Iris - zdrowie, well-being, dziennik
- Dexter - techniczne sprawy, kodowanie, skrypty
- Ezra - meta-agent, tworzy i edytuje innych agentow
- Silas - kariera, projekty, finanse
- Lexie - pisanie, kreatywnosc, jezyki

**Miniony** (nie rozmawiaja z userem bezposrednio):
- Male lokalne modele (~0.5-3B) do atomowych zadan
- Np. wyciagnij tagi, sklasyfikuj notatke, strzeszczaj
- Wolane przez agentow jako narzedzia
- Dzialaja nawet offline (Transformers.js / Ollama)

---

## Wbudowani agenci - osobowosci

### Jaskier (orkiestrator)
- Empatyczny przyjaciel i organizator
- Pierwszy kontakt - kieruje do specjalistow gdy trzeba
- Codzienne sprawy, planowanie, organizacja
- Archetyp: HumanVibe

### Iris (zdrowie)
- Opiekun zdrowia i well-being
- Dziennik nastroju, nawyki, sen, dieta
- Delikatna, wspierajaca
- Archetyp: HumanVibe

### Dexter (tech)
- Ekspert techniczny, skrypty, Obsidian API
- Konkretny, bez lania wody
- Pomaga z kodem, automatyzacja vaultu
- Archetyp: ObsidianExpert

### Ezra (meta-agent)
- Tworzy i edytuje innych agentow
- Zna wszystkie archetypy i ich mozliwosci
- Edytuje .pkm-assistant/ (agenci, tools, workflows)
- Archetyp: AIExpert

### Silas (kariera/biznes)
- Projekty, kariera, finanse, cele
- Strategiczny, analityczny
- Pomaga z planowaniem i sledzeniem postepu
- Archetyp: AIExpert

### Lexie (pisanie)
- Kreatywnosc, pisanie, tlumaczenia
- Redaktor, ghostwriter, brainstormer
- Pomaga z trescia notatek
- Archetyp: HumanVibe

---

## Kluczowe funkcje (priorytetyzowane)

### MUST HAVE (bez tego plugin nie ma sensu)

1. **Ciagloa pamiec agentow** - agent pamieta miedzy sesjami
2. **Osobowosc agenta** - kazdy ma swoj styl, nie sa generyczni
3. **Czytanie i pisanie w vaultcie** - MCP tools
4. **System uprawnien** - user kontroluje co AI moze robic
5. **Multi-provider** - minimum Claude + Ollama
6. **Solidny chat UI** - markdown, streaming, kopiowanie

### SHOULD HAVE (duza wartosc, nie blokuja startu)

7. **Przelaczanie agentow** - sidebar z lista agentow
8. **Agent Creator** - tworzenie wlasnych agentow z UI
9. **RAG na notatkach** - AI odpowiada na podstawie notatek
10. **Token tracking** - widac ile kosztuje rozmowa
11. **Obsluga bledow** - eleganckie komunikaty gdy cos nie dziala
12. **Rebranding** - "Obsek" zamiast "Smart Connections"

### NICE TO HAVE (v2, po publikacji)

13. **Miniony** - male lokalne modele do atomowych zadan
14. **Web search** - AI szuka w internecie
15. **Lazy-loaded workflows** - dynamiczne ladowanie instrukcji
16. **Feedback & learning** - 👍👎 poprawiaja jakość
17. **Agent delegacja** - agenci przekazuja sobie zadania
18. **Kalendarz/przypomnienia** - integracja z daily notes
19. **One-click Ollama** - automatyczna konfiguracja lokalnych modeli
20. **CSS customization** - motywy i personalizacja UI

---

## Architektura (uproszczona)

```
┌─────────────────────────────────────────────────┐
│                   OBSEK PLUGIN                   │
├─────────────────────────────────────────────────┤
│  WIDOKI (UI)                                     │
│  Chat View │ Agent Sidebar │ Settings │ Modals   │
├─────────────────────────────────────────────────┤
│  CORE (mozg)                                     │
│  AgentManager │ MemorySystem │ PermissionSystem  │
├─────────────────────────────────────────────────┤
│  NARZEDZIA (MCP)                                 │
│  vault_read │ vault_write │ vault_search │ ...   │
├─────────────────────────────────────────────────┤
│  AI PROVIDERS                                    │
│  Anthropic │ OpenAI │ Ollama │ OpenRouter        │
├─────────────────────────────────────────────────┤
│  PAMIEC                                          │
│  RollingWindow │ Summarizer │ RAG │ Sessions     │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  VAULT STORAGE (.pkm-assistant/)                 │
│  agents/ │ tools/ │ workflows/ │ sessions/       │
└─────────────────────────────────────────────────┘
```

---

## Docelowy uzytkownik

- **Knowledge workers** - ludzie ktorzy duzo notuja w Obsidianie
- **Non-programisci** - plugin musi byc prosty w ustawieniu
- **Ludzie ktorzy chca AI "z charakterem"** - nie generyczny chatbot
- **Publiczny open-source plugin** dla spolecznosci Obsidian

---

## Metryki sukcesu

**v1.0 (pierwsze wydanie):**
- Plugin dziala stabilnie w Obsidianie
- 1-2 agentow z dzialajaca pamiecia
- Chat jest przyjemny w uzyciu
- Uzytkownik moze skonfigurowac API key z poziomu ustawien
- Uzywasz go sam codziennie

**v2.0 (pelna wersja):**
- 6 agentow z unikalnymi osobowosciami
- Hierarchiczna pamiec dziala
- Agent Creator pozwala tworzyc wlasnych
- Lokalne modele (Ollama) dzialaja
- Community Plugins w Obsidianie

---

*Skonsolidowano z 4 planow: 2026-02-20*
*Ten plik opisuje DOKAD zmierzamy, nie CO juz zrobiono (to jest w STATUS.md)*
