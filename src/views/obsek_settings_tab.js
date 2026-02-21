import { SmartPluginSettingsTab } from "obsidian-smart-env";
import { Setting } from "obsidian";

/**
 * ObsekSettingsTab - Settings for PKM Assistant
 */
export class ObsekSettingsTab extends SmartPluginSettingsTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.name = 'PKM Assistant';
        this.icon = 'bot';
    }

    async render_header(container) {
        if (!container) return;
        container.empty();

        container.createEl('h1', { text: 'PKM Assistant' });
        container.createEl('p', {
            text: 'Zespol AI agentow w Obsidianie - chat z vaultem, edycja plikow, system pamieci.',
            cls: 'setting-item-description'
        });
    }

    async render_plugin_settings(container) {
        if (!container) return;
        container.empty();
    }

    async render_global_settings(container) {
        if (!container) return;
        container.empty();

        if (!this.env) {
            container.createEl('p', { text: 'Ladowanie srodowiska...' });
            return;
        }

        if (!this.env.settings.smart_chat_model) {
            this.env.settings.smart_chat_model = {};
        }
        const settings = this.env.settings.smart_chat_model;

        if (!this.env.settings.obsek) {
            this.env.settings.obsek = {};
        }
        const obsek = this.env.settings.obsek;

        // ── Model AI ──────────────────────────────
        container.createEl('h2', { text: 'Model AI' });

        new Setting(container)
            .setName('Platforma')
            .setDesc('Dostawca modeli AI')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('anthropic', 'Anthropic (Claude)')
                    .addOption('openai', 'OpenAI (GPT)')
                    .addOption('open_router', 'OpenRouter')
                    .addOption('ollama', 'Ollama (lokalny)')
                    .addOption('gemini', 'Google Gemini')
                    .addOption('groq', 'Groq')
                    .addOption('deepseek', 'DeepSeek')
                    .setValue(settings.platform || 'anthropic')
                    .onChange(async (value) => {
                        settings.platform = value;
                        await this.save_settings();
                        this.display();
                    });
            });

        const platform = settings.platform || 'anthropic';

        if (platform !== 'ollama') {
            new Setting(container)
                .setName('Klucz API')
                .setDesc(`Klucz API dla ${this.get_platform_name(platform)}`)
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

        if (platform === 'ollama') {
            new Setting(container)
                .setName('Adres Ollama')
                .setDesc('URL serwera Ollama')
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

        new Setting(container)
            .setName('Model')
            .setDesc('Nazwa modelu do rozmow')
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

        new Setting(container)
            .setName('Temperatura')
            .setDesc('0 = precyzyjny, 1 = kreatywny')
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
            .setName('Max tokenow odpowiedzi')
            .setDesc('Maksymalna dlugosc jednej odpowiedzi AI')
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

        // ── Pamiec ──────────────────────────────
        container.createEl('h2', { text: 'Pamiec' });

        new Setting(container)
            .setName('Pamiec w prompcie')
            .setDesc('Wstrzykuj pamiec (brain, podsumowania) do system promptu. Wylacz dla szybszych odpowiedzi z lokalnymi modelami.')
            .addToggle(toggle => toggle
                .setValue(obsek.injectMemoryToPrompt !== false) // default: true
                .onChange(async (value) => {
                    obsek.injectMemoryToPrompt = value;
                    await this.save_settings();
                })
            );

        new Setting(container)
            .setName('Minion (model pomocniczy)')
            .setDesc('Tanszy model do operacji pamieci (ekstrakcja, kompresja, L1/L2). Pusty = glowny model.')
            .addText(text => {
                text
                    .setPlaceholder('claude-haiku-4-5-20251001')
                    .setValue(obsek.minionModel || '')
                    .onChange(async (value) => {
                        obsek.minionModel = value;
                        await this.save_settings();
                    });
                text.inputEl.style.width = '250px';
            });

        new Setting(container)
            .setName('Limit kontekstu')
            .setDesc('Max tokenow w oknie rozmowy (10k - 2M)')
            .addText(text => {
                text
                    .setPlaceholder('100000')
                    .setValue(String(obsek.maxContextTokens || 100000))
                    .onChange(async (value) => {
                        let val = parseInt(value);
                        if (isNaN(val)) val = 100000;
                        if (val < 10000) val = 10000;
                        if (val > 2000000) val = 2000000;
                        obsek.maxContextTokens = val;
                        await this.save_settings();
                    });
                text.inputEl.type = 'number';
                text.inputEl.style.width = '120px';
            });

        new Setting(container)
            .setName('Auto-sumaryzacja')
            .setDesc('Automatycznie kompresuj rozmowe gdy kontekst sie zapelnia')
            .addToggle(toggle => toggle
                .setValue(obsek.enableAutoSummarization !== false)
                .onChange(async (value) => {
                    obsek.enableAutoSummarization = value;
                    await this.save_settings();
                }));

        new Setting(container)
            .setName('Prog sumaryzacji')
            .setDesc('Kompresuj przy tym % limitu kontekstu')
            .addSlider(slider => slider
                .setLimits(0.5, 0.9, 0.05)
                .setValue(obsek.summarizationThreshold || 0.7)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    obsek.summarizationThreshold = value;
                    await this.save_settings();
                }));

        new Setting(container)
            .setName('Auto-zapis sesji')
            .setDesc('Zapisuj sesje co X minut (0 = wylaczone)')
            .addText(text => {
                text
                    .setPlaceholder('5')
                    .setValue(String(obsek.autoSaveInterval !== undefined ? obsek.autoSaveInterval : 5))
                    .onChange(async (value) => {
                        obsek.autoSaveInterval = parseInt(value);
                        await this.save_settings();
                    });
                text.inputEl.type = 'number';
                text.inputEl.style.width = '80px';
            });

        // ── RAG ──────────────────────────────
        container.createEl('h2', { text: 'RAG (wyszukiwanie kontekstu)' });

        new Setting(container)
            .setName('Wlacz RAG')
            .setDesc('Wyszukiwanie semantyczne w poprzednich sesjach')
            .addToggle(toggle => toggle
                .setValue(obsek.enableRAG !== false)
                .onChange(async (value) => {
                    obsek.enableRAG = value;
                    await this.save_settings();
                }));

        new Setting(container)
            .setName('Prog podobienstwa')
            .setDesc('Minimalne podobienstwo wynikow (0.5 = luźne, 0.9 = scisle)')
            .addSlider(slider => slider
                .setLimits(0.5, 0.9, 0.05)
                .setValue(obsek.ragSimilarityThreshold || 0.7)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    obsek.ragSimilarityThreshold = value;
                    await this.save_settings();
                }));

        new Setting(container)
            .setName('Max wynikow RAG')
            .setDesc('Ile wynikow wyszukiwania dolaczyc do kontekstu')
            .addText(text => {
                text
                    .setPlaceholder('5')
                    .setValue(String(obsek.ragMaxResults || 5))
                    .onChange(async (value) => {
                        obsek.ragMaxResults = parseInt(value) || 5;
                        await this.save_settings();
                    });
                text.inputEl.type = 'number';
                text.inputEl.style.width = '80px';
            });

        // ── Info ──────────────────────────────
        container.createEl('h2', { text: 'Informacje' });

        const infoDiv = container.createDiv({ cls: 'setting-item' });
        infoDiv.style.display = 'flex';
        infoDiv.style.flexDirection = 'column';
        infoDiv.style.gap = '4px';
        infoDiv.style.padding = '12px 0';

        infoDiv.createEl('span', {
            text: `Wersja: ${this.plugin.manifest.version}`,
            cls: 'setting-item-description'
        });
        infoDiv.createEl('span', {
            text: 'Autor: JDHole',
            cls: 'setting-item-description'
        });

        const linkEl = infoDiv.createEl('a', {
            text: 'GitHub: JDHole/PKM-Assistant',
            href: 'https://github.com/JDHole/PKM-Assistant',
            cls: 'setting-item-description'
        });
        linkEl.style.color = 'var(--link-color)';
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
