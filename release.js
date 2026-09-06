// `release.js` — publikacja wydania na GitHubie (`npm run release`).
//
// Skrypt robi kroki 5.1–5.9 z `RELEASE_PROCESS.md`: sprawdza spójność wersji, pyta
// o potwierdzenie, gotuje notatki, przebudowuje `dist/`, tworzy wydanie przez REST API
// i wgrywa assety. Tagu NIE tworzy lokalnie — powstaje zdalnie, razem z wydaniem
// (po sukcesie zrób `git fetch --tags`).
//
// Rootowy plik `.js` uruchamiany wprost przez Node, dlatego helpery importuje
// z rozszerzeniem `.ts` — patrz komentarz nagłówkowy w `esbuild.js`.
//
// BEZPIECZEŃSTWO TOKENA: `GH_TOKEN` nie trafia do argumentów procesu (widocznych
// w liście procesów systemu) ani do żadnego komunikatu. Do `curl` idzie przez
// tymczasowy plik nagłówka, kasowany w `finally` ORAZ na `SIGINT`/`SIGTERM`,
// a KAŻDY tekst, który skrypt sam wypisuje, idzie przez `say`/`warn`/`fail` —
// czyli przez `maskToken`. Jedyne nieprzepuszczone przez maskę wyjście to strumienie
// `npm run build` (`stdio: 'inherit'`), które biegną w podprocesie nieznającym tokena.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';
import dotenv from 'dotenv';
import {
    RELEASES_DIR_NAME,
    formatReleaseNotesContent,
    latestReleaseFile,
    priorNotes,
    resolveNotesTarget,
    writePluginReleaseNotes,
} from './utils/releaseNotes.ts';
import {
    DEPLOY_ENV_VAR,
    RELEASE_ENV_VARS,
    ReleaseError,
    assertVersionsMatch,
    buildReleasePayload,
    confirmedVersionOf,
    maskToken,
    releaseAssetPaths,
    releaseAssetZipName,
    releaseTagName,
} from './utils/releaseGithub.ts';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(ROOT, 'dist');
const LICENSES_FILE = path.join(ROOT, 'THIRD-PARTY-LICENSES.md');

/**
 * Wersja API GitHuba przypięta na sztywno — odczytana z dokumentacji dostawcy
 * 2026-09-06 (docs.github.com/en/rest/releases/releases). Pin, a nie domyślka,
 * żeby zmiana domyślnej wersji po stronie GitHuba nie zmieniła cicho kształtu
 * odpowiedzi pod nogami skryptu.
 */
const GITHUB_API_VERSION = '2026-03-10';

/** Czas, po którym znika lokalny zip — tyle, żeby curl zdążył zwolnić uchwyt pliku. */
const ZIP_CLEANUP_DELAY_MS = 3000;

dotenv.config({ path: path.join(ROOT, '.env') });

const draftMode = process.argv.includes('--draft');

/* ── sprzątanie: jedno miejsce dla `finally` i dla sygnałów ─────────────────────── */

const cleanups = [];

function onExitCleanup(fn) {
    cleanups.push(fn);
}

function runCleanups() {
    while (cleanups.length > 0) {
        const fn = cleanups.pop();
        try {
            fn();
        } catch {
            // sprzątanie nie ma prawa przykryć właściwego błędu
        }
    }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
        runCleanups();
        process.exit(1);
    });
}

/* ── drobne narzędzia ──────────────────────────────────────────────────────────── */

/* Jedno wyjście na konsolę, jedna maska. Nic nie woła `console.*` z pominięciem tych trzech —
   dzięki temu „token nigdy w komunikacie" jest własnością kodu, nie dyscypliny piszącego. */

function mask(text) {
    return maskToken(String(text), process.env.GH_TOKEN);
}

function say(text) {
    console.log(mask(text));
}

function warn(text) {
    console.warn(mask(text));
}

function fail(text) {
    console.error(mask(text));
}

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function delay(ms) {
    return new Promise(resolve => { setTimeout(resolve, ms); });
}

/** Typ MIME assetu — GitHub wymaga go przy wgrywaniu surowych bajtów. */
function contentTypeOf(filename) {
    if (filename.endsWith('.zip')) return 'application/zip';
    if (filename.endsWith('.js')) return 'application/javascript';
    if (filename.endsWith('.json')) return 'application/json';
    if (filename.endsWith('.css')) return 'text/css';
    if (filename.endsWith('.md')) return 'text/markdown';
    return 'application/octet-stream';
}

/* ── kroki procesu ─────────────────────────────────────────────────────────────── */

/**
 * Krok 5.2 — potwierdzenie wersji. Sam ENTER bierze gołą wartość z `package.json`.
 * To, co tu wyjdzie, leci ZNAK W ZNAK do taga, nazwy wydania i nazwy pliku notatek.
 */
async function confirmVersion(rl, packageVersion) {
    const answer = await rl.question(`Confirm release version (${packageVersion}): `);
    return releaseTagName(confirmedVersionOf(answer, packageVersion));
}

