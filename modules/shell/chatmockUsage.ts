/**
 * @module chatmockUsage
 * S32 Z3 (2026-07-30) — zużycie subskrypcji ChatGPT przez ChatMocka.
 *
 * ChatMock to lokalne proxy (port 1234, udaje LM Studio), które podpina subskrypcję ChatGPT
 * pod plugin. **Nie wystawia** endpointu `/usage` ani nagłówków rate-limit po HTTP — ale po
 * KAŻDYM requeście zapisuje snapshot limitów do pliku `usage_limits.json` w swoim katalogu
 * domowym. Ten moduł tylko czyta ten plik i tłumaczy go na kształt do wyrysowania.
 *
 * Podział jak w resztce repo: wszystko poza `readChatmockUsage()` jest CZYSTE (zero fs, zero
 * DOM, zero Obsidiana) i pokryte testami w `chatmockUsage.test.js`. Nieczysty jest jeden,
 * krótki odczyt z dysku, opakowany w total-catch — brak pliku / mobile / śmieci = `null`,
 * nigdy wyjątek w rendererze.
 *
 * Kształt pliku ChatMocka (rzeczywisty przykład):
 * ```json
 * {
 *   "captured_at": "2026-07-30T10:46:43.508177+00:00",
 *   "primary":   { "used_percent": 0.0, "window_minutes": 10080, "resets_in_seconds": 506831 },
 *   "secondary": { "used_percent": 0.0, "window_minutes": 0,     "resets_in_seconds": 0 }
 * }
 * ```
 * `primary` = główne okno subskrypcji (10080 min = tygodniowe), `secondary` = drugie okno
 * (bywa zerowe, `null` albo w ogóle go nie ma). Dlatego parser jest defensywny: okno bez
 * `used_percent` jest POMIJANE, zamiast rysować fałszywe „0% zużyte".
 */

/** Nazwa pliku ze snapshotem limitów, zapisywanego przez ChatMocka po każdym requeście. */
export const USAGE_FILENAME = 'usage_limits.json';

/** Okna, które umiemy pokazać — w kolejności wyświetlania. */
const WINDOW_KEYS = ['primary', 'secondary'];

const MIN_PER_DAY = 1440;
const SEC_PER_DAY = 86400;
const SEC_PER_HOUR = 3600;

/** Fallback jednostek, gdy ktoś woła formatter bez `t` (np. test / node). */
const FALLBACK_UNITS = { days: '{{count}} d', day_one: '1 d', hours: '{{count}} h', minutes: '{{count}} min' };
type Environment = Record<string, string | undefined>;
type Translator = (key: string, params?: Record<string, unknown>) => string;
export type ChatmockWindow = { key: string; usedPercent: number; windowMinutes: number | null; resetsInSeconds: number | null };
export type ChatmockUsage = { capturedAt: Date | null; windows: ChatmockWindow[] };
// TS-any: `window.require` returns legacy Node module facades with no stable static API in the renderer.
type NodeRequire = any;
type ReadDeps = { nodeRequire?: NodeRequire; env?: Environment };

/**
 * Katalog domowy ChatMocka. Łańcuch dokładnie jak w samym ChatMocku:
 * `CHATGPT_LOCAL_HOME` → `CODEX_HOME` → `<homedir>/.chatgpt-local`.
 *
 * Czysta funkcja: `env` i `homedir` wstrzykiwane, żeby dało się to przetestować w node.
 *
 * @param {Object} [env] - mapa zmiennych środowiskowych (zwykle `process.env`)
 * @param {string} [homedir] - katalog domowy usera (zwykle `os.homedir()`)
 * @returns {string|null} ścieżka katalogu albo `null`, gdy nie ma z czego jej złożyć
 */
export function resolveChatmockHome(env?: Environment | null, homedir?: string): string | null {
    const pick = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);
    const explicit = pick(env?.CHATGPT_LOCAL_HOME) || pick(env?.CODEX_HOME);
    if (explicit) return explicit;

    const home = pick(homedir);
    if (!home) return null; // bez homedir nie ma fallbacku — lepiej „nie wiem" niż zgadywanie
    const sep = home.includes('\\') && !home.includes('/') ? '\\' : '/';
    const base = home.endsWith('/') || home.endsWith('\\') ? home.slice(0, -1) : home;
    return `${base}${sep}.chatgpt-local`;
}

