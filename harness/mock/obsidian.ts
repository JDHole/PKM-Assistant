/**
 * obsidian.js — atrapa modułu `obsidian` dla harnessa (FAZA A).
 *
 * Podstawiana na etapie builda (esbuild `alias: obsidian → ten plik`). Pakiet
 * `obsidian` z npm to tylko typy — poza Obsidianem nie ma runtime'u. Ten plik
 * dostarcza minimalny, DZIAŁAJĄCY runtime tych symboli, których dotyka bootstrap
 * `PKMAssistantPlugin.onload() + initialize()`.
 *
 * ZASADY:
 *   - `TFile`/`TFolder` to PRAWDZIWE klasy — `modules/tools/ToolLoader.js` robi
 *     `instanceof TFolder/TFile`. Vault-atrapa (mock/app.js) zwraca ICH instancje.
 *   - `Plugin.loadData/saveData` czytają/piszą realny JSON z
 *     `<vault>/.obsidian/plugins/<manifest.id>/data.json` przez adapter.
 *   - `registerInterval(id)` TRACKUJE timery — `shutdownHarnessRuntime()` czyści je,
 *     żeby proces Node mógł się zamknąć (inaczej wisi np. na interwałach `chat_session`).
 *   - Reszta (Modal/ItemView/Setting/Component/…) to puste klasy/no-opy — muszą się
 *     dać zaimportować i skonstruować, nie muszą działać.
 *
 * Wszystko, czego tu NIE MA, a jest importowane z 'obsidian' w kodzie, wywali build
 * (esbuild rozwiązuje named-importy statycznie) → to jest nasz „test pokrycia symboli".
 */

import { createMockEl } from './dom-shim.js';

// TS-any: this file intentionally mocks Obsidian's open-ended runtime API surface for the harness.
type Runtime = any;

// ── Timery pod kontrolą harnessa (żeby proces się zamknął) ──
const _trackedIntervals = new Set<Runtime>();

/** Czyści wszystkie timery zarejestrowane przez Plugin.registerInterval. Wołane z run.js. */
export function shutdownHarnessRuntime() {
  let n = 0;
  for (const id of _trackedIntervals) {
    try { clearInterval(id); n++; } catch { /* best-effort */ }
  }
  _trackedIntervals.clear();
  return n;
}

// ── Platform: bramkuje PKMEnv.load() (isMobile ⇒ defer) ──
export const Platform = {
  isMobile: false,
  isMobileApp: false,
  isDesktop: true,
  isDesktopApp: true,
  isPhone: false,
  isTablet: false,
  isMacOS: false,
  isWin: true,
  isLinux: false,
  isIosApp: false,
  isAndroidApp: false,
  isSafari: false,
};

