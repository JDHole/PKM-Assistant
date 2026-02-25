import { SmartItemView } from "obsidian-smart-env/views/smart_item_view.js";
import { MarkdownRenderer, Notice } from 'obsidian';
import { RollingWindow } from '../memory/RollingWindow.js';
import { SessionManager } from '../memory/SessionManager.js';
import { RAGRetriever } from '../memory/RAGRetriever.js';
import { EmbeddingHelper } from '../memory/EmbeddingHelper.js';
import { MemoryExtractor } from '../memory/MemoryExtractor.js';
import { Summarizer } from '../memory/Summarizer.js';
import chat_view_styles from './chat_view.css' with { type: 'css' };
import { createToolCallDisplay } from '../components/ToolCallDisplay.js';
import { createThinkingBlock, updateThinkingBlock } from '../components/ThinkingBlock.js';
import { createSubAgentBlock, createPendingSubAgentBlock } from '../components/SubAgentBlock.js';
import { createChatTodoList } from '../components/ChatTodoList.js';
import { createPlanArtifact } from '../components/PlanArtifact.js';
import { TodoEditModal } from './TodoEditModal.js';
import { PlanEditModal } from './PlanEditModal.js';
import { log } from '../utils/Logger.js';
import { openPermissionsModal } from './PermissionsModal.js';
import { createModelForRole, clearModelCache } from '../utils/modelResolver.js';
import { TokenTracker } from '../utils/TokenTracker.js';
import { countTokens } from '../utils/tokenCounter.js';
import { filterToolsByMode, DEFAULT_MODE, getModeInfo, getAllModes } from '../core/WorkMode.js';
// buildModePromptSection no longer needed here — workMode passed via context to PromptBuilder

/**
 * ChatView - Main chat interface for Obsek
 * Provides a simple chat UI with streaming support
 */
export class ChatView extends SmartItemView {
    static get view_type() { return 'pkm-assistant-chat'; }
    static get display_text() { return 'PKM Assistant'; }
    static get icon_name() { return 'obsek-icon'; }

    constructor(leaf, plugin) {
        super(leaf, plugin);
        // Initialize RollingWindow (summarizer attached later when model available)
        this.rollingWindow = this._createRollingWindow();
        this.is_generating = false;
        this.current_message_container = null;
        this.sessionManager = null;
        this.ragRetriever = null;
        this.embeddingHelper = null;

        // Input history state
        this.inputHistory = [];
        this.historyIndex = -1;

        // Session timeout tracking (detect return after long inactivity)
        this.lastMessageTimestamp = null;

        // Work mode (Tryby Pracy) — persists within session, resets on new session
        this.currentMode = this._getDefaultMode();
        if (this.plugin) this.plugin.currentWorkMode = this.currentMode;

        // Token usage tracking (per-session, per-role)
        this.tokenTracker = new TokenTracker();
    }

    async initSessionManager() {
        this.sessionManager = new SessionManager(this.app.vault, this.env?.settings?.obsek || {});
        await this.sessionManager.initialize();

        // Auto-save: route through handleSaveSession() which uses AgentMemory first
        const autoSaveInterval = this.env?.settings?.obsek?.autoSaveInterval;
        if (autoSaveInterval && autoSaveInterval > 0) {
            this._autoSaveTimer = setInterval(() => {
                if (this.rollingWindow?.messages?.length > 0) {
                    this.handleSaveSession();
                }
            }, autoSaveInterval * 60 * 1000);
        }

        await this.updateSessionDropdown();
    }

    updatePermissionsBadge() {
        const agent = this.plugin.agentManager?.getActiveAgent();
        if (!agent || !this.permissionsBtn) return;

        let level = '🔒';
        if (agent.permissions.yolo_mode) {
            level = '🚀';
        } else if (agent.permissions.edit_notes || agent.permissions.mcp) {
            level = '⚖️';
        }

        this.permissionsBtn.innerHTML = level;
    }

    async render_view(params = {}, container = this.container) {
        // Adopt chat styles (CSSStyleSheet from import)
        if (chat_view_styles && !document.adoptedStyleSheets.includes(chat_view_styles)) {
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, chat_view_styles];
        }

        container.empty();
        container.addClass('pkm-chat-view');

        // Header
        const header = container.createDiv({ cls: 'pkm-chat-header' });

        // Agent selector
        const agentControls = header.createDiv({ cls: 'agent-controls' });
        this.agentDropdown = agentControls.createEl('select', { cls: 'agent-dropdown' });
        this.updateAgentDropdown();
        this.agentDropdown.addEventListener('change', (e) => this.handleAgentChange(e.target.value));

        // Permissions button
        const permissionsBtn = header.createEl('button', {
            cls: 'chat-permissions-btn',
            attr: { 'aria-label': 'Uprawnienia agenta' }
        });
        permissionsBtn.innerHTML = '🔐';
        permissionsBtn.onclick = () => {
            const activeAgent = this.plugin.agentManager?.getActiveAgent();
            if (activeAgent) {
                openPermissionsModal(this.app, activeAgent, (newPermissions) => {
                    this.updatePermissionsBadge();
                });
            }
        };
        this.permissionsBtn = permissionsBtn;

        // Session controls (right side)
        const sessionControls = header.createDiv({ cls: 'session-controls' });

        this.sessionDropdown = sessionControls.createEl('select', { cls: 'session-dropdown' });
        this.sessionDropdown.createEl('option', { value: '', text: '-- Sesja --' });
        this.sessionDropdown.addEventListener('change', (e) => this.handleLoadSession(e.target.value));

        const newBtn = sessionControls.createEl('button', {
            cls: 'session-new',
            attr: { 'aria-label': 'Nowa rozmowa' }
        });
        newBtn.textContent = '⟳';
        newBtn.addEventListener('click', () => this.handleNewSession());

        const saveBtn = sessionControls.createEl('button', {
            cls: 'session-save',
            attr: { 'aria-label': 'Zapisz sesje' }
        });
        saveBtn.textContent = '💾';
        saveBtn.addEventListener('click', () => this.handleSaveSession());

        this.autosaveStatus = sessionControls.createDiv({ cls: 'autosave-status', text: '' });

        // Token counter (clickable — opens overlay panel)
        const tokenWrapper = header.createDiv({ cls: 'token-wrapper' });
        const tokenCounter = tokenWrapper.createDiv({
            cls: 'token-counter',
            text: '0 / 100 000'
        });
        tokenCounter.addEventListener('click', (e) => {
            e.stopPropagation();
            const panel = tokenWrapper.querySelector('.token-panel');
            if (panel) panel.classList.toggle('hidden');
        });
        this.updateTokenCounter();

        // Token usage panel (overlay, hidden by default)
        const tokenPanel = tokenWrapper.createDiv({ cls: 'token-panel hidden' });
        tokenPanel.createDiv({ cls: 'token-panel-row token-panel-main' });
        tokenPanel.createDiv({ cls: 'token-panel-row token-panel-minion' });
        tokenPanel.createDiv({ cls: 'token-panel-row token-panel-master' });

        // Close panel on outside click
        document.addEventListener('click', (e) => {
            if (!tokenWrapper.contains(e.target)) {
                tokenPanel.classList.add('hidden');
            }
        });

        // Create main layout: body (row) → main (column) + toolbar
        const chatBody = container.createDiv({ cls: 'pkm-chat-body' });
        const chatMain = chatBody.createDiv({ cls: 'pkm-chat-main' });

        // Messages area
        this.messages_container = chatMain.createDiv({ cls: 'pkm-chat-messages' });
        this.render_messages();

        // Bottom panel (unified: skills + input)
        const bottomPanel = chatMain.createDiv({ cls: 'pkm-chat-bottom-panel' });

        // Skill buttons bar
        this.skillButtonsBar = bottomPanel.createDiv({ cls: 'pkm-skill-buttons' });
        this.renderSkillButtons();

        // Input area
        const input_container = bottomPanel.createDiv({ cls: 'pkm-chat-input-container' });
        const input_wrapper = input_container.createDiv({ cls: 'pkm-chat-input-wrapper' });

        this.input_area = input_wrapper.createEl('textarea', {
            cls: 'pkm-chat-input',
            attr: {
                placeholder: 'Napisz wiadomosc...',
                rows: '1'
            }
        });

        const button_container = input_wrapper.createDiv({ cls: 'pkm-chat-buttons' });

        this.send_button = button_container.createEl('button', {
            cls: 'pkm-chat-send-button'
        });
        this.send_button.textContent = '➤';

        this.stop_button = button_container.createEl('button', {
            cls: 'pkm-chat-stop-button hidden'
        });
        this.stop_button.textContent = '■';

        // Right toolbar
        this.toolbar = chatBody.createDiv({ cls: 'pkm-chat-toolbar' });
        this._renderToolbar();

        // Event listeners
        this.input_area.addEventListener('input', this.handleInputResize.bind(this));
        this.input_area.addEventListener('keydown', this.handle_input_keydown.bind(this));
        this.send_button.addEventListener('click', this.send_message.bind(this));
        this.stop_button.addEventListener('click', this.stop_generation.bind(this));

        // Global listeners
        this.handleGlobalKeydownBound = this.handleGlobalKeydown.bind(this);
        document.addEventListener('keydown', this.handleGlobalKeydownBound);

        // Best-effort save on browser/Obsidian unload (additional safety net)
        this.handleBeforeUnloadBound = () => { this.handleSaveSession(); };
        window.addEventListener('beforeunload', this.handleBeforeUnloadBound);

        // Listen for work mode changes (from SwitchModeTool auto-change=on)
        this.plugin?.events?.on('work-mode-change', (data) => {
            if (data?.mode) this._applyModeChange(data.mode);
        });

