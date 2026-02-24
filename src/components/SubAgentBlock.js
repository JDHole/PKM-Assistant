import { TOOL_INFO } from './ToolCallDisplay.js';

const TYPE_CONFIG = {
    'auto-prep':   { icon: '🤖', label: 'Przygotowanie kontekstu', cls: 'type-minion' },
    'minion_task': { icon: '🔧', label: 'Zadanie miniona',        cls: 'type-minion' },
    'master_task': { icon: '👑', label: 'Konsultacja z Masterem',  cls: 'type-master' },
};

/**
 * Creates a collapsible sub-agent activity block for the chat UI.
 * Full transparency: shows query, response, tools used, files accessed, tokens.
 *
 * @param {Object} opts
 * @param {'auto-prep'|'minion_task'|'master_task'} opts.type
 * @param {string} [opts.query] - Human-readable task/query sent to the sub-agent
 * @param {string} [opts.response] - Full response text from the sub-agent
 * @param {string[]} [opts.toolsUsed] - Tool names used
 * @param {Array} [opts.toolCallDetails] - Detailed tool call info [{name, args, resultPreview}]
 * @param {number} [opts.duration] - Duration in ms
 * @param {{ prompt_tokens: number, completion_tokens: number }|null} [opts.usage]
 * @param {string} [opts.summary] - Brief context summary (fallback if no response)
 * @returns {HTMLElement}
 */
export function createSubAgentBlock(opts) {
    const cfg = TYPE_CONFIG[opts.type] || TYPE_CONFIG['minion_task'];

    const container = document.createElement('div');
    container.addClass('pkm-subagent-block');
    container.addClass(cfg.cls);

    // Header (always visible)
    const header = container.createDiv({ cls: 'pkm-subagent-header' });
    header.createSpan({ cls: 'pkm-subagent-icon', text: cfg.icon });

    const durationStr = opts.duration ? `${(opts.duration / 1000).toFixed(1)}s` : '';
    const labelText = durationStr ? `${cfg.label} · ${durationStr}` : cfg.label;
    header.createSpan({ cls: 'pkm-subagent-label', text: labelText });

    const toggle = document.createElement('button');
    toggle.addClass('pkm-subagent-toggle');
    toggle.textContent = '▼';
    header.appendChild(toggle);

    // Body (collapsed by default)
    const body = container.createDiv({ cls: 'pkm-subagent-body collapsed' });

    // Query (what was asked)
    if (opts.query) {
        const queryRow = body.createDiv({ cls: 'pkm-subagent-section' });
        queryRow.createDiv({ cls: 'pkm-subagent-section-label', text: 'Zapytanie:' });
        const queryText = queryRow.createDiv({ cls: 'pkm-subagent-section-content pkm-subagent-query' });
        queryText.textContent = opts.query;
    }

    // Response (full, scrollable)
    const responseText = opts.response || opts.summary || '';
    if (responseText) {
        const responseRow = body.createDiv({ cls: 'pkm-subagent-section' });
        responseRow.createDiv({ cls: 'pkm-subagent-section-label', text: 'Odpowiedź:' });
        const responseContent = responseRow.createDiv({ cls: 'pkm-subagent-section-content pkm-subagent-response' });
        responseContent.textContent = responseText;
    }

    // Tool call details (which files were accessed)
    if (opts.toolCallDetails?.length > 0) {
        const detailsRow = body.createDiv({ cls: 'pkm-subagent-section' });
        detailsRow.createDiv({ cls: 'pkm-subagent-section-label', text: 'Użyte narzędzia:' });
        const detailsList = detailsRow.createDiv({ cls: 'pkm-subagent-tool-details' });

        for (const detail of opts.toolCallDetails) {
            const info = TOOL_INFO[detail.name] || { icon: '🔧', label: detail.name };
            const row = detailsList.createDiv({ cls: 'pkm-subagent-tool-detail-row' });

            // Tool name + icon
            row.createSpan({ cls: 'pkm-subagent-tool-detail-name', text: `${info.icon} ${info.label}` });

            // Extract key info from args (path, query, etc.)
            const argHint = _extractArgHint(detail.name, detail.args);
            if (argHint) {
                row.createSpan({ cls: 'pkm-subagent-tool-detail-hint', text: argHint });
            }

            // Error indicator
            if (detail.error) {
                row.createSpan({ cls: 'pkm-subagent-tool-detail-error', text: '✗' });
            }
        }
    } else if (opts.toolsUsed?.length > 0) {
        // Fallback: just tool names (no details)
        const toolsRow = body.createDiv({ cls: 'pkm-subagent-row' });
        toolsRow.createSpan({ cls: 'pkm-subagent-row-label', text: 'Narzędzia: ' });
        const toolNames = opts.toolsUsed.map(t => {
            const info = TOOL_INFO[t];
            return info ? `${info.icon} ${info.label}` : t;
        });
        toolsRow.createSpan({ text: toolNames.join(', ') });
    }

    // Token usage
    if (opts.usage && (opts.usage.prompt_tokens || opts.usage.completion_tokens)) {
        const tokRow = body.createDiv({ cls: 'pkm-subagent-row' });
        tokRow.createSpan({ cls: 'pkm-subagent-row-label', text: 'Tokeny: ' });
        const inp = (opts.usage.prompt_tokens || 0).toLocaleString('pl-PL');
        const out = (opts.usage.completion_tokens || 0).toLocaleString('pl-PL');
        tokRow.createSpan({ text: `${inp} wejść / ${out} wyjść` });
    }

    // Toggle logic
    header.addEventListener('click', () => {
        const isCollapsed = body.classList.contains('collapsed');
        if (isCollapsed) {
            body.classList.remove('collapsed');
            toggle.classList.add('expanded');
        } else {
            body.classList.add('collapsed');
            toggle.classList.remove('expanded');
        }
    });

    return container;
}

/**
 * Creates a pending (loading) sub-agent block.
 * @param {'minion_task'|'master_task'} type
 * @returns {HTMLElement}
 */
export function createPendingSubAgentBlock(type) {
    const cfg = TYPE_CONFIG[type] || TYPE_CONFIG['minion_task'];

    const container = document.createElement('div');
    container.addClass('pkm-subagent-block');
    container.addClass(cfg.cls);
    container.addClass('pending');

    const header = container.createDiv({ cls: 'pkm-subagent-header' });
    header.createSpan({ cls: 'pkm-subagent-icon', text: cfg.icon });
    header.createSpan({ cls: 'pkm-subagent-label', text: `${cfg.label}...` });

    // Animated dots
    const dots = header.createSpan({ cls: 'pkm-subagent-dots' });
    dots.textContent = '●●●';

    return container;
}

/**
 * Extract a human-readable hint from tool call arguments.
 * e.g. vault_read({path: "foo.md"}) → "foo.md"
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
