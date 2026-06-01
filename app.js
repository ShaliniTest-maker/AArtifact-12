/**
 * app.js
 * -----------------------------------------------------------------------------
 * Express application factory for the Node.js tutorial server.
 *
 * This module CONSTRUCTS and CONFIGURES the Express application and exports it
 * via `module.exports = app` WITHOUT ever calling `app.listen()`. Binding a TCP
 * port is the sole responsibility of the thin bootstrap entry point `server.js`.
 *
 * Why the app/server split (AAP §0.4.4 / §0.8.1):
 *   Separating application construction from server startup lets the test suite
 *   import the configured app directly and drive it in-process via Supertest,
 *   which allocates an ephemeral port per request. No fixed port is bound, so the
 *   suite is parallel-safe and free of `EADDRINUSE` errors and open-handle leaks
 *   that would otherwise prevent Jest from exiting cleanly.
 *
 * HTTP contract exposed by this module (asserted byte-exactly by the test suite):
 *   - GET /hello         -> 200, body "Hello world",  Content-Type "text/plain; charset=utf-8"
 *   - GET /good-evening  -> 200, body "Good evening",  Content-Type "text/plain; charset=utf-8"
 *   - any other route/method -> 404 (Express default fall-through handler)
 *
 * Express 5 content-type note (AAP §0.2.2):
 *   `res.send(string)` defaults Content-Type to "text/html; charset=utf-8".
 *   Each handler therefore calls `res.type('text/plain')` first; combined with
 *   `res.send`, Express normalizes the header to "text/plain; charset=utf-8",
 *   which is the ratified contract the tests assert literally.
 *
 * Module system: CommonJS (`require` / `module.exports`); the project does not
 *   set "type": "module" in package.json.
 * -----------------------------------------------------------------------------
 */

'use strict';

const express = require('express');

// Construct the Express application instance. All route handlers below are
// registered against this single, shared instance, which is exported (not
// started) at the bottom of the file.
const app = express();

/**
 * GET /hello
 * Pre-existing tutorial endpoint. Returns the byte-exact greeting "Hello world".
 *
 * `res.type('text/plain')` is required so that the subsequent `res.send` emits
 * "text/plain; charset=utf-8" rather than the Express 5 default of
 * "text/html; charset=utf-8".
 */
app.get('/hello', (req, res) => {
  res.type('text/plain').send('Hello world');
});

/**
 * GET /good-evening
 * New endpoint added per the feature request. Returns the byte-exact greeting
 * "Good evening" (capital G, capital E, a single interior space, no trailing
 * whitespace or newline).
 *
 * Mirrors the conventions of GET /hello, including the explicit
 * `res.type('text/plain')` content-type guard.
 */
app.get('/good-evening', (req, res) => {
  res.type('text/plain').send('Good evening');
});

// Export the fully configured application WITHOUT starting a listener. The TCP
// listener is bound exclusively by server.js (`require('./app').listen(PORT)`).
// This is the single structural contract the in-process test suite depends on.
module.exports = app;
