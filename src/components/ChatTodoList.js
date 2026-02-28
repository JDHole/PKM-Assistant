/**
 * ChatTodoList - Interactive todo list widget for the chat UI.
 * Renders a checklist with progress bar, inline editing, add/delete items.
 *
 * Callbacks:
 *   onToggle(id, idx, done)
 *   onEditItem(id, idx, newText)
 *   onAddItem(id, text)
 *   onDeleteItem(id, idx)
 *   onOpenModal(id)
 */

import { UiIcons } from '../crystal-soul/UiIcons.js';

/**
 * Creates an interactive todo list widget.
 * @param {Object} todoData - { id, title, items: [{text, done}], mode, savedTo }
 * @param {Object} options  - callbacks (see above)
 * @returns {HTMLElement}
 */
export function createChatTodoList(todoData, options = {}) {
    const container = document.createElement('div');
    container.addClass('pkm-todo-container');
    container.dataset.todoId = todoData.id;

    // Header: title + progress
    const header = container.createDiv({ cls: 'pkm-todo-header' });
    const titleSpan = header.createSpan({ cls: 'pkm-todo-title' });
    titleSpan.innerHTML = `${UiIcons.clipboard(16)} ${todoData.title}`;

    const doneCount = todoData.items.filter(i => i.done).length;
    const total = todoData.items.length;
    const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

    header.createSpan({ cls: 'pkm-todo-progress-text', text: `${doneCount}/${total}` });

    // Progress bar
    const progressBar = container.createDiv({ cls: 'pkm-todo-progress' });
    const progressFill = progressBar.createDiv({ cls: 'pkm-todo-progress-fill' });
    progressFill.style.width = `${pct}%`;
    if (pct === 100) progressFill.addClass('complete');

    // Items
    const itemsList = container.createDiv({ cls: 'pkm-todo-items' });
    _renderItems(itemsList, todoData, options, container);

    // Add item row
    const addRow = container.createDiv({ cls: 'pkm-todo-add-row' });
    const addBtn = addRow.createEl('button', { cls: 'pkm-todo-add-btn', text: '+' });
    const addInput = addRow.createEl('input', {
        cls: 'pkm-todo-add-input hidden',
        attr: { placeholder: 'Nowy element...', type: 'text' }
    });

    addBtn.addEventListener('click', () => {
        if (addInput.hasClass('hidden')) {
            addInput.removeClass('hidden');
            addInput.focus();
        } else {
            _addItem(addInput, todoData, options, container);
        }
    });
    addInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') _addItem(addInput, todoData, options, container);
        if (e.key === 'Escape') { addInput.value = ''; addInput.addClass('hidden'); }
    });

    // Footer: modal button + mode badge
    const footer = container.createDiv({ cls: 'pkm-todo-footer' });

    if (options.onOpenModal) {
        const modalBtn = footer.createEl('button', { cls: 'pkm-todo-modal-btn' });
        modalBtn.innerHTML = `${UiIcons.expand(14)} Pełny widok`;
        modalBtn.addEventListener('click', () => options.onOpenModal(todoData.id));
    }

    const modeSpan = footer.createSpan({ cls: 'pkm-todo-mode' });
    modeSpan.innerHTML = todoData.mode === 'persistent'
        ? `${UiIcons.save(14)} Trwała`
        : `${UiIcons.hourglass(14)} Tymczasowa`;
    if (todoData.savedTo) {
        footer.createSpan({ cls: 'pkm-todo-saved', text: ` → ${todoData.savedTo}` });
    }

    return container;
}

/** Render all items inside the list container */
function _renderItems(itemsList, todoData, options, rootContainer) {
    itemsList.empty();
    todoData.items.forEach((item, idx) => {
        const row = itemsList.createDiv({ cls: `pkm-todo-item ${item.done ? 'done' : ''}` });

        // Checkbox
        const checkbox = row.createEl('input', { type: 'checkbox' });
        checkbox.checked = item.done;
        checkbox.addEventListener('change', () => {
            item.done = checkbox.checked;
            options.onToggle?.(todoData.id, idx, checkbox.checked);
            row.toggleClass('done', checkbox.checked);
            _updateProgress(rootContainer, todoData);
        });

        // Editable text (double-click to edit)
        const textSpan = row.createSpan({ cls: 'pkm-todo-item-text', text: item.text });

        textSpan.addEventListener('dblclick', () => {
            textSpan.setAttribute('contenteditable', 'true');
            textSpan.addClass('editing');
            textSpan.focus();
            // Select all text
            const range = document.createRange();
            range.selectNodeContents(textSpan);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        });

        const _finishEdit = () => {
            textSpan.setAttribute('contenteditable', 'false');
            textSpan.removeClass('editing');
            const newText = textSpan.textContent.trim();
            if (newText && newText !== item.text) {
                item.text = newText;
                options.onEditItem?.(todoData.id, idx, newText);
            } else if (!newText) {
                textSpan.textContent = item.text; // revert empty
            }
        };

        textSpan.addEventListener('blur', _finishEdit);
        textSpan.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); textSpan.blur(); }
            if (e.key === 'Escape') { textSpan.textContent = item.text; textSpan.blur(); }
        });

        // Delete button (visible on hover)
        const delBtn = row.createEl('button', { cls: 'pkm-todo-item-delete', text: '×' });
        delBtn.addEventListener('click', () => {
            todoData.items.splice(idx, 1);
            options.onDeleteItem?.(todoData.id, idx);
            _renderItems(itemsList, todoData, options, rootContainer);
            _updateProgress(rootContainer, todoData);
        });
    });
}

/** Add a new item from the input field */
function _addItem(input, todoData, options, rootContainer) {
    const text = input.value.trim();
    if (!text) return;
    todoData.items.push({ text, done: false });
    options.onAddItem?.(todoData.id, text);
    input.value = '';
    input.addClass('hidden');
    // Re-render items
    const itemsList = rootContainer.querySelector('.pkm-todo-items');
    if (itemsList) _renderItems(itemsList, todoData, options, rootContainer);
    _updateProgress(rootContainer, todoData);
}

/** Update progress bar and count */
function _updateProgress(container, todoData) {
    const doneCount = todoData.items.filter(i => i.done).length;
    const total = todoData.items.length;
    const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

    const progressText = container.querySelector('.pkm-todo-progress-text');
    if (progressText) progressText.textContent = `${doneCount}/${total}`;

    const progressFill = container.querySelector('.pkm-todo-progress-fill');
    if (progressFill) {
        progressFill.style.width = `${pct}%`;
        if (pct === 100) progressFill.addClass('complete');
        else progressFill.removeClass('complete');
    }
}
