# Research game UI verification

Production battle/content sources remain frozen. These tests use an isolated research build, browser origin, and IndexedDB store. They do not publish the game or measure win rates.

## Build and gates

From the repository root, use the installed dependencies and run:

```sh
VITE_SAKUYA_RESEARCH=1 npm run typecheck
VITE_SAKUYA_RESEARCH=1 npm run check:content
VITE_SAKUYA_RESEARCH=1 npm run check:ui
VITE_SAKUYA_RESEARCH=1 npm run check:locales
VITE_SAKUYA_RESEARCH=1 npx vite build --outDir /tmp/stillveil-sakuya-research-dist
```

## Browser tests

```sh
VITE_SAKUYA_RESEARCH=1 npx playwright test --config playwright.sakuya-research.config.ts
```

The config starts the tracked `preview.mjs` helper on port 4197 and serves the build inside a nested iframe. `SAKUYA_UI_DIST` changes the build directory and `SAKUYA_UI_PORT` changes the port. Choose a separate port from gameplay recording. The config uses one worker and one WebKit browser. The four existing native interaction tests cover selection protection, editable inputs, party controls, and 320/390px Japanese/English layout. The additional research test covers the actual personal skill description, empty/charged flower display, status details, and stable battle controls. Artificial UI state fixtures are not research battle results.

The verification host needed liblzo2/libGLESv2. The exact official Debian package URLs and SHA-256 values are recorded in `artifacts/this-girl-01/research/webkit-library-provenance.json`. On that host only, both were extracted under `/tmp/sakuya-webkit-libs` and successfully loaded with `ctypes.CDLL`. Playwright's dlopen preflight checked only ldconfig and missed this temporary library path. Actual WebKit tests were run with:

```sh
VITE_SAKUYA_RESEARCH=1 PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 LD_LIBRARY_PATH=/tmp/sakuya-webkit-libs/usr/lib/x86_64-linux-gnu npx playwright test --config playwright.sakuya-research.config.ts
```

Hosts with the libraries installed do not need those two additional variables. No browser test is skipped by the config. Do not treat the host preflight override as proof that a browser launched; inspect the actual test output.

## Native regression tests

```sh
npx vitest run tests/barrier-return.test.ts tests/barrier-return-engine.test.ts --maxWorkers=1 --minWorkers=1
VITE_SAKUYA_RESEARCH=1 npx vitest run tests/barrier-return.test.ts tests/barrier-return-engine.test.ts --maxWorkers=1 --minWorkers=1
```

See `docs/media/this-girl/episodes/01/engine-review.md` and the hashed verification JSON for the actual source, commands, and observations. The preview helper was moved from the temporary path after the browser tests; `node --check` and an HTTP request verify the same server implementation at its permanent path.
