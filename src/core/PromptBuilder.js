/**
 * PromptBuilder — modularny system budowania system promptu agenta.
 * Buduje prompt z nazwanych sekcji, każda z liczbą tokenów i możliwością wł/wył.
 *
 * Dwa tryby:
 * - Z minionem: lean prompt (~3000-4000 tok) + minion do ciężkiej roboty
 * - Bez miniona: fat prompt (~5000-8000 tok) ze szczegółowymi instrukcjami
 */

import { getTokenCount } from '../utils/tokenCounter.js';

// ═══════════════════════════════════════════
// TOOL GROUPS — do filtrowania per-agent
// ═══════════════════════════════════════════

export const TOOL_GROUPS = {
    vault: ['vault_read', 'vault_list', 'vault_write', 'vault_delete', 'vault_search'],
    memory: ['memory_search', 'memory_update', 'memory_status'],
    skills: ['skill_list', 'skill_execute'],
    delegation: ['minion_task', 'master_task'],
    communication: ['agent_message', 'agent_delegate'],
    artifacts: ['chat_todo', 'plan_action'],
    agora: ['agora_read', 'agora_update', 'agora_project'],
};

// ═══════════════════════════════════════════
// PROMPT BUILDER
// ═══════════════════════════════════════════

export class PromptBuilder {
    constructor() {
        /** @type {Map<string, SectionData>} */
        this.sections = new Map();
    }

    /**
     * Build the full system prompt for an agent.
     * @param {import('../agents/Agent.js').Agent} agent
     * @param {Object} context
     * @param {string} context.vaultName
     * @param {string} context.currentDate
     * @param {string} [context.memoryContext]
     * @param {string} [context.agoraContext]
     * @param {boolean} [context.hasMinion]
     * @param {boolean} [context.hasMaster]
     * @param {Array<{name:string, description:string, category:string}>} [context.skills]
     * @param {string[]} [context.agentList] - other agent names
     * @param {number} [context.unreadInbox] - unread messages count
     * @returns {PromptBuilder} this (for chaining)
     */
    build(agent, context) {
        this.sections.clear();

        const hasMCP = agent.permissions?.mcp === true;
        const hasMinion = !!(context.hasMinion);
        const hasMaster = !!(context.hasMaster);
        const enabledGroups = this._getEnabledGroups(agent);

        // ── CORE (always present, stable prefix for cache) ──

        this._add('identity', 'Tożsamość', this._buildIdentity(agent, context), {
            required: true, category: 'core'
        });

        this._add('pkm_system', 'PKM Assistant', this._buildPkmSystem(agent, context), {
            required: true, category: 'core'
        });

        this._add('environment', 'Środowisko', this._buildEnvironment(agent, context), {
            required: true, category: 'core'
        });

        if (agent.personality) {
            this._add('personality', 'Osobowość', agent.personality, {
                category: 'core'
            });
        }

        // ── CAPABILITIES ──

        this._add('capabilities', 'Możliwości', this._buildCapabilities(agent, context, enabledGroups), {
            category: 'capabilities'
        });

        if (hasMCP) {
            this._add('tools_overview', 'Narzędzia (przegląd)',
                this._buildToolsOverview(agent, context, enabledGroups), {
                    category: 'capabilities'
                });
        }

        if (context.skills && context.skills.length > 0) {
            this._add('skills_list', 'Skille agenta',
                this._buildSkillsList(agent, context), {
                    category: 'capabilities'
                });
        }

        if (hasMinion) {
            this._add('minion_guide', 'Minion',
                this._buildMinionGuide(agent, context), {
                    category: 'capabilities'
                });
        }

        if (hasMaster) {
            this._add('master_guide', 'Master',
                this._buildMasterGuide(agent, context), {
                    category: 'capabilities'
                });
        }

        if (hasMCP && enabledGroups.communication) {
            this._add('comms_overview', 'Komunikacja',
                this._buildCommsOverview(agent, context), {
                    category: 'capabilities'
                });
        }

        if (hasMCP && enabledGroups.artifacts) {
            this._add('artifacts_overview', 'Artefakty',
                this._buildArtifactsOverview(agent, context), {
                    category: 'capabilities'
                });
        }

        if (hasMCP && enabledGroups.agora) {
            this._add('agora_overview', 'Agora',
                this._buildAgoraOverview(agent, context), {
                    category: 'capabilities'
                });
        }

        // ── RULES ──

        this._add('permissions', 'Uprawnienia',
            this._buildPermissions(agent, context, enabledGroups), {
                category: 'rules'
            });

        this._add('rules', 'Zasady', this._buildRules(agent, context, enabledGroups), {
            required: true, category: 'rules'
        });

        // ── PLAYBOOK ──

        if (hasMinion) {
            this._add('playbook_pointer', 'Playbook',
                this._buildPlaybookPointer(agent, context), {
                    category: 'capabilities'
                });
        }

        // ── FAT PROMPT FALLBACK (no minion) ──

        if (!hasMinion && hasMCP) {
            this._add('tools_detailed', 'Narzędzia (szczegóły)',
                this._buildToolsDetailed(agent, context, enabledGroups), {
                    category: 'capabilities'
                });
        }

        return this;
    }

