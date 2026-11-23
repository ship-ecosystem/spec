#!/bin/sh
set -eu
cd "$(dirname "$0")"
docker compose up -d --wait postgres
docker compose run --rm --no-deps -T app python migrate.py ''
