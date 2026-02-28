/**
 * TodoEditModal - Full-screen modal for editing a todo list.
 * User can edit title, add/remove/reorder items, toggle checkboxes.
 */
import Obsidian from 'obsidian';
const { Modal } = Obsidian;
import { UiIcons } from '../crystal-soul/UiIcons.js';

export class TodoEditModal extends Modal {
    /**
     * @param {App} app
     * @param {Plugin} plugin
     * @param {string} todoId
     * @param {Function} onSave - called after save with updated todo
     */
    constructor(app, plugin, todoId, onSave) {
        super(app);
        this.plugin = plugin;
        this.todoId = todoId;
        this.onSaveCallback = onSave;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('pkm-todo-modal');

        const todo = this.plugin._chatTodoStore?.get(this.todoId);
        if (!todo) {
            contentEl.createEl('p', { text: 'Lista nie znaleziona.' });
            return;
        }

        // Work on a copy so cancel doesn't mutate
        this.editData = {
            title: todo.title,
            items: todo.items.map(i => ({ ...i }))
        };

        // Title
        const titleRow = contentEl.createDiv({ cls: 'pkm-todo-modal-title-row' });
        const todoIcon = titleRow.createSpan({ cls: 'pkm-todo-modal-icon' });
        todoIcon.innerHTML = UiIcons.clipboard(22);
        this.titleInput = titleRow.createEl('input', {
            cls: 'pkm-todo-modal-title-input',
            value: this.editData.title,
            attr: { type: 'text', placeholder: 'Tytuł listy...' }
        });

        // Items container
        this.itemsContainer = contentEl.createDiv({ cls: 'pkm-todo-modal-items' });
        this._renderItems();

        // Add item row
        const addRow = contentEl.createDiv({ cls: 'pkm-todo-modal-add-row' });
        this.addInput = addRow.createEl('input', {
            attr: { type: 'text', placeholder: 'Dodaj element...' },
            cls: 'pkm-todo-modal-add-input'
        });
        const addBtn = addRow.createEl('button', { text: '+ Dodaj', cls: 'pkm-todo-modal-add-btn' });
        addBtn.addEventListener('click', () => this._addItem());
        this.addInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this._addItem();
        });

        // Footer buttons
        const footer = contentEl.createDiv({ cls: 'pkm-todo-modal-footer' });
        const cancelBtn = footer.createEl('button', { text: 'Anuluj', cls: 'pkm-todo-modal-cancel' });
        cancelBtn.addEventListener('click', () => this.close());

        const saveBtn = footer.createEl('button', { text: 'Zapisz', cls: 'mod-cta pkm-todo-modal-save' });
        saveBtn.addEventListener('click', () => this._save());
    }

    _renderItems() {
        this.itemsContainer.empty();
        this.editData.items.forEach((item, idx) => {
            const row = this.itemsContainer.createDiv({ cls: 'pkm-todo-modal-item' });

            const cb = row.createEl('input', { type: 'checkbox' });
            cb.checked = item.done;
            cb.addEventListener('change', () => { item.done = cb.checked; });

            const input = row.createEl('input', {
                attr: { type: 'text', value: item.text },
                cls: 'pkm-todo-modal-item-input'
            });
            input.addEventListener('input', () => { item.text = input.value; });

            const delBtn = row.createEl('button', { text: '×', cls: 'pkm-todo-modal-item-delete' });
            delBtn.addEventListener('click', () => {
                this.editData.items.splice(idx, 1);
                this._renderItems();
            });
        });
    }

    _addItem() {
        const text = this.addInput.value.trim();
        if (!text) return;
        this.editData.items.push({ text, done: false });
        this.addInput.value = '';
        this._renderItems();
        // Focus last input
        const inputs = this.itemsContainer.querySelectorAll('.pkm-todo-modal-item-input');
        if (inputs.length > 0) inputs[inputs.length - 1].focus();
    }

    async _save() {
        const todo = this.plugin._chatTodoStore?.get(this.todoId);
        if (!todo) { this.close(); return; }

        // Apply changes
        todo.title = this.titleInput.value.trim() || todo.title;
        todo.items = this.editData.items.filter(i => i.text.trim());

        // Persist to disk
        if (this.plugin.artifactManager) {
            try {
                const createdBy = todo.createdBy
                    || this.plugin.agentManager?.getActiveAgent()?.name
                    || 'unknown';
                todo.createdBy = createdBy;
                await this.plugin.artifactManager.save({
                    type: 'todo', id: todo.id, title: todo.title,
                    data: todo, createdBy
                });
            } catch (e) {
                console.warn('[TodoEditModal] Save failed:', e);
            }
        }

        this.onSaveCallback?.(todo);
        this.close();
    }

    onClose() {
        this.contentEl.empty();
    }
}
