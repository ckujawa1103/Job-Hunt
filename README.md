# Job Scout

A personal job-finding bot for one person. It collects postings from allowed
sources, scores them against `config/profile.md` and location-based pay floors
with the Claude API, and emails a short morning digest. It runs unattended on
Google Apps Script, bound to a Google Sheet.

**It never applies to anything and never contacts anyone.** The only outbound
email goes to the owner.

## Where to start

- [`CLAUDE.md`](CLAUDE.md) — project memory, hard rules, pipeline, pay floors.
- [`docs/PROGRESS.md`](docs/PROGRESS.md) — what is built and what is next.
- [`docs/SESSIONS.md`](docs/SESSIONS.md) — the build plan, one session at a time.
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — one-time setup, then push-to-deploy.
- [`docs/SECRETS.md`](docs/SECRETS.md) — every credential and where it lives.

## Day to day

Floors, caps, models, search titles, the digest hour and the `ENABLED` kill
switch live in the Sheet's **Config** tab — edit them from the Sheets app on
your phone, no deploy needed. Code changes deploy by pushing to `main`.

Tests: `node tools/run_tests.js`, or run `runAllTests` in the Apps Script editor.

A fuller README — costs per month, how to pause, how to add a company — is
written in session 7, once there is something to describe.
