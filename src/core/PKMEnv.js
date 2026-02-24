/**
 * PKMEnv — replaces SmartEnv for Obsek plugin.
 *
 * Key difference: uses a MODULE-SCOPED object instead of window.smart_env.
 * This means Obsek and Smart Connections can coexist without conflicts.
 *
 * All env.* interfaces stay the same — SC modules (SmartSources, SmartBlocks,
 * SmartEmbedModel etc.) work unchanged because they only use this.env.*
 */
import { Notice, Platform } from 'obsidian';
import { SmartEnv as BaseSmartEnv } from 'smart-environment';
import { merge_env_config } from 'smart-environment/utils/merge_env_config.js';
import default_config from 'obsidian-smart-env/default.config.js';
import { SmartNotices, define_default_create_methods } from 'smart-notices/smart_notices.js';
import { NOTICES } from 'smart-notices/notices.js';

// Override SC notice texts with PKM Assistant branding + Polish
const PKM_NOTICES = {
  loading_collection:    { en: 'Ładowanie {{collection_key}}...' },
  done_loading_collection: { en: '{{collection_key}} załadowane.' },
  saving_collection:     { en: 'Zapisywanie {{collection_key}}...' },
  initial_scan:          { en: 'Skanowanie plików...', timeout: 0 },
  done_initial_scan:     { en: 'Skanowanie zakończone.', timeout: 3000 },
  embedding_progress: {
    en: 'Indeksowanie: {{progress}} / {{total}}\n{{tokens_per_second}} tok/s ({{model_name}})',
    button: {
      en: 'Pauza',
      callback: (env) => { env.smart_sources?.entities_vector_adapter?.halt_embed_queue_processing(); }
    },
    timeout: 0
  },
  embedding_complete: {
    en: 'Indeksowanie zakończone. {{total_embeddings}} embeddingów. {{tokens_per_second}} tok/s ({{model_name}})',
    timeout: 0
  },
  embedding_paused: {
    en: 'Indeksowanie wstrzymane. {{progress}} / {{total}}',
    button: {
      en: 'Wznów',
      callback: (env) => { env.smart_sources?.entities_vector_adapter?.resume_embed_queue_processing(100); }
    },
    timeout: 0
  },
  embedding_error:       { en: 'Błąd indeksowania: {{error}}', timeout: 0 },
  embed_model_not_loaded: { en: 'Model embeddingu nie załadowany. Poczekaj na załadowanie.' },
  embed_search_text_failed: { en: 'Nie udało się zaindeksować zapytania.' },
  error_in_embedding_search: { en: 'Błąd wyszukiwania. Szczegóły w konsoli.' },
  import_progress:       { en: 'Importowanie... {{progress}} / {{total}} plików', timeout: 0 },
  done_import:           { en: 'Import zakończony. {{count}} plików w {{time_in_seconds}}s', timeout: 0 },
  no_import_queue:       { en: 'Brak plików do importu.' },
  clearing_all:          { en: 'Czyszczenie danych...', timeout: 0 },
  done_clearing_all:     { en: 'Dane wyczyszczone i zaimportowane.', timeout: 3000 },
  pruning_collection:    { en: 'Czyszczenie {{collection_key}}...' },
  done_pruning_collection: { en: 'Wyczyszczono {{count}} elementów z {{collection_key}}.' },
  new_version_available: {
    en: 'Nowa wersja PKM Assistant dostępna! (v{{version}})',
    timeout: 15000,
    button: {
      en: 'Zmiany',
      callback: () => { window.open("https://github.com/JDHole/PKM-Assistant/releases", "_blank"); }
    }
  },
  reload_sources:        { en: 'Źródła przeładowane w {{time_ms}}ms' },
};

/**
 * PKMNotices — SmartNotices with PKM Assistant branding.
 * Overrides header from "[Smart Env v2.2.7]" to "[PKM Assistant v1.0.9]".
 */
