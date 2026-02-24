/**
 * PlanArtifact - Interactive creation plan widget for the chat UI.
 * Shows numbered steps with status icons, progress bar, inline editing,
 * add/delete steps, comment-to-chat, and modal button.
 *
 * Callbacks:
 *   onApprove(id)
 *   onEditStep(id, idx, { label?, description? })
 *   onAddStep(id, label)
 *   onDeleteStep(id, idx)
 *   onStatusChange(id, idx, newStatus)
 *   onComment(id, idx, text)    — sends comment to chat input
 *   onSubtaskToggle(id, stepIdx, subIdx, done)
 *   onAddSubtask(id, stepIdx, text)
 *   onDeleteSubtask(id, stepIdx, subIdx)
 *   onOpenModal(id)
 */

const STATUS_ICONS = {
    pending: '○',
    in_progress: '◉',
    done: '✓',
    skipped: '—'
};

const STATUS_CYCLE = ['pending', 'in_progress', 'done', 'skipped'];

/**
 * Creates an interactive plan artifact widget.
 * @param {Object} planData - { id, title, steps: [{label, description, status, note}], approved }
 * @param {Object} options - callbacks (see above)
 * @returns {HTMLElement}
 */
export function createPlanArtifact(planData, options = {}) {
    const container = document.createElement('div');
    container.addClass('pkm-plan-container');
    container.dataset.planId = planData.id;

    // Header: title + progress
    const header = container.createDiv({ cls: 'pkm-plan-header' });
    header.createSpan({ cls: 'pkm-plan-title', text: `📋 ${planData.title}` });

    const doneSteps = planData.steps.filter(s => s.status === 'done').length;
    const total = planData.steps.length;
    const pct = total > 0 ? Math.round((doneSteps / total) * 100) : 0;

    header.createSpan({ cls: 'pkm-plan-progress', text: `${doneSteps}/${total}` });

    // Progress bar
    const progressBar = container.createDiv({ cls: 'pkm-plan-progress-bar' });
    const progressFill = progressBar.createDiv({ cls: 'pkm-plan-progress-fill' });
    progressFill.style.width = `${pct}%`;
    if (pct === 100) progressFill.addClass('complete');

    // Steps
    const stepsDiv = container.createDiv({ cls: 'pkm-plan-steps' });
    _renderSteps(stepsDiv, planData, options, container);

    // Add step row
    const addRow = container.createDiv({ cls: 'pkm-plan-add-row' });
    const addBtn = addRow.createEl('button', { cls: 'pkm-plan-add-btn', text: '+' });
    const addInput = addRow.createEl('input', {
        cls: 'pkm-plan-add-input hidden',
        attr: { placeholder: 'Nowy krok...', type: 'text' }
    });

    addBtn.addEventListener('click', () => {
        if (addInput.hasClass('hidden')) {
            addInput.removeClass('hidden');
            addInput.focus();
        } else {
            _addStep(addInput, planData, options, container);
        }
    });
    addInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') _addStep(addInput, planData, options, container);
        if (e.key === 'Escape') { addInput.value = ''; addInput.addClass('hidden'); }
    });

    // Footer: approve + modal + completion
    const footer = container.createDiv({ cls: 'pkm-plan-footer' });

    if (!planData.approved && pct < 100) {
        const approveBtn = footer.createEl('button', {
            text: '✅ Zatwierdź plan',
            cls: 'mod-cta pkm-plan-approve-btn'
        });
        approveBtn.addEventListener('click', () => {
            options.onApprove?.(planData.id);
        });
    }

    if (options.onOpenModal) {
        const modalBtn = footer.createEl('button', {
            cls: 'pkm-plan-modal-btn',
            text: '🔲 Pełny widok'
        });
        modalBtn.addEventListener('click', () => options.onOpenModal(planData.id));
    }

    if (pct === 100) {
        footer.createSpan({ cls: 'pkm-plan-done', text: '✅ Plan wykonany!' });
    }

    return container;
}

