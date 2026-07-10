# System Context & Container Diagrams [ID: TECH-C4-DIAGRAMS]

> [!IMPORTANT]
> This document provides C4 Model context and container diagrams for the LocalGameGalaxy multi-device runtime. Update this document whenever new deployment targets or inter-service communication paths are introduced.

---

## 1. System Context Diagram

The following diagram shows LocalGameGalaxy in relation to its external actors and dependencies.

```mermaid
C4Context
    title System Context: LocalGameGalaxy

    Person(host, "Host Player", "Runs the app on a PC/Laptop or Android TV. Controls the game session.")
    Person(singer, "Singer / Phone Client", "Connects via QR code on their smartphone to participate.")
    Person(tv_viewer, "TV Viewer", "Watches the presentation display on a connected TV screen.")

    System(lgg, "LocalGameGalaxy", "Offline-first game hub. Hosts Melodiq karaoke, Werewolf, and Imposter games on a local network.")

    System_Ext(youtube, "YouTube / yt-dlp", "Source for song audio download.")
    System_Ext(usdb, "USDB (UltraStar Database)", "Source for UltraStar lyric files and song metadata.")
    System_Ext(bt_tracker, "BitTorrent Tracker", "Public WebRTC signaling relay used for peer discovery.")
    System_Ext(demucs, "Demucs / audio-separator (PyTorch)", "Local CPU/GPU model for separating vocals from instrumentals.")

    Rel(host, lgg, "Manages game sessions via browser or Android app")
    Rel(singer, lgg, "Joins via QR code, streams microphone audio")
    Rel(tv_viewer, lgg, "Views synchronized TV presentation display")
    Rel(lgg, youtube, "Downloads song audio via yt-dlp")
    Rel(lgg, usdb, "Scrapes song lyrics and metadata")
    Rel(lgg, bt_tracker, "Uses for WebRTC peer signaling (fallback)")
    Rel(lgg, demucs, "Runs locally for vocal separation")
```

---

## 2. Container Diagram

The following diagram shows the internal containers (deployable units) that make up LocalGameGalaxy.

```mermaid
C4Container
    title Container Diagram: LocalGameGalaxy

    Person(host, "Host Player")
    Person(singer, "Singer / Phone Client")
    Person(tv_viewer, "TV Viewer")

    Container_Boundary(browser, "Host Browser / Android App (Capacitor)") {
        Container(spa, "React SPA", "React 19 + Vite + TypeScript", "Single Page App: game hub, Host UI, Phone Client UI, TV mode")
        ContainerDb(idb, "IndexedDB (Dexie)", "Browser Storage", "Stores songs, playlists, game sessions, word categories")
        ContainerDb(ls, "localStorage / sessionStorage", "Browser Storage", "Stores active session keys, settings, and temp state")
    }

    Container_Boundary(server_box, "Companion Server (Node.js / Express)") {
        Container(server, "Melodiq Helper Server", "Node.js + Express", "Serves song files, triggers yt-dlp downloads, runs separator, exposes REST API over HTTPS")
        ContainerDb(fs, "Local Filesystem", "OS Filesystem", "Stores downloaded audio files, separated stems, UltraStar .txt lyrics")
    }

    Container(tracker, "Local BitTorrent Tracker", "Node.js / bittorrent-tracker", "Runs on port 8000. Handles WebRTC signaling for local peer discovery.")

    Rel(host, spa, "Opens in browser (HTTPS) or via Android Capacitor app")
    Rel(singer, spa, "Connects via QR code URL in their phone browser")
    Rel(tv_viewer, spa, "TV Mode opened via Presentation API (secondary window)")
    Rel(spa, server, "REST API calls over local HTTPS (song fetch, separation trigger, stream)")
    Rel(spa, tracker, "WebRTC peer discovery via local or public BitTorrent tracker (WebSocket)")
    Rel(spa, idb, "Reads/writes song library, game history, word categories via Dexie")
    Rel(spa, ls, "Reads/writes active session state, settings, and sync cache")
    Rel(server, fs, "Reads and writes audio and lyrics files")
    Rel(server, tracker, "Optionally co-hosts tracker process")
```

---

## 3. WebRTC Data Flow

The following sequence shows how a Phone Client connects to the Host during a Melodiq session.

```mermaid
sequenceDiagram
    participant Phone as Phone (Singer)
    participant Tracker as BitTorrent Tracker
    participant Host as Host Browser

    Host->>Tracker: Announce peer (infoHash = session room ID)
    Phone->>Tracker: Announce peer (same infoHash via QR code URL)
    Tracker-->>Host: Peer list (includes Phone's offer/signal)
    Tracker-->>Phone: Peer list (includes Host's signal)
    Host->>Phone: WebRTC Offer (SimplePeer)
    Phone->>Host: WebRTC Answer (SimplePeer)
    Note over Host,Phone: ICE Negotiation (STUN/TURN if needed)
    Host-->>Phone: DataChannel open (game state, queue updates)
    Phone-->>Host: Audio stream via WebRTC MediaStream
```
