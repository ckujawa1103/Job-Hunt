/**
 * Test harness. Tests are plain functions named test_* anywhere in src/.
 *
 * Run them from the Apps Script editor (runAllTests) or locally with
 * `node tools/run_tests.js`, which loads src/ into a sandbox with stubs for the
 * Apps Script services. Anything that needs a real Spreadsheet, Gmail or a
 * network call belongs behind DRY_RUN with fixtures, not in a test_* function.
 */

/**
 * Runs every test_* function in the project.
 * @return {string} A summary. Throws if any test failed, so a deploy gate can
 *     rely on it.
 */
function runAllTests() {
  var names = Object.keys(globalThis).filter(function (k) {
    return k.indexOf('test_') === 0 && typeof globalThis[k] === 'function';
  }).sort();

  var failures = [];
  names.forEach(function (name) {
    try {
      globalThis[name]();
    } catch (err) {
      failures.push(name + ': ' + (err && err.message ? err.message : err));
    }
  });

  var summary = names.length + ' test(s), ' + failures.length + ' failed' +
    (failures.length ? '\n  ' + failures.join('\n  ') : '');
  Logger.log(summary);
  if (failures.length) throw new Error(summary);
  return summary;
}

function assertTrue_(cond, message) {
  if (!cond) throw new Error(message || 'expected true');
}

function assertEquals_(actual, expected, message) {
  var a = JSON.stringify(actual);
  var e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error((message ? message + ': ' : '') + 'expected ' + e + ', got ' + a);
  }
}

// --- tests ------------------------------------------------------------------

function test_smoke() {
  assertEquals_(1 + 1, 2, 'arithmetic still works');
  assertTrue_(typeof setupSheet === 'function', 'setupSheet is defined');
}

function test_sheetSpecsAreWellFormed() {
  var specs = sheetSpecs_();
  assertEquals_(specs.map(function (s) { return s.name; }),
    ['Jobs', 'Seen', 'Companies', 'Config', 'Log'], 'tab names');

  specs.forEach(function (spec) {
    assertTrue_(spec.headers.length > 0, spec.name + ' has headers');
    var seen = {};
    spec.headers.forEach(function (h) {
      assertTrue_(String(h).trim() !== '', spec.name + ' has no blank header');
      assertTrue_(!seen[h], spec.name + ' header ' + h + ' is not duplicated');
      seen[h] = true;
    });
  });
}

function test_configDefaultsAreUniqueAndFilled() {
  var seen = {};
  configDefaults_().forEach(function (d) {
    assertTrue_(/^[A-Z0-9_]+$/.test(d.key), 'config key ' + d.key + ' is SCREAMING_SNAKE');
    assertTrue_(!seen[d.key], 'config key ' + d.key + ' appears once');
    seen[d.key] = true;
    assertTrue_(String(d.value).trim() !== '', d.key + ' has a default value');
    assertTrue_(String(d.notes).trim() !== '', d.key + ' has a note');
  });

  // The keys CLAUDE.md names by hand must all exist.
  ['FLOOR_IL', 'TRIAGE_CUTOFF', 'MAX_TRIAGE_PER_DAY', 'MAX_DEEP_PER_DAY',
    'MAX_AGE_DAYS', 'DRY_RUN', 'TRIAGE_MODEL', 'DEEP_MODEL',
    'EXCLUDE_TITLE_TERMS', 'DIGEST_HOUR'].forEach(function (key) {
      assertTrue_(!!seen[key], 'Config seeds ' + key);
    });
}

function test_mergeHeadersAppendsOnlyMissing() {
  // Fresh tab.
  assertEquals_(mergeHeaders_([], ['a', 'b']), ['a', 'b'], 'empty tab');

  // Existing headers keep their order; missing ones are appended.
  assertEquals_(mergeHeaders_(['b', 'a'], ['a', 'b', 'c']), ['b', 'a', 'c'], 'append only');

  // A column the Sheet has but the code no longer requires is never dropped.
  assertEquals_(mergeHeaders_(['a', 'mine'], ['a']), ['a', 'mine'], 'keep unknown columns');

  // Trailing blanks are ignored, matching is case-insensitive.
  assertEquals_(mergeHeaders_(['A', '', ''], ['a', 'b']), ['A', 'b'], 'blanks and case');

  // Idempotent: merging the result again changes nothing.
  var once = mergeHeaders_(['a'], ['a', 'b', 'c']);
  assertEquals_(mergeHeaders_(once, ['a', 'b', 'c']), once, 'idempotent');
}

function test_companiesSeedMatchesLanes() {
  var lanes = { auto: true, dms: true, oem: true, ops: true };
  var seen = {};
  var seed = companiesSeed();
  assertTrue_(seed.length > 0, 'seed is not empty');
  seed.forEach(function (c) {
    assertTrue_(c.name.trim() !== '', 'company has a name');
    assertTrue_(!!lanes[c.lane], c.name + ' lane "' + c.lane + '" is one of auto/dms/oem/ops');
    assertTrue_(!seen[c.name.toLowerCase()], c.name + ' appears once');
    seen[c.name.toLowerCase()] = true;
  });
}
