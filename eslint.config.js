// eslint.config.js — E1.6 C2 (R4)
//
// MINIMAL flat config with a SINGLE architectural rule: forbid deep imports into
// another module's internals. Golden rule of this repo: outside a module you may
// import ONLY from `modules/<name>/index.js` (the barrel). Until now this was
// enforced by convention + review; here it becomes a lint error.
//
// HOW THE PATTERNS WORK (documented — see E1.6 report):
//   * `no-restricted-imports` matches the import SPECIFIER string, not the resolved
//     path. A cross-module import always LEAVES the current module, so its specifier
//     starts with `../` (possibly several). Every pattern is anchored on an explicit
//     `../` prefix — specifiers starting with `./` (same-module imports, including
//     subfolders that happen to share a module's name, e.g. models' `./adapters/chat/*`)
//     are never matched. E1.6 also rewrote the few `../agents/…` self-imports to `./…`.
//   * Repo uses two cross-module specifier shapes: `../<module>/…` and
//     `../../modules/<module>/…` — both are covered, at depths 1-4.
//   * `reportUnusedDisableDirectives: 'off'` — old `eslint-disable no-alert` comments
//     in shell predate this config (no such rule here); they stay as documentation.
//
// S31 (2026-07-30) — the rule now also guards `core/`:
//   * Linted trees: `modules/**`, `src/**`, `config/**`, `utils/**` (tests still ignored).
//     `core/**` is deliberately NOT linted: intra-core deep imports are a module's own
//     internals talking to each other, which is legal.
//   * `core/` is a module like any other, so its door is `core/index.js`. Two files stay
//     freely deep-importable everywhere — `core/i18n/index.js` (~140 importers) and
//     `core/utils/Logger.js` (~88): global tooling, pulling them through the barrel buys
//     nothing. Everything else in `core/utils/…` / `core/security/…` is now a lint error.
//   * `src/main.js` (composition root) gets a per-file override, not an exemption: it may
//     deep-import EXACTLY the four obsidian-touching core files that cannot live in the
//     node-safe barrel (see the contract at the top of core/index.js) plus the one
//     documented `modules/crystal-soul/icons.js` (same reason — obsidian). Any other
//     deep import from main.js is still an error.
//
// 2026-09-03 (werdykt Kuby „harness pod lint") — `harness/**` joins the linted trees:
//   * The harness is the plugin's first OUTSIDE consumer (it boots the real bundle in Node), so it
//     must respect the same doors as any module: barrels only. `harness/mock/app.ts` used to
//     deep-import `core/utils/yamlParser.js` — rewritten to `core/index.js`.
//   * Two scenarios poke PURE helpers of a module's internals on purpose (they unit-test the
//     helper through the live plugin, not the module's public surface): `33_skill_marker.ts`
//     (`modules/chat/chat/InlineChipPlugin.js`) and `35_artefakt_approval.ts`
//     (`modules/artifacts/artifactButtons.js`, `artifactSummon.js`). Widening the barrels just for
//     a test would fake a public API nobody else uses, so each gets a per-file whitelist of
//     EXACTLY those specifiers (same pattern as `src/main.ts`) — any other deep import there errors.
//   * `harness/dist/**` stays in global ignores (generated bundle, see D6b). `*.test.ts` stay
//     ignored by the rule like everywhere else.

import fs from 'node:fs';
import path from 'node:path';
import tseslint from 'typescript-eslint';

