#!/bin/sh
set -eu
cd "$(dirname "$0")"
docker compose up -d --wait 'redis'
docker compose run --rm --no-deps -T 'app' 'npm' 'run' 'db:migrate'
