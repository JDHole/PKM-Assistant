/**
 * Logger - centralny system logowania dla Obsek plugin.
 *
 * Użycie:
 *   import { log } from '../utils/Logger.js';
 *   log.debug('MojModul', 'Co się dzieje', dane);
 *   log.info('MojModul', 'Ważna informacja');
 *   log.warn('MojModul', 'Uwaga!');
 *   log.error('MojModul', 'Błąd', error);
 *   log.tool('nazwa_toola', args, result);
 *   log.model('main', 'deepseek', 'deepseek-chat');
 *   log.timing('MojModul', 'operacja', startTime);
 *
 * Debug mode: ustawiany przez obsek.debugMode w settings.
 * Kiedy DEBUG=false: tylko warn/error.
 * Kiedy DEBUG=true: WSZYSTKO (debug, info, tool, model, timing).
 */

const COLORS = {
    debug: 'color: #888',
    info:  'color: #4fc3f7',
    warn:  'color: #ffb74d',
    error: 'color: #ef5350; font-weight: bold',
    tool:  'color: #81c784',
    model: 'color: #ce93d8',
    timing:'color: #fff176',
};

const ICONS = {
    debug: '🔍',
    info:  'ℹ️',
    warn:  '⚠️',
    error: '❌',
    tool:  '🔧',
    model: '🤖',
    timing:'⏱️',
};

class Logger {
    constructor() {
        this._debug = false;
    }

    /** Called from settings or plugin init to enable/disable debug mode */
    setDebug(enabled) {
        this._debug = !!enabled;
        if (enabled) {
            console.log(
                '%c[Obsek] 🐛 DEBUG MODE WŁĄCZONY — wszystkie logi aktywne',
                'color: #4caf50; font-weight: bold; font-size: 14px'
            );
        }
    }

    get isDebug() {
        return this._debug;
    }

    /** Debug - only when debug mode is on */
    debug(module, message, ...data) {
        if (!this._debug) return;
        console.log(
            `%c${ICONS.debug} [Obsek:${module}] ${message}`,
            COLORS.debug,
            ...data
        );
    }

    /** Info - only when debug mode is on */
    info(module, message, ...data) {
        if (!this._debug) return;
        console.log(
            `%c${ICONS.info} [Obsek:${module}] ${message}`,
            COLORS.info,
            ...data
        );
    }

    /** Warn - ALWAYS visible */
    warn(module, message, ...data) {
        console.warn(
            `${ICONS.warn} [Obsek:${module}] ${message}`,
            ...data
        );
    }

    /** Error - ALWAYS visible */
    error(module, message, ...data) {
        console.error(
            `${ICONS.error} [Obsek:${module}] ${message}`,
            ...data
        );
    }

    /** Tool call log - debug only */
    tool(toolName, args, result) {
        if (!this._debug) return;
        const argStr = typeof args === 'string' ? args : JSON.stringify(args, null, 2);
        const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
        const truncResult = resultStr?.length > 500 ? resultStr.slice(0, 500) + '...' : resultStr;
        console.groupCollapsed(
            `%c${ICONS.tool} [Obsek:Tool] ${toolName}`,
            COLORS.tool
        );
        console.log('Args:', argStr);
        console.log('Result:', truncResult);
        console.groupEnd();
    }

    /** Model selection log - debug only */
    model(role, platform, modelId) {
        if (!this._debug) return;
        console.log(
            `%c${ICONS.model} [Obsek:Model] ${role} → ${platform}/${modelId}`,
            COLORS.model
        );
    }

    /** Timing log - debug only */
    timing(module, operation, startTime) {
        if (!this._debug) return;
        const elapsed = Date.now() - startTime;
        console.log(
            `%c${ICONS.timing} [Obsek:${module}] ${operation}: ${elapsed}ms`,
            COLORS.timing
        );
    }

    /** Group start - debug only */
    group(module, label) {
        if (!this._debug) return;
        console.groupCollapsed(
            `%c📂 [Obsek:${module}] ${label}`,
            'color: #90a4ae; font-weight: bold'
        );
    }

    /** Group end - debug only */
    groupEnd() {
        if (!this._debug) return;
        console.groupEnd();
    }

    /** Table log - debug only */
    table(module, label, data) {
        if (!this._debug) return;
        console.log(
            `%c📊 [Obsek:${module}] ${label}`,
            'color: #90a4ae'
        );
        console.table(data);
    }
}

/** Singleton instance */
export const log = new Logger();
