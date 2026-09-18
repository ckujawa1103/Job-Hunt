/**
 * One-time (and safely repeatable) setup for the bound "Job Scout" spreadsheet.
 *
 * Run setupSheet() from the Apps Script editor after the project is pushed.
 * It creates the Jobs, Seen, Companies, Config and Log tabs, seeds Config with
 * defaults and seeds Companies from config/companies.seed.csv with verified=N.
 *
 * It is idempotent by construction:
 *   - existing tabs are kept, never recreated;
 *   - missing header columns are appended on the right, existing ones are
 *     never reordered, renamed or removed;
 *   - existing Config values are left alone (edits in the Sheet survive);
 *   - a company already listed by name is left alone;
 *   - no row is ever deleted (hard rule 6 in CLAUDE.md).
 */

/** Column headers for every tab, in order. */
function sheetSpecs_() {
  return [
    {
      name: 'Jobs',
      // The authoritative Posting/Jobs column list moves to src/schema.js in
      // session 1; until then this is it. New columns may be appended here and
      // setupSheet() will add them to an existing tab without touching data.
      headers: [
        'dedupe_key', 'first_seen_at', 'source', 'source_id', 'title', 'company',
        'location', 'remote', 'url', 'posted_at', 'pay_text', 'lane',
        'triage_score', 'triage_reason', 'fit_score', 'verdict',
        'where_he_would_live', 'floor_used', 'pay', 'pay_is_estimate',
        'pay_meets_floor', 'why', 'strengths', 'gaps', 'red_flags',
        'resume_bullets', 'opener', 'status', 'scored_at', 'digest_sent_at',
        'error', 'notes'
      ]
    },
    {
      name: 'Seen',
      headers: ['dedupe_key', 'first_seen_at', 'last_seen_at', 'source', 'url']
    },
    {
      name: 'Companies',
      headers: ['name', 'lane', 'ats', 'token', 'verified', 'notes', 'last_checked_at']
    },
    {
      name: 'Config',
      headers: ['key', 'value', 'notes']
    },
    {
      name: 'Log',
      headers: [
        'run_id', 'started_at', 'ended_at', 'status', 'source_counts',
        'collected', 'new', 'prefiltered', 'triaged', 'deep_scored',
        'jobs_added', 'fetches', 'claude_calls', 'est_cost_usd', 'errors', 'notes'
      ]
    }
  ];
}

/**
 * Every Config key the project reads, with its default and a short note.
 * Values are stored as strings; readers coerce them (src/config.js, session 1).
 */
function configDefaults_() {
  return [
    // Master switches
    { key: 'ENABLED', value: 'TRUE', notes: 'Kill switch. FALSE makes every trigger exit immediately.' },
    { key: 'DRY_RUN', value: 'TRUE', notes: 'TRUE uses fixtures from test/fixtures and sends no live email.' },

    // Pay floors (see CLAUDE.md "Pay floors")
    { key: 'FLOOR_IL', value: '75000', notes: 'Base salary floor for Illinois Valley or remote-while-living-there. Every other floor derives from this.' },
    { key: 'FLOOR_MULT_SUFFOLK', value: '1.6', notes: 'FLOOR_IL x this = Suffolk County / eastern Long Island floor.' },
    { key: 'FLOOR_MULT_NASSAU_NYC', value: '1.95', notes: 'FLOOR_IL x this = Nassau County or NYC floor.' },
    { key: 'COL_INDEX_HOME', value: '84', notes: "Streator's cost-of-living index (US average 100). Elsewhere in NY: FLOOR_IL x (area index / this)." },

    // Filters
    { key: 'MAX_AGE_DAYS', value: '14', notes: 'Drop postings older than this many days.' },
    { key: 'EXCLUDE_TITLE_TERMS', value: 'intern,internship,unpaid,commission only,1099,door to door,senior software engineer,staff engineer,principal engineer,.net,java developer,c++,devops,sre,security engineer,data engineer,nurse,cdl,driver,warehouse associate', notes: 'Comma separated. A title containing any of these is dropped before any AI call.' },
    { key: 'COMMUTE_ORIGIN', value: 'Streator, IL', notes: 'Centre of the Illinois Valley commute radius.' },
    { key: 'COMMUTE_RADIUS_MILES', value: '50', notes: 'Illinois Valley commute radius used by the location pre-filter and Adzuna searches.' },

    // Scoring
    { key: 'TRIAGE_MODEL', value: 'claude-haiku-4-5-20251001', notes: 'Cheap model for the 0-100 relevance pass.' },
    { key: 'DEEP_MODEL', value: 'claude-sonnet-5', notes: 'Strong model for full scoring of finalists.' },
    { key: 'TRIAGE_CUTOFF', value: '60', notes: 'Minimum triage score to continue to deep scoring.' },
    { key: 'MAX_TRIAGE_PER_DAY', value: '150', notes: 'Hard cap on triage calls per day (Central). Hitting it skips the rest and is reported in the digest.' },
    { key: 'MAX_DEEP_PER_DAY', value: '25', notes: 'Hard cap on deep-scoring calls per day (Central).' },

    // Search titles per lane (edit here, no deploy needed)
    { key: 'SEARCH_TITLES_AUTO', value: 'AI Automation Engineer,AI Automation Specialist,Workflow Automation Engineer,AI Operations Specialist,Revenue Operations Analyst,Business Systems Analyst,AI Solutions Specialist', notes: 'Lane auto: AI and workflow automation.' },
    { key: 'SEARCH_TITLES_DMS', value: 'Implementation Specialist,Implementation Consultant,Customer Success Manager,Solutions Consultant,Sales Engineer,Dealer Onboarding Specialist', notes: 'Lane dms: dealer-software implementation, success and solutions.' },
    { key: 'SEARCH_TITLES_OEM', value: 'Territory Sales Manager,Dealer Development Manager,Dealer Support Specialist,Warranty Administrator', notes: 'Lane oem: manufacturer dealer-facing roles.' },
    { key: 'SEARCH_TITLES_OPS', value: 'Service Manager,Fixed Operations Director,Operations Manager', notes: 'Lane ops: tech-forward operations and service leadership.' },

    // Digest
    { key: 'DIGEST_HOUR', value: '7', notes: 'Hour (0-23, America/Chicago) the morning digest is sent.' },
    { key: 'SEND_EMPTY_DIGEST', value: 'FALSE', notes: 'TRUE sends a short "nothing today" email when nothing qualifies.' }
  ];
}

