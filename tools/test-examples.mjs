#!/usr/bin/env node
// The spec's own test: every example under examples/valid* passes the checker, and every one under
// examples/invalid fails with the problem its expected.txt names (so it fails for the right
// reason). An example named folder-* is checked as a release folder, any other as its release.json.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { check } from './check-release.mjs';
import { checkShipJson } from './check-ship-json.mjs';

const examples = (dir) => readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => join(dir, e.name));
const target = (dir) => (dir.split('/').pop().startsWith('folder-') || dir.includes('examples/valid/') ? dir : join(dir, 'release.json'));

let failed = 0;

for (const dir of [...examples('examples/valid'), ...examples('examples/valid-json')]) {
  const problems = check(target(dir));
  if (problems.length === 0) {
    console.log(`ok    ${dir} passes`);
  } else {
    failed++;
    console.log(`FAIL  ${dir} should pass:\n${problems.map((p) => `        - ${p}`).join('\n')}`);
  }
}

for (const dir of examples('examples/invalid')) {
  const expected = readFileSync(join(dir, 'expected.txt'), 'utf8').trim();
  const problems = check(target(dir));
  if (problems.some((p) => p.includes(expected))) {
    console.log(`ok    ${dir} fails: ${expected}`);
  } else {
    failed++;
    console.log(`FAIL  ${dir} should fail with "${expected}", got:\n${problems.map((p) => `        - ${p}`).join('\n') || '        (no problems)'}`);
  }
}

const jsonFiles = (dir) => readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => join(dir, f));

for (const file of jsonFiles('examples/ship-json/valid')) {
  const problems = checkShipJson(file);
  if (problems.length === 0) {
    console.log(`ok    ${file} passes`);
  } else {
    failed++;
    console.log(`FAIL  ${file} should pass:\n${problems.map((p) => `        - ${p}`).join('\n')}`);
  }
}

for (const file of jsonFiles('examples/ship-json/invalid')) {
  const expected = readFileSync(file.replace(/\.json$/, '.expected.txt'), 'utf8').trim();
  const problems = checkShipJson(file);
  if (problems.some((p) => p.includes(expected))) {
    console.log(`ok    ${file} fails: ${expected}`);
  } else {
    failed++;
    console.log(`FAIL  ${file} should fail with "${expected}", got:\n${problems.map((p) => `        - ${p}`).join('\n') || '        (no problems)'}`);
  }
}

console.log(failed === 0 ? '\nall examples behave as expected' : `\n${failed} example(s) misbehaved`);
process.exit(failed === 0 ? 0 : 1);