/**
 * Krok 5.3 — notatki wydania.
 * Gotowy `releases/<wersja>.md` bierzemy 1:1. Gdy go nie ma, sklejamy świeży opis
 * z konsoli z notatkami poprzedniego wydania i zapisujemy pod ścieżką z
 * `resolveNotesTarget` (zawsze-nie-null, nie dotyka dysku — AUD-docs-009).
 */
async function prepareNotes(rl, releasesDir, version) {
    const target = resolveNotesTarget(releasesDir, version);
    if (fs.existsSync(target)) {
        say(`[release] notatki: biore gotowy ${path.relative(ROOT, target)}`);
        return fs.readFileSync(target, 'utf8');
    }

    const previousFile = latestReleaseFile(releasesDir, version);
    if (previousFile) {
        say(`[release] notatki: dokladam historie z ${path.relative(ROOT, previousFile)}`);
    }

    const description = (await rl.question('Opis wydania (jedno zdanie, ENTER konczy): ')).trim();
    const previous = priorNotes(releasesDir, version);
    const composed = [`# ${version}`, description, previous].filter(part => part.length > 0).join('\n\n');

    fs.mkdirSync(releasesDir, { recursive: true });
    fs.writeFileSync(target, `${composed}\n`, 'utf8');
    say(`[release] notatki zapisane w ${path.relative(ROOT, target)}`);
    return composed;
}

/**
 * Krok 5.5 — świeży `dist/` dokładnie pod potwierdzoną wersję. Błąd przerywa wszystko.
 *
 * Build to `node esbuild.js` (dokładnie to, co robi `npm run build`), wołany przez bieżący
 * plik wykonywalny Node'a — NIE przez `npm.cmd`. Na Windows `spawnSync('npm.cmd', …)` bez
 * powłoki kończy się `EINVAL` (Node ≥ 20.12 odmawia uruchamiania plików `.cmd`/`.bat` bez
 * `shell: true`), a `shell: true` z argumentami to z kolei ostrzeżenie DEP0190. Bezpośredni
 * `process.execPath` omija oba problemy i nie zależy od PATH-a powłoki, z której odpalono skrypt.
 */
function rebuild() {
    say('[release] przebudowa dist/ (node esbuild.js)…');
    if (process.env[DEPLOY_ENV_VAR]) {
        say(`[release] uwaga: ${DEPLOY_ENV_VAR} jest ustawione — build wdrozy sie tez do Twoich vaultow`);
    }
    const result = spawnSync(process.execPath, [path.join(ROOT, 'esbuild.js')], { cwd: ROOT, stdio: 'inherit' });
    if (result.error) {
        throw new ReleaseError(`build nie wystartowal (${result.error.code ?? result.error.message}) — wydanie przerwane przed dotknieciem GitHuba`);
    }
    if (result.status !== 0) {
        throw new ReleaseError('build (node esbuild.js) zakonczyl sie bledem — wydanie przerwane przed dotknieciem GitHuba');
    }
}

/** Krok 5.7 — `POST /repos/<GH_REPO>/releases`. Tag powstaje zdalnie, razem z wydaniem. */
async function createRelease(repo, token, payload) {
    const response = await fetch(`https://api.github.com/repos/${repo}/releases`, {
        method: 'POST',
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'X-GitHub-Api-Version': GITHUB_API_VERSION,
            'Content-Type': 'application/json',
            'User-Agent': 'pkm-assistant-release',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new ReleaseError(`GitHub odrzucil utworzenie wydania (HTTP ${response.status}): ${body}`);
    }
    return response.json();
}

/** Krok 5.8 — zip z `dist/` plus plik licencji zależności, jeśli istnieje. */
function buildZip(zipPath, licensesPath) {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        output.on('close', resolve);
        output.on('error', reject);
        archive.on('error', reject);
        archive.pipe(output);
        archive.directory(DIST_DIR, false);
        if (licensesPath) archive.file(licensesPath, { name: path.basename(licensesPath) });
        void archive.finalize();
    });
}

/**
 * Krok 5.9 — plik z nagłówkiem autoryzacji dla `curl`.
 * Token w PLIKU, nie w `argv`: lista procesów systemu jest czytelna dla każdego.
 * Uprawnienia 0600 i kasowanie razem z katalogiem, także na sygnale.
 */
function writeAuthHeaderFile(token) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pkm-release-'));
    const file = path.join(dir, 'auth.header');
    fs.writeFileSync(file, `Authorization: Bearer ${token}\n`, { mode: 0o600 });
    onExitCleanup(() => fs.rmSync(dir, { recursive: true, force: true }));
    return file;
}

/**
 * Krok 5.8 — wgranie assetów. Wydanie MUSI już istnieć (stąd kolejność: najpierw
 * `createRelease`, potem to). Wymaga `curl` w PATH w wersji >=7.55 (składnia `-H "@plik"`);
 * skrypt świadomie tego nie waliduje z góry — brak curla kończy się wydaniem bez
 * assetów, które trzeba dograć ręcznie przez UI GitHuba.
 *
 * @returns lista assetów, których NIE udało się wgrać
 */
