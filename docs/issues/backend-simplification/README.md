# MelodiQ Backend Simplification

> **Ziel**: Das MelodiQ-Backend wird vereinfacht. Die separate Admin-UI wird entfernt, alle Verwaltungsfunktionen wandern ins React-Frontend. Unnötige Features werden entfernt. Der Express-Server wird zu Hono migriert und als Docker One-Click-Image bereitgestellt.

## Phasen & Issues

### Phase 1 — Cleanup (parallel bearbeitbar)

| # | Issue | Beschreibung |
|:---:|:---|:---|
| 1 | [Remove Auto-Sync](01-remove-auto-sync.md) | Silence Detection für GAP-Berechnung entfernen |
| 2 | [Remove VAPID Web Push](02-remove-vapid-web-push.md) | Server-seitigen VAPID Push Service entfernen |
| 3 | [Remove SSL Generator](03-remove-ssl-generator.md) | Self-signed Zertifikat-Generierung entfernen |
| 4 | [Remove Admin UI](04-remove-admin-ui.md) | `public/index.html` Admin-Oberfläche entfernen |
| 5 | [Move GuessArt Publisher](05-move-guessart-publisher.md) | Catalogue Publisher direkt via GitHub API im Frontend |
| 6 | [Simplify Auth](06-simplify-auth.md) | Rate Limiting entfernen, Auth vereinfachen |

### Phase 2 — Migration (nach Phase 1)

| # | Issue | Beschreibung |
|:---:|:---|:---|
| 7 | [Express → Hono Migration](07-express-to-hono-migration.md) | Gesamten Express-Server zu Hono TypeScript migrieren |

### Phase 3 — Frontend Integration (parallel zu/nach Phase 2)

| # | Issue | Beschreibung |
|:---:|:---|:---|
| 8 | [Frontend Config UI](08-frontend-config-ui.md) | Server-Config-Verwaltung ins React-Frontend |
| 9 | [Fix Video Dual-Path](09-fix-video-dual-path.md) | YouTube Embed + lokale Video-Dateien reparieren |

### Phase 4 — Neue Features (nach Phase 2)

| # | Issue | Beschreibung |
|:---:|:---|:---|
| 10 | [File System Access Lite-Modus](10-file-system-access-lite-mode.md) | Browser-only Modus ohne Server |
| 11 | [Dockerfile & Docker Compose](11-dockerfile-docker-compose.md) | One-Click Docker Deployment |

## Abhängigkeiten

```
#1 ─┐
#2 ─┤
#3 ─┼── alle parallel ──► #7 (Hono Migration) ──► #11 (Docker)
#4 ─┤
#5 ─┤
#6 ─┘

#8 (Frontend Config) ── parallel zu #7, #9, #10
#9 (Video Fix)       ── parallel zu #7, #8, #10
#10 (Lite-Modus)     ── unabhängig
```
