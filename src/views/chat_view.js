import { Agent } from '../agents/Agent.js';
import { SmartItemView } from "obsidian-smart-env/views/smart_item_view.js";
import { MarkdownRenderer, Notice } from 'obsidian';
import { RollingWindow } from '../memory/RollingWindow.js';
// SessionManager usunięty (v1.1.0) — zapis TYLKO przez AgentMemory
// import { SessionManager } from '../memory/SessionManager.js';
// RAGRetriever usunięty (v1.1.0) — memory_search i vault_search jako on-demand RAG
// import { RAGRetriever } from '../memory/RAGRetriever.js';
// import { EmbeddingHelper } from '../memory/EmbeddingHelper.js';
import { MemoryExtractor } from '../memory/MemoryExtractor.js';
import { Summarizer } from '../memory/Summarizer.js';
import chat_view_styles from './chat_view.css' with { type: 'css' };
import { createToolCallDisplay, getToolIcon } from '../components/ToolCallDisplay.js';
import { createThinkingBlock, updateThinkingBlock } from '../components/ThinkingBlock.js';
import { createSubAgentBlock, createPendingSubAgentBlock } from '../components/SubAgentBlock.js';
import { createChatTodoList } from '../components/ChatTodoList.js';
import { createPlanArtifact } from '../components/PlanArtifact.js';
import { MentionAutocomplete } from '../components/MentionAutocomplete.js';
import { AttachmentManager } from '../components/AttachmentManager.js';
import { TodoEditModal } from './TodoEditModal.js';
import { PlanEditModal } from './PlanEditModal.js';
import { log } from '../utils/Logger.js';
import { PERMISSION_TYPES } from '../core/PermissionSystem.js';
import { createModelForRole, clearModelCache } from '../utils/modelResolver.js';
import { TokenTracker } from '../utils/TokenTracker.js';
import { countTokens } from '../utils/tokenCounter.js';
import { filterToolsByMode, DEFAULT_MODE, getModeInfo, getAllModes } from '../core/WorkMode.js';
import { CrystalGenerator } from '../crystal-soul/CrystalGenerator.js';
import { IconGenerator } from '../crystal-soul/IconGenerator.js';
import { UiIcons } from '../crystal-soul/UiIcons.js';
import { pickColor } from '../crystal-soul/ColorPalette.js';
import { ConnectorGenerator } from '../crystal-soul/ConnectorGenerator.js';
import { hexToRgbTriplet } from '../crystal-soul/SvgHelper.js';
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
        // RAG usunięty — memory_search/vault_search jako on-demand RAG

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

        // Multi-agent tabs — per-agent state storage
        this.chatTabs = []; // [{agentName, isActive}]
        this._agentStates = new Map(); // agentName → {rollingWindow, tokenTracker, mode, scrollTop}
    }

    /**
     * Create a crystal SVG avatar element for an agent.
     * @param {Object} agent - Agent object (or null for default)
     * @param {number} size - Pixel size
     * @returns {HTMLElement}
     */
    _createCrystalAvatar(agent, size = 28) {
        const color = agent?.color || pickColor(agent?.name || 'default').hex;
        const name = agent?.name || 'default';
        const svgStr = CrystalGenerator.generate(name, { size, color, glow: false });
        const wrapper = document.createElement('div');
        wrapper.className = 'cs-crystal-avatar';
        wrapper.innerHTML = svgStr;
        return wrapper;
    }

    /**
     * Get the active agent's color (hex).
     * @returns {string}
     */
    _getAgentColor() {
        const agent = this.plugin?.agentManager?.getActiveAgent();
        return agent?.color || pickColor(agent?.name || 'default').hex;
    }

    /**
     * Get the active agent's color as RGB triplet for CSS rgba().
     * @returns {string} "R, G, B"
     */
    _getAgentRgb() {
        return hexToRgbTriplet(this._getAgentColor());
    }

    async initSessionManager() {
        // Auto-save timer: zapis co N minut przez AgentMemory
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
        if (!agent) return;

        let iconFn;
        if (agent.permissions.yolo_mode) {
            iconFn = (s) => UiIcons.rocket(s);
        } else if (agent.permissions.edit_notes || agent.permissions.mcp) {
            iconFn = (s) => UiIcons.shield(s);
        } else {
            iconFn = (s) => UiIcons.lock(s);
        }

        if (this.permissionsBtn) this.permissionsBtn.innerHTML = iconFn(16);
        if (this._permBtn) this._permBtn.innerHTML = iconFn(12);
    }

    async render_view(params = {}, container = this.container) {
        // Adopt chat styles (CSSStyleSheet from import)
        if (chat_view_styles && !document.adoptedStyleSheets.includes(chat_view_styles)) {
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, chat_view_styles];
        }

        container.empty();
        container.addClass('pkm-chat-view');

        // ── Initialize tabs for active agent ──
        this._initTabs();

        // ── TAB BAR (replaces old header) ──
        this._tabBarContainer = container.createDiv();
        this._renderTabBar(this._tabBarContainer);

        // Create main layout: body (row) → main (column) + slim bar
        const chatBody = container.createDiv({ cls: 'pkm-chat-body' });
        const chatMain = chatBody.createDiv({ cls: 'pkm-chat-main' });

        // Messages area (cs-root activates Crystal Soul CSS variables)
        this.messages_container = chatMain.createDiv({ cls: 'pkm-chat-messages cs-root' });
        this.render_messages();

        // ── SLIM BAR (right side, 66px) ──
        this._slimBar = chatBody.createDiv({ cls: 'cs-skillbar cs-root' });
        this._slimBar.style.setProperty('--cs-agent-color-rgb', this._getAgentRgb());
        this._renderSlimBar();

        // ── BOTTOM PANEL: input + controls ──
        const bottomPanel = chatMain.createDiv({ cls: 'cs-input-panel cs-root' });
        bottomPanel.style.setProperty('--cs-agent-color-rgb', this._getAgentRgb());

        // Textarea row
        const inputRow = bottomPanel.createDiv({ cls: 'cs-input-row' });
        this.input_area = inputRow.createEl('textarea', {
            cls: 'cs-input-textarea',
            attr: { placeholder: 'Napisz wiadomość...', rows: '1' }
        });

        // Chip bar (attachment + mention chips)
        this._chipBar = bottomPanel.createDiv({ cls: 'cs-input-chips' });

        // Separator
        bottomPanel.createDiv({ cls: 'cs-input-separator' });

        // Bottom bar: left controls + right actions
        const bar = bottomPanel.createDiv({ cls: 'cs-input-bar' });
        const barLeft = bar.createDiv({ cls: 'cs-input-bar__left' });
        const barRight = bar.createDiv({ cls: 'cs-input-bar__right' });

        // ── LEFT: Mode, Oczko, Skills, Artifacts, Permissions, Tokens ──
        // Mode selector
        const modeInfo = getModeInfo(this.currentMode);
        this._modeBtn = barLeft.createEl('button', { cls: 'cs-input-ctrl', attr: { 'aria-label': `Tryb: ${modeInfo?.label || 'Praca'}` } });
        this._modeBtn.innerHTML = this._getModeIcon(this.currentMode, 12) + `<span>${modeInfo?.label || 'Tryb'}</span>`;
        this._modeBtn.style.position = 'relative';
        this._modeBtn.addEventListener('click', (e) => { e.stopPropagation(); this._toggleModePopover(); });

        // Oczko toggle
        const oczkoBtn = barLeft.createEl('button', { cls: 'cs-input-ctrl', attr: { 'aria-label': 'Oczko — kontekst otwartej notatki' } });
        oczkoBtn.innerHTML = UiIcons.eye(12);
        if (this.env?.settings?.obsek?.enableOczko !== false) oczkoBtn.classList.add('active');
        oczkoBtn.addEventListener('click', () => {
            const obsek = this.env.settings.obsek || (this.env.settings.obsek = {});
            const newValue = obsek.enableOczko === false;
            obsek.enableOczko = newValue;
            oczkoBtn.classList.toggle('active', newValue);
            this.plugin.saveSettings();
        });

        // Skills + Artifacts are now in the slim bar (cs-skillbar)

        // Permissions
        this._permBtn = barLeft.createEl('button', { cls: 'cs-input-ctrl', attr: { 'aria-label': 'Uprawnienia' } });
        this._permBtn.innerHTML = UiIcons.shield(12);
        this._permBtn.style.position = 'relative';
        this._permBtn.addEventListener('click', (e) => { e.stopPropagation(); this._togglePermPopover(); });

        // Context % indicator
        this._tokenDisplay = barLeft.createDiv({ cls: 'cs-input-tokens', text: '0%' });

        // ── RIGHT: Attach, @, Send/Stop ──
        // Attachment button (📎)
        const attachBtnWrapper = barRight.createEl('button', { cls: 'cs-input-ctrl', attr: { 'aria-label': 'Załącznik' } });
        attachBtnWrapper.innerHTML = UiIcons.paperclip(12);

        // @ Mention button
        const mentionBtn = barRight.createEl('button', { cls: 'cs-input-ctrl', attr: { 'aria-label': 'Mention @' } });
        mentionBtn.innerHTML = UiIcons.at(12);
        mentionBtn.addEventListener('click', () => {
            // Insert @ at cursor and trigger autocomplete
            const cursorPos = this.input_area.selectionStart;
            const val = this.input_area.value;
            this.input_area.value = val.slice(0, cursorPos) + '@' + val.slice(cursorPos);
            this.input_area.selectionStart = this.input_area.selectionEnd = cursorPos + 1;
            this.input_area.focus();
            this.input_area.dispatchEvent(new Event('input'));
        });

        // Diamond send button
        this.send_button = barRight.createEl('button', { cls: 'cs-input-send' });
        this.send_button.innerHTML = UiIcons.send(12);

        // Stop button (hidden by default)
        this.stop_button = barRight.createEl('button', { cls: 'cs-input-stop hidden' });
        this.stop_button.innerHTML = '<svg viewBox="0 0 12 12" width="12" height="12"><rect x="2" y="2" width="8" height="8" rx="1" fill="currentColor"/></svg>';

        // Attachment manager — wire to chip bar
        this.attachmentManager = new AttachmentManager(this._chipBar, this.plugin, {
            onChange: () => this.handleInputResize(),
            dropZone: this.messages_container,
            pasteTarget: this.input_area,
        });
        // Wire attach button click
        attachBtnWrapper.addEventListener('click', () => {
            this.attachmentManager.getAttachButton()?.click();
        });

        // Keep toolbar ref for mode popover positioning
        this.toolbar = bar;

        // @ Mentions autocomplete — chips rendered in AttachmentManager's chip bar
        this.mentionAutocomplete = new MentionAutocomplete(this.input_area, this.plugin, {
            onChange: (mentions) => {
                this.attachmentManager.setMentionChips(mentions, (index) => {
                    this.mentionAutocomplete.removeMention(index);
                });
                this.handleInputResize();
            },
        });

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
        const el = this._tokenDisplay || this.container?.querySelector('.cs-input-tokens');
        if (!el) return;

        // Pod inputem: % okna kontekstu
        const current = this.rollingWindow.getCurrentTokenCount();
        const max = this.rollingWindow.maxTokens;
        const percent = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
        const threshold = this.env?.settings?.obsek?.summarizationThreshold || 0.9;
        const thresholdPercent = Math.round(threshold * 100);

        el.textContent = `${percent}%`;

        // Glow agent color at compression threshold
        if (percent >= thresholdPercent) {
            el.classList.add('cs-context-hot');
            el.classList.remove('cs-context-warm');
        } else if (percent >= 50) {
            el.classList.add('cs-context-warm');
            el.classList.remove('cs-context-hot');
        } else {
            el.classList.remove('cs-context-warm', 'cs-context-hot');
        }

        this._updateContextCircle();
        this._updateSlimBarTokens();
    }

    /** Update token panels — redirects to slim bar counters. */
    _updateTokenPanel() {
        this._updateSlimBarTokens();
    }

    /**
     * Renders a visible compression block in the chat when summarization happens.
     * Shows the summary text so user can see what the agent "remembers" from here.
     * @param {string} summary - Compressed summary text
     * @param {number} count - Summarization number
     * @param {number} messagesKept - How many messages were kept
     * @param {boolean} isEmergency - Was this an emergency (hard limit) summarization?
     */
    _renderCompressionBlock(summary, count, messagesKept, isEmergency = false) {
        if (!this.messages_container) return;

        const cls = isEmergency ? 'pkm-compression-block emergency' : 'pkm-compression-block';
        const block = this.messages_container.createDiv({ cls });

        const headerRow = block.createDiv({ cls: 'pkm-compression-header' });
        const compressionIcon = headerRow.createSpan({ cls: 'pkm-compression-icon' });
        compressionIcon.innerHTML = isEmergency
            ? '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M8,1 L15,14 H1 Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><line x1="8" y1="6" x2="8" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="12" r="0.8" fill="currentColor"/></svg>'
            : UiIcons.layers(14);
        headerRow.createSpan({
            cls: 'pkm-compression-label',
            text: isEmergency
                ? `Awaryjna kompresja #${count} — limit kontekstu`
                : `Kompresja kontekstu #${count}`
        });
        headerRow.createSpan({
            cls: 'pkm-compression-meta',
            text: `${messagesKept} wiadomości zachowane`
        });

        const content = block.createDiv({ cls: 'pkm-compression-content collapsed' });
        content.createDiv({ cls: 'pkm-compression-text', text: summary });

        const toggleBtn = block.createEl('button', {
            cls: 'pkm-compression-toggle',
            text: 'Pokaż podsumowanie'
        });
        toggleBtn.addEventListener('click', () => {
            const isCollapsed = content.classList.contains('collapsed');
            content.classList.toggle('collapsed');
            toggleBtn.textContent = isCollapsed ? 'Ukryj podsumowanie' : 'Pokaż podsumowanie';
        });

        const hintText = isEmergency
            ? 'Kontekst przepełniony — agent kontynuuje od tego momentu z podsumowaniem'
            : '↑ Rozmowa powyżej została skompresowana — agent widzi stąd w dół';
        block.createDiv({ cls: 'pkm-compression-hint', text: hintText });

        // Scroll to compression block
        block.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Update token counter after compression
        this.updateTokenCounter();
    }

    /**
     * Renders Phase 1 trim notification as a user-message-style bubble.
     * @param {Object} info - {trimmed, details, savedChars, tokensBefore, tokensAfterTrim, totalTrimmed}
     */
    _renderTrimBlock(info) {
        if (!this.messages_container) return;

        const block = this.messages_container.createDiv({ cls: 'cs-message cs-message--user cs-trim-bubble' });

        // Main text — header line
        const textDiv = block.createDiv({ cls: 'cs-message__text' });
        const percent = this.rollingWindow.getUsagePercent();
        const headerP = textDiv.createEl('p');
        headerP.innerHTML = `<strong>Skrócono wyniki narzędzi (Faza 1)</strong> — ${percent}% kontekstu`;

        // Collapsed details
        const detailsDiv = textDiv.createDiv({ cls: 'cs-trim-details collapsed' });

        const lines = [];
        lines.push(`Skrócono ${info.trimmed} starych wyników narzędzi (bez API call)`);
        lines.push(`Zaoszczędzono ~${info.savedChars} znaków`);
        if (info.tokensBefore && info.tokensAfterTrim) {
            lines.push(`Tokeny: ${info.tokensBefore} → ${info.tokensAfterTrim} (limit: ${this.rollingWindow.maxTokens})`);
        }
        if (info.totalTrimmed > info.trimmed) {
            lines.push(`Łącznie skrócono w tej sesji: ${info.totalTrimmed} wyników`);
        }
        if (info.details && info.details.length > 0) {
            lines.push('');
            lines.push('Skrócone narzędzia:');
            for (const d of info.details) {
                lines.push(`  - ${d.toolName} (${d.originalSize} zn.)`);
            }
        }
        detailsDiv.textContent = lines.join('\n');

        // Toggle link
        const toggleLink = textDiv.createEl('span', {
            cls: 'cs-trim-toggle',
            text: 'Pokaż szczegóły'
        });
        toggleLink.addEventListener('click', () => {
            const isCollapsed = detailsDiv.classList.contains('collapsed');
            detailsDiv.classList.toggle('collapsed');
            toggleLink.textContent = isCollapsed ? 'Ukryj szczegóły' : 'Pokaż szczegóły';
        });

        block.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.updateTokenCounter();
    }

    /**
     * Updates the context usage circle indicator.
     * Shows percentage of context window used, visible from 50%.
     */
    _updateContextCircle() {
        const wrapper = this.container?.querySelector('.token-wrapper');
        if (!wrapper) return;

        const percent = this.rollingWindow.getUsagePercent();

        // Create or find existing circle
        let circle = wrapper.querySelector('.pkm-context-circle');
        if (!circle) {
            circle = wrapper.createDiv({ cls: 'pkm-context-circle' });
            // SVG donut chart
            circle.innerHTML = `<svg viewBox="0 0 36 36" class="pkm-donut">
                <circle cx="18" cy="18" r="14" class="pkm-donut-bg" />
                <circle cx="18" cy="18" r="14" class="pkm-donut-fg"
                    stroke-dasharray="0 100"
                    transform="rotate(-90 18 18)" />
                <text x="18" y="20" class="pkm-donut-text">0%</text>
            </svg>`;
        }

        // Update values
        const fg = circle.querySelector('.pkm-donut-fg');
        const label = circle.querySelector('.pkm-donut-text');
        if (fg) {
            const circumference = 2 * Math.PI * 14; // ≈ 87.96
            fg.setAttribute('stroke-dasharray', `${percent} ${100 - percent}`);
        }
        if (label) label.textContent = `${percent}%`;

        // Color based on compression thresholds
        const trimThreshold = Math.round((this.env?.settings?.obsek?.toolTrimThreshold || 0.7) * 100);
        const summaryThreshold = Math.round((this.env?.settings?.obsek?.summarizationThreshold || 0.9) * 100);
        if (percent >= summaryThreshold) {
            circle.setAttribute('data-level', 'critical');
        } else if (percent >= trimThreshold) {
            circle.setAttribute('data-level', 'warning');
        } else {
            circle.setAttribute('data-level', 'normal');
        }

        // Show only from 50%
        circle.style.display = percent >= 50 ? 'inline-flex' : 'none';
    }

    add_welcome_message() {
        const agentManager = this.plugin?.agentManager;
        const activeAgent = agentManager?.getActiveAgent();
        const agentName = activeAgent?.name || 'PKM Assistant';

        const welcome = this.messages_container.createDiv({ cls: 'pkm-welcome-container' });
        const welcomeAvatar = welcome.createDiv({ cls: 'pkm-welcome-avatar' });
        welcomeAvatar.appendChild(this._createCrystalAvatar(activeAgent, 48));
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

        // Label
        this.skillButtonsBar.createDiv({ cls: 'cs-skillbar__label', text: 'skille' });

        // Grid
        const grid = this.skillButtonsBar.createDiv({ cls: 'cs-skillbar__grid' });

        for (const skill of skills) {
            if (skill.userInvocable === false) continue;

            const btn = grid.createDiv({
                cls: 'cs-skillbar__icon',
                attr: { 'data-tip': skill.name }
            });
            btn.innerHTML = IconGenerator.generate(skill.name, skill.icon_category || 'arcane', { size: 16, color: 'currentColor' });
            btn.addEventListener('click', () => {
                if (this.is_generating) return;

                if (skill.preQuestions?.length > 0) {
                    this._showSkillPreQuestions(skill);
                    return;
                }

                this.input_area.value = skill.prompt || `Użyj skilla: ${skill.name}`;
                this.input_area.focus();
                this.handleInputResize();
            });
        }
    }

    /**
     * Show pre-questions mini-form overlay for a skill.
     * User fills in variables, then prompt is injected with substitutions.
     */
    _showSkillPreQuestions(skill) {
        // Remove existing overlay if any
        this.skillButtonsBar?.parentElement?.querySelector('.pkm-skill-pq-overlay')?.remove();

        const overlay = document.createElement('div');
        overlay.className = 'pkm-skill-pq-overlay';
        overlay.style.cssText = 'position:absolute; bottom:100%; left:0; right:0; background:var(--background-primary); border:1px solid var(--background-modifier-border); border-radius:8px; padding:12px; margin-bottom:4px; box-shadow:0 -2px 12px rgba(0,0,0,0.15); z-index:10;';

        const title = document.createElement('div');
        title.style.cssText = 'font-weight:600; margin-bottom:8px; font-size:13px;';
        title.innerHTML = IconGenerator.generate(skill.name, skill.icon_category || 'arcane', { size: 16, color: 'currentColor' }) + ` ${skill.name}`;
        overlay.appendChild(title);

        const inputs = {};

        for (const pq of skill.preQuestions) {
            const row = document.createElement('div');
            row.style.cssText = 'margin-bottom:6px;';

            const label = document.createElement('label');
            label.style.cssText = 'display:block; font-size:12px; color:var(--text-muted); margin-bottom:2px;';
            label.textContent = pq.question;
            row.appendChild(label);

            const input = document.createElement('input');
            input.type = 'text';
            input.value = pq.default || '';
            input.placeholder = pq.key;
            input.style.cssText = 'width:100%; padding:4px 8px; font-size:13px; border:1px solid var(--background-modifier-border); border-radius:4px; background:var(--background-primary); color:var(--text-normal); box-sizing:border-box;';
            row.appendChild(input);

            inputs[pq.key] = input;
            overlay.appendChild(row);
        }

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex; gap:8px; margin-top:8px; justify-content:flex-end;';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Anuluj';
        cancelBtn.style.cssText = 'padding:4px 12px; font-size:12px; cursor:pointer;';
        cancelBtn.addEventListener('click', () => overlay.remove());
        btnRow.appendChild(cancelBtn);

        const useBtn = document.createElement('button');
        useBtn.textContent = 'Użyj';
        useBtn.className = 'mod-cta';
        useBtn.style.cssText = 'padding:4px 12px; font-size:12px; cursor:pointer;';
        useBtn.addEventListener('click', () => {
            // Collect values
            const values = {};
            for (const [key, inp] of Object.entries(inputs)) {
                values[key] = inp.value;
            }

            // Substitute variables in prompt
            let prompt = skill.prompt || `Użyj skilla: ${skill.name}`;
            prompt = prompt.replace(/\{\{(\w+)\}\}/g, (match, key) => {
                return values[key] !== undefined ? String(values[key]) : match;
            });

            this.input_area.value = prompt;
            this.input_area.focus();
            this.handleInputResize();
            overlay.remove();
        });
        btnRow.appendChild(useBtn);

        overlay.appendChild(btnRow);

        // Position overlay relative to bottom panel
        const bottomPanel = this.skillButtonsBar?.parentElement;
        if (bottomPanel) {
            bottomPanel.style.position = 'relative';
            bottomPanel.appendChild(overlay);
        }
    }

    showTypingIndicator(statusText = 'Krystalizuje...') {
        if (this.typingIndicator) {
            this.updateTypingStatus(statusText);
            return;
        }

        const activeAgent = this.plugin?.agentManager?.getActiveAgent();
        const agentColor = activeAgent?.color || pickColor(activeAgent?.name || 'default').hex;

        this.typingIndicator = this.messages_container.createDiv({ cls: 'cs-typing' });

        const crystalEl = this.typingIndicator.createDiv({ cls: 'cs-typing__crystal' });
        crystalEl.innerHTML = CrystalGenerator.generate(activeAgent?.name || 'default', { size: 20, color: agentColor, glow: true });

        this.typingStatusEl = this.typingIndicator.createSpan({ cls: 'cs-typing__text', text: statusText });

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

        // Redraw connector lines (position depends on layout)
        this._drawConnectorLines();
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
     * Get the UiIcons SVG string for a given work mode id.
     * @param {string} modeId - Mode id (rozmowa, planowanie, praca, kreatywny)
     * @param {number} size - Icon size in pixels
     * @returns {string} SVG string
     */
    _getModeIcon(modeId, size = 16) {
        switch (modeId) {
            case 'rozmowa': return UiIcons.chat(size);
            case 'planowanie': return UiIcons.clipboard(size);
            case 'praca': return UiIcons.hammer(size);
            case 'kreatywny': return UiIcons.sparkles(size);
            default: return UiIcons.chat(size);
        }
    }

    /**
     * Render the right toolbar with icon buttons.
     * Layout: TOP (general) / BOTTOM (chat-specific actions).
     */
    _renderToolbar() {
        // Toolbar is now the slim bar (cs-skillbar).
        // This method is kept as a no-op for backward compatibility.
    }

    /**
     * Render the 66px slim bar on the right side of the chat.
     * TOP: utility icons (artifacts, new chat, consolidate, save, close, tokens)
     * BOTTOM: agent skills in 2-column grid
     */
    _renderSlimBar() {
        if (!this._slimBar) return;
        this._slimBar.empty();

        // ── TOP SECTION: utility buttons ──
        const topSection = this._slimBar.createDiv({ cls: 'cs-skillbar__section' });
        topSection.createDiv({ cls: 'cs-skillbar__label', text: 'akcje' });

        // Artifacts
        const artifactBtn = topSection.createDiv({ cls: 'cs-skillbar__icon', attr: { 'data-tip': 'Artefakty' } });
        artifactBtn.innerHTML = UiIcons.clipboard(16);
        artifactBtn.addEventListener('click', () => this._toggleArtifactPanel());

        // New chat
        const newChatBtn = topSection.createDiv({ cls: 'cs-skillbar__icon', attr: { 'data-tip': 'Nowy chat' } });
        newChatBtn.innerHTML = UiIcons.refresh(16);
        newChatBtn.addEventListener('click', () => this.handleNewSession());

        // Consolidate memory
        const consolidateBtn = topSection.createDiv({ cls: 'cs-skillbar__icon', attr: { 'data-tip': 'Konsolidacja' } });
        consolidateBtn.innerHTML = UiIcons.brain(16);
        consolidateBtn.addEventListener('click', async () => {
            if (this.rollingWindow.messages.length < 2) {
                new Notice('Za mało wiadomości do konsolidacji pamięci');
                return;
            }
            consolidateBtn.style.opacity = '0.3';
            try {
                new Notice('Konsolidacja pamięci...');
                await this.consolidateSession();
                new Notice('Pamięć zapisana!');
            } catch (e) {
                console.error('[Chat] Memory consolidation failed:', e);
                new Notice('Błąd konsolidacji pamięci');
            } finally {
                consolidateBtn.style.opacity = '';
            }
        });

        // Save session
        const saveBtn = topSection.createDiv({ cls: 'cs-skillbar__icon', attr: { 'data-tip': 'Zapisz sesję' } });
        saveBtn.innerHTML = UiIcons.save(16);
        saveBtn.addEventListener('click', () => this.handleSaveSession());

        // Compress context
        const compressBtn = topSection.createDiv({ cls: 'cs-skillbar__icon', attr: { 'data-tip': 'Kompresuj' } });
        compressBtn.innerHTML = UiIcons.layers(16);
        compressBtn.addEventListener('click', async () => {
            if (this.rollingWindow.messages.length < 4) {
                new Notice('Za mało wiadomości do kompresji');
                return;
            }
            compressBtn.style.opacity = '0.3';
            try {
                const result = await this.rollingWindow.performTwoPhaseCompression(false);
                this.updateTokenCounter();
                this._updateTokenPanel();
                if (result.summarized) {
                    new Notice(`Kompresja #${this.rollingWindow.summarizationCount} (skrócono ${result.trimmed} wyników + sumaryzacja)`);
                } else if (result.trimmed > 0) {
                    new Notice(`Skrócono ${result.trimmed} wyników narzędzi (bez API call)`);
                } else {
                    new Notice('Nic do kompresji');
                }
            } catch (e) {
                console.error('[Chat] Manual compression failed:', e);
                new Notice('Błąd kompresji kontekstu');
            } finally {
                compressBtn.style.opacity = '';
            }
        });

        // Close active tab
        const closeBtn = topSection.createDiv({ cls: 'cs-skillbar__icon', attr: { 'data-tip': 'Zamknij chat' } });
        closeBtn.innerHTML = UiIcons.x(16);
        closeBtn.addEventListener('click', () => this._closeActiveTab());

        // Spacer
        this._slimBar.createDiv({ cls: 'cs-skillbar__spacer' });

        // ── BOTTOM SECTION: skills grid ──
        this.skillButtonsBar = this._slimBar.createDiv({ cls: 'cs-skillbar__section' });
        this.renderSkillButtons();
    }

    /**
     * Build a single token counter row for slim bar.
     * @param {HTMLElement} parent
     * @param {'main'|'minion'|'master'} role
     * @returns {{el: HTMLElement, valEl: HTMLElement}}
     */
    _buildTokenRow(parent, role) {
        const row = parent.createDiv({ cls: `cs-skillbar__token-row cs-skillbar__token-row--${role}` });
        const icon = row.createSpan({ cls: 'cs-skillbar__token-icon' });
        if (role === 'main') {
            // Diamond crystal for main
            icon.innerHTML = '<svg viewBox="0 0 10 10" width="8" height="8"><polygon points="5,0 10,5 5,10 0,5" fill="currentColor"/></svg>';
        } else if (role === 'minion') {
            icon.innerHTML = UiIcons.robot(8);
        } else {
            icon.innerHTML = UiIcons.crown(8);
        }
        const valEl = row.createSpan({ cls: 'cs-skillbar__token-val' });
        valEl.textContent = '0';
        return { el: row, valEl };
    }

    /**
     * Update the slim bar token display (3 counters: main/minion/master).
     * Each shows in↑ out↓ from API.
     */
    _updateSlimBarTokens() {
        if (!this._slimBarTokenMain) return;
        const s = this.tokenTracker.getSessionTotal();
        const fmt = (n) => n > 999 ? `${(n / 1000).toFixed(1)}k` : String(n);

        const update = (ref, data) => {
            const total = (data.input || 0) + (data.output || 0);
            if (total > 0) {
                ref.valEl.textContent = `${fmt(data.input)}↑${fmt(data.output)}↓`;
                ref.el.style.display = '';
            } else {
                ref.valEl.textContent = '0';
                ref.el.style.display = 'none';
            }
        };

        const main = s.byRole?.main || { input: 0, output: 0 };
        const minion = s.byRole?.minion || { input: 0, output: 0 };
        const master = s.byRole?.master || { input: 0, output: 0 };

        update(this._slimBarTokenMain, main);
        update(this._slimBarTokenMinion, minion);
        update(this._slimBarTokenMaster, master);

        // Show main always if session has any tokens
        if (s.total > 0) {
            this._slimBarTokenMain.el.style.display = '';
        }
    }

    /**
     * Close the active tab. If last tab, just clear messages.
     */
    _closeActiveTab() {
        const activeIndex = this.chatTabs.findIndex(t => t.isActive);
        if (activeIndex === -1) return;

        const activeName = this.chatTabs[activeIndex].agentName;

        // Save before closing
        if (this.rollingWindow.messages.length > 0) {
            this.handleSaveSession();
        }

        // Remove state
        this._agentStates.delete(activeName);

        if (this.chatTabs.length <= 1) {
            // Last tab — just clear it (new session)
            this.handleNewSession();
            return;
        }

        // Remove tab and switch to neighbor
        this.chatTabs.splice(activeIndex, 1);
        const newActiveIndex = Math.min(activeIndex, this.chatTabs.length - 1);
        this._switchTab(this.chatTabs[newActiveIndex].agentName);
    }

    // ── MULTI-AGENT TABS ──

    /**
     * Initialize chatTabs from the current active agent.
     * Called once in render_view. Ensures at least the active agent has a tab.
     */
    _initTabs() {
        const activeAgent = this.plugin?.agentManager?.getActiveAgent();
        const activeAgentName = activeAgent?.name || 'Jaskier';

        // If tabs are empty, create the initial tab for the active agent
        if (this.chatTabs.length === 0) {
            this.chatTabs.push({ agentName: activeAgentName, isActive: true });
        }

        // Ensure current state is stored
        if (!this._agentStates.has(activeAgentName)) {
            this._agentStates.set(activeAgentName, {
                rollingWindow: this.rollingWindow,
                tokenTracker: this.tokenTracker,
                mode: this.currentMode,
                scrollTop: 0,
            });
        }
    }

    /**
     * Render the tab bar (replaces old pkm-chat-header).
     * @param {HTMLElement} container
     */
    _renderTabBar(container) {
        container.empty();
        const topbar = container.createDiv({ cls: 'cs-chat-topbar cs-root' });
        const activeAgentColor = this._getAgentColor();
        topbar.style.setProperty('--cs-agent-color-rgb', hexToRgbTriplet(activeAgentColor));

        // Render tabs
        for (const tab of this.chatTabs) {
            const agent = this.plugin?.agentManager?.getAgent(tab.agentName);
            const color = agent?.color || pickColor(tab.agentName).hex;

            const tabEl = topbar.createDiv({
                cls: `cs-tab ${tab.isActive ? 'cs-tab--active' : ''}`
            });
            tabEl.style.setProperty('--cs-agent-color-rgb', hexToRgbTriplet(color));

            // Crystal mini
            const crystal = tabEl.createDiv({ cls: 'cs-tab__crystal' });
            crystal.innerHTML = CrystalGenerator.generate(tab.agentName, { size: 14, color });

            // Name
            tabEl.createSpan({ cls: 'cs-tab__name', text: tab.agentName });

            tabEl.addEventListener('click', () => this._switchTab(tab.agentName));
        }

        // Plus button (add agent tab)
        const addTab = topbar.createDiv({ cls: 'cs-tab cs-tab--add' });
        addTab.textContent = '+';
        addTab.addEventListener('click', () => this._openAgentPickerModal());

        // ── Token counters (right side, replaces old session controls) ──
        this._topbarTokensWrap = topbar.createDiv({ cls: 'cs-topbar-tokens' });
        this._slimBarTokenMain = this._buildTokenRow(this._topbarTokensWrap, 'main');
        this._slimBarTokenMinion = this._buildTokenRow(this._topbarTokensWrap, 'minion');
        this._slimBarTokenMaster = this._buildTokenRow(this._topbarTokensWrap, 'master');
        this._updateSlimBarTokens();
    }

    /**
     * Switch to a different agent tab.
     * Saves current agent state, restores target agent state, re-renders messages.
     * @param {string} agentName
     */
    async _switchTab(agentName) {
        const currentTab = this.chatTabs.find(t => t.isActive);
        if (currentTab?.agentName === agentName) return; // already active

        // 1. Save scroll position + state of current agent
        if (currentTab) {
            const scrollTop = this.messages_container?.scrollTop || 0;
            this._agentStates.set(currentTab.agentName, {
                rollingWindow: this.rollingWindow,
                tokenTracker: this.tokenTracker,
                mode: this.currentMode,
                scrollTop,
            });
        }

        // 2. Switch active flag
        for (const tab of this.chatTabs) {
            tab.isActive = tab.agentName === agentName;
        }

        // 3. Switch agent in AgentManager
        const agentManager = this.plugin?.agentManager;
        if (agentManager) {
            agentManager.switchAgent(agentName);
        }

        // 4. Restore or create state for new agent
        const stored = this._agentStates.get(agentName);
        if (stored) {
            this.rollingWindow = stored.rollingWindow;
            this.tokenTracker = stored.tokenTracker;
            this.currentMode = stored.mode;
        } else {
            this.rollingWindow = this._createRollingWindow();
            this.tokenTracker = new TokenTracker();
            this.currentMode = this._getDefaultMode();
            this._agentStates.set(agentName, {
                rollingWindow: this.rollingWindow,
                tokenTracker: this.tokenTracker,
                mode: this.currentMode,
                scrollTop: 0,
            });
        }

        // 5. Update UI
        this._applyModeChange(this.currentMode);
        this.updatePermissionsBadge();
        this.renderSkillButtons();
        this.updateTokenCounter();
        this._updateTokenPanel();

        // 6. Update agent color on input panel + slim bar
        const agentRgb = this._getAgentRgb();
        const bottomPanel = this.container?.querySelector('.cs-input-panel');
        if (bottomPanel) {
            bottomPanel.style.setProperty('--cs-agent-color-rgb', agentRgb);
        }
        if (this._slimBar) {
            this._slimBar.style.setProperty('--cs-agent-color-rgb', agentRgb);
            this._renderSlimBar();
        }

        // 7. Re-render messages
        this.render_messages();
        if (this.rollingWindow.messages.length === 0) {
            this.add_welcome_message();
        }

        // 8. Re-render tab bar
        if (this._tabBarContainer) {
            this._renderTabBar(this._tabBarContainer);
        }

        // 9. Restore scroll position
        if (stored?.scrollTop && this.messages_container) {
            this.messages_container.scrollTop = stored.scrollTop;
        }
    }

    /**
     * Open the agent picker modal — grid of crystal cards for agents without open tabs.
     */
    _openAgentPickerModal() {
        const agentManager = this.plugin?.agentManager;
        if (!agentManager) return;

        const allAgents = agentManager.getAllAgents();
        const openNames = new Set(this.chatTabs.map(t => t.agentName));
        const available = allAgents.filter(a => !openNames.has(a.name));

        if (available.length === 0) {
            new Notice('Wszyscy agenci mają otwarte zakładki');
            return;
        }

        // Overlay
        const overlay = document.createElement('div');
        overlay.className = 'cs-agent-picker-overlay';
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        // Modal
        const modal = overlay.appendChild(document.createElement('div'));
        modal.className = 'cs-agent-picker cs-root';

        modal.appendChild(document.createElement('div')).className = 'cs-agent-picker__title';
        modal.querySelector('.cs-agent-picker__title').textContent = 'Wybierz agenta';

        const grid = modal.appendChild(document.createElement('div'));
        grid.className = 'cs-agent-picker__grid';

        for (const agent of available) {
            const color = agent.color || pickColor(agent.name).hex;

            const card = grid.appendChild(document.createElement('div'));
            card.className = 'cs-agent-picker__card';
            card.style.setProperty('--cs-agent-color-rgb', hexToRgbTriplet(color));

            const crystalDiv = card.appendChild(document.createElement('div'));
            crystalDiv.className = 'cs-agent-picker__crystal';
            crystalDiv.innerHTML = CrystalGenerator.generate(agent.name, { size: 32, color });

            const nameDiv = card.appendChild(document.createElement('div'));
            nameDiv.className = 'cs-agent-picker__name';
            nameDiv.textContent = agent.name;

            if (agent.role) {
                const roleDiv = card.appendChild(document.createElement('div'));
                roleDiv.className = 'cs-agent-picker__role';
                roleDiv.textContent = agent.role;
            }

            card.addEventListener('click', () => {
                // Add new tab and switch to it
                this.chatTabs.push({ agentName: agent.name, isActive: false });
                overlay.remove();
                this._switchTab(agent.name);
            });
        }

        document.body.appendChild(overlay);
    }

    /**
     * Toggle the mode selector popover.
     */
    _toggleModePopover() {
        if (this._modePopover) {
            this._modePopover.remove();
            this._modePopover = null;
            return;
        }

        const modes = getAllModes();

        const popover = document.createElement('div');
        popover.className = 'cs-mode-popover';

        for (const mode of modes) {
            const item = document.createElement('div');
            item.className = 'cs-mode-popover-item';
            if (mode.id === this.currentMode) item.classList.add('active');
            item.innerHTML = `<span>${this._getModeIcon(mode.id, 14)}</span><span>${mode.label}</span>`;
            item.addEventListener('click', () => {
                this._applyModeChange(mode.id);
                popover.remove();
                this._modePopover = null;
            });
            popover.appendChild(item);
        }

        const autoChange = this.env?.settings?.obsek?.autoChangeMode || 'ask';
        const autoLabels = { off: 'Auto: wył.', ask: 'Auto: pytaj', on: 'Auto: tak' };
        const autoDiv = document.createElement('div');
        autoDiv.className = 'cs-mode-popover-auto';
        autoDiv.textContent = autoLabels[autoChange] || autoLabels.ask;
        popover.appendChild(autoDiv);

        // Position relative to mode button
        this._modeBtn.appendChild(popover);
        this._modePopover = popover;

        const closeHandler = (e) => {
            if (!popover.contains(e.target) && !this._modeBtn.contains(e.target)) {
                popover.remove();
                this._modePopover = null;
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 0);
    }

    _togglePermPopover() {
        if (this._permPopover) {
            this._permPopover.remove();
            this._permPopover = null;
            return;
        }

        const agent = this.plugin?.agentManager?.getActiveAgent();
        if (!agent) return;

        const popover = document.createElement('div');
        popover.className = 'cs-perm-popover';

        // Header
        const header = document.createElement('div');
        header.className = 'cs-perm-popover__head';
        header.innerHTML = UiIcons.shield(12) + `<span>Uprawnienia</span>`;
        popover.appendChild(header);

        // Presets
        const presets = document.createElement('div');
        presets.className = 'cs-perm-popover__presets';
        const PRESETS = {
            safe:     { label: 'Safe',     icon: UiIcons.lock(11),   perms: { read_notes: true, edit_notes: false, create_files: false, delete_files: false, mcp: false, yolo_mode: false, memory: true, guidance_mode: false } },
            standard: { label: 'Standard', icon: UiIcons.scales(11), perms: { read_notes: true, edit_notes: true,  create_files: true,  delete_files: false, mcp: true,  yolo_mode: false, memory: true, guidance_mode: false } },
            full:     { label: 'Full',     icon: UiIcons.rocket(11), perms: { read_notes: true, edit_notes: true,  create_files: true,  delete_files: true,  mcp: true,  yolo_mode: true,  memory: true, guidance_mode: false } },
        };
        for (const [key, preset] of Object.entries(PRESETS)) {
            const btn = document.createElement('button');
            btn.className = `cs-perm-popover__preset cs-perm-popover__preset--${key}`;
            btn.innerHTML = `${preset.icon}<span>${preset.label}</span>`;
            btn.addEventListener('click', () => {
                agent.update({ default_permissions: preset.perms });
                this.plugin?.agentManager?.loader?.saveAgent(agent);
                // Re-render popover to reflect new state
                this._permPopover?.remove();
                this._permPopover = null;
                this._togglePermPopover();
            });
            presets.appendChild(btn);
        }
        popover.appendChild(presets);

        // Separator
        const sep = document.createElement('div');
        sep.className = 'cs-perm-popover__sep';
        popover.appendChild(sep);

        // Permission rows
        const PERM_ROWS = [
            { key: PERMISSION_TYPES.READ_NOTES,    label: 'Czytanie notatek',  icon: UiIcons.eye(11) },
            { key: PERMISSION_TYPES.EDIT_NOTES,    label: 'Edycja notatek',    icon: UiIcons.edit(11) },
            { key: PERMISSION_TYPES.CREATE_FILES,  label: 'Tworzenie plików',  icon: UiIcons.file(11) },
            { key: PERMISSION_TYPES.DELETE_FILES,  label: 'Usuwanie plików',   icon: UiIcons.trash(11) },
            { key: PERMISSION_TYPES.MCP,           label: 'Narzędzia MCP',     icon: UiIcons.tool(11) },
            { key: PERMISSION_TYPES.YOLO_MODE,     label: 'YOLO mode',         icon: UiIcons.rocket(11) },
            { key: 'memory',                        label: 'Pamięć',            icon: UiIcons.brain(11) },
            { key: 'guidance_mode',                 label: 'Guidance mode',     icon: UiIcons.compass(11) },
        ];

        for (const row of PERM_ROWS) {
            const rowEl = document.createElement('div');
            rowEl.className = 'cs-perm-popover__row';

            const labelEl = document.createElement('div');
            labelEl.className = 'cs-perm-popover__label';
            labelEl.innerHTML = `${row.icon}<span>${row.label}</span>`;

            // Crystal toggle
            const toggle = document.createElement('div');
            toggle.className = 'cs-perm-toggle' + (agent.permissions[row.key] ? ' cs-perm-toggle--on' : '');
            const thumb = document.createElement('div');
            thumb.className = 'cs-perm-toggle__thumb';
            toggle.appendChild(thumb);

            toggle.addEventListener('click', () => {
                const newVal = !agent.permissions[row.key];
                agent.permissions[row.key] = newVal;
                agent.update({ default_permissions: { ...agent.permissions } });
                this.plugin?.agentManager?.loader?.saveAgent(agent);
                toggle.classList.toggle('cs-perm-toggle--on', newVal);
            });

            rowEl.appendChild(labelEl);
            rowEl.appendChild(toggle);
            popover.appendChild(rowEl);
        }

        this._permBtn.appendChild(popover);
        this._permPopover = popover;

        const closeHandler = (e) => {
            if (!popover.contains(e.target) && !this._permBtn.contains(e.target)) {
                popover.remove();
                this._permPopover = null;
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
        const artifactTitleIcon = header.createSpan({ cls: 'pkm-artifact-panel-title-icon' });
        artifactTitleIcon.innerHTML = UiIcons.clipboard(16);
        header.createSpan({ text: ' Artefakty' });
        const closeBtn = header.createEl('button', { cls: 'pkm-artifact-panel-close', text: '×' });
        closeBtn.addEventListener('click', () => this._toggleArtifactPanel());

        // List
        const list = panel.createDiv({ cls: 'pkm-artifact-panel-list' });
        const todoStore = this.plugin._chatTodoStore;
        const planStore = this.plugin._planStore;
        let hasItems = false;

        // --- TODO section ---
        if (todoStore?.size > 0) {
            const todoSectionTitle = list.createDiv({ cls: 'pkm-artifact-panel-section' });
            todoSectionTitle.innerHTML = UiIcons.clipboard(14) + ' Listy TODO';
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
                const copyBtn = actions.createEl('button', { cls: 'pkm-artifact-panel-action', attr: { 'aria-label': 'Kopiuj do vaulta' } });
                copyBtn.innerHTML = UiIcons.copy(14);
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
                const delBtn = actions.createEl('button', { cls: 'pkm-artifact-panel-action pkm-artifact-panel-action-danger', attr: { 'aria-label': 'Usuń artefakt' } });
                delBtn.innerHTML = '<svg viewBox="0 0 14 14" width="14" height="14"><path d="M3,4 V12 A1,1 0 0,0 4,13 H10 A1,1 0 0,0 11,12 V4" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M2,4 H12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M5,4 V2.5 A0.5,0.5 0 0,1 5.5,2 H8.5 A0.5,0.5 0 0,1 9,2.5 V4" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';
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
            const planSectionTitle = list.createDiv({ cls: 'pkm-artifact-panel-section' });
            planSectionTitle.innerHTML = UiIcons.clipboard(14) + ' Plany';
            for (const [id, plan] of planStore) {
                hasItems = true;
                const item = list.createDiv({ cls: 'pkm-artifact-panel-item' });
                const info = item.createDiv({ cls: 'pkm-artifact-panel-item-info' });

                const done = plan.steps?.filter(s => s.status === 'done').length || 0;
                const total = plan.steps?.length || 0;
                const titleSpan = info.createSpan({ cls: 'pkm-artifact-panel-item-title' });
                const planIconSvg = plan.approved
                    ? '<svg viewBox="0 0 14 14" width="14" height="14"><polyline points="3,7 6,10 11,4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> '
                    : UiIcons.clipboard(14) + ' ';
                titleSpan.innerHTML = planIconSvg + (plan.title || 'Plan');
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
                const copyBtn = actions.createEl('button', { cls: 'pkm-artifact-panel-action', attr: { 'aria-label': 'Kopiuj do vaulta' } });
                copyBtn.innerHTML = UiIcons.copy(14);
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
                const delBtn = actions.createEl('button', { cls: 'pkm-artifact-panel-action pkm-artifact-panel-action-danger', attr: { 'aria-label': 'Usuń artefakt' } });
                delBtn.innerHTML = '<svg viewBox="0 0 14 14" width="14" height="14"><path d="M3,4 V12 A1,1 0 0,0 4,13 H10 A1,1 0 0,0 11,12 V4" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M2,4 H12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M5,4 V2.5 A0.5,0.5 0 0,1 5.5,2 H8.5 A0.5,0.5 0 0,1 9,2.5 V4" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';
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
        // @ mention autocomplete takes priority when open
        if (this.mentionAutocomplete?.isOpen) {
            if (['ArrowUp', 'ArrowDown', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
                return; // MentionAutocomplete handles these via its own keydown listener
            }
        }

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
     * Render an inline ask_user question block with clickable options.
     * Returns the DOM element. Sets up promise for AskUserTool to await.
     */
    _renderAskUserBlock(toolCall, container) {
        let args = toolCall.arguments;
        if (typeof args === 'string') {
            try { args = JSON.parse(args); } catch { args = {}; }
        }
        const question = args.question || 'Agent pyta...';
        const options = args.options || [];
        const context = args.context || '';

        const block = document.createElement('div');
        block.addClass('cs-ask-user');

        // Header
        const head = block.createDiv({ cls: 'cs-ask-user__head' });
        const iconEl = head.createSpan({ cls: 'cs-ask-user__icon' });
        iconEl.innerHTML = UiIcons.question(14);
        head.createSpan({ text: 'Pytanie', cls: 'cs-ask-user__label' });

        // Context
        if (context) {
            block.createDiv({ text: context, cls: 'cs-ask-user__context' });
        }

        // Question
        block.createDiv({ text: question, cls: 'cs-ask-user__question' });

        // Options
        const optionsWrap = block.createDiv({ cls: 'cs-ask-user__options' });
        let selectedOption = null;

        for (const opt of options) {
            const optBtn = optionsWrap.createEl('button', { text: opt, cls: 'cs-ask-user__opt' });
            optBtn.addEventListener('click', () => {
                optionsWrap.querySelectorAll('.cs-ask-user__opt').forEach(b => b.removeClass('selected'));
                optBtn.addClass('selected');
                selectedOption = opt;
                customInput.value = '';
            });
        }

        // Custom input
        const customRow = block.createDiv({ cls: 'cs-ask-user__custom' });
        const customInput = customRow.createEl('input', {
            type: 'text',
            placeholder: 'Własna odpowiedź...',
            cls: 'cs-ask-user__input'
        });
        customInput.addEventListener('input', () => {
            if (customInput.value.trim()) {
                optionsWrap.querySelectorAll('.cs-ask-user__opt').forEach(b => b.removeClass('selected'));
                selectedOption = null;
            }
        });

        // Submit
        const submitBtn = block.createEl('button', { text: 'Odpowiedz', cls: 'cs-ask-user__submit' });

        // Promise for AskUserTool to await
        let resolveAnswer;
        this.plugin._askUserPromise = new Promise(resolve => { resolveAnswer = resolve; });
        this.plugin._askUserResolve = resolveAnswer;

        submitBtn.addEventListener('click', () => {
            const answer = customInput.value.trim() || selectedOption || (options.length > 0 ? options[0] : 'OK');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Wysłano';
            customInput.disabled = true;
            optionsWrap.querySelectorAll('.cs-ask-user__opt').forEach(b => { b.disabled = true; });
            block.createDiv({ text: `Odpowiedź: ${answer}`, cls: 'cs-ask-user__answer' });
            if (this.plugin._askUserResolve) {
                this.plugin._askUserResolve(answer);
            }
        });

        return block;
    }

    /**
     * Extract text from multimodal content blocks array.
     * @param {Array} blocks - Content blocks array [{type:'text',text:...}, {type:'image_url',...}]
     * @returns {string}
     */
    _contentBlocksToText(blocks) {
        if (!Array.isArray(blocks)) return String(blocks || '');
        return blocks
            .filter(b => b.type === 'text')
            .map(b => b.text)
            .join('\n');
    }

    /**
     * Render multimodal user content (text + image thumbnails).
     * @param {HTMLElement} container
     * @param {Array} contentBlocks
     * @param {string} displayText
     */
    _renderMultimodalUserContent(container, contentBlocks, displayText) {
        // Text part
        container.createEl('p', { text: displayText });

        // Image thumbnails
        const images = contentBlocks.filter(b => b.type === 'image_url');
        if (images.length > 0) {
            const thumbRow = container.createDiv({ cls: 'pkm-attachment-thumbs' });
            for (const img of images) {
                const thumbEl = thumbRow.createEl('img', {
                    cls: 'pkm-attachment-thumb',
                    attr: {
                        src: img.image_url.url,
                        alt: 'Załączony obraz',
                    },
                });
                // Click to view full size
                thumbEl.addEventListener('click', () => {
                    const overlay = document.createElement('div');
                    overlay.className = 'pkm-image-overlay';
                    const fullImg = overlay.createEl('img', { attr: { src: img.image_url.url } });
                    overlay.addEventListener('click', () => overlay.remove());
                    document.body.appendChild(overlay);
                });
            }
        }
    }

    /**
     * Resolve @ mentions in user text.
     * V3: Lightweight references only — no file reading.
     * Agent decides whether to vault_read or delegate to minion.
     *
     * @param {string} text - Raw user input
     * @returns {Promise<{displayText: string, contextText: string}>}
     *   displayText: user text with chip labels
     *   contextText: reference list for agent (paths only, no content)
     */
    async _resolveMentions(text) {
        const mentionChips = this.mentionAutocomplete?.getMentions() || [];

        if (mentionChips.length === 0) {
            return { displayText: text, contextText: '' };
        }

        const refs = [];

        for (const m of mentionChips) {
            try {
                // Check AccessGuard
                const { AccessGuard } = await import('../core/AccessGuard.js');
                if (AccessGuard._isNoGo && AccessGuard._isNoGo(m.path)) {
                    log.warn('MentionResolve', `No-Go zone: ${m.path}`);
                    continue;
                }

                if (m.type === 'folder') {
                    const folder = this.app.vault.getAbstractFileByPath(m.path);
                    const fileCount = folder?.children?.filter(f => f.extension === 'md').length || 0;
                    refs.push(`- 📁 Folder: "${m.path}" (${fileCount} notatek)`);
                } else {
                    let file = this.app.vault.getAbstractFileByPath(m.path);
                    if (!file) file = this.app.vault.getAbstractFileByPath(m.path + '.md');
                    const size = file?.stat?.size ? `${Math.round(file.stat.size / 1024)}KB` : '?';
                    refs.push(`- 📄 Notatka: "${file?.path || m.path}" (${size})`);
                }
            } catch (err) {
                log.error('MentionResolve', `Błąd dla ${m.path}:`, err);
            }
        }

        // displayText = raw user text (with inline @[Name] markers visible)
        const displayText = text;

        // Build lightweight context — agent reads content via vault_read when needed
        const contextText = refs.length > 0
            ? `User wskazał następujące pliki/foldery (użyj vault_read żeby przeczytać potrzebne, lub oddeleguj minionowi):\n${refs.join('\n')}`
            : '';

        return { displayText, contextText };
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
                await this.handleSaveSession();
                const agentMem = this.plugin?.agentManager?.getActiveMemory();
                if (agentMem) agentMem.startNewSession();
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
            if (command === '/memory') {
                if (this.rollingWindow.messages.length >= 2) {
                    new Notice('Konsolidacja pamięci...');
                    await this.consolidateSession();
                    new Notice('Pamięć zapisana!');
                } else {
                    new Notice('Za mało wiadomości do konsolidacji');
                }
                this.resetInputArea();
                return;
            }
            if (command === '/compress') {
                if (this.rollingWindow.messages.length >= 4) {
                    const result = await this.rollingWindow.performTwoPhaseCompression(false);
                    this.updateTokenCounter();
                    this._updateTokenPanel();
                    if (result.summarized) {
                        new Notice(`Kompresja #${this.rollingWindow.summarizationCount} (skrócono ${result.trimmed} wyników + sumaryzacja)`);
                    } else if (result.trimmed > 0) {
                        new Notice(`Skrócono ${result.trimmed} wyników narzędzi`);
                    } else {
                        new Notice('Kontekst poniżej progu kompresji');
                    }
                } else {
                    new Notice('Za mało wiadomości do kompresji');
                }
                this.resetInputArea();
                return;
            }
        }

        // Add to history (max 20)
        this.inputHistory.push(text);
        if (this.inputHistory.length > 20) {
            this.inputHistory.shift();
        }

        // Resolve @ mentions ONCE, before any clearing (fixes bug: mentions lost when no attachments)
        const { displayText: mentionDisplayText, contextText: mentionContextText } = await this._resolveMentions(text);

        // Capture attachments before clearing
        const hasAttachments = this.attachmentManager?.hasAttachments();
        let attachmentResult = null;
        if (hasAttachments) {
            const textWithMentions = mentionContextText ? mentionContextText + '\n\n' + mentionDisplayText : mentionDisplayText;
            attachmentResult = this.attachmentManager.buildMessageContent(textWithMentions);
        }

        // Clear input + attachments + mention chips
        this.resetInputArea();
        if (hasAttachments) this.attachmentManager.clear();
        if (this.mentionAutocomplete?.hasMentions()) this.mentionAutocomplete.clear();

        if (hasAttachments && attachmentResult) {
            // Attachments present: content may be array (multimodal) or string
            // Display: user's text with @[Name] badges (no mention metadata)
            await this.append_message('user', attachmentResult.content, mentionDisplayText);
        } else {
            // No attachments: API gets mention context, display shows only user text
            const apiContent = mentionContextText ? mentionContextText + '\n\n' + mentionDisplayText : mentionDisplayText;
            await this.append_message('user', apiContent, mentionContextText ? mentionDisplayText : undefined);
        }

        // Toggle UI state
        this.set_generating(true);

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

        // Auto-prep usunięty (v1.1.0) — agent sam decyduje kiedy pytać miniona via minion_task
        const activeAgent = this.plugin?.agentManager?.getActiveAgent();

        // === SNAPSHOT for "Pokaż prompt" in Settings ===
        if (this.plugin) {
            this.plugin._lastSentSnapshot = {
                systemPrompt: this.rollingWindow.baseSystemPrompt,
                conversationSummary: this.rollingWindow.conversationSummary || '',
                lastUserMessage: text,
                timestamp: Date.now(),
                mode: this.currentMode,
                agentName: activeAgent?.name || '',
                agentEmoji: '',
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

        // Cache tool definitions token count w RollingWindow (do dokładnego liczenia kontekstu)
        if (tools.length > 0) {
            this.rollingWindow.setToolDefinitionsTokens(countTokens(JSON.stringify(tools)));
        } else {
            this.rollingWindow.setToolDefinitionsTokens(0);
        }

        try {
            // Get or create chat model
            const chat_model = this.get_chat_model();
            if (!chat_model?.stream) {
                throw new Error('Chat model not configured. Please configure API key in Settings → Obsek.');
            }
            log.timing('Chat', `TOTAL send→stream (model: ${chat_model.model_key || 'unknown'}, msgs: ${messages.length}, tools: ${tools.length})`, sendStart);

            // Count input tokens from text (always works, no API dependency)
            const inputText = messages.map(m => {
                if (typeof m.content === 'string') return m.content;
                if (Array.isArray(m.content)) return m.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
                return '';
            }).join('\n');
            this._lastInputTokens = countTokens(inputText);

            // Start streaming with tools
            this._agentHeaderShown = false;
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
            // Create .cs-message--agent container
            const streamAgent = this.plugin?.agentManager?.getActiveAgent();
            const streamColor = streamAgent?.color || pickColor(streamAgent?.name || 'default').hex;
            const agentName = streamAgent?.name || 'Agent';

            this.current_message_container = this.messages_container.createDiv({
                cls: 'cs-message cs-message--agent'
            });
            this.current_message_container.style.setProperty('--cs-agent-color-rgb', hexToRgbTriplet(streamColor));

            // Agent header (crystal + name) — only once per agent turn
            if (!this._agentHeaderShown) {
                const head = this.current_message_container.createDiv({ cls: 'cs-message__agent-head' });
                const crystalEl = head.createDiv({ cls: 'cs-message__agent-crystal' });
                crystalEl.innerHTML = CrystalGenerator.generate(agentName, { size: 18, color: streamColor, glow: false });
                head.createSpan({ cls: 'cs-message__agent-name', text: agentName });
                this._agentHeaderShown = true;
            }

            // Tool calls wrapper (actions will be inserted here)
            this.current_message_bubble = this.current_message_container.createDiv({ cls: 'cs-tool-calls-wrapper' });

            // Text content area
            this.current_message_text = this.current_message_container.createDiv({
                cls: 'cs-message__text'
            });
        }

        // Get content from response
        const content = response?.choices?.[0]?.message?.content || '';
        const reasoningContent = response?.choices?.[0]?.message?.reasoning_content || '';

        // Render thinking block if reasoning_content present
        const showThinking = this.env?.settings?.obsek?.showThinking ?? true;
        if (showThinking && reasoningContent.length > 0) {
            if (!this._currentThinkingBlock) {
                this._currentThinkingBlock = createThinkingBlock(reasoningContent, true);
                // Insert thinking row BEFORE tool calls wrapper (correct order: thinking → tools → text)
                this.current_message_container.insertBefore(
                    this._currentThinkingBlock,
                    this.current_message_bubble
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
        // Note: parseToolCalls already handles choices[0].message.tool_calls and splits concatenated calls.
        // This fallback is for response objects with tool_calls directly on root (rare).
        if (response?.tool_calls?.length > 0) {
            for (const tc of response.tool_calls) {
                toolCalls.push({
                    id: tc.id,
                    name: tc.function?.name || tc.name,
                    arguments: tc.function?.arguments || tc.arguments
                });
            }
        }

        // Safety: run split on all collected calls via MCPClient (handles DeepSeek concatenation)
        if (this.plugin?.mcpClient?._trySplitConcatenatedToolCall && toolCalls.length > 0) {
            const expanded = [];
            for (const tc of toolCalls) {
                expanded.push(...this.plugin.mcpClient._trySplitConcatenatedToolCall(tc));
            }
            toolCalls.length = 0;
            toolCalls.push(...expanded);
        }

        // Check for tool calls in response
        if (toolCalls.length > 0) {
            log.info('Chat', `Tool calls: ${toolCalls.length} → ${toolCalls.map(tc => tc.name).join(', ')}`);

            // Ensure we have a container (CS agent message)
            if (!this.current_message_container) {
                const streamAgent = this.plugin?.agentManager?.getActiveAgent();
                const streamColor = streamAgent?.color || pickColor(streamAgent?.name || 'default').hex;
                const agName = streamAgent?.name || 'Agent';

                this.current_message_container = this.messages_container.createDiv({
                    cls: 'cs-message cs-message--agent'
                });
                this.current_message_container.style.setProperty('--cs-agent-color-rgb', hexToRgbTriplet(streamColor));

                if (!this._agentHeaderShown) {
                    const head = this.current_message_container.createDiv({ cls: 'cs-message__agent-head' });
                    const crystalEl = head.createDiv({ cls: 'cs-message__agent-crystal' });
                    crystalEl.innerHTML = CrystalGenerator.generate(agName, { size: 18, color: streamColor, glow: false });
                    head.createSpan({ cls: 'cs-message__agent-name', text: agName });
                    this._agentHeaderShown = true;
                }

                this.current_message_bubble = this.current_message_container.createDiv({ cls: 'cs-tool-calls-wrapper' });
                this.current_message_text = this.current_message_container.createDiv({ cls: 'cs-message__text' });
            }

            // Use existing tool calls wrapper or create one
            const toolCallsContainer = this.current_message_bubble || this.current_message_container.createDiv({ cls: 'cs-tool-calls-wrapper' });

            const toolResults = [];
            const agentName = this.plugin?.agentManager?.getActiveAgent()?.name || 'unknown';

            // Tool status messages in Polish (no emoji)
            const TOOL_STATUS = {
                vault_search: 'Szukam w vaultcie...',
                vault_read: 'Czytam notatkę...',
                vault_list: 'Przeglądam foldery...',
                vault_write: 'Zapisuję...',
                vault_delete: 'Usuwam...',
                memory_search: 'Przeszukuję pamięć...',
                memory_update: 'Aktualizuję pamięć...',
                memory_status: 'Sprawdzam pamięć...',
                skill_list: 'Sprawdzam umiejętności...',
                skill_execute: 'Aktywuję skill...',
                minion_task: 'Delegowanie do miniona...',
                master_task: 'Konsultuje z ekspertem...',
                chat_todo: 'Aktualizuję listę zadań...',
                plan_action: 'Aktualizuję plan...',
            };

            // ── PHASE 1: Create ALL pending UI blocks (sync) ──
            const pendingEntries = toolCalls.map(toolCall => {
                const isSubAgent = toolCall.name === 'minion_task' || toolCall.name === 'master_task';
                const isAskUser = toolCall.name === 'ask_user';
                let toolDisplay;
                if (isAskUser) {
                    // Render inline question block with clickable options
                    this.hideTypingIndicator();
                    toolDisplay = this._renderAskUserBlock(toolCall, toolCallsContainer);
                } else if (isSubAgent) {
                    this.hideTypingIndicator();
                    const _subArgs = typeof toolCall.arguments === 'string' ? (() => { try { return JSON.parse(toolCall.arguments); } catch { return {}; } })() : (toolCall.arguments || {});
                    const _subName = _subArgs.minion || _subArgs.master || '';
                    toolDisplay = createPendingSubAgentBlock(toolCall.name, _subName);
                } else {
                    const statusMsg = TOOL_STATUS[toolCall.name] || `${toolCall.name}...`;
                    this.showTypingIndicator(statusMsg);
                    toolDisplay = createToolCallDisplay({
                        name: toolCall.name,
                        input: toolCall.arguments,
                        status: 'pending'
                    });
                }
                toolCallsContainer.appendChild(toolDisplay);
                if (isSubAgent || isAskUser) toolDisplay.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
                    const _saArgs = typeof toolCall.arguments === 'string'
                        ? (() => { try { return JSON.parse(toolCall.arguments); } catch { return {}; } })()
                        : (toolCall.arguments || {});
                    const taskQuery = _saArgs.task || '';
                    const _saName = _saArgs.minion || _saArgs.master || '';
                    const role = toolCall.name === 'minion_task' ? 'minion' : 'master';

                    const subInput = result.usage?.prompt_tokens || countTokens(taskQuery);
                    const subOutput = result.usage?.completion_tokens || countTokens(typeof result.result === 'string' ? result.result : '');
                    if (subInput > 0 || subOutput > 0) {
                        this.tokenTracker.record(role, subInput, subOutput);
                        this._updateTokenPanel();
                    }

                    const fullBlock = createSubAgentBlock({
                        type: toolCall.name,
                        agentName: _saName,
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
                    const _saErrArgs = typeof toolCall.arguments === 'string'
                        ? (() => { try { return JSON.parse(toolCall.arguments); } catch { return {}; } })()
                        : (toolCall.arguments || {});
                    const errorBlock = createSubAgentBlock({
                        type: toolCall.name,
                        agentName: _saErrArgs.minion || _saErrArgs.master || '',
                        query: _saErrArgs.task || '',
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
                        linkDiv.addClass('cs-vault-link');
                        const link = document.createElement('a');
                        link.innerHTML = UiIcons.file(14) + ` ${writePath}`;
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
            // MUST use PARSED toolCalls (not raw response!) because raw may have concatenated
            // names from DeepSeek Reasoner (e.g. "minion_taskminion_task" → 2 separate calls).
            // The tool_call IDs must match the tool_call_ids in tool result messages.
            const apiToolCalls = toolCalls.map(tc => ({
                id: tc.id,
                type: 'function',
                function: {
                    name: tc.name,
                    arguments: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments)
                }
            }));
            const toolMsgMeta = { tool_calls: apiToolCalls };
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


        // No tool calls - normal completion (TASK COMPLETE)
        log.info('Chat', `Odpowiedź GOTOWA: ${content.length} znaków (bez tool calls)`);
        const timestamp = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        const idx = this.rollingWindow.messages.length; // Will be the index after adding
        await this.rollingWindow.addMessage('assistant', content, { timestamp });
        this.updateTokenCounter();

        // Add timestamp and actions to the streamed message
        if (this.current_message_container) {
            // Add meta bar (hover: timestamp + actions)
            const meta = this.current_message_container.createDiv({ cls: 'cs-message__meta' });
            meta.createSpan({ text: timestamp });
            this.addMessageActions(meta, content, 'assistant', idx);

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

        // DWUFAZOWA KOMPRESJA PO zakończeniu taska (jak Claude Code):
        // Faza 1: skróć stare wyniki narzędzi (darmowe, bez API call)
        // Faza 2: pełna sumaryzacja (drogie) — tylko jeśli Faza 1 nie wystarczyła
        const compressionNeeded = this.rollingWindow.getCompressionNeeded();
        if (compressionNeeded !== 'none') {
            log.info('Chat', `Kompresja (${compressionNeeded}) — kontekst: ${this.rollingWindow.getCurrentTokenCount()} / ${this.rollingWindow.maxTokens} tokenów`);

            if (compressionNeeded === 'summarize') {
                // Faza 2 będzie potrzebna — zapisz pełną rozmowę przed sumaryzacją
                await this.handleSaveSession();
                const sessionPath = this.plugin?.agentManager?.getActiveMemory()?.activeSessionPath || '';
                this.rollingWindow.sessionPath = sessionPath;
            }

            const result = await this.rollingWindow.performTwoPhaseCompression(false);

            if (result.trimmed > 0 && !result.summarized) {
                log.info('Chat', `Faza 1 wystarczyła: skrócono ${result.trimmed} wyników, bez API call`);
            }

            this.updateTokenCounter();
            this._updateTokenPanel();
        }
    }

    /**
     * Render a delegation button after agent proposes switching to another agent
     * @param {HTMLElement} container
     * @param {Object} data - Delegation data from agent_delegate tool
     */
    _renderDelegationButton(container, data) {
        const div = container.createDiv({ cls: 'pkm-delegation-proposal' });
        div.createEl('p', {
            text: data.reason || `Proponuję przekazać rozmowę do ${data.to_name}`,
            cls: 'pkm-delegation-reason'
        });
        const btn = div.createEl('button', {
            text: `Przejdź do ${data.to_name}`,
            cls: 'pkm-delegation-btn'
        });
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            btn.textContent = 'Przełączam...';
            // Tylko zapisz sesję — BEZ konsolidacji (v1.1.0)
            if (this.rollingWindow.messages.length > 0) {
                await this.handleSaveSession();
            }
            // Use tab system for agent switch
            await this.handleAgentChange(data.to_agent);
            const switched = !!this.plugin.agentManager?.getActiveAgent();
            if (switched) {

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
        // Update mode button in input bar
        if (this._modeBtn) {
            this._modeBtn.innerHTML = this._getModeIcon(newMode, 12) + `<span>${info.label}</span>`;
            this._modeBtn.setAttribute('aria-label', `Tryb: ${info.label}`);
        }
        new Notice(`Tryb: ${info.label}`);
        log.info('Chat', `Mode changed → ${newMode}`);
    }

    /**
     * Render mode change proposal button (auto-change=ask).
     * @param {HTMLElement} container
     * @param {Object} data - { mode, label, icon, reason }
     */
    _renderModeChangeButton(container, data) {
        const modeInfo = getModeInfo(data.mode);
        const label = data.label || modeInfo?.label || data.mode;
        const div = container.createDiv({ cls: 'pkm-mode-proposal' });
        div.createEl('p', {
            text: data.reason || `Proponuję zmianę trybu na ${label}`,
            cls: 'pkm-mode-proposal-reason'
        });
        const btn = div.createEl('button', { cls: 'pkm-mode-proposal-btn' });
        btn.innerHTML = `${this._getModeIcon(data.mode, 12)}<span>Przełącz na ${label}</span>`;
        btn.addEventListener('click', () => {
            btn.disabled = true;
            btn.innerHTML = `<span>Zmieniono!</span>`;
            this._applyModeChange(data.mode);
            // Auto-continue: budzimy agenta żeby kontynuował poprzednie zadanie
            const confirmedLabel = modeInfo?.label || label;
            this.input_area.value = `[System] Tryb zmieniony na "${confirmedLabel}". Kontynuuj poprzednie zadanie.`;
            setTimeout(() => this.send_message(), 300);
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

        // Update tool definitions token count for continuation calls
        if (tools.length > 0) {
            this.rollingWindow.setToolDefinitionsTokens(countTokens(JSON.stringify(tools)));
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
                cls: 'cs-message cs-message--agent'
            });
            error_msg.style.setProperty('--cs-agent-color-rgb', this._getAgentRgb());
            const textDiv = error_msg.createDiv({ cls: 'cs-message__text' });
            textDiv.createEl('p', { text: `Error: ${error.message || 'Unknown error occurred'}`, cls: 'pkm-chat-error' });
        }

        this.set_generating(false);
    }

    stop_generation() {
        if (this.env.smart_chat_model?.stop_stream) {
            this.env.smart_chat_model.stop_stream();
        }
        this.set_generating(false);
    }

    /**
     * Append a message to chat history and render it.
     * @param {string} role - 'user' | 'assistant'
     * @param {string|Array} content - Text string or multimodal content blocks array
     * @param {string} [displayText] - Optional display text for UI (when content is array)
     */
    async append_message(role, content, displayText) {
        const timestamp = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

        // Add to history with timestamp
        await this.rollingWindow.addMessage(role, content, { timestamp });
        this.updateTokenCounter();

        // Determine what to show in UI vs what goes to API
        const uiText = displayText || (typeof content === 'string' ? content : this._contentBlocksToText(content));
        const activeAgent = this.plugin?.agentManager?.getActiveAgent();
        const agentColor = activeAgent?.color || pickColor(activeAgent?.name || 'default').hex;
        const agentRgb = hexToRgbTriplet(agentColor);
        const idx = this.rollingWindow.messages.length - 1;

        if (role === 'user') {
            const userDiv = this.messages_container.createDiv({ cls: 'cs-message cs-message--user' });
            userDiv.style.setProperty('--cs-agent-color-rgb', agentRgb);
            const textDiv = userDiv.createDiv({ cls: 'cs-message__text' });
            if (Array.isArray(content)) {
                this._renderMultimodalUserContent(textDiv, content, uiText);
            } else {
                this._renderUserText(textDiv, uiText);
            }
            const meta = userDiv.createDiv({ cls: 'cs-message__meta' });
            meta.createSpan({ text: timestamp });
            this.addMessageActions(meta, uiText, 'user', idx);
            this._agentHeaderShown = false;
        } else {
            const agentDiv = this.messages_container.createDiv({ cls: 'cs-message cs-message--agent' });
            agentDiv.style.setProperty('--cs-agent-color-rgb', agentRgb);
            if (!this._agentHeaderShown) {
                const head = agentDiv.createDiv({ cls: 'cs-message__agent-head' });
                const crystalEl = head.createDiv({ cls: 'cs-message__agent-crystal' });
                crystalEl.innerHTML = CrystalGenerator.generate(activeAgent?.name || 'Agent', { size: 18, color: agentColor, glow: false });
                head.createSpan({ cls: 'cs-message__agent-name', text: activeAgent?.name || 'Agent' });
                this._agentHeaderShown = true;
            }
            const textDiv = agentDiv.createDiv({ cls: 'cs-message__text' });
            MarkdownRenderer.renderMarkdown(uiText, textDiv, '', this);
            const meta = agentDiv.createDiv({ cls: 'cs-message__meta' });
            meta.createSpan({ text: timestamp });
            this.addMessageActions(meta, uiText, 'assistant', idx);
        }

        // Scroll to bottom
        this.scrollToBottom();
    }

    render_messages() {
        this.messages_container.empty();
        const agent = this.plugin?.agentManager?.getActiveAgent();
        const agentColor = agent?.color || pickColor(agent?.name || 'default').hex;
        const agentRgb = hexToRgbTriplet(agentColor);
        const agentName = agent?.name || 'Agent';

        let prevRole = null;
        this.rollingWindow.messages.forEach((msg, idx) => {
            // Skip tool messages (they were displayed inline with the tool call)
            if (msg.role === 'tool') return;

            const uiText = typeof msg.content === 'string' ? msg.content : this._contentBlocksToText(msg.content);

            if (msg.role === 'user') {
                // ── USER MESSAGE — .cs-message--user ──
                const userDiv = this.messages_container.createDiv({ cls: 'cs-message cs-message--user' });
                userDiv.style.setProperty('--cs-agent-color-rgb', agentRgb);

                // Text content
                const textDiv = userDiv.createDiv({ cls: 'cs-message__text' });
                if (Array.isArray(msg.content)) {
                    this._renderMultimodalUserContent(textDiv, msg.content, uiText);
                } else {
                    this._renderUserText(textDiv, uiText);
                }

                // Meta (hover: timestamp + actions)
                const meta = userDiv.createDiv({ cls: 'cs-message__meta' });
                const timestamp = msg.metadata?.timestamp || '';
                if (timestamp) meta.createSpan({ text: timestamp });
                this.addMessageActions(meta, uiText, 'user', idx);

            } else if (msg.role === 'assistant') {
                // ── AGENT MESSAGE — .cs-message--agent ──
                const agentDiv = this.messages_container.createDiv({ cls: 'cs-message cs-message--agent' });
                agentDiv.style.setProperty('--cs-agent-color-rgb', agentRgb);

                // Agent header (crystal + name) — only on first in a series
                if (prevRole !== 'assistant') {
                    const head = agentDiv.createDiv({ cls: 'cs-message__agent-head' });
                    const crystalEl = head.createDiv({ cls: 'cs-message__agent-crystal' });
                    crystalEl.innerHTML = CrystalGenerator.generate(agentName, { size: 16, color: agentColor, glow: false });
                    head.createSpan({ cls: 'cs-message__agent-name', text: agentName });
                }

                // Reconstruct action rows from metadata (thinking, tool_calls)
                if (msg.metadata?.reasoning_content) {
                    const thinkRow = createThinkingBlock(msg.metadata.reasoning_content, false);
                    agentDiv.appendChild(thinkRow);
                }
                if (msg.metadata?.tool_calls?.length > 0) {
                    for (const tc of msg.metadata.tool_calls) {
                        const tcName = tc.function?.name || tc.name || 'unknown';
                        const tcArgs = tc.function?.arguments || tc.arguments;
                        // Find matching tool result in next messages
                        let tcOutput = null;
                        for (let j = idx + 1; j < this.rollingWindow.messages.length; j++) {
                            const m = this.rollingWindow.messages[j];
                            if (m.role === 'tool' && m.metadata?.tool_call_id === tc.id) {
                                try { tcOutput = JSON.parse(m.content); } catch { tcOutput = m.content; }
                                break;
                            }
                        }
                        const isSubAgent = tcName === 'minion_task' || tcName === 'master_task';
                        if (isSubAgent) {
                            const _hArgs = typeof tcArgs === 'string'
                                ? (() => { try { return JSON.parse(tcArgs); } catch { return {}; } })()
                                : (tcArgs || {});
                            const taskQuery = _hArgs.task || '';
                            const _hName = _hArgs.minion || _hArgs.master || '';
                            const block = createSubAgentBlock({
                                type: tcName,
                                agentName: _hName,
                                query: taskQuery,
                                response: typeof tcOutput === 'string' ? tcOutput : (tcOutput?.result || ''),
                                toolsUsed: tcOutput?.tools_used || [],
                                toolCallDetails: tcOutput?.tool_call_details || [],
                                duration: tcOutput?.duration_ms || 0,
                                usage: tcOutput?.usage,
                            });
                            agentDiv.appendChild(block);
                        } else {
                            const display = createToolCallDisplay({
                                name: tcName,
                                input: typeof tcArgs === 'string' ? (() => { try { return JSON.parse(tcArgs); } catch { return tcArgs; } })() : tcArgs,
                                output: tcOutput,
                                status: tcOutput?.isError ? 'error' : 'success',
                                error: tcOutput?.error
                            });
                            agentDiv.appendChild(display);
                        }
                    }
                }

                // Text response
                if (uiText) {
                    const textDiv = agentDiv.createDiv({ cls: 'cs-message__text' });
                    MarkdownRenderer.renderMarkdown(uiText, textDiv, '', this);
                }

                // Meta (hover: timestamp + actions)
                const meta = agentDiv.createDiv({ cls: 'cs-message__meta' });
                const timestamp = msg.metadata?.timestamp || '';
                if (timestamp) meta.createSpan({ text: timestamp });
                this.addMessageActions(meta, uiText, 'assistant', idx);
            }
            prevRole = msg.role;
        });

        // Track crystal header state for streaming continuation
        this._agentHeaderShown = (prevRole === 'assistant');
        // Draw connector lines
        this._drawConnectorLines();
    }

    /**
     * Draw a continuous vertical line from crystal header through all action rows.
     * Uses absolute positioning within messages_container so it spans across multiple agent divs.
     */
    _drawConnectorLines() {
        // Remove old lines
        this.messages_container.querySelectorAll('.cs-connector-line').forEach(el => el.remove());

        const containerRect = this.messages_container.getBoundingClientRect();
        const agentMsgs = this.messages_container.querySelectorAll('.cs-message--agent');
        if (!agentMsgs.length) return;

        // Group consecutive agent messages
        let groups = [];
        let current = [];
        let prev = null;
        for (const msg of agentMsgs) {
            if (prev && msg.previousElementSibling === prev) {
                current.push(msg);
            } else {
                if (current.length) groups.push(current);
                current = [msg];
            }
            prev = msg;
        }
        if (current.length) groups.push(current);

        // For each group, find first crystal and last action row icon, draw one line
        for (const group of groups) {
            const firstMsg = group[0];
            const crystal = firstMsg.querySelector('.cs-message__agent-crystal');
            if (!crystal) continue;

            // Find last action row's icon in the group
            let lastIcon = null;
            for (let i = group.length - 1; i >= 0; i--) {
                const rows = group[i].querySelectorAll('.cs-action-row');
                if (rows.length) {
                    lastIcon = rows[rows.length - 1].querySelector('.cs-action-row__icon') || rows[rows.length - 1];
                    break;
                }
            }
            if (!lastIcon) continue;

            const crystalRect = crystal.getBoundingClientRect();
            const lastRect = lastIcon.getBoundingClientRect();

            // Dynamic horizontal position: center of crystal
            const crystalCenterX = crystalRect.left + crystalRect.width / 2 - containerRect.left;
            const top = crystalRect.bottom - containerRect.top + this.messages_container.scrollTop;
            const bottom = lastRect.top + lastRect.height / 2 - containerRect.top + this.messages_container.scrollTop;
            const height = bottom - top;
            if (height <= 0) continue;

            const line = document.createElement('div');
            line.className = 'cs-connector-line';
            line.style.top = `${top}px`;
            line.style.height = `${height}px`;
            line.style.left = `${crystalCenterX}px`;
            // Inherit agent color from the group
            const agentRgb = firstMsg.style.getPropertyValue('--cs-agent-color-rgb');
            if (agentRgb) line.style.setProperty('--cs-agent-color-rgb', agentRgb);
            this.messages_container.appendChild(line);
        }
    }


    /**
     * Render user text with inline @[Name] mention badges.
     * Falls back to plain text if no mentions found.
     */
    _renderUserText(container, text) {
        if (!text.includes('@[')) {
            container.createEl('p', { text });
            return;
        }
        const p = container.createEl('p');
        const parts = text.split(/(@\[[^\]]+\])/g);
        for (const part of parts) {
            const match = part.match(/^@\[(.+)\]$/);
            if (match) {
                const badge = p.createSpan({ cls: 'pkm-mention-badge' });
                badge.textContent = `@ ${match[1]}`;
            } else {
                p.appendText(part);
            }
        }
    }

    addMessageActions(metaEl, content, role, idx) {
        // Copy button
        const copyBtn = metaEl.createEl('button', { cls: 'cs-message__meta-btn' });
        copyBtn.innerHTML = UiIcons.copy(12);
        copyBtn.setAttribute('aria-label', 'Kopiuj');
        copyBtn.onclick = async (e) => {
            e.stopPropagation();
            await navigator.clipboard.writeText(content);
            copyBtn.innerHTML = UiIcons.check(12);
            setTimeout(() => { copyBtn.innerHTML = UiIcons.copy(12); }, 2000);
        };

        // Delete button
        const deleteBtn = metaEl.createEl('button', { cls: 'cs-message__meta-btn' });
        deleteBtn.innerHTML = UiIcons.trash(12);
        deleteBtn.setAttribute('aria-label', 'Usuń');
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
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
            const editBtn = metaEl.createEl('button', { cls: 'cs-message__meta-btn' });
            editBtn.innerHTML = UiIcons.edit(12);
            editBtn.setAttribute('aria-label', 'Edytuj');
            editBtn.onclick = (e) => { e.stopPropagation(); this.startEditMessage(idx, content); };
        }

        if (role === 'assistant') {
            // Thumbs up/down
            const thumbsUp = metaEl.createEl('button', { cls: 'cs-message__meta-btn' });
            thumbsUp.innerHTML = '<svg viewBox="0 0 12 12" width="12" height="12"><path d="M3.5,6 V10 H2 V6 Z M3.5,6 L5,3 C5,2 6,1.2 6.5,2 L6.5,4.5 H9 C10,4.5 10.3,5.3 10,6 L9,10 H3.5" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>';
            const thumbsDown = metaEl.createEl('button', { cls: 'cs-message__meta-btn' });
            thumbsDown.innerHTML = '<svg viewBox="0 0 12 12" width="12" height="12"><path d="M8.5,6 V2 H10 V6 Z M8.5,6 L7,9 C7,10 6,10.8 5.5,10 L5.5,7.5 H3 C2,7.5 1.7,6.7 2,6 L3,2 H8.5" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>';

            const msg = this.rollingWindow.messages[idx];
            if (msg?.metadata?.reaction === 'positive') thumbsUp.classList.add('active');
            if (msg?.metadata?.reaction === 'negative') thumbsDown.classList.add('active');

            thumbsUp.onclick = (e) => {
                e.stopPropagation();
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
            thumbsDown.onclick = (e) => {
                e.stopPropagation();
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

            // Regenerate (only last assistant)
            if (this.isLastAssistantMessage(content)) {
                const regenBtn = metaEl.createEl('button', { cls: 'cs-message__meta-btn' });
                regenBtn.innerHTML = UiIcons.refresh(12);
                regenBtn.setAttribute('aria-label', 'Generuj ponownie');
                regenBtn.onclick = (e) => { e.stopPropagation(); this.regenerateLastResponse(); };
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

    // ensureRAGInitialized() usunięty (v1.1.0) — memory_search/vault_search jako on-demand RAG

    onClose() {
        if (this.handleGlobalKeydownBound) {
            document.removeEventListener('keydown', this.handleGlobalKeydownBound);
        }
        if (this.handleBeforeUnloadBound) {
            window.removeEventListener('beforeunload', this.handleBeforeUnloadBound);
        }

        // Cleanup mention autocomplete
        if (this.mentionAutocomplete) {
            this.mentionAutocomplete.destroy();
            this.mentionAutocomplete = null;
        }

        // Cleanup attachment manager
        if (this.attachmentManager) {
            this.attachmentManager.destroy();
            this.attachmentManager = null;
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
        // Best-effort fire-and-forget save (async - may not complete before Obsidian closes)
        // Auto-save is the primary safety net; this is a bonus attempt
        if (this.rollingWindow?.messages?.length > 0) {
            this.handleSaveSession();
        }
    }

    // --- Session Handlers ---

    async handleNewSession() {
        log.info('Chat', `handleNewSession: ${this.rollingWindow.messages.length} wiadomości`);
        // Tylko zapisz surową sesję — BEZ konsolidacji pamięci (v1.1.0)
        // Konsolidacja jest opcjonalna — user klika "🧠 Zapisz pamięć" gdy chce
        if (this.rollingWindow.messages.length > 0) {
            await this.handleSaveSession();
        }

        // Reset session tracker so next save creates a new file
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

            // Save through AgentMemory (single source of truth)
            if (agentManager) {
                const savedPath = await agentManager.saveActiveSession(
                    this.rollingWindow.messages,
                    metadata
                );
                if (savedPath) {
                    if (this.autosaveStatus) {
                        this.autosaveStatus.textContent = `Saved to ${activeAgentName}!`;
                        setTimeout(() => { if (this.autosaveStatus) this.autosaveStatus.textContent = ''; }, 2000);
                    }
                    await this.updateSessionDropdown();
                }
            }
        } catch (e) {
            console.error('Error saving session:', e);
            if (this.autosaveStatus) this.autosaveStatus.textContent = 'Save failed';
        }
    }

    async handleLoadSession(path) {
        log.info('Chat', `handleLoadSession: ${path}`);
        try {
            let parsed;

            // Load from AgentMemory (single source of truth)
            const agentMemory = this.plugin?.agentManager?.getActiveMemory();
            if (!agentMemory) return;
            const filename = path.split('/').pop();
            parsed = await agentMemory.loadSession(filename);

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

        // Get sessions from AgentMemory (single source of truth)
        let sessions = [];
        const agentMemory = this.plugin?.agentManager?.getActiveMemory();
        if (agentMemory) {
            sessions = await agentMemory.listSessions();
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

        // L1/L2/L3 consolidation trigger (runs independently of extraction)
        // Garbage sessions (<3 user messages) are filtered out before L1
        const keepRecent = this.env?.settings?.obsek?.keepRecentSessions || 5;
        const l3Threshold = this.env?.settings?.obsek?.l3Threshold || 10;
        const mainModel = this.get_chat_model?.();

        if (agentMemory && chatModel?.stream) {
            try {
                // Filter out garbage sessions first
                let unconsolidated = await agentMemory.getUnconsolidatedSessions();
                const validSessions = [];
                for (const s of unconsolidated) {
                    try {
                        const data = await agentMemory.loadSession(s);
                        if (!agentMemory._isGarbageSession(data)) {
                            validSessions.push(s);
                        }
                    } catch (e) { /* skip unreadable */ }
                }

                // L1: 5 valid sessions → 1 L1 + cleanup source sessions
                let remaining = validSessions;
                while (remaining.length >= 5) {
                    const batch = remaining.slice(0, 5);
                    const batchNames = batch.map(s => s.name);
                    const l1Result = await agentMemory.createL1Summary(batch, chatModel);
                    if (!l1Result) {
                        console.warn('[ChatView] L1 creation failed, stopping');
                        break;
                    }
                    await agentMemory._cleanupAfterL1(batchNames, keepRecent);
                    remaining = remaining.slice(5);
                }

                // L2: 5 L1 → 1 L2 + cleanup source L1s
                let unconsolidatedL1s = await agentMemory.getUnconsolidatedL1s();
                while (unconsolidatedL1s.length >= 5) {
                    const batch = unconsolidatedL1s.slice(0, 5);
                    const batchNames = batch.map(l => l.name);
                    // L2 uses main model for better quality (if available)
                    const l2Model = (mainModel?.stream ? mainModel : chatModel);
                    const l2Result = await agentMemory.createL2Summary(batch, l2Model);
                    if (!l2Result) {
                        console.warn('[ChatView] L2 creation failed, stopping');
                        break;
                    }
                    await agentMemory._cleanupAfterL2(batchNames);
                    unconsolidatedL1s = await agentMemory.getUnconsolidatedL1s();
                }

                // L3: N L2 → 1 L3 + cleanup source L2s
                let unconsolidatedL2s = await agentMemory.getUnconsolidatedL2s();
                while (unconsolidatedL2s.length >= l3Threshold) {
                    const batch = unconsolidatedL2s.slice(0, l3Threshold);
                    const batchNames = batch.map(l => l.name);
                    const l3Model = (mainModel?.stream ? mainModel : chatModel);
                    const l3Result = await agentMemory.createL3Summary(batch, l3Model);
                    if (!l3Result) {
                        console.warn('[ChatView] L3 creation failed, stopping');
                        break;
                    }
                    await agentMemory._cleanupAfterL3(batchNames);
                    unconsolidatedL2s = await agentMemory.getUnconsolidatedL2s();
                }
            } catch (consolidationError) {
                log.error('Chat', 'L1/L2/L3 consolidation FAIL:', consolidationError);
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
        const threshold = this.env?.settings?.obsek?.summarizationThreshold || 0.9;
        const toolTrimThreshold = this.env?.settings?.obsek?.toolTrimThreshold || 0.7;
        console.log(`[RollingWindow] Init: maxTokens=${maxTokens}, threshold=${threshold}, toolTrim=${toolTrimThreshold}, trigger=${Math.round(maxTokens * threshold)}`);
        return new RollingWindow({
            maxTokens,
            triggerThreshold: threshold,
            toolTrimThreshold,
            // Lazy model provider — model może nie być gotowy przy init
            modelProvider: () => this._getMinionModel() || this.get_chat_model?.(),
            onSummarized: (summary, count, messagesKept, isEmergency) => {
                this._renderCompressionBlock(summary, count, messagesKept, isEmergency);
                this._updateContextCircle();
            },
            onToolsTrimmed: (info) => {
                log.info('Chat', `Faza 1: skrócono ${info.trimmed} wyników narzędzi (łącznie: ${info.totalTrimmed})`);
                this._renderTrimBlock(info);
                this._updateContextCircle();
            },
            emergencyContextProvider: () => this._buildEmergencyTaskContext()
        });
    }

    /**
     * Buduje szczegółowy kontekst aktywnego zadania dla awaryjnej sumaryzacji.
     * Zawiera pełne TODO i PLAN ze statusami, żeby agent wiedział co kontynuować.
     * @returns {string}
     */
    _buildEmergencyTaskContext() {
        const parts = [];

        // Ścieżka do zapisanej sesji — agent może ją przeczytać żeby zweryfikować szczegóły
        const sessionPath = this.plugin?.agentManager?.getActiveMemory()?.activeSessionPath;
        if (sessionPath) {
            parts.push(`📂 Pełna rozmowa zapisana w: ${sessionPath}`);
        }

        // Aktywne TODO — pełna lista itemów ze statusami
        const todoStore = this.plugin?._chatTodoStore;
        if (todoStore?.size > 0) {
            for (const [id, todo] of todoStore) {
                if (!todo.items?.length) continue;
                const done = todo.items.filter(i => i.done).length;
                const total = todo.items.length;
                const lines = [`📋 TODO "${todo.title}" (${done}/${total} gotowe):`];
                for (const item of todo.items) {
                    lines.push(`  ${item.done ? '✅' : '⬜'} ${item.text}`);
                }
                parts.push(lines.join('\n'));
            }
        }

        // Aktywne PLANY — pełna lista kroków ze statusami i subtaskami
        const planStore = this.plugin?._planStore;
        if (planStore?.size > 0) {
            for (const [id, plan] of planStore) {
                if (!plan.steps?.length) continue;
                const done = plan.steps.filter(s => s.status === 'done').length;
                const total = plan.steps.length;
                const approved = plan.approved ? 'zatwierdzony' : 'niezatwierdzony';
                const lines = [`📝 PLAN "${plan.title}" (${done}/${total} kroków, ${approved}):`];
                for (let i = 0; i < plan.steps.length; i++) {
                    const step = plan.steps[i];
                    const icon = step.status === 'done' ? '✅'
                        : step.status === 'in_progress' ? '🔄'
                        : step.status === 'skipped' ? '⏭️' : '⬜';
                    lines.push(`  ${icon} ${i + 1}. ${step.label}${step.description ? ` — ${step.description}` : ''}`);
                    if (step.note) lines.push(`     📌 ${step.note}`);
                    if (step.subtasks?.length) {
                        for (const sub of step.subtasks) {
                            lines.push(`     ${sub.done ? '✅' : '⬜'} ${sub.text}`);
                        }
                    }
                }
                parts.push(lines.join('\n'));
            }
        }

        return parts.join('\n\n');
    }

    // --- Agent Handlers ---

    updateAgentDropdown() {
        // No-op — agent switching is now handled via tabs (_renderTabBar / _switchTab).
        // Kept for backward compatibility with callers.
    }

    async handleAgentChange(agentName) {
        if (!agentName) return;
        // Delegate to tab system — ensure agent has a tab, then switch
        const hasTab = this.chatTabs.some(t => t.agentName === agentName);
        if (!hasTab) {
            this.chatTabs.push({ agentName, isActive: false });
        }
        await this._switchTab(agentName);
    }
}
