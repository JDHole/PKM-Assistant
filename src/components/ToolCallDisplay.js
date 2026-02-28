
import { UiIcons } from '../crystal-soul/UiIcons.js';
import { IconGenerator } from '../crystal-soul/IconGenerator.js';

/**
 * Polish names and semantic UiIcons for MCP tools.
 * Exported for reuse in BackstageViews and SubAgentBlock.
 */
export const TOOL_INFO = {
    vault_read:      { icon: () => UiIcons.file(14),      label: 'Odczyt notatki' },
    vault_write:     { icon: () => UiIcons.edit(14),      label: 'Zapis notatki' },
    vault_search:    { icon: () => UiIcons.search(14),    label: 'Wyszukiwanie w vaultcie' },
    vault_list:      { icon: () => UiIcons.folder(14),    label: 'Lista plików' },
    vault_delete:    { icon: () => UiIcons.trash(14),     label: 'Usunięcie notatki' },
    memory_search:   { icon: () => UiIcons.brain(14),     label: 'Przeszukanie pamięci' },
    memory_update:   { icon: () => UiIcons.brain(14),     label: 'Aktualizacja pamięci' },
    memory_status:   { icon: () => UiIcons.chart(14),     label: 'Stan pamięci' },
    skill_list:      { icon: () => UiIcons.zap(14),       label: 'Lista umiejętności' },
    skill_execute:   { icon: () => UiIcons.zap(14),       label: 'Aktywacja skilla' },
    minion_task:     { icon: () => UiIcons.robot(14),     label: 'Zadanie miniona' },
    master_task:     { icon: () => UiIcons.crown(14),     label: 'Konsultacja z ekspertem' },
    agent_message:   { icon: () => UiIcons.send(14),      label: 'Wiadomość do agenta' },
    agent_delegate:  { icon: () => UiIcons.send(14),      label: 'Propozycja delegacji' },
    chat_todo:       { icon: () => UiIcons.clipboard(14), label: 'Lista zadań' },
    plan_action:     { icon: () => UiIcons.clipboard(14), label: 'Plan działania' },
    agora_read:      { icon: () => UiIcons.globe(14),     label: 'Odczyt z Agory' },
    agora_update:    { icon: () => UiIcons.globe(14),     label: 'Aktualizacja Agory' },
    agora_project:   { icon: () => UiIcons.globe(14),     label: 'Projekt w Agorze' },
    web_search:      { icon: () => UiIcons.globe(14),     label: 'Wyszukiwanie w internecie' },
    ask_user:        { icon: () => UiIcons.question(14),  label: 'Pytanie do użytkownika' },
    switch_mode:     { icon: () => UiIcons.compass(14),   label: 'Zmiana trybu' },
};

/**
 * Generate SVG icon markup for a tool (semantic UiIcons).
 * @param {string} toolName
 * @param {string} color - unused, kept for backward compat
 * @param {number} size
 * @returns {string} SVG markup
 */
export function getToolIcon(toolName, color = 'currentColor', size = 14) {
    const info = TOOL_INFO[toolName];
    if (info?.icon) return info.icon();
    // Fallback to IconGenerator for unknown tools
    return IconGenerator.generate(toolName, 'mixed', { size, color });
}

/**
 * Format tool input in a human-readable way (Polish) — for header hint.
 * @param {string} toolName
 * @param {*} input
 * @returns {string}
 */
function formatToolInput(toolName, input) {
    try {
        const data = typeof input === 'string' ? JSON.parse(input) : (input || {});
        switch (toolName) {
            case 'vault_search':
            case 'memory_search':
            case 'web_search':
                return data.query || '';
            case 'vault_read':
                return data.path ? _shortPath(data.path) : '';
            case 'vault_write':
                return data.path ? `${_shortPath(data.path)} (${data.mode || 'write'})` : '';
            case 'vault_list':
                return data.path || data.folder || '/';
            case 'vault_delete':
                return data.path ? _shortPath(data.path) : '';
            case 'minion_task':
            case 'master_task':
                return _truncate(data.task || data.description || '', 80);
            case 'skill_execute':
                return data.skill_name || data.name || '';
            case 'agent_message':
            case 'agent_delegate':
                return data.target || data.agent || '';
            case 'memory_update':
                return data.operation || data.action || '';
            case 'memory_status':
                return '';
            case 'skill_list':
                return '';
            case 'chat_todo':
            case 'plan_action':
                return data.action || '';
            case 'switch_mode':
                return data.mode || '';
            case 'ask_user':
                return _truncate(data.question || '', 100);
            case 'agora_read':
                return data.section || data.type || '';
            case 'agora_update':
                return data.section || data.type || '';
            case 'agora_project':
                return data.action || data.project || '';
            default: {
                const s = JSON.stringify(data);
                return s.length > 80 ? s.slice(0, 77) + '...' : s;
            }
        }
    } catch { return String(input || '').slice(0, 80); }
}

