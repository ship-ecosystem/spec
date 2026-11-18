# shop 1.0.0

Built by php-ship/ship dev-main for linux/amd64.
release.json describes this release; see the ship-release contract.

## Deploy

On a server with Docker, from this folder:

```sh
docker load -i images/app.tar
docker compose up -d
```

## Secrets

This release has no `.env` (`ship release --no-env`). Before running the steps, provide every
variable in release.json's `env.referenced` to Compose and every one in `env.keys` to the app,
e.g. by writing a `.env` file here.
