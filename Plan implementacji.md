# PKM Assistant - Plan Implementacji

## Podsumowanie Projektu

**Cel**: Zbudować framework do tworzenia specjalizowanych asystentów AI w Obsidianie z ciągłą pamięcią, oparty na forku Smart Connections.

**Strategia**: Zachować strukturę projektu i UI patterns ze Smart Connections, ale zbudować własną implementację chatu i systemu agentów od zera, używając publicznych bibliotek.

**Docelowi użytkownicy**: Publiczny, open-source plugin dla społeczności Obsidian.

---

## Analiza Wykonalności

### Co jest możliwe do zrobienia

| Funkcjonalność | Wykonalność | Uzasadnienie |
|----------------|-------------|--------------|
| Chat z wieloma providerami AI | Tak | Publiczne API: Anthropic, OpenAI, Ollama, OpenRouter |
| System archetypów/agentów | Tak | Konfiguracja w YAML/JSON, przechowywanie w vaultcie |
| Rolling Window + Summarization | Tak | Standardowa technika zarządzania kontekstem |
| RAG na archiwum sesji | Tak | Można użyć istniejących embeddingów SC lub zbudować własne |
| MCP Integration | Tak | MCP SDK jest open-source, dobrze udokumentowany |
| System uprawnień | Tak | Logika po stronie pluginu |
| UI w Obsidianie | Tak | Obsidian API jest dobrze udokumentowane |

### Główne wyzwania techniczne

1. **Zależności jsbrains**: Obecny kod wymaga lokalnych pakietów - trzeba je zastąpić
2. **Embeddingi**: Smart Connections używa własnych modeli - trzeba zdecydować czy budować od zera czy integrować
3. **MCP w przeglądarce**: Obsidian działa w Electron - MCP wymaga Node.js runtime, co jest możliwe
4. **Zarządzanie tokenami**: Różne modele mają różne limity - trzeba to obsłużyć

---

## Architektura Systemu

```
┌─────────────────────────────────────────────────────────────────┐
│                        PKM Assistant Plugin                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Chat UI   │  │  Sidebar    │  │  Settings   │   Views      │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
├─────────┴────────────────┴────────────────┴─────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Agent     │  │   Memory    │  │ Permissions │   Core       │
│  │   Manager   │  │   System    │  │   System    │   Services   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
├─────────┴────────────────┴────────────────┴─────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  AI Client  │  │ MCP Client  │  │   Vault     │   Adapters   │
│  │  Adapter    │  │             │  │   Adapter   │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
├─────────┴────────────────┴────────────────┴─────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Anthropic  │  │   OpenAI    │  │   Ollama    │   Providers  │
│  │  OpenRouter │  │             │  │             │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘

                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Vault Storage                            │
├─────────────────────────────────────────────────────────────────┤
│  .pkm-assistant/                                                 │
│  ├── agents/           <- Definicje agentów YAML                │
│  ├── tools/            <- Custom MCP tools JSON/MD              │
│  ├── workflows/        <- Przepisy MD                           │
│  └── sessions/         <- Archiwum rozmów MD                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Struktura Plików Projektu

```
src/
├── main.js                      # Entry point pluginu
├── styles.css                   # Globalne style
│
├── core/                        # Główna logika
│   ├── AgentManager.js          # Zarządzanie agentami
│   ├── MemorySystem.js          # Rolling window + summarization
│   ├── PermissionSystem.js      # Uprawnienia i vault zones
│   └── SessionManager.js        # Zarządzanie sesjami
│
├── agents/                      # System agentów
│   ├── Agent.js                 # Bazowa klasa agenta
│   ├── archetypes/              # Wbudowane archetypy
│   │   ├── HumanVibe.js         # Empatyczny, humanistyczny
│   │   ├── ObsidianExpert.js    # Struktura vaulta, skrypty
│   │   └── AIExpert.js          # Prompting, workflows
│   └── AgentLoader.js           # Ładowanie z YAML
│
├── ai/                          # Integracja z AI
│   ├── AIClient.js              # Abstrakcja klienta AI
│   ├── providers/               # Implementacje providerów
│   │   ├── AnthropicProvider.js
│   │   ├── OpenAIProvider.js
│   │   ├── OllamaProvider.js
│   │   └── OpenRouterProvider.js
│   └── TokenCounter.js          # Liczenie tokenów
│
├── mcp/                         # MCP Integration
│   ├── MCPClient.js             # Klient MCP
│   ├── tools/                   # Wbudowane narzędzia
│   │   ├── VaultReadTool.js
│   │   ├── VaultWriteTool.js
│   │   ├── VaultSearchTool.js
│   │   └── index.js
│   └── ToolLoader.js            # Ładowanie custom tools
│
├── memory/                      # System pamięci
│   ├── RollingWindow.js         # Okno kontekstu
│   ├── Summarizer.js            # Podsumowywanie
│   ├── SessionArchive.js        # Archiwizacja sesji
│   └── RAGRetriever.js          # Retrieval z archiwum
│
├── views/                       # UI Components
│   ├── ChatView.js              # Główny widok chatu
│   ├── AgentSidebar.js          # Sidebar z agentami
│   ├── SettingsTab.js           # Ustawienia pluginu
│   ├── AgentCreatorModal.js     # Modal tworzenia agenta
│   └── PermissionsModal.js      # Modal uprawnień
│
├── components/                  # Reusable UI components
│   ├── MessageBubble.js
│   ├── AgentIcon.js
│   ├── TokenCounter.js
│   └── ToolCallDisplay.js
│
└── utils/                       # Utilities
    ├── yamlParser.js
    ├── markdownFormatter.js
    └── costCalculator.js
