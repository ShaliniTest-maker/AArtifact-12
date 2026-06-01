/**
 * test/hello.test.js
 * -----------------------------------------------------------------------------
 * Verifies the pre-existing endpoint `GET /hello` (AAP R1, §0.5.1/§0.5.2).
 *
 * Contract under test (the full HTTP contract, not status alone):
 *   - HTTP status .......... 200
 *   - Response body ........ byte-exact "Hello world"
 *                            (11 ASCII chars: 'H','e','l','l','o',' ','w','o',
 *                             'r','l','d' — NO trailing whitespace or newline)
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
 * Conventions (per AAP §0.4.2/§0.7.2 and the assigned agent prompt):
 *   - CommonJS modules (`require` / no ESM); the project does not set "type":"module".
 *   - Single top-level `describe('GET /hello', ...)` grouping `it(...)` cases.
 *   - Every Supertest chain is `await`ed inside an `async` callback so a rejected
 *     or never-settled request fails the test (prevents false-positive passes).
 *   - Strict equality (`toBe`) for the body — never substring/regex — so an
 *     accidental trailing newline or altered casing fails the assertion.
 *   - No mocks/stubs/fixtures and no beforeEach/afterEach: the handler is stateless
 *     and dependency-free, so tests are isolated and order-independent.
 * -----------------------------------------------------------------------------
 */

'use strict';

const request = require('supertest');
const app = require('../app');

describe('GET /hello', () => {
  it('returns 200 with byte-exact "Hello world" and text/plain content-type', async () => {
    // Drive the imported app in-process; Supertest allocates an ephemeral port.
    const res = await request(app).get('/hello');

    // Full HTTP contract: status + byte-exact body + content-type.
    expect(res.status).toBe(200);
    expect(res.text).toBe('Hello world');

    // Deliberate guard for the Express 5 pitfall (AAP §0.2.2/§0.4.4):
    // `res.send(string)` defaults Content-Type to "text/html; charset=utf-8"
    // unless the handler sets `res.type('text/plain')`. The ratified contract is
    // "text/plain; charset=utf-8" — a failure here flags a feature defect, not a
    // test bug, so this assertion is kept literal.
    expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
  });

  it('is stateless: two sequential requests return identical status and body', async () => {
    // The handler holds no mutable state, so repeated calls must be identical.
    const first = await request(app).get('/hello');
    const second = await request(app).get('/hello');

    expect(first.status).toBe(200);
    expect(second.status).toBe(first.status);
    expect(second.text).toBe(first.text);
    expect(second.text).toBe('Hello world');
  });
});
