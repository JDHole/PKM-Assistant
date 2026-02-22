/**
 * PlanArtifact - Interactive creation plan widget for the chat UI.
 * Shows numbered steps with status icons, progress bar, and approve button.
 */

const STATUS_ICONS = {
    pending: '○',
    in_progress: '◉',
    done: '✓',
    skipped: '—'
};

/**
 * Creates an interactive plan artifact widget.
 * @param {Object} planData - { id, title, steps: [{label, description, status, note}], approved }
 * @param {Object} options - { onApprove(id), onEditStep(id, idx, currentText) }
 * @returns {HTMLElement}
 */
export function createPlanArtifact(planData, options = {}) {
    const container = document.createElement('div');
    container.addClass('pkm-plan-container');
    container.dataset.planId = planData.id;

    // Header
    const header = container.createDiv({ cls: 'pkm-plan-header' });
    header.createSpan({ text: `📋 ${planData.title}` });

    const doneSteps = planData.steps.filter(s => s.status === 'done').length;
    const total = planData.steps.length;
    const pct = total > 0 ? Math.round((doneSteps / total) * 100) : 0;

    header.createSpan({
        cls: 'pkm-plan-progress',
        text: `${doneSteps}/${total}`
    });

    // Progress bar
    const progressBar = container.createDiv({ cls: 'pkm-plan-progress-bar' });
    const progressFill = progressBar.createDiv({ cls: 'pkm-plan-progress-fill' });
    progressFill.style.width = `${pct}%`;
    if (pct === 100) progressFill.addClass('complete');

    // Steps
    const stepsDiv = container.createDiv({ cls: 'pkm-plan-steps' });
    planData.steps.forEach((step, idx) => {
        const stepRow = stepsDiv.createDiv({ cls: `pkm-plan-step status-${step.status}` });

        stepRow.createSpan({
            cls: 'pkm-plan-step-icon',
            text: STATUS_ICONS[step.status] || '○'
        });

        const textDiv = stepRow.createDiv({ cls: 'pkm-plan-step-content' });
        textDiv.createSpan({
            cls: 'pkm-plan-step-label',
            text: `${idx + 1}. ${step.label}`
        });
        if (step.description) {
            textDiv.createEl('small', {
                cls: 'pkm-plan-step-desc',
                text: step.description
            });
        }
        if (step.note) {
            textDiv.createEl('small', {
                cls: 'pkm-plan-step-note',
                text: `→ ${step.note}`
            });
        }
    });

    // Approve button (only if not approved yet and not all done)
    if (!planData.approved && pct < 100) {
        const footer = container.createDiv({ cls: 'pkm-plan-footer' });
        const approveBtn = footer.createEl('button', {
            text: '✅ Zatwierdź plan',
            cls: 'mod-cta pkm-plan-approve-btn'
        });
        approveBtn.addEventListener('click', () => {
            options.onApprove?.(planData.id);
        });
    }

    // Completion message
    if (pct === 100) {
        const doneMsg = container.createDiv({ cls: 'pkm-plan-done' });
        doneMsg.textContent = '✅ Plan wykonany!';
    }

    return container;
}
