import { SmartPluginSettingsTab } from "obsidian-smart-env";
import { Setting } from "obsidian";

/**
 * ObsekSettingsTab - Clean settings for PKM Assistant
 * Simple, working settings with native Obsidian controls
 */
export class ObsekSettingsTab extends SmartPluginSettingsTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.name = 'Obsek';
        this.icon = 'message-circle';
    }

    async render_header(container) {
        if (!container) return;
        container.empty();

        container.createEl('h1', { text: '🤖 Obsek - PKM Assistant' });
        container.createEl('p', {
            text: 'AI Agent system for Obsidian - chat with your vault, edit files with AI assistance.',
            cls: 'setting-item-description'
        });
    }

    async render_plugin_settings(container) {
        if (!container) return;
        container.empty();
        // No custom plugin settings for now
    }

    async render_global_settings(container) {
        if (!container) return;
        container.empty();

        if (!this.env) {
            container.createEl('p', { text: 'Environment not loaded yet...' });
            return;
        }

        // Initialize settings if needed
        if (!this.env.settings.smart_chat_model) {
            this.env.settings.smart_chat_model = {};
        }
        const settings = this.env.settings.smart_chat_model;

        // Chat Model Section
        container.createEl('h2', { text: 'Chat Model' });

        // Provider/Platform selection
        new Setting(container)
            .setName('Chat Model Platform')
            .setDesc('Select a platform/provider for chat models')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('anthropic', 'Anthropic (Claude)')
                    .addOption('openai', 'OpenAI (GPT)')
                    .addOption('open_router', 'OpenRouter')
                    .addOption('ollama', 'Ollama (Local)')
                    .addOption('gemini', 'Google Gemini')
                    .addOption('groq', 'Groq')
                    .addOption('deepseek', 'DeepSeek')
                    .setValue(settings.platform || 'anthropic')
                    .onChange(async (value) => {
                        settings.platform = value;
                        await this.save_settings();
                        this.display(); // Re-render for platform-specific options
                    });
            });

        const platform = settings.platform || 'anthropic';

        // API Key (not for Ollama)
        if (platform !== 'ollama') {
            new Setting(container)
                .setName('API Key')
                .setDesc(`Enter your ${this.get_platform_name(platform)} API key`)
                .addText(text => {
                    text
                        .setPlaceholder('sk-...')
                        .setValue(settings[`${platform}_api_key`] || '')
                        .onChange(async (value) => {
                            settings[`${platform}_api_key`] = value;
                            await this.save_settings();
                        });
                    text.inputEl.type = 'password';
                    text.inputEl.style.width = '300px';
                });
        }

        // Ollama host
        if (platform === 'ollama') {
            new Setting(container)
                .setName('Ollama Host')
                .setDesc('URL of your Ollama server')
                .addText(text => {
                    text
                        .setPlaceholder('http://localhost:11434')
                        .setValue(settings.ollama_host || 'http://localhost:11434')
                        .onChange(async (value) => {
                            settings.ollama_host = value;
                            await this.save_settings();
                        });
                    text.inputEl.style.width = '250px';
                });
        }

        // Model selection
        new Setting(container)
            .setName('Model')
            .setDesc('Enter the model name to use')
            .addText(text => {
                text
                    .setPlaceholder(this.get_default_model(platform))
                    .setValue(settings[`${platform}_model`] || '')
                    .onChange(async (value) => {
                        settings[`${platform}_model`] = value;
                        await this.save_settings();
                    });
                text.inputEl.style.width = '250px';
            });

        // Advanced Settings
        container.createEl('h3', { text: 'Advanced' });

        new Setting(container)
            .setName('Temperature')
            .setDesc('Creativity level (0 = focused, 1 = creative)')
            .addSlider(slider => {
                slider
                    .setLimits(0, 1, 0.1)
                    .setValue(settings.temperature ?? 0.7)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        settings.temperature = value;
                        await this.save_settings();
                    });
            });

        new Setting(container)
            .setName('Max Tokens')
            .setDesc('Maximum response length')
            .addText(text => {
                text
                    .setPlaceholder('4096')
                    .setValue(String(settings.max_tokens || 4096))
                    .onChange(async (value) => {
                        settings.max_tokens = parseInt(value) || 4096;
                        await this.save_settings();
                    });
                text.inputEl.style.width = '100px';
            });

        // Memory System Section
        container.createEl('h3', { text: 'Memory System' });

        new Setting(container)
            .setName('maxContextTokens')
            .setDesc('Maximum tokens in conversation context')
            .addText(text => {
                text
                    .setPlaceholder('100000')
                    .setValue(String(settings.maxContextTokens || 100000))
                    .onChange(async (value) => {
                        let val = parseInt(value);
                        if (isNaN(val)) val = 100000;
                        if (val < 10000) val = 10000;
                        if (val > 2000000) val = 2000000;
                        settings.maxContextTokens = val;
                        await this.save_settings();
                    });
                text.inputEl.type = 'number';
            });

        new Setting(container)
            .setName('enableAutoSummarization')
            .setDesc('Automatically summarize when context gets large')
            .addToggle(toggle => toggle
                .setValue(settings.enableAutoSummarization !== false)
                .onChange(async (value) => {
                    settings.enableAutoSummarization = value;
                    await this.save_settings();
                }));

        new Setting(container)
            .setName('summarizationThreshold')
            .setDesc('Trigger summarization at this % of max tokens')
            .addSlider(slider => slider
                .setLimits(0.5, 0.9, 0.05)
                .setValue(settings.summarizationThreshold || 0.7)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    settings.summarizationThreshold = value;
                    await this.save_settings();
                }));

        new Setting(container)
            .setName('autoSaveInterval')
            .setDesc('Auto-save session every X minutes (0 = disabled)')
            .addText(text => {
                text
                    .setPlaceholder('5')
                    .setValue(String(settings.autoSaveInterval !== undefined ? settings.autoSaveInterval : 5))
                    .onChange(async (value) => {
                        settings.autoSaveInterval = parseInt(value);
                        await this.save_settings();
                    });
                text.inputEl.type = 'number';
            });

        // RAG (Retrieval) Section
        container.createEl('h3', { text: 'RAG (Retrieval)' });

        new Setting(container)
            .setName('enableRAG')
            .setDesc('Enable semantic search in previous sessions')
            .addToggle(toggle => toggle
                .setValue(settings.enableRAG !== false)
                .onChange(async (value) => {
                    settings.enableRAG = value;
                    await this.save_settings();
                }));

        new Setting(container)
            .setName('ragSimilarityThreshold')
            .setDesc('Minimum similarity score for RAG results')
            .addSlider(slider => slider
                .setLimits(0.5, 0.9, 0.05)
                .setValue(settings.ragSimilarityThreshold || 0.7)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    settings.ragSimilarityThreshold = value;
                    await this.save_settings();
                }));

        new Setting(container)
            .setName('ragMaxResults')
            .setDesc('Maximum number of RAG results to include')
            .addText(text => {
                text
                    .setPlaceholder('5')
                    .setValue(String(settings.ragMaxResults || 5))
                    .onChange(async (value) => {
                        settings.ragMaxResults = parseInt(value) || 5;
                        await this.save_settings();
                    });
                text.inputEl.type = 'number';
            });

        // About section
        container.createEl('h2', { text: 'About' });
        container.createEl('p', {
            text: 'Version: ' + this.plugin.manifest.version,
            cls: 'setting-item-description'
        });
    }

    get_platform_name(platform) {
        const names = {
            anthropic: 'Anthropic',
            openai: 'OpenAI',
            open_router: 'OpenRouter',
            ollama: 'Ollama',
            gemini: 'Google Gemini',
            groq: 'Groq',
            deepseek: 'DeepSeek'
        };
        return names[platform] || platform;
    }

    get_default_model(platform) {
        const defaults = {
            anthropic: 'claude-sonnet-4-20250514',
            openai: 'gpt-4o',
            open_router: 'anthropic/claude-sonnet-4-20250514',
            ollama: 'llama3.2',
            gemini: 'gemini-1.5-pro',
            groq: 'llama-3.3-70b-versatile',
            deepseek: 'deepseek-chat'
        };
        return defaults[platform] || '';
    }

    async save_settings() {
        await this.env.smart_settings?.save();
    }
}
