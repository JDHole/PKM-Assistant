# HANDOFF: Sprint S1 - Odciecie od Smart Connections

> **Sesja 30** (2026-02-23) - burza mozgow zakonczona, plan gotowy.
> Kopiuj ten plik + STATUS.md + PLAN.md + WIZJA.md do nowego czatu.
> **ZASADA: czytaj caly handoff ZANIM zaczniesz cokolwiek robic!**

---

## TL;DR - Co robimy i dlaczego

Plugin Obsek (PKM Assistant) to fork Smart Connections v4.1.7. Problem: **jesli user ma zainstalowane SC obok Obsek - oba pluginy sie sypia** bo Smart Connections uzywa globalnego singletona `window.smart_env`. Drugi problem: **embedding jest WYLACZONY** wiec wyszukiwanie semantyczne nie dziala. Trzeci problem: **wszedzie sa resztki brandingu SC** (linki, nazwy, "What's New" z SC).

Cel tego sprintu: plugin stoi na wlasnych nogach, nie koliduje z SC, embeddingi DZIALAJA.

---

## ARCHITEKTURA - jak to dziala (przeczytaj to!)

### Embedding pipeline (fundament pluginu)

```
INDEKSOWANIE (w tle, raz + przyrostowo):
  SmartSources skanuje vault → SmartEmbedModel zamienia tekst na wektory
  → wektory cache na dysku (.smart-env/) → gotowy indeks

WYSZUKIWANIE (gdy agent potrzebuje):
  vault_search("wakacje") → SmartEmbedModel zamienia query na wektor
  → cosine similarity z indeksem → wyniki posortowane po trafnosci
  → agent dostaje top wyniki w milisekundach, BEZ czytania plikow

AKTUALNY STAN: ZEPSUTE!
  → process_embed_queue: false (wylaczone w konfiguracji)
  → vault_search uzywa indexOf() (glupi string match)
  → indeks nie jest budowany
```

### Singleton problem (dlaczego nie moze koegzystowac z SC)

```
Plik: external-deps/jsbrains/smart-environment/smart_env.js

SmartEnv pisze do globalnych zmiennych:
  window.smart_env         ← JEDNA instancja na cale Obsidian
  window.smart_env_configs ← wspolny rejestr
  window.all_envs          ← historia

Gdy SC + Obsek zaladowane → ten z nowsza wersja nadpisuje drugiego
  → przegrany traci dostep do kolekcji, ustawien, embeddingów
  → bledy, crashe, nieprzewidywalne zachowanie
```

### Co SC dostarcza (22 aktywne moduly w external-deps/jsbrains/):

