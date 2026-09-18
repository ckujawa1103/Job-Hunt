#!/usr/bin/env node
/**
 * Runs the project's test_* functions locally, without Apps Script.
 *
 * Every file in src/ is loaded into one V8 sandbox (the same flat global
 * namespace Apps Script uses) with thin stubs for the Apps Script services, and
 * then runAllTests() is called. Tests that need a real Spreadsheet, Gmail or a
 * network call are not run here - keep those behind DRY_RUN with fixtures.
 *
 * Usage: node tools/run_tests.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', 'src');

function srcFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(function (entry) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return srcFiles(full);
    return entry.name.endsWith('.js') ? [full] : [];
  }).sort();
}

const logs = [];
const notAvailable = function (name) {
  return new Proxy({}, {
    get: function () {
      throw new Error(name + ' is not available in the local test sandbox. ' +
        'Put anything that needs it behind DRY_RUN with a fixture.');
    }
  });
};

const sandbox = {
  Logger: { log: function (msg) { logs.push(String(msg)); } },
  console: console,
  JSON: JSON,
  Math: Math,
  Date: Date,
  SpreadsheetApp: notAvailable('SpreadsheetApp'),
  GmailApp: notAvailable('GmailApp'),
  MailApp: notAvailable('MailApp'),
  UrlFetchApp: notAvailable('UrlFetchApp'),
  PropertiesService: notAvailable('PropertiesService'),
  LockService: notAvailable('LockService'),
  ScriptApp: notAvailable('ScriptApp'),
  Utilities: notAvailable('Utilities')
};
vm.createContext(sandbox);

const files = srcFiles(SRC);
files.forEach(function (file) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
});

if (typeof sandbox.runAllTests !== 'function') {
  console.error('runAllTests() not found in src/.');
  process.exit(1);
}

try {
  const summary = sandbox.runAllTests();
  console.log('Loaded ' + files.length + ' file(s) from src/.');
  console.log(summary);
} catch (err) {
  console.error('Loaded ' + files.length + ' file(s) from src/.');
  console.error(err.message);
  process.exit(1);
}