        // Add welcome message if no messages
        if (this.rollingWindow.messages.length === 0) {
            this.add_welcome_message();
        }
        this.updatePermissionsBadge();
    }

    updateTokenCounter() {
        const el = this.container?.querySelector('.token-counter');
        if (!el) return;

        // Primary: show TokenTracker total (sum of ALL in+out across all roles)
        const tracked = this.tokenTracker.getSessionTotal();
        if (tracked.total > 0) {
            el.textContent = `↑${tracked.input.toLocaleString('pl-PL')} ↓${tracked.output.toLocaleString('pl-PL')}`;
        } else {
            // Fallback: rollingWindow context estimate (API doesn't return usage)
            const current = this.rollingWindow.getCurrentTokenCount();
            const max = this.rollingWindow.maxTokens;
            el.textContent = `~${current.toLocaleString('pl-PL')} / ${max.toLocaleString('pl-PL')}`;
        }

        // Visual warning if close to context limit
        const current = this.rollingWindow.getCurrentTokenCount();
        const max = this.rollingWindow.maxTokens;
        if (current > max * 0.9) {
            el.addClass('token-warning');
        } else {
            el.removeClass('token-warning');
        }
    }

    /** Update the expandable token usage panel (overlay) */
    _updateTokenPanel() {
        try {
            const mainRow = this.container?.querySelector('.token-panel-main');
            const minionRow = this.container?.querySelector('.token-panel-minion');
            const masterRow = this.container?.querySelector('.token-panel-master');
            if (!mainRow) return;

            const s = this.tokenTracker.getSessionTotal();
            const fmt = (n) => n.toLocaleString('pl-PL');

            // Main
            const m = s.byRole?.main || { input: 0, output: 0 };
            mainRow.textContent = (m.input + m.output > 0)
                ? `Main: ↑${fmt(m.input)} ↓${fmt(m.output)}`
                : 'Main: brak danych z API';

            // Minion
            if (minionRow) {
                const mn = s.byRole?.minion || { input: 0, output: 0 };
                minionRow.textContent = (mn.input + mn.output > 0)
                    ? `Minion: ↑${fmt(mn.input)} ↓${fmt(mn.output)}`
                    : 'Minion: nie użyty';
            }

            // Master
            if (masterRow) {
                const ms = s.byRole?.master || { input: 0, output: 0 };
                masterRow.textContent = (ms.input + ms.output > 0)
                    ? `Master: ↑${fmt(ms.input)} ↓${fmt(ms.output)}`
                    : 'Master: nie użyty';
            }

            // Also update the main counter
            this.updateTokenCounter();
        } catch (e) {
            console.warn('[Obsek] _updateTokenPanel error:', e);
        }
    }

    add_welcome_message() {
        const agentManager = this.plugin?.agentManager;
        const activeAgent = agentManager?.getActiveAgent();
        const agentName = activeAgent?.name || 'PKM Assistant';
        const agentEmoji = activeAgent?.emoji || '🤖';

        const welcome = this.messages_container.createDiv({ cls: 'pkm-welcome-container' });
        welcome.createDiv({ cls: 'pkm-welcome-avatar', text: agentEmoji });
        welcome.createDiv({ cls: 'pkm-welcome-name', text: agentName });
        welcome.createDiv({
            cls: 'pkm-welcome-text',
            text: `W czym moge Ci dzisiaj pomoc?`
        });
    }

    renderSkillButtons() {
        if (!this.skillButtonsBar) return;
        this.skillButtonsBar.empty();

        const agentManager = this.plugin?.agentManager;
        if (!agentManager) return;

        const skills = agentManager.getActiveAgentSkills();
        if (!skills || skills.length === 0) return;

        for (const skill of skills) {
            const btn = this.skillButtonsBar.createEl('button', {
                cls: 'pkm-skill-btn',
                attr: { title: skill.description }
            });
            btn.createSpan({ cls: 'pkm-skill-btn-icon', text: '🎯' });
            btn.createSpan({ text: skill.name });
            btn.addEventListener('click', () => {
                if (this.is_generating) return;
                this.input_area.value = `Użyj skilla: ${skill.name}`;
                this.send_message();
            });
        }
    }

    showTypingIndicator(statusText = 'Myślę...') {
        if (this.typingIndicator) {
            // Already showing - just update text
            this.updateTypingStatus(statusText);
            return;
        }

        this.typingIndicator = this.messages_container.createDiv({ cls: 'pkm-chat-message assistant' });

        const emoji = this.plugin?.agentManager?.getActiveAgent()?.emoji || '🤖';

        // Message row
        const row = this.typingIndicator.createDiv({ cls: 'pkm-chat-message-row' });
        row.createDiv({ cls: 'pkm-chat-avatar', text: emoji });

        const bubble = row.createDiv({ cls: 'pkm-chat-bubble' });
        const typing = bubble.createDiv({ cls: 'pkm-chat-typing' });
        typing.createEl('span');
        typing.createEl('span');
        typing.createEl('span');
        this.typingStatusEl = typing.createEl('span', { cls: 'pkm-chat-typing-text', text: statusText });

        this.scrollToBottom();
    }

    updateTypingStatus(statusText) {
        if (this.typingStatusEl) {
            this.typingStatusEl.textContent = statusText;
        }
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        if (this.typingIndicator) {
            this.typingIndicator.remove();
            this.typingIndicator = null;
            this.typingStatusEl = null;
        }
    }

    scrollToBottom(smooth = true) {
        const container = this.messages_container;
        const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;

        if (isAtBottom || !smooth) {
            const lastChild = container.lastElementChild;
            if (lastChild) {
                lastChild.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
            }
        }
    }

    /**
     * Auto-save artifact to disk via ArtifactManager (fire-and-forget).
     */
    _autoSaveArtifact(type, id, data) {
        if (!data || !this.plugin.artifactManager) return;
        const createdBy = data.createdBy
            || this.plugin?.agentManager?.getActiveAgent()?.name
            || 'unknown';
        data.createdBy = createdBy;
        this.plugin.artifactManager.save({
            type, id, title: data.title || '', data, createdBy
        }).catch(e => console.warn('[ChatView] Artifact auto-save failed:', e));
    }

    /**
     * Build reusable plan callbacks object for createPlanArtifact.
     */
    _buildPlanCallbacks() {
        return {
            onApprove: (planId) => {
                const plan = this.plugin._planStore?.get(planId);
                if (plan) {
                    plan.approved = true;
                    this._autoSaveArtifact('plan', planId, plan);
                    this.input_area.value = `ZATWIERDŹ PLAN: ${planId} — Wykonaj kroki po kolei.`;
                    this.send_message();
                }
            },
            onEditStep: (planId, idx, changes) => {
                const plan = this.plugin._planStore?.get(planId);
                if (!plan?.steps[idx]) return;
                if (changes.label !== undefined) plan.steps[idx].label = changes.label;
                if (changes.description !== undefined) plan.steps[idx].description = changes.description;
                this._autoSaveArtifact('plan', planId, plan);
            },
            onAddStep: (planId, label) => {
                this._autoSaveArtifact('plan', planId, this.plugin._planStore?.get(planId));
            },
            onDeleteStep: (planId, idx) => {
                this._autoSaveArtifact('plan', planId, this.plugin._planStore?.get(planId));
            },
            onStatusChange: (planId, idx, newStatus) => {
                this._autoSaveArtifact('plan', planId, this.plugin._planStore?.get(planId));
            },
            onComment: (planId, idx, text) => {
                const plan = this.plugin._planStore?.get(planId);
                const stepLabel = plan?.steps[idx]?.label || `krok ${idx + 1}`;
                this.input_area.value = `[Komentarz do "${stepLabel}"]: ${text}`;
                this.input_area.focus();
            },
            onSubtaskToggle: (planId, stepIdx, subIdx, done) => {
                const plan = this.plugin._planStore?.get(planId);
                if (plan?.steps[stepIdx]?.subtasks?.[subIdx]) {
                    plan.steps[stepIdx].subtasks[subIdx].done = done;
                    this._autoSaveArtifact('plan', planId, plan);
                }
            },
            onAddSubtask: (planId, stepIdx, text) => {
                this._autoSaveArtifact('plan', planId, this.plugin._planStore?.get(planId));
            },
            onDeleteSubtask: (planId, stepIdx, subIdx) => {
                this._autoSaveArtifact('plan', planId, this.plugin._planStore?.get(planId));
            },
            onOpenModal: (planId) => {
                new PlanEditModal(this.app, this.plugin, planId, (updatedPlan) => {
                    // Re-render widget after modal save
                    const container = this.messages_container?.querySelector(`[data-plan-id="${planId}"]`);
                    if (container && updatedPlan) {
                        const newWidget = createPlanArtifact(updatedPlan, this._buildPlanCallbacks());
                        container.replaceWith(newWidget);
                    }
                }).open();
            }
        };
    }

    /**
     * Build lightweight artifact context for system prompt.
     * Returns null if no artifacts exist.
     */
    /**
     * Oczko: build active note context for system prompt injection.
     * Returns formatted string with title, frontmatter, and first ~500 tokens of content.
     * Returns null if no markdown file is open or feature is disabled.
     */
    async _buildActiveNoteContext() {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== 'md') return null;

        const lines = [`## Otwarta notatka: ${file.basename}`, `Ścieżka: ${file.path}`];

        // Frontmatter from Obsidian's metadata cache (fast, no parsing)
        try {
            const cache = this.app.metadataCache.getFileCache(file);
            const fm = cache?.frontmatter;
            if (fm && Object.keys(fm).length > 0) {
                const entries = Object.entries(fm)
                    .filter(([k]) => k !== 'position')
                    .map(([k, v]) => `  ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                    .join('\n');
                if (entries) lines.push(`Frontmatter:\n${entries}`);
            }
        } catch (e) {
            log.warn('Chat', 'Oczko: frontmatter read failed:', e);
        }

        // Content from Obsidian cache (fast)
        try {
            const raw = await this.app.vault.cachedRead(file);
            let content = raw.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
            if (content.length > 2000) {
                content = content.slice(0, 2000) + '\n[...obcięto]';
            }
            if (content) lines.push(`Treść (początek):\n${content}`);
        } catch (e) {
            log.warn('Chat', 'Oczko: content read failed:', e);
        }

        return lines.join('\n');
    }

    _buildArtifactContext() {
        const todoStore = this.plugin._chatTodoStore;
        const planStore = this.plugin._planStore;
        if ((!todoStore || todoStore.size === 0) && (!planStore || planStore.size === 0)) return null;

        const lines = ['--- Istniejące artefakty (użyj tych ID zamiast tworzyć nowe) ---'];

        if (todoStore?.size > 0) {
            for (const [id, todo] of todoStore) {
                const done = todo.items?.filter(i => i.done).length || 0;
                const total = todo.items?.length || 0;
                lines.push(`📋 TODO "${todo.title}" (id: ${id}) — ${done}/${total} gotowe`);
            }
        }
        if (planStore?.size > 0) {
            for (const [id, plan] of planStore) {
                const done = plan.steps?.filter(s => s.status === 'done').length || 0;
                const total = plan.steps?.length || 0;
                const status = plan.approved ? 'zatwierdzony' : 'niezatwierdzony';
                lines.push(`📝 PLAN "${plan.title}" (id: ${id}) — ${done}/${total} kroków, ${status}`);
            }
        }

        lines.push('Gdy user odnosi się do istniejącego artefaktu, użyj powyższego ID. Nie twórz nowego jeśli pasujący już istnieje.');
        return lines.join('\n');
    }

    /**
     * Build reusable todo callbacks object for createChatTodoList.
     */
    _buildTodoCallbacks() {
        return {
            onToggle: (id, idx, done) => {
                const todo = this.plugin._chatTodoStore?.get(id);
                if (todo?.items[idx]) {
                    todo.items[idx].done = done;
                    this._autoSaveArtifact('todo', id, todo);
                }
            },
            onEditItem: (id, idx, newText) => {
                const todo = this.plugin._chatTodoStore?.get(id);
                if (todo?.items[idx]) {
                    todo.items[idx].text = newText;
                    this._autoSaveArtifact('todo', id, todo);
                }
            },
            onAddItem: (id) => {
                this._autoSaveArtifact('todo', id, this.plugin._chatTodoStore?.get(id));
            },
            onDeleteItem: (id) => {
                this._autoSaveArtifact('todo', id, this.plugin._chatTodoStore?.get(id));
            },
            onOpenModal: (id) => {
                new TodoEditModal(this.app, this.plugin, id, (updatedTodo) => {
                    const container = this.messages_container?.querySelector(`[data-todo-id="${id}"]`);
                    if (container && updatedTodo) {
                        const newWidget = createChatTodoList(updatedTodo, this._buildTodoCallbacks());
                        container.replaceWith(newWidget);
                    }
                }).open();
            }
        };
    }

    /**
     * Render the right toolbar with icon buttons.
     * Layout: TOP (general) / BOTTOM (chat-specific actions).
     */
    _renderToolbar() {
        if (!this.toolbar) return;
        this.toolbar.empty();

        // ── TOP: general actions ──
        const topGroup = this.toolbar.createDiv({ cls: 'pkm-toolbar-top' });

        // Artifact button
        const artifactBtn = topGroup.createDiv({ cls: 'pkm-toolbar-btn', attr: { 'aria-label': 'Artefakty sesji' } });
        artifactBtn.textContent = '📦';
        artifactBtn.addEventListener('click', () => this._toggleArtifactPanel());

        // Skills toggle
        const skillsBtn = topGroup.createDiv({ cls: 'pkm-toolbar-btn', attr: { 'aria-label': 'Skille' } });
        skillsBtn.textContent = '⚡';
        skillsBtn.addEventListener('click', () => {
            if (this.skillButtonsBar) {
                const isHidden = this.skillButtonsBar.style.display === 'none';
                this.skillButtonsBar.style.display = isHidden ? '' : 'none';
                skillsBtn.classList.toggle('active', isHidden);
            }
        });

        // Oczko (active note awareness) toggle
        const oczkoBtn = topGroup.createDiv({ cls: 'pkm-toolbar-btn', attr: { 'aria-label': 'Oczko — kontekst otwartej notatki' } });
        oczkoBtn.textContent = '👁️';
        if (this.env?.settings?.obsek?.enableOczko !== false) {
            oczkoBtn.classList.add('active');
        }
        oczkoBtn.addEventListener('click', () => {
            const obsek = this.env.settings.obsek || (this.env.settings.obsek = {});
            const newValue = obsek.enableOczko === false;
            obsek.enableOczko = newValue;
            oczkoBtn.classList.toggle('active', newValue);
            this.plugin.saveSettings();
            log.debug('Chat', `Oczko toggled: ${newValue}`);
        });

        // ── BOTTOM: chat-specific actions ──
        const bottomGroup = this.toolbar.createDiv({ cls: 'pkm-toolbar-bottom' });

        // Mode selector button (shows active mode icon)
        const modeInfo = getModeInfo(this.currentMode);
        this._modeBtn = bottomGroup.createDiv({
            cls: 'pkm-toolbar-btn pkm-mode-btn',
            attr: { 'aria-label': `Tryb: ${modeInfo?.label || 'Praca'}` }
        });
        this._modeBtn.textContent = modeInfo?.icon || '🔨';
        this._modeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._toggleModePopover();
        });
    }

    /**
     * Toggle the mode selector popover.
     */
    _toggleModePopover() {
        // Close if already open
        if (this._modePopover) {
            this._modePopover.remove();
            this._modePopover = null;
            return;
        }

        const modes = getAllModes();

        const popover = document.createElement('div');
        popover.className = 'pkm-mode-popover';

        for (const mode of modes) {
            const item = document.createElement('div');
            item.className = 'pkm-mode-popover-item';
            if (mode.id === this.currentMode) {
                item.classList.add('pkm-mode-active');
            }
            item.innerHTML = `<span class="pkm-mode-icon">${mode.icon}</span><span class="pkm-mode-label">${mode.label}</span>`;
            item.addEventListener('click', () => {
                this._applyModeChange(mode.id);
                popover.remove();
                this._modePopover = null;
            });
            popover.appendChild(item);
        }

        // Auto-change indicator
        const autoChange = this.env?.settings?.obsek?.autoChangeMode || 'ask';
        const autoLabels = { off: 'Auto: wył.', ask: 'Auto: pytaj', on: 'Auto: tak' };
        const autoDiv = document.createElement('div');
        autoDiv.className = 'pkm-mode-popover-auto';
        autoDiv.textContent = autoLabels[autoChange] || autoLabels.ask;
        popover.appendChild(autoDiv);

        // Position popover above the mode button
        this.toolbar.appendChild(popover);
        this._modePopover = popover;

        // Close on outside click
        const closeHandler = (e) => {
            if (!popover.contains(e.target) && !this._modeBtn.contains(e.target)) {
                popover.remove();
                this._modePopover = null;
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 0);
    }

    /**
     * Toggle the artifact panel overlay.
     * Shows ALL artifacts (global, not session-bound).
     */
    _toggleArtifactPanel() {
        if (this._artifactPanel) {
            this._artifactPanel.remove();
            this._artifactPanel = null;
            return;
        }

        const panel = document.createElement('div');
        panel.className = 'pkm-artifact-panel';

        // Header
        const header = panel.createDiv({ cls: 'pkm-artifact-panel-header' });
        header.createSpan({ text: '📦 Artefakty' });
        const closeBtn = header.createEl('button', { cls: 'pkm-artifact-panel-close', text: '×' });
        closeBtn.addEventListener('click', () => this._toggleArtifactPanel());

        // List
        const list = panel.createDiv({ cls: 'pkm-artifact-panel-list' });
        const todoStore = this.plugin._chatTodoStore;
        const planStore = this.plugin._planStore;
        let hasItems = false;

        // --- TODO section ---
        if (todoStore?.size > 0) {
            list.createDiv({ cls: 'pkm-artifact-panel-section', text: '📋 Listy TODO' });
            for (const [id, todo] of todoStore) {
                hasItems = true;
                const item = list.createDiv({ cls: 'pkm-artifact-panel-item' });
                const info = item.createDiv({ cls: 'pkm-artifact-panel-item-info' });

                const done = todo.items?.filter(i => i.done).length || 0;
                const total = todo.items?.length || 0;
                info.createSpan({ cls: 'pkm-artifact-panel-item-title', text: todo.title || 'Todo' });
                info.createSpan({ cls: 'pkm-artifact-panel-item-progress', text: `${done}/${total}` });
                if (todo.createdBy) {
                    info.createSpan({ cls: 'pkm-artifact-panel-item-badge', text: todo.createdBy });
                }

                // Click → open modal
                info.addEventListener('click', () => {
                    new TodoEditModal(this.app, this.plugin, id, (updated) => {
                        // Re-render widget in chat if exists
                        const widget = this.messages_container?.querySelector(`[data-todo-id="${id}"]`);
                        if (widget && updated) {
                            widget.replaceWith(createChatTodoList(updated, this._buildTodoCallbacks()));
                        }
                        // Refresh panel
                        this._toggleArtifactPanel();
                        this._toggleArtifactPanel();
                    }).open();
                });

                // Action buttons
                const actions = item.createDiv({ cls: 'pkm-artifact-panel-item-actions' });

                // Copy to vault as markdown
                const copyBtn = actions.createEl('button', { cls: 'pkm-artifact-panel-action', text: '📄', attr: { 'aria-label': 'Kopiuj do vaulta' } });
                copyBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const md = `# ${todo.title}\n\n` + (todo.items || [])
                        .map(i => `- [${i.done ? 'x' : ' '}] ${i.text}`).join('\n') + '\n';
                    const safeName = (todo.title || 'Todo').replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ _-]/g, '').trim();
                    const path = `${safeName}.md`;
                    await this.app.vault.adapter.write(path, md);
                    new Notice(`Zapisano: ${path}`);
                });

                // Delete
                const delBtn = actions.createEl('button', { cls: 'pkm-artifact-panel-action pkm-artifact-panel-action-danger', text: '🗑️', attr: { 'aria-label': 'Usuń artefakt' } });
                delBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    todoStore.delete(id);
                    if (this.plugin.artifactManager) {
                        await this.plugin.artifactManager.deleteById(id);
                    }
                    // Remove widget from chat if exists
                    const widget = this.messages_container?.querySelector(`[data-todo-id="${id}"]`);
                    if (widget) widget.remove();
                    // Refresh panel
                    this._toggleArtifactPanel();
                    this._toggleArtifactPanel();
                });
            }
        }

        // --- PLAN section ---
        if (planStore?.size > 0) {
            list.createDiv({ cls: 'pkm-artifact-panel-section', text: '📝 Plany' });
            for (const [id, plan] of planStore) {
                hasItems = true;
                const item = list.createDiv({ cls: 'pkm-artifact-panel-item' });
                const info = item.createDiv({ cls: 'pkm-artifact-panel-item-info' });

                const done = plan.steps?.filter(s => s.status === 'done').length || 0;
                const total = plan.steps?.length || 0;
                const icon = plan.approved ? '✅' : '📝';
                info.createSpan({ cls: 'pkm-artifact-panel-item-title', text: `${icon} ${plan.title || 'Plan'}` });
                info.createSpan({ cls: 'pkm-artifact-panel-item-progress', text: `${done}/${total}` });
                if (plan.createdBy) {
                    info.createSpan({ cls: 'pkm-artifact-panel-item-badge', text: plan.createdBy });
                }

                // Click → open modal
                info.addEventListener('click', () => {
                    new PlanEditModal(this.app, this.plugin, id, (updated) => {
                        const widget = this.messages_container?.querySelector(`[data-plan-id="${id}"]`);
                        if (widget && updated) {
                            widget.replaceWith(createPlanArtifact(updated, this._buildPlanCallbacks()));
                        }
                        this._toggleArtifactPanel();
                        this._toggleArtifactPanel();
                    }).open();
                });

                // Action buttons
                const actions = item.createDiv({ cls: 'pkm-artifact-panel-item-actions' });

                // Copy to vault as markdown
                const copyBtn = actions.createEl('button', { cls: 'pkm-artifact-panel-action', text: '📄', attr: { 'aria-label': 'Kopiuj do vaulta' } });
                copyBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    let md = `# ${plan.title}\n\n`;
                    (plan.steps || []).forEach((s, i) => {
                        const check = s.status === 'done' ? 'x' : ' ';
                        md += `- [${check}] **${s.label}**`;
                        if (s.description) md += ` — ${s.description}`;
                        md += '\n';
                        if (s.subtasks?.length > 0) {
                            for (const sub of s.subtasks) {
                                md += `  - [${sub.done ? 'x' : ' '}] ${sub.text}\n`;
                            }
                        }
                    });
                    const safeName = (plan.title || 'Plan').replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ _-]/g, '').trim();
                    const path = `${safeName}.md`;
                    await this.app.vault.adapter.write(path, md);
                    new Notice(`Zapisano: ${path}`);
                });

                // Delete
                const delBtn = actions.createEl('button', { cls: 'pkm-artifact-panel-action pkm-artifact-panel-action-danger', text: '🗑️', attr: { 'aria-label': 'Usuń artefakt' } });
                delBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    planStore.delete(id);
                    if (this.plugin.artifactManager) {
                        await this.plugin.artifactManager.deleteById(id);
                    }
                    const widget = this.messages_container?.querySelector(`[data-plan-id="${id}"]`);
                    if (widget) widget.remove();
                    this._toggleArtifactPanel();
                    this._toggleArtifactPanel();
                });
            }
        }

        if (!hasItems) {
            list.createDiv({ cls: 'pkm-artifact-panel-empty', text: 'Brak artefaktów' });
        }

        // Attach to chat body (relative parent)
        this.toolbar.parentElement.appendChild(panel);
        this._artifactPanel = panel;
    }

    handleGlobalKeydown(e) {
        if (e.key === 'Escape' && this.is_generating) {
            e.preventDefault();
            this.stop_generation();
        }
    }

    handle_input_keydown(e) {
        // Send on Enter (without Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.send_message();
            return;
        }

        // History navigation
        if (e.key === 'ArrowUp' && this.input_area.selectionStart === 0) {
            // Only if cursor at start (or generic if preferred, but user asked for specific condition)
            e.preventDefault();
            if (this.inputHistory.length > 0) {
                if (this.historyIndex < this.inputHistory.length - 1) {
                    this.historyIndex++;
                    this.input_area.value = this.inputHistory[this.inputHistory.length - 1 - this.historyIndex] || '';
                    this.handleInputResize();
                }
            }
            return;
        }

        if (e.key === 'ArrowDown' && this.input_area.selectionEnd === this.input_area.value.length) {
            e.preventDefault();
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.input_area.value = this.inputHistory[this.inputHistory.length - 1 - this.historyIndex] || '';
            } else if (this.historyIndex !== -1) {
                this.historyIndex = -1;
                this.input_area.value = '';
            }
            this.handleInputResize();
            return;
        }
    }

    handleInputResize() {
        if (!this.input_area) return;
        const textarea = this.input_area;
        textarea.style.height = 'auto'; // Reset to count scrollHeight correctly
        const newHeight = Math.min(Math.max(textarea.scrollHeight, 40), 160);
        textarea.style.height = newHeight + 'px';
    }

    resetInputArea() {
        if (!this.input_area) return;
        this.input_area.value = '';
        this.input_area.style.height = '40px'; // Reset to min-height
        this.historyIndex = -1;
    }

    /**
     * Get or create the chat model instance from our settings
     */
    get_chat_model() {
        // Return cached model if available
        if (this.env?.smart_chat_model?.stream) {
            log.debug('Chat', `Model z cache: ${this.env.smart_chat_model.model_key || 'unknown'}`);
            return this.env.smart_chat_model;
        }

        const settings = this.env?.settings?.smart_chat_model;
        if (!settings) return null; // env/settings not ready yet

        // Detect platform from setting or API keys
        let platform = settings.platform;
        if (!platform) {
            for (const p of ['anthropic', 'openai', 'gemini', 'groq', 'open_router', 'deepseek', 'ollama']) {
                if (settings[`${p}_api_key`] || p === 'ollama') { platform = p; break; }
            }
        }
        if (!platform) return null;

        const api_key = settings[`${platform}_api_key`];
        if (!api_key && platform !== 'ollama') return null;

        const module_config = this.env.config?.modules?.smart_chat_model;
        if (!module_config?.class) {
            console.error('[Obsek] SmartChatModel class not found in config');
            return null;
        }

        const model_key = settings[`${platform}_model`] || this.get_default_model(platform);

        try {
            const chat_model = new module_config.class({
                ...module_config,
                class: null,
                env: this.env,
                settings: this.env.settings,
                adapter: platform,
                api_key: api_key,
                model_key: model_key,
            });
            this.env.smart_chat_model = chat_model;
            log.model('main', platform, model_key);
            return chat_model;
        } catch (e) {
            log.error('Chat', 'Tworzenie modelu FAIL:', e);
            return null;
        }
    }

    /**
     * Get default model for platform
     */
    get_default_model(platform) {
        const defaults = {
            anthropic: 'claude-sonnet-4-20250514',
            openai: 'gpt-4o',
            gemini: 'gemini-1.5-pro',
            groq: 'llama-3.3-70b-versatile',
            deepseek: 'deepseek-chat',
            open_router: 'anthropic/claude-sonnet-4-20250514',
            ollama: 'llama3.2',
        };
        return defaults[platform] || '';
    }

    /**
     * Get default work mode for current agent.
     * Priority: agent.defaultMode > globalDefaultMode > DEFAULT_MODE ('rozmowa')
     */
    _getDefaultMode() {
        const agent = this.plugin?.agentManager?.getActiveAgent();
        return agent?.defaultMode
            || this.env?.settings?.obsek?.globalDefaultMode
            || DEFAULT_MODE;
    }

    async send_message() {
        const text = this.input_area.value.trim();
        if (!text || this.is_generating) return;
        const sendStart = Date.now();
        log.group('Chat', `send_message: "${text.slice(0, 80)}${text.length > 80 ? '...' : ''}"`);

        // Detect return after long inactivity → consolidate + start new session
        const timeoutMs = (this.env?.settings?.sessionTimeoutMinutes || 30) * 60 * 1000;
        if (this.lastMessageTimestamp && this.rollingWindow.messages.length > 0) {
            if (Date.now() - this.lastMessageTimestamp > timeoutMs) {
                await this.consolidateSession();
                if (this.sessionManager) this.sessionManager.startNewSession();
                this.rollingWindow = this._createRollingWindow();
                this.render_messages();
                this.add_welcome_message();
                this.updateTokenCounter();
                await this.updateSessionDropdown();
            }
        }
        this.lastMessageTimestamp = Date.now();

        // Handle slash commands
        if (text.startsWith('/')) {
            const command = text.toLowerCase();
            if (command === '/clear') {
                this.handleNewSession();
                this.resetInputArea();
                return;
            }
            if (command === '/save') {
                this.handleSaveSession();
                this.resetInputArea();
                return;
            }
        }

        // Add to history (max 20)
        this.inputHistory.push(text);
        if (this.inputHistory.length > 20) {
            this.inputHistory.shift();
        }

        // Clear input
        this.resetInputArea();

        // Add user message
        await this.append_message('user', text);

        // Toggle UI state
        this.set_generating(true);

        // Ensure RAG is initialized (lazy init - waits for embed model)
        const t0 = Date.now();
        await this.ensureRAGInitialized();
        log.timing('Chat', 'ensureRAGInitialized', t0);

        // Get system prompt from active agent (includes memory: brain + active context)
        const agentManager = this.plugin?.agentManager;
        if (agentManager) {
            const t1 = Date.now();
            const platform = this.env?.settings?.smart_chat_model?.platform || '';
            const isLocalModel = (platform === 'ollama' || platform === 'lm_studio');
            // Pass workMode + artifacts via context → PromptBuilder handles them in build()
            const basePrompt = await agentManager.getActiveSystemPromptWithMemory({
                isLocalModel,
                workMode: this.currentMode,
                artifacts: {
                    todos: this.plugin._chatTodoStore,
                    plans: this.plugin._planStore,
                },
            });
            this.rollingWindow.setSystemPrompt(basePrompt);
            log.timing('Chat', `System prompt build (${basePrompt.length} znaków, local=${isLocalModel})`, t1);
        }

        // Oczko: inject active note context (if enabled) — still dynamic per-message
        const oczkoEnabled = this.env?.settings?.obsek?.enableOczko !== false;
        if (oczkoEnabled) {
            try {
                const noteCtx = await this._buildActiveNoteContext();
                if (noteCtx) {
                    const cp = this.rollingWindow.baseSystemPrompt || '';
                    this.rollingWindow.setSystemPrompt(`${cp}\n\n${noteCtx}`);
                    log.debug('Chat', `Oczko: "${this.app.workspace.getActiveFile()?.basename}"`);
                }
            } catch (e) {
                log.warn('Chat', 'Oczko injection failed:', e);
            }
        }

        // RAG: Retrieve relevant context before preparing request
        if (this.ragRetriever) {
            const t2 = Date.now();
            try {
                const ragResults = await this.ragRetriever.retrieve(text);
                if (ragResults.length > 0) {
                    log.timing('Chat', `RAG: ${ragResults.length} wyników`, t2);
                    const context = this.ragRetriever.formatContext(ragResults);
                    const currentBase = this.rollingWindow.baseSystemPrompt || '';
                    this.rollingWindow.setSystemPrompt(
                        `${currentBase}\n\n--- Relevantny kontekst z poprzednich rozmów ---\n${context}`
                    );
                } else {
                    log.timing('Chat', 'RAG: brak wyników', t2);
                }
            } catch (ragError) {
                log.warn('Chat', 'RAG retrieval failed:', ragError);
                log.timing('Chat', 'RAG FAILED', t2);
            }
        }

        // === MINION AUTO-PREP (first message in session, toggle in settings) ===
        const activeAgent = this.plugin?.agentManager?.getActiveAgent();
        const autoPrepEnabled = this.env?.settings?.obsek?.autoPrepEnabled !== false; // default: true
        if (autoPrepEnabled && activeAgent?.minionEnabled !== false && activeAgent?.minion) {
            const isFirstMessage = this.rollingWindow.messages.filter(m => m.role === 'user').length <= 1;
            if (isFirstMessage) {
                const t3 = Date.now();
                const minionConfig = this.plugin?.agentManager?.minionLoader?.getMinion(activeAgent.minion);
                if (minionConfig) {
                    const minionModel = this._getMinionModel(activeAgent, minionConfig);
                    const prepModel = minionModel || this.get_chat_model?.();
                    if (prepModel?.stream && this.plugin?.toolRegistry) {
                        try {
                            // Show pending SubAgentBlock during minion work
                            this.showTypingIndicator('🤖 Przygotowanie kontekstu...');

                            if (!this._minionRunner) {
                                const { MinionRunner } = await import('../core/MinionRunner.js');
                                this._minionRunner = new MinionRunner({
                                    toolRegistry: this.plugin.toolRegistry,
                                    app: this.app,
                                    plugin: this.plugin
                                });
                            }
                            const prepResult = await this._minionRunner.runAutoPrep(
                                text, activeAgent, minionConfig, prepModel,
                                { workMode: this.currentMode }
                            );
                            log.timing('Chat', 'Minion auto-prep', t3);
                            // Track minion auto-prep tokens: prefer API, fallback to text estimate
                            const prepInput = prepResult.usage?.prompt_tokens || countTokens(text);
                            const prepOutput = prepResult.usage?.completion_tokens || countTokens(prepResult.context || '');
                            if (prepInput > 0 || prepOutput > 0) {
                                this.tokenTracker.record('minion', prepInput, prepOutput);
                                this._updateTokenPanel();
                            }
                            // Store auto-prep data — will be rendered INSIDE assistant bubble in handle_chunk
                            if (prepResult.toolsUsed?.length > 0 || prepResult.usage || prepResult.context) {
                                this._autoPrepData = {
                                    type: 'auto-prep',
                                    toolsUsed: prepResult.toolsUsed,
                                    toolCallDetails: prepResult.toolCallDetails || [],
                                    duration: prepResult.duration,
                                    usage: prepResult.usage,
                                    response: prepResult.context || '',
                                };
                            }
                            if (prepResult.context && prepResult.context !== 'Brak dodatkowego kontekstu.') {
                                const currentBase = this.rollingWindow.baseSystemPrompt || '';
                                this.rollingWindow.setSystemPrompt(
                                    `${currentBase}\n\n--- Kontekst przygotowany przez miniona ---\n${prepResult.context}\n--- Koniec kontekstu miniona ---`
                                );
                            }
                        } catch (minionError) {
                            log.timing('Chat', 'Minion auto-prep FAILED', t3);
                            console.warn('[Obsek] Minion auto-prep failed (non-fatal):', minionError);
                        }
                    }
                }
            }
        }
        // === END MINION AUTO-PREP ===

        // === SNAPSHOT for "Pokaż prompt" in Settings ===
        if (this.plugin) {
            this.plugin._lastSentSnapshot = {
                systemPrompt: this.rollingWindow.baseSystemPrompt,
                conversationSummary: this.rollingWindow.conversationSummary || '',
                lastUserMessage: text,
                timestamp: Date.now(),
                mode: this.currentMode,
                agentName: activeAgent?.name || '',
                agentEmoji: activeAgent?.emoji || '',
            };
        }

        // Prepare request
        const messages = this.rollingWindow.getMessagesForAPI();
        log.debug('Chat', `Messages for API: ${messages.length} wiadomości`);

        // Get tools from MCP registry if agent has mcp permission
        let tools = [];
        if (activeAgent?.permissions?.mcp && this.plugin?.toolRegistry) {
            tools = this.plugin.toolRegistry.getToolDefinitions();
            // Filter tools by agent's enabledTools (empty = all tools)
            const enabled = activeAgent.enabledTools;
            if (enabled && enabled.length > 0) {
                tools = tools.filter(t => enabled.includes(t.function?.name || t.name));
            }
            // Filter memory tools if agent has memory permission off
            if (activeAgent.permissions?.memory === false) {
                const memoryTools = ['memory_search', 'memory_update', 'memory_status'];
                tools = tools.filter(t => !memoryTools.includes(t.function?.name || t.name));
            }
            // Filter by work mode (Layer 1: Tryby Pracy)
            tools = filterToolsByMode(tools, this.currentMode);

            // Remove switch_mode if autoChange is off
            const autoChangeMode = this.env?.settings?.obsek?.autoChangeMode || 'ask';
            if (autoChangeMode === 'off') {
                tools = tools.filter(t => (t.function?.name || t.name) !== 'switch_mode');
            }

            log.debug('Chat', `Tools: ${tools.length} narzędzi (mode: ${this.currentMode}, filtered: ${!!enabled?.length})`);
        }

        try {
            // Get or create chat model
            const chat_model = this.get_chat_model();
            if (!chat_model?.stream) {
                throw new Error('Chat model not configured. Please configure API key in Settings → Obsek.');
            }
            log.timing('Chat', `TOTAL send→stream (model: ${chat_model.model_key || 'unknown'}, msgs: ${messages.length}, tools: ${tools.length})`, sendStart);

            // Count input tokens from text (always works, no API dependency)
            const inputText = messages.map(m => m.content || '').join('\n');
            this._lastInputTokens = countTokens(inputText);

            // Start streaming with tools
            this.showTypingIndicator();
            await chat_model.stream(
                { messages, tools: tools.length > 0 ? tools : undefined },
                {
                    chunk: this.handle_chunk.bind(this),
                    done: this.handle_done.bind(this),
                    error: this.handle_error.bind(this)
                }
            );
        } catch (error) {
            log.error('Chat', 'send_message ERROR:', error);
            this.handle_error(error);
        }
        log.groupEnd();
    }

    handle_chunk(response) {
        this.hideTypingIndicator();
        if (!this.current_message_container) {
            // Create assistant message container
            this.current_message_container = this.messages_container.createDiv({
                cls: 'pkm-chat-message assistant'
            });

            // Message row (avatar + bubble)
            const row = this.current_message_container.createDiv({ cls: 'pkm-chat-message-row' });

            const emoji = this.plugin?.agentManager?.getActiveAgent()?.emoji || '🤖';
            row.createDiv({ cls: 'pkm-chat-avatar', text: emoji });

            this.current_message_bubble = row.createDiv({ cls: 'pkm-chat-bubble streaming' });

            // Insert auto-prep SubAgentBlock INSIDE the bubble (stays with the message)
            if (this._autoPrepData) {
                const subBlock = createSubAgentBlock(this._autoPrepData);
                this.current_message_bubble.appendChild(subBlock);
                this._autoPrepData = null;
            }

            this.current_message_text = this.current_message_bubble.createDiv({
                cls: 'pkm-chat-content'
            });
        }

        // Get content from response
        const content = response?.choices?.[0]?.message?.content || '';
        const reasoningContent = response?.choices?.[0]?.message?.reasoning_content || '';

        // Render thinking block if reasoning_content present and setting enabled
        const showThinking = this.env?.settings?.obsek?.showThinking ?? true;
        if (showThinking && reasoningContent.length > 0) {
            if (!this._currentThinkingBlock) {
                this._currentThinkingBlock = createThinkingBlock(reasoningContent, true);
                this.current_message_bubble.insertBefore(
                    this._currentThinkingBlock,
                    this.current_message_text
                );
            } else {
                updateThinkingBlock(this._currentThinkingBlock, reasoningContent);
            }
        }

        // Update text (render as markdown)
        this.current_message_text.empty();
        MarkdownRenderer.renderMarkdown(
            content,
            this.current_message_text,
            '',
            this
        );

        // Scroll to bottom
        this.scrollToBottom();
    }

    async handle_done(response) {
        // Guard against duplicate handle_done calls (streaming can fire this twice)
        const responseId = response?.id || '';
        if (this._lastProcessedResponseId === responseId && responseId) return;
        this._lastProcessedResponseId = responseId;

        log.debug('Chat', 'handle_done wywołane');

        this.hideTypingIndicator();
        const content = response?.choices?.[0]?.message?.content || '';

        // Track token usage: prefer API data, fallback to own counting from text
        const apiInput = response?.usage?.prompt_tokens || 0;
        const apiOutput = response?.usage?.completion_tokens || 0;
        const inputTokens = apiInput > 0 ? apiInput : (this._lastInputTokens || 0);
        const outputTokens = apiOutput > 0 ? apiOutput : countTokens(content);
        if (inputTokens > 0 || outputTokens > 0) {
            this.tokenTracker.record('main', inputTokens, outputTokens);
            this._updateTokenPanel();
        }

        // DeepSeek Reasoner: capture reasoning_content for tool call continuations
        const reasoningContent = response?.choices?.[0]?.message?.reasoning_content || null;

        // Parse tool calls from response (supports both OpenAI and Anthropic formats)
        const toolCalls = this.plugin?.mcpClient?.parseToolCalls(response) || [];

        // Also check direct tool_calls on response (OpenAI format)
        if (response?.tool_calls?.length > 0) {
            for (const tc of response.tool_calls) {
                toolCalls.push({
                    id: tc.id,
                    name: tc.function?.name || tc.name,
                    arguments: tc.function?.arguments || tc.arguments
                });
            }
        }

        // Check for tool calls in response
        if (toolCalls.length > 0) {
            log.info('Chat', `Tool calls: ${toolCalls.length} → ${toolCalls.map(tc => tc.name).join(', ')}`);

            // Ensure we have a container
            if (!this.current_message_container) {
                this.current_message_container = this.messages_container.createDiv({
                    cls: 'pkm-chat-message assistant'
                });
            }

            const toolCallsContainer = this.current_message_container.createDiv({ cls: 'tool-calls-wrapper' });
            toolCallsContainer.style.width = '100%';
            toolCallsContainer.style.marginTop = '8px';

            const toolResults = [];
            const agentName = this.plugin?.agentManager?.getActiveAgent()?.name || 'unknown';

            // Tool status messages in Polish
            const TOOL_STATUS = {
                vault_search: '🔍 Szukam w vaultcie...',
                vault_read: '📖 Czytam notatkę...',
                vault_list: '📁 Przeglądam foldery...',
                vault_write: '✏️ Zapisuję...',
                vault_delete: '🗑️ Usuwam...',
                memory_search: '🧠 Przeszukuję pamięć...',
                memory_update: '🧠 Aktualizuję pamięć...',
                memory_status: '🧠 Sprawdzam pamięć...',
                skill_list: '📚 Sprawdzam umiejętności...',
                skill_execute: '🎯 Aktywuję skill...',
                minion_task: '🔧 Delegowanie do miniona...',
                master_task: '🧠 Konsultuje z ekspertem...',
                chat_todo: '📋 Aktualizuję listę zadań...',
                plan_action: '📋 Aktualizuję plan...',
            };

            // ── PHASE 1: Create ALL pending UI blocks (sync) ──
            const pendingEntries = toolCalls.map(toolCall => {
                const isSubAgent = toolCall.name === 'minion_task' || toolCall.name === 'master_task';
                let toolDisplay;
                if (isSubAgent) {
                    this.hideTypingIndicator();
                    toolDisplay = createPendingSubAgentBlock(toolCall.name);
                } else {
                    const statusMsg = TOOL_STATUS[toolCall.name] || `🔧 ${toolCall.name}...`;
                    this.showTypingIndicator(statusMsg);
                    toolDisplay = createToolCallDisplay({
                        name: toolCall.name,
                        input: toolCall.arguments,
                        status: 'pending'
                    });
                }
                toolCallsContainer.appendChild(toolDisplay);
                if (isSubAgent) toolDisplay.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                return { toolCall, toolDisplay, isSubAgent };
            });

            // ── PHASE 2: Execute ALL tool calls in parallel ──
            const executionResults = await Promise.all(pendingEntries.map(async ({ toolCall }) => {
                try {
                    log.debug('Chat', `Wykonuję tool (parallel): ${toolCall.name}`, toolCall.arguments);
                    const result = await this.plugin.mcpClient.executeToolCall(toolCall, agentName);
                    return { result, error: null };
                } catch (err) {
                    return { result: { isError: true, error: err.message }, error: err };
                }
            }));

            // ── PHASE 3: Update UI and collect results (sync, in order) ──
            for (let ti = 0; ti < pendingEntries.length; ti++) {
                const { toolCall, toolDisplay, isSubAgent } = pendingEntries[ti];
                const { result, error } = executionResults[ti];

                if (error) {
                    // Execution error
                    if (isSubAgent) {
                        toolDisplay.replaceWith(createSubAgentBlock({
                            type: toolCall.name,
                            response: `Błąd: ${error.message}`,
                        }));
                    } else {
                        toolDisplay.replaceWith(createToolCallDisplay({
                            name: toolCall.name,
                            input: toolCall.arguments,
                            status: 'error',
                            error: error.message
                        }));
                    }
                } else if (isSubAgent && result?.success) {
                    const taskQuery = typeof toolCall.arguments === 'string'
                        ? (() => { try { return JSON.parse(toolCall.arguments).task; } catch { return toolCall.arguments; } })()
                        : toolCall.arguments?.task || '';
                    const role = toolCall.name === 'minion_task' ? 'minion' : 'master';

                    const subInput = result.usage?.prompt_tokens || countTokens(taskQuery);
                    const subOutput = result.usage?.completion_tokens || countTokens(typeof result.result === 'string' ? result.result : '');
                    if (subInput > 0 || subOutput > 0) {
                        this.tokenTracker.record(role, subInput, subOutput);
                        this._updateTokenPanel();
                    }

                    const fullBlock = createSubAgentBlock({
                        type: toolCall.name,
                        query: taskQuery,
                        response: typeof result.result === 'string' ? result.result : '',
                        toolsUsed: result.tools_used || [],
                        toolCallDetails: result.tool_call_details || [],
                        duration: result.duration_ms || 0,
                        usage: result.usage,
                    });
                    toolDisplay.replaceWith(fullBlock);
                    fullBlock.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } else if (isSubAgent && !result?.success) {
                    const errorBlock = createSubAgentBlock({
                        type: toolCall.name,
                        query: typeof toolCall.arguments === 'string' ? toolCall.arguments : toolCall.arguments?.task || '',
                        response: `Błąd: ${result?.error || 'Nieznany błąd'}`,
                        duration: 0,
                    });
                    toolDisplay.replaceWith(errorBlock);
                    errorBlock.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } else {
                    const updatedDisplay = createToolCallDisplay({
                        name: toolCall.name,
                        input: toolCall.arguments,
                        output: result,
                        status: result.isError ? 'error' : 'success',
                        error: result.error
                    });
                    toolDisplay.replaceWith(updatedDisplay);
                }

                // Render interactive widgets
                if (result?.type === 'todo_list') {
                    const existingWidget = toolCallsContainer.querySelector(`[data-todo-id="${result.id}"]`);
                    const todoWidget = createChatTodoList(result, this._buildTodoCallbacks());
                    if (existingWidget) {
                        existingWidget.replaceWith(todoWidget);
                    } else {
                        toolCallsContainer.appendChild(todoWidget);
                    }
                }

                if (result?.type === 'plan_artifact') {
                    const existingWidget = toolCallsContainer.querySelector(`[data-plan-id="${result.id}"]`);
                    const planCallbacks = this._buildPlanCallbacks();
                    const planWidget = createPlanArtifact(result, planCallbacks);
                    if (existingWidget) {
                        existingWidget.replaceWith(planWidget);
                    } else {
                        toolCallsContainer.appendChild(planWidget);
                    }
                }

                // Detect delegation proposal
                if (toolCall.name === 'agent_delegate') {
                    try {
                        const parsed = typeof result === 'object' ? result : JSON.parse(JSON.stringify(result));
                        if (parsed.delegation === true) {
                            this._pendingDelegation = parsed;
                        }
                    } catch {}
                }

                // Detect switch_mode result
                if (toolCall.name === 'switch_mode') {
                    try {
                        const parsed = typeof result === 'object' ? result : JSON.parse(JSON.stringify(result));
                        if (parsed.success) {
                            this._applyModeChange(parsed.mode);
                        } else if (parsed.proposal) {
                            this._pendingModeChange = parsed;
                        }
                    } catch {}
                }

                // Auto-reload skills/minions/playbooks if written to their folders
                if (toolCall.name === 'vault_write') {
                    const writePath = toolCall.arguments?.path || '';
                    if (writePath.includes('/skills/')) {
                        await this.plugin?.agentManager?.reloadSkills();
                        this.renderSkillButtons();
                    }
                    if (writePath.includes('/minions/')) {
                        await this.plugin?.agentManager?.reloadMinions();
                    }
                    if (writePath.includes('playbook.md') || writePath.includes('vault_map.md')) {
                        this._playbookDirty = true;
                    }

                    if (!result?.isError && writePath) {
                        const linkDiv = document.createElement('div');
                        linkDiv.addClass('pkm-vault-link');
                        const link = document.createElement('a');
                        link.addClass('pkm-vault-link-anchor');
                        link.textContent = `📄 ${writePath}`;
                        link.href = '#';
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            this.app.workspace.openLinkText(writePath, '');
                        });
                        linkDiv.appendChild(link);
                        toolCallsContainer.appendChild(linkDiv);
                    }
                }

                toolResults.push({
                    tool_call_id: toolCall.id,
                    role: 'tool',
                    content: JSON.stringify(result)
                });
            }

            // Save assistant message with tool calls to history
            // MUST include tool_calls for Anthropic, reasoning_content for DeepSeek Reasoner
            const rawToolCalls = response?.choices?.[0]?.message?.tool_calls || [];
            const toolMsgMeta = { tool_calls: rawToolCalls };
            if (reasoningContent) {
                toolMsgMeta.reasoning_content = reasoningContent;
            }
            await this.rollingWindow.addMessage('assistant', content || '', toolMsgMeta);

            // Add tool results to conversation and continue
            for (const tr of toolResults) {
                await this.rollingWindow.addMessage('tool', tr.content, { tool_call_id: tr.tool_call_id });
            }

            // Reset current container before continuing
            if (this.current_message_bubble) {
                this.current_message_bubble.classList.remove('streaming');
            }
            if (this._currentThinkingBlock) {
                this._currentThinkingBlock.classList.remove('streaming');
                this._currentThinkingBlock = null;
            }
            this.current_message_container = null;
            this.current_message_bubble = null;
            this.current_message_text = null;

            // Show thinking indicator while model processes tool results
            this.showTypingIndicator('Analizuję wyniki...');

            // Continue conversation with tool results
            log.info('Chat', `continueWithToolResults: ${toolResults.length} wyników, kontynuuję rozmowę...`);
            await this.continueWithToolResults();
            return;
        }


        // No tool calls - normal completion
        log.info('Chat', `Odpowiedź GOTOWA: ${content.length} znaków (bez tool calls)`);
        const timestamp = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        const idx = this.rollingWindow.messages.length; // Will be the index after adding
        this.rollingWindow.addMessage('assistant', content, { timestamp });
        this.updateTokenCounter();

        // Add timestamp and actions to the streamed message
        if (this.current_message_container) {
            // Add actions toolbar to the bubble
            const actionsDiv = this.current_message_bubble.createDiv({ cls: 'pkm-chat-actions' });
            this.addMessageActions(actionsDiv, content, 'assistant', idx);

            // Add timestamp below the message
            this.current_message_container.createDiv({ cls: 'pkm-chat-timestamp', text: timestamp });

            // Render delegation button if pending
            if (this._pendingDelegation) {
                this._renderDelegationButton(this.current_message_container, this._pendingDelegation);
                this._pendingDelegation = null;
            }

            // Render mode change proposal if pending (auto-change=ask)
            if (this._pendingModeChange) {
                this._renderModeChangeButton(this.current_message_container, this._pendingModeChange);
                this._pendingModeChange = null;
            }
        }

        // Finalize streaming state
        if (this.current_message_bubble) {
            this.current_message_bubble.classList.remove('streaming');
        }
        if (this._currentThinkingBlock) {
            this._currentThinkingBlock.classList.remove('streaming');
            this._currentThinkingBlock = null;
        }

        // Reset state
        this.current_message_container = null;
        this.current_message_bubble = null;
        this.current_message_text = null;
        this.set_generating(false);
    }

    /**
     * Render a delegation button after agent proposes switching to another agent
     * @param {HTMLElement} container
     * @param {Object} data - Delegation data from agent_delegate tool
     */
    _renderDelegationButton(container, data) {
        const div = container.createDiv({ cls: 'pkm-delegation-proposal' });
        div.createEl('p', {
            text: data.reason || `Proponuję przekazać rozmowę do ${data.to_emoji} ${data.to_name}`,
            cls: 'pkm-delegation-reason'
        });
        const btn = div.createEl('button', {
            text: `Przejdź do ${data.to_emoji} ${data.to_name}`,
            cls: 'pkm-delegation-btn mod-cta'
        });
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            btn.textContent = 'Przełączam...';
            // Consolidate current session before switching
            if (this.rollingWindow.messages.length > 0) {
                await this.consolidateSession();
            }
            const switched = this.plugin.agentManager?.switchAgent(data.to_agent);
            if (switched) {
                const agentMemory = this.plugin.agentManager.getActiveMemory();
                agentMemory?.startNewSession();
                this.rollingWindow = this._createRollingWindow();
                this.render_messages();
                this.updateAgentDropdown?.();
                this.updatePermissionsBadge();
                this.renderSkillButtons();
                await this.updateSessionDropdown();

                // Auto-send delegation context as first message
                const delegationMsg = data.context_summary
                    || data.reason
                    || `Delegacja od innego agenta`;

                // Attach active artifacts info so the new agent knows about them
                let artifactInfo = '';
                const todoStore = this.plugin._chatTodoStore;
                const planStore = this.plugin._planStore;
                if (todoStore?.size > 0 || planStore?.size > 0) {
                    const parts = ['\n\n--- Aktywne artefakty ---'];
                    if (todoStore) {
                        for (const [id, todo] of todoStore) {
                            const done = todo.items.filter(i => i.done).length;
                            parts.push(`Lista TODO "${todo.title}" (id: ${id}) — ${done}/${todo.items.length} gotowe`);
                        }
                    }
                    if (planStore) {
                        for (const [id, plan] of planStore) {
                            const done = plan.steps.filter(s => s.status === 'done').length;
                            const status = plan.approved ? 'zatwierdzony' : 'czeka na zatwierdzenie';
                            parts.push(`Plan "${plan.title}" (id: ${id}) — ${done}/${plan.steps.length} kroków, ${status}`);
                        }
                    }
                    parts.push('Użyj chat_todo / plan_action z tymi ID żeby kontynuować pracę nad nimi.');
                    artifactInfo = parts.join('\n');
                }

                const handoffText = `[Delegacja] ${delegationMsg}${artifactInfo}`;
                this.input_area.value = handoffText;
                // Small delay to let UI settle before sending
                setTimeout(() => this.send_message(), 200);
            }
        });
    }

    /**
     * Apply a mode change (immediate or confirmed).
     * @param {string} newMode - Mode id to switch to
     */
    _applyModeChange(newMode) {
        const info = getModeInfo(newMode);
        if (!info) return;
        this.currentMode = newMode;
        // Sync to plugin for cross-component access (e.g. MinionTaskTool)
        if (this.plugin) this.plugin.currentWorkMode = newMode;
        // Update toolbar mode button if it exists
        if (this._modeBtn) {
            this._modeBtn.textContent = info.icon;
            this._modeBtn.setAttribute('aria-label', `Tryb: ${info.label}`);
        }
        new Notice(`Tryb: ${info.icon} ${info.label}`);
        log.info('Chat', `Mode changed → ${newMode}`);
    }

    /**
     * Render mode change proposal button (auto-change=ask).
     * @param {HTMLElement} container
     * @param {Object} data - { mode, label, icon, reason }
     */
    _renderModeChangeButton(container, data) {
        const div = container.createDiv({ cls: 'pkm-mode-proposal' });
        div.createEl('p', {
            text: data.reason || `Proponuję zmianę trybu na ${data.icon} ${data.label}`,
            cls: 'pkm-mode-proposal-reason'
        });
        const btn = div.createEl('button', {
            text: `Przełącz na ${data.icon} ${data.label}`,
            cls: 'pkm-mode-proposal-btn mod-cta'
        });
        btn.addEventListener('click', () => {
            btn.disabled = true;
            btn.textContent = 'Zmieniono!';
            this._applyModeChange(data.mode);
        });
    }

    /**
     * Continue conversation after tool execution
     */
    async continueWithToolResults() {
        log.debug('Chat', 'continueWithToolResults() — kontynuacja po tool calls');
        const messages = this.rollingWindow.getMessagesForAPI();

        // Count input tokens for this continuation call
        const inputText = messages.map(m => m.content || '').join('\n');
        this._lastInputTokens = countTokens(inputText);

        // Get tools again
        let tools = [];
        const activeAgent = this.plugin?.agentManager?.getActiveAgent();
        if (activeAgent?.permissions?.mcp && this.plugin?.toolRegistry) {
            tools = this.plugin.toolRegistry.getToolDefinitions();
            // Apply same filters as send_message
            const enabled = activeAgent.enabledTools;
            if (enabled && enabled.length > 0) {
                tools = tools.filter(t => enabled.includes(t.function?.name || t.name));
            }
            if (activeAgent.permissions?.memory === false) {
                const memoryTools = ['memory_search', 'memory_update', 'memory_status'];
                tools = tools.filter(t => !memoryTools.includes(t.function?.name || t.name));
            }
            tools = filterToolsByMode(tools, this.currentMode);
            const autoChangeMode = this.env?.settings?.obsek?.autoChangeMode || 'ask';
            if (autoChangeMode === 'off') {
                tools = tools.filter(t => (t.function?.name || t.name) !== 'switch_mode');
            }
        }

        try {
            const chat_model = this.get_chat_model();
            if (!chat_model?.stream) {
                throw new Error('Chat model not configured.');
            }

            await chat_model.stream(
                { messages, tools: tools.length > 0 ? tools : undefined },
                {
                    chunk: this.handle_chunk.bind(this),
                    done: this.handle_done.bind(this),
                    error: this.handle_error.bind(this)
                }
            );
        } catch (error) {
            console.error('Error continuing after tool call:', error);
            this.handle_error(error);
        }
    }

    handle_error(error) {
        this.hideTypingIndicator();
        console.error('Chat error:', error);

        // Show error message
        if (this.current_message_container) {
            this.current_message_text.empty();
            this.current_message_text.createEl('p', {
                text: `Error: ${error.message || 'Unknown error occurred'}`,
                cls: 'pkm-chat-error'
            });
        } else {
            const error_msg = this.messages_container.createDiv({
                cls: 'pkm-chat-message assistant'
            });
            const bubble = error_msg.createDiv({ cls: 'pkm-chat-bubble pkm-chat-error' });
            bubble.createEl('p', { text: `Error: ${error.message || 'Unknown error occurred'}` });
        }

        this.set_generating(false);
    }

    stop_generation() {
        if (this.env.smart_chat_model?.stop_stream) {
            this.env.smart_chat_model.stop_stream();
        }
        this.set_generating(false);
    }

    async append_message(role, content) {
        const timestamp = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

        // Add to history with timestamp
        await this.rollingWindow.addMessage(role, content, { timestamp });
        this.updateTokenCounter();

        // Render in UI
        const message_div = this.messages_container.createDiv({
            cls: `pkm-chat-message ${role}`
        });

        // Message row (avatar + bubble)
        const row = message_div.createDiv({ cls: 'pkm-chat-message-row' });

        // Avatar for assistant only
        if (role === 'assistant') {
            const emoji = this.plugin?.agentManager?.getActiveAgent()?.emoji || '🤖';
            row.createDiv({ cls: 'pkm-chat-avatar', text: emoji });
        }

        const bubble = row.createDiv({ cls: 'pkm-chat-bubble' });

        // Actions toolbar (will be populated by addMessageActions)
        const actionsDiv = bubble.createDiv({ cls: 'pkm-chat-actions' });

        const content_div = bubble.createDiv({ cls: 'pkm-chat-content' });

        if (role === 'user') {
            content_div.createEl('p', { text: content });
        } else {
            MarkdownRenderer.renderMarkdown(content, content_div, '', this);
        }

        // Timestamp
        message_div.createDiv({ cls: 'pkm-chat-timestamp', text: timestamp });

        const idx = this.rollingWindow.messages.length - 1;
        this.addMessageActions(actionsDiv, content, role, idx);

        // Scroll to bottom
        this.scrollToBottom();
    }

    render_messages() {
        this.messages_container.empty();
        this.rollingWindow.messages.forEach((msg, idx) => {
            const message_div = this.messages_container.createDiv({
                cls: `pkm-chat-message ${msg.role}`
            });

            // Message row (avatar + bubble)
            const row = message_div.createDiv({ cls: 'pkm-chat-message-row' });

            // Avatar for assistant only
            if (msg.role === 'assistant') {
                const emoji = this.plugin?.agentManager?.getActiveAgent()?.emoji || '🤖';
                row.createDiv({ cls: 'pkm-chat-avatar', text: emoji });
            }

            const bubble = row.createDiv({ cls: 'pkm-chat-bubble' });

            // Actions toolbar
            const actionsDiv = bubble.createDiv({ cls: 'pkm-chat-actions' });

            const content_div = bubble.createDiv({ cls: 'pkm-chat-content' });

            if (msg.role === 'user') {
                content_div.createEl('p', { text: msg.content });
            } else {
                MarkdownRenderer.renderMarkdown(msg.content, content_div, '', this);
            }

            // Timestamp
            const timestamp = msg.metadata?.timestamp || '';
            if (timestamp) {
                message_div.createDiv({ cls: 'pkm-chat-timestamp', text: timestamp });
            }

            this.addMessageActions(actionsDiv, msg.content, msg.role, idx);
        });
    }


    addMessageActions(actionsDiv, content, role, idx) {
        // Copy button (all messages)
        const copyBtn = actionsDiv.createEl('button', { cls: 'pkm-action-btn', text: '📋' });
        copyBtn.setAttribute('aria-label', 'Kopiuj');
        copyBtn.onclick = async () => {
            await navigator.clipboard.writeText(content);
            copyBtn.textContent = '✓';
            setTimeout(() => { copyBtn.textContent = '📋'; }, 2000);
        };

        // Delete button (all messages)
        const deleteBtn = actionsDiv.createEl('button', { cls: 'pkm-action-btn', text: '🗑️' });
        deleteBtn.setAttribute('aria-label', 'Usuń');
        deleteBtn.onclick = () => {
            if (idx < this.rollingWindow.messages.length &&
                this.rollingWindow.messages[idx].content === content &&
                this.rollingWindow.messages[idx].role === role) {
                this.rollingWindow.messages.splice(idx, 1);
                this.render_messages();
                this.updateTokenCounter();
            } else {
                const foundIdx = this.rollingWindow.messages.findIndex(m => m.content === content && m.role === role);
                if (foundIdx > -1) {
                    this.rollingWindow.messages.splice(foundIdx, 1);
                    this.render_messages();
                    this.updateTokenCounter();
                }
            }
        };

        if (role === 'user') {
            // Edit button (user only)
            const editBtn = actionsDiv.createEl('button', { cls: 'pkm-action-btn', text: '✏️' });
            editBtn.setAttribute('aria-label', 'Edytuj');
            editBtn.onclick = () => this.startEditMessage(idx, content);
        }

        if (role === 'assistant') {
            // React buttons
            const thumbsUp = actionsDiv.createEl('button', { cls: 'pkm-action-btn pkm-react-btn', text: '👍' });
            const thumbsDown = actionsDiv.createEl('button', { cls: 'pkm-action-btn pkm-react-btn', text: '👎' });

            const msg = this.rollingWindow.messages[idx];
            if (msg?.metadata?.reaction === 'positive') thumbsUp.classList.add('active');
            if (msg?.metadata?.reaction === 'negative') thumbsDown.classList.add('active');

            thumbsUp.onclick = () => {
                const msg = this.rollingWindow.messages[idx];
                if (msg) {
                    msg.metadata = msg.metadata || {};
                    if (thumbsUp.classList.contains('active')) {
                        delete msg.metadata.reaction;
                        thumbsUp.classList.remove('active');
                    } else {
                        msg.metadata.reaction = 'positive';
                        thumbsUp.classList.add('active');
                        thumbsDown.classList.remove('active');
                    }
                }
            };
            thumbsDown.onclick = () => {
                const msg = this.rollingWindow.messages[idx];
                if (msg) {
                    msg.metadata = msg.metadata || {};
                    if (thumbsDown.classList.contains('active')) {
                        delete msg.metadata.reaction;
                        thumbsDown.classList.remove('active');
                    } else {
                        msg.metadata.reaction = 'negative';
                        thumbsDown.classList.add('active');
                        thumbsUp.classList.remove('active');
                    }
                }
            };

            // Regenerate (only for last assistant message)
            if (this.isLastAssistantMessage(content)) {
                const regenBtn = actionsDiv.createEl('button', { cls: 'pkm-action-btn', text: '🔄' });
                regenBtn.setAttribute('aria-label', 'Generuj ponownie');
                regenBtn.onclick = () => this.regenerateLastResponse();
            }
        }
    }


    startEditMessage(msgIndex, originalContent) {
        // For simplicity, just remove messages from index and resend
        const messages = this.rollingWindow.messages;
        if (msgIndex >= 0 && msgIndex < messages.length) {
            // Remove edited message and all subsequent
            messages.splice(msgIndex);

            this.render_messages();
            this.input_area.value = originalContent;
            this.input_area.focus();
            // User can now edit and resend
        }
    }

    isLastAssistantMessage(content) {
        const messages = this.rollingWindow.messages;
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'assistant') {
                return messages[i].content === content;
            }
        }
        return false;
    }

    async regenerateLastResponse() {
        const messages = this.rollingWindow.messages;

        // Find last user message
        let lastUserIdx = -1;
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
                lastUserIdx = i;
                break;
            }
        }

        if (lastUserIdx === -1) return;

        const userContent = messages[lastUserIdx].content;

        // Remove everything INCLUDING last user message to avoid duplication
        messages.splice(lastUserIdx);

        // Re-render and resend
        this.render_messages();
        this.input_area.value = userContent;
        await this.send_message();
    }

    set_generating(is_generating) {
        this.is_generating = is_generating;

        if (is_generating) {
            this.send_button.addClass('hidden');
            this.stop_button.removeClass('hidden');
            this.input_area.disabled = true;
        } else {
            this.send_button.removeClass('hidden');
            this.stop_button.addClass('hidden');
            this.input_area.disabled = false;
            this.input_area.focus();
        }
    }

    async onOpen() {
        await this.render_view();
        await this.initSessionManager();
        // RAG will be initialized lazily on first message if embed model is ready
    }

    /**
     * Lazy RAG initialization - called before sending message
     */
    async ensureRAGInitialized() {
        if (this.ragRetriever) return;

        const chatSettings = this.env?.settings?.smart_chat_model || {};
        try {
            this.embeddingHelper = new EmbeddingHelper(this.env);
            if (!this.embeddingHelper.isReady()) return;

            const agentMemory = this.plugin?.agentManager?.getActiveMemory();
            if (!agentMemory) return;

            this.ragRetriever = new RAGRetriever({
                embeddingHelper: this.embeddingHelper,
                agentMemory: agentMemory,
                settings: this.env?.settings?.obsek || {}
            });
            await this.ragRetriever.indexAllSessions();
        } catch (ragError) {
            console.warn('[Obsek] RAG initialization failed:', ragError);
        }
    }

    onClose() {
        if (this.handleGlobalKeydownBound) {
            document.removeEventListener('keydown', this.handleGlobalKeydownBound);
        }
        if (this.handleBeforeUnloadBound) {
            window.removeEventListener('beforeunload', this.handleBeforeUnloadBound);
        }

        // Cleanup artifact panel
        if (this._artifactPanel) {
            this._artifactPanel.remove();
            this._artifactPanel = null;
        }

        // Cleanup if needed
        if (this.is_generating) {
            this.stop_generation();
        }
        if (this._autoSaveTimer) {
            clearInterval(this._autoSaveTimer);
            this._autoSaveTimer = null;
        }
        if (this.sessionManager) {
            this.sessionManager.stopAutoSave();
        }

        // Best-effort fire-and-forget save (async - may not complete before Obsidian closes)
        // Auto-save is the primary safety net; this is a bonus attempt
        if (this.rollingWindow?.messages?.length > 0) {
            this.handleSaveSession();
        }
    }

    // --- Session Handlers ---

    async handleNewSession() {
        log.info('Chat', `handleNewSession: ${this.rollingWindow.messages.length} wiadomości do konsolidacji`);
        // Consolidate session (extract memory + save) BEFORE clearing
        if (this.rollingWindow.messages.length > 0) {
            await this.consolidateSession();
        }

        // Reset session trackers so next save creates a new file
        if (this.sessionManager) {
            this.sessionManager.startNewSession();
        }
        const agentMemory = this.plugin?.agentManager?.getActiveMemory();
        if (agentMemory) {
            agentMemory.startNewSession();
        }

        // Artifacts are global — NOT cleared on new session

        this.rollingWindow = this._createRollingWindow();
        this.tokenTracker.clear();
        // Reset work mode to default on new session
        this.currentMode = this._getDefaultMode();
        this._applyModeChange(this.currentMode);
        this.render_messages();
        this.add_welcome_message();
        this.updateTokenCounter();
        this._updateTokenPanel();
        await this.updateSessionDropdown();
    }

    async handleSaveSession() {
        log.debug('Chat', 'handleSaveSession');
        try {
            const agentManager = this.plugin?.agentManager;
            const activeAgent = agentManager?.getActiveAgent();
            const activeAgentName = activeAgent?.name || 'default';

            const metadata = {
                created: new Date().toISOString(),
                agent: activeAgentName,
                tokens_used: this.rollingWindow.getCurrentTokenCount()
            };

            // Try to save to agent memory first
            if (agentManager) {
                const savedPath = await agentManager.saveActiveSession(
                    this.rollingWindow.messages,
                    metadata
                );
                if (savedPath) {
                    this.autosaveStatus.textContent = `Saved to ${activeAgentName}!`;
                    setTimeout(() => { this.autosaveStatus.textContent = ''; }, 2000);
                    await this.updateSessionDropdown();
                    return;
                }
            }

            // Fallback to shared SessionManager
            if (this.sessionManager) {
                await this.sessionManager.saveSession(this.rollingWindow.messages, metadata);
                this.autosaveStatus.textContent = 'Saved!';
                setTimeout(() => { this.autosaveStatus.textContent = ''; }, 2000);
                await this.updateSessionDropdown();
            }
        } catch (e) {
            console.error('Error saving session:', e);
            this.autosaveStatus.textContent = 'Save failed';
        }
    }

    async handleLoadSession(path) {
        log.info('Chat', `handleLoadSession: ${path}`);
        try {
            let parsed;

            // Try loading from AgentMemory first
            const agentMemory = this.plugin?.agentManager?.getActiveMemory();
            if (agentMemory) {
                const filename = path.split('/').pop();
                parsed = await agentMemory.loadSession(filename);
            } else if (this.sessionManager) {
                parsed = await this.sessionManager.loadSession(path);
            } else {
                return;
            }

            if (!parsed?.messages) return;
            this.rollingWindow = this._createRollingWindow();
            for (const msg of parsed.messages) {
                await this.rollingWindow.addMessage(msg.role, msg.content);
            }
            this.render_messages();
            this.updateTokenCounter();
        } catch (e) {
            console.error('Error loading session:', e);
        }
    }

    async updateSessionDropdown() {
        if (!this.sessionDropdown) return;

        // Get sessions from AgentMemory (primary) or SessionManager (fallback)
        let sessions = [];
        const agentMemory = this.plugin?.agentManager?.getActiveMemory();
        if (agentMemory) {
            sessions = await agentMemory.listSessions();
        } else if (this.sessionManager) {
            sessions = await this.sessionManager.listSessions();
        }

        // Clear existing options except the first placeholder
        while (this.sessionDropdown.options.length > 1) {
            this.sessionDropdown.remove(1);
        }

        for (const file of sessions) {
            this.sessionDropdown.createEl('option', { value: file.path, text: file.name });
        }
    }

    // --- Memory Extraction (Phase 3) ---

    /**
     * Consolidate session: extract memory, update brain, save session.
     * Called from handleNewSession(), handleAgentChange(), session timeout.
     * NOT called from onClose() (async extraction won't complete in time).
     */
    async consolidateSession() {
        const messages = this.rollingWindow.messages;
        if (!messages || messages.length === 0) return;

        log.group('Chat', `consolidateSession: ${messages.length} wiadomości`);
        const agentManager = this.plugin?.agentManager;
        const agentMemory = agentManager?.getActiveMemory();

        // Artifacts are saved on every mutation (fire-and-forget) — no batch save needed here

        // Always save the raw session first (safety net)
        await this.handleSaveSession();

        const minionModel = this._getMinionModel();
        const chatModel = minionModel || this.get_chat_model();

        // Try memory extraction (graceful: skip if no model available)
        try {
            if (chatModel?.stream && agentMemory) {
                const userMessages = messages.filter(m => m.role === 'user');
                if (userMessages.length >= 2) {
                    const currentBrain = await agentMemory.getBrain();
                    const extractor = new MemoryExtractor();
                    const { brainUpdates, activeContextSummary } = await extractor.extract(
                        messages,
                        currentBrain,
                        chatModel
                    );
                    await agentMemory.memoryWrite(brainUpdates, activeContextSummary);
                }
            }
            log.info('Chat', 'Memory extraction OK');
        } catch (error) {
            log.error('Chat', 'Memory extraction FAIL:', error);
        }

        // L1/L2 consolidation trigger (runs independently of extraction)
        if (agentMemory && chatModel?.stream) {
            try {
                let unconsolidated = await agentMemory.getUnconsolidatedSessions();
                while (unconsolidated.length >= 5) {
                    const l1Result = await agentMemory.createL1Summary(unconsolidated.slice(0, 5), chatModel);
                    if (!l1Result) {
                        console.warn('[ChatView] L1 creation failed, stopping consolidation (will retry next session)');
                        break;
                    }
                    unconsolidated = await agentMemory.getUnconsolidatedSessions();
                }

                let unconsolidatedL1s = await agentMemory.getUnconsolidatedL1s();
                while (unconsolidatedL1s.length >= 5) {
                    const l2Result = await agentMemory.createL2Summary(unconsolidatedL1s.slice(0, 5), chatModel);
                    if (!l2Result) {
                        console.warn('[ChatView] L2 creation failed, stopping consolidation (will retry next session)');
                        break;
                    }
                    unconsolidatedL1s = await agentMemory.getUnconsolidatedL1s();
                }
            } catch (l1l2Error) {
                log.error('Chat', 'L1/L2 consolidation FAIL:', l1l2Error);
            }
        }
        log.groupEnd();
    }

    /**
     * Get the minion model for an agent.
     * Resolution chain: minionConfig.model → agent minion config → global obsek.minionModel → null
     * Cache per agent to avoid recreating models.
     *
     * @param {Object} [agent] - Agent instance (default: active agent)
     * @param {Object} [minionConfig] - Minion config from MinionLoader
     * @returns {Object|null} SmartChatModel instance or null
     */
    _getMinionModel(agent, minionConfig) {
        const targetAgent = agent || this.plugin?.agentManager?.getActiveAgent();
        if (targetAgent?.minionEnabled === false) return null;
        return createModelForRole(this.plugin, 'minion', targetAgent, minionConfig);
    }

    /**
     * Creates a RollingWindow with optional Summarizer (lazy: uses minion or main model).
     * @returns {RollingWindow}
     */
    _createRollingWindow() {
        const maxTokens = this.env?.settings?.obsek?.maxContextTokens || 100000;
        const chatModel = this._getMinionModel() || this.get_chat_model?.();
        let summarizer = null;
        if (chatModel?.stream) {
            summarizer = new Summarizer({ chatModel });
        }
        return new RollingWindow({ maxTokens, summarizer });
    }

    // --- Agent Handlers ---

    updateAgentDropdown() {
        if (!this.agentDropdown) return;

        const agentManager = this.plugin?.agentManager;
        if (!agentManager) {
            this.agentDropdown.createEl('option', { value: '', text: 'No agents' });
            return;
        }

        // Clear existing options
        this.agentDropdown.empty();

        const agents = agentManager.getAgentListForUI();
        for (const agent of agents) {
            const opt = this.agentDropdown.createEl('option', {
                value: agent.name,
                text: `${agent.emoji} ${agent.name}`
            });
            if (agent.isActive) {
                opt.selected = true;
            }
        }
    }

    async handleAgentChange(agentName) {
        if (!agentName) return;

        const agentManager = this.plugin?.agentManager;
        if (!agentManager) return;

        // Consolidate session (extract memory + save) before switching agent
        if (this.rollingWindow.messages.length > 0) {
            await this.consolidateSession();
        }

        // Reset session tracker for the old agent before switching
        const oldMemory = agentManager.getActiveMemory();
        if (oldMemory) {
            oldMemory.startNewSession();
        }

        const switched = agentManager.switchAgent(agentName);
        if (switched) {
            this.updatePermissionsBadge();
            this.renderSkillButtons();
            // Reset work mode to new agent's default
            this.currentMode = this._getDefaultMode();
            this._applyModeChange(this.currentMode);
            // Re-render welcome if no messages
            if (this.rollingWindow.messages.length === 0) {
                this.messages_container.empty();
                this.add_welcome_message();
            }
        }
    }
}
