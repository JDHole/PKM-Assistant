
/**
 * Creates a collapsible tool call display element
 * @param {Object} toolCall - Tool call data: {name, input, output, status, error?}
 * @returns {HTMLElement}
 */
export function createToolCallDisplay(toolCall) {
    const container = document.createElement('div');
    container.addClass('tool-call-container');

    // Header
    const header = container.createDiv({ cls: 'tool-call-header' });

    // Icon
    const TOOL_ICONS = {
        vault_read: '📖',
        vault_write: '✏️',
        vault_search: '🔍',
        vault_list: '📁',
        vault_delete: '🗑️',
        default: '🔧'
    };
    const iconChar = TOOL_ICONS[toolCall.name] || TOOL_ICONS.default;
    header.createSpan({ cls: 'tool-call-icon', text: iconChar });

    // Name
    header.createSpan({ cls: 'tool-call-name', text: toolCall.name });

    // Status
    const status = toolCall.status || 'pending';
    const statusSpan = header.createSpan({ cls: `tool-call-status ${status}` });
    statusSpan.textContent = status === 'success' ? '✓' : (status === 'error' ? '✗' : '⋯');

    // Toggle
    const toggle = document.createElement('button');
    toggle.addClass('tool-call-toggle');
    toggle.textContent = '▼';
    header.appendChild(toggle);

    // Body
    const body = container.createDiv({ cls: 'tool-call-body collapsed' });

    // Input Section
    const inputDiv = body.createDiv({ cls: 'tool-call-input' });
    inputDiv.createEl('strong', { text: 'Input:' });
    const inputPre = inputDiv.createEl('pre');
    inputPre.textContent = JSON.stringify(toolCall.input, null, 2);

    // Output Section
    const outputDiv = body.createDiv({ cls: 'tool-call-output' });
    outputDiv.createEl('strong', { text: 'Output:' });
    const outputPre = outputDiv.createEl('pre');

    if (toolCall.error) {
        outputPre.textContent = JSON.stringify(toolCall.error, null, 2);
        outputPre.style.color = 'var(--text-error)';
    } else {
        outputPre.textContent = toolCall.output ? JSON.stringify(toolCall.output, null, 2) : '(no output)';
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

    console.log('[ToolCallDisplay] Created display for', toolCall.name);
    return container;
}
