import { SmartPluginSettingsTab } from "obsidian-smart-env";
import { Setting, Notice, Modal } from "obsidian";
import { maskKey } from '../utils/keySanitizer.js';
import { log } from '../utils/Logger.js';
import { getArchetypeList } from '../agents/archetypes/Archetypes.js';

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

        // PKM System prompt textarea
        new Setting(container)
            .setName('Sekcja "PKM Assistant"')
            .setDesc('Opis ekosystemu PKM wstrzykiwany do każdego agenta. Pusty = domyślny tekst z kodu.');

        const pkmTextarea = container.createEl('textarea', {
            placeholder: 'Pusty = domyślny opis PKM Assistant (agenci, narzędzia, pamięć, skille, embedding...)',
        });
        pkmTextarea.value = obsek.pkmSystemPrompt || '';
        pkmTextarea.style.cssText = 'width:100%; min-height:120px; font-family:monospace; font-size:0.85em; resize:vertical; margin-bottom:12px; padding:8px; border:1px solid var(--background-modifier-border); border-radius:4px; background:var(--background-primary);';
        pkmTextarea.addEventListener('change', async () => {
            obsek.pkmSystemPrompt = pkmTextarea.value.trim();
            await this.save_settings();
        });

        // Environment prompt textarea
        new Setting(container)
            .setName('Sekcja "Środowisko"')
            .setDesc('Opis środowiska pracy (Obsidian, vault, foldery). Pusty = domyślny tekst z kodu.');

        const envTextarea = container.createEl('textarea', {
            placeholder: 'Pusty = domyślny opis Obsidian/Vault (markdown, wikilinki, foldery .pkm-assistant i .obsidian...)',
        });
        envTextarea.value = obsek.environmentPrompt || '';
        envTextarea.style.cssText = 'width:100%; min-height:120px; font-family:monospace; font-size:0.85em; resize:vertical; margin-bottom:12px; padding:8px; border:1px solid var(--background-modifier-border); border-radius:4px; background:var(--background-primary);';
        envTextarea.addEventListener('change', async () => {
            obsek.environmentPrompt = envTextarea.value.trim();
            await this.save_settings();
        });

        // Prompt Inspector panel (async)
        const inspectorEl = container.createDiv({ cls: 'prompt-inspector' });
        this._renderPromptInspector(inspectorEl);

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
     * Render Prompt Inspector — shows sections + token breakdown for active agent
     */
    async _renderPromptInspector(container) {
        const agentManager = this.plugin?.agentManager;
        if (!agentManager) {
            container.createEl('p', { text: 'Agent Manager niedostępny.', cls: 'setting-item-description' });
            return;
        }

        const activeAgent = agentManager.getActiveAgent();
        if (!activeAgent) {
            container.createEl('p', { text: 'Brak aktywnego agenta.', cls: 'setting-item-description' });
            return;
        }

        container.createEl('p', {
            text: `Aktywny agent: ${activeAgent.emoji} ${activeAgent.name}`,
            cls: 'setting-item-description'
        });

        try {
            const data = await agentManager.getPromptInspectorData();
            const { sections, breakdown } = data;

            if (!sections || sections.length === 0) {
                container.createEl('p', { text: 'Brak sekcji promptu.', cls: 'setting-item-description' });
                return;
            }

            // Total tokens header
            const totalEl = container.createDiv({ cls: 'prompt-inspector-total' });
            totalEl.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--background-modifier-border); margin-bottom:8px;';
            totalEl.createEl('strong', { text: `Łącznie: ${breakdown.total.toLocaleString()} tokenów` });
            totalEl.createEl('span', {
                text: `${sections.filter(s => s.enabled).length}/${sections.length} sekcji`,
                cls: 'setting-item-description'
            });

            // Category groups
            const categories = {
                core: '🔵 Rdzeń',
                capabilities: '🟢 Możliwości',
                rules: '🟡 Zasady',
                context: '🟣 Kontekst dynamiczny',
            };

            for (const [catKey, catLabel] of Object.entries(categories)) {
                const catSections = sections.filter(s => s.category === catKey);
                if (catSections.length === 0) continue;

                const catTokens = catSections.filter(s => s.enabled).reduce((sum, s) => sum + s.tokens, 0);

                const groupEl = container.createDiv();
                groupEl.style.cssText = 'margin: 8px 0;';

                const headerEl = groupEl.createDiv();
                headerEl.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:4px 0;';
                headerEl.createEl('span', { text: catLabel });
                headerEl.createEl('span', {
                    text: `${catTokens.toLocaleString()} tok`,
                    cls: 'setting-item-description'
                });

                for (const section of catSections) {
                    const rowEl = groupEl.createDiv();
                    rowEl.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:2px 0 2px 16px; font-size:0.85em; gap:6px;';

                    if (section.required) {
                        // Required sections: locked, no toggle
                        rowEl.createEl('span', { text: `🔒 ${section.label}` });
                    } else {
                        // Toggleable sections
                        const toggleBtn = rowEl.createEl('span', {
                            text: section.enabled ? '✅' : '⬜',
                            attr: { 'aria-label': section.enabled ? 'Wyłącz' : 'Włącz' }
                        });
                        toggleBtn.style.cssText = 'cursor:pointer; user-select:none;';
                        toggleBtn.createSpan({ text: ` ${section.label}` });
                        if (!section.enabled) rowEl.style.opacity = '0.5';

                        toggleBtn.addEventListener('click', async () => {
                            const obsek = this.env?.settings?.obsek || {};
                            if (!obsek.disabledPromptSections) obsek.disabledPromptSections = [];
                            if (section.enabled) {
                                // Disable
                                if (!obsek.disabledPromptSections.includes(section.key)) {
                                    obsek.disabledPromptSections.push(section.key);
                                }
                                // Update in-place (no re-render)
                                toggleBtn.firstChild.textContent = '⬜';
                                toggleBtn.setAttribute('aria-label', 'Włącz');
                                rowEl.style.opacity = '0.5';
                            } else {
                                // Enable
                                obsek.disabledPromptSections = obsek.disabledPromptSections.filter(k => k !== section.key);
                                // Update in-place (no re-render)
                                toggleBtn.firstChild.textContent = '✅';
                                toggleBtn.setAttribute('aria-label', 'Wyłącz');
                                rowEl.style.opacity = '1';
                            }
                            section.enabled = !section.enabled;
                            await this.save_settings();
                        });
                    }

                    rowEl.createEl('span', {
                        text: `${section.tokens.toLocaleString()} tok`,
                        cls: 'setting-item-description',
                        attr: { style: 'margin-left:auto;' }
                    });
                }
            }

            // Preview button
            const previewSetting = new Setting(container)
                .setName('Podgląd pełnego promptu')
                .setDesc('Pokaż cały złożony system prompt aktywnego agenta');
            previewSetting.addButton(btn => {
                btn.setButtonText('Pokaż prompt')
                    .onClick(async () => {
                        try {
                            const fullPrompt = await agentManager.getActiveSystemPromptWithMemory();
                            const modal = new Modal(this.app);
                            modal.titleEl.setText(`System Prompt — ${activeAgent.emoji} ${activeAgent.name}`);
                            const contentEl = modal.contentEl.createDiv();
                            contentEl.style.cssText = 'white-space:pre-wrap; font-family:monospace; font-size:0.8em; max-height:70vh; overflow-y:auto; padding:8px;';
                            contentEl.textContent = fullPrompt;
                            modal.open();
                        } catch (e) {
                            new Notice('Błąd podglądu promptu: ' + e.message);
                        }
                    });
            });
        } catch (e) {
            container.createEl('p', { text: `Błąd: ${e.message}`, cls: 'setting-item-description' });
            log.warn('Settings', 'Prompt Inspector error:', e);
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
