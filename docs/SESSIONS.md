# Job Scout — Claude Code session prompts

Run these one at a time, each in a fresh Claude Code session. Paste the whole
block for a session. Don't start the next session until the current one's
"Done when" checks pass and `docs/PROGRESS.md` is updated.

Before Session 0, create a **private** GitHub repo named `job-scout` and add
three files from this pack: `CLAUDE.md`, `config/profile.md`, and
`config/companies.seed.csv`.

---

## Session 0 — Scaffold, deploy pipeline, empty Sheet

```
Read CLAUDE.md. This is session 0 of the Job Scout build.

Goal: a working skeleton I can deploy from my phone.

1. Scaffold the repo: src/ (Apps Script files), test/fixtures/, docs/PROGRESS.md,
   .claspignore, appsscript.json (V8 runtime, America/Chicago time zone,
   only the OAuth scopes this project needs: spreadsheets, gmail read +
   send-to-self, external requests, script properties, triggers).
2. Write src/setup.js with setupSheet(), which creates the tabs Jobs, Seen,
   Companies, Config and Log with headers, and seeds Config with every key named
   in CLAUDE.md, with sensible defaults (FLOOR_IL=75000, TRIAGE_CUTOFF=60,
   MAX_TRIAGE_PER_DAY=150, MAX_DEEP_PER_DAY=25, MAX_AGE_DAYS=14,
   DRY_RUN=TRUE, the model names, EXCLUDE_TITLE_TERMS, digest hour 7).
   Seed Companies from config/companies.seed.csv with verified=N.
3. Add a GitHub Action that runs `clasp push` on every push to main, using a
   CLASPRC_JSON repository secret. Write docs/DEPLOY.md with step-by-step
   instructions I can follow on a phone or in Codespaces: create the Sheet,
   create the bound script, get the script ID, run clasp login once, and paste
   the ~/.clasprc.json contents into the secret.
4. Write docs/SECRETS.md listing every Script Property (ANTHROPIC_API_KEY,
   OWNER_EMAIL, ADZUNA_APP_ID, ADZUNA_APP_KEY) and where to get each.
5. Add runAllTests() and one passing test_smoke().

Done when: the Action is defined, setupSheet() is idempotent (safe to run
twice), and docs/PROGRESS.md lists exactly what I must do by hand.
Do not build any job sources yet.
```

---

## Session 1 — Core pipeline: schema, dedupe, config, logging

```
Read CLAUDE.md and docs/PROGRESS.md. This is session 1.

Goal: the pipeline skeleton with no real sources yet.

1. src/schema.js: the Posting shape (source, sourceId, title, company,
   location, remote flag, url, postedAt, payText, description, rawEmailId)
   and the Jobs tab column list. Add validatePosting().
2. src/config.js: read the Config tab into a typed object, cached per run.
3. src/dedupe.js: normalize(), dedupeKey() as specified in CLAUDE.md,
   canonicalUrl() that strips utm_*, trk, refId, and similar tracking params.
4. src/run.js: runPipeline() with LockService, a per-run Log row (counts per
   stage, errors, fetch count, Claude calls), and a batch cursor in Script
   Properties so a run that nears 5 minutes saves progress and exits cleanly.
5. A fake source that returns fixtures so the whole path can run in DRY_RUN.
6. Tests: dedupe keys are stable across punctuation and case; canonicalUrl
   removes tracking params; a second run over the same fixtures adds zero rows.

Done when: runPipeline() in DRY_RUN writes fixture postings to Jobs once,
logs the run, and all tests pass.
```

---

## Session 2 — Company job boards (Greenhouse, Lever, Ashby)

```
Read CLAUDE.md and docs/PROGRESS.md. This is session 2.

Goal: pull postings directly from target companies' public job boards.

1. Adapters in src/sources/: greenhouse.js, lever.js, ashby.js. Use their
   public job-board endpoints (look up and confirm the current URL formats
   and terms before coding). Request full descriptions where available.
   Strip HTML from descriptions.
2. verifyCompanies(): for each Companies row with verified=N, try likely board
   tokens on each ATS (company name lowercased, hyphenated, and without
   spaces). If exactly one ATS returns a real board for that company, fill in
   the ats and token columns and set verified=Y. If none or several match, set
   verified=NO_MATCH or AMBIGUOUS with a note. Never guess.
3. Only fetch boards where verified=Y.
4. Fixtures and tests for each adapter's parser.

Done when: verifyCompanies() has run once on real data (DRY_RUN off for this
function only), the Companies tab shows which companies were found, and
running the pipeline pulls real postings from the verified boards into Jobs
(still no scoring). Report the verified companies in PROGRESS.md.
```

---

## Session 3 — Remote job APIs and Adzuna

```
Read CLAUDE.md and docs/PROGRESS.md. This is session 3.

Goal: broad coverage from APIs that allow this use.

1. Adapters: remotive.js, remoteok.js, himalayas.js, adzuna.js. Before coding
   each one, read its current API docs and terms. Follow its attribution rules
   (e.g. keep the source link in the digest) and poll no more often than it
   allows. If a source's terms don't allow this use, skip it and note why.
2. Search terms come from the lane titles in config/profile.md (keep them in
   the Config tab so I can edit them without a deploy).
3. Adzuna: run location searches for Streator, IL (50-mile radius) and
   Long Island, NY, plus a remote search.
4. Each adapter never throws and logs its own count and errors.

Done when: a live run pulls deduped postings from every allowed source, the
Log row shows per-source counts, and parser tests pass on saved fixtures.
```