    // ═══════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════

    /**
     * Add a dynamic section (memory, RAG, artifacts, inbox — injected per message by chat_view)
     */
    addDynamicSection(key, label, content, category = 'context') {
        if (!content || !content.trim()) return;
        this._add(key, label, content, { category, required: false });
    }

    /**
     * Get full assembled prompt text (enabled sections only)
     */
    getPrompt() {
        return [...this.sections.values()]
            .filter(s => s.enabled)
            .map(s => s.content)
            .join('\n\n');
    }

    /**
     * Get section metadata for Prompt Inspector UI
     * @returns {Array<{key, label, tokens, enabled, required, category}>}
     */
    getSections() {
        return [...this.sections.entries()].map(([key, data]) => ({
            key,
            label: data.label,
            tokens: data.tokens,
            enabled: data.enabled,
            required: data.required,
            category: data.category,
        }));
    }

    /**
     * Get token breakdown
     * @returns {{total: number, sections: Array<{key, label, tokens}>}}
     */
    getTokenBreakdown() {
        const sections = this.getSections().filter(s => s.enabled);
        return {
            total: sections.reduce((sum, s) => sum + s.tokens, 0),
            sections: sections.map(s => ({ key: s.key, label: s.label, tokens: s.tokens })),
        };
    }

    /**
     * Toggle a section on/off. Cannot toggle required sections off.
     */
    toggleSection(key, enabled) {
        const section = this.sections.get(key);
        if (!section) return false;
        if (section.required && !enabled) return false; // can't disable required
        section.enabled = enabled;
        return true;
    }

    /**
     * Apply disabled sections from user settings.
     * @param {string[]} disabledKeys - Section keys to disable
     */
    applyDisabledSections(disabledKeys = []) {
        for (const key of disabledKeys) {
            this.toggleSection(key, false);
        }
    }

    // ═══════════════════════════════════════════
    // INTERNAL: Section builders
    // ═══════════════════════════════════════════

    _add(key, label, content, opts = {}) {
        if (!content || !content.trim()) return;
        this.sections.set(key, {
            key,
            label,
            content: content.trim(),
            tokens: getTokenCount(content),
            enabled: true,
            required: opts.required || false,
            category: opts.category || 'core',
        });
    }

    /**
     * Which tool groups does this agent have enabled?
     * Empty/undefined enabledTools = ALL groups.
     */
    _getEnabledGroups(agent) {
        const enabled = agent.enabledTools;
        const result = {};
        for (const [group, tools] of Object.entries(TOOL_GROUPS)) {
            if (!enabled || enabled.length === 0) {
                result[group] = tools; // all
            } else {
                const active = tools.filter(t => enabled.includes(t));
                if (active.length > 0) result[group] = active;
            }
        }
        return result;
    }

    // ─── identity ───

    _buildIdentity(agent, ctx) {
        return `Jesteś ${agent.name} ${agent.emoji}
Vault: ${ctx.vaultName || 'Obsidian Vault'} | Data: ${ctx.currentDate || new Date().toLocaleDateString('pl-PL')}`;
    }

    // ─── pkm_system ───

