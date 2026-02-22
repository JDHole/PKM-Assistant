/**
 * KomunikatorModal
 * Full-screen modal for viewing and sending inter-agent messages.
 * Left panel: agent list with unread badges.
 * Right panel: inbox of selected agent + compose form.
 */
import { Modal, Notice } from 'obsidian';
import komunikator_styles from './KomunikatorModal.css' with { type: 'css' };

export class KomunikatorModal extends Modal {
    /**
     * @param {App} app
     * @param {Object} plugin
     * @param {string|null} initialAgent - Which agent to select initially
     */
    constructor(app, plugin, initialAgent = null) {
        super(app);
        this.plugin = plugin;
        this.selectedAgent = initialAgent;
        this._unsubscribe = null;
        this._renderTimer = null;
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('komunikator-modal');

        // Adopt CSS
        if (!document.adoptedStyleSheets.includes(komunikator_styles)) {
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, komunikator_styles];
        }

        // Title
        contentEl.createEl('h3', { text: '💬 Komunikator', cls: 'komunikator-title' });

        // Layout: left panel (agents) + right panel (inbox)
        this.layoutEl = contentEl.createDiv({ cls: 'komunikator-layout' });
        this.agentsPanelEl = this.layoutEl.createDiv({ cls: 'komunikator-agents-panel' });
        this.inboxPanelEl = this.layoutEl.createDiv({ cls: 'komunikator-inbox-panel' });

        // Select first agent if none specified
        const agentManager = this.plugin.agentManager;
        if (!this.selectedAgent && agentManager) {
            const agents = agentManager.getAllAgents();
            if (agents.length > 0) {
                this.selectedAgent = agents[0].name;
            }
        }

        await this.renderAgentList();
        await this.renderInbox();

