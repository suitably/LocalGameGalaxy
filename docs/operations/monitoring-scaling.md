# Monitoring, Alerting, and Capacity Scaling [ID: OPS-MONITORING-SCALING]

This document details the operational resource profiles, monitoring configurations, and capacity limits for the CPU-intensive PyTorch vocal separation and audio alignment tasks in LocalGameGalaxy.

---

## 1. Resource Profiles for Audio Separation

Audio separation (Facebook Demucs) and forced lyric alignment are highly resource-intensive background operations.

### Resource Utilization Profiles

| Job Phase | Core CPU Usage | RAM Usage | Duration (per song) |
|-----------|----------------|-----------|---------------------|
| **yt-dlp Download** | Low (0.1–0.5 cores) | Low (~100 MB) | 10–30 seconds |
| **FFmpeg Conversion**| High (1–2 cores) | Medium (~250 MB) | 5–15 seconds |
| **Vocal Separation (Demucs CPU)** | **Critical** (Maxes all allocated cores) | **High** (1.5 GB – 2.5 GB) | 3–8 minutes |
| **Lyric Alignment** | Medium (1 core) | Low (~150 MB) | 10–20 seconds |

> [!WARNING]
> Running multiple Demucs separation jobs simultaneously without resource limits will exhaust system memory, trigger the OS Out-Of-Memory (OOM) killer, and crash the main Express web server.

---

## 2. Resource Capping & Container Limits

To safeguard Express API responsiveness, you must limit resources allocated to the server container.

### Docker Compose Configuration
Apply CPU and RAM limits in `docker-compose.yml` to prevent host starvation:
```yaml
services:
  server:
    image: localgamegalaxy/server:latest
    deploy:
      resources:
        limits:
          cpus: '4.0'          # Limit container to 4 CPU cores
          memory: 3000M        # Limit container to 3GB RAM
        reservations:
          memory: 1000M        # Reserve 1GB RAM minimum
```

---

## 3. Monitoring Metrics & Commands

Operators should monitor the following metrics on the host machine:

### 1. CPU Utilization
Exhaustion will cause API timeouts.
- **CLI Check**: `htop` or `top`
- **Docker Check**: `docker stats`

### 2. RAM Utilization
Check if the server is approaching the 3GB limit.
- **CLI Check**: `free -m`

### 3. Disk Space
Audio files and models consume significant storage.
- **CLI Check**: `df -h`
- **Model Check**: ONNX separation models are stored in `/server/models/` (~1.2 GB total).
- **Stems Check**: Each song directory consumes ~50–150 MB of disk space.

---

## 4. Alerting Thresholds

Configure your monitoring stack (e.g. Prometheus + Alertmanager or custom scripts) with these recommended alert thresholds:

| Metric | Condition | Severity | Description / Action |
|--------|-----------|----------|----------------------|
| **Container RAM** | `> 85%` for 2m | Warning | Nearing OOM crash threshold. Review active jobs queue. |
| **Container CPU** | `> 95%` for 10m | Warning | CPU cores saturated. API response times might degrade. |
| **Disk Space** | `> 90%` | Critical | Disks nearing capacity. Clean up cached/failed download folders. |
| **Health Check** | API fails `GET /api/progress` | Critical | Web server is dead or unresponsive. Trigger restart. |

---

## 5. Scaling Strategy

The companion server utilizes a **single-worker job queue** to run separation tasks sequentially.
- **Concurrency**: The server executes exactly **one** separation job at a time. Other requests remain queued in `separatorQueue`.
- **Scaling Limit**: Do **not** attempt to scale horizontally by running multiple instances of the server sharing the same directory without a distributed lock manager. This would corrupt the database files and lead to file lock conflicts on `playlists.json`.
- **Hardware Requirement**: For reliable CPU-based separation, the host machine must have at least **4 CPU cores** and **4 GB of total system RAM**.
