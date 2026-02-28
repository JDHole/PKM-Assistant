/**
 * PlaybookManager
 * Manages playbook.md and vault_map.md per agent.
 * These files are the agent's "instruction manual" and "terrain map".
 * The minion reads them during auto-prep to prepare context.
 *
 * Playbook Builder: auto-generates sections from agent config,
 * user can override per-agent, custom "Gdy → Zrób" rules.
 * compilePlaybook() merges everything into playbook.md.
 */

import { getArchetype } from '../agents/archetypes/Archetypes.js';
import { TOOL_GROUPS } from './PromptBuilder.js';
import { TOOL_INFO } from '../components/ToolCallDisplay.js';

/** Base path for agent configs */
const AGENTS_BASE = '.pkm-assistant/agents';

/** Polish labels for tool groups */
const GROUP_LABELS = {
    vault: 'Vault (notatki)',
    memory: 'Pamięć (długoterminowa)',
    skills: 'Umiejętności',
    delegation: 'Delegowanie',
    communication: 'Komunikacja między agentami',
    artifacts: 'Artefakty (plany, zadania)',
    agora: 'Agora (wspólna baza wiedzy)',
    web: 'Internet',
    interaction: 'Interakcja z userem'
};

/**
 * Starter playbook templates for built-in agents
 */
const STARTER_PLAYBOOKS = {
    jaskier: `# Playbook: Jaskier 🎭

## Rola
Główny asystent użytkownika - orchestrator, który pomaga w codziennych sprawach, organizacji i kreatywnych projektach.

## Narzędzia

### Vault (notatki użytkownika)
- **vault_read** — czytaj pojedynczą notatkę (znasz ścieżkę)
- **vault_list** — listuj zawartość folderu
- **vault_search** — szukaj frazę w notatkach (DELEGUJ MINIONOWI jeśli szerokie szukanie)
- **vault_write** — twórz/edytuj notatkę (wymaga zgody usera)
- **vault_delete** — usuń notatkę (wymaga zgody usera)

### Pamięć (Twoja pamięć długoterminowa)
- **memory_search** — szukaj w poprzednich rozmowach i brain.md
- **memory_update** — zapamiętaj/zapomnij/aktualizuj fakty w brain.md
- **memory_status** — pokaż stan pamięci (ile sesji, rozmiar brain)

### Skille (instrukcje krok-po-kroku)
- **skill_list** — lista dostępnych umiejętności
- **skill_execute** — aktywuj skill po nazwie

### Delegowanie
- **minion_task** — deleguj ciężką robotę minionowi (szukanie, analiza wielu plików)
- **master_task** — konsultuj trudne pytania z ekspertem (potężniejszy model)

## Skille
- **daily-review** — codzienny przegląd notatek, zadań, priorytetów
- **vault-organization** — analiza struktury vaulta, propozycje organizacji
- **note-from-idea** — tworzenie notatki z luźnego pomysłu
- **weekly-review** — tygodniowy przegląd postępów

## Procedury

### Gdy user pyta o coś w vaultcie
1. Oceń złożoność pytania
2. Proste (1 konkretny plik) → vault_read
3. Złożone (szukanie, wiele plików) → minion_task("Przeszukaj vault pod kątem...")

### Gdy user chce coś zapamiętać
1. Od razu → memory_update(operation: "update_brain", content: fakt)
2. NIE czekaj do końca rozmowy

### Gdy user chce użyć skilla
1. Sprawdź skill_list
2. skill_execute(name: "nazwa-skilla")
3. Wykonaj instrukcje ze skilla

### Gdy user chce trudną analizę
1. Oceń czy sam dasz radę
2. Zbyt trudne → master_task z odpowiednim trybem
3. Tryb 3 (skip_minion) najczęściej daje najlepsze wyniki

### Gdy user pyta o coś z pamięci
1. Sprawdź brain.md (memory_update: read_brain)
2. Nie znalazłeś → memory_search
3. Dalej nic → minion_task("Przeszukaj pamięć i vault...")
`,

    dexter: `# Playbook: Dexter 🔧

## Rola
Ekspert od Obsidiana, PKM i struktury vaulta. Pomaga z organizacją, szablonami, pluginami i optymalizacją workflow.

## Narzędzia

### Vault
- **vault_read** — czytaj notatki i pliki konfiguracji
- **vault_list** — analizuj strukturę folderów
- **vault_search** — szukaj w notatkach
- **vault_write** — twórz szablony, modyfikuj notatki
- **vault_delete** — usuń niepotrzebne pliki

### Skille
- **skill_list** / **skill_execute** — lista i aktywacja umiejętności

### Delegowanie
- **minion_task** — deleguj analizę wielu plików minionowi

## Strefy zainteresowania
- Templates/ — szablony notatek
- .obsidian/ — konfiguracja Obsidiana (czytaj, nie modyfikuj)
- Cały vault — analiza struktury i organizacji

## Procedury

### Analiza struktury vaulta
1. vault_list("/") — główne foldery
2. Dla ważnych folderów → vault_list(folder)
3. Podsumowanie: co gdzie jest, co poprawić

### Tworzenie szablonu
1. Zapytaj usera o cel szablonu
2. vault_search istniejących szablonów (wzorce)
3. vault_write nowego szablonu w Templates/

### Organizacja notatek
1. minion_task("Przeanalizuj strukturę vaulta, policz pliki w folderach")
2. Zaproponuj reorganizację na podstawie wyników
3. Po akceptacji usera → vault_write przeniesienia
`,

    ezra: `# Playbook: Ezra 🧠

## Rola
Meta-agent - ekspert od AI, promptingu, konfiguracji agentów i systemu PKM Assistant.

## Narzędzia

### Vault
- **vault_read** — czytaj konfiguracje i notatki
- **vault_list** — przeglądaj strukturę .pkm-assistant/
- **vault_search** — szukaj w konfiguracji i notatkach
- **vault_write** — twórz/edytuj agentów, skille, miniony

### Pamięć
- **memory_search** / **memory_update** / **memory_status**

### Skille
- **skill_list** / **skill_execute**

### Delegowanie
- **minion_task** — deleguj skanowanie konfiguracji minionowi

## Strefy zainteresowania
- .pkm-assistant/ — cała konfiguracja systemu
- .pkm-assistant/agents/ — konfiguracje agentów
- .pkm-assistant/skills/ — biblioteka umiejętności
- .pkm-assistant/minions/ — konfiguracje minionów

## Procedury

### Tworzenie nowego agenta
1. Zapytaj o: imię, emoji, rolę, osobowość
2. Wybierz archetyp (human_vibe, obsidian_expert, ai_expert)
3. vault_write do .pkm-assistant/agents/{name}.yaml
4. Przypisz miniona i skille

### Tworzenie nowego skilla
1. Zapytaj o cel skilla
2. vault_write do .pkm-assistant/skills/{name}/skill.md
3. Format: YAML frontmatter + instrukcje markdown

### Diagnoza systemu
1. minion_task("Przeskanuj .pkm-assistant/ - sprawdź agentów, skille, miniony")
2. Sprawdź memory_status
3. Raportuj stan systemu
`
};