const MODULE_NAMES = fs
  .readdirSync(path.join(import.meta.dirname, 'modules'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

// `../` at depths 1-4 (deepest real case: modules/mcp/built-in-servers/artifacts/*).
const UP = ['../', '../../', '../../../', '../../../../'];

const positive = [];
const negative = [];
for (const m of MODULE_NAMES) {
  for (const up of UP) {
    positive.push(`${up}${m}/**`, `${up}modules/${m}/**`);
    negative.push(`!${up}${m}/index.js`, `!${up}modules/${m}/index.js`);
  }
}

// S31: `core/` plays by the same rule — door is `core/index.js`. Only `core/i18n/index.js`
// and `core/utils/Logger.js` stay deep-importable (global tooling, ~230 importers together).
// Note: `./core/…` (i.e. `src/core/VaultZones.js`) is never matched — patterns need `../`.
// NOTE — why `core/*.js` + `core/<dir>/*` instead of a single `core/**`: these patterns follow
// gitignore semantics, where a negation CANNOT re-include a file whose parent directory is
// already excluded. `core/**` excludes the directory `core/utils` itself, so
// `!core/utils/Logger.js` would be silently ignored. Matching level by level never excludes a
// directory node, so the two negations below actually bite. (core/ is only 1 level deep.)
for (const up of UP) {
  positive.push(
    `${up}core/*.js`,
    `${up}core/utils/*`,
    `${up}core/security/*`,
    `${up}core/i18n/*`,
  );
  negative.push(
    `!${up}core/index.js`,
    `!${up}core/i18n/index.js`,
    `!${up}core/utils/Logger.js`,
  );
}

// TS-0 (2026-07-30) — negacje CELOWO zostają przypięte do `index.js`, mimo że barrele
// zaczynają migrować na `index.ts`: konwencja kampanii mówi, że specifiery w repo ZAWSZE
// piszemy z `.js` (esbuild i tsx podstawiają rozszerzenie same), więc import barrela
// napisany jako `index.ts` ma być błędem lintu — reguła sama egzekwuje konwencję.
const deepImportPatterns = [...positive, ...negative];

// Composition root: `src/main.js` additionally may reach the obsidian-touching files that
// deliberately do NOT live in the node-safe `core/index.js` barrel (contract documented at
// the top of that file), plus two exceptions with DIFFERENT reasons (AUD-code-review-037 —
// don't fold these into "exactly four", the four are only the obsidian-touching core/ files):
//   - `core/selftest.js` does NOT import obsidian — it's node-safe and could live in the
//     barrel — but stays out because main.ts loads it lazily (`await import(...)`) only when
//     the self-test command runs, not on every boot.
//   - `modules/crystal-soul/icons.js` DOES import obsidian (same reason as the core/ four),
//     but it's a `modules/` file, not a `core/` file, so the barrel's "core/ file touching
//     obsidian" framing doesn't cover it by definition — it's a historical single-file case.

// Harness scenarios that deliberately test PURE internals of one module (2026-09-03, header note).
// 33 imports a file ONE LEVEL DOWN inside chat (`chat/chat/InlineChipPlugin.js`) — the same
// gitignore trap as core/ above: `modules/chat/**` (and even `modules/chat/*/*`) excludes the
// `chat/chat` DIRECTORY node, so a negation of a file inside it is silently ignored (verified
// with the `ignore` package ESLint uses: only FILE-level patterns `*.js` / `*/*.js` never exclude
// a directory, so the negation bites). Hence chat is matched file-by-file for this one scenario;
// every other module keeps the generic `**` patterns.
const scenario33Patterns = [
  ...deepImportPatterns.filter((p) => !/(^|\/)(modules\/)?chat\/(\*\*|index\.js)$/.test(p)),
  '../../modules/chat/*.js',
  '../../modules/chat/*/*.js',
  '!../../modules/chat/index.js',
  '!../../modules/chat/chat/InlineChipPlugin.js',
];
const scenario35Patterns = [
  ...deepImportPatterns,
  '!../../modules/artifacts/artifactButtons.js',
  '!../../modules/artifacts/artifactSummon.js',
];

const compositionRootPatterns = [
  ...deepImportPatterns,
  '!../core/PluginBase.js',
  '!../core/runtime/PluginRuntime.js',
  '!../core/utils/obsidianNav.js',
  '!../core/security/MasterPasswordModal.js',
  '!../config/runtimeConfig.js',
  '!../core/selftest.js',
  '!../modules/crystal-soul/icons.js',
];

export default [
  {
    // D6b (2026-07-30): generated bundles are NOT source. Without this, inline
    // `eslint-disable` comments baked into bundled deps (e.g. `@typescript-eslint/…`
    // in harness/dist/run.js) raise "Definition for rule … not found" ERRORS on any
    // `npx eslint .` that runs AFTER a harness build — a false-red trap for CI (D3).
    // `.claude/**` covers agent worktrees living inside the repo folder: each carries
    // its own harness/dist AND a full source copy, so without the ignore `npx eslint .`
    // lints every parallel session's tree too (false reds + duplicated work).
    ignores: ['harness/dist/**', 'dist/**', '**/harness/dist/**', '.claude/**'],
  },
  {
    // TS-0 (2026-07-30) — TYLKO parser dla plików .ts. Bez pluginu i bez ani jednej reguły
    // typescript-eslint: ten config pilnuje ARCHITEKTURY (deep importy), nie stylu TS.
    // Bez parsera ESLint wywala się na składni typów jeszcze przed sprawdzeniem importów.
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
  {
    files: ['modules/**/*.{js,ts}', 'src/**/*.{js,ts}', 'config/**/*.{js,ts}', 'utils/**/*.{js,ts}', 'harness/**/*.{js,ts}'],
    ignores: ['**/*.test.js', '**/*.test.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: deepImportPatterns,
              message:
                "Deep import into another module's internals. Import only from that module's index.js barrel (golden rule). For core/: use core/index.js — exceptions are core/i18n/index.js and core/utils/Logger.js only.",
            },
          ],
        },
      ],
    },
  },
  {
    // Composition root — wires everything together, so it alone may deep-import the four
    // obsidian-touching core files (they cannot enter the node-safe barrel) and icons.
    // NOT a blanket exemption: every other deep import from main.js still errors.
    files: ['src/main.{js,ts}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: compositionRootPatterns,
              message:
                "Deep import into another module's internals. src/main.js may deep-import ONLY core/PluginBase.js, core/runtime/PluginRuntime.js, core/utils/obsidianNav.js, core/security/MasterPasswordModal.js, core/selftest.js and modules/crystal-soul/icons.js.",
            },
          ],
        },
      ],
    },
  },
  {
    // Harness scenario 33 — unit-tests the inline-trigger marker helpers through the live plugin.
    files: ['harness/scenarios/33_skill_marker.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: scenario33Patterns,
              message:
                "Deep import into another module's internals. harness/scenarios/33_skill_marker.ts may deep-import ONLY modules/chat/chat/InlineChipPlugin.js (pure marker helpers under test).",
            },
          ],
        },
      ],
    },
  },
  {
    // Harness scenario 35 — checks artifact button/summon helpers against the live artifact store.
    files: ['harness/scenarios/35_artefakt_approval.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: scenario35Patterns,
              message:
                "Deep import into another module's internals. harness/scenarios/35_artefakt_approval.ts may deep-import ONLY modules/artifacts/artifactButtons.js and artifactSummon.js (pure helpers under test).",
            },
          ],
        },
      ],
    },
  },
];
