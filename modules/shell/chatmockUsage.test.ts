/**
 * chatmockUsage.test.js — S32 Z3 (2026-07-30).
 *
 * Czysta warstwa „zużycia subskrypcji ChatGPT (ChatMock)": gdzie leży plik, jak go czytać
 * i jak humanizować czas. Sam modal (`ChatMockUsageModal.js`) jest nietestowalny w node
 * (`obsidian` w imporcie), dlatego cała logika, w której da się pomylić, siedzi tutaj.
 *
 * ⚠️ `t` z i18n importujemy jako `tr` — `t` to obiekt asercji AVA.
 */
import test from 'ava';
import {
    resolveChatmockHome,
    parseChatmockUsage,
    formatWindowMinutes,
    formatResetsIn,
    readChatmockUsage,
    USAGE_FILENAME,
} from './chatmockUsage.js';
import { t as tr, setLocale } from '../../core/i18n/index.js';

// TS-any: mocki fasad Node (`fs`/`os`) celowo zwracają różne, niepełne moduły zależnie od testu.
type NodeMock = any;

setLocale('pl');

/** Realny kształt pliku ChatMocka (skopiowany z rzeczywistego snapshotu). */
const REAL = JSON.stringify({
    captured_at: '2026-07-30T10:46:43.508177+00:00',
    primary: { used_percent: 12.5, window_minutes: 10080, resets_in_seconds: 506831 },
    secondary: { used_percent: 0.0, window_minutes: 0, resets_in_seconds: 0 },
});

// ── resolveChatmockHome (3 gałęzie łańcucha) ─────────────────────────────────────

test('resolveChatmockHome: CHATGPT_LOCAL_HOME wygrywa z resztą', t => {
    const home = resolveChatmockHome({ CHATGPT_LOCAL_HOME: '/opt/cm', CODEX_HOME: '/opt/codex' }, '/home/kuba');
    t.is(home, '/opt/cm');
});

test('resolveChatmockHome: bez CHATGPT_LOCAL_HOME bierze CODEX_HOME', t => {
    t.is(resolveChatmockHome({ CODEX_HOME: '/opt/codex' }, '/home/kuba'), '/opt/codex');
});

test('resolveChatmockHome: fallback to <homedir>/.chatgpt-local', t => {
    t.is(resolveChatmockHome({}, '/home/kuba'), '/home/kuba/.chatgpt-local');
    t.is(resolveChatmockHome({}, 'C:\\Users\\jdziu'), 'C:\\Users\\jdziu\\.chatgpt-local');
    t.is(resolveChatmockHome({}, '/home/kuba/'), '/home/kuba/.chatgpt-local', 'bez podwójnego separatora');
});

test('resolveChatmockHome: puste env i brak homedir → null (zero zgadywania)', t => {
    t.is(resolveChatmockHome({ CHATGPT_LOCAL_HOME: '   ' }, ''), null);
    t.is(resolveChatmockHome(undefined, undefined), null);
});

// ── parseChatmockUsage ───────────────────────────────────────────────────────────

test('parseChatmockUsage: realny kształt → data + dwa okna', t => {
    const usage = parseChatmockUsage(REAL);
    t.true(usage!.capturedAt instanceof Date);
    t.is(usage!.capturedAt!.toISOString(), '2026-07-30T10:46:43.508Z');
    t.is(usage!.windows.length, 2);
    t.deepEqual(usage!.windows[0], {
        key: 'primary',
        usedPercent: 12.5,
        windowMinutes: 10080,
        resetsInSeconds: 506831,
    });
    t.is(usage!.windows[1].key, 'secondary');
    t.is(usage!.windows[1].usedPercent, 0);
});

test('parseChatmockUsage: okno bez used_percent jest POMIJANE (0% byłoby kłamstwem)', t => {
    const usage = parseChatmockUsage(JSON.stringify({
        captured_at: '2026-07-30T10:00:00+00:00',
        primary: { used_percent: 3, window_minutes: null, resets_in_seconds: null },
        secondary: { window_minutes: 0 },
    }));
    t.is(usage!.windows.length, 1);
    t.is(usage!.windows[0].key, 'primary');
    t.is(usage!.windows[0].windowMinutes, null);
    t.is(usage!.windows[0].resetsInSeconds, null);
});

test('parseChatmockUsage: secondary null / nieobecny / used_percent null → brane tylko primary', t => {
    for (const secondary of [null, undefined, { used_percent: null }]) {
        const usage = parseChatmockUsage(JSON.stringify({ primary: { used_percent: 0 }, secondary }));
        t.is(usage!.windows.length, 1);
    }
});

test('parseChatmockUsage: plik bez okien z licznikiem → pusta lista, NIE null', t => {
    const usage = parseChatmockUsage(JSON.stringify({ captured_at: 'nonsens' }));
    t.deepEqual(usage, { capturedAt: null, windows: [] });
});