/**
 * Format FULL tool input for expanded body view.
 * Shows all arguments in readable format (more detail than formatToolInput header).
 * @param {string} toolName
 * @param {*} input
 * @returns {string}
 */
function formatToolInputDetail(toolName, input) {
    try {
        const data = typeof input === 'string' ? JSON.parse(input) : (input || {});
        switch (toolName) {
            case 'vault_read':
                return data.path || '';
            case 'vault_write': {
                let s = `Ścieżka: ${data.path || '?'}  |  Tryb: ${data.mode || 'write'}`;
                if (data.content) s += `\nTreść:\n${_truncate(data.content, 800)}`;
                return s;
            }
            case 'vault_search':
            case 'memory_search':
                return `"${data.query || '?'}"${data.limit ? `  (limit: ${data.limit})` : ''}`;
            case 'vault_list':
                return `${data.path || data.folder || '/'}${data.recursive ? '  (rekurencyjnie)' : ''}`;
            case 'vault_delete':
                return data.path || '';
            case 'web_search':
                return `"${data.query || '?'}"`;
            case 'memory_update': {
                const op = data.operation || data.action || '?';
                let s = `Operacja: ${op}`;
                if (data.key) s += `  |  Klucz: ${data.key}`;
                if (data.content) s += `\nTreść: ${_truncate(data.content, 500)}`;
                return s;
            }
            case 'skill_execute': {
                let s = data.skill_name || data.name || '?';
                if (data.variables && Object.keys(data.variables).length > 0) {
                    s += '\nParametry: ' + Object.entries(data.variables).map(([k, v]) => `${k} = ${v}`).join(', ');
                }
                return s;
            }
            case 'minion_task':
            case 'master_task':
                return data.task || data.description || '';
            case 'agent_message':
                return `Do: ${data.target || data.agent || '?'}\n${_truncate(data.message || data.content || '', 500)}`;
            case 'agent_delegate':
                return `Agent: ${data.target || data.agent || '?'}${data.reason ? `\nPowód: ${data.reason}` : ''}`;
            case 'chat_todo':
            case 'plan_action': {
                const action = data.action || '?';
                const raw = JSON.stringify(data, null, 2);
                return raw.length > 60 ? `Akcja: ${action}\n${_truncate(raw, 500)}` : `Akcja: ${action}`;
            }
            case 'ask_user':
                return `${data.question || '?'}${data.options?.length ? `\nOpcje: ${data.options.join(', ')}` : ''}`;
            case 'switch_mode':
                return data.mode || '';
            case 'agora_read':
                return `Sekcja: ${data.section || data.type || '?'}`;
            case 'agora_update': {
                let s = `Sekcja: ${data.section || data.type || '?'}`;
                if (data.content) s += `\nTreść: ${_truncate(data.content, 500)}`;
                if (data.data) s += `\nDane: ${_truncate(JSON.stringify(data.data), 500)}`;
                return s;
            }
            case 'agora_project': {
                let s = `Akcja: ${data.action || '?'}`;
                if (data.project) s += `  |  Projekt: ${data.project}`;
                if (data.task) s += `\nZadanie: ${data.task}`;
                return s;
            }
            default: {
                const s = JSON.stringify(data, null, 2);
                return s.length > 500 ? s.slice(0, 497) + '...' : s;
            }
        }
    } catch { return String(input || '').slice(0, 500); }
}

/**
 * Format tool output in a human-readable way (Polish) — for body.
 * Returns { summary: string, detail: string|null }.
 * summary = short one-liner, detail = full data (for expand).
 */
