/**
 * test/app.test.js
 * -----------------------------------------------------------------------------
 * Cross-cutting Express integration + negative-path suite (AAP R3, R4,
 * §0.4.2/§0.5.1/§0.5.2). This is the third of the project's first three test
 * files; it complements the per-endpoint happy-path suites:
 *   - test/hello.test.js        -> GET /hello        ("Hello world")
 *   - test/good-evening.test.js -> GET /good-evening ("Good evening")
 * Whereas those files assert each endpoint's full body contract, THIS file
 * verifies the wiring: that an importable Express `app` is exported, that both
 * routes are registered, and that unmatched routes/methods fall through to
 * Express's default 404 handler.
 *
 * What this suite verifies (the Express integration and routing behavior):
 *   - App export shape ..... `require('../app')` yields a truthy, configured
 *                            Express instance (`typeof app.listen === 'function'`)
 *                            WITHOUT binding a port (R3).
 *   - Routes wired ......... GET /hello and GET /good-evening are NOT 404.
 *   - Routing case mode .... default Express is CASE-INSENSITIVE, so /Hello and
 *                            /HELLO resolve to the /hello route (see note below).
 *   - Unknown route ........ GET /does-not-exist -> 404 (R4).
 *   - Method scoping ....... POST /hello -> 404; only GET is registered (R4).
 *   - Content-Type guard ... both endpoints respond "text/plain; charset=utf-8".
 *
 * CRITICAL source contract (the file under test — owned by parallel ADD FEATURE
 * work): `require('../app')` relies on `app.js` exporting the configured Express
 * app via `module.exports = app` WITHOUT calling `app.listen()`. Supertest binds
 * the imported app to an ephemeral, in-process port per request, so there is NO
 * fixed port and NO manually started server — keeping the suite parallel-safe and
 * free of EADDRINUSE / open-handle leaks. The TCP listener lives only in
 * `server.js`, which this file intentionally NEVER imports.
 *
 * Endpoint path (AAP §0.1.2): the new endpoint's path is `/good-evening`,
 *   confirmed against the actual `app.js` route registration (and corroborated by
 *   the project `package.json` description). If a future implementation registers
 *   a different path, update the `.get('/good-evening')` calls in lockstep.
 *
 * Case-sensitivity note (AAP §0.4.2 premise reconciled with the implementation):
 *   AAP §0.4.2 anticipated case-MISMATCH -> 404 ("paths are case-sensitive"), but
 *   that holds ONLY if `app.js` sets `app.set('case sensitive routing', true)`.
 *   The shipped `app.js` uses DEFAULT Express routing (case-INsensitive) — and
 *   AAP §0.8.2 forbids behavioral changes to it — so this suite asserts the
 *   ACTUAL, correct behavior: /Hello and /HELLO resolve to the /hello handler and
 *   return 200 "Hello world". Asserting 404 here would be a false negative
 *   against a conformant default-Express app. This honors the AAP directive to
 *   "confirm assumptions against the implementation" (§0.1.2, §0.10).
 *
 * Conventions (per AAP §0.4.2/§0.7.2 and the assigned agent prompt):
 *   - CommonJS modules (`require` / no ESM); the project does not set "type":"module".
 *   - Single top-level `describe('Express app + routing', ...)` grouping `it(...)`.
 *   - Every Supertest chain is `await`ed inside an `async` callback so a rejected
 *     or never-settled request fails the test (prevents false-positive passes).
 *     The sole exception is the export-shape test, which is synchronous because it
 *     inspects the imported module without issuing an HTTP request.
 *   - Strict equality (`toBe`) for bodies and content types — never substring/regex.
 *   - 404 assertions check STATUS ONLY. The Express default 404 handler responds
 *     with "text/html; charset=utf-8" (an HTML error page), which is correct and
 *     intentional, so content-type is deliberately NOT asserted on 404s.
 *   - No mocks/stubs/fixtures and no beforeEach/afterEach: handlers are stateless
 *     and dependency-free, so tests are isolated and order-independent.
 * -----------------------------------------------------------------------------
 */

'use strict';

const request = require('supertest');
const app = require('../app');

describe('Express app + routing', () => {
  // 2.1 — App export shape (the Express integration assertion; AAP R3, §0.4.2).
  // Synchronous on purpose: it inspects the exported module, issuing no request.
  // A configured Express application is a callable function that also exposes a
  // `listen` method; asserting `typeof app.listen === 'function'` confirms the
  // app was constructed and exported WITHOUT a port having been bound at import.
  it('exports a configured Express app instance without binding a port', () => {
    expect(app).toBeTruthy();
    expect(typeof app.listen).toBe('function');
  });

  // 2.2 — Routes wired (AAP §0.4.2 "routes wired"). The cheapest proof that both
  // handlers are registered is that neither path falls through to the default
  // 404. Body/content-type specifics for each endpoint live in their dedicated
  // suites; here we only assert the routes EXIST (status !== 404).
  it('wires both routes (GET /hello and GET /good-evening are not 404)', async () => {
    expect((await request(app).get('/hello')).status).not.toBe(404);
    expect((await request(app).get('/good-evening')).status).not.toBe(404);
  });

  // 2.3 — Case-mismatch behavior (AAP §0.4.2, reconciled with the implementation).
  // The shipped app.js uses DEFAULT (case-INsensitive) Express routing, so /Hello
  // and /HELLO match the /hello route and return 200 "Hello world". This asserts
  // the ACTUAL behavior; see the case-sensitivity note in the header for why 404
  // is deliberately NOT asserted here.
  it('routing is case-insensitive by default: /Hello and /HELLO resolve to /hello', async () => {
    const mixed = await request(app).get('/Hello');
    const upper = await request(app).get('/HELLO');

    expect(mixed.status).toBe(200);
    expect(mixed.text).toBe('Hello world');
    expect(upper.status).toBe(200);
    expect(upper.text).toBe('Hello world');
  });

  // 2.4 — Unknown route -> 404 (AAP R4, §0.4.2). An unregistered path must fall
  // through to Express's default 404 handler. Status only — see header note on
  // why content-type is not asserted for 404 responses.
  it('returns 404 for an unknown route', async () => {
    expect((await request(app).get('/does-not-exist')).status).toBe(404);
  });

  // 2.5 — Method scoping -> 404 (AAP R4, §0.4.2). Only GET is registered for
  // /hello, so a POST to the same path must not succeed; it falls through to the
  // default 404 handler. Status only.
  it('method scoping: POST /hello returns 404 (only GET is registered)', async () => {
    expect((await request(app).post('/hello')).status).toBe(404);
  });

  // 2.6 — Content-Type guard for both endpoints (AAP §0.2.2/§0.4.2/§0.4.4).
  // DELIBERATE guard for the Express 5 pitfall: `res.send(string)` defaults
  // Content-Type to "text/html; charset=utf-8" unless the handler calls
  // `res.type('text/plain')`. The ratified contract is "text/plain; charset=utf-8";
  // this assertion is kept literal so a regression that drops `res.type` correctly
  // fails the suite rather than silently passing.
  it('content-type guard: both endpoints respond text/plain; charset=utf-8', async () => {
    expect((await request(app).get('/hello')).headers['content-type']).toBe('text/plain; charset=utf-8');
    expect((await request(app).get('/good-evening')).headers['content-type']).toBe('text/plain; charset=utf-8');
  });
});
