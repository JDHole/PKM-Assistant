
import { UiIcons } from '../crystal-soul/UiIcons.js';

/**
 * Creates a Crystal Soul .cs-action-row for AI thinking/reasoning.
 * Expandable: header (brain icon + "Myślenie" + time + status + arrow) → body (reasoning text).
 * @param {string} thinkingText - The reasoning content
 * @param {boolean} isStreaming - Whether still accumulating
 * @param {number|null} startTime - Timestamp when thinking started
 * @returns {HTMLElement}
 */
export function createThinkingBlock(thinkingText, isStreaming = false, startTime = null) {
    const row = document.createElement('div');
    row.className = 'cs-action-row';
    if (isStreaming) row.classList.add('streaming');

    // ── HEAD ──
    const head = row.createDiv({ cls: 'cs-action-row__head' });

    // Icon
    const iconEl = head.createDiv({ cls: 'cs-action-row__icon' });
    iconEl.innerHTML = UiIcons.brain(14);

    // Label
    head.createSpan({ cls: 'cs-action-row__label', text: isStreaming ? 'Myślenie...' : 'Myślenie' });

    // Time
    if (startTime) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        head.createSpan({ cls: 'cs-action-row__time', text: `${elapsed}s` });
    }

    // Status crystal
    const statusCls = isStreaming ? 'cs-action-row__status--pending' : 'cs-action-row__status--done';
    head.createDiv({ cls: `cs-action-row__status ${statusCls}` });

    // Arrow
    const arrow = head.createDiv({ cls: 'cs-action-row__arrow' });
    arrow.innerHTML = UiIcons.chevronDown(12);

    // ── BODY ──
    const body = row.createDiv({ cls: 'cs-action-row__body' });
    const content = body.createDiv({ cls: 'cs-action-row__content' });
    content.textContent = thinkingText || '';

    // Toggle
    head.addEventListener('click', () => {
        row.classList.toggle('open');
    });

    return row;
}

/**
 * Updates existing thinking block text content.
 * @param {HTMLElement} block - The .cs-action-row element
 * @param {string} text - New reasoning text
 * @param {number|null} startTime - If provided, update elapsed time
 */
export function updateThinkingBlock(block, text, startTime = null) {
    const content = block?.querySelector('.cs-action-row__content');
    if (content) {
        content.textContent = text;
        // Auto-scroll if expanded
        if (block.classList.contains('open')) {
            content.scrollTop = content.scrollHeight;
        }
    }
    if (startTime) {
        const timeEl = block?.querySelector('.cs-action-row__time');
        if (timeEl) {
            timeEl.textContent = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
        }
    }
}
