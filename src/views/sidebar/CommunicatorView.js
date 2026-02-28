/**
 * CommunicatorView - Inline communicator in the sidebar.
 * Adapted from KomunikatorModal.js with vertical layout.
 */
import { Notice } from 'obsidian';
import { UiIcons } from '../../crystal-soul/UiIcons.js';
import { CrystalGenerator } from '../../crystal-soul/CrystalGenerator.js';
import { pickColor } from '../../crystal-soul/ColorPalette.js';

/**
 * Render the communicator view inline in sidebar.
 * @param {HTMLElement} container
 * @param {Object} plugin
 * @param {import('./SidebarNav.js').SidebarNav} nav
 * @param {Object} params - { agentName?: string }
 */
export function renderCommunicatorView(container, plugin, nav, params) {
    container.classList.add('cs-root');
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
    const headerEl = container.createDiv({ cls: 'cs-section-title' });
    headerEl.innerHTML = UiIcons.chat(12) + ' Komunikator';

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

            const agentColor = pickColor(agent.name).hex;
            const chipIconSpan = badge.createSpan({ cls: 'cs-inline-icon' });
            chipIconSpan.innerHTML = CrystalGenerator.generate(agent.name, { size: 16, color: agentColor, glow: false });
            badge.createSpan({ text: ` ${agent.name}` });

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

        // Header with mark-all-read
        const header = inboxEl.createDiv({ cls: 'communicator-inline-header' });
        const inboxTitle = header.createEl('h4');
        inboxTitle.createSpan({ text: 'Inbox: ' });
        if (agent) {
            const inboxAgentColor = pickColor(agent.name).hex;
            const inboxIconSpan = inboxTitle.createSpan({ cls: 'cs-inline-icon' });
            inboxIconSpan.innerHTML = CrystalGenerator.generate(agent.name, { size: 16, color: inboxAgentColor, glow: false });
            inboxTitle.createSpan({ text: ` ${agent.name}` });
        } else {
            inboxTitle.createSpan({ text: selectedAgent });
        }

        const markReadBtn = header.createEl('button', {
            cls: 'communicator-inline-mark-read'
        });
        const markReadIconSpan = markReadBtn.createSpan({ cls: 'cs-inline-icon' });
        markReadIconSpan.innerHTML = UiIcons.check(14);
        markReadBtn.createSpan({ text: ' Wszystkie' });
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
        const userDot = statusDiv.createDiv({
            cls: `communicator-status-dot ${userRead ? 'read' : 'unread'}`,
            attr: { title: userRead ? 'Uzytkownik: Przeczytana' : 'Uzytkownik: Nowa' }
        });
        const userDotIcon = userDot.createSpan({ cls: 'cs-inline-icon cs-status-icon' });
        userDotIcon.innerHTML = UiIcons.user(10);

        const aiDot = statusDiv.createDiv({
            cls: `communicator-status-dot ${aiRead ? 'ai-read' : 'ai-unread'}`,
            attr: { title: aiRead ? 'AI: Przeczytane' : 'AI: Nie czytane' }
        });
        const aiDotIcon = aiDot.createSpan({ cls: 'cs-inline-icon cs-status-icon' });
        aiDotIcon.innerHTML = UiIcons.robot(10);

        header.createSpan({ cls: 'communicator-inline-msg-from', text: msg.from });
        header.createSpan({ cls: 'communicator-inline-msg-subject', text: msg.subject });

        const body = card.createDiv({ cls: 'communicator-inline-msg-body' });
        body.textContent = msg.body;

        if (msg.context) {
            body.createDiv({ cls: 'communicator-inline-msg-context', text: `Kontekst: ${msg.context}` });
        }

        const statusLabels = body.createDiv({ cls: 'communicator-inline-msg-labels' });
        const userLabel = statusLabels.createSpan();
        const userLabelIcon = userLabel.createSpan({ cls: 'cs-inline-icon' });
        userLabelIcon.innerHTML = UiIcons.user(12);
        userLabel.createSpan({ text: userRead ? ' Przeczytana' : ' Nowa' });

        const aiLabel = statusLabels.createSpan();
        const aiLabelIcon = aiLabel.createSpan({ cls: 'cs-inline-icon' });
        aiLabelIcon.innerHTML = UiIcons.robot(12);
        aiLabel.createSpan({ text: aiRead ? ' AI przeczytane' : ' AI nie czytane' });

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

        const composeHeader = form.createDiv({ cls: 'cs-section-head' });
        composeHeader.innerHTML = UiIcons.edit(12) + ' Nowa wiadomość';

        const subjectInput = form.createEl('input', {
            type: 'text',
            placeholder: 'Temat...',
            cls: 'cs-search-input'
        });

        const contentArea = form.createEl('textarea', {
            placeholder: 'Treść wiadomości...',
            cls: 'cs-shard__textarea'
        });
        contentArea.rows = 3;

        const sendBtn = form.createEl('button', { cls: 'cs-create-btn' });
        sendBtn.innerHTML = UiIcons.send(11) + ' Wyślij';

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