/**
 * Creates or repairs every tab, then seeds Config and Companies.
 * Safe to run any number of times.
 * @return {string} A short human-readable summary, also written to the log.
 */
function setupSheet() {
  var ss = SpreadsheetApp.getActive();
  if (!ss) {
    throw new Error('setupSheet() must run from the script bound to the Job Scout spreadsheet.');
  }

  var notes = [];
  sheetSpecs_().forEach(function (spec) {
    notes.push(ensureSheet_(ss, spec.name, spec.headers));
  });
  notes.push(seedConfig_(ss));
  notes.push(seedCompanies_(ss));

  var summary = notes.join('\n');
  Logger.log(summary);
  return summary;
}

/**
 * Creates the tab if missing and makes sure every required header exists.
 * Existing headers keep their position; missing ones are appended on the right.
 * @return {string}
 */
function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  var created = false;
  if (!sheet) {
    sheet = ss.insertSheet(name);
    created = true;
  }

  var width = Math.max(sheet.getLastColumn(), 1);
  var existing = sheet.getLastRow() >= 1
    ? sheet.getRange(1, 1, 1, width).getValues()[0].map(function (v) { return String(v).trim(); })
    : [];
  var merged = mergeHeaders_(existing, headers);

  var added = merged.length - existing.filter(function (h) { return h !== ''; }).length;
  if (merged.length > sheet.getMaxColumns()) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), merged.length - sheet.getMaxColumns());
  }
  sheet.getRange(1, 1, 1, merged.length).setValues([merged]).setFontWeight('bold');
  if (sheet.getFrozenRows() < 1) sheet.setFrozenRows(1);

  return name + ': ' + (created ? 'created' : 'present') +
    (added > 0 ? ', ' + added + ' header column(s) added' : ', headers ok');
}

/**
 * Pure helper: the header row that should be written, given what is already
 * there. Existing non-empty headers keep their exact position; required
 * headers that are missing are appended in order. Nothing is ever dropped.
 * @param {Array<string>} existing
 * @param {Array<string>} required
 * @return {Array<string>}
 */
function mergeHeaders_(existing, required) {
  var out = (existing || []).map(function (h) { return String(h).trim(); });
  while (out.length && out[out.length - 1] === '') out.pop();

  var have = {};
  out.forEach(function (h) { if (h) have[h.toLowerCase()] = true; });

  (required || []).forEach(function (h) {
    if (!have[String(h).toLowerCase()]) {
      out.push(h);
      have[String(h).toLowerCase()] = true;
    }
  });
  return out;
}

/**
 * Adds any Config key that is missing. Never overwrites a value already in the
 * Sheet, so hand edits survive a re-run.
 * @return {string}
 */
function seedConfig_(ss) {
  var sheet = ss.getSheetByName('Config');
  var existing = {};
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 1).getValues().forEach(function (r) {
      var k = String(r[0]).trim();
      if (k) existing[k] = true;
    });
  }

  var toAdd = configDefaults_().filter(function (d) { return !existing[d.key]; });
  if (toAdd.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, toAdd.length, 3).setValues(
      toAdd.map(function (d) { return [d.key, d.value, d.notes]; })
    );
  }
  return 'Config: ' + toAdd.length + ' key(s) added, ' +
    Object.keys(existing).length + ' left as-is';
}

/**
 * Adds any seed company not already listed (matched on lower-cased name).
 * New rows get verified=N so session 2's verifyCompanies() picks them up.
 * @return {string}
 */
function seedCompanies_(ss) {
  var sheet = ss.getSheetByName('Companies');
  var existing = {};
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 1).getValues().forEach(function (r) {
      var n = String(r[0]).trim().toLowerCase();
      if (n) existing[n] = true;
    });
  }

  var toAdd = companiesSeed().filter(function (c) {
    return !existing[c.name.toLowerCase()];
  });
  if (toAdd.length) {
    // name, lane, ats, token, verified, notes, last_checked_at
    sheet.getRange(sheet.getLastRow() + 1, 1, toAdd.length, 7).setValues(
      toAdd.map(function (c) { return [c.name, c.lane, '', '', 'N', c.notes, '']; })
    );
  }
  return 'Companies: ' + toAdd.length + ' added, ' +
    Object.keys(existing).length + ' already present';
}