/**
 * Starter vault_map templates for built-in agents
 */
const STARTER_VAULT_MAPS = {
    jaskier: `# Vault Map: Jaskier 🎭

## Dostęp
Pełny dostęp do całego vaulta użytkownika.

## Struktura systemu (stała)
- **.pkm-assistant/** — system PKM Assistant (ukryty folder)
  - **agents/** — konfiguracje i pamięć agentów
  - **skills/** — centralna biblioteka umiejętności
  - **minions/** — konfiguracje minionów
- **.obsidian/** — konfiguracja Obsidiana (NIE MODYFIKUJ)

## Struktura vaulta użytkownika
> Ta sekcja zostanie uzupełniona automatycznie przez miniona
> przy pierwszym użyciu (auto-prep przeskanuje vault).

- / (root) — do uzupełnienia
`,

    dexter: `# Vault Map: Dexter 🔧

## Dostęp
Pełny dostęp do vaulta, ze szczególnym naciskiem na strukturę i szablony.

## Strefy kluczowe
- **Templates/** — szablony notatek (tworzenie, edycja)
- **.obsidian/** — konfiguracja Obsidiana (TYLKO ODCZYT)
  - plugins/ — zainstalowane pluginy
  - snippets/ — CSS snippets
  - themes/ — motywy

## Struktura systemu
- **.pkm-assistant/** — system PKM Assistant
  - agents/dexter/ — Twoja konfiguracja i pamięć

## Struktura vaulta użytkownika
> Ta sekcja zostanie uzupełniona automatycznie przez miniona.

- / (root) — do uzupełnienia
`,

    ezra: `# Vault Map: Ezra 🧠

## Dostęp
Pełny dostęp, ze szczególnym naciskiem na .pkm-assistant/ (konfiguracja systemu).

## Strefy kluczowe
- **.pkm-assistant/** — GŁÓWNA STREFA PRACY
  - **agents/** — konfiguracje agentów (YAML + pamięć)
    - {agent}/memory/brain.md — pamięć długoterminowa
    - {agent}/playbook.md — instrukcje agenta
    - {agent}/vault_map.md — mapa vaulta agenta
  - **skills/** — biblioteka umiejętności
    - {skill}/skill.md — definicja skilla (YAML + markdown)
  - **minions/** — konfiguracje minionów
    - {minion}/minion.md — definicja miniona (YAML + markdown)

## Struktura vaulta użytkownika
> Ta sekcja zostanie uzupełniona automatycznie przez miniona.

- / (root) — do uzupełnienia
`
};

