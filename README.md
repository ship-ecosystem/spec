# Ship ecosystem specification

[![CI](https://github.com/ship-ecosystem/spec/actions/workflows/ci.yml/badge.svg)](https://github.com/ship-ecosystem/spec/actions/workflows/ci.yml)

This repository defines the shared Ship contracts. Producers
([PHP Ship](https://github.com/ship-ecosystem/php-ship),
[JavaScript Ship](https://github.com/ship-ecosystem/js-ship), and
[Python Ship](https://github.com/ship-ecosystem/python-ship)) implement them.
Deployment tools and editors consume them.

| Contract | Document | Schema | Status |
|---|---|---|---|
| `ship.json`, a project's configuration | the schema's descriptions | [`schemas/ship.schema.json`](schemas/ship.schema.json) | stable |
| `ship-release`, a release folder and its `release.json` | [`docs/release-contract.md`](docs/release-contract.md) | [`schemas/ship-release.schema.json`](schemas/ship-release.schema.json) | draft |
| Shared service connection variables | [Service environment](docs/service-environment.md) | [`contracts/service-environment.json`](contracts/service-environment.json) | stable |

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

- [`examples/valid/`](examples/valid) — complete release folders written by
  the PHP, JavaScript and Python producers. Docker is mocked, so the archives
  are small placeholders with real checksums. The examples cover PHP with
  nginx and Octane, Node.js, and Python ASGI, including HTTP processes,
  deploy commands, external networks, and releases without bundled settings.
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

1. Keeps offline copies of the configuration and release schemas and the
   shared service environment catalog. CI compares the copies against the spec.
2. Runs the action on a release it really builds, in CI.
3. Writes `$schema`/`$id` URLs that point here, e.g.
   `https://raw.githubusercontent.com/ship-ecosystem/spec/main/schemas/ship.schema.json`.

Producer profiles can enforce framework and runtime restrictions in addition to
the shared schema. Command argument lists require a nonempty executable and can
contain empty subsequent arguments.

## For consumers

A deployment tool or any other reader validates `release.json` against
`schemas/ship-release.schema.json`, follows `docs/release-contract.md` for what
each field means and what a missing or unknown value means, and tests itself
against `examples/`.

## Changing a contract

Open a pull request here first and update the affected documentation, schemas,
and examples together. Run `npm test`. The [release contract rules](docs/release-contract.md#rules)
define the compatibility requirements for release format changes.
