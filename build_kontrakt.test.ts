/**
 * Strażnik strukturalny `esbuild.js` / `release.js` / `package.json` / CI (clean-room / F1,
 * klaster build-release) — wzorem `docs_kontrakt.test.ts`.
 *
 * DLACZEGO ten plik istnieje: katalog `behaviors_build-release.md` §F wskazywał kilka
 * luk bez sygnału czerwonego — `esbuild.js` bez ani jednego testu jednostkowego, rozjazd
 * między siedmioma bramkami CI i siedmioma krokami `RELEASE_PROCESS.md` bez strażnika,
 * i "11 komend" w katalogu, gdy w `package.json` jest ich 12 (BR-2).
 *
 * Napisany przed implementacją (czerwony na stubie), dziś zielony — sprawdzone 2026-09-06:
 * `esbuild.js`/`release.js` mają realne ciała. Testy tego pliku czytają je jako TEKST
 * (nie import) i celowo działają NIEZALEŻNIE od tego, czy ciało jest realne czy stubem — bo
 * strażniki tego pliku pilnują KSZTAŁTU ŹRÓDŁA (literał `external`, rozszerzenia importów,
 * brak nazw upstreamu), nie zachowania w runtime. To zamierzone: struktura jest częścią
 * kontraktu od pierwszego commita, treść przybywa później.
 */
import test from 'ava';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cleanRoomPattern } from './core/cleanRoomPattern.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const esbuildSource = read('esbuild.js');
const releaseSource = read('release.js');

/** Wzorzec, którym DWA niezależne testy w `core/` czytają listę `external` z esbuild.js. */
const ESBUILD_EXTERNAL_REGEX = /external:\s*\[([\s\S]*?)\]/;

// ── C.21 — literał external: obsidian jest, electron nie wraca ──────────────────────────────

test('esbuild.js ma literal external z obsidian i bez electron', t => {
    const match = ESBUILD_EXTERNAL_REGEX.exec(esbuildSource);
    t.truthy(match, 'esbuild.js nie ma bloku external: [...] jako literal - dwa strażniki w core/ oślepną');

    const list = [...(match ? match[1] : '').matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]);
    t.true(list.includes('obsidian'), 'lista external musi zawierac "obsidian"');
    t.false(list.includes('electron'), 'electron zszedl z listy 2026-09-04 razem ze swoim jedynym konsumentem (AUD-dead-code-002/101/157) i nie wraca');
});

// ── C.22 — helpery importowane z rozszerzeniem .ts (jedyny wyjatek TS-0) ─────────────────────

test('esbuild.js i release.js importuja lokalne helpery z rozszerzeniem .ts', t => {
    const localSpecifierRe = /from\s+['"](\.\/[^'"]+)['"]/g;

    for (const [label, source] of [['esbuild.js', esbuildSource], ['release.js', releaseSource]] as const) {
        const specifiers = [...source.matchAll(localSpecifierRe)].map(m => m[1]);
        t.true(specifiers.length > 0, `${label} nie ma ani jednego lokalnego importu do sprawdzenia`);
        for (const specifier of specifiers) {
            t.false(specifier.endsWith('.js'), `${label}: specyfier "${specifier}" konczy sie na .js - Node nie przepisuje rozszerzen, plik na dysku to .ts (ERR_MODULE_NOT_FOUND)`);
            t.true(specifier.endsWith('.ts'), `${label}: specyfier "${specifier}" powinien konczyc sie na .ts`);
        }
    }
});

// ── C.23 — dokladnie 12 znanych komend w package.json.scripts (BR-2: nie 11) ─────────────────

const PACKAGE_SCRIPT_NAMES = [
    'build', 'dev', 'release', 'test', 'typecheck', 'lint', 'lint:obsidian',
    'harness:build', 'harness', 'harness:selftest', 'harness:scenarios', 'harness:scenarios:live',
] as const;

test('package.json.scripts to dokladnie 12 znanych komend (BR-2)', t => {
    const pkg = JSON.parse(read('package.json')) as { scripts?: Record<string, string> };
    const actual = Object.keys(pkg.scripts ?? {}).sort();

    t.deepEqual(actual, [...PACKAGE_SCRIPT_NAMES].sort());
});

// ── C.24 — siedem bramek CI w tej samej kolejnosci co RELEASE_PROCESS ────────────────────────

const GATE_COMMANDS = [
    'npm test',
    'npm run typecheck',
    'npm run lint',
    'npm run lint:obsidian',
    'npm run build',
    'npm run harness:selftest',
    'npm run harness:scenarios',
] as const;

