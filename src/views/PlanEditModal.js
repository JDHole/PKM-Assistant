/**
 * PlanEditModal - Full-screen modal for editing a creation plan.
 * User can edit title, add/remove steps, change statuses, edit descriptions,
 * and manage subtasks per step.
 */
import Obsidian from 'obsidian';
const { Modal } = Obsidian;

const STATUS_OPTIONS = [
    { value: 'pending', label: '○ Oczekuje' },
    { value: 'in_progress', label: '◉ W trakcie' },
    { value: 'done', label: '✓ Zrobione' },
    { value: 'skipped', label: '— Pominięte' }
];

export class PlanEditModal extends Modal {
    constructor(app, plugin, planId, onSave) {
        super(app);
        this.plugin = plugin;
        this.planId = planId;
        this.onSaveCallback = onSave;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('pkm-plan-modal');

        const plan = this.plugin._planStore?.get(this.planId);
        if (!plan) {
            contentEl.createEl('p', { text: 'Plan nie znaleziony.' });
            return;
        }

        // Deep copy (including subtasks arrays)
        this.editData = {
            title: plan.title,
            approved: plan.approved,
            steps: plan.steps.map(s => ({
                ...s,
                subtasks: (s.subtasks || []).map(st => ({ ...st }))
            }))
        };

        // Title
        const titleRow = contentEl.createDiv({ cls: 'pkm-plan-modal-title-row' });
        titleRow.createSpan({ text: '📋', cls: 'pkm-plan-modal-icon' });
        this.titleInput = titleRow.createEl('input', {
            cls: 'pkm-plan-modal-title-input',
            value: this.editData.title,
            attr: { type: 'text', placeholder: 'Tytuł planu...' }
        });

        // Steps container
        this.stepsContainer = contentEl.createDiv({ cls: 'pkm-plan-modal-steps' });
        this._renderSteps();

        // Add step row
        const addRow = contentEl.createDiv({ cls: 'pkm-plan-modal-add-row' });
        this.addInput = addRow.createEl('input', {
            attr: { type: 'text', placeholder: 'Dodaj krok...' },
            cls: 'pkm-plan-modal-add-input'
        });
        const addBtn = addRow.createEl('button', { text: '+ Dodaj', cls: 'pkm-plan-modal-add-btn' });
        addBtn.addEventListener('click', () => this._addStep());
        this.addInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this._addStep();
        });

        // Footer buttons
        const footer = contentEl.createDiv({ cls: 'pkm-plan-modal-footer' });
        const cancelBtn = footer.createEl('button', { text: 'Anuluj', cls: 'pkm-plan-modal-cancel' });
        cancelBtn.addEventListener('click', () => this.close());

        const saveBtn = footer.createEl('button', { text: 'Zapisz', cls: 'mod-cta pkm-plan-modal-save' });
        saveBtn.addEventListener('click', () => this._save());
    }

    _renderSteps() {
        this.stepsContainer.empty();
        this.editData.steps.forEach((step, idx) => {
            const row = this.stepsContainer.createDiv({ cls: 'pkm-plan-modal-step' });

            // Step number
            row.createSpan({ cls: 'pkm-plan-modal-step-num', text: `${idx + 1}.` });

            // Status dropdown
            const statusSelect = row.createEl('select', { cls: 'pkm-plan-modal-step-status' });
            STATUS_OPTIONS.forEach(opt => {
                const option = statusSelect.createEl('option', {
                    value: opt.value, text: opt.label
                });
                if (opt.value === step.status) option.selected = true;
            });
            statusSelect.addEventListener('change', () => { step.status = statusSelect.value; });

            // Fields wrapper
            const fields = row.createDiv({ cls: 'pkm-plan-modal-step-fields' });

            // Label input
            const labelInput = fields.createEl('input', {
                attr: { type: 'text', value: step.label, placeholder: 'Nazwa kroku...' },
                cls: 'pkm-plan-modal-step-label'
            });
            labelInput.addEventListener('input', () => { step.label = labelInput.value; });

            // Description input
            const descInput = fields.createEl('input', {
                attr: { type: 'text', value: step.description || '', placeholder: 'Opis (opcjonalny)...' },
                cls: 'pkm-plan-modal-step-desc'
            });
            descInput.addEventListener('input', () => { step.description = descInput.value; });

            // Note (read-only, from agent)
            if (step.note) {
                fields.createEl('small', {
                    cls: 'pkm-plan-modal-step-note',
                    text: `→ ${step.note}`
                });
            }

            // Subtasks section
            const subtasksDiv = fields.createDiv({ cls: 'pkm-plan-modal-subtasks' });
            (step.subtasks || []).forEach((sub, subIdx) => {
                const subRow = subtasksDiv.createDiv({ cls: 'pkm-plan-modal-subtask' });
                const subCb = subRow.createEl('input', { type: 'checkbox' });
                subCb.checked = sub.done;
                subCb.addEventListener('change', () => { sub.done = subCb.checked; });
                const subInput = subRow.createEl('input', {
                    attr: { type: 'text', value: sub.text, placeholder: 'Podzadanie...' },
                    cls: 'pkm-plan-modal-subtask-input'
                });
                subInput.addEventListener('input', () => { sub.text = subInput.value; });
                const subDel = subRow.createEl('button', { text: '×', cls: 'pkm-plan-modal-subtask-delete' });
                subDel.addEventListener('click', () => {
                    step.subtasks.splice(subIdx, 1);
                    this._renderSteps();
                });
            });
            // Add subtask inline
            const addSubInput = subtasksDiv.createEl('input', {
                attr: { type: 'text', placeholder: '+ podzadanie...' },
                cls: 'pkm-plan-modal-add-subtask-input'
            });
            addSubInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const text = addSubInput.value.trim();
                    if (!text) return;
                    if (!step.subtasks) step.subtasks = [];
                    step.subtasks.push({ text, done: false });
                    addSubInput.value = '';
                    this._renderSteps();
                }
            });

            // Delete step button
            const delBtn = row.createEl('button', { text: '×', cls: 'pkm-plan-modal-step-delete' });
            delBtn.addEventListener('click', () => {
                this.editData.steps.splice(idx, 1);
                this._renderSteps();
            });
        });
    }

    _addStep() {
        const label = this.addInput.value.trim();
        if (!label) return;
        this.editData.steps.push({ label, description: '', status: 'pending', note: '', subtasks: [] });
        this.addInput.value = '';
        this._renderSteps();
        const inputs = this.stepsContainer.querySelectorAll('.pkm-plan-modal-step-label');
        if (inputs.length > 0) inputs[inputs.length - 1].focus();
    }

    async _save() {
        const plan = this.plugin._planStore?.get(this.planId);
        if (!plan) { this.close(); return; }

        // Apply changes
        plan.title = this.titleInput.value.trim() || plan.title;
        plan.steps = this.editData.steps.filter(s => s.label.trim());

        // Persist to disk
        if (this.plugin.artifactManager) {
            try {
                const createdBy = plan.createdBy
                    || this.plugin.agentManager?.getActiveAgent()?.name
                    || 'unknown';
                plan.createdBy = createdBy;
                await this.plugin.artifactManager.save({
                    type: 'plan', id: plan.id, title: plan.title,
                    data: plan, createdBy
                });
            } catch (e) {
                console.warn('[PlanEditModal] Save failed:', e);
            }
        }

        this.onSaveCallback?.(plan);
        this.close();
    }

    onClose() {
        this.contentEl.empty();
    }
}
