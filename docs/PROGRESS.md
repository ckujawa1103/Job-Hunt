# Progress

## Status

**Session 0 complete (2026-09-18).** The repo scaffold, the deploy pipeline and
`setupSheet()` exist and the tests pass locally. Nothing has run against a real
Google account or a real Sheet yet, and no job source is built — that is
session 1 onwards in `docs/SESSIONS.md`.

Next: the manual steps below, then **Session 1 — Core pipeline: schema, dedupe,
config, logging**.

---

## Two things to fix first

1. **This repository is public.** Hard rule 4 says it must be private, because
   `config/profile.md` is resume content — name, town, employers and dates.
   Session 0's commit is already pushed, so that content is public until the
   visibility changes: **Settings -> General -> Danger Zone -> Change
   visibility -> Make private**. That hides the history too. (Nothing secret
   was committed — no keys, no tokens.)
2. **Make `main` the default branch.** `main` now exists and carries the same
   history, and the Deploy workflow deploys on every push to it. One setting is
   left, and it needs a human: **Settings -> General -> Default branch ->
   switch to `main`**. Until that flip, `main` is still a normal branch — pushes
   to it deploy correctly, but new branches and clones start from
   `claude/new-session-rdnh0e`.

## Do these by hand (nothing else is blocked on me)

Full instructions with screenshots-worth-of-detail are in
[`docs/DEPLOY.md`](DEPLOY.md) and [`docs/SECRETS.md`](SECRETS.md). The short
list:

1. **Make sure this repository is private.** `config/profile.md` is resume
   content (hard rule 4).
2. **Create the Google Sheet** named `Job Scout`, then **Extensions -> Apps
   Script** to create the bound script. Copy the **Script ID** from Project
   Settings.
3. **Turn on the Apps Script API** at
   <https://script.google.com/home/usersettings>. `clasp push` fails without it.
4. **Run `clasp login --no-localhost` once** in a GitHub Codespace (works from a
   phone browser) and copy `~/.clasprc.json`.
5. **Add two repository secrets** under Settings -> Secrets and variables ->
   Actions: `CLASPRC_JSON` (the file contents from step 4) and `SCRIPT_ID`
   (from step 2).
6. **Push to `main`** and confirm the Deploy workflow is green. (A manual
   **Actions -> Deploy -> Run workflow** from any branch works too.)
7. **Run `setupSheet` once** from the Apps Script editor and approve the OAuth
   consent screen. Confirm the five tabs appear, Config is filled in and
   Companies lists 24 rows at `verified=N`.
8. **Set the `OWNER_EMAIL` Script Property.** The Anthropic and Adzuna keys can
   wait for sessions 5 and 3.

Then, to confirm session 0 is really done: run `setupSheet` a **second** time.
Nothing should change except the summary it returns.

---

## What session 0 built

| Path | What it is |
|---|---|
| `appsscript.json` | V8, `America/Chicago`, five OAuth scopes (see the note below). |
| `.claspignore` | Pushes `appsscript.json` and `src/**/*.js`, nothing else. |
| `.gitignore` | Blocks `.clasp.json` and `.clasprc.json`. |
| `src/setup.js` | `setupSheet()` plus the tab specs and Config defaults. |
| `src/companies_seed.js` | Generated from `config/companies.seed.csv`. |
| `src/tests.js` | `runAllTests()`, `test_smoke()` and four more tests. |
| `tools/gen_companies.js` | Regenerates the seed file; `--check` fails on drift. |
| `tools/run_tests.js` | Runs the `test_*` functions locally in a sandbox. |
| `.github/workflows/deploy.yml` | Checks on every push/PR; `clasp push` on a push to `main` or on a manual run. |
| `docs/DEPLOY.md`, `docs/SECRETS.md` | The manual steps and every credential. |

`setupSheet()` is idempotent the careful way: it adds missing tabs, appends
missing header columns on the right without reordering or dropping any, adds
only Config keys that are absent (an edited value is never overwritten), adds
only companies whose name is not already listed, and never deletes a row
(hard rule 6).

Config is seeded with every key CLAUDE.md names, plus the derived-floor
multipliers (`FLOOR_MULT_SUFFOLK`, `FLOOR_MULT_NASSAU_NYC`, `COL_INDEX_HOME`),
the commute radius, the per-lane search titles from `config/profile.md`, and
two switches later sessions expect (`ENABLED`, `SEND_EMPTY_DIGEST`).

---

## Decisions worth remembering

- **Two repo secrets, no committed `.clasp.json`.** The workflow writes
  `.clasp.json` from `SCRIPT_ID` and deletes it after the push. If you ever
  rebuild the Sheet, you change a secret instead of editing and committing a
  file from your phone.
- **The seed CSV stays the editable source.** Apps Script can't read
  `config/` at runtime, so `src/companies_seed.js` is generated from it and CI
  fails if someone edits one without the other.
- **Tests run in a local sandbox, not `clasp run`.** `clasp run` needs a GCP
  project and an OAuth client attached to the script, which is not set up. So
  the deploy gate is `node tools/run_tests.js` (pure functions only, Apps Script
  services are stubbed to throw), and anything touching a Google service is
  checked by running `runAllTests` from the editor by hand. Revisit in session 7
  if the by-hand step gets annoying.
- **`main` is the deploy branch; work happens on `claude/new-session-rdnh0e`.**
  Each session's commits land on the working branch and are then
  fast-forwarded onto `main`, which is what `clasp push` deploys from. The two
  are the same commit unless a push is deliberately held back.
- **Jobs columns live in `src/setup.js` for now.** Session 1 creates
  `src/schema.js`; move the column list there and have `sheetSpecs_()` read it,
  so there is one definition. Appending a column later is safe — `setupSheet()`
  adds it to the existing tab without touching data.

## Open items for later sessions

- **Gmail scope (session 4).** `appsscript.json` currently asks for
  `gmail.readonly`, which can read the alert emails but **cannot add the
  `job-alerts/processed` label**. Session 4 has to widen that to
  `gmail.modify`, which will re-prompt for consent. Keep it at readonly until
  then.
- **Spreadsheet scope.** `spreadsheets.currentonly` is deliberate — the script
  can only touch the Sheet it is bound to. If any future code needs
  `openById()`, widen the scope on purpose, not by accident.
- **Nothing in this session fetched anything.** No source terms have been read
  yet; sessions 2-4 must confirm each API's terms before coding it (hard rule 3).
