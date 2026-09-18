# Secrets

Nothing secret belongs in this repository. Two places hold credentials:

- **Apps Script Script Properties** — everything the running bot needs.
- **GitHub Actions repository secrets** — only what the deploy needs
  (`CLASPRC_JSON`, `SCRIPT_ID`; see [DEPLOY.md](DEPLOY.md)).

The repository itself must stay **private**: `config/profile.md` is resume
content.

## Script Properties

Set them in the Apps Script editor: **Project Settings** (gear) -> **Script
Properties** -> **Add script property**. They are per-script, not per-user, and
are not visible to anyone who only has the Sheet.

| Property | Needed by | Where to get it |
|---|---|---|
| `OWNER_EMAIL` | the digest (session 6) | Your own address. The **only** address this project ever emails. |
| `ANTHROPIC_API_KEY` | scoring (session 5) | <https://console.anthropic.com> -> **API keys** -> **Create key**. Starts with `sk-ant-`. Set a monthly spend limit on the account while you are there. |
| `ADZUNA_APP_ID` | the Adzuna source (session 3) | <https://developer.adzuna.com> -> sign up -> the app ID shown for your app. |
| `ADZUNA_APP_KEY` | the Adzuna source (session 3) | Same page as the app ID. |

Only `OWNER_EMAIL` is worth setting today. Add the others at the start of the
session that needs them.

## Rules

- Never paste a key into a file under `src/`, `config/` or `docs/`, into a
  commit message, or into the Sheet. The Sheet is shareable; Script Properties
  are not.
- Read them with `PropertiesService.getScriptProperties().getProperty(name)`.
  Never log the value — log whether it was present.
- Code must fail loudly with a clear message when a property is missing, rather
  than half-running.
- If a key leaks, rotate it at the provider first, then update the Script
  Property. There is nothing to clean up in git as long as the rules above held.
- `.clasp.json` and `.clasprc.json` are git-ignored. `.clasprc.json` contains a
  Google refresh token for your account — treat it like a password. If it
  leaks, run `clasp logout` and revoke access at
  <https://myaccount.google.com/permissions>, then redo step 3 of DEPLOY.md.