test('parseChatmockUsage: śmieciowy JSON → null', t => {
    t.is(parseChatmockUsage('{oj tam'), null);
    t.is(parseChatmockUsage(''), null);
    t.is(parseChatmockUsage(undefined), null);
    t.is(parseChatmockUsage('[1,2,3]'), null, 'tablica to nie snapshot ChatMocka');
    t.is(parseChatmockUsage('"tekst"'), null);
});

test('parseChatmockUsage: used_percent nie-liczba (string / NaN) traktowany jak brak', t => {
    const usage = parseChatmockUsage(JSON.stringify({ primary: { used_percent: '50' }, secondary: { used_percent: 7 } }));
    t.is(usage!.windows.length, 1);
    t.is(usage!.windows[0].key, 'secondary');
});

// ── formatWindowMinutes ──────────────────────────────────────────────────────────

test('formatWindowMinutes: 10080 min = tygodniowe okno → „7 dni"', t => {
    t.is(formatWindowMinutes(10080, tr), '7 dni');
});

test('formatWindowMinutes: godziny', t => {
    t.is(formatWindowMinutes(300, tr), '5 h');
    t.is(formatWindowMinutes(60, tr), '1 h');
});

test('formatWindowMinutes: minuty i reszty', t => {
    t.is(formatWindowMinutes(5, tr), '5 min');
    t.is(formatWindowMinutes(90, tr), '1 h 30 min');
    t.is(formatWindowMinutes(1500, tr), '1 dzień 1 h', 'liczba pojedyncza ma osobny klucz');
});

test('formatWindowMinutes: null / 0 / śmieć → pusty string', t => {
    t.is(formatWindowMinutes(null, tr), '');
    t.is(formatWindowMinutes(0, tr), '');
    t.is(formatWindowMinutes(undefined, tr), '');
    t.is(formatWindowMinutes(Number.NaN, tr), '');
    t.is(formatWindowMinutes('10080', tr), '', 'string to nie liczba minut');
});

test('formatWindowMinutes: bez `t` działa na fallbacku jednostek', t => {
    t.is(formatWindowMinutes(10080), '7 d');
});

// ── formatResetsIn ───────────────────────────────────────────────────────────────

test('formatResetsIn: realne 506831 s → „resetuje się za 5 dni 20 h"', t => {
    t.is(formatResetsIn(506831, tr), 'resetuje się za 5 dni 20 h');
});

test('formatResetsIn: poniżej doby → godziny (+ minuty)', t => {
    t.is(formatResetsIn(3600, tr), 'resetuje się za 1 h');
    t.is(formatResetsIn(3600 + 15 * 60, tr), 'resetuje się za 1 h 15 min');
});

test('formatResetsIn: poniżej godziny → same minuty, nigdy „0 min"', t => {
    t.is(formatResetsIn(120, tr), 'resetuje się za 2 min');
    t.is(formatResetsIn(5, tr), 'resetuje się za 1 min');
});

test('formatResetsIn: null / 0 / śmieć → pusty string', t => {
    t.is(formatResetsIn(null, tr), '');
    t.is(formatResetsIn(0, tr), '');
    t.is(formatResetsIn(-10, tr), '');
    t.is(formatResetsIn(undefined, tr), '');
});

// ── readChatmockUsage (jedyna nieczysta — wstrzyknięty require) ───────────────────

test('readChatmockUsage: brak Node (mobile) → null', t => {
    t.is(readChatmockUsage({ nodeRequire: null }), null);
});

test('readChatmockUsage: czyta plik z katalogu z łańcucha env', t => {
    let readPath: string | null = null;
    const nodeRequire = (mod: string): NodeMock => {
        if (mod === 'fs') {
            return {
                readFileSync: (p: string) => {
                    readPath = p;
                    return REAL;
                },
            };
        }
        if (mod === 'os') return { homedir: () => '/home/kuba' };
        throw new Error(`nieoczekiwany modul: ${mod}`);
    };

    const usage = readChatmockUsage({ nodeRequire, env: {} });
    t.is<string | null, string>(readPath, `/home/kuba/.chatgpt-local/${USAGE_FILENAME}`);
    t.is(usage!.windows.length, 2);
});

test('readChatmockUsage: brak pliku (rzucający readFileSync) → null, bez wyjątku', t => {
    const nodeRequire = (mod: string): NodeMock => {
        if (mod === 'fs') return { readFileSync: () => { throw new Error('ENOENT'); } };
        if (mod === 'os') return { homedir: () => '/home/kuba' };
        return {};
    };
    t.is(readChatmockUsage({ nodeRequire, env: {} }), null);
});

test('readChatmockUsage: CHATGPT_LOCAL_HOME nadpisuje homedir', t => {
    let readPath: string | null = null;
    const nodeRequire = (mod: string): NodeMock => {
        if (mod === 'fs') return { readFileSync: (p: string) => { readPath = p; return REAL; } };
        if (mod === 'os') return { homedir: () => '/home/kuba' };
        return {};
    };
    readChatmockUsage({ nodeRequire, env: { CHATGPT_LOCAL_HOME: '/opt/cm' } });
    t.is<string | null, string>(readPath, `/opt/cm/${USAGE_FILENAME}`);
});