export class PlaybookManager {
    /**
     * @param {Object} vault - Obsidian Vault object
     */
    constructor(vault) {
        this.vault = vault;
    }

    /**
     * Get the file path for an agent's playbook
     * @param {string} agentName - Agent name
     * @returns {string} Path to playbook.md
     */
    getPlaybookPath(agentName) {
        const safeName = agentName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        return `${AGENTS_BASE}/${safeName}/playbook.md`;
    }

    /**
     * Get the file path for an agent's vault_map
     * @param {string} agentName - Agent name
     * @returns {string} Path to vault_map.md
     */
    getVaultMapPath(agentName) {
        const safeName = agentName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        return `${AGENTS_BASE}/${safeName}/vault_map.md`;
    }

    /**
     * Ensure playbook.md and vault_map.md exist for all built-in agents.
     * Creates starter files if missing.
     * @param {Agent[]} agents - List of agents
     */
    async ensureStarterFiles(agents) {
        for (const agent of agents) {
            const safeName = agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            await this._ensurePlaybook(safeName, agent);
            await this._ensureVaultMap(safeName, agent);
        }
    }

    /**
     * Read playbook content for an agent (returns empty string if missing)
     * @param {string} agentName - Agent name
     * @returns {Promise<string>} Playbook content
     */
    async readPlaybook(agentName) {
        const path = this.getPlaybookPath(agentName);
        try {
            const exists = await this.vault.adapter.exists(path);
            if (!exists) return '';
            return await this.vault.adapter.read(path);
        } catch {
            return '';
        }
    }

    /**
     * Read vault_map content for an agent (returns empty string if missing)
     * @param {string} agentName - Agent name
     * @returns {Promise<string>} Vault map content
     */
    async readVaultMap(agentName) {
        const path = this.getVaultMapPath(agentName);
        try {
            const exists = await this.vault.adapter.exists(path);
            if (!exists) return '';
            return await this.vault.adapter.read(path);
        } catch {
            return '';
        }
    }

    /** @private */
    async _ensurePlaybook(safeName, agent) {
        const path = `${AGENTS_BASE}/${safeName}/playbook.md`;
        try {
            const exists = await this.vault.adapter.exists(path);
            if (exists) return;

            // Use agent-specific starter if available, otherwise generic
            const content = STARTER_PLAYBOOKS[safeName] || this._genericPlaybook(agent);
            await this.vault.adapter.write(path, content);
        } catch (e) {
            console.warn(`[PlaybookManager] Could not create playbook for ${safeName}:`, e);
        }
    }

    /** @private */
    async _ensureVaultMap(safeName, agent) {
        const path = `${AGENTS_BASE}/${safeName}/vault_map.md`;
        try {
            const exists = await this.vault.adapter.exists(path);
            if (exists) return;

            const content = STARTER_VAULT_MAPS[safeName] || this._genericVaultMap(agent);
            await this.vault.adapter.write(path, content);
        } catch (e) {
            console.warn(`[PlaybookManager] Could not create vault_map for ${safeName}:`, e);
        }
    }