function formatToolOutput(toolName, output) {
    if (!output) return { summary: '', detail: null };
    try {
        const data = typeof output === 'string' ? JSON.parse(output) : output;

        // Handle arrays (some tools return raw arrays)
        if (Array.isArray(data)) {
            return {
                summary: `${data.length} wyników`,
                detail: JSON.stringify(data, null, 2)
            };
        }

        switch (toolName) {
            case 'vault_search':
            case 'memory_search': {
                const results = data.results || [];
                const count = data.count || data.totalCount || results.length;
                const type = data.searchType || '';
                const paths = results.map((r, i) => {
                    let line = `${i + 1}. ${r.path || _shortPath(r.path)}`;
                    if (r.score != null) line += `  [${(r.score * 100).toFixed(0)}%]`;
                    if (r.snippet) line += `\n   ${_truncate(r.snippet, 200)}`;
                    return line;
                }).join('\n');
                return {
                    summary: `${count} wyników${type ? ` (${type})` : ''}`,
                    detail: paths || null
                };
            }
            case 'vault_read': {
                const content = data.content || (typeof data === 'string' ? data : '');
                const lines = content.split('\n').length;
                const chars = content.length;
                return {
                    summary: `${lines} linii, ${chars} znaków`,
                    detail: _truncate(content, 2000)
                };
            }
            case 'vault_write': {
                const ok = data.success !== false;
                return {
                    summary: ok ? `Zapisano: ${_shortPath(data.path || '')}` : `Błąd zapisu`,
                    detail: data.error ? `Błąd: ${data.error}` : (data.message || null)
                };
            }
            case 'vault_list': {
                const files = data.files || data.entries || [];
                const count = files.length;
                const list = files.map((f, i) => {
                    const path = typeof f === 'string' ? f : (f.path || f.name || '');
                    const size = f.size ? `  (${f.size})` : '';
                    return `${i + 1}. ${path}${size}`;
                }).join('\n');
                return {
                    summary: `${count} plików`,
                    detail: list || null
                };
            }
            case 'vault_delete':
                return {
                    summary: data.success !== false ? 'Usunięto' : `Błąd: ${data.error || 'usuwania'}`,
                    detail: data.error || null
                };
            case 'web_search': {
                const results = data.results || [];
                const list = results.map((r, i) => {
                    let line = `${i + 1}. ${r.title || '?'}`;
                    if (r.url) line += `\n   ${r.url}`;
                    if (r.snippet || r.description) line += `\n   ${_truncate(r.snippet || r.description, 200)}`;
                    return line;
                }).join('\n');
                return {
                    summary: `${results.length} wyników z internetu`,
                    detail: list || null
                };
            }
            case 'memory_update':
                return {
                    summary: data.success !== false ? 'Pamięć zaktualizowana' : 'Błąd aktualizacji',
                    detail: data.message || data.details || (data.action ? `Akcja: ${data.action}` : null)
                };
            case 'memory_status': {
                let detail = '';
                if (data.sessionCount != null) detail += `Sesji: ${data.sessionCount}\n`;
                if (data.brainSize != null) detail += `Brain: ${data.brainSize}\n`;
                if (data.l2Count != null) detail += `L2: ${data.l2Count}\n`;
                if (data.l3Count != null) detail += `L3: ${data.l3Count}`;
                return {
                    summary: `Sesji: ${data.sessionCount || '?'}, Brain: ${data.brainSize || '?'}`,
                    detail: detail.trim() || null
                };
            }
            case 'skill_list': {
                const skills = data.skills || data || [];
                const list = Array.isArray(skills)
                    ? skills.map((s, i) => `${i + 1}. ${typeof s === 'string' ? s : (s.name || s.slug || '?')}`).join('\n')
                    : null;
                return {
                    summary: `${Array.isArray(skills) ? skills.length : '?'} skilli`,
                    detail: list
                };
            }
            case 'skill_execute':
                return {
                    summary: data.success !== false ? 'Skill wykonany' : 'Błąd skilla',
                    detail: _truncate(data.result || data.output || '', 1000)
                };
            case 'agent_message':
                return {
                    summary: data.success !== false ? 'Wiadomość wysłana' : 'Błąd wysyłki',
                    detail: data.message || null
                };
            case 'agent_delegate':
                return {
                    summary: data.delegation ? `Delegacja do: ${data.target || '?'}` : 'Propozycja delegacji',
                    detail: data.reason || null
                };
            case 'chat_todo': {
                if (data.items && Array.isArray(data.items)) {
                    const list = data.items.map(item => `${item.done ? '  ✓' : '  ○'} ${item.text || item.content || ''}`).join('\n');
                    return { summary: `${data.items.length} zadań`, detail: list };
                }
                return { summary: data.action || 'Lista zadań', detail: null };
            }
            case 'plan_action': {
                if (data.steps && Array.isArray(data.steps)) {
                    const list = data.steps.map((s, i) => `${i + 1}. [${s.status || '?'}] ${s.text || s.title || ''}`).join('\n');
                    return { summary: `${data.steps.length} kroków`, detail: list };
                }
                return { summary: data.action || 'Plan', detail: null };
            }
            case 'agora_read': {
                const content = data.content || '';
                const ok = data.success !== false;
                if (!ok) return { summary: `Błąd: ${data.error || '?'}`, detail: null };
                const lines = content.split('\n').length;
                return {
                    summary: `${lines} linii`,
                    detail: _truncate(content, 2000)
                };
            }
            case 'agora_update': {
                const ok = data.success !== false;
                return {
                    summary: ok ? (data.message || 'Zaktualizowano') : `Błąd: ${data.error || '?'}`,
                    detail: data.content ? _truncate(data.content, 1000) : null
                };
            }
            case 'agora_project': {
                const ok = data.success !== false;
                const msg = ok ? (data.message || 'OK') : `Błąd: ${data.error || '?'}`;
                const detail = data.tasks ? data.tasks.map((t, i) => `${i + 1}. [${t.done ? '✓' : '○'}] ${t.text || ''}`).join('\n') : null;
                return { summary: msg, detail };
            }
            case 'ask_user': {
                const q = data.question || '';
                const a = data.answer || data.response || '(odpowiedź)';
                const needsDetail = q.length > 100;
                return {
                    summary: a,
                    detail: needsDetail ? `Pytanie: ${q}\nOdpowiedź: ${a}${data.auto ? ' (auto)' : ''}` : null
                };
            }
            case 'switch_mode':
                return {
                    summary: data.mode ? `Tryb: ${data.mode}` : 'Tryb zmieniony',
                    detail: null
                };
            default: {
                const s = JSON.stringify(data, null, 2);
                return {
                    summary: _truncate(s, 120),
                    detail: s.length > 120 ? _truncate(s, 1000) : null
                };
            }
        }
    } catch {
        const s = String(output || '');
        return { summary: _truncate(s, 120), detail: s.length > 120 ? s : null };
    }
}

