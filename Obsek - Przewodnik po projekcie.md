---
type: reference
project: Obsek Plugin
created: 2026-01-13
tags:
  - plugin
  - development
  - ai-guide
---

# 🧭 Obsek Plugin - Przewodnik po projekcie

> **Cel tego dokumentu:** Masz tu wszystko czego potrzebujesz żeby rozmawiać z AI (Antigravity, ROO Code, Claude) o zmianach w pluginie Obsek.

---

## 📍 Gdzie jest projekt?

```
C:\Users\jdziu\Mój dysk\Obsek Plugin\
```

---

## ✅ Co masz zainstalowane?

| Element | Status | Opis |
|---------|--------|------|
| **Smart Connections v4.1.7** | ✅ Pełna wersja | Cały kod źródłowy |
| **RAG / Embeddingi** | ✅ Działa | Indeksowanie notatek, semantic search |
| **Chat z AI** | ✅ Działa | Rozmowa z notatkami przez Claude/GPT |
| **Multi-provider API** | ✅ Działa | OpenAI, Anthropic, Ollama, OpenRouter |
| **UI (sidebar, modals)** | ✅ Działa | Panele boczne, okna dialogowe |

**Masz wszystko co Smart Connections** – pod nową nazwą "Obsek".

---

## 🗂️ Struktura projektu - Gdzie co jest?

### Główne foldery

| Folder | Co zawiera | Kiedy tam zaglądać? |
|--------|-----------|---------------------|
| `src/` | **Cały kod pluginu** | Gdy chcesz coś zmienić |
| `src/views/` | UI - panele, modalne, ustawienia | Zmiany wyglądu |
| `src/utils/` | Funkcje pomocnicze | Logika biznesowa |
| `external-deps/` | Biblioteki Smart Connections | Raczej nie ruszaj |
| `dist/` | Skompilowany plugin | Nie edytuj ręcznie |

### Kluczowe pliki

| Plik | Co robi | Priorytet dla Ciebie |
|------|---------|----------------------|
| `src/main.js` | **Główny plik** - tu plugin startuje | 🔴 Wysoki |
| `manifest.json` | Nazwa, wersja, autor pluginu | 🟡 Średni |
| `package.json` | Konfiguracja projektu | 🟢 Niski |
| `.env` | Klucze API | 🟡 Średni |

---

## 🎯 Gdzie są konkretne funkcje?

### 1. Chat z AI
```
src/views/          → UI chatu
external-deps/jsbrains/smart-chat-model/  → Logika chatu
```

### 2. Embeddingi / RAG
```
external-deps/jsbrains/smart-embed-model/  → Tworzenie embeddingów
external-deps/jsbrains/smart-sources/      → Indeksowanie notatek
```

### 3. Semantic Search (szukanie podobnych)
```
external-deps/jsbrains/smart-entities/     → Encje (notatki jako obiekty)
external-deps/jsbrains/smart-collections/  → Kolekcje encji
```

### 4. Ustawienia pluginu
```
src/views/settings_tab.js  → Zakładka ustawień
```

### 5. Ikony i ribbon (pasek boczny)
```
src/main.js  → funkcja get ribbon_icons()
src/utils/add_icons.js  → Definicje ikon
```

---

## 🤖 Jak rozmawiać z AI o zmianach?

### Szablon promptu do zmian

```
Pracuję nad pluginem Obsidian "Obsek" (fork Smart Connections v4.1.7).
Lokalizacja projektu: C:\Users\jdziu\Mój dysk\Obsek Plugin\

CHCĘ: [opisz co chcesz zmienić]

Pokaż mi:
1. Które pliki muszę zmodyfikować
2. Dokładnie jakie zmiany wprowadzić
3. Komendy do zbudowania i przetestowania
```

### Przykłady promptów

**Zmiana nazwy w UI:**
```
Chcę zmienić tekst "Smart Connections" na "Obsek" wszędzie w interfejsie.
Znajdź wszystkie miejsca gdzie jest ta nazwa i pokaż jak je zmienić.
```

**Dodanie własnej komendy:**
```
Chcę dodać nową komendę do pluginu która będzie [opisz co ma robić].
Pokaż mi gdzie dodać ten kod i jak go zarejestrować.
```

**Zmiana zachowania chatu:**
```
Chcę żeby chat domyślnie używał Claude zamiast GPT.
Gdzie jest ustawienie domyślnego providera?
```

**Dodanie nowego agenta:**
```
Chcę stworzyć system agentów - każdy agent ma:
- Własną osobowość (prompt)
- Własne ustawienia (model, temperatura)
- Własne workflows

Pokaż mi jak zaprojektować taką strukturę w tym pluginie.
```

---

## 🔄 Workflow wprowadzania zmian

```
1. OPISZ AI co chcesz zmienić
   ↓
2. AI pokazuje które pliki edytować
   ↓
3. AI wprowadza zmiany w kodzie
   ↓
4. Budujesz plugin:
   cd "C:\Users\jdziu\Mój dysk\Obsek Plugin"
   npm run build
   ↓
5. Kopiujesz do vaulta:
   Copy-Item "dist\*" -Destination "C:\Users\jdziu\Mój dysk\JDHole_OS_2.0\.obsidian\plugins\obsek\" -Force
   ↓
6. Reload plugins w Obsidianie
   ↓
7. Testujesz
```

---

## ⚠️ Ważne zasady

### NIE ruszaj sam:
- `external-deps/` – to biblioteki, psując je zepsujesz wszystko
- `dist/` – to się generuje automatycznie
- `node_modules/` – to zależności npm

### MOŻESZ modyfikować:
- `src/` – cały kod pluginu
- `manifest.json` – metadane
- `.env` – klucze API

### ZAWSZE po zmianach:
1. `npm run build` – zbuduj
2. Skopiuj do vaulta
3. Reload plugins

---

## 📚 Linki do dokumentacji

### Smart Connections (baza Obsek)
- [Smart Connections Docs](https://docs.smartconnections.app/) – **oficjalna dokumentacja Smart Connections**
- [Smart Connections GitHub](https://github.com/brianpetro/obsidian-smart-connections) – kod źródłowy
- [Smart Connections README](https://github.com/brianpetro/obsidian-smart-connections#readme) – opis funkcji
- [jsbrains - biblioteki core](https://github.com/brianpetro/jsbrains) – embeddingi, chat, RAG

### Obsidian Plugin Development
- [Obsidian Plugin API](https://docs.obsidian.md/Plugins) – oficjalna dokumentacja
- [Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin) – minimalny przykład
- [Obsidian API Types](https://github.com/obsidianmd/obsidian-api) – definicje TypeScript

### AI & MCP
- [Anthropic Claude API](https://docs.anthropic.com/) – dokumentacja Claude
- [OpenAI API](https://platform.openai.com/docs) – dokumentacja GPT
- [Model Context Protocol](https://modelcontextprotocol.io/) – MCP docs

### Twoje repo
- [Obsek na GitHubie](https://github.com/JDHole/obsek) – Twój fork

---

## 🎯 Następne kroki w rozwoju Obsek

Według Twojego planu (`PLAN - JDHole Agents Plugin.md`):

1. [ ] **Rebranding UI** – zmiana "Smart Connections" → "Obsek" wszędzie
2. [ ] **System Agentów** – 7 specjalizowanych AI (Silas, Jaskier, etc.)
3. [ ] **Lazy-loaded Workflows** – ładowanie instrukcji na żądanie
4. [ ] **MCP Integration** – podłączenie własnych MCP servers
5. [ ] **Advanced Settings** – temperatura, max tokens per agent

---

*Ostatnia aktualizacja: 2026-01-13*
