# chat 1.0.0

Built by php-ship/ship dev-main for linux/amd64.
release.json describes this release; see the ship-release contract.

## Deploy

On a server with Docker, from this folder:

```sh
docker network create proxy  # only if it does not exist yet
docker load -i images/app.tar
docker load -i images/webserver.tar
docker compose up -d
```

## Secrets

`.env` holds this release's production secrets (a copy of `.env.production`). Keep it private
and don't commit or share it.
