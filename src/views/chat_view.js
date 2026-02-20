import { SmartItemView } from "obsidian-smart-env/views/smart_item_view.js";
import { MarkdownRenderer } from 'obsidian';
import { RollingWindow } from '../memory/RollingWindow.js';
import { SessionManager } from '../memory/SessionManager.js';
import { RAGRetriever } from '../memory/RAGRetriever.js';
import { EmbeddingHelper } from '../memory/EmbeddingHelper.js';
import chat_view_styles from './chat_view.css' with { type: 'css' };
import { createToolCallDisplay } from '../components/ToolCallDisplay.js';
import { openPermissionsModal } from './PermissionsModal.js';

/**
 * ChatView - Main chat interface for PKM Assistant
 * Provides a simple chat UI with streaming support
 */
export class ChatView extends SmartItemView {
    static get view_type() { return 'pkm-assistant-chat'; }
    static get display_text() { return 'PKM Chat'; }
    static get icon_name() { return 'message-circle'; }

    constructor(leaf, plugin) {
        super(leaf, plugin);
        // Initialize RollingWindow with settings or default
        const maxTokens = this.env?.settings?.smart_chat_model?.maxContextTokens || 100000;
        this.rollingWindow = new RollingWindow({ maxTokens });
        this.is_generating = false;
        this.current_message_container = null;
        this.sessionManager = null;
        this.ragRetriever = null;
        this.embeddingHelper = null;

        // Input history state
        this.inputHistory = [];
        this.historyIndex = -1;
    }

    async initSessionManager() {
        this.sessionManager = new SessionManager(this.app.vault, this.env?.settings?.smart_chat_model || {});
        await this.sessionManager.initialize();

        // Auto-save callback
        this.sessionManager.startAutoSave(() => ({
            messages: this.rollingWindow.messages,
            metadata: {
                created: new Date().toISOString(),
                agent: 'default',
                tokens_used: this.rollingWindow.getCurrentTokenCount()
            }
        }));

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
        container.empty();
        container.addClass('pkm-chat-view');

        // Header with agent selector, session controls and token counter
        const header = container.createDiv({ cls: 'pkm-chat-header' });

        // Agent selector
        const agentControls = header.createDiv({ cls: 'agent-controls' });
        this.agentDropdown = agentControls.createEl('select', { cls: 'agent-dropdown' });
        this.updateAgentDropdown();
        this.agentDropdown.addEventListener('change', (e) => this.handleAgentChange(e.target.value));

        // Permissions button - add this AFTER agentDropdown creation
        const permissionsBtn = header.createEl('button', {
            cls: 'chat-permissions-btn',
            attr: { 'aria-label': 'Uprawnienia agenta' }
        });
        permissionsBtn.innerHTML = '🔐';
        permissionsBtn.onclick = () => {
            const activeAgent = this.plugin.agentManager?.getActiveAgent();
            if (activeAgent) {
                openPermissionsModal(this.app, activeAgent, (newPermissions) => {
                    console.log('[ChatView] Permissions updated for', activeAgent.name);
                    this.updatePermissionsBadge();
                });
            }
        };
        this.permissionsBtn = permissionsBtn;

        // Session controls
        const sessionControls = header.createDiv({ cls: 'session-controls' });

        this.sessionDropdown = sessionControls.createEl('select', { cls: 'session-dropdown' });
        this.sessionDropdown.createEl('option', { value: '', text: '-- Sesja --' });
        this.sessionDropdown.addEventListener('change', (e) => this.handleLoadSession(e.target.value));

        const newBtn = sessionControls.createEl('button', { cls: 'session-new', text: 'New' });
        newBtn.addEventListener('click', () => this.handleNewSession());

        const saveBtn = sessionControls.createEl('button', { cls: 'session-save', text: 'Save' });
        saveBtn.addEventListener('click', () => this.handleSaveSession());

        this.autosaveStatus = sessionControls.createDiv({ cls: 'autosave-status', text: '' });

        // Token counter
        header.createDiv({
            cls: 'token-counter',
            text: '0 / 100,000 tokens'
        });
        this.updateTokenCounter();

        // Create main layout
        const chat_container = container.createDiv({ cls: 'pkm-chat-container' });

        // Messages area
        this.messages_container = chat_container.createDiv({ cls: 'pkm-chat-messages' });
        this.render_messages();

        // Input area
        const input_container = chat_container.createDiv({ cls: 'pkm-chat-input-container' });

        this.input_area = input_container.createEl('textarea', {
            cls: 'pkm-chat-input',
            attr: {
                placeholder: 'Type your message... (Enter to send, Shift+Enter for new line)',
                rows: '3'
            }
        });

        const button_container = input_container.createDiv({ cls: 'pkm-chat-buttons' });

        this.send_button = button_container.createEl('button', {
            text: 'Send',
            cls: 'pkm-chat-send-button'
        });

        this.stop_button = button_container.createEl('button', {
            text: 'Stop',
            cls: 'pkm-chat-stop-button hidden'
        });

        // Event listeners
        this.input_area.addEventListener('input', this.handleInputResize.bind(this));
        this.input_area.addEventListener('keydown', this.handle_input_keydown.bind(this));
        this.send_button.addEventListener('click', this.send_message.bind(this));
        this.stop_button.addEventListener('click', this.stop_generation.bind(this));

        // Global listeners
        this.handleGlobalKeydownBound = this.handleGlobalKeydown.bind(this);
        document.addEventListener('keydown', this.handleGlobalKeydownBound);

        // Add welcome message if no messages
        if (this.rollingWindow.messages.length === 0) {
            this.add_welcome_message();
        }
        this.updatePermissionsBadge();
    }

