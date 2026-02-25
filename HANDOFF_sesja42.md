# Handoff: Sesja 42 — 2.6 Part 2: Access Control

> Daj ten plik + STATUS.md + PLAN_v2.md nowemu chatowi AI.

---

## Co zrobilismy w sesji 41

**2.6 Personalizacja Agenta Part 1** — duzy refaktor systemu agentow:

### Nowy system Archetyp → Rola

Stary system: `archetype` = human_vibe/obsidian_expert/ai_expert, `role` = orchestrator/specialist/meta_agent.
Nowy system: **odwrocilismy to** — teraz `archetype` = broad class (4 sztuki), `role` = specific specialization.

**Archetyp** (4 wbudowane, user NIE tworzy nowych):
- orchestrator — koordynator, deleguje
- specialist — ekspert, robi sam
- assistant — pomocnik, elastyczny
- meta_agent — zarzadza systemem PKM

Kazdy archetyp ma `behavior_rules` wstrzykiwane do system promptu. Archetyp NIE zmienia temperature, NIE zmienia permissions — to robi TYLKO rola.

**Rola** (4 wbudowane + user tworzy wlasne):
- jaskier-mentor (meta_agent) — glowny mentor
- vault-builder (specialist) — ekspert Obsidian
- creative-writer (specialist) — pisarz
- daily-assistant (assistant) — codzienny pomocnik

Rola definiuje: behavior_rules, personality_template ({name} placeholder), recommended_skills, focus_folders, temperature, default_permissions. Zapisywane jako YAML w `.pkm-assistant/roles/`.

### Kluczowe pliki (nowe)
- `src/agents/archetypes/Archetypes.js` — 4 archetypy z behavior_rules
- `src/agents/roles/BuiltInRoles.js` — 4 wbudowane role
- `src/agents/roles/RoleLoader.js` — laduje built-in + custom YAML
- `src/agents/roles/index.js` — eksporty

### Kluczowe pliki (zmodyfikowane)
- `src/agents/Agent.js` — archetype/role nowe znaczenie
- `src/agents/AgentLoader.js` — `_migrateArchetypeRole()` auto-migracja
- `src/core/PromptBuilder.js` — sekcje archetype_behavior + role_behavior
- `src/core/AgentManager.js` — RoleLoader init + roleData w context
- `src/views/sidebar/AgentProfileView.js` — Creator flow + Memory tab redesign
- `src/views/obsek_settings_tab.js` — sekcja "Role Agentow" + RoleEditorModal

### Kolejnosc sekcji w prompcie
tożsamość → archetyp → pkm_system → środowisko → rola → osobowość → mozliwosci → ...

### Memory tab
6 plikow agenta widocznych: brain.md, playbook.md, vault_map.md, active_context.md, audit.log, sessions/. Kazdy collapsible. Playbook/vault_map maja mini-formularze "Dodaj". Brain/active_context/audit maja przycisk "Edytuj".

---

## Co trzeba zrobic w sesji 42

### 2.6 Part 2: Access Control

To byl temat ktory user chcial zrobic w sesji 41 ale odlozyl bo "za duzy, trzeba osobny chat". Oto co user powiedzial:

> "Punkt 4 z kolei jest WAZNY. [...] Focus folders jako solid blokada i panel uprawnien z per-folder access control. A! I jeszcze dochodzi TWARDA blokada sciezek ktore agent widzi, ale to tez pozniej chyba, bo czesc kodu tego jeszcze w ogole nie ma. I naprawienie petli permission-retry."

### Konkretne zadania:

1. **Focus folders jako TWARDE blokowanie** — jesli agent ma `focus_folders: ['Projects/**', 'Notes/**']`, to vault_read/vault_list/vault_search MUSZA odmowic dostepu do plikow POZA tymi folderami. Teraz focus_folders to tylko "sugestia" w prompcie — agent je ignoruje.

2. **Permission denial retry loop** — kiedy user odmawia permission (np. vault_write), agent powtarza ten sam tool call w kolko. Powinien zrozumiec odmowe i zaproponowac cos innego albo po prostu powiedziec "ok, nie bede tego robic".

3. **Per-folder access control panel** — UI w profilu agenta (tab Uprawnienia) do ustawiania read/write/none per folder. Wizualny panel zamiast textarea z globami.

4. **Per-agent master_task toggle** — mozliwosc wylaczenia delegacji W GORE (do Mastera) per agent.

### Uwagi od usera:
- User nie jest programista — tlumaczy rzeczy po swojemu
- Woli polskie komunikaty w UI
- "Brzydkie ale niech bedzie" — nie jest wymagajacy wizualnie na tym etapie
- Ma DeepSeek jako glowny model — prompt caching jest NIEISTOTNE

### Co warto przeczytac przed planowaniem:
1. `src/core/PermissionSystem.js` — jak dzialaja uprawnienia
2. `src/mcp/VaultReadTool.js`, `VaultListTool.js`, `VaultSearchTool.js` — gdzie dodac filtr focus folders
3. `src/views/sidebar/AgentProfileView.js` — tab Uprawnienia (linia ~284)
4. `src/agents/Agent.js` — pole focusFolders
5. `src/views/chat_view.js` — jak wyglada retry loop po odmowie permission

### Architektura ktora juz istnieje:
- `Agent.focusFolders` — tablica globow (np. `['Projects/**']`)
- `PermissionSystem` — sprawdza czy agent ma permission na dana akcje
- `PERMISSION_TYPES` — enum wszystkich typow uprawnien
- `TOOL_GROUPS` — 7 grup narzedzi MCP
- `agent.enabledTools` — per-agent lista wlaczonych narzedzi (sesja 37)

### Pytania do usera przed planowaniem:
- Jak focus folders maja dzialac z vault_search? (Semantyczne wyszukiwanie moze zwrocic wyniki SPOZA focus folders — filtrowac post-search czy pre-search?)
- Co z ukrytymi folderami (.pkm-assistant)? Agent MUSI miec do nich dostep zeby dzialac (brain, playbook, inbox).
- Jak wyglada "panel per-folder"? Czy to lista folderow z dropdown read/write/none, czy co innego?

---

## Kontekst techniczny

- **Build:** `npm run build` w `C:\Users\jdziu\Desktop\Obsek\Obsek Plugin\`
- **Vault:** `C:/Users/jdziu/Mój dysk/JDHole_OS_2.0/`
- **Wersja:** 1.0.9
- **Postep:** ~73% (~220/300 checkboxow z PLAN_v2.md)
- **Commit:** `5cea3ae` — feat: sesja 41