function uploadAssets(uploadUrl, headerFile, assets) {
    const failed = [];
    for (const asset of assets) {
        const name = path.basename(asset);
        try {
            execFileSync('curl', [
                '--silent', '--show-error', '--fail',
                '-X', 'POST',
                '-H', `@${headerFile}`,
                '-H', `Content-Type: ${contentTypeOf(name)}`,
                '--data-binary', `@${asset}`,
                `${uploadUrl}?name=${encodeURIComponent(name)}`,
            ], { stdio: ['ignore', 'pipe', 'pipe'] });
            say(`[release] asset wgrany: ${name}`);
        } catch (err) {
            failed.push(name);
            warn(`[release] asset ODRZUCONY: ${name} (${maskToken(String(err?.message ?? err), process.env.GH_TOKEN)})`);
        }
    }
    return failed;
}

/* ── główny przebieg ───────────────────────────────────────────────────────────── */

async function main() {
    // 5.1 — spójność wersji. Skrypt sam niczego nie bumpuje.
    const pkg = readJson(path.join(ROOT, 'package.json'));
    const manifest = readJson(path.join(ROOT, 'manifest.json'));
    assertVersionsMatch(pkg.version, manifest.version);

    // Sprawdzenie środowiska idzie WCZEŚNIEJ niż krok 5.6 procesu — świadomie:
    // nie ma sensu kazać człowiekowi pisać notatek i czekać na build tylko po to,
    // żeby zderzyć go z brakiem tokena na samym końcu.
    const missing = RELEASE_ENV_VARS.filter(name => !process.env[name]);
    if (missing.length > 0) {
        throw new ReleaseError(
            `Brak w .env: ${missing.join(', ')}. GH_TOKEN to token z zakresem repo, `
            + 'GH_REPO ma format wlasciciel/repo — patrz RELEASE_PROCESS.md krok 5.6.',
        );
    }
    const token = process.env.GH_TOKEN;
    const repo = process.env.GH_REPO;

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    let version;
    let notes;
    try {
        version = await confirmVersion(rl, pkg.version);
        notes = await prepareNotes(rl, path.join(ROOT, RELEASES_DIR_NAME), version);
    } finally {
        rl.close();
    }

    // 5.4 — sformatowana kopia pod widok „co nowego" w pluginie. To JEDYNY plik
    // notatek nadpisywany przy każdym wydaniu; `releases/<wersja>.md` zostaje trwały.
    const pluginNotes = writePluginReleaseNotes(
        path.join(ROOT, RELEASES_DIR_NAME),
        version,
        formatReleaseNotesContent(notes, version),
    );
    say(`[release] widok „co nowego": ${path.relative(ROOT, pluginNotes)}`);

    // 5.5 — świeży dist/ pod potwierdzoną wersję.
    rebuild();

    // 5.7 — wydanie na GitHubie (tag powstaje razem z nim, zdalnie).
    const payload = buildReleasePayload(version, notes, { draft: draftMode });
    const release = await createRelease(repo, token, payload);
    say(`[release] wydanie utworzone: ${release.html_url}${draftMode ? ' (draft)' : ''}`);

    // 5.8 — assety: zip, trzy pliki z dist/ osobno, plik licencji jako piąty.
    const licenses = fs.existsSync(LICENSES_FILE) ? LICENSES_FILE : null;
    if (!licenses) {
        warn('[release] brak THIRD-PARTY-LICENSES.md — wydanie leci dalej bez tego assetu');
    }

    const zipPath = path.join(ROOT, releaseAssetZipName(manifest.id, version));
    onExitCleanup(() => fs.rmSync(zipPath, { force: true }));
    await buildZip(zipPath, licenses);

    const headerFile = writeAuthHeaderFile(token);
    const uploadUrl = String(release.upload_url).replace(/\{.*$/, '');
    const failed = uploadAssets(uploadUrl, headerFile, releaseAssetPaths(zipPath, DIST_DIR, licenses));

    await delay(ZIP_CLEANUP_DELAY_MS);
    fs.rmSync(zipPath, { force: true });

    if (failed.length > 0) {
        throw new ReleaseError(
            `Wydanie ${version} ISTNIEJE, ale ${failed.length} assetow sie nie wgralo: ${failed.join(', ')}. `
            + 'Dograj je recznie przez UI GitHuba (sprawdz tez `curl --version` — wymagane >=7.55).',
        );
    }

    say(`[release] gotowe. Teraz: git fetch --tags (tag ${version} powstal zdalnie).`);
}

main()
    .catch(err => {
        const raw = err instanceof ReleaseError ? err.message : String(err?.stack ?? err);
        fail(`[release] BLAD: ${raw}`);
        process.exitCode = 1;
    })
    .finally(runCleanups);
