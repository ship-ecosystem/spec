# Ship ecosystem specification

[![CI](https://github.com/ship-ecosystem/spec/actions/workflows/ci.yml/badge.svg)](https://github.com/ship-ecosystem/spec/actions/workflows/ci.yml)

The shared contracts of the Ship ecosystem, in one place. Producers
([PHP Ship](https://github.com/ship-ecosystem/php-ship),
[Python Ship](https://github.com/ship-ecosystem/python-ship), and others) write
them; deployment tools and editors read them. This repository is the source of
truth: when a producer and this repository disagree, this repository is right.

| Contract | Document | Schema | Status |
|---|---|---|---|
| `ship.json`, a project's configuration | the schema's descriptions | [`schemas/ship.schema.json`](schemas/ship.schema.json) | stable |
| `ship-release`, a release folder and its `release.json` | [`docs/release-contract.md`](docs/release-contract.md) | [`schemas/ship-release.schema.json`](schemas/ship-release.schema.json) | draft |

The release contract is a draft until a release has been deployed end to end
by a deployment tool on a real project. Until then it can still be corrected;
afterwards it only grows (see its rules).

## Checking a release

[`tools/check-release.mjs`](tools/check-release.mjs) checks a release against
the schema **and** the rules a schema can't express: settings marked required
are listed, every service's image is one the release ships or pins, every
service the release refers to exists, lists are sorted. Given a folder, it also
checks the files: `release.json` is present (otherwise the release is
incomplete), the archives match their checksums, and the compose file matches
`release.json`. Fields it doesn't know are allowed, as the contract requires.

```sh
npm ci
node tools/check-release.mjs dist/ship/1.0.0          # a release folder
node tools/check-release.mjs path/to/release.json     # just the manifest
node tools/check-ship-json.mjs ship.json              # a project's ship.json
```

In GitHub Actions, one step checks the release a producer just built:

```yaml
- uses: ship-ecosystem/spec@<commit>
  with:
    path: dist/ship/ci-test
```

## Examples

`examples/` holds releases every producer and consumer can test against:

- [`examples/valid/`](examples/valid) — complete release folders written by PHP
  Ship's release writer (only Docker was stood in: the archives are small
  placeholders with real checksums). Laravel behind nginx with a worker,
  Reverb, a deploy command and an external network; Laravel on Octane released
  with `--no-env`; Symfony with Centrifugo, Valkey and Typesense.
- [`examples/valid-json/`](examples/valid-json) — a `release.json` with fields a
  later contract might add, which readers must accept.
- [`examples/invalid/`](examples/invalid) — one defect each, with the problem it
  must be reported for in `expected.txt`.
- [`examples/ship-json/`](examples/ship-json) — `ship.json` files that must pass
  and fail.

`npm test` checks that every example behaves as stated; CI runs it on every
change, and checks that the action passes a valid release and fails an invalid
one.

## For producers

A producer (a package that writes `ship.json` or releases):

1. Keeps a copy of the schemas it validates against, so its own tests run
   offline, and checks in CI that the copy is identical to this repository's.
   A change to a contract lands here first; the drift check then fails until
   the producer syncs.
2. Runs the action on a release it really builds, in CI.
3. Writes `$schema`/`$id` URLs that point here, e.g.
   `https://raw.githubusercontent.com/ship-ecosystem/spec/main/schemas/ship.schema.json`.

## For consumers

A deployment tool or any other reader validates `release.json` against
`schemas/ship-release.schema.json`, follows `docs/release-contract.md` for what
each field means and what a missing or unknown value means, and tests itself
against `examples/`.

## Changing a contract

Open a pull request here first, with the change to the document, the schema
and the examples together, and `npm test` passing. The release contract's rules
decide what kind of change is allowed; until it is frozen, corrections are.
