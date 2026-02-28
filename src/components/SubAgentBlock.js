import { TOOL_INFO, getToolIcon } from './ToolCallDisplay.js';
import { UiIcons } from '../crystal-soul/UiIcons.js';

const TYPE_CONFIG = {
    'auto-prep':   { label: 'Przygotowanie kontekstu', iconFn: () => UiIcons.brain(14) },
    'minion_task': { label: 'Zadanie miniona',         iconFn: () => UiIcons.robot(14) },
    'master_task': { label: 'Konsultacja z Masterem',  iconFn: () => UiIcons.crown(14) },
};

/**
 * Creates a Crystal Soul .cs-action-row for a sub-agent (minion/master) result.
 * Expandable: header (icon + label + duration + status + arrow) → body (query, response, tools, tokens).
 *
 * @param {Object} opts
 * @param {'auto-prep'|'minion_task'|'master_task'} opts.type
 * @param {string} [opts.agentName] - Name of the minion/master (e.g. "jaskier-prep", "strateg")
 * @param {string} [opts.query]
 * @param {string} [opts.response]
 * @param {string[]} [opts.toolsUsed]
 * @param {Array} [opts.toolCallDetails]
 * @param {number} [opts.duration] - ms
 * @param {{ prompt_tokens: number, completion_tokens: number }|null} [opts.usage]
 * @param {string} [opts.summary]
 * @returns {HTMLElement}
 */
export function createSubAgentBlock(opts) {
    const cfg = TYPE_CONFIG[opts.type] || TYPE_CONFIG['minion_task'];

    const row = document.createElement('div');
    row.className = 'cs-action-row';

    // ── HEAD ──
    const head = row.createDiv({ cls: 'cs-action-row__head' });

    // Icon (semantic: robot for minion, crown for master)
    const iconEl = head.createDiv({ cls: 'cs-action-row__icon' });
    iconEl.innerHTML = cfg.iconFn();

    // Label: "Zadanie miniona [nazwa] — [query snippet]"
    const nameTag = opts.agentName ? ` ${opts.agentName}` : '';
    const querySnippet = opts.query ? opts.query.slice(0, 80) : '';
    const labelText = querySnippet ? `${cfg.label}${nameTag} — ${querySnippet}` : `${cfg.label}${nameTag}`;
    head.createSpan({ cls: 'cs-action-row__label', text: labelText });

    // Duration
    if (opts.duration) {
        head.createSpan({ cls: 'cs-action-row__time', text: `${(opts.duration / 1000).toFixed(1)}s` });
    }

    // Status crystal
    const hasError = opts.response?.startsWith('Błąd');
    const statusCls = hasError ? 'cs-action-row__status--error' : 'cs-action-row__status--done';
    head.createDiv({ cls: `cs-action-row__status ${statusCls}` });

    // Arrow
    const arrow = head.createDiv({ cls: 'cs-action-row__arrow' });
    arrow.innerHTML = UiIcons.chevronDown(12);

    // ── BODY ──
    const body = row.createDiv({ cls: 'cs-action-row__body' });

    // Query
    if (opts.query) {
        const qDiv = body.createDiv({ cls: 'cs-action-row__input' });
        qDiv.textContent = `Zapytanie: ${opts.query}`;
    }

    // Response
    const responseText = opts.response || opts.summary || '';
    if (responseText) {
        const rDiv = body.createDiv({ cls: 'cs-action-row__output' });
        rDiv.textContent = responseText;
        if (hasError) rDiv.style.color = 'var(--text-error)';
    }

    // Tool call details
    if (opts.toolCallDetails?.length > 0) {
        const detailDiv = body.createDiv({ cls: 'cs-action-row__content' });
        const lines = opts.toolCallDetails.map(d => {
            const info = TOOL_INFO[d.name] || { label: d.name };
            const hint = _extractArgHint(d.name, d.args);
            return hint ? `${info.label}: ${hint}` : info.label;
        });
        detailDiv.textContent = lines.join('\n');
    } else if (opts.toolsUsed?.length > 0) {
        const toolDiv = body.createDiv({ cls: 'cs-action-row__content' });
        const names = opts.toolsUsed.map(t => (TOOL_INFO[t]?.label) || t);
        toolDiv.textContent = `Narzędzia: ${names.join(', ')}`;
    }

    // Token usage
    if (opts.usage && (opts.usage.prompt_tokens || opts.usage.completion_tokens)) {
        const tokDiv = body.createDiv({ cls: 'cs-action-row__content' });
        const inp = (opts.usage.prompt_tokens || 0).toLocaleString('pl-PL');
        const out = (opts.usage.completion_tokens || 0).toLocaleString('pl-PL');
        tokDiv.textContent = `Tokeny: ${inp} wejść / ${out} wyjść`;
    }

    // Toggle
    head.addEventListener('click', () => {
        row.classList.toggle('open');
    });

    return row;
}

/**
 * Creates a pending (loading) sub-agent .cs-action-row.
 * @param {'minion_task'|'master_task'} type
 * @param {string} [agentName] - Name of the minion/master
 * @returns {HTMLElement}
 */
export function createPendingSubAgentBlock(type, agentName) {
    const cfg = TYPE_CONFIG[type] || TYPE_CONFIG['minion_task'];

    const row = document.createElement('div');
    row.className = 'cs-action-row';

    const head = row.createDiv({ cls: 'cs-action-row__head' });

    const iconEl = head.createDiv({ cls: 'cs-action-row__icon' });
    iconEl.innerHTML = cfg.iconFn();

    const nameTag = agentName ? ` ${agentName}` : '';
    head.createSpan({ cls: 'cs-action-row__label', text: `${cfg.label}${nameTag}...` });

    // Pending status (animated)
    head.createDiv({ cls: 'cs-action-row__status cs-action-row__status--pending' });

    return row;
}

/**
 * Extract a human-readable hint from tool call arguments.
 */
function _extractArgHint(toolName, args) {
    if (!args) return '';
    const parsed = typeof args === 'string' ? (() => { try { return JSON.parse(args); } catch { return {}; } })() : args;

    switch (toolName) {
        case 'vault_read':
        case 'vault_write':
        case 'vault_delete':
            return parsed.path || '';
        case 'vault_search':
        case 'memory_search':
            return parsed.query ? `"${parsed.query}"` : '';
        case 'vault_list':
            return parsed.path || parsed.folder || '';
        default:
            return '';
    }
}
