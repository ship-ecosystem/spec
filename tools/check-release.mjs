#!/usr/bin/env node
// Checks a release against the ship-release contract (docs/release-contract.md):
//
//   node tools/check-release.mjs <release-folder | release.json> [...]
//
// A release.json is checked against schemas/ship-release.schema.json and the rules a schema can't
// express. A folder is checked as a whole: release.json, and the files it describes. Every problem
// is reported, not just the first; the exit code is 1 when there is any. Fields the contract
// doesn't define are allowed (rule 3).

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { parse as parseYaml } from 'yaml';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const schema = JSON.parse(readFileSync(join(root, 'schemas', 'ship-release.schema.json'), 'utf8'));
const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);

/**
 * The rules of the contract a JSON Schema can't express, for a release.json that passed the schema.
 */
export function contractProblems(release) {
  const problems = [];
  const services = new Set(Object.keys(release.services));
  const refs = new Set([...release.images.map((i) => i.ref), ...release.pulledImages.map((i) => i.ref)]);

  const isSorted = (list) => list.every((value, i) => i === 0 || list[i - 1] < value);
  const sortedLists = {
    'env.keys': release.env.keys,
    'env.referenced': release.env.referenced,
    'env.required': release.env.required,
    'requires.networks': release.requires.networks,
    ...(release.deploy ? { 'deploy.needs': release.deploy.needs } : {}),
    ...Object.fromEntries(release.images.map((image, i) => [`images[${i}].services`, image.services])),
    ...Object.fromEntries(release.pulledImages.map((image, i) => [`pulledImages[${i}].services`, image.services])),
    ...Object.fromEntries(Object.entries(release.services).map(([name, s]) => [`services.${name}.volumes`, s.volumes])),
  };
  for (const [field, list] of Object.entries(sortedLists)) {
    if (!isSorted(list)) problems.push(`${field} must be sorted, without duplicates`);
  }

  for (const key of release.env.required) {
    if (!release.env.keys.includes(key)) problems.push(`env.required lists ${key}, which env.keys doesn't (required must be a subset of keys)`);
  }

  for (const [name, service] of Object.entries(release.services)) {
    if (!refs.has(service.image)) problems.push(`services.${name}.image ${service.image} is neither an images[].ref nor a pulledImages[].ref`);
  }

  const mustExist = [
    ...release.images.flatMap((image, i) => image.services.map((s) => [`images[${i}].services`, s])),
    ...release.pulledImages.flatMap((image, i) => image.services.map((s) => [`pulledImages[${i}].services`, s])),
    ...release.http.map((entry, i) => [`http[${i}].service`, entry.service]),
    ...(release.deploy ? [['deploy.service', release.deploy.service], ...release.deploy.needs.map((s) => ['deploy.needs', s])] : []),
  ];
  for (const [field, name] of mustExist) {
    if (!services.has(name)) problems.push(`${field} names ${name}, which isn't in services`);
  }

  for (const [i, image] of release.images.entries()) {
    for (const name of image.services) {
      if (services.has(name) && release.services[name].image !== image.ref) {
        problems.push(`images[${i}] lists ${name}, but services.${name}.image is ${release.services[name].image}`);
      }
    }
  }

  return problems;
}

/**
 * The files a release folder must hold, as release.json describes them.
 */
export function folderProblems(folder, release) {
  const problems = [];
  const file = (relative) => join(folder, relative);

  const composePath = file(release.compose);
  if (!existsSync(composePath)) {
    problems.push(`${release.compose} (compose) is missing`);
  } else {
    const compose = parseYaml(readFileSync(composePath, 'utf8')) ?? {};
    if (compose.name !== release.app) problems.push(`${release.compose}'s top-level name is ${compose.name}, not app (${release.app})`);
    const composeServices = Object.keys(compose.services ?? {}).sort();
    const releaseServices = Object.keys(release.services).sort();
    if (composeServices.join() !== releaseServices.join()) {
      problems.push(`${release.compose}'s services (${composeServices.join(', ')}) aren't release.json's services (${releaseServices.join(', ')})`);
    }
    for (const [name, service] of Object.entries(compose.services ?? {})) {
      if (service.build !== undefined) problems.push(`${release.compose}: ${name} still has build:`);
      if (release.services[name] && service.image !== release.services[name].image) {
        problems.push(`${release.compose}: ${name} runs ${service.image}, but release.json says ${release.services[name].image}`);
      }
    }
  }

  for (const [i, image] of release.images.entries()) {
    const path = file(image.file);
    if (!existsSync(path)) {
      problems.push(`images[${i}].file ${image.file} is missing`);
    } else if (createHash('sha256').update(readFileSync(path)).digest('hex') !== image.sha256) {
      problems.push(`images[${i}].file ${image.file} doesn't match images[${i}].sha256`);
    }
  }

  if (release.env.file !== null && !existsSync(file(release.env.file))) {
    problems.push(`env.file is ${release.env.file}, but that file is missing`);
  }
  if (release.env.file === null && existsSync(file('.env'))) problems.push('env.file is null, but the folder has a .env');

  const script = existsSync(file('deploy-commands.sh'));
  if (release.deploy !== null && !script) problems.push('deploy is set, but deploy-commands.sh is missing');
  if (release.deploy === null && script) problems.push('deploy is null, but the folder has a deploy-commands.sh');

  return problems;
}

/**
 * Every problem with the release at $path (a folder or a release.json).
 */
export function check(path) {
  const isFolder = existsSync(path) && statSync(path).isDirectory();
  const jsonPath = isFolder ? join(path, 'release.json') : path;

  if (!existsSync(jsonPath)) {
    return [isFolder ? 'release.json is missing: the release is incomplete' : `${path} doesn't exist`];
  }

  let release;
  try {
    release = JSON.parse(readFileSync(jsonPath, 'utf8'));
  } catch (error) {
    return [`release.json isn't valid JSON: ${error.message}`];
  }

  if (!validate(release)) {
    return validate.errors.map((e) => `schema: ${e.instancePath || '(root)'} ${e.message}${e.params?.allowedValues ? ` (${e.params.allowedValues.join(', ')})` : ''}`);
  }

  return [...contractProblems(release), ...(isFolder ? folderProblems(path, release) : [])];
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const paths = process.argv.slice(2);

  if (paths.length === 0) {
    console.error('usage: check-release.mjs <release-folder | release.json> [...]');
    process.exit(2);
  }

  let failed = false;
  for (const path of paths) {
    const problems = check(path);
    if (problems.length === 0) {
      console.log(`ok: ${path}`);
    } else {
      failed = true;
      console.log(`FAIL: ${path}`);
      for (const problem of problems) console.log(`  - ${problem}`);
    }
  }

  process.exit(failed ? 1 : 0);
}
