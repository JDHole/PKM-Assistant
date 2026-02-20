---
type: plan
project: JDHole Agents Plugin
status: draft
created: 2026-01-09
---

# 🧬 PLAN: Plugin "JDHole Agents" dla Obsidian

> **Wizja:** "Roo Code dla knowledge work" — system specjalizowanych agentów AI w Obsidianie z lazy-loaded workflows i pełnym RAG.

---

## 🎯 CZYM MA BYĆ TEN PLUGIN?

### Core Features

1. **System Agentów** — 7 specjalizowanych AI (Silas, Jaskier, Dexter, etc.)
2. **RAG + Embeddingi** — głęboka integracja z vaultem (jak Smart Connections)
3. **Lazy-loaded Workflows** — workflows ładowane dynamicznie gdy potrzebne (nie na starcie)
4. **Multi-provider** — wybór AI (Claude, GPT, Gemini, Ollama, OpenRouter)
5. **MCP Integration** — podłączenie własnych MCP servers
6. **Advanced Settings** — extended thinking, max tokens, temperature per agent

### Przewaga Konkurencyjna

| Copilot/Smart Connections | JDHole Agents |
|---------------------------|---------------|
| Jedno AI do wszystkiego | 7 specjalizowanych agentów |
| Tylko plugin | **Plugin + gotowy vault** |
| Basic RAG | RAG + workflows + MCP |
| Ogólny | Niszowy (knowledge workers) |

---

## 🛠️ TECHNICZNY PLAN DZIAŁANIA

### 1. CO FORKOWAĆ?

**Decyzja:** Fork **Smart Connections**

**Dlaczego nie Copilot:**
- Copilot = prosty chat, musisz dodawać RAG sam
- Smart Connections = zaawansowany RAG już jest

**Repo:** https://github.com/brianpetro/obsidian-smart-connections

### 2. CO ZOSTAWIĆ ZE SMART CONNECTIONS

✅ **Zachowaj:**
- System embeddingów
- Semantic search
- Graf połączeń
- Infrastruktura RAG

❌ **Wywal/zastąp:**
- UI chat (zrobisz swoje)
- Single-agent approach
- Jego prompty

### 3. CO DODAĆ

#### A. System Agentów

```typescript
interface Agent {
  id: string;              // "silas", "jaskier"
  name: string;            // "Silas"
  emoji: string;           // "💼"
  basePrompt: string;      // Core personality
  model: string;           // "claude-3-5-sonnet"
  mcpServers: string[];    // ["jdhole-obsidian", "plan-totalny"]
  workflows: Workflow[];   // Lazy-loaded
  settings: {
    temperature: number;
    maxTokens: number;
    extendedThinking: boolean;
  }
}
```

#### B. Workflow System

```typescript
interface Workflow {
  id: string;              // "silas_weekly_review"
  name: string;            // "Weekly Review"
  trigger: string[];       // ["weekly", "review", "przegląd"]
  content: string;         // Markdown content
  loadStrategy: "lazy" | "eager";  // Lazy = load when needed
}
```

**Flow:**
1. User: "Silas, weekly review"
2. Plugin wykrywa intent → szuka "silas + weekly review"
3. RAG znajduje workflow → ładuje do kontekstu
4. AI odpowiada z kontekstem workflow

#### C. Multi-Provider API

```typescript
interface AIProvider {
  name: "anthropic" | "openai" | "google" | "ollama" | "openrouter";
  endpoint: string;
  apiKey: string;
  models: string[];
}
```

#### D. UI/UX

**Sidebar z agentami:**
```
┌─────────────────────┐
│ 💼 Silas            │ ← Active
│ 🎭 Jaskier          │
│ ⚙️ Dexter           │
│ 📚 Persival         │
│ ...                 │
├─────────────────────┤
│ [⚙️ Settings]       │
└─────────────────────┘
```

**Settings UI:**
- Tab "Agenci" → lista agentów → edycja per agent
- Tab "Providers" → wybór AI provider + API key
- Tab "MCP" → podłączanie MCP servers
- Tab "Advanced" → fine-tuning per agent

---

## 📚 KLUCZOWE KONCEPTY (z rozmowy)

### API vs MCP vs "JS API"

| Termin | Co to | Przykład |
|--------|-------|----------|
| **API** | Interfejs do komunikacji | Claude API (external), `silas.js` (local) |
| **MCP** | Standard dla AI tools | `jdhole-obsidian` MCP server |
| **"JS API"** | Twoje funkcje w `silas.js` | `getAllSteps()`, `addPendingStep()` |

**W pluginie:**
- AI Provider API = połączenie z Claude/GPT
- MCP = rozszerzenie możliwości AI (dostęp do danych)
- Workflow API = Twoje funkcje które AI może wywoływać

### RAG (Retrieval-Augmented Generation)

**Prosty RAG:**
1. Embedduj notatki
2. User pyta
3. Szukaj podobnych notatek
4. Wrzuć do kontekstu

**Twój RAG (zaawansowany):**
1. Embedduj notatki + workflows
2. User pyta
3. RAG szuka:
   - Podobnych notatek (wiedza)
   - Podobnych workflows (instrukcje)
4. Ładuje TYLKO to co potrzebne
5. AI ma kontekst na miarę

### Lazy Loading Workflows