    _buildPkmSystem(agent, ctx) {
        if (ctx.pkmSystemPrompt) {
            return ctx.pkmSystemPrompt;
        }
        return `## PKM Assistant — Twój ekosystem
Jesteś częścią PKM Assistant — pluginu do Obsidiana, który daje użytkownikowi zespół AI agentów z pamięcią, narzędziami i współpracą.

Elementy systemu:
- **Agenci** — AI z osobowością, pamięcią i skillami. Każdy agent ma swoją rolę i specjalizację.
- **Narzędzia MCP** — zestaw narzędzi do pracy z vaultem, pamięcią, skillami i komunikacją. Wywołujesz je bezpośrednio.
- **Pamięć** — brain.md (fakty o userze), sesje rozmów, podsumowania L1/L2. Pamiętasz między sesjami.
- **Skille** — gotowe procedury do uruchomienia (np. daily-review, vault-organization). Znasz swoje skille.
- **Embedding** — indeks semantyczny vaulta. Szukanie po znaczeniu, nie tylko po słowach.
- **Artefakty** — interaktywne checklisty (TODO) i plany (PLAN) widoczne w oknie chatu.
- **Agora** — wspólna baza wiedzy WSZYSTKICH agentów. Profil usera, mapa vaulta, tablica aktywności, projekty.
- **Komunikator** — wymiana wiadomości między agentami. Delegacja zadań innemu agentowi.
- **Minion** — Twój asystent. Tańszy model z narzędziami do ciężkiej roboty (szukanie, analiza wielu plików).
- **Master** — mocniejszy model AI. Deleguj W GÓRĘ gdy zadanie Cię przerasta.
- **Playbook** — Twoja encyklopedia z procedurami, instrukcjami i wiedzą domenową.

Sesja = jedna rozmowa z userem. Na końcu ważnych sesji → zapisz ustalenia do Agory (agora_update).`;
    }

    // ─── environment ───

    _buildEnvironment(agent, ctx) {
        const lines = [];
        if (ctx.environmentPrompt) {
            lines.push(ctx.environmentPrompt);
        } else {
            lines.push('## Środowisko');
            lines.push('Pracujesz wewnątrz Obsidian.md — edytora notatek w formacie Markdown.');
            lines.push('Vault (skarbiec) to kolekcja plików .md zorganizowanych w foldery.');
            lines.push('Notatki mogą zawierać: frontmatter YAML (metadane), [[wikilinki]], #tagi, tabele, listy, bloki kodu.');
            lines.push('Folder .pkm-assistant/ — konfiguracja agentów, skille, miniony, pamięć, artefakty, agora.');
            lines.push('Folder .obsidian/ — konfiguracja Obsidiana (pluginy, motywy, skróty) — NIE RUSZAJ bez prośby usera.');
        }

        // Focus folders — agent's main work areas
        if (agent.focusFolders && agent.focusFolders.length > 0) {
            lines.push('');
            lines.push('Twoje główne obszary w vaultcie:');
            for (const folder of agent.focusFolders) {
                lines.push(`- ${folder}`);
            }
        }

        return lines.join('\n');
    }

    // ─── capabilities ───

    _buildCapabilities(agent, ctx, enabledGroups) {
        const lines = ['## Twoje możliwości'];

        const hasMCP = agent.permissions?.mcp;
        if (hasMCP) {
            const toolCount = Object.values(enabledGroups).reduce((sum, tools) => sum + tools.length, 0);
            lines.push(`- 🔧 Narzędzia MCP: ${toolCount} narzędzi do pracy z vaultem, pamięcią, skillami i komunikacją`);
        }

        lines.push(`- 🧠 Pamięć długoterminowa: brain.md z faktami o userze + historia sesji + podsumowania`);

        if (ctx.skills && ctx.skills.length > 0) {
            const skillNames = ctx.skills.map(s => s.name).join(', ');
            lines.push(`- 🎯 Skille: ${ctx.skills.length} procedur (${skillNames})`);
        }

        if (ctx.hasMinion) {
            const minionName = agent.minion || 'minion';
            lines.push(`- 🤖 Minion: ${minionName} — Twój asystent do ciężkiej roboty (szukanie, analiza wielu plików)`);
        }

        if (ctx.hasMaster) {
            lines.push(`- 👑 Master — mocniejszy model do trudnych zadań analitycznych`);
        }

        if (enabledGroups.communication) {
            const otherAgents = ctx.agentList?.filter(a => a !== agent.name) || [];
            if (otherAgents.length > 0) {
                lines.push(`- 📡 Komunikator: możesz pisać do ${otherAgents.join(', ')}`);
            }
        }

        if (enabledGroups.agora) {
            lines.push(`- 🏛️ Agora: wspólna baza wiedzy agentów (profil usera, mapa vaulta, projekty)`);
        }

        if (enabledGroups.artifacts) {
            lines.push(`- 📋 Artefakty: interaktywne checklisty i plany w chacie`);
        }

        lines.push(`- 🔍 Embedding: semantic search po vaultcie i pamięci`);

        return lines.join('\n');
    }

