/**
 * ChatTodoList - Interactive todo list widget for the chat UI.
 * Renders a checklist with progress bar that agent and user can interact with.
 */

/**
 * Creates an interactive todo list widget.
 * @param {Object} todoData - { id, title, items: [{text, done}], mode }
 * @param {Object} options - { onToggle(id, idx, done) }
 * @returns {HTMLElement}
 */
export function createChatTodoList(todoData, options = {}) {
    const container = document.createElement('div');
    container.addClass('pkm-todo-container');
    container.dataset.todoId = todoData.id;

    // Header with title + progress count
    const header = container.createDiv({ cls: 'pkm-todo-header' });
    header.createSpan({ cls: 'pkm-todo-title', text: `📋 ${todoData.title}` });

    const doneCount = todoData.items.filter(i => i.done).length;
    const total = todoData.items.length;
    const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

    header.createSpan({
        cls: 'pkm-todo-progress-text',
        text: `${doneCount}/${total}`
    });

    // Progress bar
    const progressBar = container.createDiv({ cls: 'pkm-todo-progress' });
    const progressFill = progressBar.createDiv({ cls: 'pkm-todo-progress-fill' });
    progressFill.style.width = `${pct}%`;
    if (pct === 100) progressFill.addClass('complete');

    // Items
    const itemsList = container.createDiv({ cls: 'pkm-todo-items' });
    todoData.items.forEach((item, idx) => {
        const row = itemsList.createDiv({ cls: `pkm-todo-item ${item.done ? 'done' : ''}` });

        const checkbox = row.createEl('input', { type: 'checkbox' });
        checkbox.checked = item.done;
        checkbox.addEventListener('change', () => {
            options.onToggle?.(todoData.id, idx, checkbox.checked);
            // Update UI immediately
            row.toggleClass('done', checkbox.checked);
            _updateProgress(container, todoData);
        });

        row.createSpan({ cls: 'pkm-todo-item-text', text: item.text });
    });

    // Footer with mode badge
    const footer = container.createDiv({ cls: 'pkm-todo-footer' });
    footer.createSpan({
        cls: 'pkm-todo-mode',
        text: todoData.mode === 'persistent' ? '💾 Trwała' : '⏳ Tymczasowa'
    });
    if (todoData.savedTo) {
        footer.createSpan({
            cls: 'pkm-todo-saved',
            text: ` → ${todoData.savedTo}`
        });
    }

    return container;
}

/**
 * Update progress bar and count in an existing todo widget.
 * @param {HTMLElement} container
 * @param {Object} todoData
 */
function _updateProgress(container, todoData) {
    const doneCount = todoData.items.filter(i => i.done).length;
    const total = todoData.items.length;
    const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

    const progressText = container.querySelector('.pkm-todo-progress-text');
    if (progressText) progressText.textContent = `${doneCount}/${total}`;

    const progressFill = container.querySelector('.pkm-todo-progress-fill');
    if (progressFill) {
        progressFill.style.width = `${pct}%`;
        if (pct === 100) {
            progressFill.addClass('complete');
        } else {
            progressFill.removeClass('complete');
        }
    }
}