**Teraz (Antigravity):**
```
Aktywacja → Ładuj WSZYSTKO (10k+ tokenów)
```

**W pluginie:**
```
Aktywacja → Base prompt (2k tokenów)
User mówi "weekly review" → RAG ładuje workflow (dodatkowe 2k)
```

**Korzyści:**
- Tańsze (mniej tokenów)
- Szybsze (mniejszy kontekst)
- Elastyczne (workflows jako wiedza)

---

## 🗺️ ROADMAP (4-6 miesięcy)

### FAZA 1: Nauka + Setup (2-3 tygodnie)

- [ ] Fork Smart Connections
- [ ] Przestudiuj kod (głównie RAG engine)
- [ ] Nauka TypeScript basics
- [ ] Setup dev environment (Obsidian developer mode)

### FAZA 2: MVP - Jeden Agent (3-4 tygodnie)

- [ ] Usuń UI Smart Connections
- [ ] Dodaj prosty sidebar chat
- [ ] Integracja Claude API
- [ ] Jeden agent (Silas) działa
- [ ] Base prompt + 1 workflow

### FAZA 3: System Agentów (4-6 tygodni)

- [ ] UI przełączania agentów
- [ ] 7 agentów z promptami
- [ ] Settings per agent
- [ ] Lazy loading workflows
- [ ] RAG dla workflows

### FAZA 4: Multi-Provider (2-3 tygodnie)

- [ ] Wybór AI providera w settings
- [ ] OpenAI integration
- [ ] Google/Gemini integration
- [ ] Ollama (local) integration
- [ ] OpenRouter integration

### FAZA 5: Advanced Features (4-6 tygodni)

- [ ] Extended thinking toggle
- [ ] Max tokens / temperature per agent
- [ ] MCP server integration
- [ ] Tool use (edycja notatek)
- [ ] UI polish

### FAZA 6: Testing + Release (2-3 tygodnie)

- [ ] Beta testing (Ty + 5-10 ludzi)
- [ ] Bugfixy
- [ ] Dokumentacja
- [ ] Publikacja w Community Plugins

**TOTAL: 17-25 tygodni (4-6 miesięcy)**

---

## 🚀 CO ROBIĆ TERAZ (Next Steps)

### 1. Fork Smart Connections
```bash
# GitHub
1. Wejdź: https://github.com/brianpetro/obsidian-smart-connections
2. Kliknij "Fork"
3. Clone do siebie: git clone [twój-fork-url]
```

### 2. Nauka Basics
- [ ] Obsidian Plugin API docs: https://docs.obsidian.md/Plugins/Getting+started
- [ ] TypeScript crash course (3-4 dni z AI)
- [ ] Smart Connections codebase (1-2 tygodnie czytania)

### 3. Minimal POC (Proof of Concept)
- [ ] Dodaj przycisk "Silas" do ribbonu
- [ ] Przy kliknięciu → modal z chatem
- [ ] Chat → Claude API → odpowiedź
- [ ] **Meta:** Jeśli to zrobisz, reszta to "tylko" rozbudowa

---

## 💡 KLUCZOWE LINKI

| Zasób | URL |
|-------|-----|
| Smart Connections repo | https://github.com/brianpetro/obsidian-smart-connections |
| Obsidian Plugin API | https://docs.obsidian.md/Plugins |
| Copilot plugin (inspiracja) | https://github.com/logancyang/obsidian-copilot |
| Claude API docs | https://docs.anthropic.com |
| MCP docs | https://modelcontextprotocol.io |

---

## ⚠️ RZECZY DO PRZEMYŚLENIA

### Business Model

| Opcja | Plusy | Minusy |
|-------|-------|--------|
| Darmowy + donations | Community love | Mało $$ |
| Freemium (basic free) | Więcej userów | Trzeba hostować backend |
| Płatny ($5-10/msc) | Stabilny dochód | Mniej userów |
| **Vault + Plugin bundle** | **Premium positioning** | **Wymaga marketingu** |

**Rekomendacja:** Vault + Plugin w bundle za $49-99 jednorazowo.

### Konkurencja

- **Copilot:** 50k downloads, ale solo dev, wolniejszy
- **Smart Connections:** 100k downloads, inny focus
- **Szansa na wejście:** 30-40% że ktoś wyprzedzi
- **Przewaga:** Masz system (vault + workflows), nie tylko plugin

### Legal

- ✅ Forkowanie Smart Connections = OK (MIT license)
- ✅ Sprzedawanie forka = OK (zachowaj credit)
- ⚠️ Nazwa "Smart Connections" w nazwie = NIE

---

## 🎯 SUCCESS METRICS

**MVP (3 miesiące):**
- [ ] Plugin działa lokalnie
- [ ] 1 agent (Silas) odpowiada poprawnie
- [ ] Używasz go sam codziennie

**Beta (6 miesięcy):**
- [ ] 10-20 beta testerów
- [ ] Wszystkie 7 agentów działa
- [ ] Zero critical bugs

**Launch (9-12 miesięcy):**
- [ ] 100 płacących userów
- [ ] Community plugin approval
- [ ] 4.5+ gwiazdek rating

---

**Ostatnia aktualizacja:** 2026-01-09  
**Next review:** Po MVP (Q2 2026)
