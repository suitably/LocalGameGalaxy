# Workflow: Lokaler Dev-Server mit Docker Compose

## Zweck

Diesen Workflow nutzen, um den Melodiq-Helper-Server **lokal** zu bauen und zu testen, ohne das veröffentlichte Docker-Image von Docker Hub zu verwenden.

## Voraussetzungen

- Docker & Docker Compose installiert
- `config.json` im `server/`-Verzeichnis vorhanden (von `config.example.json` kopieren und anpassen)

## Schritte

### 1. `config.json` prüfen

```bash
cd server/
# Falls noch nicht vorhanden:
cp config.example.json config.json
# Dann Pfade, Token usw. anpassen
```

> [!IMPORTANT]
> Die `directories`-Felder in `config.json` sollten die **Container-Pfade** referenzieren (z. B. `/music/songs`), die über die Volumes in `docker-compose.dev.yml` gemountet werden.

### 2. Dev-Container starten

```bash
cd server/
docker compose -f docker-compose.dev.yml up --build
```

- `--build` sorgt dafür, dass das Image jedes Mal neu gebaut wird.
- Ohne `--build` wird das gecachte Image verwendet.

### 3. Server prüfen

Nach dem Start ist der Server erreichbar unter:
- HTTP: `http://localhost:3000`
- HTTPS (wenn SSL konfiguriert): `https://localhost:3000`

### 4. Container stoppen

```bash
docker compose -f docker-compose.dev.yml down
```

## Unterschiede zur Produktion (`docker-compose.yml`)

| Eigenschaft        | Produktion                   | Dev                          |
|--------------------|------------------------------|------------------------------|
| Image-Quelle       | `nexumia/melodiq-server:latest` (Pull) | Lokaler Build via `Dockerfile` |
| `restart`-Policy   | `always`                     | `no`                         |
| `ALLOWED_ORIGINS`  | `https://nexumia.de,...`     | leer (alle Origins erlaubt)  |
| `NODE_ENV`         | `production`                 | `development`                |
| Container-Name     | `melodiq-server`             | `melodiq-server-dev`         |
