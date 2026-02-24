/**
 * SidebarNav - Stack-based navigation controller for the Agent Sidebar.
 * Manages view stack with push/pop and renders views inline.
 */
export class SidebarNav {
    /**
     * @param {HTMLElement} containerEl - The sidebar content container
     * @param {Object} plugin - Obsek plugin instance
     */
    constructor(containerEl, plugin) {
        this.containerEl = containerEl;
        this.plugin = plugin;
        this.stack = [];
        this.viewRenderers = {};
        this._currentCleanup = null;
        this._rendering = false;
    }

    /**
     * Register a view render function.
     * @param {string} viewId - Unique view identifier
     * @param {Function} renderFn - (container, plugin, nav, params) => void
     */
    register(viewId, renderFn) {
        this.viewRenderers[viewId] = renderFn;
    }

    /**
     * Push a new view onto the stack.
     * @param {string} viewId
     * @param {Object} params - View-specific data
     * @param {string} title - Label shown in back button of this view
     */
    push(viewId, params = {}, title = '') {
        if (this._rendering) return;
        // Save scroll position of current view
        if (this.stack.length > 0) {
            const scrollArea = this.containerEl.querySelector('.sidebar-view-content');
            if (scrollArea) {
                this.stack[this.stack.length - 1].scrollTop = scrollArea.scrollTop;
            }
        }
        this.stack.push({ viewId, params, title, scrollTop: 0 });
        this._render();
    }

    /**
     * Pop current view and return to previous.
     */
    pop() {
        if (this._rendering || this.stack.length <= 1) return;
        this.stack.pop();
        this._render();
    }

    /**
     * Replace current view without growing the stack.
     */
    replace(viewId, params = {}, title = '') {
        if (this._rendering) return;
        if (this.stack.length > 0) {
            this.stack[this.stack.length - 1] = { viewId, params, title, scrollTop: 0 };
        } else {
            this.stack.push({ viewId, params, title, scrollTop: 0 });
        }
        this._render();
    }

    /**
     * Reset to home view (clear stack except first entry).
     */
    goHome() {
        if (this._rendering) return;
        this.stack = this.stack.length > 0 ? [this.stack[0]] : [];
        this._render();
    }

    /**
     * Re-render current top-of-stack view.
     */
    refresh() {
        if (this._rendering) return;
        this._render();
    }

    /**
     * Get current view ID.
     * @returns {string|null}
     */
    currentView() {
        return this.stack.length > 0 ? this.stack[this.stack.length - 1].viewId : null;
    }

    /** @private */
    _render() {
        this._rendering = true;

        // Cleanup previous view's subscriptions
        if (this._currentCleanup) {
            this._currentCleanup();
            this._currentCleanup = null;
        }

        this.containerEl.empty();
        this.containerEl.addClass('agent-sidebar');

        const current = this.stack[this.stack.length - 1];
        if (!current) {
            this._rendering = false;
            return;
        }

        // Back button (if not home)
        if (this.stack.length > 1) {
            const prev = this.stack[this.stack.length - 2];
            const backBar = this.containerEl.createDiv({ cls: 'sidebar-nav-back' });
            const backBtn = backBar.createEl('button', {
                cls: 'sidebar-back-btn',
                text: `← ${prev.title || 'Wstecz'}`
            });
            backBtn.addEventListener('click', () => this.pop());
        }

        // View content area (scrollable)
        const content = this.containerEl.createDiv({ cls: 'sidebar-view-content' });

        // Render the view
        const renderFn = this.viewRenderers[current.viewId];
        if (renderFn) {
            renderFn(content, this.plugin, this, current.params);
        } else {
            content.createEl('p', {
                text: `Nieznany widok: ${current.viewId}`,
                cls: 'agent-error'
            });
        }

        // Restore scroll position
        if (current.scrollTop > 0) {
            requestAnimationFrame(() => {
                content.scrollTop = current.scrollTop;
            });
        }

        this._rendering = false;
    }
}
