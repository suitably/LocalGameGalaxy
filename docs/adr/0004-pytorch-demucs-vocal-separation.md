# ADR-0004: Use PyTorch/Demucs (audio-separator) for On-Device Vocal Separation

## Status
Accepted

## Context
Melodiq requires separated vocal and instrumental audio tracks for karaoke gameplay. Most songs are downloaded as mixed stereo files (via yt-dlp). Running vocal separation on a cloud service would require internet access, introduce per-use costs, and violate the offline-first design goal.

## Decision
Use the **`audio-separator`** Python package (which wraps Facebook's Demucs model via PyTorch) executed by the companion server as a local subprocess. The model runs entirely on the host machine's CPU (or GPU if available).

## Alternatives Considered
- **Cloud separation APIs (e.g., Spleeter API, Moises)**: Require internet, have usage limits, and introduce cost and privacy concerns.
- **Spleeter (local)**: Older architecture with lower separation quality than Demucs; less actively maintained.
- **WASM-based models**: WebAssembly audio separation models exist but are far too slow (minutes per song) and cannot match Demucs quality.

## Consequences
**Positive**:
- High-quality separation (Demucs HTDemucs model produces near-professional results).
- Fully offline; no API keys or internet required after initial model download.
- Compatible with GPU acceleration (CUDA, MPS on macOS) for faster processing.

**Negative**:
- First-run requires downloading the PyTorch model (~1 GB).
- CPU-only processing is slow (3–10 minutes per song on typical hardware).
- Requires a Python 3.10+ virtual environment on the host machine.
- Server must manage subprocess lifecycle and handle process crashes gracefully.
