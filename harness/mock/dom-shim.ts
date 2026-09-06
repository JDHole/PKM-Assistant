/**
 * dom-shim.js — minimalna atrapa DOM dla harnessa (FAZA A).
 *
 * PO CO: plugin startuje w czystym Node, gdzie NIE MA `document`/`window`. Bootstrap
 * dotyka DOM w kilku miejscach POZA try/catch (m.in. `showCrystalNotice` w
 * `src/main.js` — woła `document.createDocumentFragment().createEl(...)` PO ustawieniu
 * `_ready=true`), więc bez tego shimu proces wywala się na końcu udanego startu.
 *
 * ZASADA: to NIE jest jsdom. Dostarczamy tylko tyle DOM-u, ile realnie tyka ścieżka
 * `onload()+initialize()`. Element-atrapa (`createMockEl`) implementuje Obsidianowe
 * rozszerzenia prototypu (`createEl`/`createDiv`/`addClass`/`setText`/`empty`…) jako
 * łańcuchowalne no-opy; nieznane właściwości zwracają łańcuchowalny no-op (zamiast
 * `undefined`), żeby uciąć rundy debugowania na „X is not a function".
 *
 * Import tego pliku instaluje globale (side-effect). run.js importuje go PIERWSZY.
 */

/** `style`-atrapa: `setProperty`/`removeProperty` no-op, dowolny `el.style.x = v` przechodzi. */
// TS-any: the DOM shim deliberately implements an open-ended, chainable subset of browser and Obsidian DOM APIs.
type Runtime = any;

function createStyleProxy() {
  const s: Runtime = {};
  return new Proxy(s, {
    get(t, p) {
      if (p === 'setProperty' || p === 'removeProperty') return () => {};
      if (p === 'getPropertyValue') return () => '';
      const v = t[p];
      return v === undefined ? '' : v;
    },
    set(t, p, v) { t[p] = v; return true; },
  });
}

/**
 * Tworzy atrapę elementu DOM z Obsidianowymi rozszerzeniami.
 * @param {string} [tag='div']
 * @returns {Proxy}
 */
