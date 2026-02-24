/**
 * PKMPlugin — replaces SmartPlugin for Obsek.
 *
 * Extends Obsidian Plugin directly. Provides:
 * - register_commands / register_ribbon_icons / register_item_views
 * - Version tracking (is_new_user, is_new_plugin_version)
 * - PKMEnv reference
 *
 * Removed from SmartPlugin: show_release_notes default command (handled in ObsekPlugin).
 */
import { Notice, Plugin } from 'obsidian';
import { PKMEnv } from './PKMEnv.js';
import { SmartNotices } from 'smart-notices/smart_notices.js';

export class PKMPlugin extends Plugin {
  PKMEnv = PKMEnv;

  /**
   * Override in subclass to provide commands.
   */
  get commands() {
    return {};
  }

  register_commands() {
    Object.values(this.commands).forEach((cmd) => {
      this.addCommand(cmd);
    });
  }

  /**
   * Override in subclass to provide ribbon icons.
   */
  get ribbon_icons() {
    return {};
  }

  register_ribbon_icons() {
    const icons = Object.values(this.ribbon_icons);
    for (let i = 0; i < icons.length; i++) {
      const ri = icons[i];
      this.addRibbonIcon(ri.icon_name, ri.description, ri.callback);
    }
  }

  /**
   * Override in subclass to provide item views.
   */
  get item_views() {
    return {};
  }

  register_item_views() {
    const views = Object.values(this.item_views);
    for (let i = 0; i < views.length; i++) {
      const ViewClass = views[i];
      if (typeof ViewClass.register_item_view === 'function') {
        ViewClass.register_item_view(this);
      }
    }
  }

  // ─── Version tracking ───

  async is_new_user() {
    const data = (await this.loadData()) || {};
    if (!data.installed_at) {
      data.installed_at = Date.now();
      await this.saveData(data);
      return true;
    }
    return false;
  }

  async get_last_known_version() {
    const data = (await this.loadData()) || {};
    return data.last_version || '';
  }

  async set_last_known_version(version) {
    const data = (await this.loadData()) || {};
    data.last_version = version;
    await this.saveData(data);
  }

  async is_new_plugin_version(current_version) {
    return (await this.get_last_known_version()) !== current_version;
  }

  get notices() {
    if (this.env?.notices) return this.env.notices;
    if (!this._notices) this._notices = new SmartNotices(this.env, Notice);
    return this._notices;
  }
}
