# Remove VAPID Web Push from Melodiq Server

## Context

Das MelodiQ-Backend enthält einen vollständigen VAPID Web Push Service. Dieser wird nicht mehr benötigt — ntfy (direkt vom Browser an `ntfy.sh`) und native Push (Google/Apple) reichen aus. Der Push-Code im **Frontend** (`src/lib/push/`, `src/components/push/`) ist **shared** über alle Spiele und wird **nicht** entfernt — nur die Server-seitige VAPID-Implementierung und die Frontend-Referenzen auf den MelodiQ-Server als Push-Relay.

## Aufgabe

Entferne den VAPID Web Push Service aus dem MelodiQ-Backend. Stelle sicher, dass die Frontend-Push-Logik weiterhin mit ntfy und dem separaten Cloudflare Push Relay funktioniert.

## Betroffene Dateien

### Backend — Entfernen

- **`server/src/services/webPushService.js`** → **gesamte Datei löschen**
  - Enthält: `web-push` Integration, VAPID key management, subscription persistence zu `.push_subscriptions.json`, notification dispatch, ntfy bridge
- **`server/src/controllers/pushController.js`** → **gesamte Datei löschen**
  - Enthält: `getVapidPublicKey`, `subscribePush`, `unsubscribePush`, `notifyPush`
- **`server/src/routes/push.js`** → **gesamte Datei löschen**
  - Enthält: `GET /vapid-public-key`, `POST /subscribe`, `POST /unsubscribe`, `POST /notify`
- **`server/src/routes/index.js`**
  - **Line 9**: Push Router Import → entfernen
  - **Line 14**: `router.use('/api/push', pushRouter)` → entfernen
- **`server/package.json`**
  - **Line 40**: Dependency `"web-push": "^3.6.7"` → entfernen

Runtime-Dateien (nicht im Repo, aber werden nicht mehr erzeugt):
- `server/.push_subscriptions.json`
- `server/.vapid_keys.json`

### Frontend — Anpassen (nicht löschen!)

- **`src/lib/push/gameRelayStorage.ts`**
  - **Lines 78–85**: Fallback #3 nutzt den MelodiQ Helper Server als Push-Relay (`storage.isHelperActive()`, `storage.getHelperUrl()`). Diesen Fallback entfernen, da der MelodiQ-Server keine Push-Endpoints mehr hat.
- **`src/components/push/NotificationSettings.tsx`**
  - **Lines 98–107, 156–165**: Button "Verbundenen Server übernehmen (1-Klick)" (`handleUseConnectedServer`) — entfernen, da der MelodiQ-Server keine Push-Endpoints mehr anbietet.

## ⚠️ Nicht anfassen

- `server/cloudflare-push-relay/` — eigenständiger Cloudflare Worker Push Relay, bleibt
- `src/lib/push/` — generelle Push-Infrastruktur (ntfy, Cloudflare Relay), bleibt
- `src/components/push/PushNotificationBanner.tsx` — bleibt (nutzt generische Push-Infrastruktur)

## Akzeptanzkriterien

- [ ] Keine `web-push` Dependency mehr in `server/package.json`
- [ ] Keine `/api/push/*` Endpoints mehr im Server
- [ ] Dateien `webPushService.js`, `pushController.js`, `routes/push.js` existieren nicht mehr
- [ ] Frontend ntfy Push funktioniert weiterhin
- [ ] Frontend Cloudflare Push Relay funktioniert weiterhin
- [ ] `npm run lint` und `npm run build` fehlerfrei

## Labels

`melodiq`, `backend`, `cleanup`