/** Shorten path: keep last 2 segments */
function _shortPath(p) {
    if (!p) return '';
    const parts = p.replace(/\\/g, '/').split('/');
    return parts.length > 2 ? '…/' + parts.slice(-2).join('/') : p;
}

/** Truncate string */
function _truncate(s, max) {
    if (!s) return '';
    return s.length > max ? s.slice(0, max - 3) + '...' : s;
}

/**
 * Human-readable Polish descriptions for MCP tools (for Backstage UI).
 */
export const TOOL_DESCRIPTIONS = {
    vault_read:      'Odczytuje zawartość notatki z vaulta. Podajesz ścieżkę, dostajesz cały tekst Markdown.',
    vault_write:     'Tworzy nową notatkę lub edytuje istniejącą. Może dopisać tekst, zastąpić treść lub wstawić na początek.',
    vault_search:    'Wyszukiwanie semantyczne w vaultcie — szuka po znaczeniu, nie tylko po słowach kluczowych.',
    vault_list:      'Wyświetla zawartość folderu. Może rekurencyjnie przejść podfoldery.',
    vault_delete:    'Trwale usuwa notatkę z vaulta. Zawsze wymaga potwierdzenia użytkownika.',
    memory_search:   'Przeszukuje pamięć agenta: brain, sesje i podsumowania. Semantyczne dopasowanie.',
    memory_update:   'Aktualizuje pamięć długoterminową (brain.md). Dodaje, usuwa lub odczytuje fakty o użytkowniku.',
    memory_status:   'Pokazuje statystyki pamięci: ile sesji, rozmiar brain, ostatnia aktywność.',
    skill_list:      'Zwraca listę dostępnych umiejętności (skilli) agenta z opisami.',
    skill_execute:   'Uruchamia wybrany skill — zwraca procedurę krok-po-kroku z pliku skilla.',
    minion_task:     'Deleguje zadanie tańszemu modelowi AI (minionowi). Dobry do przeszukiwania wielu plików.',
    master_task:     'Przekazuje trudne zadanie najsilniejszemu modelowi (Masterowi). Głęboka analiza.',
    agent_message:   'Wysyła wiadomość do innego agenta — asynchronicznie, przez skrzynkę odbiorczą.',
    agent_delegate:  'Proponuje przekazanie rozmowy innemu agentowi. Użytkownik musi potwierdzić.',
    chat_todo:       'Interaktywna lista zadań z checkboxami, wyświetlana w oknie czatu.',
    plan_action:     'Wieloetapowy plan z krokami, statusami i podzadaniami w chacie.',
    agora_read:      'Odczytuje ze wspólnej bazy wiedzy agentów: profile, mapy, projekty.',
    agora_update:    'Aktualizuje wspólną bazę wiedzy — profil użytkownika, mapę vaulta, tablice aktywności.',
    agora_project:   'Zarządza projektami współdzielonymi między agentami — zadania, checkboxy, członkowie.',
    web_search:      'Przeszukuje internet — zwraca tytuły, linki i treść stron. Domyślnie darmowy (Jina AI).',
    ask_user:        'Zadaje pytanie użytkownikowi i czeka na odpowiedź. Wyświetla opcje do kliknięcia w chacie.',
};

