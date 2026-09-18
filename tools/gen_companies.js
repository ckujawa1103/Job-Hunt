#!/usr/bin/env node
/**
 * Regenerates src/companies_seed.js from config/companies.seed.csv.
 *
 * Apps Script cannot read files from the repo at runtime (clasp only pushes
 * src/ and appsscript.json), so the seed list has to live in a .js file. The
 * CSV stays the thing a human edits; this script keeps the .js in sync and CI
 * fails if the two drift apart.
 *
 * Usage: node tools/gen_companies.js [--check]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'config', 'companies.seed.csv');
const OUT_PATH = path.join(ROOT, 'src', 'companies_seed.js');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { quoted = false; }
      else { field += c; }
      continue;
    }
    if (c === '"') { quoted = true; }
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') { field += c; }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter(function (r) { return r.some(function (f) { return f.trim() !== ''; }); });
}

function main() {
  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  const header = rows.shift().map(function (h) { return h.trim(); });
  const expected = ['name', 'lane', 'notes'];
  if (header.join(',') !== expected.join(',')) {
    throw new Error('Unexpected CSV header: ' + header.join(',') + ' (want ' + expected.join(',') + ')');
  }

  const companies = rows.map(function (r) {
    return { name: (r[0] || '').trim(), lane: (r[1] || '').trim(), notes: (r[2] || '').trim() };
  });
  const bad = companies.filter(function (c) { return !c.name || !c.lane; });
  if (bad.length) throw new Error('Rows missing name or lane: ' + JSON.stringify(bad));

  const body = companies.map(function (c) {
    return '  { name: ' + JSON.stringify(c.name) +
      ', lane: ' + JSON.stringify(c.lane) +
      ', notes: ' + JSON.stringify(c.notes) + ' }';
  }).join(',\n');

  const out = [
    '/**',
    ' * Target companies seeded into the Companies tab by setupSheet().',
    ' *',
    ' * GENERATED FILE - do not edit by hand.',
    ' * Source: config/companies.seed.csv',
    ' * Regenerate: node tools/gen_companies.js',
    ' */',
    '',
    '/** @return {Array<{name: string, lane: string, notes: string}>} */',
    'function companiesSeed() {',
    '  return [',
    body.replace(/^ {2}/gm, '    '),
    '  ];',
    '}',
    ''
  ].join('\n');

  if (process.argv.includes('--check')) {
    const current = fs.existsSync(OUT_PATH) ? fs.readFileSync(OUT_PATH, 'utf8') : '';
    if (current !== out) {
      console.error('src/companies_seed.js is out of date. Run: node tools/gen_companies.js');
      process.exit(1);
    }
    console.log('src/companies_seed.js is up to date (' + companies.length + ' companies).');
    return;
  }

  fs.writeFileSync(OUT_PATH, out);
  console.log('Wrote ' + OUT_PATH + ' (' + companies.length + ' companies).');
}

main();
