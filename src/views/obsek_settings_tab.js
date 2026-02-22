import { SmartPluginSettingsTab } from "obsidian-smart-env";
import { Setting, Notice } from "obsidian";
import { maskKey } from '../utils/keySanitizer.js';

/**
 * ObsekSettingsTab - Settings for PKM Assistant
 * Sections: Dostawcy AI, Modele, Pamięć, RAG, Informacje
 */
export class ObsekSettingsTab extends SmartPluginSettingsTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.name = 'PKM Assistant';
        this.icon = 'bot';
        this._showKeys = {}; // track which API keys are visible
    }

    async render_header(container) {
        if (!container) return;
        container.empty();
        container.createEl('h1', { text: 'PKM Assistant' });
        container.createEl('p', {
            text: 'Zespół AI agentów w Obsidianie - chat z vaultem, edycja plików, system pamięci.',
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
            container.createEl('p', { text: 'Ładowanie środowiska...' });
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

        if (!this.env.settings.smart_sources) {
            this.env.settings.smart_sources = {};
        }

        // ══════════════════════════════════════════
        // SEKCJA 1: DOSTAWCY AI
        // ══════════════════════════════════════════
        container.createEl('h2', { text: '🔑 Dostawcy AI' });
        container.createEl('p', {
            text: 'Wpisz klucze API do platform, z których chcesz korzystać. Klucze są bezpiecznie przechowywane lokalnie.',
            cls: 'setting-item-description'
        });

        const providers = [
            { id: 'anthropic', name: 'Anthropic (Claude)', placeholder: 'sk-ant-...' },
            { id: 'openai', name: 'OpenAI (GPT)', placeholder: 'sk-...' },
            { id: 'deepseek', name: 'DeepSeek', placeholder: 'sk-...' },
            { id: 'gemini', name: 'Google Gemini', placeholder: 'AIza...' },
            { id: 'groq', name: 'Groq', placeholder: 'gsk_...' },
            { id: 'open_router', name: 'OpenRouter', placeholder: 'sk-or-...' },
        ];

        const localProviders = [
            { id: 'ollama', name: 'Ollama (lokalne)', placeholder: 'http://localhost:11434', settingKey: 'ollama_host' },
            { id: 'lm_studio', name: 'LM Studio (lokalne)', placeholder: 'http://localhost:1234', settingKey: 'lm_studio_host' },
        ];

        // API-based providers
        for (const prov of providers) {
            const keyField = `${prov.id}_api_key`;
            const hasKey = !!settings[keyField];
            const statusDot = hasKey ? '🟢' : '⚪';

            new Setting(container)
                .setName(`${statusDot} ${prov.name}`)
                .setDesc(hasKey ? `Klucz: ${maskKey(settings[keyField])}` : 'Brak klucza')
                .addText(text => {
                    text
                        .setPlaceholder(prov.placeholder)
                        .setValue(this._showKeys[prov.id] ? (settings[keyField] || '') : '')
                        .onChange(async (value) => {
                            if (value.trim()) {
                                settings[keyField] = value.trim();
                            } else {
                                delete settings[keyField];
                            }
                            await this.save_settings();
                        });
                    text.inputEl.type = this._showKeys[prov.id] ? 'text' : 'password';
                    text.inputEl.style.width = '280px';
                    if (!this._showKeys[prov.id] && hasKey) {
                        text.inputEl.placeholder = maskKey(settings[keyField]);
                    }
                })
                .addExtraButton(btn => {
                    btn
                        .setIcon(this._showKeys[prov.id] ? 'eye-off' : 'eye')
                        .setTooltip(this._showKeys[prov.id] ? 'Ukryj klucz' : 'Pokaż klucz')
                        .onClick(() => {
                            this._showKeys[prov.id] = !this._showKeys[prov.id];
                            this.display();
                        });
                });
        }

        // Local providers (server address instead of API key)
        for (const prov of localProviders) {
            const hostValue = settings[prov.settingKey] || '';
            const hasHost = !!hostValue;
            const statusDot = hasHost ? '🟢' : '⚪';

            new Setting(container)
                .setName(`${statusDot} ${prov.name}`)
                .setDesc(hasHost ? `Serwer: ${hostValue}` : 'Nie skonfigurowany')
                .addText(text => {
                    text
                        .setPlaceholder(prov.placeholder)
                        .setValue(hostValue)
                        .onChange(async (value) => {
                            settings[prov.settingKey] = value.trim();
                            await this.save_settings();
                        });
                    text.inputEl.style.width = '280px';
                });
        }

        // ══════════════════════════════════════════
        // SEKCJA 2: MODELE
        // ══════════════════════════════════════════
        container.createEl('h2', { text: '🤖 Modele' });
        container.createEl('p', {
            text: 'Wybierz modele do różnych zadań. Każdy model może używać innego dostawcy.',
            cls: 'setting-item-description'
        });

        // Get available platforms (ones that have keys configured)
        const availablePlatforms = this._getAvailablePlatforms(settings);

        // ── Main model ──
        container.createEl('h3', { text: 'Main (rozmowa)' });
        container.createEl('p', { text: 'Główny model do rozmów z agentem.', cls: 'setting-item-description' });

        this._renderModelSlot(container, {
            platformValue: settings.platform || '',
            modelValue: settings[`${settings.platform || 'anthropic'}_model`] || '',
            availablePlatforms,
            onPlatformChange: async (value) => {
                settings.platform = value;
                await this.save_settings();
                this.display();
            },
            onModelChange: async (value) => {
                const platform = settings.platform || 'anthropic';
                settings[`${platform}_model`] = value;
                await this.save_settings();
            },
            defaultPlatform: 'anthropic',
        });

        // Temperature + Max tokens for Main
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
            .setName('Max tokenów odpowiedzi')
            .setDesc('Maksymalna długość jednej odpowiedzi AI')
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

        // ── Minion model ──
        container.createEl('h3', { text: 'Minion (robota w tle)' });
        container.createEl('p', { text: 'Tańszy model do: ekstrakcji pamięci, auto-prep, delegowanych zadań. Pusty = używa Main.', cls: 'setting-item-description' });

        this._renderModelSlot(container, {
            platformValue: obsek.minionPlatform || '',
            modelValue: obsek.minionModel || '',
            availablePlatforms,
            onPlatformChange: async (value) => {
                obsek.minionPlatform = value;
                await this.save_settings();
                this.display();
            },
            onModelChange: async (value) => {
                obsek.minionModel = value;
                await this.save_settings();
            },
            defaultPlatform: '',
            allowEmpty: true,
        });

        // ── Master model ──
        container.createEl('h3', { text: 'Master (ekspert)' });
        container.createEl('p', { text: 'Najmocniejszy model do trudnych zadań. Agent deleguje W GÓRĘ gdy potrzebuje głębokiej analizy. Pusty = wyłączony.', cls: 'setting-item-description' });

        this._renderModelSlot(container, {
            platformValue: obsek.masterPlatform || '',
            modelValue: obsek.masterModel || '',
            availablePlatforms,
            onPlatformChange: async (value) => {
                obsek.masterPlatform = value;
                await this.save_settings();
                this.display();
            },
            onModelChange: async (value) => {
                obsek.masterModel = value;
                await this.save_settings();
            },
            defaultPlatform: '',
            allowEmpty: true,
        });

        // ── Embedding model ──
        container.createEl('h3', { text: 'Embedding (wektory)' });
        container.createEl('p', { text: 'Model do indeksowania vaulta (semantic search). Zmiana wymaga re-indeksowania.', cls: 'setting-item-description' });

        const embedSettings = this.env.settings.smart_sources?.embed_model || {};
        const currentEmbedAdapter = embedSettings.adapter || 'transformers';

        const embedPlatforms = [
            { id: 'transformers', name: 'Lokalny (w przeglądarce)' },
            { id: 'openai', name: 'OpenAI' },
            { id: 'ollama', name: 'Ollama' },
            { id: 'gemini', name: 'Google Gemini' },
            { id: 'lm_studio', name: 'LM Studio' },
        ];

        new Setting(container)
            .setName('Platforma embeddingu')
            .addDropdown(dropdown => {
                for (const ep of embedPlatforms) {
                    dropdown.addOption(ep.id, ep.name);
                }
                dropdown
                    .setValue(currentEmbedAdapter)
                    .onChange(async (value) => {
                        if (!this.env.settings.smart_sources.embed_model) {
                            this.env.settings.smart_sources.embed_model = {};
                        }
                        this.env.settings.smart_sources.embed_model.adapter = value;
                        await this.save_settings();
                        this.display();
                    });
            });

        // Model name field for embedding
        const embedModelKey = this._getEmbedModelKey(currentEmbedAdapter, embedSettings);
        const embedDefaults = {
            transformers: 'TaylorAI/bge-micro-v2',
            openai: 'text-embedding-3-small',
            ollama: 'nomic-embed-text',
            gemini: 'text-embedding-004',
            lm_studio: 'nomic-embed-text-v1.5',
        };

        new Setting(container)
            .setName('Model embeddingu')
            .setDesc(`Aktualny: ${embedModelKey || embedDefaults[currentEmbedAdapter] || 'domyślny'}`)
            .addText(text => {
                text
                    .setPlaceholder(embedDefaults[currentEmbedAdapter] || '')
                    .setValue(embedModelKey || '')
                    .onChange(async (value) => {
                        this._setEmbedModelKey(currentEmbedAdapter, value.trim(), this.env.settings.smart_sources);
                        await this.save_settings();
                    });
                text.inputEl.style.width = '250px';
            });

        // Re-index button
        const reindexSetting = new Setting(container)
            .setName('Re-indeksuj vault')
            .setDesc('Wyczyść stare wektory i przeindeksuj vault nowym modelem. Może potrwać kilka minut.');

        reindexSetting.addButton(btn => {
            btn.setButtonText('Re-indeksuj')
                .setCta()
                .onClick(async () => {
                    btn.setDisabled(true);
                    btn.setButtonText('Trwa re-indeksowanie...');
                    try {
                        if (this.env.smart_sources) {
                            await this.env.smart_sources.run_clear_all();
                            new Notice('Stare dane wyczyszczone. Indeksowanie rozpocznie się automatycznie.');
                        }
                    } catch (e) {
                        console.error('[Obsek] Re-index error:', e);
                        new Notice('Błąd re-indeksowania: ' + e.message);
                    } finally {
                        btn.setDisabled(false);
                        btn.setButtonText('Re-indeksuj');
                    }
                });
        });

        // ══════════════════════════════════════════
        // SEKCJA 3: PAMIĘĆ
        // ══════════════════════════════════════════
        container.createEl('h2', { text: '🧠 Pamięć' });

        new Setting(container)
            .setName('Pamięć w prompcie')
            .setDesc('Wstrzykuj pamięć (brain, podsumowania) do system promptu. Wyłącz dla szybszych odpowiedzi z lokalnymi modelami.')
            .addToggle(toggle => toggle
                .setValue(obsek.injectMemoryToPrompt !== false)
                .onChange(async (value) => {
                    obsek.injectMemoryToPrompt = value;
                    await this.save_settings();
                })
            );

        new Setting(container)
            .setName('Limit kontekstu')
            .setDesc('Max tokenów w oknie rozmowy (10k - 2M)')
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
            .setDesc('Automatycznie kompresuj rozmowę gdy kontekst się zapełnia')
            .addToggle(toggle => toggle
                .setValue(obsek.enableAutoSummarization !== false)
                .onChange(async (value) => {
                    obsek.enableAutoSummarization = value;
                    await this.save_settings();
                }));

        new Setting(container)
            .setName('Próg sumaryzacji')
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
            .setDesc('Zapisuj sesje co X minut (0 = wyłączone)')
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

        new Setting(container)
            .setName('Pokaż myślenie AI')
            .setDesc('Wyświetla proces rozumowania AI w zwijanym bloku (DeepSeek Reasoner, Anthropic thinking)')
            .addToggle(toggle => toggle
                .setValue(obsek.showThinking ?? true)
                .onChange(async (value) => {
                    obsek.showThinking = value;
                    await this.save_settings();
                }));

        // ══════════════════════════════════════════
        // SEKCJA 4: RAG
        // ══════════════════════════════════════════
        container.createEl('h2', { text: '🔍 RAG (wyszukiwanie kontekstu)' });

        new Setting(container)
            .setName('Włącz RAG')
            .setDesc('Wyszukiwanie semantyczne w poprzednich sesjach')
            .addToggle(toggle => toggle
                .setValue(obsek.enableRAG !== false)
                .onChange(async (value) => {
                    obsek.enableRAG = value;
                    await this.save_settings();
                }));

        new Setting(container)
            .setName('Próg podobieństwa')
            .setDesc('Minimalne podobieństwo wyników (0.5 = luźne, 0.9 = ściśle)')
            .addSlider(slider => slider
                .setLimits(0.5, 0.9, 0.05)
                .setValue(obsek.ragSimilarityThreshold || 0.7)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    obsek.ragSimilarityThreshold = value;
                    await this.save_settings();
                }));

        new Setting(container)
            .setName('Max wyników RAG')
            .setDesc('Ile wyników wyszukiwania dołączyć do kontekstu')
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

        // ══════════════════════════════════════════
        // SEKCJA 5: INFORMACJE
        // ══════════════════════════════════════════
        container.createEl('h2', { text: 'ℹ️ Informacje' });

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

    // ══════════════════════════════════════════
    // HELPERS
    // ══════════════════════════════════════════

    /**
     * Get list of platforms that have API keys or server addresses configured
     */
    _getAvailablePlatforms(settings) {
        const platforms = [];
        const apiProviders = ['anthropic', 'openai', 'deepseek', 'gemini', 'groq', 'open_router'];
        const localProviders = [
            { id: 'ollama', hostKey: 'ollama_host' },
            { id: 'lm_studio', hostKey: 'lm_studio_host' },
        ];

        for (const p of apiProviders) {
            if (settings[`${p}_api_key`]) {
                platforms.push({ id: p, name: this.get_platform_name(p) });
            }
        }
        for (const lp of localProviders) {
            if (settings[lp.hostKey]) {
                platforms.push({ id: lp.id, name: this.get_platform_name(lp.id) });
            }
        }
        return platforms;
    }

    /**
     * Render a model slot (platform dropdown + model name field)
     */
    _renderModelSlot(container, opts) {
        const {
            platformValue, modelValue, availablePlatforms,
            onPlatformChange, onModelChange, defaultPlatform, allowEmpty
        } = opts;

        new Setting(container)
            .setName('Platforma')
            .addDropdown(dropdown => {
                if (allowEmpty) {
                    dropdown.addOption('', '— używaj Main —');
                }
                for (const ap of availablePlatforms) {
                    dropdown.addOption(ap.id, ap.name);
                }
                // If current value not in available, still show it
                if (platformValue && !availablePlatforms.find(p => p.id === platformValue)) {
                    dropdown.addOption(platformValue, `${this.get_platform_name(platformValue)} (brak klucza!)`);
                }
                dropdown
                    .setValue(platformValue || defaultPlatform || '')
                    .onChange(onPlatformChange);
            });

        const activePlatform = platformValue || defaultPlatform || 'anthropic';
        new Setting(container)
            .setName('Model')
            .addText(text => {
                text
                    .setPlaceholder(this.get_default_model(activePlatform))
                    .setValue(modelValue || '')
                    .onChange(onModelChange);
                text.inputEl.style.width = '250px';
            });
    }

    /**
     * Get the current embed model key from nested settings
     */
    _getEmbedModelKey(adapter, embedSettings) {
        if (adapter === 'transformers') {
            return embedSettings?.transformers?.model_key || '';
        }
        if (adapter === 'openai') {
            return embedSettings?.openai?.model_key || '';
        }
        return embedSettings?.[adapter]?.model_key || '';
    }

    /**
     * Set the embed model key in nested settings
     */
    _setEmbedModelKey(adapter, value, smartSourcesSettings) {
        if (!smartSourcesSettings.embed_model) {
            smartSourcesSettings.embed_model = {};
        }
        if (!smartSourcesSettings.embed_model[adapter]) {
            smartSourcesSettings.embed_model[adapter] = {};
        }
        smartSourcesSettings.embed_model[adapter].model_key = value;
    }

    get_platform_name(platform) {
        const names = {
            anthropic: 'Anthropic',
            openai: 'OpenAI',
            open_router: 'OpenRouter',
            ollama: 'Ollama',
            gemini: 'Google Gemini',
            groq: 'Groq',
            deepseek: 'DeepSeek',
            lm_studio: 'LM Studio',
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
            deepseek: 'deepseek-chat',
            lm_studio: 'local-model',
        };
        return defaults[platform] || '';
    }

    async save_settings() {
        await this.env.smart_settings?.save();
    }
}