export function createMockEl(tag: string = 'div'): Runtime {
  const base: Runtime = {
    tagName: String(tag).toUpperCase(),
    nodeName: String(tag).toUpperCase(),
    nodeType: 1,
    className: '',
    id: '',
    textContent: '',
    innerHTML: '',
    innerText: '',
    value: '',
    checked: false,
    disabled: false,
    hidden: false,
    href: '',
    src: '',
    type: '',
    placeholder: '',
    title: '',
    tabIndex: 0,
    scrollTop: 0,
    scrollHeight: 0,
    scrollWidth: 0,
    offsetHeight: 0,
    offsetWidth: 0,
    clientHeight: 0,
    clientWidth: 0,
    isConnected: false,
    children: [],
    childNodes: [],
    parentElement: null,
    parentNode: null,
    firstChild: null,
    lastChild: null,
    nextSibling: null,
    previousSibling: null,
    dataset: {},
    style: createStyleProxy(),
    classList: {
      add() {}, remove() {}, toggle() { return false; },
      contains() { return false; }, replace() {},
    },
  };

  const applyOpts = (el: Runtime, opts: Runtime): void => {
    if (!opts || typeof opts !== 'object') {
      if (typeof opts === 'string') el.className = opts;
      return;
    }
    if (opts.cls) el.className = Array.isArray(opts.cls) ? opts.cls.join(' ') : opts.cls;
    if (opts.text != null) el.textContent = String(opts.text);
    if (opts.href != null) el.href = opts.href;
    if (opts.type != null) el.type = opts.type;
    if (opts.placeholder != null) el.placeholder = opts.placeholder;
    if (opts.value != null) el.value = opts.value;
    if (opts.title != null) el.title = opts.title;
    if (opts.attr && typeof opts.attr === 'object') Object.assign(el.dataset, {});
  };

  let proxy: Runtime; // forward ref — metody zwracają `proxy` dla łańcuchowania

  const methods: Runtime = {
    createEl(t: Runtime, opts?: Runtime, cb?: Runtime) {
      const child = createMockEl(t);
      applyOpts(child, opts);
      base.children.push(child);
      if (typeof opts === 'function') opts(child);
      if (typeof cb === 'function') cb(child);
      return child;
    },
    createDiv(opts?: Runtime, cb?: Runtime) { return methods.createEl('div', opts, cb); },
    createSpan(opts?: Runtime, cb?: Runtime) { return methods.createEl('span', opts, cb); },
    createSvg(t?: Runtime) { return createMockEl(t || 'svg'); },
    appendChild(c: Runtime) { base.children.push(c); return c; },
    append(...cs: Runtime[]) { for (const c of cs) if (c && typeof c === 'object') base.children.push(c); },
    prepend(...cs: Runtime[]) { for (const c of cs) if (c && typeof c === 'object') base.children.unshift(c); },
    removeChild(c: Runtime) { const i = base.children.indexOf(c); if (i >= 0) base.children.splice(i, 1); return c; },
    insertBefore(c: Runtime) { base.children.push(c); return c; },
    replaceChild(n: Runtime) { return n; },
    empty() { base.children = []; return proxy; },
    detach() { return proxy; },
    remove() {},
    setText(txt: Runtime) { base.textContent = txt == null ? '' : String(txt); return proxy; },
    getText() { return base.textContent; },
    setAttr() { return proxy; },
    setAttrs() { return proxy; },
    setAttribute() {},
    removeAttribute() {},
    getAttribute() { return null; },
    hasAttribute() { return false; },
    addClass() { return proxy; },
    removeClass() { return proxy; },
    toggleClass() { return proxy; },
    setClass() { return proxy; },
    hasClass() { return false; },
    addEventListener() {},
    removeEventListener() {},
    on() { return proxy; },
    off() { return proxy; },
    onClickEvent() { return proxy; },
    trigger() {},
    dispatchEvent() { return true; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    find() { return null; },
    findAll() { return []; },
    findAllSelf() { return []; },
    closest() { return null; },
    matches() { return false; },
    contains() { return false; },
    focus() {}, blur() {}, click() {}, scrollIntoView() {}, scrollTo() {}, select() {},
    getBoundingClientRect() { return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 }; },
    getBoundingRect() { return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }; },
    cloneNode() { return createMockEl(tag); },
    setCssStyles() {}, setCssProps() {},
    show() {}, hide() {}, toggle() {}, toggleVisibility() {},
    insertAdjacentElement() { return null; },
    insertAdjacentHTML() {},
    insertAdjacentText() {},
    replaceWith() {}, before() {}, after() {},
    getAttrs() { return {}; },
  };

  Object.assign(base, methods);

  proxy = new Proxy(base, {
    get(t, p) {
      if (p in t) return t[p];
      if (typeof p === 'symbol') return undefined;
      // Nieznana właściwość → łańcuchowalny no-op (ucina crash „X is not a function").
      return function () { return proxy; };
    },
    set(t, p, v) { t[p] = v; return true; },
    has() { return true; },
  });

  return proxy;
}

function createMockDocument(): Runtime {
  const doc: Runtime = {
    body: createMockEl('body'),
    head: createMockEl('head'),
    documentElement: createMockEl('html'),
    adoptedStyleSheets: [],
    createElement: (t: Runtime) => createMockEl(t),
    createElementNS: (_ns: Runtime, t: Runtime) => createMockEl(t),
    createDocumentFragment: () => createMockEl('#fragment'),
    createTextNode: (txt: Runtime) => ({ textContent: txt, nodeType: 3 }),
    createComment: (txt: Runtime) => ({ textContent: txt, nodeType: 8 }),
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    getElementsByClassName: () => [],
    getElementsByTagName: () => [],
    addEventListener() {},
    removeEventListener() {},
    createRange: () => ({
      selectNodeContents() {}, setStart() {}, setEnd() {},
      getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0 }; },
      getClientRects() { return []; },
    }),
  };
  return doc;
}