```

---

## Roadmap Implementacji

### Etap 1: Fundament - Podstawowy Chat

**Cel**: Działający chat z jednym agentem i połączeniem do API.

#### 1.1 Refaktoryzacja projektu
- [ ] Usunąć zależności od jsbrains z package.json
- [ ] Dodać publiczne zależności: `@anthropic-ai/sdk`, `openai`, itp.
- [ ] Zaktualizować esbuild.js dla nowej struktury
- [ ] Stworzyć podstawową strukturę folderów

#### 1.2 AI Client Adapter
- [ ] Stworzyć abstrakcyjny `AIClient` interface
- [ ] Zaimplementować `AnthropicProvider`
- [ ] Zaimplementować `OpenAIProvider`
- [ ] Zaimplementować `OllamaProvider`
- [ ] Zaimplementować `OpenRouterProvider`
- [ ] Dodać obsługę streaming responses

#### 1.3 Podstawowy Chat UI
- [ ] Stworzyć `ChatView` jako ItemView w Obsidianie
- [ ] Zaimplementować input field z wysyłaniem wiadomości
- [ ] Zaimplementować wyświetlanie odpowiedzi ze streamingiem
- [ ] Dodać podstawowe style CSS
- [ ] Zarejestrować widok w pluginie

#### 1.4 Settings
- [ ] Dodać ustawienia API keys dla każdego providera
- [ ] Dodać wybór domyślnego modelu
- [ ] Dodać podstawowe opcje: temperatura, max tokens

**Deliverable**: Plugin z działającym chatem, możliwość rozmowy z Claude/GPT.

---

### Etap 2: System Pamięci

**Cel**: Ciągłość rozmów między sesjami.

#### 2.1 Rolling Window
- [ ] Zaimplementować `RollingWindow` class
- [ ] Konfigurowalny limit tokenów: 10k - 1M+
- [ ] Automatyczne przycinanie starych wiadomości
- [ ] Zachowywanie system prompt

#### 2.2 Summarization
- [ ] Zaimplementować `Summarizer` class
- [ ] Automatyczne podsumowanie przy przekroczeniu limitu
- [ ] Konfigurowalny trigger: po X tokenach lub Y minutach
- [ ] Przechowywanie podsumowań w kontekście

#### 2.3 Session Management
- [ ] Zaimplementować `SessionManager`
- [ ] Automatyczny zapis sesji do `.pkm-assistant/sessions/`
- [ ] Format: `YYYY-MM-DD_AgentName_NNN.md`
- [ ] Przycisk ręcznego zapisu w UI
- [ ] Ładowanie poprzednich sesji

#### 2.4 Embeddingi - Istniejąca Infrastruktura
> **DECYZJA:** Używamy istniejącego `SmartEmbedModel` z Smart Connections - lokalne modele, zero kosztów API

**Dostępne modele (już w projekcie, działają offline po pobraniu):**
- `TaylorAI/bge-micro-v2` - najszybszy, 384 dim (rekomendowany)
- `Xenova/jina-embeddings-v2-base-zh` - wielojęzyczny 8K tokenów
- `nomic-ai/nomic-embed-text-v1.5` - 768 dim, 2048 tokens

- [ ] Stworzyć `EmbeddingHelper` - wrapper na SmartEmbedModel
- [ ] Konfigurowalny wybór modelu embeddingu w settings
- [ ] Indeksowanie sesji dla RAG

#### 2.5 RAG na archiwum sesji
- [ ] Zaimplementować `RAGRetriever`
- [ ] Indeksowanie sesji z embeddingami
- [ ] Semantic search po archiwum
- [ ] Automatyczne dołączanie relevantnego kontekstu

#### 2.6 Lazy Loading Workflows
> **KLUCZOWA FUNKCJA:** Workflows ładowane dynamicznie przez RAG, nie na starcie

- [ ] Zdefiniować format workflow w `.pkm-assistant/workflows/*.md`
- [ ] Embeddować workflows razem z notatkami
- [ ] RAG-based intent detection (np. "weekly review" → znajdź workflow)
- [ ] Dynamiczne ładowanie workflow do kontekstu gdy wykryty intent
- [ ] Konfigurowalny trigger threshold dla workflow detection

**Deliverable**: Chat z pamięcią, automatyczne zapisywanie i przywracanie kontekstu, lokalne embeddingi (SmartEmbedModel), oraz lazy loading workflows przez RAG.

---

### Etap 3: System Archetypów i Agentów

> **UWAGA:** Ten etap zawiera również **Hierarchiczną Pamięć Agentów** (Memory Consolidation)

#### 3.0 Hierarchiczna Pamięć Agentów (Memory Consolidation)
> **KLUCZOWA FUNKCJA:** Automatyczne agregowanie pamięci: sesje → tydzień → miesiąc → rok

**Struktura pamięci agenta:**
```
.pkm-assistant/agents/jaskier/memory/
├── active_context.md     <- Ostatnie wiadomości
├── sessions/             <- Pojedyncze sesje z podsumowaniami
├── weekly/               <- Podsumowania tygodni
├── monthly/              <- Podsumowania miesięcy
└── yearly/               <- "Mózg" - długoterminowa pamięć
```

- [ ] Automatyczne tworzenie podsumowania tygodnia z sesji
- [ ] Automatyczne tworzenie podsumowania miesiąca z tygodni
- [ ] Automatyczne tworzenie podsumowania roku z miesięcy
- [ ] Możliwość usunięcia starych sesji po agregacji (opcjonalne)
- [ ] "Mózg" agenta jako living document z kluczowymi informacjami



**Cel**: Możliwość tworzenia i przełączania między agentami.

#### 3.1 Archetypy - wbudowane
- [ ] Zdefiniować strukturę archetypu w kodzie
- [ ] Zaimplementować `HumanVibe` archetype
- [ ] Zaimplementować `ObsidianExpert` archetype
- [ ] Zaimplementować `AIExpert` archetype
- [ ] Każdy archetyp: system prompt, domyślne ustawienia, ikona

#### 3.2 Agent Definition Format
- [ ] Zdefiniować YAML schema dla agentów
- [ ] Zaimplementować `AgentLoader` - parsowanie YAML
- [ ] Walidacja definicji agenta
- [ ] Hot-reload przy zmianie pliku

Przykład formatu:
```yaml
# .pkm-assistant/agents/bibliotekarz.yaml
name: Bibliotekarz
emoji: "\U0001F4DA"
archetype: obsidian_expert
model: claude-3-5-sonnet-20241022
personality: |
  Jesteś skrupulatnym bibliotekarzem mojego vaulta.
  Pomagasz organizować notatki i znajdować powiązania.
focus_folders:
  - Biblioteka/**
  - Książki/**
temperature: 0.3
```

#### 3.3 Agent Manager
- [ ] Zaimplementować `AgentManager`
- [ ] Ładowanie wbudowanych agentów: Jaskier, Dexter, Ezra
- [ ] Ładowanie custom agentów z `.pkm-assistant/agents/`
- [ ] Przełączanie między agentami
- [ ] Osobna historia dla każdego agenta

#### 3.4 Agent Creator UI
- [ ] Stworzyć `AgentCreatorModal`
- [ ] Formularz z wyborem archetypu
- [ ] Pre-filled pola na podstawie archetypu
- [ ] Opcje zaawansowane: model, temperatura, focus folders
- [ ] Zapis do YAML

#### 3.5 Agent Sidebar
- [ ] Stworzyć `AgentSidebar` component
- [ ] Lista agentów z ikonami
- [ ] Kliknięcie przełącza agenta
- [ ] Wskaźnik aktywnego agenta
- [ ] Przycisk dodawania nowego agenta

**Deliverable**: System agentów z 3 wbudowanymi archetypami i możliwością tworzenia własnych.

---

### Etap 4: System Uprawnień

**Cel**: Kontrola nad tym co AI może robić.

#### 4.1 Permission System Core
- [ ] Zdefiniować 9 typów uprawnień
- [ ] Zaimplementować `PermissionSystem` class
- [ ] Sprawdzanie uprawnień przed akcją
- [ ] Logowanie prób dostępu

Uprawnienia:
1. Czytanie notatek
2. Edytowanie notatek
3. Tworzenie plików
4. Usuwanie plików
5. Dostęp poza vault
6. Wykonywanie komend
7. Thinking/reasoning
8. MCP tools
9. YOLO mode - wszystko auto-approve

#### 4.2 Vault Zones
- [ ] Zdefiniować format konfiguracji stref
- [ ] Zaimplementować sprawdzanie ścieżek
- [ ] Strefy wymagające explicit approve
- [ ] UI do zarządzania strefami

Przykład:
```yaml
# .pkm-assistant/config.yaml
zones:
  - name: Finanse
    path: 03 - Finanse/**
    requires_explicit_approve: true
  - name: Prywatne
    path: Personal/**
    requires_explicit_approve: true
```

#### 4.3 Permission UI
- [ ] Stworzyć `PermissionsModal`
- [ ] Checkboxy dla każdego uprawnienia
- [ ] Dropdown w chat UI do szybkiej zmiany
- [ ] Przycisk YOLO
- [ ] Zapisywanie preferencji per agent

#### 4.4 Approval Flow
- [ ] Modal potwierdzenia dla akcji wymagających approve
- [ ] Pokazywanie co AI chce zrobić
- [ ] Opcje: Approve / Deny / Always approve this
- [ ] Historia zatwierdzonych akcji

**Deliverable**: Pełny system uprawnień z vault zones i approval flow.

---

### Etap 5: MCP Integration

**Cel**: AI może używać narzędzi do interakcji z vaultem i światem zewnętrznym.

#### 5.1 MCP Client
- [ ] Zaimplementować `MCPClient`
- [ ] Połączenie z MCP servers
- [ ] Obsługa tool calls
- [ ] Error handling

#### 5.2 Wbudowane Vault Tools
- [ ] `vault_read` - czytanie notatek
- [ ] `vault_write` - tworzenie/edycja notatek
- [ ] `vault_search` - wyszukiwanie
- [ ] `vault_list` - listowanie plików
- [ ] `vault_delete` - usuwanie z potwierdzeniem

#### 5.3 Custom Tools
- [ ] Format definicji tool w JSON/MD
- [ ] `ToolLoader` - ładowanie z `.pkm-assistant/tools/`
- [ ] Hot-reload przy zmianie
- [ ] Walidacja definicji

Przykład:
```json
// .pkm-assistant/tools/web_search.json
{
  "name": "web_search",
  "description": "Search the web for information",
  "input_schema": {
    "type": "object",
    "properties": {
      "query": { "type": "string" }
    },
    "required": ["query"]
  },
  "mcp_server": "brave-search"
}
```

#### 5.4 Tool Call UI
- [ ] Wyświetlanie tool calls w chacie
- [ ] Pokazywanie inputów i outputów
- [ ] Collapsible dla długich wyników
- [ ] Ikony dla różnych typów narzędzi

**Deliverable**: Działająca integracja MCP z wbudowanymi vault tools.

---

### Etap 6: Ezra - Meta-Agent

**Cel**: Agent który może tworzyć i modyfikować innych agentów.

#### 6.1 Ezra Agent
- [ ] Specjalny agent z uprawnieniami do edycji `.pkm-assistant/`
- [ ] System prompt zorientowany na tworzenie agentów
- [ ] Znajomość wszystkich archetypów i ich możliwości

#### 6.2 Agent Creation przez Ezrę
- [ ] Ezra może tworzyć pliki YAML agentów
- [ ] Parsowanie intencji użytkownika
- [ ] Sugerowanie archetypu na podstawie opisu
- [ ] Preview przed utworzeniem

#### 6.3 Tool/Workflow Editing
- [ ] Ezra może edytować pliki w `.pkm-assistant/tools/`
- [ ] Ezra może tworzyć workflows w `.pkm-assistant/workflows/`
- [ ] Walidacja przed zapisem

**Deliverable**: Ezra jako meta-agent do zarządzania innymi agentami.

---

### Etap 7: Orchestrator - Delegowanie

**Cel**: Agenci mogą delegować zadania między sobą.

#### 7.1 Inter-Agent Communication
- [ ] Protokół komunikacji między agentami
- [ ] Przekazywanie kontekstu
- [ ] Śledzenie łańcucha delegacji

#### 7.2 Orchestrator Logic
- [ ] Jaskier jako domyślny orchestrator
- [ ] Rozpoznawanie kiedy delegować
- [ ] Wybór odpowiedniego agenta
- [ ] Agregacja wyników

#### 7.3 UI dla Orchestration
- [ ] Pokazywanie który agent aktualnie pracuje
- [ ] Historia delegacji w rozmowie
- [ ] Możliwość ręcznego przekierowania

**Deliverable**: System delegowania zadań między agentami.

---

## Zależności Techniczne

### Pakiety npm do dodania

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.30.0",
    "openai": "^4.70.0",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@huggingface/transformers": "^3.0.0",
    "js-tiktoken": "^1.0.19",
    "js-yaml": "^4.1.0",
    "obsidian": "latest"
  }
}
```

### Pakiety do usunięcia

Wszystkie `file:../jsbrains/*` zależności - zastąpione własnymi implementacjami lub publicznymi pakietami.

---

## Ryzyka i Mitygacje

| Ryzyko | Prawdopodobieństwo | Impact | Mitygacja |
|--------|-------------------|--------|-----------|
| MCP nie działa w Electron | Średnie | Wysoki | Fallback do własnych tool implementations |
| Limity tokenów różnych modeli | Pewne | Średni | Abstrakcja TokenCounter per provider |
| Koszty API przy dużym użyciu | Pewne | Średni | Wyświetlanie kosztów, limity, lokalne modele |
| Konflikty z aktualizacjami SC | Niskie | Niski | Własna implementacja, brak zależności |
| Złożoność RAG | Średnie | Średni | Etapowe wdrażanie, najpierw prosty search |

---

## Metryki Sukcesu

### Etap 1
- [ ] Użytkownik może rozmawiać z Claude/GPT przez plugin
- [ ] Streaming działa płynnie
- [ ] Ustawienia API keys działają

### Etap 2
- [ ] Rozmowa zachowuje kontekst między sesjami
- [ ] Automatyczne podsumowania działają
- [ ] Sesje są zapisywane do plików MD

### Etap 3
- [ ] 3 wbudowane agenty działają
- [ ] Użytkownik może tworzyć własnych agentów
- [ ] Przełączanie agentów zachowuje osobne historie

### Etap 4
- [ ] System uprawnień blokuje nieautoryzowane akcje
- [ ] Vault zones działają
- [ ] Approval flow jest intuicyjny

### Etap 5
- [ ] AI może czytać i pisać notatki przez MCP
- [ ] Custom tools można definiować w plikach
- [ ] Tool calls są widoczne w UI

### Etap 6
- [ ] Ezra może tworzyć nowych agentów
- [ ] Ezra może edytować tools i workflows

### Etap 7
- [ ] Agenci mogą delegować zadania
- [ ] Orchestration jest przejrzysty w UI

---

## Następne Kroki

1. **Zatwierdzenie planu** - review i feedback
2. **Setup projektu** - usunięcie zależności jsbrains, dodanie nowych
3. **Implementacja Etapu 1** - podstawowy chat
4. **Iteracyjne dodawanie funkcji** - etap po etapie

---

## Appendix: Przykładowe Pliki Konfiguracyjne

### Agent Definition - Jaskier

```yaml
# Wbudowany w kod, nie w pliku
name: Jaskier
emoji: "\U0001F3AD"
archetype: human_vibe
model: claude-3-5-sonnet-20241022
role: orchestrator
personality: |
  Jestem Jaskier - Twój główny asystent i przyjaciel w vaultcie.
  
  Moje podejście:
  - Empatyczny i ciepły, ale nie nachalny
  - Pomagam przemyśleć sprawy, nie narzucam rozwiązań
  - Gdy temat wymaga specjalisty, przekieruję do Dextera lub Ezry
  - Pamiętam o czym rozmawialiśmy i nawiązuję do tego
  
  Specjalizacje:
  - Codzienne sprawy i organizacja
  - Mental i well-being
  - Kreatywne projekty
  - Ogólne pytania
default_permissions:
  read_notes: true
  edit_notes: false
  create_files: false
  mcp: false
```

### Vault Zones Config

```yaml
# .pkm-assistant/config.yaml
version: 1
zones:
  - name: Finanse
    path: 03 - Finanse/**
    requires_explicit_approve: true
    
  - name: Prywatne
    path: Personal/**
    requires_explicit_approve: true
    
  - name: Projekty
    path: Projects/**
    default_permissions:
      read: true
      write: false
      
auto_save:
  enabled: true
  trigger_tokens: 200000
  trigger_timeout_minutes: 30
  
default_model: claude-3-5-sonnet-20241022
```

---

*Plan utworzony: 2026-01-16*
*Wersja: 1.0*