    updateTokenCounter() {
        const current = this.rollingWindow.getCurrentTokenCount();
        const max = this.rollingWindow.maxTokens;
        const el = this.container.querySelector('.token-counter');
        if (el) {
            el.textContent = `${current.toLocaleString()} / ${max.toLocaleString()} tokens`;

            // Visual warning if close to limit (optional)
            if (current > max * 0.9) {
                el.addClass('token-warning');
            } else {
                el.removeClass('token-warning');
            }
        }
    }

    add_welcome_message() {
        const welcome = this.messages_container.createDiv({ cls: 'pkm-chat-message assistant' });

        // Get active agent info
        const agentManager = this.plugin?.agentManager;
        const activeAgent = agentManager?.getActiveAgent();
        const agentName = activeAgent?.name || 'PKM Assistant';
        const agentEmoji = activeAgent?.emoji || '👋';

        // Message row (avatar + bubble)
        const row = welcome.createDiv({ cls: 'pkm-chat-message-row' });
        row.createDiv({ cls: 'pkm-chat-avatar', text: agentEmoji });

        const bubble = row.createDiv({ cls: 'pkm-chat-bubble' });
        const content = bubble.createDiv({ cls: 'pkm-chat-content' });
        content.createEl('p', {
            text: `Cześć! Jestem ${agentName}. W czym mogę Ci dzisiaj pomóc?`
        });
    }

    showTypingIndicator() {
        if (this.typingIndicator) return;

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

        this.scrollToBottom();
    }