// ── normalizePath: prosta normalizacja slashy ──
export function normalizePath(path: unknown): string {
  if (typeof path !== 'string') return '';
  let p = path.replace(/\\/g, '/').replace(/\/{2,}/g, '/');
  p = p.replace(/^\.\//, '');
  if (p.length > 1) p = p.replace(/\/$/, '');
  return p === '' ? '/' : p;
}

// ── setIcon / addIcon: no-op ──
export function setIcon() {}
export function addIcon() {}

// ── Notice: no-op, przyjmuje string LUB DocumentFragment ──
//
// Kształt DOM lustrzany do prawdziwego Obsidiana (zweryfikowane w 1.12.7): `containerEl`
// to element ZEWNĘTRZNY (klasa `notice`), `messageEl` jego dziecko (klasa `notice-message`);
// deprecated `noticeEl` wskazuje na TO SAMO co `messageEl` — nie osobny, trzeci element
// (`this.messageEl = this.noticeEl = …` w realnym kodzie). `src/main.ts` (`showCrystalNotice`)
// stylizuje `containerEl` (ogony-ogA, fala 3, 2026-09-04).
export class Notice {
  [key: string]: Runtime;
  constructor(message: Runtime, timeout?: number) {
    this.message = message;
    this.timeout = timeout;
    this.containerEl = createMockEl('div');
    this.messageEl = this.containerEl.createDiv();
    this.noticeEl = this.messageEl;
  }
  setMessage(message: Runtime) { this.message = message; return this; }
  hide() {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Router `requestUrl` (Poligon F1)
//
// PO CO: `requestUrl` to drugi (obok streamingu) kanał wyjścia pluginu na świat —
// jedzie nim wyszukiwarka webowa (`modules/web/WebSearchProvider`), generowanie obrazów
// i STT (`modules/multimodal`) oraz onboarding. Domyślnie harness blokuje wszystko, na co
// scenariusz nie zarejestrował trasy (599) — do 2026-09-04 był tu jeszcze wyjątek: stub
// GitHuba dla updatera (`check_for_update`), zdjęty tego dnia razem z updaterem przed
// katalogiem (D1). Bez zarejestrowanej trasy scenariusz nie ma jak sprawdzić TYCH ścieżek.
//
// Trasy rejestruje scenariusz PRZED biegiem; handler zwraca GOTOWY obiekt odpowiedzi —
// ŻADEN realny HTTP się nie dzieje (inaczej niż przy fake-serwerach modeli, które muszą
// stać na loopbacku, bo idą przez prawdziwy transport strumienia).
//
// Sprzątanie: `scenarios/_runner.ts` woła `clearHarnessRequestUrlRoutes()` przed każdym
// scenariuszem i w `finally` po nim — trasa jednego scenariusza nie może przeciec do
// następnego.
// ─────────────────────────────────────────────────────────────────────────────

/** Żądanie w kształcie, w jakim widzi je handler trasy (znormalizowane z `RequestUrlParam`). */
export interface HarnessRequestUrlRequest {
  url: string;
  method: string;
  body: unknown;
  headers: Record<string, unknown>;
}

/**
 * Odpowiedź zwracana przez handler. Wszystkie pola opcjonalne — router dopełnia resztę
 * (patrz `_normalizeRouteResponse`). Kod produkcyjny czyta z odpowiedzi `requestUrl`:
 * `.text` (WebSearchProvider), `.json` (multimodal, http_request),
 * `.arrayBuffer` (pobieranie obrazka w ImageGenAdapter), `.status` i `.headers`.
 */
export interface HarnessRequestUrlResponse {
  status?: number;
  text?: string;
  json?: unknown;
  arrayBuffer?: ArrayBuffer;
  headers?: Record<string, string>;
}

/** Dopasowanie trasy: fragment URL-a (substring, np. host), regexp albo własny predykat. */
export type HarnessRequestUrlMatcher = string | RegExp | ((url: string) => boolean);

export interface HarnessRequestUrlRoute {
  match: HarnessRequestUrlMatcher;
  handler: (req: HarnessRequestUrlRequest) => HarnessRequestUrlResponse | Promise<HarnessRequestUrlResponse>;
}

let _requestUrlRoutes: HarnessRequestUrlRoute[] = [];

/** Rejestruje trasy routera (nadpisuje poprzednie). Kolejność = kolejność sprawdzania. */
export function setHarnessRequestUrlRoutes(routes: HarnessRequestUrlRoute[] | null | undefined): void {
  _requestUrlRoutes = Array.isArray(routes) ? routes.slice() : [];
}

/** Kasuje wszystkie trasy — po tym `requestUrl` wraca do domyślnej blokady (599). */
export function clearHarnessRequestUrlRoutes(): void {
  _requestUrlRoutes = [];
}

function _matchesRoute(match: HarnessRequestUrlMatcher, url: string): boolean {
  if (typeof match === 'function') {
    try { return !!match(url); } catch { return false; }
  }
  if (match instanceof RegExp) return match.test(url);
  return typeof match === 'string' && match.length > 0 && url.includes(match);
}

/**
 * Dopełnia odpowiedź handlera do pełnego kształtu `requestUrl`: `text` z `json` (i odwrotnie),
 * `status` 200, puste `headers`/`arrayBuffer`. Dzięki temu scenariusz podaje tylko to, co go
 * interesuje, a kod produkcyjny i tak dostaje wszystkie pola, które umie czytać.
 */
function _normalizeRouteResponse(out: HarnessRequestUrlResponse | null | undefined): Runtime {
  const res = out || {};
  let text = typeof res.text === 'string' ? res.text : undefined;
  let json = Object.prototype.hasOwnProperty.call(res, 'json') ? res.json : undefined;
  if (text === undefined && json !== undefined) {
    try { text = JSON.stringify(json); } catch { text = ''; }
  }
  if (json === undefined && typeof text === 'string') {
    try { json = JSON.parse(text); } catch { json = null; }
  }
  return {
    status: typeof res.status === 'number' ? res.status : 200,
    headers: res.headers || {},
    text: text ?? '',
    arrayBuffer: res.arrayBuffer || new ArrayBuffer(0),
    json: json ?? null,
  };
}

// ── requestUrl: ŻADNEGO realnego requestu — trasy scenariusza → 599 ──
// Updater (check_for_update, api.github.com co 3h) wycięty 2026-09-04 przed katalogiem (D1) —
// nic w bootstrapie już nie strzela do sieci samo z siebie. Streaming/model idzie osobnym
// torem (transport strumienia + fake-serwery na loopbacku).
export async function requestUrl(request: Runtime): Promise<Runtime> {
  const isStr = typeof request === 'string';
  const url = isStr ? request : (request?.url || '');
  if (_requestUrlRoutes.length > 0) {
    const req: HarnessRequestUrlRequest = {
      url,
      method: String((isStr ? null : request?.method) || 'GET').toUpperCase(),
      body: isStr ? undefined : request?.body,
      headers: (isStr ? {} : request?.headers) || {},
    };
    for (const route of _requestUrlRoutes) {
      if (!route || !_matchesRoute(route.match, url)) continue;
      return _normalizeRouteResponse(await route.handler(req));
    }
  }
  // Cokolwiek innego = brak sieci. Nic w bootstrapie tego nie woła synchronously.
  console.warn(`[harness] requestUrl blocked (brak trasy w routerze, no network): ${url}`);
  return { status: 599, headers: {}, text: '', arrayBuffer: new ArrayBuffer(0), json: null };
}

// ── Vault-prymitywy: PRAWDZIWE klasy (instanceof w ToolLoader) ──
export class TAbstractFile {
  [key: string]: Runtime;
  constructor() {
    this.path = '';
    this.name = '';
    this.parent = null;
    this.vault = null;
  }
}

export class TFile extends TAbstractFile {
  constructor() {
    super();
    this.basename = '';
    this.extension = '';
    this.stat = { ctime: 0, mtime: 0, size: 0 };
  }
}

export class TFolder extends TAbstractFile {
  constructor() {
    super();
    this.children = [];
  }
  isRoot() { return this.path === '/' || this.path === ''; }
}

// ── Puste klasy UI (muszą się dać zaimportować i skonstruować, nie działać) ──
export class Component {
  [key: string]: Runtime;
  load() {} onload() {} unload() {} onunload() {}
  addChild(c: Runtime) { return c; } removeChild(c: Runtime) { return c; }
  register() {} registerEvent() {} registerDomEvent() {} registerInterval(id: Runtime) { return id; }
}

export class Modal {
  [key: string]: Runtime;
  constructor(app: Runtime) {
    this.app = app;
    this.scope = { register() {}, unregister() {} };
    this.containerEl = createMockEl('div');
    this.modalEl = createMockEl('div');
    this.contentEl = createMockEl('div');
    this.titleEl = createMockEl('div');
  }
  open() {} close() {} onOpen() {} onClose() {}
  setTitle() { return this; } setContent() { return this; }
}

export class ItemView extends Component {
  constructor(leaf: Runtime) {
    super();
    this.leaf = leaf;
    this.app = leaf?.app;
    this.containerEl = createMockEl('div');
    this.contentEl = createMockEl('div');
    this.icon = '';
  }
  getViewType() { return ''; }
  getDisplayText() { return ''; }
  getIcon() { return this.icon; }
  onOpen() { return Promise.resolve(); }
  onClose() { return Promise.resolve(); }
  addAction() { return createMockEl('div'); }
}

export class PluginSettingTab {
  [key: string]: Runtime;
  constructor(app: Runtime, plugin: Runtime) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = createMockEl('div');
  }
  display() {} hide() {}
}

export class Setting {
  [key: string]: Runtime;
  constructor(containerEl: Runtime) {
    this.containerEl = containerEl;
    this.settingEl = createMockEl('div');
    this.infoEl = createMockEl('div');
    this.nameEl = createMockEl('div');
    this.descEl = createMockEl('div');
    this.controlEl = createMockEl('div');
    this.components = [];
  }
  setName() { return this; }
  setDesc() { return this; }
  setClass() { return this; }
  setHeading() { return this; }
  setTooltip() { return this; }
  setDisabled() { return this; }
  then(cb: Runtime) { if (typeof cb === 'function') cb(this); return this; }
  _control(obj?: Runtime): Runtime {
    const ctrl = {
      setValue() { return ctrl; }, getValue() { return ''; },
      setPlaceholder() { return ctrl; }, setDisabled() { return ctrl; },
      onChange() { return ctrl; }, onClick() { return ctrl; },
      setButtonText() { return ctrl; }, setCta() { return ctrl; }, setWarning() { return ctrl; },
      setIcon() { return ctrl; }, setTooltip() { return ctrl; },
      addOption() { return ctrl; }, addOptions() { return ctrl; }, selectEl: createMockEl('select'),
      inputEl: createMockEl('input'), buttonEl: createMockEl('button'), toggleEl: createMockEl('div'),
      ...obj,
    };
    this.components.push(ctrl);
    return ctrl;
  }
  addText(cb?: Runtime) { const c = this._control(); if (cb) cb(c); return this; }
  addTextArea(cb?: Runtime) { const c = this._control(); if (cb) cb(c); return this; }
  addSearch(cb?: Runtime) { const c = this._control(); if (cb) cb(c); return this; }
  addToggle(cb?: Runtime) { const c = this._control({ getValue() { return false; } }); if (cb) cb(c); return this; }
  addButton(cb?: Runtime) { const c = this._control(); if (cb) cb(c); return this; }
  addExtraButton(cb?: Runtime) { const c = this._control(); if (cb) cb(c); return this; }
  addDropdown(cb?: Runtime) { const c = this._control(); if (cb) cb(c); return this; }
  addSlider(cb?: Runtime) { const c = this._control(); if (cb) cb(c); return this; }
  addMomentFormat(cb?: Runtime) { const c = this._control(); if (cb) cb(c); return this; }
}

export class AbstractInputSuggest {
  [key: string]: Runtime;
  constructor(app: Runtime, inputEl: Runtime) { this.app = app; this.inputEl = inputEl; }
  setValue() {} getValue() { return ''; }
  onSelect() {} close() {} open() {}
  setSuggestions() {} renderSuggestion() {} selectSuggestion() {}
  getSuggestions() { return []; }
}

export class HoverPopover {
  [key: string]: Runtime;
  constructor() { this.hoverEl = createMockEl('div'); }
  hide() {}
}

export const Keymap = {
  isModifier() { return false; },
  isModEvent() { return false; },
  compileModifiers() { return ''; },
  decompileModifiers() { return []; },
};

export class MarkdownRenderer {
  static async render() {}
  static async renderMarkdown() {}
}

// ── Plugin: działające loadData/saveData + registerInterval tracking + no-opy ──
export class Plugin {
  [key: string]: Runtime;
  constructor(app: Runtime, manifest?: Runtime) {
    this.app = app;
    this.manifest = manifest || {};
    this._children = [];
    // Review W5-01: dry-boot ma POKAZAĆ, że komendy i ikony wstążki naprawdę się zarejestrowały.
    // Wcześniej `addCommand` był czystym no-opem, więc regresja „zero komend, bo env nie wstał"
    // przechodziła przez harness niezauważona. Trzymamy same zarejestrowane definicje.
    this._registeredCommands = [];
    this._registeredRibbonIcons = [];
  }

  _dataPath() {
    const id = this.manifest?.id || 'pkm-assistant';
    return `.obsidian/plugins/${id}/data.json`;
  }

  async loadData() {
    try {
      const adapter = this.app?.vault?.adapter;
      const path = this._dataPath();
      if (!adapter || !(await adapter.exists(path))) return null;
      const raw = await adapter.read(path);
      return JSON.parse(raw);
    } catch (e: Runtime) {
      console.warn('[harness] Plugin.loadData failed:', e?.message || e);
      return null;
    }
  }

  async saveData(data: Runtime) {
    try {
      const adapter = this.app?.vault?.adapter;
      const path = this._dataPath();
      await adapter.write(path, JSON.stringify(data, null, 2));
    } catch (e: Runtime) {
      console.warn('[harness] Plugin.saveData failed:', e?.message || e);
    }
  }

  addCommand(cmd: Runtime) { this._registeredCommands.push(cmd); return cmd; }
  addRibbonIcon(icon: Runtime, title: Runtime) {
    this._registeredRibbonIcons.push({ icon, title });
    return createMockEl('div');
  }
  addStatusBarItem() { return createMockEl('div'); }
  addSettingTab() {}
  registerView() {}
  registerHoverLinkSource() {}
  registerExtensions() {}
  registerEvent(ref: Runtime) { return ref; }
  registerDomEvent() {}
  registerInterval(id: Runtime) { _trackedIntervals.add(id); return id; }
  registerMarkdownCodeBlockProcessor() {}
  registerMarkdownPostProcessor() {}
  registerObsidianProtocolHandler() {}
  registerEditorExtension() {}
  registerEditorSuggest() {}
  addChild(c: Runtime) { this._children.push(c); return c; }
  removeChild(c: Runtime) { return c; }
  load() {} onload() {} unload() {} onunload() {}
  register() {}
}

// ── default export: obiekt ze wszystkimi symbolami (src/main.js: `import Obsidian from "obsidian"`) ──
const obsidian = {
  Platform,
  Notice,
  Plugin,
  Component,
  Modal,
  ItemView,
  PluginSettingTab,
  Setting,
  AbstractInputSuggest,
  HoverPopover,
  Keymap,
  MarkdownRenderer,
  TAbstractFile,
  TFile,
  TFolder,
  requestUrl,
  normalizePath,
  setIcon,
  addIcon,
};

export default obsidian;