// ── Globale Obsidiana (`createEl`/`createDiv`/`createSpan`/`createFragment`) ──
//
// PO CO: `obsidianmd/prefer-create-el` (walidator katalogu) chce, żeby kod pluginu wołał
// te GLOBALNE pomocnicze zamiast `document.createElement(...)`/`document.createDocumentFragment()`
// — one istnieją naprawdę w oknie renderera Obsidiana (wstrzyknięte przez `enhance.js` z
// pakietu aplikacji, zweryfikowane bezpośrednio w zainstalowanym Obsidianie 1.12.7: `window.createEl`
// = `document.createElement(tag)` + nałożenie opcji (`cls`/`text`/`attr`/...) + wywołanie
// callbacku; `window.createDiv`/`createSpan` = cienkie owijki `createEl('div'|'span', o, cb)`;
// `window.createFragment(cb)` = `document.createDocumentFragment()` + wywołanie callbacku).
// Harness (goły Node) ich nie miał — stąd `document.createElement`/`createDocumentFragment`
// w `src/main.ts` przed naprawą (ogony-ogA, fala 3, 2026-09-04). Implementacja niżej
// deleguje do `createMockEl`, które już umie nałożyć te same opcje (`applyOpts` w jego
// metodzie `createEl`) — jeden throwaway rodzic, zwracamy sam utworzony element/fragment.
function globalCreateEl(tag: Runtime, opts?: Runtime, cb?: Runtime): Runtime {
  const scratch = createMockEl('div');
  return scratch.createEl(tag, opts, cb);
}

function globalCreateFragment(cb?: Runtime): Runtime {
  const frag = createMockEl('#fragment');
  if (typeof cb === 'function') cb(frag);
  return frag;
}

/**
 * Instaluje minimalne globale DOM/przeglądarki potrzebne bootstrapowi.
 * Idempotentne — nie nadpisuje istniejących (np. gdyby Node kiedyś dostał `document`).
 */
export function installDomShim() {
  if (typeof (globalThis as Runtime).document === 'undefined') {
    (globalThis as Runtime).document = createMockDocument();
  }
  if (typeof (globalThis as Runtime).window === 'undefined') {
    (globalThis as Runtime).window = globalThis;
  }
  if (typeof (globalThis as Runtime).open === 'undefined') {
    (globalThis as Runtime).open = () => null;
  }
  if (typeof (globalThis as Runtime).createEl === 'undefined') {
    (globalThis as Runtime).createEl = globalCreateEl;
  }
  if (typeof (globalThis as Runtime).createDiv === 'undefined') {
    (globalThis as Runtime).createDiv = (o?: Runtime, cb?: Runtime) => globalCreateEl('div', o, cb);
  }
  if (typeof (globalThis as Runtime).createSpan === 'undefined') {
    (globalThis as Runtime).createSpan = (o?: Runtime, cb?: Runtime) => globalCreateEl('span', o, cb);
  }
  if (typeof (globalThis as Runtime).createFragment === 'undefined') {
    (globalThis as Runtime).createFragment = globalCreateFragment;
  }
  if (typeof (globalThis as Runtime).navigator === 'undefined') {
    (globalThis as Runtime).navigator = { userAgent: 'pkm-harness', clipboard: { writeText: async () => {}, readText: async () => '' }, language: 'en' };
  }
  if (typeof (globalThis as Runtime).CSSStyleSheet === 'undefined') {
    (globalThis as Runtime).CSSStyleSheet = class CSSStyleSheet {
      replaceSync() {}
      async replace() {}
      insertRule() { return 0; }
      deleteRule() {}
    };
  }
  if (typeof (globalThis as Runtime).getComputedStyle === 'undefined') {
    (globalThis as Runtime).getComputedStyle = () => createStyleProxy();
  }
  if (typeof (globalThis as Runtime).requestAnimationFrame === 'undefined') {
    (globalThis as Runtime).requestAnimationFrame = (cb: Runtime) => {
      const id = setTimeout(() => cb(Date.now()), 0);
      id?.unref?.();
      return id;
    };
    (globalThis as Runtime).cancelAnimationFrame = (id: Runtime) => clearTimeout(id);
  }
  if (typeof (globalThis as Runtime).CustomEvent === 'undefined') {
    (globalThis as Runtime).CustomEvent = class CustomEvent {
      [key: string]: Runtime;
      constructor(type: string, opts: Runtime = {}) { this.type = type; this.detail = opts.detail; }
    };
  }
}

// Side-effect: instaluj globale przy imporcie.
installDomShim();