test('siedem bramek CI w tej samej kolejnosci co RELEASE_PROCESS', t => {
    const ci = read('.github/workflows/ci.yml');
    const releaseProcess = read('RELEASE_PROCESS.md');

    // ci.yml: wyciagamy kazda linie `run: npm ...` w kolejnosci wystapienia.
    const ciRuns = [...ci.matchAll(/run:\s*(npm\s+(?:test|run\s+[a-z:_-]+))/g)].map(m => m[1].trim());
    const ciGates = ciRuns.filter(cmd => (GATE_COMMANDS as readonly string[]).includes(cmd));
    t.deepEqual(ciGates, [...GATE_COMMANDS], 'ci.yml nie ma siedmiu bramek w oczekiwanej kolejnosci');

    // RELEASE_PROCESS.md Krok 3: blok kodu z tymi samymi siedmioma komendami.
    const step3 = releaseProcess.split(/## Krok 3/)[1]?.split(/## Krok 4/)[0] ?? '';
    for (const gate of GATE_COMMANDS) {
        t.true(step3.includes(gate), `RELEASE_PROCESS.md Krok 3 nie wymienia "${gate}"`);
    }
});

// ── C.25 — zero nazw upstreamu w skryptach builda/release'u ──────────────────────────────────

/**
 * Ta sama lista, którą trzyma bramka „grep zero" — wspólna, żeby dwie kopie nie rozjechały się
 * po pierwszej zmianie. Wzorzec zapisany jest w `core/cleanRoomPattern.ts` tak, żeby zakazane
 * słowa nie występowały w tekście ŻADNEGO pliku repo (ten test też jest przez bramkę skanowany).
 */
const UPSTREAM_NAME_RE = cleanRoomPattern();

test('zero nazw upstreamu w skryptach builda i release\'u', t => {
    const filesToCheck = [
        'esbuild.js',
        'release.js',
        'harness/esbuild.harness.ts',
        'utils/releaseNotes.ts',
        'utils/banner.ts',
        'utils/buildManifest.ts',
        'utils/releaseGithub.ts',
        'modules/shell/ReleaseNotesView.ts',
    ];

    for (const file of filesToCheck) {
        const source = read(file);
        t.notRegex(source, UPSTREAM_NAME_RE, `${file} zawiera slownictwo upstreamu`);
    }
});

// ── C.26 — versions.json ma wpis dla manifest.version rowny minAppVersion (AUTOR) ────────────

test('versions.json ma wpis dla manifest.version rowny minAppVersion', t => {
    const manifest = JSON.parse(read('manifest.json')) as { version: string; minAppVersion: string };
    const versions = JSON.parse(read('versions.json')) as Record<string, string>;
    const pkg = JSON.parse(read('package.json')) as { version: string };

    t.is(pkg.version, manifest.version, 'package.json.version i manifest.json.version musza sie zgadzac');
    t.true(Object.prototype.hasOwnProperty.call(versions, manifest.version), `versions.json nie ma wpisu dla ${manifest.version}`);
    t.is(versions[manifest.version], manifest.minAppVersion);
});

// ── C.27 — kazdy wpis versions.json ma plik releases/X.Y.Z.md ALBO jest na liscie historycznej (AUTOR) ──

/** Notatki sprzed wprowadzenia systemu notatek wydania — swiadomie bez pliku, bez fabrykowania. */
const HISTORICAL_VERSIONS_WITHOUT_NOTES = new Set(['1.1.1', '1.2.1', '2.0.0-rc.1', '2.0.0']);

test('kazdy wpis versions.json ma plik releases/X.Y.Z.md albo jest na liscie historycznej', t => {
    const versions = JSON.parse(read('versions.json')) as Record<string, string>;
    const releasesDir = join(ROOT, 'releases');
    const onDisk = new Set(readdirSync(releasesDir).filter(f => f.endsWith('.md')));

    const braki: string[] = [];
    for (const version of Object.keys(versions)) {
        if (HISTORICAL_VERSIONS_WITHOUT_NOTES.has(version)) continue;
        if (!onDisk.has(`${version}.md`)) braki.push(version);
    }

    t.deepEqual(braki, [], `wersje bez pliku notatek i bez wpisu na liscie historycznej: ${braki.join(', ')}`);
});

test('lista historyczna nie zawiera wersji, ktora juz ma plik notatek', t => {
    // Strażnik odwrotny: gdyby ktoś kiedyś dopisał plik dla wersji z listy historycznej,
    // lista powinna się skurczyć, żeby test C.27 dalej coś pilnował.
    const releasesDir = join(ROOT, 'releases');
    const onDisk = new Set(readdirSync(releasesDir).filter(f => f.endsWith('.md')));

    for (const version of HISTORICAL_VERSIONS_WITHOUT_NOTES) {
        t.false(onDisk.has(`${version}.md`), `${version}.md juz istnieje - usun ${version} z listy historycznej`);
    }
});
