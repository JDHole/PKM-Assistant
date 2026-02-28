import Obsidian from "obsidian";
const {
  Notice,
  Plugin,
  requestUrl,
  Platform,
} = Obsidian;

import { PKMEnv } from './core/PKMEnv.js';
import { smart_env_config } from "../smart_env.config.js";
import { open_note } from "obsidian-smart-env/utils/open_note.js";

import { ReleaseNotesView }    from "./views/release_notes_view.js";

import { get_random_connection } from "./utils/get_random_connection.js";
import { add_smart_dice_icon, add_obsek_icon } from "./utils/add_icons.js";
import { add_smart_connections_icon, add_smart_lookup_icon } from "obsidian-smart-env/utils/add_icons.js";

import { PKMPlugin } from './core/PKMPlugin.js';
import { ConnectionsItemView } from "./views/connections_item_view.js";
import { LookupItemView } from "./views/lookup_item_view.js";
import { register_smart_connections_codeblock } from "./views/connections_codeblock.js";
import { build_connections_codeblock } from "./utils/build_connections_codeblock.js";

// Obsek custom components
import { ObsekSettingsTab } from "./views/obsek_settings_tab.js";
import { ChatView } from "./views/chat_view.js";
import { AgentManager } from "./core/AgentManager.js";
import { VaultZones } from "./core/VaultZones.js";
import { PermissionSystem } from "./core/PermissionSystem.js";
import { AccessGuard } from "./core/AccessGuard.js";
import { ApprovalManager } from "./core/ApprovalManager.js";
import { ToolRegistry } from "./mcp/ToolRegistry.js";
import { MCPClient } from "./mcp/MCPClient.js";
import { ToolLoader } from "./mcp/ToolLoader.js";
import { createVaultReadTool } from "./mcp/VaultReadTool.js";
import { createVaultListTool } from "./mcp/VaultListTool.js";
import { createVaultWriteTool } from "./mcp/VaultWriteTool.js";
import { createVaultDeleteTool } from "./mcp/VaultDeleteTool.js";
import { createVaultSearchTool } from "./mcp/VaultSearchTool.js";
import { createMemorySearchTool } from "./mcp/MemorySearchTool.js";
import { createMemoryUpdateTool } from "./mcp/MemoryUpdateTool.js";
import { createMemoryStatusTool } from "./mcp/MemoryStatusTool.js";
import { createSkillListTool } from "./mcp/SkillListTool.js";
import { createSkillExecuteTool } from "./mcp/SkillExecuteTool.js";
import { createMinionTaskTool } from "./mcp/MinionTaskTool.js";
import { createMasterTaskTool } from "./mcp/MasterTaskTool.js";
import { createAgentMessageTool } from "./mcp/AgentMessageTool.js";
import { createAgentDelegateTool } from "./mcp/AgentDelegateTool.js";
import { createChatTodoTool } from "./mcp/ChatTodoTool.js";
import { createPlanTool } from "./mcp/PlanTool.js";
import { createAgoraReadTool } from "./mcp/AgoraReadTool.js";
import { createAgoraUpdateTool } from "./mcp/AgoraUpdateTool.js";
import { createAgoraProjectTool } from "./mcp/AgoraProjectTool.js";
import { createSwitchModeTool } from "./mcp/SwitchModeTool.js";
import { createWebSearchTool } from "./mcp/WebSearchTool.js";
import { createAskUserTool } from "./mcp/AskUserTool.js";
import { AgoraManager } from "./core/AgoraManager.js";
import { registerAgentSidebar, openAgentSidebar } from "./views/AgentSidebar.js";
import { SendToAgentModal } from "./views/SendToAgentModal.js";
import { InlineCommentModal } from "./views/InlineCommentModal.js";
import { ArtifactManager } from "./core/ArtifactManager.js";
import { log } from "./utils/Logger.js";

