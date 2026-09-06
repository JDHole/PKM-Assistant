/**
 * `release.js` nigdy nie miał testów jednostkowych na swoją logikę (walidacja wersji,
 * nazwa taga, potwierdzenie interaktywne, lista assetów, ciało żądania GitHub,
 * maskowanie tokena). Ten plik domyka tę lukę na czystych funkcjach wyjętych do
 * `utils/releaseGithub.ts`.
 *
 * clean-room / F1 (build-release) — napisany przed implementacją (czerwony na stubie,
 * poza testem releaseAssetZipName który był AUTOR), dziś zielony w całości.
 */
import path from 'node:path';
import test from 'ava';
import {
    ReleaseError,
    assertVersionsMatch,
    buildReleasePayload,
    confirmedVersionOf,
    maskToken,
    releaseAssetPaths,
    releaseAssetZipName,
    releaseTagName,
} from './releaseGithub.js';

// ── assertVersionsMatch ───────────────────────────────────────────────────────────────────────

test('assertVersionsMatch: rozjazd przerywa release', t => {
    t.notThrows(() => assertVersionsMatch('2.2.0', '2.2.0'));

    const err = t.throws(() => assertVersionsMatch('2.2.0', '2.1.9'), { instanceOf: ReleaseError });
    t.true(err!.message.includes('2.2.0'));
    t.true(err!.message.includes('2.1.9'));
});

// ── releaseTagName ────────────────────────────────────────────────────────────────────────────

test('releaseTagName: gola wersja, prefiks v to blad', t => {
    t.is(releaseTagName('2.2.0'), '2.2.0');
    t.throws(() => releaseTagName('v2.2.0'));
    t.throws(() => releaseTagName('2.2'));
    t.throws(() => releaseTagName(''));
});

// ── confirmedVersionOf ────────────────────────────────────────────────────────────────────────

test('confirmedVersionOf: sam ENTER bierze wersje z package.json', t => {
    t.is(confirmedVersionOf('', '2.2.0'), '2.2.0');
    t.is(confirmedVersionOf('  \n', '2.2.0'), '2.2.0');
    t.is(confirmedVersionOf('2.3.0', '2.2.0'), '2.3.0');
    t.is(confirmedVersionOf(' 2.3.0 ', '2.2.0'), '2.3.0');
});

test('confirmedVersionOf: jednoznakowa odpowiedz to ODPOWIEDZ, nie fallback na package.json', t => {
    // Granica: kazdy niepusty wpis po trimie wraca ZNAK W ZNAK, takze dlugosci 1.
    // Gdyby jednoznakowy wpis leciał na fallback, literowka usera cicho wydalaby
    // wersje z package.json zamiast oblac walidacje w releaseTagName.
    t.is(confirmedVersionOf('7', '2.2.0'), '7');
    t.is(confirmedVersionOf('  x  ', '2.2.0'), 'x');
    t.throws(() => releaseTagName(confirmedVersionOf('7', '2.2.0')), { instanceOf: ReleaseError });
});

// ── releaseAssetPaths ─────────────────────────────────────────────────────────────────────────

test('releaseAssetPaths: piec assetow, cztery bez pliku licencji', t => {
    const withLicense = releaseAssetPaths('/tmp/x.zip', '/tmp/dist', '/tmp/THIRD-PARTY-LICENSES.md');
    t.deepEqual(withLicense, [
        '/tmp/x.zip',
        path.join('/tmp/dist', 'main.js'),
        path.join('/tmp/dist', 'manifest.json'),
        path.join('/tmp/dist', 'styles.css'),
        '/tmp/THIRD-PARTY-LICENSES.md',
    ]);

    const withoutLicense = releaseAssetPaths('/tmp/x.zip', '/tmp/dist', null);
    t.is(withoutLicense.length, 4);
    t.notThrows(() => releaseAssetPaths('/tmp/x.zip', '/tmp/dist', null));
});

// ── releaseAssetZipName (AUTOR) ───────────────────────────────────────────────────────────────

test('releaseAssetZipName: <manifest.id>-<wersja>.zip', t => {
    t.is(releaseAssetZipName('pkm-assistant', '2.2.0'), 'pkm-assistant-2.2.0.zip');
});

// ── buildReleasePayload ───────────────────────────────────────────────────────────────────────

test('buildReleasePayload: prerelease zawsze false, draft tylko z flaga', t => {
    t.deepEqual(buildReleasePayload('2.2.0', 'notatki', { draft: false }), {
        tag_name: '2.2.0',
        name: '2.2.0',
        body: 'notatki',
        draft: false,
        prerelease: false,
    });

    const draft = buildReleasePayload('2.2.0', 'notatki', { draft: true });
    t.is(draft.draft, true);
    t.is(draft.prerelease, false);
});

// ── maskToken ─────────────────────────────────────────────────────────────────────────────────

test('maskToken: sekret nigdy nie wychodzi w komunikacie', t => {
    const result = maskToken('blad: ghp_ABC123 nie dziala', 'ghp_ABC123');
    t.false(result.includes('ghp_ABC123'));
    t.true(result.includes('***'));

    const twice = maskToken('ghp_ABC123 i znowu ghp_ABC123', 'ghp_ABC123');
    t.false(twice.includes('ghp_ABC123'));

    t.is(maskToken('tekst', undefined), 'tekst');
    t.is(maskToken('tekst', ''), 'tekst', 'pusty wzorzec nie moze maskowac wszystkiego');
});
