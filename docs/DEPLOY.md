# Deploy

Every push to `main` runs `.github/workflows/deploy.yml`, which checks the code
and then `clasp push`es `src/` and `appsscript.json` into the Apps Script
project. Once the one-time setup below is done you never need a computer again:
edit from Claude Code on your phone, push to `main`, done.

The one-time setup needs a terminal once, for `clasp login`. A GitHub
**Codespace** works from a phone browser, so you do not need a laptop.

---

## 1. Create the Sheet and the bound script (phone, 3 minutes)

1. Open <https://sheets.new> and name the spreadsheet exactly **Job Scout**.
2. **Extensions -> Apps Script**. A bound script project opens.
3. Name the script project **Job Scout** too.
4. **Project Settings** (the gear) -> copy the **Script ID**. It is a long
   string like `1a2B3c...`. Keep it handy; it goes in a repository secret in
   step 3. The script ID is not a secret in the security sense, but keeping it
   out of the repo means there is nothing to edit when you rebuild the Sheet.

## 2. Turn on the Apps Script API (phone, 30 seconds)

Open <https://script.google.com/home/usersettings> and set **Google Apps Script
API** to **On**. `clasp push` fails without this.

## 3. Get the clasp credentials (Codespace, 5 minutes)

1. On GitHub, open this repository -> **Code** -> **Codespaces** -> **Create
   codespace on main**. Wait for the terminal.
2. In the Codespace terminal:

   ```bash
   npm install -g @google/clasp@2.4.2
   clasp login --no-localhost
   ```

3. Open the URL it prints, sign in with the Google account that owns the Sheet,
   allow access, and paste the code back into the terminal.
4. Print the credentials:

   ```bash
   cat ~/.clasprc.json
   ```

5. Copy the whole line of JSON (it starts with `{"token":` or `{"tokens":`).

## 4. Add the two repository secrets (phone or Codespace)

GitHub -> this repository -> **Settings** -> **Secrets and variables** ->
**Actions** -> **New repository secret**:

| Secret | Value |
|---|---|
| `CLASPRC_JSON` | the entire contents of `~/.clasprc.json` from step 3 |
| `SCRIPT_ID` | the Script ID from step 1 |

The workflow writes both to disk at deploy time and deletes them afterwards.
Neither file is ever committed (`.gitignore` blocks both).

## 5. First deploy

Push anything to `main` (or run the **Deploy** workflow by hand from the
Actions tab). Watch the run:

- **Checks** must be green: syntax check, companies-seed drift check, tests.
- **clasp push** should report the files it pushed.

If `clasp push` fails with `User has not enabled the Apps Script API`, redo
step 2. If it fails with an auth error, redo step 3 — the refresh token in
`CLASPRC_JSON` was revoked or replaced.

## 6. Run setup once

1. Back in the Apps Script editor (**Extensions -> Apps Script** from the
   Sheet), reload the page so the pushed files appear.
2. Pick `setupSheet` in the function dropdown and press **Run**.
3. Approve the OAuth consent screen. It is your own script, so click through
   the "Google hasn't verified this app" warning via **Advanced -> Go to Job
   Scout (unsafe)**.
4. The Sheet now has the tabs `Jobs`, `Seen`, `Companies`, `Config` and `Log`,
   with Config filled in and 24 seeded companies at `verified=N`.

`setupSheet()` is safe to run again any time. It adds what is missing and never
overwrites a Config value you have edited, never reorders or removes a column,
and never deletes a row.

## 7. Add the Script Properties

See [SECRETS.md](SECRETS.md). Nothing calls the Claude API until session 5, but
`OWNER_EMAIL` is worth setting now.

---

## Running the tests

- **Locally / in CI:** `node tools/run_tests.js`. This is what the Action runs.
- **In Apps Script:** run `runAllTests` from the editor dropdown and read the
  execution log. Do this after any change that touches a Google service, since
  the local sandbox stubs those out.

`clasp run` (running `runAllTests` from CI) needs a GCP project and an OAuth
client attached to the script; it is not set up. Until it is, the Action's gate
is the local harness, and Apps-Script-level checks are run by hand from the
editor.

## Changing things without a deploy

Floors, caps, models, search titles, the digest hour and the kill switch all
live in the **Config** tab. Edit them in the Google Sheets app on your phone;
the next run picks them up. Only code changes need a push.
