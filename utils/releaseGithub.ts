/**
 * `utils/releaseGithub.ts` — czyste funkcje wydania wyjęte z `release.js`:
 * walidacja spójności wersji, nazwa taga, normalizacja odpowiedzi z konsoli,
 * lista assetów, ciało żądania do GitHuba i maskowanie sekretu.
 *
 * Po co osobny plik: `release.js` czyta stdin i strzela do sieci, więc pod AVA nie
 * da się go uruchomić. Wszystko, co da się sprawdzić bez sieci, mieszka tutaj.
 *
 * Plik jest świadomą sierotą grafu produkcyjnego — woła go wydanie, nie kod wtyczki.
 */
import path from 'node:path';

/** Błąd przerywający wydanie. `release.js` łapie go, drukuje `message` i robi `exit 1`. */
export class ReleaseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ReleaseError';
    }
}

/** Stała maska używana przez {@link maskToken} — nie zdradza długości tokena. */
export const TOKEN_MASK = '***';

/**
 * Nazwy zmiennych środowiskowych wymaganych WYŁĄCZNIE przez `npm run release`.
 * Brak którejkolwiek = czytelny błąd + `exit 1`.
 */
export const RELEASE_ENV_VARS = ['GH_TOKEN', 'GH_REPO'] as const;

/** Zmienna `.env` sterująca auto-deployem po KAŻDYM udanym buildzie (nie tylko wydaniowym). */
export const DEPLOY_ENV_VAR = 'DESTINATION_VAULTS';

/**
 * Pliki z `dist/`, które idą na wydanie jako OSOBNE assety.
 *
 * ⚠️ Świadome powtórzenie listy z `utils/buildManifest.ts`. Oba pliki są ładowane
 * wprost przez Node z rootowych skryptów (`node release.js`, `node esbuild.js`),
 * a Node strippuje typy BEZ przepisywania specyfierów — import `'./buildManifest.js'`
 * szukałby nieistniejącego pliku `.js`, a `'./buildManifest.ts'` łamałby kontrakt
 * specyfierów całego repo. Dwie krótkie listy są tańsze niż wyjątek w kontrakcie;
 * pilnuje ich wspólny test (`utils/buildManifest.test.ts` + `releaseAssetPaths` niżej).
 */
const RELEASE_DIST_FILES = ['main.js', 'manifest.json', 'styles.css'] as const;

/** Pełny semver bez prefiksu — dokładnie trzy segmenty liczbowe. */
const BARE_SEMVER = /^\d+\.\d+\.\d+$/;

/**
 * Ciało żądania `POST /repos/<GH_REPO>/releases`.
 * `prerelease` jest ZAWSZE `false` (skrypt nie zna trybu RC — pozostaje archiwum).
 * `draft` jest `true` WYŁĄCZNIE przy `npm run release -- --draft`.
 */
export interface GithubReleasePayload {
    readonly tag_name: string;
    readonly name: string;
    readonly body: string;
    readonly draft: boolean;
    readonly prerelease: false;
}

/**
 * Twarda walidacja spójności wersji. Skrypt SAM NICZEGO NIE BUMPUJE — bump jest
 * krokiem człowieka na branchu roboczym.
 *
 * Rozjazd `package.json.version` ↔ `manifest.json.version` → {@link ReleaseError}
 * z komunikatem cytującym OBIE wartości (żeby było widać, którą poprawić).
 */
export function assertVersionsMatch(pkgVersion: string, manifestVersion: string): void {
    if (pkgVersion === manifestVersion) return;
    throw new ReleaseError(
        `Rozjazd wersji: package.json=${pkgVersion}, manifest.json=${manifestVersion}. `
        + 'Zbumpuj obie w kroku 2 procesu wydania (albo odpal `npm run build`, ktory stempluje manifest).',
    );
}

/**
 * Nazwa taga i nazwa wydania = potwierdzona wersja, ZNAK W ZNAK, BEZ `v`.
 * To wymóg katalogu społeczności (szuka wydania o tagu równym `manifest.version`),
 * nie preferencja projektu.
 *
 * - `releaseTagName('2.2.0')` → `'2.2.0'`
 * - `releaseTagName('v2.2.0')` → rzuca (prefiks `v` jest błędem od 2.2.0 w górę)
 * - `releaseTagName('2.2')` → rzuca (musi być pełny semver X.Y.Z)
 */
export function releaseTagName(confirmedVersion: string): string {
    if (!BARE_SEMVER.test(confirmedVersion)) {
        throw new ReleaseError(
            `Wersja "${confirmedVersion}" nie jest golym semverem X.Y.Z. `
            + 'Katalog spolecznosci szuka wydania o tagu ROWNYM manifest.version — bez litery "v".',
        );
    }
    return confirmedVersion;
}

/**
 * Normalizacja odpowiedzi z konsoli na pytanie `Confirm release version (X.Y.Z): `.
 * Sam ENTER (pusty string / same białe znaki) → GOŁA wartość z `package.json`.
 */
export function confirmedVersionOf(rawAnswer: string, packageVersion: string): string {
    const answer = rawAnswer.trim();
    return answer.length > 0 ? answer : packageVersion;
}

/** Nazwa zipa z assetami: `<manifest.id>-<wersja>.zip`, np. `pkm-assistant-2.2.0.zip`. */
export function releaseAssetZipName(pluginId: string, version: string): string {
    return `${pluginId}-${version}.zip`;
}

/**
 * Pełna lista assetów wgrywanych na GitHuba, W KOLEJNOŚCI WGRYWANIA.
 *
 * Zip, potem KAŻDY plik z `dist/` osobno (katalog społeczności pobiera właśnie te
 * trzy, nie rozpakowuje zipa), potem plik licencji jeszcze raz jako samodzielny
 * asset — razem pięć sztuk, albo cztery, gdy pliku licencji nie ma (wtedy jest
 * tylko ostrzeżenie na konsoli, wydanie leci dalej).
 *
 * @param zipPath ścieżka do zbudowanego zipa
 * @param distDir katalog `dist/`
 * @param thirdPartyLicensesPath ścieżka do pliku licencji zależności albo `null`
 */
export function releaseAssetPaths(
    zipPath: string,
    distDir: string,
    thirdPartyLicensesPath: string | null,
): string[] {
    const assets = [zipPath, ...RELEASE_DIST_FILES.map(file => path.join(distDir, file))];
    if (thirdPartyLicensesPath) assets.push(thirdPartyLicensesPath);
    return assets;
}

/** Złożenie ciała żądania z potwierdzonej wersji, notatek i flagi `--draft`. */
export function buildReleasePayload(
    version: string,
    notes: string,
    options: { draft: boolean },
): GithubReleasePayload {
    const tag = releaseTagName(version);
    return {
        tag_name: tag,
        name: tag,
        body: notes,
        draft: options.draft,
        prerelease: false,
    };
}

/**
 * Maskowanie sekretu w KAŻDYM komunikacie konsoli i w treści błędu.
 *
 * Podmienia WSZYSTKIE wystąpienia `token` na {@link TOKEN_MASK}. Pusty/`undefined`
 * token = tekst bez zmian — pusty wzorzec nie może zamienić maskowania w „zamień
 * wszystko". Podmiana idzie przez `split`/`join`, więc token nie jest traktowany
 * jak wyrażenie regularne (żadnego escapowania, żadnych `$&` w zamienniku).
 */
export function maskToken(text: string, token: string | undefined): string {
    if (!token) return text;
    return text.split(token).join(TOKEN_MASK);
}
