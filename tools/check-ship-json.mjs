#!/usr/bin/env node
// Checks ship.json files against schemas/ship.schema.json:
//
//   node tools/check-ship-json.mjs <ship.json> [...]
//
// Every problem is reported; the exit code is 1 when there is any.

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const validate = new Ajv2020({ allErrors: true, strict: false }).compile(
  JSON.parse(readFileSync(join(root, 'schemas', 'ship.schema.json'), 'utf8')),
);

export function checkShipJson(path) {
  let config;
  try {
    config = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    return [`${path} isn't valid JSON: ${error.message}`];
  }

  return validate(config) ? [] : validate.errors.map((e) => `schema: ${e.instancePath || '(root)'} ${e.message}`);
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const paths = process.argv.slice(2);
  if (paths.length === 0) {
    console.error('usage: check-ship-json.mjs <ship.json> [...]');
    process.exit(2);
  }

  let failed = false;
  for (const path of paths) {
    const problems = checkShipJson(path);
    console.log(problems.length === 0 ? `ok: ${path}` : `FAIL: ${path}\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    failed ||= problems.length > 0;
  }
  process.exit(failed ? 1 : 0);
}