/** Liczba albo `null` — `NaN`/`Infinity`/string/`undefined` traktujemy jak brak danych. */
function num(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Parsuje zawartość `usage_limits.json` na kształt do wyrysowania.
 *
 * Okno BEZ `used_percent` (null / nieobecne / nie-liczba) jest pomijane — pusta lista okien
 * jest poprawnym wynikiem („plik jest, ale nie ma czego pokazać"), a `null` znaczy „to nie jest
 * plik ChatMocka" (zły JSON, tablica, string, itd.).
 *
 * @param {string} jsonText
 * @returns {{capturedAt: Date|null, windows: Array<{key: string, usedPercent: number,
 *   windowMinutes: number|null, resetsInSeconds: number|null}>}|null}
 */
export function parseChatmockUsage(jsonText: unknown): ChatmockUsage | null {
    let raw: Record<string, unknown>;
    try {
        raw = JSON.parse(String(jsonText ?? '')) as unknown as Record<string, unknown>;
    } catch (_) {
        return null;
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

    const captured = new Date(String(raw.captured_at ?? ''));
    const capturedAt = Number.isNaN(captured.getTime()) ? null : captured;

    const windows = [];
    for (const key of WINDOW_KEYS) {
        const win = raw[key];
        if (!win || typeof win !== 'object') continue;
        const usedPercent = num((win as Record<string, unknown>).used_percent);
        if (usedPercent === null) continue; // bez licznika nie rysujemy paska (0% byłoby kłamstwem)
        windows.push({
            key,
            usedPercent,
            windowMinutes: num((win as Record<string, unknown>).window_minutes),
            resetsInSeconds: num((win as Record<string, unknown>).resets_in_seconds),
        });
    }
    return { capturedAt, windows };
}

/**
 * Jedna jednostka czasu przez i18n (albo fallback, gdy `t` nie podane).
 * `days` przy 1 idzie osobnym kluczem — po polsku „1 dni" boli („1 dzień").
 */
function unit(t: Translator | undefined, key: keyof typeof FALLBACK_UNITS, count: number): string {
    const dictKey = key === 'days' && count === 1 ? 'day_one' : key;
    if (typeof t === 'function') return t(`modal.chatmock.unit_${dictKey}`, { count });
    return (FALLBACK_UNITS[dictKey] || FALLBACK_UNITS[key]).replace('{{count}}', String(count));
}

/**
 * Humanizacja długości okna: 10080 → „7 dni", 300 → „5 h", 60 → „1 h", 90 → „1 h 30 min".
 * Brak / zero / śmieć → `''` (wołacz wtedy nic nie rysuje).
 *
 * @param {number|null} min - długość okna w minutach
 * @param {Function} [t] - tłumacz (`core/i18n`); pominięty → surowe jednostki
 * @returns {string}
 */
export function formatWindowMinutes(min: unknown, t?: Translator): string {
    const total = num(min);
    if (total === null || total <= 0) return '';

    const days = Math.floor(total / MIN_PER_DAY);
    const hours = Math.floor((total % MIN_PER_DAY) / 60);
    const minutes = Math.round(total % 60);

    if (days > 0) return hours > 0 ? `${unit(t, 'days', days)} ${unit(t, 'hours', hours)}` : unit(t, 'days', days);
    if (hours > 0) return minutes > 0 ? `${unit(t, 'hours', hours)} ${unit(t, 'minutes', minutes)}` : unit(t, 'hours', hours);
    return unit(t, 'minutes', minutes);
}

/**
 * „resetuje się za 5 dni 20 h" — dni + godziny, a poniżej godziny same minuty.
 * Brak / zero / śmieć → `''`.
 *
 * @param {number|null} seconds - `resets_in_seconds` z pliku ChatMocka
 * @param {Function} [t] - tłumacz (`core/i18n`); pominięty → surowe jednostki + prefiks EN
 * @returns {string}
 */
export function formatResetsIn(seconds: unknown, t?: Translator): string {
    const total = num(seconds);
    if (total === null || total <= 0) return '';

    const days = Math.floor(total / SEC_PER_DAY);
    const hours = Math.floor((total % SEC_PER_DAY) / SEC_PER_HOUR);
    let time;
    if (days > 0) {
        time = hours > 0 ? `${unit(t, 'days', days)} ${unit(t, 'hours', hours)}` : unit(t, 'days', days);
    } else if (hours > 0) {
        const minutes = Math.floor((total % SEC_PER_HOUR) / 60);
        time = minutes > 0 ? `${unit(t, 'hours', hours)} ${unit(t, 'minutes', minutes)}` : unit(t, 'hours', hours);
    } else {
        time = unit(t, 'minutes', Math.max(1, Math.round(total / 60))); // <1 min → „1 min", nie „0 min"
    }

    return typeof t === 'function' ? t('modal.chatmock.resets_in', { time }) : `resets in ${time}`;
}

/**
 * JEDYNA nie-czysta funkcja: odczyt `usage_limits.json` z dysku.
 *
 * ⚠️ `window.require('fs')`, a NIE `import('node:fs')` — esbuild zostawia dynamiczny import
 * externala jako natywny `import()`, którego resolver renderera nie zna, i bundle wybucha
 * w runtime (ten sam bug co na `obsidian` w smoke E3.1, patrz `ExternalMcpManager.js`).
 * `window.require` istnieje w Obsidianie desktop; na mobile go nie ma → `null`.
 *
 * Czytamy od razu `readFileSync` w try/catch, bez `existsSync` — `exists()` kłamie na dyskach
 * sieciowych (incydent 2026-07-28), a brak pliku i tak wpada w catch.
 *
 * @param {Object} [deps] - wstrzyknięcia dla testów (produkcja nic nie podaje)
 * @returns {{capturedAt: Date|null, windows: Array}|null}
 */
export function readChatmockUsage(deps: ReadDeps = {}): ChatmockUsage | null {
    try {
        const nodeRequire = deps.nodeRequire
            || (typeof window !== 'undefined' && typeof window.require === 'function' ? window.require : null);
        if (typeof nodeRequire !== 'function') return null; // mobile / brak Node

        const fs = nodeRequire('fs');
        const os = nodeRequire('os');
        const env = deps.env || (typeof process !== 'undefined' ? process?.env : null) || {};
        const home = resolveChatmockHome(env, typeof os?.homedir === 'function' ? os.homedir() : '');
        if (!home) return null;

        const sep = home.includes('\\') && !home.includes('/') ? '\\' : '/';
        return parseChatmockUsage(fs.readFileSync(`${home}${sep}${USAGE_FILENAME}`, 'utf8'));
    } catch (_) {
        return null; // brak pliku / brak uprawnień / brak Node — modal pokaże notę „nie wykryto"
    }
}