    // ─── tools_overview (lean — with minion) ───

    _buildToolsOverview(agent, ctx, enabledGroups) {
        const lines = ['## Narzędzia (przegląd)'];

        if (enabledGroups.vault) {
            const tools = enabledGroups.vault;
            const parts = [];
            if (tools.includes('vault_list')) parts.push('vault_list (lista plików)');
            if (tools.includes('vault_read')) parts.push('vault_read (czytaj notatkę)');
            if (tools.includes('vault_search')) parts.push('vault_search (szukaj semantycznie)');
            if (tools.includes('vault_write')) parts.push('vault_write (twórz/edytuj — tryby: create, append, prepend, replace)');
            if (tools.includes('vault_delete')) parts.push('vault_delete (usuń — ZAWSZE pytaj usera!)');
            lines.push(`VAULT: ${parts.join(', ')}`);
        }

        if (enabledGroups.memory) {
            const tools = enabledGroups.memory;
            const parts = [];
            if (tools.includes('memory_search')) parts.push('memory_search (szukaj w pamięci)');
            if (tools.includes('memory_update')) parts.push('memory_update (zapamiętaj/zapomnij/czytaj brain)');
            if (tools.includes('memory_status')) parts.push('memory_status (statystyki)');
            lines.push(`PAMIĘĆ: ${parts.join(', ')}`);
            lines.push(`  Komendy: "zapamiętaj X" → memory_update(operation:"update_brain"). "co pamiętasz?" → memory_search. "zapomnij X" → memory_update(operation:"delete_from_brain").`);
        }

        if (enabledGroups.skills) {
            lines.push(`SKILLE: skill_list (lista dostępnych), skill_execute (uruchom procedurę krok po kroku)`);
        }

        if (enabledGroups.delegation) {
            const parts = [];
            if (enabledGroups.delegation.includes('minion_task')) parts.push('minion_task (deleguj ciężką robotę)');
            if (enabledGroups.delegation.includes('master_task')) parts.push('master_task (deleguj trudne W GÓRĘ)');
            if (parts.length > 0) lines.push(`DELEGACJA: ${parts.join(', ')}`);
        }

        if (enabledGroups.communication) {
            lines.push(`KOMUNIKATOR: agent_message (wyślij wiadomość), agent_delegate (przekaż rozmowę — user klika przycisk!)`);
        }

        if (enabledGroups.artifacts) {
            lines.push(`ARTEFAKTY: chat_todo (interaktywna checklista), plan_action (wieloetapowy plan z krokami)`);
        }

        if (enabledGroups.agora) {
            lines.push(`AGORA: agora_read (czytaj wspólną bazę), agora_update (aktualizuj profil/mapę/aktywność), agora_project (projekty współdzielone)`);
        }

        // Decision tree
        if (enabledGroups.vault && enabledGroups.memory) {
            lines.push('');
            lines.push('Drzewo decyzyjne — gdzie szukać:');
            lines.push('- W NOTATKACH usera → vault_search');
            lines.push('- We WŁASNEJ pamięci → memory_search');
            if (enabledGroups.delegation?.includes('minion_task')) {
                lines.push('- W WIELU źródłach naraz / analiza wielu plików → minion_task');
            }
        }

        return lines.join('\n');
    }

    // ─── skills_list ───

    _buildSkillsList(agent, ctx) {
        const lines = ['## Twoje skille (gotowe procedury)'];
        lines.push('Znasz je — nie musisz wołać skill_list. Aktywuj: skill_execute(skill_name).');
        lines.push('');

        for (const skill of ctx.skills) {
            lines.push(`- **${skill.name}**: ${skill.description} [${skill.category || 'ogólne'}]`);
        }

        lines.push('');
        lines.push('Nowe skille tworzysz przez: vault_write do .pkm-assistant/skills/{nazwa}/skill.md');

        return lines.join('\n');
    }

    // ─── minion_guide ───