class PKMNotices extends SmartNotices {
  constructor(env, opts = {}) {
    // Apply Polish overrides BEFORE parent constructor calls define_default_create_methods
    for (const [key, override] of Object.entries(PKM_NOTICES)) {
      if (NOTICES[key]) {
        Object.assign(NOTICES[key], override);
      } else {
        NOTICES[key] = override;
      }
    }
    super(env, opts);
  }

  _build_fragment(id, text, { button, confirm, immutable }) {
    const frag = document.createDocumentFragment();
    const version = this.env?.main?.manifest?.version || '1.0';
    frag.createEl('p', {
      cls: 'sc-notice-head',
      text: `[PKM Assistant v${version}]`
    });

    const content = frag.createEl('p', { cls: 'sc-notice-content', text });
    const actions = frag.createEl('div', { cls: 'sc-notice-actions' });

    if (confirm?.text && typeof confirm.callback === 'function') {
      this._add_button(confirm, actions);
    }
    if (button?.text && typeof button.callback === 'function') {
      this._add_button(button, actions);
    }
    if (!immutable) {
      this._add_mute_button(id, actions);
    }
    return frag;
  }
}

// Module-scoped scope — replaces window as the singleton holder.
// SC writes to window.smart_env, we write to PKM_SCOPE.smart_env → zero collisions.
const PKM_SCOPE = {};

export class PKMEnv extends BaseSmartEnv {
  // Override: all inherited code that touches this.global_ref now uses PKM_SCOPE
  static global_ref = PKM_SCOPE;

  /**
   * Create and initialize a PKMEnv instance.
   * Merges caller config with obsidian-smart-env defaults, then delegates to base.
   */
  static async create(plugin, env_config) {
    if (!plugin) throw new Error("PKMEnv.create: 'plugin' parameter is required.");
    if (!env_config) throw new Error("PKMEnv.create: 'env_config' parameter is required.");
    env_config.version = this.version;

    const opts = merge_env_config(env_config, default_config);
    opts.env_path = ''; // scope handled by Obsidian FS methods
    return await super.create(plugin, opts);
  }

  /**
   * Load environment: init collections, register source watchers, workspace events.
   * Removed from original SC wrapper: OAuth, SC icons, migrations, onboarding events.
   */
  async load(force_load = false) {
    if (Platform.isMobile && !force_load) {
      const frag = this.smart_view.create_doc_fragment(
        '<div><p>PKM Assistant: ładowanie odroczone na mobile.</p><button>Załaduj środowisko</button></div>'
      );
      frag.querySelector('button').addEventListener('click', this.load.bind(this, true));
      new Notice(frag, 0);
      return;
    }

    // Status bar BEFORE loading collections (embedding blocks super.load())
    this.register_status_bar();

    await super.load();

    // Source watchers (file change detection for re-import)
    this.smart_sources?.register_source_watchers?.(this.smart_sources);

    const plugin = this.main;

    // Track active file for connections view
    plugin.registerEvent(
      plugin.app.workspace.on('active-leaf-change', (leaf) => {
        this.smart_sources?.debounce_re_import_queue?.();
        const current_path = leaf?.view?.file?.path;
        this.emit_source_opened(current_path, 'active-leaf-change');
      })
    );
    plugin.registerEvent(
      plugin.app.workspace.on('file-open', (file) => {
        this.smart_sources?.debounce_re_import_queue?.();
        const current_path = file?.path;
        this.emit_source_opened(current_path, 'file-open');
      })
    );

    // Register context modal if configured
    if (this._config?.modals?.context_selector?.class) {
      const ContextModal = this._config.modals.context_selector.class;
      ContextModal.register_modal(this.main);
    }
  }

  emit_source_opened(current_path, event_source = null) {
    if (this._current_opened_source === current_path) return;
    const current_source = this.smart_sources?.get(current_path);
    if (current_source) {
      this._current_opened_source = current_path;
      current_source.emit_event('sources:opened', { event_source });
    }
  }

  queue_source_re_import(source) {
    this.smart_sources?.queue_source_re_import?.(source);
  }

