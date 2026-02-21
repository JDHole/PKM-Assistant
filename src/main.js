import Obsidian from "obsidian";
const {
  Notice,
  Plugin,
  requestUrl,
  Platform,
} = Obsidian;

import { SmartEnv } from 'obsidian-smart-env';
import { smart_env_config } from "../smart_env.config.js";
import { open_note } from "obsidian-smart-env/utils/open_note.js";

import { ReleaseNotesView }    from "./views/release_notes_view.js";

import { get_random_connection } from "./utils/get_random_connection.js";
import { add_smart_dice_icon, add_obsek_icon } from "./utils/add_icons.js";

// v4
import { SmartPlugin } from "obsidian-smart-env/smart_plugin.js";
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
import { registerAgentSidebar } from "./views/AgentSidebar.js";

export default class ObsekPlugin extends SmartPlugin {
  SmartEnv = SmartEnv;
  get smart_env_config() {
    if(!this._smart_env_config){
      this._smart_env_config = smart_env_config;
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
    this.app.workspace.onLayoutReady(this.initialize.bind(this)); // initialize when layout is ready
    this.SmartEnv.create(this, this.smart_env_config);
    this.addSettingTab(new this.ConnectionsSettingsTab(this.app, this)); // add settings tab
    add_smart_dice_icon();
    add_obsek_icon();
    this.register_commands(); // from SmartPlugin
    this.register_item_views(); // from SmartPlugin
    this.register_ribbon_icons(); // from SmartPlugin
    registerAgentSidebar(this);
  }
  onunload() {
    console.log("Unloading Obsek plugin");
    this.notices?.unload();
    this.env?.unload_main?.(this);
  }

  async initialize() {
    // New-user onboarding: open Obsek chat on first run
    this.is_new_user().then(async (is_new) => {
      if (!is_new) return;
      await this.SmartEnv.wait_for({ loaded: true });
      setTimeout(() => {
        this.open_chat_view();
      }, 1000);
      this.add_to_gitignore("\n\n# Ignore Smart Environment folder\n.smart-env");
    });

    await this.SmartEnv.wait_for({ loaded: true });

    // AgentManager
    try {
      this.agentManager = new AgentManager(this.app.vault, this.env?.settings || {});
      await this.agentManager.initialize();
    } catch (e) {
      console.error('[Obsek] Failed to initialize AgentManager:', e);
    }

    // MCP system
    try {
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

      this.toolLoader = new ToolLoader(this.app.vault);
      const customTools = await this.toolLoader.loadAllTools();
      for (const tool of customTools) {
        this.toolRegistry.registerTool(tool);
      }
    } catch (e) {
      console.error('[Obsek] Failed to initialize MCP system:', e);
    }

    register_smart_connections_codeblock(this);
    await this.check_for_updates();
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
      console.error(error);
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