/**
 * AgentCreatorModal - Modal form for creating new agents
 */
import { Modal, Setting } from 'obsidian';
import { getArchetypeList } from '../agents/archetypes/index.js';

export class AgentCreatorModal extends Modal {
    constructor(app, plugin, onSave) {
        super(app);
        this.plugin = plugin;
        this.onSave = onSave;

        // Form state
        this.agentData = {
            name: '',
            emoji: '🤖',
            archetype: 'human_vibe',
            personality: '',
            temperature: 0.7,
            focus_folders: []
        };
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('agent-creator-modal');

        // Title
        contentEl.createEl('h2', { text: '✨ Nowy Agent' });

        // Name
        new Setting(contentEl)
            .setName('Nazwa')
            .setDesc('Unikalna nazwa agenta')
            .addText(text => text
                .setPlaceholder('np. Bibliotekarz')
                .setValue(this.agentData.name)
                .onChange(value => this.agentData.name = value));

        // Emoji
        new Setting(contentEl)
            .setName('Emoji')
            .setDesc('Ikona agenta')
            .addText(text => text
                .setPlaceholder('🤖')
                .setValue(this.agentData.emoji)
                .onChange(value => this.agentData.emoji = value));

        // Archetype
        const archetypes = getArchetypeList();
        new Setting(contentEl)
            .setName('Archetyp')
            .setDesc('Bazowy styl agenta')
            .addDropdown(dropdown => {
                for (const arch of archetypes) {
                    dropdown.addOption(arch.id, `${arch.emoji} ${arch.name}`);
                }
                dropdown.setValue(this.agentData.archetype);
                dropdown.onChange(value => {
                    this.agentData.archetype = value;
                    this.updatePersonalityPlaceholder(value);
                });
            });

        // Personality
        new Setting(contentEl)
            .setName('Personality')
            .setDesc('Opis osobowości i specjalizacji agenta')
            .addTextArea(text => {
                this.personalityTextarea = text;
                text.setPlaceholder('Opisz kim jest agent, co robi, jak się komunikuje...')
                    .setValue(this.agentData.personality)
                    .onChange(value => this.agentData.personality = value);
                text.inputEl.rows = 6;
                text.inputEl.style.width = '100%';
            });

        // Temperature
        new Setting(contentEl)
            .setName('Temperatura')
            .setDesc('0 = precyzyjny, 1 = kreatywny')
            .addSlider(slider => slider
                .setLimits(0, 1, 0.1)
                .setValue(this.agentData.temperature)
                .setDynamicTooltip()
                .onChange(value => this.agentData.temperature = value));

        // Focus folders (simple text input for now)
        new Setting(contentEl)
            .setName('Focus folders')
            .setDesc('Foldery na których agent się skupia (jeden per linia)')
            .addTextArea(text => {
                text.setPlaceholder('Projects/**\nNotes/**')
                    .setValue(this.agentData.focus_folders.join('\n'))
                    .onChange(value => {
                        this.agentData.focus_folders = value
                            .split('\n')
                            .map(f => f.trim())
                            .filter(f => f.length > 0);
                    });
                text.inputEl.rows = 3;
                text.inputEl.style.width = '100%';
            });

        // Buttons
        const buttonContainer = contentEl.createDiv({ cls: 'agent-creator-buttons' });

        const cancelBtn = buttonContainer.createEl('button', { text: 'Anuluj' });
        cancelBtn.addEventListener('click', () => this.close());

        const createBtn = buttonContainer.createEl('button', {
            text: 'Utwórz agenta',
            cls: 'mod-cta'
        });
        createBtn.addEventListener('click', () => this.handleCreate());
    }

    updatePersonalityPlaceholder(archetypeId) {
        const placeholders = {
            human_vibe: 'Jestem empatycznym asystentem...\n\nMoje podejście:\n- Ciepły i pomocny\n- Słucham uważnie',
            obsidian_expert: 'Jestem ekspertem od Obsidiana...\n\nMoja wiedza:\n- Struktura vaulta\n- Pluginy i automatyzacja',
            ai_expert: 'Jestem ekspertem od AI...\n\nMoja wiedza:\n- Prompt engineering\n- Modele AI'
        };
        if (this.personalityTextarea && !this.agentData.personality) {
            this.personalityTextarea.setPlaceholder(placeholders[archetypeId] || '');
        }
    }

    async handleCreate() {
        // Validation
        if (!this.agentData.name.trim()) {
            alert('Podaj nazwę agenta!');
            return;
        }

        // Check if name already exists
        const agentManager = this.plugin.agentManager;
        if (agentManager && agentManager.getAgent(this.agentData.name)) {
            alert('Agent o tej nazwie już istnieje!');
            return;
        }

        try {
            // Create agent through AgentManager
            if (agentManager) {
                await agentManager.createAgent(this.agentData);
                console.log('[AgentCreatorModal] Created agent:', this.agentData.name);
            }

            // Callback
            if (this.onSave) {
                this.onSave(this.agentData);
            }

            this.close();
        } catch (error) {
            console.error('[AgentCreatorModal] Error creating agent:', error);
            alert('Błąd tworzenia agenta: ' + error.message);
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * Open the agent creator modal
 * @param {Plugin} plugin 
 * @param {Function} onSave - Callback after agent is created
 */
export function openAgentCreator(plugin, onSave) {
    new AgentCreatorModal(plugin.app, plugin, onSave).open();
}