    /** @private */
    _genericPlaybook(agent) {
        return `# Playbook: ${agent.name}

## Rola
${agent.personality || 'Asystent AI'}

## Narzędzia
- vault_read, vault_list, vault_search, vault_write
- memory_search, memory_update, memory_status
- skill_list, skill_execute
${agent.minion ? '- minion_task — deleguj ciężką robotę minionowi\n' : ''}

## Procedury
> Uzupełnij procedury specyficzne dla tego agenta.
`;
    }

    /** @private */
    _genericVaultMap(agent) {
        return `# Vault Map: ${agent.name}

## Dostęp
${agent.focusFolders?.length > 0 ? agent.focusFolders.map(f => `- ${f}`).join('\n') : 'Pełny dostęp do vaulta.'}

## Struktura systemu
- .pkm-assistant/ — system PKM Assistant
- .obsidian/ — konfiguracja Obsidiana

## Struktura vaulta użytkownika
> Ta sekcja zostanie uzupełniona automatycznie przez miniona.
`;
    }

    // ═══════════════════════════════════════════
    // PLAYBOOK BUILDER — auto-generation + compile
    // ═══════════════════════════════════════════

    /**
     * Generate "Rola" section from archetype + role + personality.
     * @param {import('../agents/Agent.js').default} agent
     * @param {Object} plugin
     * @returns {string} Markdown
     */
    generateRolaSection(agent, plugin) {
        const lines = ['## Rola i zachowanie'];

        // Archetype
        const archetype = getArchetype(agent.archetype);
        if (archetype) {
            lines.push('', `**Typ:** ${archetype.name} — ${archetype.description}`, '');
            lines.push('Zasady typu:');
            for (const rule of archetype.behavior_rules || []) {
                lines.push(`- ${rule}`);
            }
        }

        // Role
        const roleLoader = plugin.agentManager?.roleLoader;
        const roleData = roleLoader?.getRole(agent.role);
        if (roleData) {
            lines.push('', `**Rola:** ${roleData.name} — ${roleData.description || ''}`, '');
            if (roleData.behavior_rules?.length > 0) {
                lines.push('Zasady roli:');
                for (const rule of roleData.behavior_rules) {
                    lines.push(`- ${rule}`);
                }
            }
        }

        // Personality
        if (agent.personality) {
            lines.push('', '**Osobowość:**', agent.personality);
        }

        // Agent rules
        if (agent.agentRules) {
            lines.push('', '**Reguły agenta:**', agent.agentRules);
        }

        return lines.join('\n');
    }

    /**
     * Generate "Narzędzia" section from enabled MCP tools.
     * @param {import('../agents/Agent.js').default} agent
     * @returns {string} Markdown
     */
    generateNarzedziaSection(agent) {
        const lines = ['## Narzędzia'];

        const allTools = Object.values(TOOL_GROUPS).flat();
        const enabledTools = agent.enabledTools?.length > 0 ? agent.enabledTools : allTools;

        for (const [groupId, toolNames] of Object.entries(TOOL_GROUPS)) {
            const groupTools = toolNames.filter(t => enabledTools.includes(t));
            if (groupTools.length === 0) continue;

            lines.push('', `### ${GROUP_LABELS[groupId] || groupId}`);
            for (const tool of groupTools) {
                const info = TOOL_INFO[tool];
                lines.push(`- **${tool}** — ${info?.label || tool}`);
            }
        }

        return lines.join('\n');
    }

    /**
     * Generate "Skille" section from assigned skills.
     * @param {import('../agents/Agent.js').default} agent
     * @param {Object} plugin
     * @returns {string} Markdown
     */
    generateSkilleSection(agent, plugin) {
        const lines = ['## Umiejętności (Skille)'];

        const skillLoader = plugin.agentManager?.skillLoader;
        const agentSkills = agent.skills || []; // string[] of skill names

        if (!skillLoader || agentSkills.length === 0) {
            lines.push('', 'Brak przypisanych skilli.');
            return lines.join('\n');
        }

        lines.push('');
        for (const skillName of agentSkills) {
            const skill = skillLoader.getSkill(skillName);
            if (skill) {
                lines.push(`- **${skill.name}** — ${skill.description || 'brak opisu'}`);
            } else {
                lines.push(`- **${skillName}** — (nie znaleziono)`);
            }
        }

        return lines.join('\n');
    }