    hideTypingIndicator() {
        if (this.typingIndicator) {
            this.typingIndicator.remove();
            this.typingIndicator = null;
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
        const newHeight = Math.min(Math.max(textarea.scrollHeight, 60), 200);
        textarea.style.height = newHeight + 'px';
    }

    resetInputArea() {
        if (!this.input_area) return;
        this.input_area.value = '';
        this.input_area.style.height = '60px'; // Reset to min-height
        this.historyIndex = -1;
    }

    /**
     * Get or create the chat model instance from our settings
     */
    get_chat_model() {
        console.log('[Obsek] get_chat_model called');
        console.log('[Obsek] this.env:', this.env);
        console.log('[Obsek] this.env.config:', this.env?.config);
        console.log('[Obsek] this.env.config.modules:', this.env?.config?.modules);
        console.log('[Obsek] this.env.settings:', this.env?.settings);

        // Check if already initialized
        if (this.env.smart_chat_model?.stream) {
            console.log('[Obsek] Using cached smart_chat_model');
            return this.env.smart_chat_model;
        }

        // Get our settings
        const settings = this.env.settings?.smart_chat_model;
        console.log('[Obsek] smart_chat_model settings:', settings);

        // Determine platform - use setting or detect from available API keys
        let platform = settings?.platform;
        if (!platform) {
            // Try to detect platform from available API keys
            const platforms = ['anthropic', 'openai', 'gemini', 'groq', 'open_router', 'deepseek', 'ollama'];
            for (const p of platforms) {
                if (settings?.[`${p}_api_key`] || p === 'ollama') {
                    platform = p;
                    console.log('[Obsek] Auto-detected platform:', platform);
                    break;
                }
            }
        }

        if (!platform) {
            console.log('[Obsek] No platform set and no API keys found');
            return null;
        }

        // Get platform-specific API key
        const api_key = settings[`${platform}_api_key`];
        console.log('[Obsek] Platform:', platform, 'API key exists:', !!api_key);

        if (!api_key && platform !== 'ollama') {
            console.log('[Obsek] No API key for platform:', platform);
            return null;
        }

        // Get module config
        const module_config = this.env.config?.modules?.smart_chat_model;
        console.log('[Obsek] Module config:', module_config);
        console.log('[Obsek] Module config class:', module_config?.class);
        console.log('[Obsek] Module config adapters:', module_config?.adapters);

        if (!module_config?.class) {
            console.error('[Obsek] SmartChatModel class not found in config');
            console.error('[Obsek] Available modules:', Object.keys(this.env?.config?.modules || {}));
            return null;
        }

        // Get model name
        const model_key = settings[`${platform}_model`] || this.get_default_model(platform);
        console.log('[Obsek] Model key:', model_key);

        // Create the model instance
        try {
            console.log('[Obsek] Creating SmartChatModel with adapter:', platform);
            const chat_model = new module_config.class({
                ...module_config,
                class: null,
                env: this.env,
                settings: this.env.settings,
                adapter: platform,
                // Pass API key directly (adapter looks for opts.api_key)
                api_key: api_key,
                model_key: model_key,
            });

            // Cache on env
            this.env.smart_chat_model = chat_model;
            console.log('[Obsek] SmartChatModel created successfully');
            return chat_model;
        } catch (e) {
            console.error('[Obsek] Error creating chat model:', e);
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

    async send_message() {
        const text = this.input_area.value.trim();
        if (!text || this.is_generating) return;

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
        await this.ensureRAGInitialized();

        // Get system prompt from active agent
        const agentManager = this.plugin?.agentManager;
        if (agentManager) {
            const basePrompt = agentManager.getActiveSystemPrompt();
            this.rollingWindow.setSystemPrompt(basePrompt);
        }

        // RAG: Retrieve relevant context before preparing request
        if (this.ragRetriever) {
            try {
                const ragResults = await this.ragRetriever.retrieve(text);
                if (ragResults.length > 0) {
                    const context = this.ragRetriever.formatContext(ragResults);
                    const currentPrompt = this.rollingWindow.systemPrompt || '';
                    this.rollingWindow.setSystemPrompt(
                        `${currentPrompt}\n\n--- Relevantny kontekst z poprzednich rozmów ---\n${context}`
                    );
                }
            } catch (ragError) {
                console.warn('[Obsek] RAG retrieval failed:', ragError);
            }
        }

        // Prepare request
        const messages = this.rollingWindow.getMessagesForAPI();

        // Get tools from MCP registry if agent has mcp permission
        let tools = [];
        const activeAgent = this.plugin?.agentManager?.getActiveAgent();
        if (activeAgent?.permissions?.mcp && this.plugin?.toolRegistry) {
            tools = this.plugin.toolRegistry.getToolDefinitions();
            console.log('[ChatView] Passing', tools.length, 'tools to AI');
        }

        try {
            // Get or create chat model
            const chat_model = this.get_chat_model();
            if (!chat_model?.stream) {
                throw new Error('Chat model not configured. Please configure API key in Settings → Obsek.');
            }

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
            console.error('Error sending message:', error);
            this.handle_error(error);
        }
    }

    handle_chunk(response) {
        console.log('[ChatView] handle_chunk received:', response);
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

            this.current_message_bubble = row.createDiv({ cls: 'pkm-chat-bubble' });
            this.current_message_text = this.current_message_bubble.createDiv({
                cls: 'pkm-chat-content'
            });
        }

        // Get content from response
        const content = response?.choices?.[0]?.message?.content || '';

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
        console.log('[ChatView] handle_done received:', response);
        console.log('[ChatView] response.choices[0].message:', response?.choices?.[0]?.message);
        console.log('[ChatView] response.choices[0].message.tool_calls:', response?.choices?.[0]?.message?.tool_calls);

        // Guard against duplicate handle_done calls (streaming can fire this twice)
        const responseId = response?.id || '';
        if (this._lastProcessedResponseId === responseId && responseId) {
            console.log('[ChatView] Skipping duplicate handle_done for:', responseId);
            return;
        }
        this._lastProcessedResponseId = responseId;

        this.hideTypingIndicator();
        const content = response?.choices?.[0]?.message?.content || '';

        // Parse tool calls from response (supports both OpenAI and Anthropic formats)
        const toolCalls = this.plugin?.mcpClient?.parseToolCalls(response) || [];
        console.log('[ChatView] parseToolCalls result:', toolCalls);

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
            console.log('[ChatView] Processing', toolCalls.length, 'tool calls');

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

            for (const toolCall of toolCalls) {
                // Show pending state
                const toolDisplay = createToolCallDisplay({
                    name: toolCall.name,
                    input: toolCall.arguments,
                    status: 'pending'
                });
                toolCallsContainer.appendChild(toolDisplay);

                // Execute tool via MCPClient
                let result;
                try {
                    result = await this.plugin.mcpClient.executeToolCall(toolCall, agentName);
                    console.log('[ChatView] Tool result:', result);

                    // Update display with result
                    toolDisplay.replaceWith(createToolCallDisplay({
                        name: toolCall.name,
                        input: toolCall.arguments,
                        output: result,
                        status: result.isError ? 'error' : 'success',
                        error: result.error
                    }));
                } catch (err) {
                    result = { isError: true, error: err.message };
                    toolDisplay.replaceWith(createToolCallDisplay({
                        name: toolCall.name,
                        input: toolCall.arguments,
                        status: 'error',
                        error: err.message
                    }));
                }

                toolResults.push({
                    tool_call_id: toolCall.id,
                    role: 'tool',
                    content: JSON.stringify(result)
                });
            }

            // Save assistant message with tool calls to history (MUST include tool_calls for Anthropic!)
            const rawToolCalls = response?.choices?.[0]?.message?.tool_calls || [];
            await this.rollingWindow.addMessage('assistant', content || '', { tool_calls: rawToolCalls });

            // Add tool results to conversation and continue
            for (const tr of toolResults) {
                await this.rollingWindow.addMessage('tool', tr.content, { tool_call_id: tr.tool_call_id });
            }

            // Reset current container before continuing
            this.current_message_container = null;
            this.current_message_bubble = null;
            this.current_message_text = null;

            // Continue conversation with tool results
            await this.continueWithToolResults();
            return;
        }


        // No tool calls - normal completion
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
        }

        // Reset state
        this.current_message_container = null;
        this.current_message_bubble = null;
        this.current_message_text = null;
        this.set_generating(false);
    }

