/**
 * server.js
 * -----------------------------------------------------------------------------
 * Thin bootstrap entry point: binds the configured Express application (imported
 * from ./app) to a TCP port and starts listening for HTTP connections.
 *
 * This is the ONLY place in the project that calls `app.listen()`. Keeping the
 * listener out of app.js preserves the app/server split (AAP §0.4.4 / §0.8.1)
 * that allows the test suite to import the app in-process without binding a port.
 *
 * Run with:  node server.js   (or `npm start`, per package.json "scripts.start").
 * Port:      defaults to 3000; override with the PORT environment variable.
 * -----------------------------------------------------------------------------
 */

'use strict';

const app = require('./app');

// Resolve the listen port: honor an explicit PORT env var when provided,
// otherwise fall back to the tutorial's canonical port 3000 (AAP §0.4.4).
const PORT = process.env.PORT || 3000;

// Start the HTTP server. The callback logs a ready message once the socket is
// bound so operators get clear startup feedback.
const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${PORT}`);
});

// Surface listen-time errors (e.g., EADDRINUSE when the port is already taken)
// with an actionable message and a non-zero exit code instead of an unhandled
// exception, so failures are diagnosable in any environment.
server.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error(`Failed to start server on port ${PORT}: ${err.message}`);
  process.exit(1);
});

module.exports = server;
