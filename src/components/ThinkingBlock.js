
/**
 * Creates a collapsible thinking/reasoning block for the chat UI.
 * Shows AI's chain of thought (DeepSeek Reasoner, Anthropic extended thinking, OpenAI o-series).
 * @param {string} thinkingText - The reasoning content
 * @param {boolean} isStreaming - Whether still accumulating (shows animated indicator)
 * @returns {HTMLElement}
 */
export function createThinkingBlock(thinkingText, isStreaming = false) {
    const container = document.createElement('div');
    container.addClass('pkm-thinking-block');
    if (isStreaming) container.addClass('streaming');

    // Header (clickable to toggle)
    const header = container.createDiv({ cls: 'pkm-thinking-header' });
    header.createSpan({ cls: 'pkm-thinking-icon', text: '💭' });
    header.createSpan({ cls: 'pkm-thinking-label', text: 'Myślenie...' });

    const toggle = document.createElement('button');
    toggle.addClass('pkm-thinking-toggle');
    toggle.textContent = '▼';
    header.appendChild(toggle);

    // Body (collapsed by default)
    const body = container.createDiv({ cls: 'pkm-thinking-body collapsed' });
    const content = body.createDiv({ cls: 'pkm-thinking-content' });
    content.textContent = thinkingText || '';

    // Toggle logic
    header.addEventListener('click', () => {
        const isCollapsed = body.classList.contains('collapsed');
        if (isCollapsed) {
            body.classList.remove('collapsed');
            toggle.classList.add('expanded');
            header.querySelector('.pkm-thinking-label').textContent = 'Myślenie';
        } else {
            body.classList.add('collapsed');
            toggle.classList.remove('expanded');
            header.querySelector('.pkm-thinking-label').textContent = 'Myślenie...';
        }
    });

    return container;
}

/**
 * Updates existing thinking block text content.
 * @param {HTMLElement} block - The thinking block element
 * @param {string} text - New reasoning text
 */
export function updateThinkingBlock(block, text) {
    const content = block?.querySelector('.pkm-thinking-content');
    if (content) {
        content.textContent = text;
        // Auto-scroll to bottom if body is expanded
        const body = block.querySelector('.pkm-thinking-body');
        if (body && !body.classList.contains('collapsed')) {
            content.scrollTop = content.scrollHeight;
        }
    }
}
