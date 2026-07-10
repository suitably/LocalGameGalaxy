# Workflow: Local Dev Server with Docker Compose

## Purpose

Use this workflow to build and test the Melodiq helper server **locally**, without pulling the published Docker image from Docker Hub.

## Prerequisites

- Docker & Docker Compose installed
- `config.json` present in the `server/` directory (copy from `config.example.json` and customize)

## Steps

### 1. Verify `config.json`

```bash
cd server/
# If not already present:
cp config.example.json config.json
# Then adjust paths, tokens, etc.
```

> [!IMPORTANT]
> The `directories` fields in `config.json` should reference the container paths (e.g., `/music/songs`) that are mounted via volumes in `docker-compose.dev.yml`.

### 2. Start the Dev Container

```bash
cd server/
docker compose -f docker-compose.dev.yml up --build
```

- `--build` ensures that the image is rebuilt every time.
- Without `--build`, the cached image will be used.

### 3. Check the Server

Once started, the server is accessible at:
- HTTP: `http://localhost:3000`
- HTTPS (if SSL is configured): `https://localhost:3000`

### 4. Stop the Container

```bash
docker compose -f docker-compose.dev.yml down
```

## Differences from Production (`docker-compose.yml`)

| Feature            | Production                   | Dev                          |
|--------------------|------------------------------|------------------------------|
| Image Source       | `nexumia/melodiq-server:latest` (Pull) | Local build via `Dockerfile` |
| `restart` Policy   | `always`                     | `no`                         |
| `ALLOWED_ORIGINS`  | `https://nexumia.de,...`     | Empty (all origins allowed)  |
| `NODE_ENV`         | `production`                 | `development`                |
| Container Name     | `melodiq-server`             | `melodiq-server-dev`         |
