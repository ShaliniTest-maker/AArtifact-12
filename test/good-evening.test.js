/**
 * test/good-evening.test.js
 * -----------------------------------------------------------------------------
 * Verifies the NEW endpoint `GET /good-evening` (AAP R2, §0.5.1/§0.5.2).
 *
 * This is the core deliverable of the user's feature request: an Express route
 * that returns the byte-exact body "Good evening". The companion suites are
 * `test/hello.test.js` (the pre-existing `GET /hello` endpoint) and
 * `test/app.test.js` (cross-cutting Express integration and 404 negative paths).
 *
 * Contract under test (the full HTTP contract, not status alone):
 *   - HTTP status .......... 200
 *   - Response body ........ byte-exact "Good evening"
 *                            (12 ASCII chars: 'G','o','o','d',' ','E','v','e',
 *                             'n','i','n','g' — capital G, capital E, a single
 *                             space, and NO trailing whitespace or newline)
 *   - Content-Type header .. "text/plain; charset=utf-8"
 *
 * CRITICAL source contract (file under test — owned by parallel ADD FEATURE work):
 *   `require('../app')` relies on `app.js` exporting the configured Express app
 *   via `module.exports = app` WITHOUT calling `app.listen()`. Supertest binds
 *   the imported app to an ephemeral, in-process port per request, so there is
 *   NO fixed port and NO manually started server — keeping the suite parallel-safe
 *   and free of EADDRINUSE / open-handle leaks. The TCP listener lives only in
 *   `server.js`, which this file intentionally NEVER imports.
 *
 * Endpoint path (AAP §0.1.2): the route is `/good-evening`, corroborated by the
 *   project `package.json` description ("GET /good-evening ('Good evening')").
 *   Both the `describe` label and the `.get(...)` argument track this path; if a
 *   future implementation registers a different path, update both in lockstep.
 *
 * Conventions (per AAP §0.4.2/§0.7.2 and the assigned agent prompt):
 *   - CommonJS modules (`require` / no ESM); the project does not set "type":"module".
 *   - Single top-level `describe('GET /good-evening', ...)` grouping `it(...)` cases.
 *   - Every Supertest chain is `await`ed inside an `async` callback so a rejected
 *     or never-settled request fails the test (prevents false-positive passes).
 *   - Strict equality (`toBe`) for the body — never substring/regex — so an
 *     accidental trailing newline or altered casing fails the assertion.
 *   - No mocks/stubs/fixtures and no beforeEach/afterEach: the handler is stateless
 *     and dependency-free, so tests are isolated and order-independent.
 *
 * Negative paths (unknown route -> 404, case-sensitivity, unregistered methods)
 *   are deliberately NOT asserted here; they are centralized in `test/app.test.js`.
 * -----------------------------------------------------------------------------
 */

'use strict';

const request = require('supertest');
const app = require('../app');

describe('GET /good-evening', () => {
  it('returns 200 with byte-exact "Good evening" and text/plain content-type', async () => {
    // Drive the imported app in-process; Supertest allocates an ephemeral port,
    // so no real TCP listener is bound and the test stays parallel-safe.
    const res = await request(app).get('/good-evening');

    // Full HTTP contract: status + byte-exact body + content-type.
    expect(res.status).toBe(200);

    // Strict equality on the raw text body. "Good evening" is exactly 12 bytes
    // with a capital G, capital E, a single interior space, and no trailing
    // whitespace/newline — a regression in casing or whitespace fails here.
    expect(res.text).toBe('Good evening');

    // Deliberate guard for the Express 5 pitfall (AAP §0.2.2/§0.4.4):
    // `res.send(string)` defaults Content-Type to "text/html; charset=utf-8"
    // unless the handler sets `res.type('text/plain')`. The ratified contract is
    // "text/plain; charset=utf-8" — a failure here flags a feature defect, not a
    // test bug, so this assertion is kept literal.
    expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
  });

  it('is stateless: two sequential requests return identical status and body', async () => {
    // The handler holds no mutable state, so repeated calls must be identical.
    const first = await request(app).get('/good-evening');
    const second = await request(app).get('/good-evening');

    expect(first.status).toBe(200);
    expect(second.status).toBe(first.status);
    expect(second.text).toBe(first.text);
    expect(second.text).toBe('Good evening');
  });
});