        // Subscribe to message events for live refresh (debounced)
        if (agentManager) {
            this._unsubscribe = agentManager.on((event) => {
                if (event === 'communicator:message_sent' || event === 'communicator:message_read') {
                    this._debouncedRender();
                }
            });
        }
    }

    onClose() {
        if (this._unsubscribe) {
            this._unsubscribe();
        }
        if (this._renderTimer) {
            clearTimeout(this._renderTimer);
        }
        this.contentEl.empty();
    }

    /**
     * Debounced render to prevent duplicate rapid renders
     */
    _debouncedRender() {
        if (this._renderTimer) clearTimeout(this._renderTimer);
        this._renderTimer = setTimeout(async () => {
            this._renderTimer = null;
            await this.renderAgentList();
            await this.renderInbox();
        }, 150);
    }

    /**
     * Render agent list with unread badges
     */
    async renderAgentList() {
        this.agentsPanelEl.empty();

        const agentManager = this.plugin.agentManager;
        if (!agentManager) return;

        const agents = agentManager.getAllAgents();
        const komunikator = agentManager.komunikatorManager;

        for (const agent of agents) {
            const item = this.agentsPanelEl.createDiv({
                cls: `komunikator-agent-item ${agent.name === this.selectedAgent ? 'selected' : ''}`
            });

            const info = item.createDiv({ cls: 'komunikator-agent-info' });
            info.createSpan({ cls: 'komunikator-agent-emoji', text: agent.emoji });
            info.createSpan({ cls: 'komunikator-agent-name', text: agent.name });

            // Unread badge (user-unread count)
            if (komunikator) {
                const count = await komunikator.getUnreadCount(agent.name);
                if (count > 0) {
                    item.createSpan({ cls: 'komunikator-agent-badge', text: String(count) });
                }
            }

            item.addEventListener('click', () => {
                this.selectedAgent = agent.name;
                this.renderAgentList();
                this.renderInbox();
            });
        }
    }

    /**
     * Render inbox for the selected agent
     */
    async renderInbox() {
        this.inboxPanelEl.empty();

        if (!this.selectedAgent) {
            this.inboxPanelEl.createDiv({ cls: 'komunikator-empty', text: 'Wybierz agenta' });
            return;
        }

        const agentManager = this.plugin.agentManager;
        const komunikator = agentManager?.komunikatorManager;
        if (!komunikator) return;

        const agent = agentManager.getAgent(this.selectedAgent);
        const agentLabel = agent ? `${agent.emoji} ${agent.name}` : this.selectedAgent;

        // Header
        const header = this.inboxPanelEl.createDiv({ cls: 'komunikator-inbox-header' });
        header.createEl('h4', { text: `Inbox: ${agentLabel}` });

        const markReadBtn = header.createEl('button', {
            cls: 'komunikator-mark-read-btn',
            text: '✓ Oznacz przeczytane'
        });
        markReadBtn.addEventListener('click', async () => {
            await komunikator.markAllAsUserRead(this.selectedAgent);
            agentManager._emit('communicator:message_read');
        });

        // Messages
        const messagesEl = this.inboxPanelEl.createDiv({ cls: 'komunikator-messages' });
        const messages = await komunikator.readInbox(this.selectedAgent);

        if (messages.length === 0) {
            messagesEl.createDiv({ cls: 'komunikator-empty', text: 'Skrzynka pusta' });
        } else {
            // Show newest first
            for (const msg of [...messages].reverse()) {
                this.renderMessageCard(messagesEl, msg);
            }
        }

        // Compose form
        this.renderComposeForm(this.inboxPanelEl);
    }

    /**
     * Render a single message card with dual read-status indicators
     */
    renderMessageCard(container, msg) {
        const userRead = (msg.status === 'USER_READ' || msg.status === 'ALL_READ');
        const aiRead = (msg.status === 'AI_READ' || msg.status === 'ALL_READ');
        const isUnread = !userRead; // unread by user

        const card = container.createDiv({
            cls: `komunikator-msg-card ${isUnread ? 'unread' : ''}`
        });

        const header = card.createDiv({ cls: 'komunikator-msg-header' });

        // Status dots: user + AI
        const statusDiv = header.createDiv({ cls: 'komunikator-msg-status' });
        const userDot = statusDiv.createDiv({
            cls: `komunikator-msg-status-dot ${userRead ? 'user-read' : 'user-unread'}`,
            attr: { title: userRead ? '👤 Przeczytana' : '👤 Nowa' }
        });
        const aiDot = statusDiv.createDiv({
            cls: `komunikator-msg-status-dot ${aiRead ? 'ai-read' : 'ai-unread'}`,
            attr: { title: aiRead ? '🤖 AI przeczytał' : '🤖 AI nie czytał' }
        });

        header.createSpan({ cls: 'komunikator-msg-from', text: msg.from });
        header.createSpan({ cls: 'komunikator-msg-subject', text: msg.subject });
        header.createSpan({ cls: 'komunikator-msg-date', text: msg.date });

        const body = card.createDiv({ cls: 'komunikator-msg-body' });
        body.textContent = msg.body;

        if (msg.context) {
            const ctx = body.createDiv({ cls: 'komunikator-msg-context' });
            ctx.textContent = `Kontekst: ${msg.context}`;
        }

        // Status labels at bottom of body
        const statusLabels = body.createDiv({ cls: 'komunikator-msg-status-labels' });
        statusLabels.createSpan({ text: userRead ? '👤 Przeczytana' : '👤 Nowa' });
        statusLabels.createSpan({ text: aiRead ? '🤖 AI przeczytał' : '🤖 AI nie czytał' });

        // Toggle expand
        header.addEventListener('click', async () => {
            const isExpanded = body.classList.contains('expanded');
            if (isExpanded) {
                body.classList.remove('expanded');
            } else {
                body.classList.add('expanded');
                // Mark as user-read on expand
                if (isUnread) {
                    const komunikator = this.plugin.agentManager?.komunikatorManager;
                    if (komunikator) {
                        await komunikator.markAsUserRead(this.selectedAgent, msg.id);
                        this.plugin.agentManager?._emit('communicator:message_read');
                    }
                }
            }
        });
    }

    /**
     * Render compose form at the bottom
     */
    renderComposeForm(container) {
        const form = container.createDiv({ cls: 'komunikator-compose' });

        // Subject row
        const subjectRow = form.createDiv({ cls: 'komunikator-compose-row' });
        subjectRow.createEl('label', { text: 'Temat:' });
        const subjectInput = subjectRow.createEl('input', {
            type: 'text',
            placeholder: 'Temat wiadomości...'
        });

        // Content row
        const contentRow = form.createDiv({ cls: 'komunikator-compose-row' });
        contentRow.createEl('label', { text: 'Treść:' });
        const contentArea = contentRow.createEl('textarea', {
            placeholder: 'Napisz wiadomość...'
        });
        contentArea.rows = 2;

        // Send button
        const sendBtn = form.createEl('button', {
            text: '📨 Wyślij',
            cls: 'komunikator-send-btn mod-cta'
        });

        sendBtn.addEventListener('click', async () => {
            const subject = subjectInput.value.trim();
            const content = contentArea.value.trim();

            if (!subject || !content) {
                new Notice('Wypełnij temat i treść wiadomości');
                return;
            }

            const komunikator = this.plugin.agentManager?.komunikatorManager;
            if (!komunikator) return;

            try {
                await komunikator.writeMessage('User', this.selectedAgent, subject, content);
                this.plugin.agentManager?._emit('communicator:message_sent');
                new Notice(`Wiadomość wysłana do ${this.selectedAgent}!`);
                subjectInput.value = '';
                contentArea.value = '';
                await this.renderInbox();
                await this.renderAgentList();
            } catch (e) {
                new Notice('Błąd wysyłania: ' + e.message);
            }
        });
    }
}

/**
 * Open the Komunikator modal
 * @param {Object} plugin
 * @param {string|null} initialAgent
 */
export function openKomunikatorModal(plugin, initialAgent = null) {
    new KomunikatorModal(plugin.app, plugin, initialAgent).open();
}