// Embedding model providers (embedding_models collection only has transformers by default)
import ollamaEmbedProvider from "../external-deps/jsbrains/smart-models/adapters/embedding/ollama.js";
import openaiEmbedProvider from "../external-deps/jsbrains/smart-models/adapters/embedding/openai.js";
import lmStudioEmbedProvider from "../external-deps/jsbrains/smart-models/adapters/embedding/lm_studio.js";
import geminiEmbedProvider from "../external-deps/jsbrains/smart-models/adapters/embedding/google.js";
import { EmbeddingModels } from "../external-deps/jsbrains/smart-models/collections/embedding_models.js";

/**
 * Override: default_provider_key reads from user settings instead of hardcoded 'transformers'.
 * This ensures the collection creates models with the user's preferred provider (e.g. Ollama).
 */
class ObsekEmbeddingModels extends EmbeddingModels {
  get default_provider_key() {
    const adapter = this.env?.settings?.smart_sources?.embed_model?.adapter;
    return adapter || 'transformers';
  }
}

export default class ObsekPlugin extends PKMPlugin {
  PKMEnv = PKMEnv;
  get smart_env_config() {
    if(!this._smart_env_config){
      this._smart_env_config = smart_env_config;
      // Register all embedding providers and override class
      // SC's default EmbeddingModels always creates transformers models — we fix that
      if (!this._smart_env_config.collections) this._smart_env_config.collections = {};
      if (!this._smart_env_config.collections.embedding_models) {
        this._smart_env_config.collections.embedding_models = {};
      }
      // Override class so default_provider_key reads from user settings
      this._smart_env_config.collections.embedding_models.class = ObsekEmbeddingModels;
      if (!this._smart_env_config.collections.embedding_models.providers) {
        this._smart_env_config.collections.embedding_models.providers = {};
      }
      Object.assign(this._smart_env_config.collections.embedding_models.providers, {
        ollama: ollamaEmbedProvider,
        openai: openaiEmbedProvider,
        gemini: geminiEmbedProvider,
        lm_studio: lmStudioEmbedProvider,
      });
      // Override SC status_bar component — we use our own in PKMEnv.register_status_bar()
      if (!this._smart_env_config.components) this._smart_env_config.components = {};
      this._smart_env_config.components.status_bar = {
        render: function() { return document.createElement('span'); }
      };
    }
    return this._smart_env_config;
  }
  ConnectionsSettingsTab = ObsekSettingsTab;

  get item_views() {
    return {
      ConnectionsItemView,
      LookupItemView,
      ReleaseNotesView,
      ChatView,
    };
  }

  // GETTERS
  get obsidian() { return Obsidian; }
  get api() { return this._api; }
  onload() {
    log.info('Plugin', `=== PKM Assistant v${this.manifest.version} START ===`);
    log.debug('Plugin', 'onload() — rejestracja komponentów');
    this.app.workspace.onLayoutReady(this.initialize.bind(this));
    this.PKMEnv.create(this, this.smart_env_config);
    log.debug('Plugin', 'PKMEnv.create() wywołane');
    this.addSettingTab(new this.ConnectionsSettingsTab(this.app, this));
    add_smart_dice_icon();
    add_obsek_icon();
    add_smart_connections_icon();
    add_smart_lookup_icon();
    this.register_commands();
    this.register_item_views();
    this.register_ribbon_icons();
    registerAgentSidebar(this);
    log.debug('Plugin', 'onload() zakończone — czekam na layoutReady → initialize()');
  }
  onunload() {
    console.log("Unloading Obsek plugin");
    this.notices?.unload();
    this.env?.unload_main?.(this);
  }

