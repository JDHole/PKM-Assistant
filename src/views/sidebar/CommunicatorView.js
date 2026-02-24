/**
 * CommunicatorView - Inline communicator in the sidebar.
 * Adapted from KomunikatorModal.js with vertical layout.
 */
import { Notice } from 'obsidian';

/**
 * Render the communicator view inline in sidebar.
 * @param {HTMLElement} container
 * @param {Object} plugin
 * @param {import('./SidebarNav.js').SidebarNav} nav
 * @param {Object} params - { agentName?: string }
 */
export function renderCommunicatorView(container, plugin, nav, params) {
    const agentManager = plugin.agentManager;
    if (!agentManager) {
        container.createEl('p', { text: 'AgentManager nie jest zainicjalizowany', cls: 'agent-error' });
        return;
    }

    let selectedAgent = params.agentName || null;

    // Auto-select first agent if none specified
    if (!selectedAgent) {
        const agents = agentManager.getAllAgents();
        if (agents.length > 0) selectedAgent = agents[0].name;
    }

    // Header
    container.createEl('h3', { text: '💬 Komunikator', cls: 'sidebar-section-title' });

    // Agent strip (horizontal, scrollable)
    const agentStrip = container.createDiv({ cls: 'communicator-inline-agents' });

    // Inbox container
    const inboxEl = container.createDiv({ cls: 'communicator-inline-inbox' });

    // Render
    renderAgentStrip();
    renderInbox();

    // Subscribe to live events
    const unsub = agentManager.on((event) => {
        if (event === 'communicator:message_sent' || event === 'communicator:message_read') {
            if (renderTimer) clearTimeout(renderTimer);
            renderTimer = setTimeout(() => {
                renderTimer = null;
                renderAgentStrip();
                renderInbox();
            }, 150);
        }
    });
    let renderTimer = null;

    // Cleanup on view change
    nav._currentCleanup = () => {
        unsub();
        if (renderTimer) clearTimeout(renderTimer);
    };

    // ========== RENDER FUNCTIONS ==========

    async function renderAgentStrip() {
        agentStrip.empty();
        const agents = agentManager.getAllAgents();
        const komunikator = agentManager.komunikatorManager;

        for (const agent of agents) {
            const isSelected = agent.name === selectedAgent;
            const badge = agentStrip.createDiv({
                cls: `communicator-agent-chip ${isSelected ? 'selected' : ''}`
            });

            badge.createSpan({ text: `${agent.emoji} ${agent.name}` });

            // Unread count
            if (komunikator) {
                try {
                    const count = await komunikator.getUnreadCount(agent.name);
                    if (count > 0) {
                        badge.createSpan({ cls: 'communicator-chip-badge', text: String(count) });
                    }
                } catch {}
            }

            badge.addEventListener('click', () => {
                selectedAgent = agent.name;
                renderAgentStrip();
                renderInbox();
            });
        }
    }

    async function renderInbox() {
        inboxEl.empty();

        if (!selectedAgent) {
            inboxEl.createDiv({ cls: 'communicator-inline-empty', text: 'Wybierz agenta' });
            return;
        }

        const komunikator = agentManager.komunikatorManager;
        if (!komunikator) return;

        const agent = agentManager.getAgent(selectedAgent);
        const agentLabel = agent ? `${agent.emoji} ${agent.name}` : selectedAgent;

        // Header with mark-all-read
        const header = inboxEl.createDiv({ cls: 'communicator-inline-header' });
        header.createEl('h4', { text: `Inbox: ${agentLabel}` });

        const markReadBtn = header.createEl('button', {
            cls: 'communicator-inline-mark-read',
            text: '✓ Wszystkie'
        });
        markReadBtn.addEventListener('click', async () => {
            await komunikator.markAllAsUserRead(selectedAgent);
            agentManager._emit('communicator:message_read');
        });

        // Messages
        const messagesEl = inboxEl.createDiv({ cls: 'communicator-inline-messages' });
        const messages = await komunikator.readInbox(selectedAgent);

        if (messages.length === 0) {
            messagesEl.createDiv({ cls: 'communicator-inline-empty', text: 'Skrzynka pusta' });
        } else {
            for (const msg of [...messages].reverse()) {
                renderMessageCard(messagesEl, msg, komunikator);
            }
        }

        // Compose form
        renderComposeForm(inboxEl, komunikator);
    }

    function renderMessageCard(container, msg, komunikator) {
        const userRead = (msg.status === 'USER_READ' || msg.status === 'ALL_READ');
        const aiRead = (msg.status === 'AI_READ' || msg.status === 'ALL_READ');
        const isUnread = !userRead;

        const card = container.createDiv({
            cls: `communicator-inline-msg ${isUnread ? 'unread' : ''}`
        });

        const header = card.createDiv({ cls: 'communicator-inline-msg-header' });

        // Status dots
        const statusDiv = header.createDiv({ cls: 'communicator-inline-msg-status' });
        statusDiv.createDiv({
            cls: `communicator-status-dot ${userRead ? 'read' : 'unread'}`,
            attr: { title: userRead ? '👤 Przeczytana' : '👤 Nowa' }
        });
        statusDiv.createDiv({
            cls: `communicator-status-dot ${aiRead ? 'ai-read' : 'ai-unread'}`,
            attr: { title: aiRead ? '🤖 AI przeczytał' : '🤖 Nie czytał' }
        });

        header.createSpan({ cls: 'communicator-inline-msg-from', text: msg.from });
        header.createSpan({ cls: 'communicator-inline-msg-subject', text: msg.subject });

        const body = card.createDiv({ cls: 'communicator-inline-msg-body' });
        body.textContent = msg.body;

        if (msg.context) {
            body.createDiv({ cls: 'communicator-inline-msg-context', text: `Kontekst: ${msg.context}` });
        }

        const statusLabels = body.createDiv({ cls: 'communicator-inline-msg-labels' });
        statusLabels.createSpan({ text: userRead ? '👤 Przeczytana' : '👤 Nowa' });
        statusLabels.createSpan({ text: aiRead ? '🤖 AI przeczytał' : '🤖 Nie czytał' });

        // Toggle expand on header click
        header.addEventListener('click', async () => {
            const isExpanded = body.classList.contains('expanded');
            if (isExpanded) {
                body.classList.remove('expanded');
            } else {
                body.classList.add('expanded');
                if (isUnread && komunikator) {
                    await komunikator.markAsUserRead(selectedAgent, msg.id);
                    agentManager._emit('communicator:message_read');
                }
            }
        });
    }

    function renderComposeForm(container, komunikator) {
        const form = container.createDiv({ cls: 'communicator-inline-compose' });

        form.createEl('h5', { text: '✉️ Nowa wiadomość' });

        const subjectInput = form.createEl('input', {
            type: 'text',
            placeholder: 'Temat...',
            cls: 'communicator-inline-input'
        });

        const contentArea = form.createEl('textarea', {
            placeholder: 'Treść wiadomości...',
            cls: 'communicator-inline-textarea'
        });
        contentArea.rows = 3;

        const sendBtn = form.createEl('button', {
            text: '📨 Wyślij',
            cls: 'communicator-inline-send mod-cta'
        });

        sendBtn.addEventListener('click', async () => {
            const subject = subjectInput.value.trim();
            const content = contentArea.value.trim();

            if (!subject || !content) {
                new Notice('Wypełnij temat i treść');
                return;
            }

            try {
                await komunikator.writeMessage('User', selectedAgent, subject, content);
                agentManager._emit('communicator:message_sent');
                new Notice(`Wysłano do ${selectedAgent}!`);
                subjectInput.value = '';
                contentArea.value = '';
            } catch (e) {
                new Notice('Błąd: ' + e.message);
            }
        });
    }
}