/**
 * Creates a Crystal Soul .cs-action-row for a tool call.
 * Expandable: header (icon + label + input hint + status + arrow) → body (input/output).
 * @param {Object} toolCall - {name, input, output, status, error?}
 * @returns {HTMLElement}
 */
export function createToolCallDisplay(toolCall) {
    const row = document.createElement('div');
    row.className = 'cs-action-row';

    const info = TOOL_INFO[toolCall.name] || { icon: null, label: toolCall.name };
    const status = toolCall.status || 'pending';

    // ── HEAD ──
    const head = row.createDiv({ cls: 'cs-action-row__head' });

    // Icon
    const iconEl = head.createDiv({ cls: 'cs-action-row__icon' });
    iconEl.innerHTML = info.icon ? info.icon() : getToolIcon(toolCall.name);

    // Label with human-readable input hint
    const inputHint = formatToolInput(toolCall.name, toolCall.input);
    const labelText = inputHint ? `${info.label} — ${inputHint}` : info.label;
    head.createSpan({ cls: 'cs-action-row__label', text: labelText });

    // Status crystal marker
    const statusEl = head.createDiv({ cls: `cs-action-row__status cs-action-row__status--${status === 'success' ? 'done' : status}` });

    // Arrow
    const arrow = head.createDiv({ cls: 'cs-action-row__arrow' });
    arrow.innerHTML = UiIcons.chevronDown(12);

    // ── BODY ──
    const body = row.createDiv({ cls: 'cs-action-row__body' });

    // Input — full detail for expanded view
    const inputFull = formatToolInputDetail(toolCall.name, toolCall.input);
    if (inputFull) {
        const inputDiv = body.createDiv({ cls: 'cs-action-row__input' });
        inputDiv.createSpan({ cls: 'cs-action-row__field-label', text: 'Wywołanie: ' });
        if (inputFull.includes('\n')) {
            const pre = inputDiv.createDiv({ cls: 'cs-action-row__pre' });
            pre.textContent = inputFull;
        } else {
            inputDiv.createSpan({ text: inputFull });
        }
    }

    // Output — human-readable summary + full detail
    if (toolCall.error) {
        const errDiv = body.createDiv({ cls: 'cs-action-row__output cs-action-row__output--error' });
        errDiv.createSpan({ cls: 'cs-action-row__field-label', text: 'Błąd: ' });
        errDiv.createSpan({ text: typeof toolCall.error === 'string' ? toolCall.error : JSON.stringify(toolCall.error) });
    } else if (toolCall.output) {
        const fmt = formatToolOutput(toolCall.name, toolCall.output);
        if (fmt.summary) {
            const sumDiv = body.createDiv({ cls: 'cs-action-row__output' });
            sumDiv.createSpan({ cls: 'cs-action-row__field-label', text: 'Wynik: ' });
            sumDiv.createSpan({ text: fmt.summary });
        }
        if (fmt.detail) {
            const detailDiv = body.createDiv({ cls: 'cs-action-row__detail' });
            detailDiv.textContent = fmt.detail;
        }
    }

    // Toggle logic
    head.addEventListener('click', () => {
        row.classList.toggle('open');
    });

    return row;
}