    _buildMinionGuide(agent, ctx) {
        const minionName = agent.minion || 'minion';
        return `## Minion — Twój asystent do ciężkiej roboty
Twój minion to "${minionName}" — tańszy model z dostępem do narzędzi i playbooka.
Minion NIE podejmuje decyzji. Ty decydujesz, minion zbiera dane i wykonuje robotę.

DELEGUJ DO MINIONA (minion_task):
- Szukanie w wielu źródłach naraz (vault + pamięć + agora)
- Analiza wielu plików (np. "przejrzyj 10 notatek i podsumuj")
- Zbieranie rozproszonego kontekstu na temat X
- Przegląd i podsumowanie fragmentów vaulta
- Ciężkie operacje na wielu plikach

RÓB SAM (bez miniona):
- Odczyt JEDNEGO pliku (vault_read)
- Zapis notatki (vault_write)
- Pamięć (memory_update, memory_search)
- Uruchomienie skilla (skill_execute)
- Odpowiedzi na proste pytania
- Tworzenie artefaktów (chat_todo, plan_action)

Formuluj zadania KONKRETNIE:
✅ minion_task(task:"Przeszukaj folder Projekty/ i pamięć pod kątem deadline'ów. Podsumuj co znalazłeś.")
❌ minion_task(task:"Sprawdź coś w vaultcie")`;
    }

    // ─── master_guide ───

    _buildMasterGuide(agent, ctx) {
        return `## Master — delegacja W GÓRĘ
Masz dostęp do mocniejszego modelu AI do trudnych zadań.
Wywołanie: master_task(task, context?, skip_minion?, minion_instructions?)

3 TRYBY:
1. DOMYŚLNY: master_task(task:"pytanie") → minion zbiera kontekst → Master odpowiada
2. Z INSTRUKCJAMI: master_task(task:"pytanie", minion_instructions:"Szukaj w folderze X...") → minion szuka wg wskazówek
3. BEZ MINIONA: master_task(task:"pytanie", context:"zebrane dane", skip_minion:true) → Ty dostarczasz dane

Kiedy delegować W GÓRĘ:
- Złożona analiza wymagająca głębokiego rozumowania
- Zadanie przekraczające Twoje możliwości (np. długi tekst, skomplikowana logika)
- User prosi o "głębszą analizę" lub "dokładniejsze podejście"

WAŻNE: Nie przerabiaj odpowiedzi Mastera — przekaż ją userowi bez zmian.`;
    }

    // ─── permissions ───

    _buildPermissions(agent, ctx, enabledGroups) {
        const lines = ['## Uprawnienia'];

        // Explicit no-tools warning for agents without MCP
        if (!agent.permissions?.mcp) {
            lines.push('⛔ NIE MASZ NARZĘDZI. Nie możesz przeszukiwać vaulta, pamięci, ani wykonywać żadnych akcji.');
            lines.push('Nie wspominaj o narzędziach, nie obiecuj że coś sprawdzisz. Możesz TYLKO rozmawiać.');
            lines.push('');
        }

        // What agent CAN do
        const canDo = [];
        if (agent.permissions.read_notes) canDo.push('czytać notatki');
        if (agent.permissions.mcp) canDo.push('używać narzędzi MCP');
        if (agent.permissions.thinking) canDo.push('extended thinking');
        if (canDo.length > 0) lines.push(`MOŻESZ: ${canDo.join(', ')}`);

        // What requires approval
        const needsApproval = [];
        if (agent.permissions.edit_notes) needsApproval.push('edytować notatki (vault_write)');
        if (agent.permissions.create_files) needsApproval.push('tworzyć pliki');
        if (needsApproval.length > 0) lines.push(`WYMAGA ZATWIERDZENIA: ${needsApproval.join(', ')}`);

        // What agent CANNOT do
        const cantDo = [];
        if (!agent.permissions.edit_notes) cantDo.push('edytować notatek');
        if (!agent.permissions.create_files) cantDo.push('tworzyć plików');
        if (!agent.permissions.delete_files) cantDo.push('usuwać plików');
        if (!agent.permissions.execute_commands) cantDo.push('wykonywać komend systemowych');
        if (!agent.permissions.access_outside_vault) cantDo.push('wychodzić poza vault');
        if (!agent.permissions.mcp) cantDo.push('używać narzędzi MCP');
        if (cantDo.length > 0) lines.push(`NIE MOŻESZ: ${cantDo.join(', ')}`);

        // Disabled tool groups
        if (agent.enabledTools && agent.enabledTools.length > 0) {
            const allTools = Object.values(TOOL_GROUPS).flat();
            const disabled = allTools.filter(t => !agent.enabledTools.includes(t));
            if (disabled.length > 0) {
                lines.push(`WYŁĄCZONE NARZĘDZIA: ${disabled.join(', ')} — nie próbuj ich używać`);
            }
        }

        return lines.join('\n');
    }