    /**
     * Generate rich "Delegowanie" section from minions + masters.
     * @param {import('../agents/Agent.js').default} agent
     * @param {Object} plugin
     * @returns {string} Markdown
     */
    generateDelegowanieSection(agent, plugin) {
        const lines = ['## Delegowanie'];

        const minionLoader = plugin.agentManager?.minionLoader;
        const masterLoader = plugin.agentManager?.masterLoader;

        // Active minions
        const activeMinions = agent.activeMinions || [];
        if (activeMinions.length > 0 && minionLoader) {
            lines.push('', '### Miniony (pomocnicy)');
            lines.push('Deleguj ciężką robotę minionom używając **minion_task**.');

            for (const assignment of activeMinions) {
                const config = minionLoader.getMinion(assignment.name);
                if (!config) continue;

                lines.push('', `#### ${config.name}${assignment.default ? ' (DOMYŚLNY)' : ''}`);
                if (config.description) lines.push(`- **Opis:** ${config.description}`);
                if (assignment.role) lines.push(`- **Rola:** ${assignment.role}`);
                if (config.tools?.length > 0) {
                    const toolDescs = config.tools.map(t => {
                        const info = TOOL_INFO[t];
                        return info ? `${t} (${info.label})` : t;
                    });
                    lines.push(`- **Narzędzia:** ${toolDescs.join(', ')}`);
                }
                lines.push(`- **Kiedy delegować:** duże przeszukiwanie, analiza wielu plików, zbieranie kontekstu`);
            }
        }

        // Active masters
        const activeMasters = agent.activeMasters || [];
        if (activeMasters.length > 0 && masterLoader) {
            lines.push('', '### Mastery (eksperci)');
            lines.push('Konsultuj trudne pytania z masterem używając **master_task**.');

            for (const assignment of activeMasters) {
                const config = masterLoader.getMaster(assignment.name);
                if (!config) continue;

                lines.push('', `#### ${config.name}${assignment.default ? ' (DOMYŚLNY)' : ''}`);
                if (config.description) lines.push(`- **Opis:** ${config.description}`);
                lines.push(`- **Kiedy konsultować:** złożone analizy, strategie, tematy wymagające głębokiego myślenia`);
            }
        }

        if (activeMinions.length === 0 && activeMasters.length === 0) {
            lines.push('', 'Brak przypisanych minionów i masterów.');
        }

        return lines.join('\n');
    }

    /**
     * Generate "Procedury" section from custom rules.
     * @param {Array} customRules
     * @returns {string} Markdown (empty string if no rules)
     */
    generateCustomRulesSection(customRules) {
        if (!customRules || customRules.length === 0) return '';

        const enabledRules = customRules.filter(r => r.enabled !== false);
        if (enabledRules.length === 0) return '';

        const lines = ['## Procedury'];
        for (const rule of enabledRules) {
            lines.push('', `### Gdy ${rule.trigger}`, rule.action);
        }
        return lines.join('\n');
    }

    /**
     * Compile full playbook.md from agent config + overrides.
     * Uses auto-generated sections unless user overrode them.
     * @param {import('../agents/Agent.js').default} agent
     * @param {Object} plugin
     * @returns {Promise<string>} Compiled markdown
     */
    async compilePlaybook(agent, plugin) {
        const overrides = agent.playbookOverrides || {};
        const so = overrides.sectionOverrides || {};

        const sections = [
            `# Playbook: ${agent.name}`,
            so.rola ?? this.generateRolaSection(agent, plugin),
            so.narzedzia ?? this.generateNarzedziaSection(agent),
            so.skille ?? this.generateSkilleSection(agent, plugin),
            so.delegowanie ?? this.generateDelegowanieSection(agent, plugin),
            this.generateCustomRulesSection(overrides.customRules),
        ].filter(s => s); // remove empty strings

        const markdown = sections.join('\n\n').trim() + '\n';

        // Write to playbook.md
        const path = this.getPlaybookPath(agent.name);
        try {
            const dir = path.substring(0, path.lastIndexOf('/'));
            const dirExists = await this.vault.adapter.exists(dir);
            if (!dirExists) await this.vault.adapter.mkdir(dir);
            await this.vault.adapter.write(path, markdown);
        } catch (e) {
            console.warn('[PlaybookManager] compilePlaybook write error:', e);
        }

        return markdown;
    }
}
