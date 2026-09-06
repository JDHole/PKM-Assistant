/**
 * ChatMockUsageModal — S32 Z3 (2026-07-30).
 *
 * Pokazuje zużycie subskrypcji ChatGPT wystawionej pluginowi przez ChatMocka (lokalne proxy
 * na porcie 1234, udające LM Studio). Dane biorą się WYŁĄCZNIE z pliku `usage_limits.json`,
 * który ChatMock zapisuje po każdym requeście — patrz `chatmockUsage.js`. Zero sieci, zero
 * pytania proxy o cokolwiek.
 *
 * Modal jest GŁUPI: cała logika (ścieżka pliku, parsowanie, humanizacja czasu) siedzi
 * w czystym `chatmockUsage.js`. Tutaj jest tylko DOM + „Odśwież" (ponowny odczyt pliku).
 *
 * Szerokość paska idzie zmienną CSS `--pkm-chatmock-bar` ustawianą przez `setProperty`
 * (wzór `--cs-startprompt-accent`): dynamiczna jest sama liczba, reszta stylu żyje w CSS.
 */
import { Modal, type App } from 'obsidian';
import { t, getDateLocale } from '../../core/i18n/index.js';
import { readChatmockUsage, formatWindowMinutes, formatResetsIn } from './chatmockUsage.js';
import type { ChatmockUsage, ChatmockWindow } from './chatmockUsage.js';

export class ChatMockUsageModal extends Modal {
    declare _read: () => ChatmockUsage | null;

    /**
     * @param {Object} app - Obsidian App
     * @param {Object} [opts]
     * @param {Function} [opts.read] - wstrzyknięcie czytnika (testy / smoke); domyślnie plik ChatMocka
     */
    constructor(app: App, { read = readChatmockUsage }: { read?: () => ChatmockUsage | null } = {}) {
        super(app);
        this._read = read;
    }

    onOpen() {
        this.contentEl.addClass('cs-chatmock-modal');
        this._render();
    }

    _render() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: t('modal.chatmock.title') });
        contentEl.createEl('p', { text: t('modal.chatmock.desc'), cls: 'setting-item-description' });

        let usage = null;
        try {
            usage = this._read();
        } catch (_) {
            usage = null; // czytnik nie ma prawa wywalić modala
        }

        if (!usage) {
            contentEl.createEl('p', { text: t('modal.chatmock.not_detected'), cls: 'cs-chatmock__note' });
        } else if (usage.windows.length === 0) {
            contentEl.createEl('p', { text: t('modal.chatmock.no_windows'), cls: 'cs-chatmock__note' });
        } else {
            for (const win of usage.windows) this._renderWindow(contentEl, win);
        }

        if (usage?.capturedAt) {
            contentEl.createDiv({
                text: t('modal.chatmock.captured_at', { when: usage.capturedAt.toLocaleString(getDateLocale()) }),
                cls: 'cs-chatmock__captured',
            });
        }

        const footer = contentEl.createDiv({ cls: 'cs-chatmock__footer' });
        const refreshBtn = footer.createEl('button', { text: t('modal.chatmock.refresh') });
        refreshBtn.addEventListener('click', () => this._render());
        const closeBtn = footer.createEl('button', { text: t('generic.close') });
        closeBtn.addEventListener('click', () => this.close());
    }

    /** Jedno okno limitu: nazwa + pasek + „X% zużyte" + długość okna + reset. */
    _renderWindow(container: HTMLElement, win: ChatmockWindow): void {
        const box = container.createDiv({ cls: 'cs-chatmock__window' });

        const nameKey = win.key === 'secondary' ? 'modal.chatmock.window_secondary' : 'modal.chatmock.window_primary';
        box.createEl('strong', { text: t(nameKey) });

        const percent = Math.max(0, Math.min(100, win.usedPercent));
        const bar = box.createDiv({ cls: 'cs-chatmock__bar' });
        bar.style.setProperty('--pkm-chatmock-bar', `${percent}%`);
        bar.createDiv({ cls: 'cs-chatmock__bar-fill' });

        box.createDiv({
            text: t('modal.chatmock.used_percent', { percent: this._fmtPercent(win.usedPercent) }),
            cls: 'cs-chatmock__percent',
        });

        const windowLabel = formatWindowMinutes(win.windowMinutes, t);
        if (windowLabel) {
            box.createDiv({
                text: t('modal.chatmock.window_label', { window: windowLabel }),
                cls: 'cs-chatmock__meta',
            });
        }

        const resets = formatResetsIn(win.resetsInSeconds, t);
        if (resets) box.createDiv({ text: resets, cls: 'cs-chatmock__meta' });
    }

    /** 0 → „0", 12.5 → „12,5" (locale), 100 → „100". Bez zbędnych zer po przecinku. */
    _fmtPercent(value: number): string {
        const rounded = Math.round(value * 10) / 10;
        return rounded.toLocaleString(getDateLocale(), { maximumFractionDigits: 1 });
    }
}