  debounce_re_import_queue() {
    this.smart_sources?.debounce_re_import_queue?.();
  }

  async run_re_import() {
    await this.smart_sources?.run_re_import?.();
  }

  register_status_bar() {
    // Remove any old SC status bar
    const status_container = this.main?.app?.statusBar?.containerEl;
    status_container
      ?.querySelector?.('.smart-env-status-container')
      ?.closest?.('.status-bar-item')
      ?.remove?.();

    this.status_elm = this.main.addStatusBarItem();
    this.status_elm.addClass('obsek-status-bar-item');

    // Build our own status bar
    const anchor = document.createElement('span');
    anchor.className = 'obsek-status-container';

    const spinner = document.createElement('span');
    spinner.className = 'obsek-status-spinner';
    spinner.style.display = 'none';
    spinner.textContent = '';

    const msg = document.createElement('span');
    msg.className = 'obsek-status-msg';
    msg.textContent = 'PKM Assistant';

    anchor.appendChild(spinner);
    anchor.appendChild(msg);
    this.status_elm.appendChild(anchor);

    this._statusSpinner = spinner;
    this._statusMsg = msg;
    this._embedTotal = 0;
    this._embedProgress = 0;
    this._isEmbedding = false;

    // Listen for embedding progress events
    if (this.events) {
      this.events.on('embedding:progress_reported', (data) => {
        this._embedProgress = data.progress || 0;
        this._embedTotal = data.total || 0;
        this._isEmbedding = true;
        this._renderStatusBar();
      });
    }

    // Poll for state changes (fallback when no events fire)
    this._statusInterval = setInterval(() => this._renderStatusBar(), 3000);

    // Initial render
    this._renderStatusBar();
  }

  _renderStatusBar() {
    if (!this._statusMsg || !this._statusSpinner) return;

    const va = this.smart_sources?.entities_vector_adapter;
    const isProcessing = va?._is_processing_embed_queue || false;

    if (isProcessing || this._isEmbedding) {
      const progress = va?.embedded_total || this._embedProgress || 0;
      const total = this._embedTotal || 0;
      this._statusSpinner.style.display = 'inline-block';
      if (total > 0 && progress > 0) {
        const pct = Math.round((progress / total) * 100);
        this._statusMsg.textContent = `Indeksowanie ${progress}/${total} (${pct}%)`;
      } else {
        this._statusMsg.textContent = 'Indeksowanie...';
      }

      // Check if done
      if (!isProcessing && progress >= total && total > 0) {
        this._isEmbedding = false;
        this._statusSpinner.style.display = 'none';
        this._statusMsg.textContent = 'PKM Assistant';
      }
    } else {
      this._statusSpinner.style.display = 'none';
      this._statusMsg.textContent = 'PKM Assistant';
    }
  }

  get notices() {
    if (!this._notices) {
      this._notices = new PKMNotices(this, { adapter: Notice });
    }
    return this._notices;
  }

  // Wait for Obsidian Sync before loading collections
  async ready_to_load_collections() {
    await new Promise(r => setTimeout(r, 3000));
    await this.wait_for_obsidian_sync();
  }

  async wait_for_obsidian_sync() {
    while (this.obsidian_is_syncing) {
      console.log('PKM Assistant: Waiting for Obsidian Sync to finish');
      await new Promise(r => setTimeout(r, 1000));
      if (!this.plugin) throw new Error('Plugin disabled while waiting for obsidian sync, reload required.');
    }
  }

  get obsidian_is_syncing() {
    const sync = this.plugin?.app?.internalPlugins?.plugins?.sync?.instance;
    if (!sync) return false;
    if (sync.syncStatus?.startsWith('Uploading')) return false;
    if (sync.syncStatus?.startsWith('Fully synced')) return false;
    return sync.syncing;
  }

  get obsidian_app() {
    return this.plugin?.app ?? window.app;
  }

  export_json(filename = 'smart_env.json') {
    const json = JSON.stringify(this.to_json(), null, 2);
    if (typeof document !== 'undefined') {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    }
    return json;
  }
}
