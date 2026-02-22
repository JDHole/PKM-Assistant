/**
 * AgentDeleteModal
 * Confirmation dialog for deleting an agent with optional memory archiving.
 */
import { Modal, Setting, Notice } from 'obsidian';

export class AgentDeleteModal extends Modal {
    /**
     * @param {App} app
     * @param {Object} plugin - Obsek plugin instance
     * @param {Agent} agent - Agent to delete
     * @param {Function|null} onConfirm - Callback after deletion
     */
    constructor(app, plugin, agent, onConfirm = null) {
        super(app);
        this.plugin = plugin;
        this.agent = agent;
        this.onConfirm = onConfirm;
        this.archiveMemory = true; // Default: archive
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('agent-delete-modal');

        // Header
        contentEl.createEl('h2', {
            text: `🗑️ Usunąć agenta?`
        });

        // Agent info
        const info = contentEl.createDiv({ cls: 'agent-delete-info' });
        info.createEl('p', {
            text: `Czy na pewno chcesz usunąć agenta ${this.agent.emoji} ${this.agent.name}?`
        });

        if (this.agent.isBuiltIn) {
            info.createEl('p', {
                text: '⚠️ To jest wbudowany agent. Zostanie odtworzony przy następnym uruchomieniu pluginu.',
                cls: 'agent-delete-warning'
            });
        }

        // Archive option
        new Setting(contentEl)
            .setName('Archiwizuj pamięć')
            .setDesc('Zachowaj brain, sesje i podsumowania w folderze archive/')
            .addToggle(toggle => {
                toggle
                    .setValue(this.archiveMemory)
                    .onChange(v => this.archiveMemory = v);
            });

        // Buttons
        const buttonContainer = contentEl.createDiv({ cls: 'agent-delete-buttons' });

        const cancelBtn = buttonContainer.createEl('button', { text: 'Anuluj' });
        cancelBtn.addEventListener('click', () => this.close());

        const deleteBtn = buttonContainer.createEl('button', {
            text: 'Usuń agenta',
            cls: 'mod-warning'
        });
        deleteBtn.addEventListener('click', () => this.handleDelete());
    }

    async handleDelete() {
        const agentManager = this.plugin.agentManager;
        if (!agentManager) return;

        try {
            // Archive memory if requested
            if (this.archiveMemory) {
                await agentManager.archiveAgentMemory(this.agent.name);
            }

            // Delete agent
            await agentManager.deleteAgent(this.agent.name);

            new Notice(`Agent ${this.agent.emoji} ${this.agent.name} usunięty.`);

            if (this.onConfirm) this.onConfirm();
            this.close();
        } catch (error) {
            new Notice('Błąd usuwania agenta: ' + error.message);
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * Open the agent delete confirmation modal
 * @param {Object} plugin
 * @param {Agent} agent
 * @param {Function|null} onConfirm
 */
export function openAgentDeleteModal(plugin, agent, onConfirm = null) {
    new AgentDeleteModal(plugin.app, plugin, agent, onConfirm).open();
}
