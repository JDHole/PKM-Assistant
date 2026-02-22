
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

    // Icon + Polish names
    const TOOL_INFO = {
        vault_read:      { icon: '📖', label: 'Odczyt notatki' },
        vault_write:     { icon: '✏️', label: 'Zapis notatki' },
        vault_search:    { icon: '🔍', label: 'Wyszukiwanie w vaultcie' },
        vault_list:      { icon: '📁', label: 'Lista plików' },
        vault_delete:    { icon: '🗑️', label: 'Usunięcie notatki' },
        memory_search:   { icon: '🧠', label: 'Przeszukanie pamięci' },
        memory_update:   { icon: '🧠', label: 'Aktualizacja pamięci' },
        memory_status:   { icon: '🧠', label: 'Stan pamięci' },
        skill_list:      { icon: '📚', label: 'Lista umiejętności' },
        skill_execute:   { icon: '🎯', label: 'Aktywacja skilla' },
        minion_task:     { icon: '🔧', label: 'Zadanie miniona' },
        master_task:     { icon: '🧠', label: 'Konsultacja z ekspertem' },
        agent_message:   { icon: '💬', label: 'Wiadomość do agenta' },
        agent_delegate:  { icon: '🤝', label: 'Propozycja delegacji' },
        chat_todo:       { icon: '📋', label: 'Lista zadań' },
        plan_action:     { icon: '📋', label: 'Plan działania' },
    };
    const info = TOOL_INFO[toolCall.name] || { icon: '🔧', label: toolCall.name };
    header.createSpan({ cls: 'tool-call-icon', text: info.icon });

    // Name (Polish)
    header.createSpan({ cls: 'tool-call-name', text: info.label });

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
    const inputDiv = body.createDiv({ cls: 'tool-call-section' });
    const inputHeader = inputDiv.createDiv({ cls: 'tool-call-section-header' });
    inputHeader.createEl('strong', { text: 'Input:' });
    const copyInputBtn = inputHeader.createEl('button', { cls: 'tool-call-copy-btn', text: '📋' });
    copyInputBtn.title = 'Kopiuj input';
    const inputPre = inputDiv.createEl('pre');
    const inputText = JSON.stringify(toolCall.input, null, 2);
    inputPre.textContent = inputText;

    copyInputBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(inputText);
        copyInputBtn.textContent = '✓';
        setTimeout(() => { copyInputBtn.textContent = '📋'; }, 1500);
    });

    // Output Section
    const outputDiv = body.createDiv({ cls: 'tool-call-section' });
    const outputHeader = outputDiv.createDiv({ cls: 'tool-call-section-header' });
    outputHeader.createEl('strong', { text: 'Output:' });
    const copyOutputBtn = outputHeader.createEl('button', { cls: 'tool-call-copy-btn', text: '📋' });
    copyOutputBtn.title = 'Kopiuj output';
    const outputPre = outputDiv.createEl('pre');

    let outputText;
    if (toolCall.error) {
        outputText = JSON.stringify(toolCall.error, null, 2);
        outputPre.textContent = outputText;
        outputPre.style.color = 'var(--text-error)';
    } else {
        outputText = toolCall.output ? JSON.stringify(toolCall.output, null, 2) : '(no output)';
        outputPre.textContent = outputText;
    }

    copyOutputBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(outputText);
        copyOutputBtn.textContent = '✓';
        setTimeout(() => { copyOutputBtn.textContent = '📋'; }, 1500);
    });

    // Copy All button (full tool call as text)
    const copyAllDiv = body.createDiv({ cls: 'tool-call-copy-all' });
    const copyAllBtn = copyAllDiv.createEl('button', { cls: 'tool-call-copy-all-btn', text: '📋 Kopiuj całość' });
    copyAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const fullText = `${info.label} (${toolCall.name})\n\nInput:\n${inputText}\n\nOutput:\n${outputText}`;
        navigator.clipboard.writeText(fullText);
        copyAllBtn.textContent = '✓ Skopiowano';
        setTimeout(() => { copyAllBtn.textContent = '📋 Kopiuj całość'; }, 1500);
    });

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