    // ─── comms_overview ───

    _buildCommsOverview(agent, ctx) {
        const lines = ['## Komunikator — między agentami'];

        // Unread inbox notification
        if (ctx.unreadInbox && ctx.unreadInbox > 0) {
            const safeName = agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            lines.push(`📬 MASZ ${ctx.unreadInbox} NIEPRZECZYTANYCH WIADOMOŚCI.`);
            lines.push(`Odczytaj: vault_read(path:".pkm-assistant/komunikator/inbox_${safeName}.md")`);
            lines.push(`Na początku rozmowy poinformuj usera: "Masz ${ctx.unreadInbox} wiadomości — chcesz przejrzeć?"`);
            lines.push('');
        }

        lines.push('- agent_message(to_agent, subject, content) — wyślij wiadomość asynchroniczną. Agent odczyta ją przy następnej sesji.');
        lines.push('- agent_delegate(to_agent, reason?, context_summary?) — zaproponuj przekazanie rozmowy. User MUSI kliknąć przycisk!');
        lines.push('');
        lines.push('KIEDY agent_message: informujesz, prosisz o pomoc, przekazujesz wyniki.');
        lines.push('KIEDY agent_delegate: temat poza Twoimi kompetencjami, user prosi o innego agenta.');
        lines.push('KRYTYCZNE: ZAWSZE podaj context_summary przy agent_delegate — co user chciał, co zrobiłeś, co zostało.');
        lines.push('PO DELEGACJI: NIE wywołuj dodatkowych narzędzi (agora_update, memory_update itp.). Delegacja = koniec Twojej tury.');

        if (ctx.agentList) {
            const others = ctx.agentList.filter(a => a !== agent.name);
            if (others.length > 0) {
                lines.push(`Agenci w systemie: ${others.join(', ')}`);
            }
        }

        return lines.join('\n');
    }

    // ─── artifacts_overview ───

    _buildArtifactsOverview(agent, ctx) {
        return `## Artefakty w chacie
- chat_todo — interaktywna checklista z checkboxami i paskiem postępu.
  Użyj gdy: lista zadań, plan zakupów, checklist. Akcje: create(title, items[]), update, add_item, remove_item, save.
- plan_action — wieloetapowy plan z krokami, statusami i subtaskami.
  Użyj gdy: złożone zadanie wymagające etapów. Akcje: create(title, steps[]), update_step, add_subtask, get.
  Statusy: pending → in_progress → done (lub skipped). CZEKAJ na zatwierdzenie planu!

ROZRÓŻNIENIE: Prosta lista → chat_todo. Wieloetapowy plan z postępem → plan_action.`;
    }

    // ─── agora_overview ───

    _buildAgoraOverview(agent, ctx) {
        return `## Agora — wspólna baza wiedzy
Agora to baza wiedzy WSZYSTKICH agentów o użytkowniku. Dane widzi każdy agent.
- agora_read(section) — czytaj: "profile" (profil usera), "vault_map" (mapa), "activity" (tablica), "projects_list".
- agora_update(section, ...) — aktualizuj: profil, mapę vaulta, tablicę aktywności.
- agora_project(action, ...) — zarządzaj projektami: create, update, add_task, update_task, ping, delete.

PROFIL: Dowiedziałeś się czegoś nowego o userze → zapytaj "Czy zaktualizować Bazę Wiedzy?"
AKTYWNOŚĆ: Na KOŃCU ważnych sesji → agora_update(section:"activity", summary:"co zrobiłeś").
PROJEKTY: Wspólne zadanie wielu agentów → agora_project(action:"create").`;
    }

    // ─── rules ───