/** Render all steps inside the steps container */
function _renderSteps(stepsDiv, planData, options, rootContainer) {
    stepsDiv.empty();
    planData.steps.forEach((step, idx) => {
        const stepRow = stepsDiv.createDiv({ cls: `pkm-plan-step status-${step.status}` });

        // Status icon (clickable to cycle)
        const icon = stepRow.createSpan({
            cls: 'pkm-plan-step-icon clickable',
            text: STATUS_ICONS[step.status] || '○'
        });
        icon.setAttribute('title', 'Klik = zmień status');
        icon.addEventListener('click', () => {
            const curIdx = STATUS_CYCLE.indexOf(step.status);
            const next = STATUS_CYCLE[(curIdx + 1) % STATUS_CYCLE.length];
            step.status = next;
            options.onStatusChange?.(planData.id, idx, next);
            _renderSteps(stepsDiv, planData, options, rootContainer);
            _updateProgress(rootContainer, planData);
        });

        // Content area
        const textDiv = stepRow.createDiv({ cls: 'pkm-plan-step-content' });

        // Label (double-click to edit)
        const labelSpan = textDiv.createSpan({
            cls: 'pkm-plan-step-label',
            text: `${idx + 1}. ${step.label}`
        });

        labelSpan.addEventListener('dblclick', () => {
            labelSpan.setAttribute('contenteditable', 'true');
            labelSpan.addClass('editing');
            // Remove the "1. " prefix for editing
            labelSpan.textContent = step.label;
            labelSpan.focus();
            const range = document.createRange();
            range.selectNodeContents(labelSpan);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        });

        const _finishLabelEdit = () => {
            labelSpan.setAttribute('contenteditable', 'false');
            labelSpan.removeClass('editing');
            const newLabel = labelSpan.textContent.trim();
            if (newLabel && newLabel !== step.label) {
                step.label = newLabel;
                options.onEditStep?.(planData.id, idx, { label: newLabel });
            }
            // Restore numbered prefix
            labelSpan.textContent = `${idx + 1}. ${step.label}`;
        };

        labelSpan.addEventListener('blur', _finishLabelEdit);
        labelSpan.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); labelSpan.blur(); }
            if (e.key === 'Escape') { labelSpan.textContent = step.label; labelSpan.blur(); }
        });

        // Description
        if (step.description) {
            textDiv.createEl('small', {
                cls: 'pkm-plan-step-desc',
                text: step.description
            });
        }

        // Note from agent
        if (step.note) {
            textDiv.createEl('small', {
                cls: 'pkm-plan-step-note',
                text: `→ ${step.note}`
            });
        }

        // Subtasks
        if (step.subtasks && step.subtasks.length > 0) {
            const subtasksList = textDiv.createDiv({ cls: 'pkm-plan-subtasks' });
            step.subtasks.forEach((sub, subIdx) => {
                const subRow = subtasksList.createDiv({ cls: `pkm-plan-subtask ${sub.done ? 'done' : ''}` });
                const subCb = subRow.createEl('input', { type: 'checkbox' });
                subCb.checked = sub.done;
                subCb.addEventListener('change', () => {
                    sub.done = subCb.checked;
                    subRow.toggleClass('done', sub.done);
                    options.onSubtaskToggle?.(planData.id, idx, subIdx, sub.done);
                });
                subRow.createSpan({ cls: 'pkm-plan-subtask-text', text: sub.text });
                const subDel = subRow.createEl('button', { cls: 'pkm-plan-subtask-delete', text: '×' });
                subDel.addEventListener('click', () => {
                    step.subtasks.splice(subIdx, 1);
                    options.onDeleteSubtask?.(planData.id, idx, subIdx);
                    _renderSteps(stepsDiv, planData, options, rootContainer);
                });
            });
        }

        // Add subtask button
        const addSubBtn = textDiv.createEl('button', {
            cls: 'pkm-plan-add-subtask-btn', text: '+ podzadanie'
        });
        addSubBtn.addEventListener('click', () => {
            let addSubRow = textDiv.querySelector('.pkm-plan-add-subtask-row');
            if (addSubRow) { addSubRow.remove(); return; }
            addSubRow = textDiv.createDiv({ cls: 'pkm-plan-add-subtask-row' });
            const subInput = addSubRow.createEl('input', {
                cls: 'pkm-plan-add-subtask-input',
                attr: { placeholder: 'Nowe podzadanie...', type: 'text' }
            });
            const _addSub = () => {
                const text = subInput.value.trim();
                if (!text) return;
                if (!step.subtasks) step.subtasks = [];
                step.subtasks.push({ text, done: false });
                options.onAddSubtask?.(planData.id, idx, text);
                _renderSteps(stepsDiv, planData, options, rootContainer);
            };
            subInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') _addSub();
                if (e.key === 'Escape') addSubRow.remove();
            });
            subInput.focus();
        });

        // Actions (visible on hover)
        const actions = stepRow.createDiv({ cls: 'pkm-plan-step-actions' });

        // Comment button
        const commentBtn = actions.createEl('button', {
            cls: 'pkm-plan-step-action-btn',
            text: '💬',
            attr: { title: 'Komentarz do kroku' }
        });
        commentBtn.addEventListener('click', () => {
            // Toggle inline comment input
            let commentRow = stepRow.querySelector('.pkm-plan-step-comment-row');
            if (commentRow) {
                commentRow.remove();
                return;
            }
            commentRow = stepRow.createDiv({ cls: 'pkm-plan-step-comment-row' });
            const commentInput = commentRow.createEl('input', {
                cls: 'pkm-plan-step-comment-input',
                attr: { placeholder: `Komentarz do kroku ${idx + 1}...`, type: 'text' }
            });
            const sendBtn = commentRow.createEl('button', {
                cls: 'pkm-plan-step-comment-send',
                text: '↵'
            });
            const _send = () => {
                const text = commentInput.value.trim();
                if (!text) return;
                options.onComment?.(planData.id, idx, text);
                commentRow.remove();
            };
            sendBtn.addEventListener('click', _send);
            commentInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') _send();
                if (e.key === 'Escape') commentRow.remove();
            });
            commentInput.focus();
        });

        // Delete button
        const delBtn = actions.createEl('button', {
            cls: 'pkm-plan-step-action-btn delete',
            text: '×',
            attr: { title: 'Usuń krok' }
        });
        delBtn.addEventListener('click', () => {
            planData.steps.splice(idx, 1);
            options.onDeleteStep?.(planData.id, idx);
            _renderSteps(stepsDiv, planData, options, rootContainer);
            _updateProgress(rootContainer, planData);
        });
    });
}

/** Add a new step from the input field */
function _addStep(input, planData, options, rootContainer) {
    const label = input.value.trim();
    if (!label) return;
    planData.steps.push({ label, description: '', status: 'pending', note: '', subtasks: [] });
    options.onAddStep?.(planData.id, label);
    input.value = '';
    input.addClass('hidden');
    const stepsDiv = rootContainer.querySelector('.pkm-plan-steps');
    if (stepsDiv) _renderSteps(stepsDiv, planData, options, rootContainer);
    _updateProgress(rootContainer, planData);
}

/** Update progress bar and count */
function _updateProgress(container, planData) {
    const doneSteps = planData.steps.filter(s => s.status === 'done').length;
    const total = planData.steps.length;
    const pct = total > 0 ? Math.round((doneSteps / total) * 100) : 0;

    const progressText = container.querySelector('.pkm-plan-progress');
    if (progressText) progressText.textContent = `${doneSteps}/${total}`;

    const progressFill = container.querySelector('.pkm-plan-progress-fill');
    if (progressFill) {
        progressFill.style.width = `${pct}%`;
        if (pct === 100) progressFill.addClass('complete');
        else progressFill.removeClass('complete');
    }
}