  async initialize() {
    const initStart = Date.now();
    log.info('Plugin', 'initialize() START — czekam na PKMEnv...');

    // Restore debug mode from settings as early as possible
    const earlyObsek = this.env?.settings?.obsek;
    if (earlyObsek?.debugMode) {
      log.setDebug(true);
    }

    // New-user onboarding: open Obsek chat on first run
    this.is_new_user().then(async (is_new) => {
      if (!is_new) return;
      log.info('Plugin', 'Nowy użytkownik wykryty — otwieram chat');
      await this.PKMEnv.wait_for({ loaded: true });
      setTimeout(() => {
        this.open_chat_view();
      }, 1000);
      this.add_to_gitignore("\n\n# Ignore Smart Environment folder\n.smart-env");
    });

    await this.PKMEnv.wait_for({ loaded: true });
    log.timing('Plugin', 'PKMEnv loaded', initStart);

    // Re-check debug mode after env is loaded (settings now available)
    const obsekSettings = this.env?.settings?.obsek;
    if (obsekSettings?.debugMode) {
      log.setDebug(true);
    }

    // Bridge: sync user's embed model preference to new embedding_models collection
    this._syncEmbeddingModelSettings();

    // AgentManager
    try {
      log.debug('Plugin', 'Inicjalizacja AgentManager...');
      this.agentManager = new AgentManager(this.app.vault, this.env?.settings || {});
      await this.agentManager.initialize();
      const agentCount = this.agentManager.agents?.size || 0;
      const activeAgent = this.agentManager.activeAgent?.name || 'brak';
      log.info('Plugin', `AgentManager OK: ${agentCount} agentów, aktywny: ${activeAgent}`);
    } catch (e) {
      log.error('Plugin', 'AgentManager FAIL:', e);
    }

    // ArtifactManager + restore ALL persisted artifacts (global)
    try {
      log.debug('Plugin', 'Inicjalizacja ArtifactManager...');
      this.artifactManager = new ArtifactManager(this.app.vault);
      this._chatTodoStore = this._chatTodoStore || new Map();
      this._planStore = this._planStore || new Map();
      await this.artifactManager.migrateFromAgentFolders();
      await this.artifactManager.restoreToStores(this._chatTodoStore, this._planStore);
      log.info('Plugin', `ArtifactManager OK: ${this._chatTodoStore.size} todos, ${this._planStore.size} planów`);
    } catch (e) {
      log.error('Plugin', 'ArtifactManager FAIL:', e);
    }

    // AgoraManager (shared knowledge base)
    try {
      log.debug('Plugin', 'Inicjalizacja AgoraManager...');
      this.agoraManager = new AgoraManager(this.app.vault);
      await this.agoraManager.initialize();
      if (this.agentManager) {
        this.agentManager.agoraManager = this.agoraManager;
      }
      log.info('Plugin', 'AgoraManager OK');
    } catch (e) {
      log.error('Plugin', 'AgoraManager FAIL:', e);
    }

    // No-Go folders (from settings → AccessGuard)
    AccessGuard.setNoGoFolders(this.env?.settings?.obsek?.no_go_folders);

    // MCP system
    try {
      log.debug('Plugin', 'Inicjalizacja MCP system...');
      this.vaultZones = new VaultZones(this.app.vault);
      await this.vaultZones.initialize();

      this.permissionSystem = new PermissionSystem(this.app.vault, this.settings);
      this.permissionSystem.setVaultZones(this.vaultZones);

      this.approvalManager = new ApprovalManager(this.app);
      this.toolRegistry = new ToolRegistry();
      this.mcpClient = new MCPClient(this.app, this, this.toolRegistry);

      this.toolRegistry.registerTool(createVaultReadTool(this.app));
      this.toolRegistry.registerTool(createVaultListTool(this.app));
      this.toolRegistry.registerTool(createVaultWriteTool(this.app));
      this.toolRegistry.registerTool(createVaultDeleteTool(this.app));
      this.toolRegistry.registerTool(createVaultSearchTool(this.app));
      this.toolRegistry.registerTool(createMemorySearchTool(this.app));
      this.toolRegistry.registerTool(createMemoryUpdateTool(this.app));
      this.toolRegistry.registerTool(createMemoryStatusTool(this.app));
      this.toolRegistry.registerTool(createSkillListTool(this.app));
      this.toolRegistry.registerTool(createSkillExecuteTool(this.app));
      this.toolRegistry.registerTool(createMinionTaskTool(this.app));
      this.toolRegistry.registerTool(createMasterTaskTool(this.app));
      this.toolRegistry.registerTool(createAgentMessageTool(this.app));
      this.toolRegistry.registerTool(createAgentDelegateTool(this.app));
      this.toolRegistry.registerTool(createChatTodoTool(this.app));
      this.toolRegistry.registerTool(createPlanTool(this.app));
      this.toolRegistry.registerTool(createAgoraReadTool(this.app));
      this.toolRegistry.registerTool(createAgoraUpdateTool(this.app));
      this.toolRegistry.registerTool(createAgoraProjectTool(this.app));
      this.toolRegistry.registerTool(createSwitchModeTool(this.app));
      this.toolRegistry.registerTool(createWebSearchTool(this.app));
      this.toolRegistry.registerTool(createAskUserTool(this.app));

      this.toolLoader = new ToolLoader(this.app.vault);
      const customTools = await this.toolLoader.loadAllTools();
      for (const tool of customTools) {
        this.toolRegistry.registerTool(tool);
      }
      const toolCount = this.toolRegistry.tools?.size || 0;
      log.info('Plugin', `MCP system OK: ${toolCount} narzędzi zarejestrowanych`);
    } catch (e) {
      log.error('Plugin', 'MCP system FAIL:', e);
    }

    register_smart_connections_codeblock(this);

    // Context menu: "Send to assistant" + "Inline comment"
    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu, editor, view) => {
        const selection = editor.getSelection();
        if (selection && selection.trim().length > 0) {
          menu.addItem((item) => {
            item.setTitle('Wyślij do asystenta')
              .setIcon('message-square')
              .onClick(() => {
                const filePath = view?.file?.path || '';
                new SendToAgentModal(this.app, this, selection, filePath).open();
              });
          });
          menu.addItem((item) => {
            item.setTitle('Komentarz do Asystenta')
              .setIcon('edit')
              .onClick(() => {
                const filePath = view?.file?.path || '';
                new InlineCommentModal(this.app, this, selection, filePath).open();
              });
          });
        }
      })
    );

    await this.check_for_updates();

    // Crystal Soul: load custom theme overrides
    await this._loadCrystalSoulTheme();

    log.timing('Plugin', 'PEŁNA INICJALIZACJA', initStart);
    log.info('Plugin', `=== PKM Assistant v${this.manifest.version} GOTOWY ===`);
  }

  /**
   * Crystal Soul: Load custom theme CSS from .pkm-assistant/theme.css
   * This file can be edited by user or written by agents via vault_write.
   * It overrides Crystal Soul --cs-* variables.
   */
  async _loadCrystalSoulTheme() {
    const THEME_PATH = '.pkm-assistant/theme.css';
    try {
      const exists = await this.app.vault.adapter.exists(THEME_PATH);
      if (!exists) return;

      const css = await this.app.vault.adapter.read(THEME_PATH);
      if (!css.trim()) return;

      if (this._crystalSoulSheet) {
        this._crystalSoulSheet.replaceSync(css);
      } else {
        this._crystalSoulSheet = new CSSStyleSheet();
        this._crystalSoulSheet.replaceSync(css);
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, this._crystalSoulSheet];
      }
      log.info('Plugin', 'Crystal Soul custom theme loaded');
    } catch (e) {
      log.warn('Plugin', 'Crystal Soul theme load failed:', e);
    }
  }

  /**
   * Crystal Soul: Generate default theme.css template
   */
  async generateCrystalSoulTemplate() {
    const THEME_PATH = '.pkm-assistant/theme.css';
    const template = `/* Crystal Soul — Personalizacja motywu
 * Odkomentuj zmienne żeby zmienić wygląd.
 * Zmiany działają po przeładowaniu pluginu.
 * Agent może też edytować ten plik przez vault_write.
 */

.theme-dark, .theme-light {
  /* Główny kolor akcentu kryształu */
  /* --cs-shard-color: var(--interactive-accent); */

  /* Rozmiar diamentu (domyślnie: 5px) */
  /* --cs-diamond-size: 5px; */

  /* Szerokość bordera akcentu (domyślnie: 3px) */
  /* --cs-border-accent-width: 3px; */

  /* Szybkość animacji oddychania (domyślnie: 3s) */
  /* --cs-breathing-duration: 3s; */

  /* Kolory agentów (HSL) — odkomentuj i zmień */
  /* --cs-agent-amber-h: 37; --cs-agent-amber-s: 77%; --cs-agent-amber-l: 49%; */
  /* --cs-agent-aqua-h: 131; --cs-agent-aqua-s: 21%; --cs-agent-aqua-l: 51%; */
  /* --cs-agent-purple-h: 330; --cs-agent-purple-s: 29%; --cs-agent-purple-l: 46%; */
  /* --cs-agent-blue-h: 182; --cs-agent-blue-s: 33%; --cs-agent-blue-l: 40%; */
}
`;
    await this.app.vault.adapter.write(THEME_PATH, template);
    log.info('Plugin', 'Crystal Soul template wygenerowany');
    return THEME_PATH;
  }

  /**
   * Initialize ribbon icons with default visibility.
   */

  get ribbon_icons () {
    return {
      chat: {
        icon_name: "obsek-icon",
        description: "PKM Assistant: Open chat",
        callback: () => { this.open_chat_view(); }
      },
      agents: {
        icon_name: "users",
        description: "PKM Assistant: Zarządzaj agentami",
        callback: () => { openAgentSidebar(this); }
      }
    }
  }

  open_chat_view() {
    const leaves = this.app.workspace.getLeavesOfType('pkm-assistant-chat');
    if (leaves.length > 0) {
      this.app.workspace.revealLeaf(leaves[0]);
    } else {
      const leaf = this.app.workspace.getRightLeaf(false);
      leaf.setViewState({ type: 'pkm-assistant-chat', active: true });
    }
    if (this.app.workspace.rightSplit.collapsed) {
      this.app.workspace.rightSplit.toggle();
    }
  }

  /**
   * Send inline comment to active chat view.
   * Opens chat if not open, then sends a formatted message for the agent to edit the file.
   */
  sendInlineComment(filePath, selectedText, comment) {
    this.open_chat_view();
    setTimeout(() => {
      const leaves = this.app.workspace.getLeavesOfType('pkm-assistant-chat');
      if (leaves.length > 0) {
        const chatView = leaves[0].view;
        const msg = [
          `KOMENTARZ INLINE`,
          `Plik: \`${filePath}\``,
          `Fragment:`,
          '```',
          selectedText,
          '```',
          `Co zmienić: ${comment}`
        ].join('\n');
        chatView.input_area.value = msg;
        chatView.send_message();
      }
    }, 300);
  }

  get settings() { return this.env?.settings || {}; }

  async check_for_updates() {
    if (await this.is_new_plugin_version(this.manifest.version)) {
      console.log("opening release notes modal");
      try {
        ReleaseNotesView.open(this.app.workspace, this.manifest.version);
      } catch (e) {
        console.error('Failed to open ReleaseNotesView', e);
      }
      await this.set_last_known_version(this.manifest.version);
    }
    setTimeout(this.check_for_update.bind(this), 3000);
    setInterval(this.check_for_update.bind(this), 10800000);
  }

  async check_for_update() {
    try {
      const {json: response} = await requestUrl({
        url: "https://api.github.com/repos/JDHole/PKM-Assistant/releases/latest",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        contentType: "application/json",
      });
      const latest_release = response.tag_name;
      if(latest_release !== this.manifest.version) {
        this.env?.events?.emit('plugin:new_version_available', { version: latest_release });
        this.notices?.show('new_version_available', {version: latest_release});
        this.update_available = true;
      }
    } catch (error) {
      // Silence 404 errors (no releases published yet)
      if (error?.status === 404 || error?.message?.includes('404')) {
        log.debug('Plugin', 'check_for_update: brak opublikowanych releases (404)');
      } else {
        log.warn('Plugin', 'check_for_update error:', error?.message || error);
      }
    }
  }

  /**
   * Bridge: sync user's embed model preference to new embedding_models collection.
   * The settings tab saves to env.settings.smart_sources.embed_model[adapter].model_key
   * but the new SC system uses embedding_models collection with EmbeddingModel items.
   * If provider changed (e.g. transformers → ollama), creates a new model item.
   */
  _syncEmbeddingModelSettings() {
    try {
      const userEmbedSettings = this.env?.settings?.smart_sources?.embed_model;
      if (!userEmbedSettings) return;

      const userAdapter = userEmbedSettings.adapter || 'transformers';
      const userModelKey = userEmbedSettings?.[userAdapter]?.model_key;
      if (!userModelKey) return;

      const embeddingModels = this.env?.embedding_models;
      if (!embeddingModels) {
        log.debug('Plugin', 'embedding_models collection not available yet');
        return;
      }

      const defaultModel = embeddingModels.default;
      if (!defaultModel) {
        log.debug('Plugin', 'No default embedding model in collection');
        return;
      }

      const currentProvider = defaultModel.data.provider_key;
      const currentModelKey = defaultModel.data.model_key;

      // Already correct — nothing to do
      if (currentProvider === userAdapter && currentModelKey === userModelKey) {
        log.debug('Plugin', `Embedding already correct: ${userAdapter}/${userModelKey}`);
        return;
      }

      log.info('Plugin', `Embedding bridge: ${currentProvider}/${currentModelKey} → ${userAdapter}/${userModelKey}`);

      if (currentProvider !== userAdapter) {
        // Provider changed (e.g. transformers → ollama) — need a new model item
        // because the adapter class is different
        const newModel = embeddingModels.new_model({
          provider_key: userAdapter,
          model_key: userModelKey,
          api_key: (userAdapter === 'ollama' || userAdapter === 'lm_studio') ? 'na' : '',
        });
        log.info('Plugin', `Created new embedding model: ${newModel.key} (${userAdapter}/${userModelKey})`);
      } else {
        // Same provider, just different model — update in place
        defaultModel.data.model_key = userModelKey;
        defaultModel.queue_save();
      }
    } catch (e) {
      log.warn('Plugin', 'Embedding bridge error:', e?.message || e);
    }
  }


  async restart_plugin() {
    this.env?.unload_main?.(this);
    await new Promise(r => setTimeout(r, 3000));
    window.restart_plugin = async (id) => {
      await window.app.plugins.disablePlugin(id);
      await window.app.plugins.enablePlugin(id);
    };
    await window.restart_plugin(this.manifest.id);
  }

  get commands() {
    return {
      ...super.commands,
      random_connection: {
        id: "obsek-random-connection",
        name: "PKM Assistant: Random note",
        callback: async () => {
          await this.open_random_connection();
        }
      },
      open_chat: {
        id: "obsek-open-chat",
        name: "PKM Assistant: Open chat",
        callback: () => {
          this.open_chat_view();
        }
      },
      open_agents: {
        id: "obsek-open-agents",
        name: "PKM Assistant: Zarządzaj agentami",
        callback: () => {
          openAgentSidebar(this);
        }
      },
      insert_connections_codeblock: {
        id: 'obsek-insert-connections',
        name: 'PKM Assistant: Insert connections codeblock',
        editorCallback: (editor) => {
          editor.replaceSelection(build_connections_codeblock());
        }
      },
    };
  }

  show_release_notes() {
    return ReleaseNotesView.open(this.app.workspace, this.manifest.version);
  }

  async open_random_connection() {
    const curr_file = this.app.workspace.getActiveFile();
    if (!curr_file) {
      new Notice('No active file to find connections for');
      return;
    }
    const rand_entity = await get_random_connection(this.env, curr_file.path);
    if (!rand_entity) {
      new Notice('Cannot open random connection for non-embedded source: ' + curr_file.path);
      return;
    }
    this.open_note(rand_entity.item.path);
    this.env?.events?.emit?.('connections:open_random');
  }

  async open_note(target_path, event=null) { await open_note(this, target_path, event); }

  /**
   * @deprecated extract into utility
   */
  async add_to_gitignore(ignore, message=null) {
    if(!(await this.app.vault.adapter.exists(".gitignore"))) return;
    let gitignore_file = await this.app.vault.adapter.read(".gitignore");
    if (gitignore_file.indexOf(ignore) < 0) {
      await this.app.vault.adapter.append(".gitignore", `\n\n${message ? "# " + message + "\n" : ""}${ignore}`);
      console.log("Added to .gitignore: " + ignore);
    }
  }

}