    _buildRules(agent, ctx, enabledGroups = {}) {
        const hasMCP = agent.permissions?.mcp === true;
        const rules = [];

        // Always
        rules.push('Odpowiadaj po polsku (chyba że user pisze w innym języku).');

        if (hasMCP) {
            rules.push('NAJPIERW wywołaj narzędzie, POTEM odpowiadaj na podstawie wyników. NIE mów "zaraz sprawdzę" — po prostu wywołaj tool.');
        }

        if (enabledGroups.memory) {
            rules.push('Gdy user mówi "zapamiętaj" → OD RAZU memory_update, nie pytaj o potwierdzenie.');
        }

        if (enabledGroups.vault?.includes('vault_write')) {
            rules.push('NIE nadpisuj notatek usera bez pytania — preferuj append zamiast replace.');
        }

        if (enabledGroups.vault?.includes('vault_delete')) {
            rules.push('NIE usuwaj plików (vault_delete) bez wyraźnej prośby usera.');
        }

        // Anti-looping — only when agent has tools
        if (hasMCP) {
            rules.push('');
            rules.push('ANTY-LOOPING — bądź konkretny i efektywny:');
            rules.push('JEDNO wyszukiwanie na temat. Jeśli vault_search nie znalazł — powiedz userowi, NIE szukaj tego samego 5 razy innymi słowami.');
            rules.push('Jeśli narzędzie zwróciło błąd — przeczytaj komunikat, napraw problem, spróbuj RAZ. Nie ponawiaj w nieskończoność.');
            rules.push('Nie wywołuj tego samego narzędzia z tymi samymi argumentami dwa razy pod rząd.');
            rules.push('Gdy nie masz pewności — ZAPYTAJ usera zamiast zgadywać i loopować.');
            rules.push('Maksymalnie 3 tool calle na jeden krok zadania. Potem podsumuj co masz i zapytaj usera o dalsze kroki.');
        }

        // Inline comment — only when vault tools available
        if (enabledGroups.vault?.includes('vault_read') && enabledGroups.vault?.includes('vault_write')) {
            rules.push('');
            rules.push('KOMENTARZ INLINE: Gdy wiadomość zaczyna się od "KOMENTARZ INLINE" — user wybrał fragment tekstu.');
            rules.push('Działanie: vault_read → znajdź fragment → zmodyfikuj → vault_write mode:"replace". Odpowiedz krótko.');
        }

        // Auto-number the rules (skip empty lines)
        let num = 0;
        const numbered = rules.map(line => {
            if (!line) return '';
            if (line.startsWith('ANTY-LOOPING') || line.startsWith('KOMENTARZ INLINE:')) return line;
            num++;
            return `${num}. ${line}`;
        });

        return '## Zasady\n' + numbered.join('\n');
    }

    // ─── playbook_pointer ───

    _buildPlaybookPointer(agent, ctx) {
        const safeName = agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        return `## Playbook
Masz playbook z procedurami i wiedzą domenową: .pkm-assistant/agents/${safeName}/playbook.md
Masz vault map ze strukturą vaulta: .pkm-assistant/agents/${safeName}/vault_map.md
Minion zna te pliki — deleguj mu szukanie w playbooku: minion_task(task:"Sprawdź w playbooku jak...")`;
    }

    // ─── tools_detailed (FAT PROMPT — only when NO minion) ───