    /**
     * Continue conversation after tool execution
     */
    async continueWithToolResults() {
        const messages = this.rollingWindow.getMessagesForAPI();
        console.log('[ChatView] continueWithToolResults - messages:', JSON.stringify(messages, null, 2));

        // Get tools again
        let tools = [];
        const activeAgent = this.plugin?.agentManager?.getActiveAgent();
        if (activeAgent?.permissions?.mcp && this.plugin?.toolRegistry) {
            tools = this.plugin.toolRegistry.getToolDefinitions();
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
        if (this.ragRetriever) return; // Already initialized

        console.log('[Obsek] ensureRAGInitialized called');
        console.log('[Obsek] smart_embed_model:', this.env?.smart_embed_model);
        console.log('[Obsek] smart_embed_model.embed:', this.env?.smart_embed_model?.embed);

        const chatSettings = this.env?.settings?.smart_chat_model || {};
        try {
            this.embeddingHelper = new EmbeddingHelper(this.env);
            const isReady = this.embeddingHelper.isReady();
            console.log('[Obsek] embeddingHelper.isReady():', isReady);

            if (isReady) {
                this.ragRetriever = new RAGRetriever({
                    embeddingHelper: this.embeddingHelper,
                    sessionManager: this.sessionManager,
                    vault: this.app.vault,
                    settings: chatSettings
                });
                await this.ragRetriever.indexAllSessions();
                console.log('[Obsek] RAG initialized and sessions indexed.');
            } else {
                console.log('[Obsek] Embed model not ready, RAG skipped');
            }
        } catch (ragError) {
            console.warn('[Obsek] RAG initialization failed:', ragError);
        }
    }

    onClose() {
        if (this.handleGlobalKeydownBound) {
            document.removeEventListener('keydown', this.handleGlobalKeydownBound);
        }

        // Cleanup if needed
        if (this.is_generating) {
            this.stop_generation();
        }
        if (this.sessionManager) {
            this.sessionManager.stopAutoSave();
        }
    }

    // --- Session Handlers ---

    async handleNewSession() {
        if (this.sessionManager) {
            this.sessionManager.startNewSession();
        }
        this.rollingWindow = new RollingWindow({ maxTokens: this.env?.settings?.smart_chat_model?.maxContextTokens || 100000 });
        this.render_messages();
        this.add_welcome_message();
        this.updateTokenCounter();
        await this.updateSessionDropdown();
    }

    async handleSaveSession() {
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
                    console.log('[ChatView] Saved session to agent memory:', savedPath);
                    this.autosaveStatus.textContent = `Saved to ${activeAgentName}!`;
                    setTimeout(() => { this.autosaveStatus.textContent = ''; }, 2000);
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
        if (!path || !this.sessionManager) return;
        try {
            const { messages } = await this.sessionManager.loadSession(path);
            this.rollingWindow = new RollingWindow({ maxTokens: this.env?.settings?.smart_chat_model?.maxContextTokens || 100000 });
            for (const msg of messages) {
                await this.rollingWindow.addMessage(msg.role, msg.content);
            }
            this.render_messages();
            this.updateTokenCounter();
        } catch (e) {
            console.error('Error loading session:', e);
        }
    }

    async updateSessionDropdown() {
        if (!this.sessionManager || !this.sessionDropdown) return;
        const sessions = await this.sessionManager.listSessions();

        // Clear existing options except the first placeholder
        while (this.sessionDropdown.options.length > 1) {
            this.sessionDropdown.remove(1);
        }

        for (const file of sessions) {
            const opt = this.sessionDropdown.createEl('option', { value: file.path, text: file.name });
            // Mark active session
            if (this.sessionManager.activeSessionFile && this.sessionManager.activeSessionFile.path === file.path) {
                opt.selected = true;
            }
        }
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

    handleAgentChange(agentName) {
        if (!agentName) return;

        const agentManager = this.plugin?.agentManager;
        if (!agentManager) return;

        const switched = agentManager.switchAgent(agentName);
        if (switched) {
            console.log('[ChatView] Switched to agent:', agentName);
            this.updatePermissionsBadge();
            // Re-render welcome if no messages
            if (this.rollingWindow.messages.length === 0) {
                this.messages_container.empty();
                this.add_welcome_message();
            }
        }
    }
}
