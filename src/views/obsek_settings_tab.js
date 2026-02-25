import { SmartPluginSettingsTab } from "obsidian-smart-env";
import { Setting, Notice, Modal } from "obsidian";
import { maskKey } from '../utils/keySanitizer.js';
import { log } from '../utils/Logger.js';
import { getArchetypeList } from '../agents/archetypes/Archetypes.js';
import { buildModePromptSection, FACTORY_DEFAULTS, DECISION_TREE_GROUPS, DECISION_TREE_DEFAULTS } from '../core/PromptBuilder.js';
import { getTokenCount } from '../utils/tokenCounter.js';

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

    async render() {
        this.containerEl.empty();
        // Show PKM-branded loading message while env is loading (replaces SC's "Smart Environment is loading...")
        if (this.env?.state !== 'loaded') {
            if (this.env?.state === 'loading') {
                this.containerEl.createEl('p', { text: 'Ładowanie PKM Assistant...' });
            } else {
                this.containerEl.createEl('p', { text: 'PKM Assistant nie został jeszcze uruchomiony.' });
                const btn = this.containerEl.createEl('button', { text: 'Uruchom PKM Assistant' });
                btn.addEventListener('click', async () => {
                    btn.disabled = true;
                    btn.textContent = 'Ładowanie...';
                    await this.env.load(true);
                });
            }
        }
        await this.env.constructor.wait_for({ loaded: true });
        this.prepare_layout();
        await this.render_header(this.header_container);
        await this.render_plugin_settings(this.plugin_container);
        await this.render_global_settings(this.global_settings_container);
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
        // SEKCJA: NO-GO (prywatne foldery)
        // ══════════════════════════════════════════
        container.createEl('h2', { text: '🚫 No-Go — foldery prywatne' });
        container.createEl('p', {
            text: 'Foldery całkowicie niedostępne dla agentów i wykluczone z indeksowania. Jeden folder na linię.',
            cls: 'setting-item-description'
        });

        const noGoTextarea = new Setting(container)
            .setName('Foldery No-Go')
            .setDesc('np. _private, Secrets, .env')
            .addTextArea(text => {
                text
                    .setPlaceholder('_private\nSecrets')
                    .setValue((obsek.no_go_folders || []).join('\n'))
                    .onChange(async (value) => {
                        obsek.no_go_folders = value.split('\n').map(s => s.trim()).filter(Boolean);
                        // Update AccessGuard immediately
                        try {
                            const { AccessGuard } = await import('../core/AccessGuard.js');
                            AccessGuard.setNoGoFolders(obsek.no_go_folders);
                        } catch { /* ok */ }
                        await this.save_settings();
                    });
                text.inputEl.rows = 4;
                text.inputEl.style.width = '100%';
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
            .setName('Oczko (kontekst otwartej notatki)')
            .setDesc('Wstrzykuj tytuł, frontmatter i początek otwartej notatki do promptu AI. Agent będzie wiedział jaką notatkę masz otwartą.')
            .addToggle(toggle => toggle
                .setValue(obsek.enableOczko !== false)
                .onChange(async (value) => {
                    obsek.enableOczko = value;
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

        new Setting(container)
            .setName('🐛 Tryb debugowania')
            .setDesc('Pokazuje WSZYSTKO w konsoli (Ctrl+Shift+I): ładowanie, tool calle, modele, streaming, pamięć. Wyłącz po debugowaniu.')
            .addToggle(toggle => toggle
                .setValue(obsek.debugMode ?? false)
                .onChange(async (value) => {
                    obsek.debugMode = value;
                    log.setDebug(value);
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
        // SEKCJA 5: ROLE AGENTÓW
        // ══════════════════════════════════════════
        await this._renderRoleCreator(container);

        // ══════════════════════════════════════════
        // SEKCJA 6: SYSTEM PROMPT
        // ══════════════════════════════════════════
        container.createEl('h2', { text: '📋 System Prompt' });
        container.createEl('p', {
            text: 'Edytuj sekcje system promptu i przeglądaj strukturę aktywnego agenta.',
            cls: 'setting-item-description'
        });

        // Auto-prep toggle
        new Setting(container)
            .setName('Minion auto-prep')
            .setDesc('Minion automatycznie zbiera kontekst przy pierwszej wiadomości sesji')
            .addToggle(toggle => toggle
                .setValue(obsek.autoPrepEnabled !== false)
                .onChange(async (value) => {
                    obsek.autoPrepEnabled = value;
                    await this.save_settings();
                })
            );

        // --- Tryby Pracy ---
        container.createEl('h4', { text: 'Tryby Pracy' });

        new Setting(container)
            .setName('Domyślny tryb pracy')
            .setDesc('Tryb wybrany na starcie nowego chatu (gdy agent nie ma swojego)')
            .addDropdown(dropdown => {
                dropdown.addOption('rozmowa', '💬 Rozmowa');
                dropdown.addOption('planowanie', '📋 Planowanie');
                dropdown.addOption('praca', '🔨 Praca');
                dropdown.addOption('kreatywny', '✨ Kreatywny');
                dropdown.setValue(obsek.globalDefaultMode || 'rozmowa');
                dropdown.onChange(async (value) => {
                    obsek.globalDefaultMode = value;
                    await this.save_settings();
                });
            });

        new Setting(container)
            .setName('Auto-zmiana trybu przez agenta')
            .setDesc('Czy agent może sam proponować/zmieniać tryb pracy')
            .addDropdown(dropdown => {
                dropdown.addOption('off', 'Wyłączone — tylko ręcznie');
                dropdown.addOption('ask', 'Pytaj — agent proponuje, user zatwierdza');
                dropdown.addOption('on', 'Automatycznie — agent zmienia sam');
                dropdown.setValue(obsek.autoChangeMode || 'ask');
                dropdown.onChange(async (value) => {
                    obsek.autoChangeMode = value;
                    await this.save_settings();
                });
            });

        // ── Prompt Builder — unified panel ──
        const builderEl = container.createDiv({ cls: 'prompt-builder' });
        this._renderPromptBuilder(builderEl);

        // ══════════════════════════════════════════
        // SEKCJA 7: INFORMACJE
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
    // ROLE CREATOR
    // ══════════════════════════════════════════

    /**
     * Render Role Creator section — list custom roles, add/edit/delete.
     */
    async _renderRoleCreator(container) {
        container.createEl('h2', { text: '🎭 Role Agentów' });
        container.createEl('p', {
            text: 'Role definiują specjalizację agenta: osobowość, zachowanie, narzędzia, uprawnienia. Wbudowane role można edytować tworząc kopię.',
            cls: 'setting-item-description'
        });

        const roleLoader = this.plugin?.agentManager?.roleLoader;
        if (!roleLoader) {
            container.createEl('p', {
                text: 'Role Loader niedostępny — poczekaj na załadowanie Agent Managera.',
                cls: 'setting-item-description'
            });
            return;
        }

        const allRoles = roleLoader.getAllRoles();
        const builtIn = allRoles.filter(r => r.isBuiltIn);
        const custom = allRoles.filter(r => !r.isBuiltIn);

        // ── Built-in roles (read-only list) ──
        if (builtIn.length > 0) {
            container.createEl('h3', { text: 'Wbudowane role' });
            for (const role of builtIn) {
                const s = new Setting(container)
                    .setName(`${role.emoji} ${role.name}`)
                    .setDesc(role.description || '');
                s.addExtraButton(btn => {
                    btn.setIcon('copy')
                        .setTooltip('Stwórz kopię do edycji')
                        .onClick(() => {
                            const copy = {
                                ...role,
                                id: '',
                                name: `${role.name} (kopia)`,
                                isBuiltIn: false,
                                filePath: null,
                            };
                            new RoleEditorModal(this.app, roleLoader, copy, () => this.display()).open();
                        });
                });
            }
        }

        // ── Custom roles (editable) ──
        container.createEl('h3', { text: 'Własne role' });

        if (custom.length === 0) {
            container.createEl('p', {
                text: 'Brak własnych ról. Kliknij "Nowa rola" żeby stworzyć pierwszą.',
                cls: 'setting-item-description',
                attr: { style: 'font-style:italic;' }
            });
        } else {
            for (const role of custom) {
                const s = new Setting(container)
                    .setName(`${role.emoji} ${role.name}`)
                    .setDesc(role.description || '');
                s.addExtraButton(btn => {
                    btn.setIcon('pencil')
                        .setTooltip('Edytuj')
                        .onClick(() => {
                            new RoleEditorModal(this.app, roleLoader, { ...role }, () => this.display()).open();
                        });
                });
                s.addExtraButton(btn => {
                    btn.setIcon('trash')
                        .setTooltip('Usuń')
                        .onClick(async () => {
                            const ok = await roleLoader.deleteRole(role.id);
                            if (ok) {
                                new Notice(`Usunięto rolę: ${role.name}`);
                                this.display();
                            } else {
                                new Notice('Nie udało się usunąć roli.');
                            }
                        });
                });
            }
        }

        // Add button
        new Setting(container)
            .addButton(btn => {
                btn.setButtonText('+ Nowa rola')
                    .setCta()
                    .onClick(() => {
                        new RoleEditorModal(this.app, roleLoader, null, () => this.display()).open();
                    });
            });
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

    /**
     * Render Prompt Builder — unified panel with agent selector, toggleable/expandable sections,
     * live token counts, inline editors for editable sections.
     */
    async _renderPromptBuilder(container) {
        const agentManager = this.plugin?.agentManager;
        if (!agentManager) {
            container.createEl('p', { text: 'Agent Manager niedostępny.', cls: 'setting-item-description' });
            return;
        }

        const agents = agentManager.getAllAgents();
        if (!agents.length) {
            container.createEl('p', { text: 'Brak agentów.', cls: 'setting-item-description' });
            return;
        }

        const obsek = this.env?.settings?.obsek || {};
        if (!obsek.promptDefaults) obsek.promptDefaults = {};
        let selectedAgentName = agentManager.getActiveAgent()?.name || agents[0].name;

        // ── Header: agent selector + totals ──
        const headerEl = container.createDiv();
        headerEl.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--background-modifier-border); margin-bottom:8px; flex-wrap:wrap; gap:8px;';

        const leftHeader = headerEl.createDiv();
        leftHeader.style.cssText = 'display:flex; align-items:center; gap:8px;';
        leftHeader.createEl('span', { text: 'Agent:' });
        const agentSelect = leftHeader.createEl('select');
        agentSelect.style.cssText = 'padding:4px 8px; border-radius:4px; border:1px solid var(--background-modifier-border); background:var(--background-primary);';
        for (const agent of agents) {
            const opt = agentSelect.createEl('option', {
                text: `${agent.emoji} ${agent.name}`,
                value: agent.name,
            });
            if (agent.name === selectedAgentName) opt.selected = true;
        }

        const rightHeader = headerEl.createDiv();
        rightHeader.style.cssText = 'display:flex; align-items:center; gap:12px;';
        const totalTokensEl = rightHeader.createEl('strong', { text: '...' });
        const totalCountEl = rightHeader.createEl('span', { text: '...', cls: 'setting-item-description' });

        // ── Body ──
        const bodyEl = container.createDiv();

        // ── Categories ──
        const categories = {
            core:     '🔵 Rdzeń',
            behavior: '🟢 Zachowanie',
            rules:    '🟡 Zasady',
            context:  '🟣 Kontekst dynamiczny',
        };

        // State
        const expandedSet = new Set();
        let allSections = [];
        const catTokenEls = new Map();

        // Live token update
        const updateTokenDisplays = () => {
            let total = 0;
            let enabledCount = 0;
            for (const s of allSections) {
                if (s.enabled) { total += s.tokens; enabledCount++; }
            }
            totalTokensEl.textContent = `${total.toLocaleString()} tok`;
            totalCountEl.textContent = `${enabledCount}/${allSections.length} sekcji`;
            for (const [catKey, el] of catTokenEls) {
                const catTotal = allSections
                    .filter(s => s.category === catKey && s.enabled)
                    .reduce((sum, s) => sum + s.tokens, 0);
                el.textContent = `${catTotal.toLocaleString()} tok`;
            }
        };

        // Render body for selected agent
        const renderBody = async (agentName) => {
            bodyEl.empty();
            catTokenEls.clear();

            try {
                const data = await agentManager.getPromptInspectorDataForAgent(agentName);
                allSections = data.sections || [];

                if (!allSections.length) {
                    bodyEl.createEl('p', { text: 'Brak sekcji promptu.', cls: 'setting-item-description' });
                    updateTokenDisplays();
                    return;
                }

                for (const [catKey, catLabel] of Object.entries(categories)) {
                    const catSections = allSections.filter(s => s.category === catKey);
                    if (catSections.length === 0) continue;

                    const groupEl = bodyEl.createDiv();
                    groupEl.style.cssText = 'margin:10px 0 4px 0;';

                    // Category header
                    const catHeader = groupEl.createDiv();
                    catHeader.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:4px 0; font-weight:600;';
                    catHeader.createEl('span', { text: catLabel });
                    const catTokenEl = catHeader.createEl('span', { text: '0 tok', cls: 'setting-item-description' });
                    catTokenEls.set(catKey, catTokenEl);

                    // Section rows
                    for (const section of catSections) {
                        this._renderPromptBuilderRow(groupEl, section, expandedSet, updateTokenDisplays, obsek);
                    }
                }

                updateTokenDisplays();
            } catch (e) {
                bodyEl.createEl('p', { text: `Błąd: ${e.message}`, cls: 'setting-item-description' });
                log.warn('Settings', 'Prompt Builder error:', e);
            }
        };

        agentSelect.addEventListener('change', () => {
            selectedAgentName = agentSelect.value;
            renderBody(selectedAgentName);
        });

        await renderBody(selectedAgentName);

        // ── Footer: Preview + Copy ──
        const footerEl = container.createDiv();
        footerEl.style.cssText = 'border-top:1px solid var(--background-modifier-border); margin-top:12px; padding-top:8px;';

        const previewSetting = new Setting(footerEl)
            .setName('Podgląd pełnego promptu')
            .setDesc('Kompletny prompt ze wszystkimi warstwami dynamicznymi');
        previewSetting.addButton(btn => {
            btn.setButtonText('Pokaż prompt')
                .onClick(async () => {
                    try {
                        const agent = agentManager.getAgent(selectedAgentName) || agentManager.getActiveAgent();
                        let fullPrompt;
                        let lastUserMessage = null;
                        let source;

                        const snapshot = this.plugin._lastSentSnapshot;

                        if (snapshot && snapshot.systemPrompt && agent.name === agentManager.getActiveAgent()?.name) {
                            fullPrompt = snapshot.systemPrompt;
                            if (snapshot.conversationSummary) {
                                fullPrompt += '\n\n---\nPodsumowanie poprzedniej części rozmowy:\n' + snapshot.conversationSummary;
                            }
                            lastUserMessage = snapshot.lastUserMessage;
                            source = 'snapshot';
                        } else {
                            fullPrompt = await agentManager.getActiveSystemPromptWithMemory();

                            const currentMode = this.plugin.currentWorkMode || 'rozmowa';
                            const modeSection = buildModePromptSection(currentMode);
                            if (modeSection) fullPrompt += '\n\n' + modeSection;

                            const oczkoEnabled = this.env?.settings?.obsek?.enableOczko !== false;
                            if (oczkoEnabled) {
                                const activeFile = this.app.workspace.getActiveFile();
                                if (activeFile && activeFile.extension === 'md') {
                                    const lines = [`## Otwarta notatka: ${activeFile.basename}`, `Ścieżka: ${activeFile.path}`];
                                    try {
                                        const cache = this.app.metadataCache.getFileCache(activeFile);
                                        const fm = cache?.frontmatter;
                                        if (fm && Object.keys(fm).length > 0) {
                                            const entries = Object.entries(fm)
                                                .filter(([k]) => k !== 'position')
                                                .map(([k, v]) => `  ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                                                .join('\n');
                                            if (entries) lines.push(`Frontmatter:\n${entries}`);
                                        }
                                    } catch (e) { /* ignore */ }
                                    try {
                                        const raw = await this.app.vault.cachedRead(activeFile);
                                        let content = raw.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
                                        if (content.length > 2000) content = content.slice(0, 2000) + '\n[...obcięto]';
                                        if (content) lines.push(`Treść (początek):\n${content}`);
                                    } catch (e) { /* ignore */ }
                                    fullPrompt += '\n\n' + lines.join('\n');
                                }
                            }

                            const todoStore = this.plugin._chatTodoStore;
                            const planStore = this.plugin._planStore;
                            if ((todoStore?.size > 0) || (planStore?.size > 0)) {
                                const aLines = ['--- Istniejące artefakty (użyj tych ID zamiast tworzyć nowe) ---'];
                                if (todoStore?.size > 0) {
                                    for (const [id, todo] of todoStore) {
                                        const done = todo.items?.filter(i => i.done).length || 0;
                                        const total = todo.items?.length || 0;
                                        aLines.push(`TODO "${todo.title}" (id: ${id}) — ${done}/${total} gotowe`);
                                    }
                                }
                                if (planStore?.size > 0) {
                                    for (const [id, plan] of planStore) {
                                        const done = plan.steps?.filter(s => s.status === 'done').length || 0;
                                        const total = plan.steps?.length || 0;
                                        const status = plan.approved ? 'zatwierdzony' : 'niezatwierdzony';
                                        aLines.push(`PLAN "${plan.title}" (id: ${id}) — ${done}/${total} kroków, ${status}`);
                                    }
                                }
                                fullPrompt += '\n\n' + aLines.join('\n');
                            }

                            fullPrompt += '\n\n[--- RAG: niedostępny w podglądzie (wymaga wiadomości) ---]';
                            fullPrompt += '\n[--- Minion auto-prep: niedostępny w podglądzie (wymaga wiadomości) ---]';
                            source = 'fallback';
                        }

                        const modal = new Modal(this.app);
                        modal.titleEl.setText(`System Prompt — ${agent.emoji} ${agent.name}`);

                        const copyBtn = modal.titleEl.createEl('button', {
                            text: 'Kopiuj',
                            attr: { style: 'margin-left: 12px; font-size: 0.8em; cursor: pointer;' }
                        });
                        copyBtn.addEventListener('click', async () => {
                            let copyText = fullPrompt;
                            if (lastUserMessage) {
                                copyText += '\n\n--- Ostatnia wiadomość użytkownika ---\n' + lastUserMessage;
                            }
                            await navigator.clipboard.writeText(copyText);
                            copyBtn.textContent = 'Skopiowano!';
                            setTimeout(() => { copyBtn.textContent = 'Kopiuj'; }, 2000);
                        });

                        const sourceText = source === 'snapshot'
                            ? `Rzeczywisty prompt z ostatniego wysłania (${new Date(snapshot.timestamp).toLocaleTimeString('pl-PL')})`
                            : 'Podgląd — brak wysłanych wiadomości, symulacja warstw dynamicznych';
                        const infoEl = modal.contentEl.createDiv();
                        infoEl.style.cssText = 'padding:4px 8px; margin-bottom:8px; font-size:0.8em; color:var(--text-muted); border-left:3px solid var(--interactive-accent);';
                        infoEl.textContent = sourceText;

                        const contentEl = modal.contentEl.createDiv();
                        contentEl.style.cssText = 'white-space:pre-wrap; font-family:monospace; font-size:0.8em; max-height:60vh; overflow-y:auto; padding:8px;';
                        contentEl.textContent = fullPrompt;

                        if (lastUserMessage) {
                            modal.contentEl.createDiv().style.cssText = 'border-top:2px solid var(--interactive-accent); margin:12px 0 8px 0;';
                            const msgHeader = modal.contentEl.createDiv();
                            msgHeader.style.cssText = 'font-weight:bold; font-size:0.85em; margin-bottom:4px;';
                            msgHeader.textContent = 'I teraz to co napisałeś:';
                            const msgEl = modal.contentEl.createDiv();
                            msgEl.style.cssText = 'white-space:pre-wrap; font-family:monospace; font-size:0.8em; max-height:20vh; overflow-y:auto; padding:8px; background:var(--background-secondary); border-radius:4px;';
                            msgEl.textContent = lastUserMessage;
                        }

                        modal.open();
                    } catch (e) {
                        new Notice('Błąd podglądu promptu: ' + e.message);
                    }
                });
        });
    }

    /**
     * Render a single section row in the Prompt Builder panel.
     * [checkbox] [▸/▾ arrow] [label] [XX tok]
     * + expandable content below
     */
    _renderPromptBuilderRow(parentEl, section, expandedSet, updateTokenDisplays, obsek) {
        const rowEl = parentEl.createDiv();
        rowEl.style.cssText = 'display:flex; align-items:center; padding:3px 0 3px 8px; font-size:0.88em; gap:6px;';

        // Checkbox toggle
        const cb = rowEl.createEl('input', { type: 'checkbox' });
        cb.checked = section.enabled;
        cb.style.cssText = 'flex-shrink:0; cursor:pointer; margin:0;';
        if (!section.enabled) rowEl.style.opacity = '0.5';

        // Expand arrow
        const isExpanded = expandedSet.has(section.key);
        const arrow = rowEl.createEl('span', { text: isExpanded ? '▾' : '▸' });
        arrow.style.cssText = 'flex-shrink:0; width:14px; font-size:0.85em; user-select:none; cursor:pointer; text-align:center;';

        // Label (clickable for expand)
        const labelEl = rowEl.createEl('span', { text: section.label });
        labelEl.style.cssText = 'cursor:pointer; user-select:none;';

        // Token count (right-aligned)
        const tokEl = rowEl.createEl('span', {
            text: section.enabled ? `${section.tokens.toLocaleString()} tok` : '—',
            cls: 'setting-item-description',
        });
        tokEl.style.cssText = 'margin-left:auto; white-space:nowrap;';

        // Expand container (below row)
        const expandEl = parentEl.createDiv();
        expandEl.style.cssText = `display:${isExpanded ? 'block' : 'none'}; margin:4px 0 8px 28px; padding:8px; border:1px solid var(--background-modifier-border); border-radius:4px; background:var(--background-secondary-alt);`;

        // Toggle enable/disable
        cb.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!obsek.disabledPromptSections) obsek.disabledPromptSections = [];

            if (section.enabled) {
                if (!obsek.disabledPromptSections.includes(section.key)) {
                    obsek.disabledPromptSections.push(section.key);
                }
                section.enabled = false;
                rowEl.style.opacity = '0.5';
                tokEl.textContent = '—';
            } else {
                obsek.disabledPromptSections = obsek.disabledPromptSections.filter(k => k !== section.key);
                section.enabled = true;
                rowEl.style.opacity = '1';
                tokEl.textContent = `${section.tokens.toLocaleString()} tok`;
            }
            await this.save_settings();
            updateTokenDisplays();
        });

        // Expand/collapse
        const toggleExpand = () => {
            if (expandEl.style.display === 'none') {
                expandedSet.add(section.key);
                expandEl.style.display = 'block';
                arrow.textContent = '▾';
                if (!expandEl.dataset.rendered) {
                    this._renderExpandedContent(expandEl, section, obsek, tokEl, updateTokenDisplays);
                    expandEl.dataset.rendered = 'true';
                }
            } else {
                expandedSet.delete(section.key);
                expandEl.style.display = 'none';
                arrow.textContent = '▸';
            }
        };

        arrow.addEventListener('click', toggleExpand);
        labelEl.addEventListener('click', toggleExpand);
    }

    /**
     * Render expanded content for a section in Prompt Builder.
     * Chooses editor type based on section key and editable flag.
     */
    _renderExpandedContent(container, section, obsek, tokEl, updateTokenDisplays) {
        const pd = obsek.promptDefaults || {};

        if (section.key === 'decision_tree') {
            this._renderDTEditorInline(container, pd);
        } else if (section.key === 'agora_data') {
            this._renderAgoraEditorInline(container, obsek, section.content);
        } else if (section.editable) {
            this._renderTextareaEditorInline(container, section.key, pd, section, tokEl, updateTokenDisplays);
        } else {
            // Read-only preview
            const pre = container.createEl('pre');
            pre.style.cssText = 'white-space:pre-wrap; font-size:0.82em; font-family:monospace; margin:0; max-height:300px; overflow-y:auto; color:var(--text-muted);';
            pre.textContent = section.content || '(brak treści)';
            container.createEl('p', {
                text: '(edycja w profilu agenta)',
                cls: 'setting-item-description',
            }).style.cssText = 'margin:4px 0 0 0; font-size:0.75em; font-style:italic;';
        }
    }

    /**
     * Textarea editor for editable sections (environment, rules, minion_guide, master_guide).
     */
    _renderTextareaEditorInline(container, key, pd, section, tokEl, updateTokenDisplays) {
        const taStyle = 'width:100%; min-height:100px; font-family:monospace; font-size:0.82em; resize:vertical; padding:6px; border:1px solid var(--background-modifier-border); border-radius:3px; background:var(--background-primary);';

        const textarea = container.createEl('textarea');
        textarea.value = pd[key] || FACTORY_DEFAULTS[key] || '';
        textarea.style.cssText = taStyle;

        textarea.addEventListener('change', async () => {
            const val = textarea.value.trim();
            if (val === FACTORY_DEFAULTS[key]?.trim()) {
                delete pd[key];
            } else {
                pd[key] = val;
            }
            await this.save_settings();
            // Update token count in-place
            section.tokens = getTokenCount(val || FACTORY_DEFAULTS[key] || '');
            tokEl.textContent = `${section.tokens.toLocaleString()} tok`;
            updateTokenDisplays();
        });

        const btnRow = container.createDiv();
        btnRow.style.cssText = 'margin-top:4px;';
        const resetBtn = btnRow.createEl('button', { text: 'Przywróć domyślne', cls: 'mod-cta' });
        resetBtn.style.cssText = 'font-size:0.78em; padding:2px 8px;';
        resetBtn.addEventListener('click', async () => {
            textarea.value = FACTORY_DEFAULTS[key] || '';
            delete pd[key];
            await this.save_settings();
            section.tokens = getTokenCount(FACTORY_DEFAULTS[key] || '');
            tokEl.textContent = `${section.tokens.toLocaleString()} tok`;
            updateTokenDisplays();
        });
    }

    /**
     * Decision tree instruction editor (inline in Prompt Builder).
     */
    _renderDTEditorInline(container, pd) {
        if (!pd.decisionTreeOverrides) pd.decisionTreeOverrides = {};
        const dtOvr = pd.decisionTreeOverrides;

        const inputStyle = 'flex:1; font-family:monospace; font-size:0.82em; padding:3px 6px; border:1px solid var(--background-modifier-border); border-radius:3px; background:var(--background-primary);';
        const rowStyle = 'display:flex; align-items:center; gap:6px; margin-bottom:3px; padding:2px 0;';

        const sortedGroups = Object.entries(DECISION_TREE_GROUPS)
            .sort(([, a], [, b]) => a.order - b.order);

        for (const [groupId, groupDef] of sortedGroups) {
            container.createEl('strong', { text: groupDef.label }).style.cssText = 'display:block; margin:8px 0 4px 0; font-size:0.85em;';

            const groupInstructions = DECISION_TREE_DEFAULTS.filter(d => d.group === groupId);

            for (const instr of groupInstructions) {
                const isDisabled = dtOvr[instr.id] === false;
                const overrideText = typeof dtOvr[instr.id] === 'string' ? dtOvr[instr.id] : '';

                const row = container.createDiv();
                row.style.cssText = rowStyle;

                const cb = row.createEl('input', { type: 'checkbox' });
                cb.checked = !isDisabled;
                cb.style.cssText = 'flex-shrink:0; cursor:pointer;';

                const input = row.createEl('input', { type: 'text' });
                input.value = overrideText || instr.text;
                input.placeholder = instr.text;
                input.style.cssText = inputStyle;
                input.disabled = isDisabled;
                if (isDisabled) input.style.opacity = '0.4';

                if (instr.tool) {
                    const badge = row.createEl('span', { text: instr.tool });
                    badge.style.cssText = 'font-size:0.65em; opacity:0.4; white-space:nowrap; font-family:monospace;';
                }

                const resetBtn = row.createEl('button', { text: '↺', cls: 'clickable-icon' });
                resetBtn.title = 'Przywróć domyślny';
                resetBtn.style.cssText = 'flex-shrink:0; font-size:0.9em; padding:1px 5px;';

                cb.addEventListener('change', async () => {
                    if (cb.checked) {
                        if (dtOvr[instr.id] === false) delete dtOvr[instr.id];
                        input.disabled = false;
                        input.style.opacity = '1';
                    } else {
                        dtOvr[instr.id] = false;
                        input.disabled = true;
                        input.style.opacity = '0.4';
                    }
                    await this.save_settings();
                });

                input.addEventListener('change', async () => {
                    const val = input.value.trim();
                    if (val === instr.text || val === '') {
                        delete dtOvr[instr.id];
                        input.value = instr.text;
                    } else {
                        dtOvr[instr.id] = val;
                    }
                    await this.save_settings();
                });

                resetBtn.addEventListener('click', async () => {
                    input.value = instr.text;
                    delete dtOvr[instr.id];
                    cb.checked = true;
                    input.disabled = false;
                    input.style.opacity = '1';
                    await this.save_settings();
                });
            }

            // Custom instructions for this group
            const customKeys = Object.keys(dtOvr).filter(k =>
                k.startsWith('custom_') && typeof dtOvr[k] === 'object' && dtOvr[k]?.group === groupId
            );
            for (const key of customKeys) {
                const custom = dtOvr[key];
                const row = container.createDiv();
                row.style.cssText = rowStyle;

                const cb = row.createEl('input', { type: 'checkbox' });
                cb.checked = true;
                cb.style.cssText = 'flex-shrink:0; cursor:pointer;';

                const input = row.createEl('input', { type: 'text' });
                input.value = custom.text;
                input.style.cssText = inputStyle;

                const badge = row.createEl('span', { text: 'custom' });
                badge.style.cssText = 'font-size:0.65em; opacity:0.4; white-space:nowrap; font-family:monospace; color:var(--text-accent);';

                const delBtn = row.createEl('button', { text: '✕', cls: 'clickable-icon' });
                delBtn.title = 'Usuń instrukcję';
                delBtn.style.cssText = 'flex-shrink:0; font-size:0.9em; padding:1px 5px; color:var(--text-error);';

                input.addEventListener('change', async () => {
                    custom.text = input.value.trim();
                    await this.save_settings();
                });

                delBtn.addEventListener('click', async () => {
                    delete dtOvr[key];
                    await this.save_settings();
                    row.remove();
                });
            }

            // "+ Dodaj instrukcję" button
            const addBtn = container.createEl('button', { text: '+ Dodaj instrukcję', cls: 'clickable-icon' });
            addBtn.style.cssText = 'font-size:0.75em; margin-bottom:6px; opacity:0.6;';
            addBtn.addEventListener('click', async () => {
                const customId = `custom_${groupId}_${Date.now()}`;
                dtOvr[customId] = { group: groupId, text: 'Nowa instrukcja — edytuj tekst', tool: null };
                await this.save_settings();
                // Re-render just the DT container
                container.empty();
                this._renderDTEditorInline(container, pd);
            });
        }
    }

    /**
     * Agora scope editor (inline in Prompt Builder).
     * Checkboxes for profile/activity/projects + content preview.
     */
    _renderAgoraEditorInline(container, obsek, contentPreview) {
        if (!obsek.agoraScope) obsek.agoraScope = {};
        const agoraScope = obsek.agoraScope;

        const agoraSections = [
            { key: 'profile', label: 'Profil użytkownika' },
            { key: 'activity', label: 'Ostatnia aktywność' },
            { key: 'projects', label: 'Aktywne projekty' },
        ];

        for (const as of agoraSections) {
            const row = container.createDiv();
            row.style.cssText = 'display:flex; align-items:center; gap:8px; padding:2px 0;';

            const cb = row.createEl('input', { type: 'checkbox' });
            cb.checked = agoraScope[as.key] !== false;
            cb.style.cssText = 'cursor:pointer; margin:0;';

            row.createEl('span', { text: as.label }).style.cssText = 'font-size:0.88em;';

            cb.addEventListener('change', async () => {
                agoraScope[as.key] = cb.checked;
                await this.save_settings();
            });
        }

        // Content preview
        if (contentPreview) {
            const pre = container.createEl('pre');
            pre.style.cssText = 'white-space:pre-wrap; font-size:0.78em; font-family:monospace; margin:8px 0 0 0; max-height:200px; overflow-y:auto; color:var(--text-muted); border-top:1px solid var(--background-modifier-border); padding-top:6px;';
            pre.textContent = contentPreview;
        }
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

// ══════════════════════════════════════════
// RoleEditorModal — formularz tworzenia/edycji roli
// ══════════════════════════════════════════

class RoleEditorModal extends Modal {
    /**
     * @param {import('obsidian').App} app
     * @param {import('../agents/roles/RoleLoader.js').RoleLoader} roleLoader
     * @param {Object|null} roleData - Existing role data to edit, or null for new
     * @param {Function} onSaved - Callback after save
     */
    constructor(app, roleLoader, roleData, onSaved) {
        super(app);
        this.roleLoader = roleLoader;
        this.onSaved = onSaved;
        this.isNew = !roleData?.id;

        // Form state
        this.form = {
            id: roleData?.id || '',
            name: roleData?.name || '',
            emoji: roleData?.emoji || '🤖',
            archetype: roleData?.archetype || 'specialist',
            description: roleData?.description || '',
            behavior_rules: (roleData?.behavior_rules || []).join('\n'),
            personality_template: roleData?.personality_template || '',
            recommended_skills: (roleData?.recommended_skills || []).join(', '),
            focus_folders: (roleData?.focus_folders || []).join(', '),
            temperature: roleData?.temperature ?? 0.6,
            // permissions
            perm_read: roleData?.default_permissions?.read_notes ?? true,
            perm_edit: roleData?.default_permissions?.edit_notes ?? false,
            perm_create: roleData?.default_permissions?.create_files ?? false,
            perm_mcp: roleData?.default_permissions?.mcp ?? true,
        };
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('role-editor-modal');

        contentEl.createEl('h2', {
            text: this.isNew ? 'Nowa rola agenta' : `Edytuj: ${this.form.emoji} ${this.form.name}`
        });

        const archetypes = getArchetypeList();

        // ── Name + Emoji row ──
        const nameRow = contentEl.createDiv({ attr: { style: 'display:flex; gap:10px; margin-bottom:12px;' } });

        const emojiDiv = nameRow.createDiv({ attr: { style: 'flex:0 0 60px;' } });
        emojiDiv.createEl('label', { text: 'Emoji', cls: 'setting-item-description', attr: { style: 'display:block; margin-bottom:2px;' } });
        const emojiInput = emojiDiv.createEl('input', { type: 'text', value: this.form.emoji });
        emojiInput.style.cssText = 'width:50px; text-align:center; font-size:1.2em; padding:4px;';
        emojiInput.addEventListener('input', () => { this.form.emoji = emojiInput.value; });

        const nameDiv = nameRow.createDiv({ attr: { style: 'flex:1;' } });
        nameDiv.createEl('label', { text: 'Nazwa roli', cls: 'setting-item-description', attr: { style: 'display:block; margin-bottom:2px;' } });
        const nameInput = nameDiv.createEl('input', { type: 'text', value: this.form.name, placeholder: 'np. Pisarz Kreatywny' });
        nameInput.style.cssText = 'width:100%; padding:6px 8px;';
        nameInput.addEventListener('input', () => { this.form.name = nameInput.value; });

        // ── Archetype dropdown ──
        new Setting(contentEl)
            .setName('Archetyp')
            .setDesc('Klasa agenta — definiuje filozofię pracy')
            .addDropdown(dd => {
                for (const a of archetypes) {
                    dd.addOption(a.id, `${a.emoji} ${a.name}`);
                }
                dd.setValue(this.form.archetype);
                dd.onChange(v => { this.form.archetype = v; });
            });

        // ── Description ──
        new Setting(contentEl)
            .setName('Opis')
            .setDesc('Krótki opis roli (widoczny w listach)');

        const descInput = contentEl.createEl('textarea', {
            placeholder: 'Czym się zajmuje ta rola...',
        });
        descInput.value = this.form.description;
        descInput.style.cssText = 'width:100%; min-height:60px; font-size:0.85em; padding:8px; resize:vertical; margin-bottom:12px; border:1px solid var(--background-modifier-border); border-radius:4px; background:var(--background-primary);';
        descInput.addEventListener('input', () => { this.form.description = descInput.value; });

        // ── Behavior rules ──
        new Setting(contentEl)
            .setName('Zasady zachowania')
            .setDesc('Każda linia = osobna zasada wstrzykiwana do promptu');

        const rulesInput = contentEl.createEl('textarea', {
            placeholder: 'Zasada 1\nZasada 2\nZasada 3',
        });
        rulesInput.value = this.form.behavior_rules;
        rulesInput.style.cssText = 'width:100%; min-height:100px; font-size:0.85em; padding:8px; resize:vertical; margin-bottom:12px; border:1px solid var(--background-modifier-border); border-radius:4px; background:var(--background-primary); font-family:var(--font-monospace);';
        rulesInput.addEventListener('input', () => { this.form.behavior_rules = rulesInput.value; });

        // ── Personality template ──
        new Setting(contentEl)
            .setName('Szablon osobowości')
            .setDesc('Tekst wstrzykiwany jako personality. Użyj {name} jako placeholder na imię agenta.');

        const personInput = contentEl.createEl('textarea', {
            placeholder: 'Jestem {name} — ekspert od...\n\nMoje podejście:\n- ...',
        });
        personInput.value = this.form.personality_template;
        personInput.style.cssText = 'width:100%; min-height:120px; font-size:0.85em; padding:8px; resize:vertical; margin-bottom:12px; border:1px solid var(--background-modifier-border); border-radius:4px; background:var(--background-primary);';
        personInput.addEventListener('input', () => { this.form.personality_template = personInput.value; });

        // ── Skills + Folders row ──
        const extraRow = contentEl.createDiv({ attr: { style: 'display:flex; gap:12px; margin-bottom:12px;' } });

        const skillsDiv = extraRow.createDiv({ attr: { style: 'flex:1;' } });
        skillsDiv.createEl('label', { text: 'Sugerowane skille', cls: 'setting-item-description', attr: { style: 'display:block; margin-bottom:2px;' } });
        const skillsInput = skillsDiv.createEl('input', { type: 'text', placeholder: 'daily-review, vault-organization', value: this.form.recommended_skills });
        skillsInput.style.cssText = 'width:100%; padding:6px 8px; font-size:0.85em;';
        skillsInput.addEventListener('input', () => { this.form.recommended_skills = skillsInput.value; });

        const foldersDiv = extraRow.createDiv({ attr: { style: 'flex:1;' } });
        foldersDiv.createEl('label', { text: 'Focus foldery', cls: 'setting-item-description', attr: { style: 'display:block; margin-bottom:2px;' } });
        const foldersInput = foldersDiv.createEl('input', { type: 'text', placeholder: 'Templates/**, Projects/**', value: this.form.focus_folders });
        foldersInput.style.cssText = 'width:100%; padding:6px 8px; font-size:0.85em;';
        foldersInput.addEventListener('input', () => { this.form.focus_folders = foldersInput.value; });

        // ── Temperature ──
        new Setting(contentEl)
            .setName('Temperatura')
            .setDesc(`Domyślna temperatura: ${this.form.temperature}`)
            .addSlider(slider => {
                slider.setLimits(0, 1, 0.1)
                    .setValue(this.form.temperature)
                    .setDynamicTooltip()
                    .onChange(v => { this.form.temperature = v; });
            });

        // ── Permissions ──
        contentEl.createEl('h3', { text: 'Domyślne uprawnienia', attr: { style: 'margin-top:8px;' } });

        new Setting(contentEl)
            .setName('Czytanie notatek')
            .addToggle(t => t.setValue(this.form.perm_read).onChange(v => { this.form.perm_read = v; }));

        new Setting(contentEl)
            .setName('Edycja notatek')
            .addToggle(t => t.setValue(this.form.perm_edit).onChange(v => { this.form.perm_edit = v; }));

        new Setting(contentEl)
            .setName('Tworzenie plików')
            .addToggle(t => t.setValue(this.form.perm_create).onChange(v => { this.form.perm_create = v; }));

        new Setting(contentEl)
            .setName('Narzędzia MCP')
            .addToggle(t => t.setValue(this.form.perm_mcp).onChange(v => { this.form.perm_mcp = v; }));

        // ── Save / Cancel buttons ──
        const btnRow = contentEl.createDiv({ attr: { style: 'display:flex; justify-content:flex-end; gap:10px; margin-top:16px; padding-top:12px; border-top:1px solid var(--background-modifier-border);' } });

        const cancelBtn = btnRow.createEl('button', { text: 'Anuluj' });
        cancelBtn.addEventListener('click', () => this.close());

        const saveBtn = btnRow.createEl('button', { text: 'Zapisz rolę', cls: 'mod-cta' });
        saveBtn.addEventListener('click', () => this._save());
    }

    async _save() {
        // Validate
        if (!this.form.name.trim()) {
            new Notice('Nazwa roli jest wymagana.');
            return;
        }

        const roleData = {
            id: this.form.id || undefined, // RoleLoader will slugify name if empty
            name: this.form.name.trim(),
            emoji: this.form.emoji.trim() || '🤖',
            archetype: this.form.archetype,
            description: this.form.description.trim(),
            behavior_rules: this.form.behavior_rules
                .split('\n')
                .map(l => l.trim())
                .filter(l => l.length > 0),
            personality_template: this.form.personality_template.trim(),
            recommended_skills: this.form.recommended_skills
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0),
            focus_folders: this.form.focus_folders
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0),
            temperature: this.form.temperature,
            default_permissions: {
                read_notes: this.form.perm_read,
                edit_notes: this.form.perm_edit,
                create_files: this.form.perm_create,
                mcp: this.form.perm_mcp,
            },
        };

        try {
            await this.roleLoader.saveRole(roleData);
            new Notice(`Zapisano rolę: ${roleData.emoji} ${roleData.name}`);
            this.close();
            this.onSaved?.();
        } catch (e) {
            console.error('[RoleEditor] Save error:', e);
            new Notice(`Błąd zapisu roli: ${e.message}`);
        }
    }

    onClose() {
        this.contentEl.empty();
    }
}