| Modul | Co robi | Krytyczny? |
|-------|---------|------------|
| smart-environment | Glowny env - singleton (DO PRZEROBIENIA!) | TAK |
| smart-sources | Pipeline: skanuj vault → embeduj → indeksuj | TAK |
| smart-blocks | Dzielenie notatek na bloki (## naglowki) | TAK |
| smart-entities | Bazowa klasa z wektorami + nearest/lookup | TAK |
| smart-collections | Collection + CollectionItem (baza danych) | TAK |
| smart-embed-model | Wrapper na modele embeddingowe (transformers.js, Ollama, OpenAI...) | TAK |
| smart-chat-model | Wrapper na LLM (Anthropic, DeepSeek, OpenAI, Ollama...) | TAK |
| smart-fs | File system warstwa (alias: smart-file-system) | TAK |
| smart-http-request | HTTP wrapper z CORS bypass dla Obsidian | TAK |
| smart-model | Bazowa klasa modeli AI | TAK |
| smart-models | Kolekcja zarzadzajaca konfiguracjami modeli | TAK |
| smart-utils | Narzedzia: cos_sim, hash, sort_by_score | TAK |
| smart-events | Pub/sub event system | TAK |
| smart-components | Bazowy system komponentow UI | TAK |
| smart-contexts | Zarzadzanie kontekstem AI | TAK |
| smart-groups | Grupowanie itemow w kolekcjach | TAK |
| smart-view | Renderowanie widokow SC | TAK |
| smart-settings | Persystencja ustawien | TAK |
| smart-notices | Powiadomienia | TAK |
| smart-rank-model | Ranking/scoring modele | TAK |
| smart-types | Typy TypeScript | TAK |
| **smart-actions** | **MARTWY KOD - 0 importow** | USUNAC |
| **smart-clusters** | **MARTWY KOD - 0 importow** | USUNAC |
| **smart-cluster-groups** | **MARTWY KOD - 0 importow** | USUNAC |
| **smart-completions** | **MARTWY KOD - 0 importow** | USUNAC |
| **smart-directories** | **MARTWY KOD - 0 importow** | USUNAC |

Plus warstwa Obsidian: `external-deps/obsidian-smart-env/` (SmartEnv Obsidian wrapper, SmartPlugin, SmartItemView, adaptery)

---

## ZADANIA - w kolejnosci wykonania

### ZADANIE 1: PKMEnv - usuniecie singletona (KRYTYCZNE)

**Cel:** Plugin nie pisze do window.smart_env, nie koliduje z SC.

**Plik zrodlowy:** `external-deps/jsbrains/smart-environment/smart_env.js`
**Plik Obsidian wrapper:** `external-deps/obsidian-smart-env/smart_env.js`

**Co zrobic:**

1. Stworz `src/core/PKMEnv.js` - kopia SmartEnv z nastepujacymi zmianami:
   - USUN globalny singleton: `static get global_env()` / `static set global_env()` (linia ~133-137 w base)
   - USUN `window.smart_env = ...` (linia 30 i 230 w base)
   - USUN `window.smart_env_configs` (linia ~158-165 w base)
   - USUN `window.all_envs` (linia ~232-234 w base)
   - USUN `static global_ref = ROOT_SCOPE` (linia 46 w base)
   - ZAMIEN singleton pattern na normalna instancje: `static async create()` zwraca `new this(opts)` bez globalnego zapisu
   - ZACHOWAJ cala reszte: settings, opts, modules, collections init, load/unload lifecycle

2. Stworz `src/core/PKMPlugin.js` - kopia SmartPlugin (`external-deps/obsidian-smart-env/smart_plugin.js`, 110 LOC):
   - Zamien `SmartEnv` na `PKMEnv`
   - Usun `show_release_notes` z commands (SC's release notes)
   - Zachowaj: register_commands, register_ribbon_icons, register_item_views, is_new_user, version tracking

3. Zaktualizuj `src/main.js`:
   - Linia 9: `import { SmartEnv } from 'obsidian-smart-env'` → `import { PKMEnv } from './core/PKMEnv.js'`
   - Linia 19: `import { SmartPlugin } from "obsidian-smart-env/smart_plugin.js"` → `import { PKMPlugin } from './core/PKMPlugin.js'`
   - Linia 56: `export default class ObsekPlugin extends SmartPlugin` → `extends PKMPlugin`
   - Linia 57: `SmartEnv = SmartEnv` → `PKMEnv = PKMEnv`
   - Linia 80: `this.SmartEnv.create(...)` → `this.PKMEnv.create(...)`

**UWAGA:** PKMEnv musi nadal dostarczac interfejs `env.*` (env.settings, env.smart_sources, env.events, env.opts itd.) bo WSZYSTKIE moduly SC uzywaja `this.env.*` przez konstruktor. Nie zmieniamy modulow - zmieniamy TYLKO jak env jest tworzony i przechowywany.

**Test:** Zainstaluj SC + Obsek jednoczesnie → oba dzialaja bez bledow.

---

### ZADANIE 2: Wlaczenie embeddingów (KRYTYCZNE)

**Cel:** Vault jest indeksowany, wektory sa budowane.

**Plik:** `external-deps/obsidian-smart-env/default.config.js`
**Linia 132:**
```javascript
// ZMIEN:
process_embed_queue: false, // OBSEK: disabled to reduce CPU usage
// NA:
process_embed_queue: true,
```

**Domyslne ustawienia embeddingu** (`external-deps/obsidian-smart-env/default.settings.js`):
```javascript
smart_sources: {
  embed_model: {
    adapter: "transformers",        // LOKALNE embeddingi, zero API
    transformers: {
      model_key: 'TaylorAI/bge-micro-v2',  // 384 dims, maly, szybki
    },
  },
}
```

To jest domyslny model - dziala LOKALNIE w przegladarce przez WebAssembly/WebGPU. Nie wymaga API key. User moze zmienic na Ollama/OpenAI w ustawieniach.

**Test:** Po wlaczeniu plugin → sprawdz w konsoli czy widac logi embeddowania notatek. Folder `.smart-env/` powinien rosnac.

---

### ZADANIE 3: Przepiecie vault_search na semantyczne wyszukiwanie (KRYTYCZNE)

**Cel:** Agent dostaje DOBRE wyniki zamiast glupiego indexOf.

**Plik:** `src/mcp/VaultSearchTool.js` (caly plik, 101 LOC)

**Aktualny stan:** Uzywa `content.toLowerCase().indexOf(queryLower)` - czyste dopasowanie stringow.

**Co zrobic:** Dodac tryb semantyczny ktory uzywa SmartSources.lookup():

```javascript
execute: async (args, app, plugin) => {
    const { query, folder } = args;
    const searchIn = args.searchIn || 'both';
    const limit = Math.min(args.limit || 20, 50);

    // TRYB SEMANTYCZNY: jesli embeddingi dostepne
    const env = plugin?.env;
    const smartSources = env?.smart_sources;
    if (smartSources && searchIn !== 'filename') {
        try {
            // lookup() embeduje query i szuka najblizszych wektorow
            const results = await smartSources.lookup({
                hypotheticals: [query],
                filter: folder ? { path_begins_with: folder } : {},
                k: limit
            });
            if (results?.length) {
                return {
                    success: true,
                    query,
                    searchType: 'semantic',
                    results: results.map(r => ({
                        path: r.item.path,
                        score: r.score,
                        matchType: 'semantic'
                    })),
                    count: results.length
                };
            }
        } catch (e) {
            console.warn('[VaultSearch] Semantic search failed, falling back to keyword:', e);
        }
    }

    // FALLBACK: indexOf (jak teraz) jesli embeddingi niedostepne
    // ... istniejacy kod ...
}
```

**WAZNE:** execute() dostaje `plugin` jako 3. argument (MCPClient passes plugin). Sprawdz ze to dziala - patrz `src/mcp/MCPClient.js` jak woła execute().

**Test:** Agent szuka "wakacje" → znajduje notatke o "urlop nad morzem".

---

### ZADANIE 4: Przepiecie memory_search analogicznie

**Plik:** `src/mcp/MemorySearchTool.js`

Analogicznie do vault_search - dodaj tryb semantyczny z fallbackiem na indexOf.
Pamiec agenta jest w `.pkm-assistant/agents/{name}/memory/` - tu nie ma SmartSources, wiec trzeba uzyc EmbeddingHelper (`src/memory/EmbeddingHelper.js`) i RAGRetriever (`src/memory/RAGRetriever.js`).

EmbeddingHelper aktualnie szuka embed modelu w 4 sciezkach - po zmianach na PKMEnv upewnij sie ze nadal go znajduje.

---

### ZADANIE 5: Rebranding - usuniecie SC ghost strings (WAZNE)

**"What's New" popup z SC:**

1. `src/views/release_notes_view.js` linia 59:
   ```javascript
   // AKTUALNIE:
   this.app.plugins.getPlugin('smart-connections')?.manifest.version ?? '';
   // ZMIENIC NA:
   this.app.plugins.getPlugin('obsek')?.manifest.version ?? '';
   // (albo uzyc this.app.plugins.plugins['obsek']?.manifest.version)
   ```

2. `src/views/release_notes_view.js` linia 6:
   ```javascript
   // ZMIENIC view_type:
   static get view_type() { return 'smart-release-notes-view'; }
   // NA:
   static get view_type() { return 'pkm-release-notes-view'; }
   ```

3. `src/views/release_notes_view.js` linia 25:
   ```javascript
   // ZMIENIC tytul:
   this.titleEl.setText(`What's new in v${this.version}`);
   // NA:
   this.titleEl.setText(`PKM Assistant - co nowego w v${this.version}`);
   ```

4. `releases/latest_release.md` - cala tresc to SC release notes v4.1.7. **ZASTAP** wlasna trescia PKM Assistant.

**View type rebranding:**

5. `src/views/connections_item_view.js` linia 4:
   ```javascript
   static get view_type() { return 'smart-connections-view'; }
   // → 'pkm-connections-view'
   ```

6. `src/views/connections_item_view.js` linia 6:
   ```javascript
   static get icon_name() { return 'smart-connections'; }
   // → 'pkm-connections' (lub inny zarejestrowany icon)
   ```

7. `src/views/lookup_item_view.js` linia 3:
   ```javascript
   static get view_type() { return 'smart-lookup-view'; }
   // → 'pkm-lookup-view'
   ```

**Codeblock rebranding:**

8. `src/views/connections_codeblock.js` linia 7:
   ```javascript
   'smart-connections',
   // → 'pkm-connections' (nazwa codeblock procesora)
   ```

9. `src/utils/build_connections_codeblock.js` linia 9:
   ```javascript
   return `\`\`\`smart-connections\n${json}\n\`\`\`\n`;
   // → `\`\`\`pkm-connections\n...`
   ```

**Settings tab - linki do smartconnections.app:**

10. `src/views/settings_tab.js` - **12 linkow** do `smartconnections.app` (linie 49, 54, 62, 69, 76, 83, 91, 96, 104, 132, 137). Albo USUN te linki, albo zamien na wlasna dokumentacje.

**Inne referencje SC:**

11. `src/components/connections-list-item/v3.js` linia 91:
    ```javascript
    const plugin = env.smart_connections_plugin;
    // → env.main (lub env.plugin - sprawdz co PKMEnv ustawia)
    ```

12. `src/components/connections-view/v3.js` linie 12, 57 - komentarze "Smart Connections Pro" → "PKM Connections"

13. `src/utils/connections_view_refresh_handler.js` linia 5:
    ```javascript
    console.log(`Refreshing smart connections view entity...`);
    // → 'PKM connections view'
    ```

14. `external-deps/obsidian-smart-env/smart_env.js` - caly plik pelny referencji SC:
    - Linia 9-11: importy SC-specific (add_smart_chat_icon, add_smart_connections_icon)
    - Linia 27-29: wywolania add_smart_*_icon()
    - Linia 43-46: protocol handler "smart-plugins/callback"
    - Linia 130-162: Smart Plugins OAuth (NIEPOTRZEBNE - usunac)
    - Linia 199-209: open_notifications_feed_modal, open_milestones_modal (SC features)
    - Linia 210-221: run_migrations() - usuwa stare SC pluginy (NIEPOTRZEBNE)
    - **Ten plik bedzie czesc PKMEnv** - wyczysc go z SC-specific kodu

15. `external-deps/obsidian-smart-env/smart_env.js` linia 182-184:
    ```javascript
    console.log("Smart Connections: Waiting for Obsidian Sync to finish");
    // → "PKM Assistant: Waiting..."
    ```

---

### ZADANIE 6: Usuniecie martwych modulow

**Usun te foldery z `external-deps/jsbrains/`:**
- `smart-actions/`
- `smart-clusters/`
- `smart-cluster-groups/`
- `smart-completions/`
- `smart-directories/`

**Zero importow nigdzie** - bezpieczne do usuniecia.

**Sprawdz po usunieciu:** `npm run build` musi przejsc bez bledow.

---

### ZADANIE 7: Build + test

**Build:**
```bash
cd "c:/Users/jdziu/Desktop/Obsek/Obsek Plugin"
npm run build
```

Aktualny build: 7.1 MB (`dist/main.js`). Po zmianach powinien byc mniejszy (mniej martwego kodu).

**Testy reczne (minimum):**
- [ ] Plugin laduje sie bez bledow w konsoli
- [ ] Chat z agentem dziala (streaming)
- [ ] vault_search zwraca semantyczne wyniki (nie indexOf)
- [ ] Connections View pokazuje podobne notatki
- [ ] "What's New" pokazuje PKM Assistant, nie SC
- [ ] Brak `window.smart_env` w konsoli (wpisz `window.smart_env` → undefined)
- [ ] Jesli masz SC zainstalowane: oba pluginy dzialaja jednoczesnie

---

## PLIKI KLUCZOWE - mapa

```
src/
  main.js                          ← ENTRY POINT, extends SmartPlugin (→ PKMPlugin)
  core/
    PKMEnv.js                      ← NOWY - zastepuje SmartEnv (bez singletona)
    PKMPlugin.js                   ← NOWY - zastepuje SmartPlugin
  mcp/
    VaultSearchTool.js             ← PRZEPISAC na semantyczny search
    MemorySearchTool.js            ← PRZEPISAC na semantyczny search
    MCPClient.js                   ← passes plugin as 3rd arg to execute()
  memory/
    EmbeddingHelper.js             ← wrapper na SmartEmbedModel (sprawdzic po zmianach)
    RAGRetriever.js                ← cache embeddingów sesji
  views/
    release_notes_view.js          ← "What's New" ghost - REBRAND
    connections_item_view.js       ← view_type 'smart-connections-view' → REBRAND
    lookup_item_view.js            ← view_type 'smart-lookup-view' → REBRAND
    connections_codeblock.js       ← codeblock processor name → REBRAND
    settings_tab.js                ← 12 linkow do smartconnections.app → USUNAC/ZAMIENIC
    chat_view.js                   ← uzywa env.smart_chat_model
  utils/
    modelResolver.js               ← env.config.modules.smart_chat_model
    build_connections_codeblock.js  ← 'smart-connections' string → REBRAND
  components/
    connections-list-item/v3.js     ← env.smart_connections_plugin → env.main
    connections-view/v3.js          ← komentarze "Smart Connections Pro"

external-deps/
  obsidian-smart-env/
    smart_env.js                   ← Obsidian SmartEnv wrapper (ZRODLO PKMEnv)
    smart_plugin.js                ← SmartPlugin base (ZRODLO PKMPlugin)
    default.config.js              ← process_embed_queue: false → TRUE!
    default.settings.js            ← domyslne ustawienia (transformers, bge-micro-v2)
  jsbrains/
    smart-environment/smart_env.js ← BASE SmartEnv z singletonem (ZRODLO PKMEnv)
    smart-sources/                 ← CORE: vault indexing pipeline (NIE RUSZAC)
    smart-blocks/                  ← CORE: block splitting (NIE RUSZAC)
    smart-entities/                ← CORE: wektory + nearest (NIE RUSZAC)
    smart-embed-model/             ← CORE: silnik embeddingowy (NIE RUSZAC)
    smart-chat-model/              ← CORE: LLM streaming (NIE RUSZAC)
    smart-collections/             ← baza kolekcji (NIE RUSZAC)
    [17 innych modulow]            ← NIE RUSZAC (uzywane, audyt potwierdzil)
    smart-actions/                 ← USUNAC (0 importow)
    smart-clusters/                ← USUNAC (0 importow)
    smart-cluster-groups/          ← USUNAC (0 importow)
    smart-completions/             ← USUNAC (0 importow)
    smart-directories/             ← USUNAC (0 importow)

smart_env.config.js                ← konfiguracja connections (mergowana z default)
releases/latest_release.md         ← SC release notes → ZASTAPIC WLASNA TRESCIA
```

---

## CZEGO NIE ROBIC

1. **NIE przepisuj SmartSources/SmartBlocks/SmartEntities** - to dzialajacy pipeline, kopiujemy go takim jakim jest
2. **NIE usuwaj 22 aktywnych modulow** z external-deps - one sa UZYWANE
3. **NIE przenosi plikow z external-deps do src/** - to przenosiny mebli, zero wartosci teraz
4. **NIE dotykaj smart-chat-model/adapters/** - adaptery LLM dzialaja
5. **NIE dotykaj esbuild.js** chyba ze build sie nie kompiluje
6. **NIE commituj bez weryfikacji buildu** - `npm run build` musi przejsc

---

## KONTEKST TECHNICZNY

### Jak SmartSources.lookup() dziala:
```javascript
// Embeduje query → szuka najblizszych wektorow w indeksie
const results = await env.smart_sources.lookup({
  hypotheticals: ["szukany tekst"],
  filter: {},          // opcjonalne filtry
  k: 20                // ile wynikow
});
// Kazdy result: { item: SmartSource, score: 0.0-1.0 }
```

### Jak vault_search dostaje plugin:
```javascript
// MCPClient.js - execute() przekazuje plugin jako 3. argument:
const result = await tool.execute(args, this.app, this.plugin);
```

### Jak EmbeddingHelper szuka modelu (4 sciezki):
```javascript
env?.smart_embed_model?.embed           // 1. bezposrednio na env
env?.modules?.smart_embed_model?.embed  // 2. przez modules
env?.smart_sources?.embed_model?.embed  // 3. przez smart_sources
env?.smart_blocks?.embed_model?.embed   // 4. przez smart_blocks
```
Po zmianach na PKMEnv - upewnij sie ze przynajmniej jedna sciezka dziala.

### Domyslna konfiguracja embeddingow:
- Adapter: `transformers` (lokalne, WebAssembly/WebGPU)
- Model: `TaylorAI/bge-micro-v2` (384 dims, ~50MB, sciaga sie raz)
- Alternatywy w ustawieniach: Ollama, OpenAI, Gemini, LM Studio
- User ma skonfigurowany: `snowflake-arctic-embed2` (w ustawieniach Obsidian, nie w kodzie)

### Build:
```bash
npm run build     # esbuild → dist/main.js (~7MB)
# auto-kopiuje do vault: C:/Users/jdziu/Moj dysk/JDHole_OS_2.0/.obsidian/plugins/obsek/
```

### Wersjonowanie:
- Aktualna: 1.0.8 (manifest.json + package.json)
- Bump do 1.0.9 po zakonczeniu tego sprintu
- Pliki: `manifest.json`, `package.json`

---

## PO ZAKONCZENIU SPRINTU

1. Zaktualizuj `STATUS.md` - dodaj info o PKMEnv, wlaczonych embeddingach
2. Zaktualizuj `DEVLOG.md` - wpis o sesji
3. Zaktualizuj `PLAN.md` - odznacz checkboxy Sprint S1
4. Bump wersji w manifest.json + package.json
5. Build + przetestuj w Obsidianie

---

## ZNANE BUGI (nie ruszaj teraz, inne sprinty)

- Agent update renderuje nowy widget (zamiast aktualizowac istniejacy)
- Ladowanie starej sesji crash
- Petla retry uprawnien
- Prompt caching NIEISTOTNE (user uzywa DeepSeek) - NIE wspominaj o tym
