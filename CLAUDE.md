# Job Scout — project memory

Read this file at the start of every session. Then read `docs/PROGRESS.md`.
Before you stop, update `docs/PROGRESS.md` with what changed and what's next.

## What this is
A personal bot that finds job postings matching Chris Kujawa's profile, scores
them with the Claude API, and emails him a short morning digest. It runs
unattended on Google Apps Script, bound to a Google Sheet. It is used by one
person.

## Hard rules (never break, never "temporarily" relax)
1. **It never applies, messages, or contacts anyone.** No emails to employers
   or recruiters, no form submissions, no account sign-ins. The only outbound
   email goes to the owner's address in Script Properties.
2. **No scraping of LinkedIn, Indeed, Glassdoor or ZipRecruiter search pages,
   and no logging into any job site.** Coverage from those sites comes only from
   the job-alert emails they send Chris (see `src/sources/gmail.js`). A single
   public posting page linked from an alert email may be fetched to read the
   full description. If the fetch fails or is blocked, fall back to the email
   text. Never retry in a loop.
3. **Only use sources whose terms allow this use.** Follow each API's
   attribution and rate-limit rules. If a source's terms are unclear, stop and
   say so in `docs/PROGRESS.md` instead of guessing.
4. **No secrets in the repo.** API keys live in Apps Script Script Properties.
   `.clasp.json` holds only the script ID. The repo must be private because
   `config/profile.md` contains resume content.
5. **Spend is capped.** Claude API calls per run and per day are limited by
   `MAX_TRIAGE_PER_DAY` and `MAX_DEEP_PER_DAY` in the Config tab. When a cap is
   hit, skip the remaining scoring, log it, and mention it in the digest.
6. **Never delete rows from the Jobs or Seen tabs.** Mark them instead.

## Stack
- Google Apps Script (V8), bound to the Google Sheet "Job Scout".
- Code in `src/`, pushed with `clasp`. Deploys run from a GitHub Action on
  push to `main`, so Chris can work entirely from Claude Code on his phone.
- HTTP calls use `UrlFetchApp` with `muteHttpExceptions: true`. Always check
  response codes.
- Claude API via `UrlFetchApp` to `https://api.anthropic.com/v1/messages`.
  Model names come from the Config tab, never hard-coded:
  - `TRIAGE_MODEL` (default `claude-haiku-4-5-20251001`) for a quick pass.
  - `DEEP_MODEL` (default `claude-sonnet-5`) for full scoring of finalists.
- No external libraries.

## Apps Script limits to design around
- 6-minute execution limit per run. Work in batches. Save a cursor in Script
  Properties and let the next trigger continue where the last one stopped.
- `UrlFetchApp` daily quota. Log the fetch count per run.
- `LockService` around every run so two triggers can't overlap.

## Sheet layout (tabs)
| Tab | Purpose |
|---|---|
| `Jobs` | One row per unique posting. Columns in `src/schema.js`. |
| `Seen` | Dedupe keys already processed, with first-seen date. |
| `Companies` | Target companies: name, ATS (greenhouse/lever/ashby/none), board token, lane, verified (Y/N), notes. |
| `Config` | Key/value settings: floors, caps, models, search titles, digest time. |
| `Log` | One row per run: start, end, per-source counts, errors, Claude calls, cost estimate. |

## Pipeline (one run)
1. **Collect** from each enabled source into a common `Posting` shape
   (`src/schema.js`).
2. **Normalize and dedupe.** Key = hash of lowercase company + title +
   location with punctuation stripped. Canonicalize URLs by removing tracking
   parameters. Skip keys already in `Seen`.
3. **Pre-filter** with no AI: drop titles matching `EXCLUDE_TITLE_TERMS` and
   postings older than `MAX_AGE_DAYS`. Keep a posting only if it's remote, in
   the Illinois Valley commute radius, or in New York.
4. **Triage** (cheap model): a 0–100 relevance score and a one-line reason.
   Only postings with a score of at least `TRIAGE_CUTOFF` continue.
5. **Deep score** (strong model), using the full description when available.
   The output is strict JSON, validated against `src/schema.js`. Invalid JSON
   gets one retry, then the posting is marked `score_error`.
6. **Write** rows to `Jobs` and keys to `Seen`, then log the run.
7. **Digest** (separate trigger, mornings): email the new Apply and Stretch
   rows since the last digest.

## Pay floors (base salary, by where Chris would have to live)
- Illinois Valley (Ottawa, LaSalle-Peru, Streator, Pontiac), or remote while
  living there: **$75,000**. This is `FLOOR_IL` in Config; every other floor
  is derived from it.
- Suffolk County / eastern Long Island: FLOOR_IL x 1.6 (about $120,000).
- Nassau County or New York City: FLOOR_IL x 1.95 (about $146,000).
- Elsewhere in New York: FLOOR_IL x (area cost-of-living index / 84). Streator's
  index is about 84, with the US average at 100.
- A remote role paid at NY rates while Chris stays in Illinois uses the
  Illinois floor. That's a positive signal, not a problem.
- If pay isn't listed, the model estimates it and marks it as an estimate.

## Target lanes (see `config/profile.md` for the why)
`auto` AI and workflow automation · `dms` dealer-software implementation,
success and solutions · `oem` manufacturer dealer-facing roles · `ops`
tech-forward operations and service leadership.

## Conventions
- Every source adapter exports `fetchPostings(config) -> Posting[]` and must
  never throw. On failure it logs and returns `[]`.
- Every function that calls an external service has a `DRY_RUN` path that uses
  fixtures from `test/fixtures/`.
- Tests are plain Apps Script functions named `test_*`, run by `runAllTests()`.
  They must pass before every deploy (the GitHub Action runs them via
  `clasp run` when credentials allow; otherwise run them by hand and note it).
- Keep functions small. One file per source.

## Owner
Chris Kujawa. Digest email address: Script Property `OWNER_EMAIL`.