---

## Session 4 — LinkedIn and Indeed via my own alert emails

```
Read CLAUDE.md and docs/PROGRESS.md. This is session 4.

Goal: get LinkedIn and Indeed coverage without scraping, by reading the
job-alert emails they already send me.

1. I'll set up a Gmail filter that labels LinkedIn and Indeed job-alert emails
   "job-alerts". Write the exact filter criteria for me in docs/GMAIL.md.
2. src/sources/gmail.js: read unprocessed threads in that label, parse each
   posting (title, company, location, link) from the email HTML, then add a
   "job-alerts/processed" label. Only read that label, nothing else.
3. For postings that pass triage later, try one fetch of the public posting
   page to get the full description. If it fails or is blocked, keep the email
   text. Never log in, never retry in a loop, never fetch search pages.
4. Parsers must tolerate layout changes: if a parse finds zero postings in an
   alert email that clearly contains jobs, log a warning so it shows in the
   digest's health section.
5. Save a few real alert emails (with my personal info removed) as fixtures.

Done when: alert emails turn into deduped Jobs rows, processed emails get
the processed label, and the parser tests pass.
```

---

## Session 5 — Scoring with Claude (triage + deep score)

```
Read CLAUDE.md, config/profile.md and docs/PROGRESS.md. This is session 5.

Goal: score postings against my profile and my location-based pay floors.

1. src/claude.js: a callClaude(model, system, user, maxTokens) wrapper with
   response-code handling, one retry on 429/529 with backoff, a per-run call
   counter, and a rough cost estimate written to the Log.
2. Pre-filter (no AI): EXCLUDE_TITLE_TERMS, MAX_AGE_DAYS, and location
   (remote / Illinois Valley commute radius / New York).
3. Triage with TRIAGE_MODEL: a 0-100 relevance score and a one-line reason,
   batched several postings per call to keep costs down.
4. Deep score with DEEP_MODEL for postings at or above TRIAGE_CUTOFF. Include
   the full profile and the pay-floor rules from CLAUDE.md (computed from
   FLOOR_IL in Config). Require strict JSON with: title, company, lane,
   fit_score, verdict (apply/stretch/skip), where_he_would_live, floor_used,
   pay, pay_is_estimate, pay_meets_floor (yes/no/unknown), remote, why,
   strengths[3], gaps[<=3], red_flags[], resume_bullets[3], opener. Validate
   the JSON; retry once on invalid output, then mark the posting score_error.
5. Enforce MAX_TRIAGE_PER_DAY and MAX_DEEP_PER_DAY across runs (daily counter
   in Script Properties, reset at midnight Central).
6. Tests with fixture responses: floors are computed correctly for IL, Suffolk,
   Nassau/NYC and remote cases; invalid JSON is handled; caps stop scoring.

Done when: a live run scores new postings, Jobs shows verdicts and floors,
and the Log shows Claude calls and estimated cost under the caps.
```

---

## Session 6 — Morning digest and health alerts

```
Read CLAUDE.md and docs/PROGRESS.md. This is session 6.

Goal: one short, phone-friendly email each morning.

1. src/digest.js: at DIGEST_HOUR Central, email OWNER_EMAIL with the new
   Apply and Stretch rows since the last digest, best first. For each: title,
   company, location/remote, pay and the floor used, fit score, a one-line why,
   gaps, the three resume bullets, the opener, and the posting link (with
   source attribution where required). Simple inline-styled HTML that reads
   well on a phone, plus a plain-text version.
2. If nothing qualifies, send a two-line "nothing worth your time today" email
   with counts, or skip sending if SEND_EMPTY_DIGEST=FALSE.
3. A health section at the bottom, shown only when something is wrong: a source
   with errors or zero results for 3 runs in a row, a parser warning, a hit
   cap, or a Claude error rate over 10%.
4. Friday weekly summary: counts by source and lane, how many Apply/Stretch
   were found, and the top 5 of the week.
5. Add a Status column to Jobs (New / Saved / Applied / Passed) that I can
   change from the Sheets app. The digest skips anything already marked.

Done when: a DRY_RUN digest renders correctly on a phone-width preview (save
the HTML to docs/ as a sample), and one live digest arrives in my inbox.
```

---

## Session 7 — Triggers, hardening, go live

```
Read CLAUDE.md and docs/PROGRESS.md. This is session 7, the go-live session.

1. installTriggers(): collection and scoring runs every 3 hours from 6am to
   9pm Central, the digest at DIGEST_HOUR, the weekly summary Friday at 4pm.
   The function must be idempotent (it removes old triggers first).
2. Review every file against the hard rules in CLAUDE.md and list any
   violation you find and fix it.
3. Add a kill switch: Config ENABLED=FALSE makes every trigger exit
   immediately.
4. Write the README: what it does, how to pause it, how to change floors and
   search titles from the Sheet, how to add a company, and what it costs per
   month at the default caps.
5. Set DRY_RUN=FALSE, run once live, and confirm the Log row and the digest.

Done when: triggers are installed, one full live cycle has completed, and
PROGRESS.md says "live" with the date.
```

---

## When something breaks later

```
Read CLAUDE.md and docs/PROGRESS.md. The Job Scout digest reported this
problem: [paste the health section or describe what's wrong].
Find the cause using the Log tab data I'll paste below, fix it with a test
that reproduces it, and update PROGRESS.md. Don't change unrelated code.
[paste recent Log rows]
```