    _buildToolsDetailed(agent, ctx, enabledGroups) {
        const lines = ['## Narzędzia — szczegółowe instrukcje'];
        lines.push('(Nie masz miniona — pełne instrukcje poniżej)');
        lines.push('');

        if (enabledGroups.vault) {
            lines.push('### VAULT (Notatki użytkownika)');
            if (enabledGroups.vault.includes('vault_list'))
                lines.push('- vault_list(folder?, recursive?) — zawartość folderu. Bez argumentów = root vaulta. recursive:true = zagnieżdżone.');
            if (enabledGroups.vault.includes('vault_read'))
                lines.push('- vault_read(path) — odczyt notatki po ścieżce (np. "Projekty/pomysł.md"). Zwraca pełny markdown.');
            if (enabledGroups.vault.includes('vault_search'))
                lines.push('- vault_search(query, mode?) — szukanie. mode:"semantic" (domyślnie) = po znaczeniu, mode:"keyword" = po słowach. Zwraca top wyniki ze score.');
            if (enabledGroups.vault.includes('vault_write')) {
                lines.push('- vault_write(path, content, mode?) — zapis. mode: "create" (nowy), "append" (dopisz na końcu), "prepend" (na początku), "replace" (nadpisz).');
                lines.push('  Domyślnie: create. UWAGA: NIE nadpisuj (replace) bez pytania usera!');
            }
            if (enabledGroups.vault.includes('vault_delete'))
                lines.push('- vault_delete(path) — NIEODWRACALNE usunięcie. ZAWSZE pytaj usera o zgodę!');
            lines.push('');
        }

        if (enabledGroups.memory) {
            lines.push('### PAMIĘĆ (Twoja prywatna pamięć)');
            if (enabledGroups.memory.includes('memory_search'))
                lines.push('- memory_search(query, scope?) — przeszukaj sesje/brain/podsumowania. scope: "sessions", "brain", "summaries". Bez scope = wszystko.');
            if (enabledGroups.memory.includes('memory_update')) {
                lines.push('- memory_update(operation, content?, section?) — zarządzaj pamięcią.');
                lines.push('  operation: "read_brain" (czytaj), "update_brain" (dodaj/zmień), "delete_from_brain" (usuń), "add_session_summary".');
            }
            if (enabledGroups.memory.includes('memory_status'))
                lines.push('- memory_status — ile sesji, rozmiar brain, ostatnia aktywność.');
            lines.push('');
            lines.push('Komendy pamięciowe:');
            lines.push('- "zapamiętaj że..." → memory_update(operation:"update_brain", content:fakt w 3. osobie)');
            lines.push('- "zapomnij o..." → memory_update(operation:"delete_from_brain", content:co usunąć)');
            lines.push('- "co o mnie wiesz?" → memory_update(operation:"read_brain")');
            lines.push('- "pokaż pamięć" → memory_status');
            lines.push('- "czy pamiętasz...?" → memory_search');
            lines.push('UWAGA: brain.md to fakty w 3. osobie: "User lubi kawę". Sprawdź read_brain PRZED dodaniem — nie dodawaj duplikatów!');
            lines.push('');
        }

        if (enabledGroups.skills) {
            lines.push('### SKILLE');
            lines.push('- skill_list(category?) — lista dostępnych skilli. Opcjonalnie filtruj po kategorii.');
            lines.push('- skill_execute(skill_name) — aktywuj skill. Zwraca instrukcje krok-po-kroku → wykonuj je po kolei.');
            lines.push('Nowe skille: vault_write do .pkm-assistant/skills/{nazwa}/skill.md (frontmatter YAML + markdown).');
            lines.push('');
        }

        if (enabledGroups.communication) {
            lines.push('### KOMUNIKATOR');
            lines.push('- agent_message(to_agent, subject, content) — wyślij wiadomość asynchroniczną.');
            lines.push('- agent_delegate(to_agent, reason?, context_summary?) — zaproponuj przekazanie. User klika przycisk!');
            lines.push('KRYTYCZNE: ZAWSZE podaj context_summary przy delegate — co user chciał, co zrobiłeś, co zostało.');
            lines.push('');
        }

        if (enabledGroups.artifacts) {
            lines.push('### ARTEFAKTY');
            lines.push('- chat_todo: create(title, items[]) → update(id, item_index, done) → add_item → remove_item → save(id, path?)');
            lines.push('- plan_action: create(title, steps[{label, description?, subtasks?}]) → update_step(id, step_index, status, note?) → get(id)');
            lines.push('  Statusy: pending → in_progress → done / skipped. CZEKAJ na zatwierdzenie planu!');
            lines.push('');
        }

        if (enabledGroups.agora) {
            lines.push('### AGORA');
            lines.push('- agora_read(section) — "profile", "vault_map", "activity", "projects_list".');
            lines.push('- agora_update(section, ...) — profil (add/update/remove), mapa, aktywność.');
            lines.push('- agora_project(action, ...) — create, update, add_task, update_task, ping, delete.');
            lines.push('Na KOŃCU ważnych sesji → agora_update(section:"activity", summary:"..."). Nowe fakty o userze → profil.');
            lines.push('');
        }

        // Drzewo decyzyjne
        lines.push('### Drzewo decyzyjne');
        lines.push('- Szukasz w NOTATKACH usera → vault_search');
        lines.push('- Szukasz we WŁASNEJ pamięci → memory_search');
        lines.push('- Szukasz w WIELU źródłach → vault_search + memory_search (ale max 2-3 wyszukiwania)');
        lines.push('- Temat poza kompetencjami → agent_delegate');

        return lines.join('\n');
    }
}
