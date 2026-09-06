/**
 * Deklaracja typów dla `js-yaml` (TS-1, 2026-07-30).
 *
 * DLACZEGO TU: paczka `js-yaml` NIE wozi własnych typów, a repo nie ma `@types/js-yaml`
 * (patrz `package.json` — pakietów nie dokładamy w kampanii TS). Bez tego pliku pierwszy
 * skonwertowany importer (`core/utils/yamlParser.ts`) wywala typecheck na TS7016.
 *
 * ZAKRES: dokładnie to, czego repo używa — `load` i `dump`. Zwrotka `load` to `unknown`
 * (YAML może być czymkolwiek), więc wołacze muszą zawężać u siebie. To jest CELOWE:
 * `@types/js-yaml` deklaruje tu `any`, co przepuszczałoby błędy dalej w graf.
 *
 * DO DECYZJI BAZY: jeśli kiedyś wejdzie `@types/js-yaml` jako devDependency, ten plik
 * kasujemy — dwa źródła prawdy dla jednego modułu to proszenie się o rozjazd.
 */
declare module 'js-yaml' {
    export interface DumpOptions {
        indent?: number;
        lineWidth?: number;
        noRefs?: boolean;
        sortKeys?: boolean | ((a: string, b: string) => number);
        skipInvalid?: boolean;
        flowLevel?: number;
        styles?: Record<string, string>;
        schema?: unknown;
        noArrayIndent?: boolean;
        condenseFlow?: boolean;
        quotingType?: "'" | '"';
        forceQuotes?: boolean;
        [key: string]: unknown;
    }

    export interface LoadOptions {
        filename?: string;
        onWarning?: (error: Error) => void;
        schema?: unknown;
        json?: boolean;
        [key: string]: unknown;
    }

    /** Parsuje pojedynczy dokument YAML. Rzuca `YAMLException` przy błędzie składni. */
    export function load(str: string, opts?: LoadOptions): unknown;

    /** Serializuje wartość do YAML-a. */
    export function dump(obj: unknown, opts?: DumpOptions): string;

    const _default: {
        load: typeof load;
        dump: typeof dump;
    };
    export default _default;
}
