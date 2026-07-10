---
title: "[HIGH] Stale Pitch Scoring in WebRTCMicManager via WebRTC Pitch Message Age Blindness"
severity: high
type: reliability-bug
domain: WebRTC Audio Scoring
lens: architecture/api-contract
labels:
  - "audit:architecture/api-contract"
  - "bug"
---

## Summary
In the Melodiq karaoke game module, when a remote client (e.g., a singer using a smartphone) streams pitch data over WebRTC, the host's WebRTC message handler saves the latest pitch value in `remotePeer.lastPitch`. However, the host is entirely blind to the age of this pitch message. When a remote client stops sending pitch messages (e.g., when the singer pauses/stops the microphone, minimizes the app, locks their phone screen, or changes their role to spectator), the host never clears `remotePeer.lastPitch`. As a result, the host continues to retrieve the last received pitch value at 30fps and scores the player indefinitely, giving them undeserved points and combos.

## Impact
This leads to severe gameplay bugs and a breakdown in the scoring engine's contract integrity. A user can stop singing, mute/disable their microphone, or go to background, and they will continue to receive a high score and combo counts based on the last pitch they sang, undermining the competitive integrity of the game.

## Evidence
In [WebRTCMicManager.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/audio/WebRTCMicManager.ts#L44-L54), the host saves pitch data:
```typescript
    protected handleCustomWebRTCMessage(msg: any, remotePeer: MicRemotePeer): boolean {
        if (msg.type === 'pitch') {
            remotePeer.lastPitch = {
                frequency: msg.frequency,
                note: msg.note,
                volume: msg.volume
            };
            return true;
        }
        return false;
    }
```

In [WebRTCMicManager.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/audio/WebRTCMicManager.ts#L76-L84), `getPitch` returns the cached pitch:
```typescript
    getPitch(peerId: string): PitchResult | null {
        const remotePeer = this.peers.get(peerId);
        if (!remotePeer) return null;

        // Prefer the pitch calculated by the phone itself
        if (remotePeer.lastPitch) {
            return remotePeer.lastPitch;
        }
```
Because the host has no time-to-live (TTL) check or timestamp validation, once `remotePeer.lastPitch` is populated, it remains permanently available unless overwritten by another pitch message, even if no new messages are received for minutes.

## Recommended Fix
Modify the `MicRemotePeer` type to include a `timestamp` field on `lastPitch`. Update `handleCustomWebRTCMessage` to set the timestamp when receiving a pitch message, and update `getPitch` to return `null` if the pitch message is stale (e.g., older than 200ms).

1. In `WebRTCMicManager.ts`, update `handleCustomWebRTCMessage`:
```typescript
        if (msg.type === 'pitch') {
            remotePeer.lastPitch = {
                frequency: msg.frequency,
                note: msg.note,
                volume: msg.volume,
                timestamp: Date.now()
            };
            return true;
        }
```

2. Update `getPitch` to enforce a TTL check:
```typescript
        if (remotePeer.lastPitch) {
            if (Date.now() - remotePeer.lastPitch.timestamp < 200) {
                return remotePeer.lastPitch;
            } else {
                remotePeer.lastPitch = null; // Clear stale pitch
            }
        }
```

## References
- WebRTC Data Channel specifications (order and reliability defaults)
- Real-time multiplayer game synchronization patterns (dead-reckoning and heartbeat validations)

## Validation
- attacker_source — n/a
- missing_guard — absence of age/timestamp validation (TTL check) on remote pitch messages in `WebRTCMicManager`
- sink_effect — host continues to retrieve and score a stale pitch indefinitely, even after the remote client stops sending updates
- preconditions — a remote client must connect over WebRTC, start singing to populate `lastPitch`, and then stop sending pitch updates (e.g. by stopping the microphone or backgrounding the client app)
- proof_anchors — src/games/melodiq/audio/WebRTCMicManager.ts:44-54, src/games/melodiq/audio/WebRTCMicManager.ts:76-84
- suggested_validation — grep -A 10 'getPitch(peerId: string)' src/games/melodiq/audio/WebRTCMicManager.ts
