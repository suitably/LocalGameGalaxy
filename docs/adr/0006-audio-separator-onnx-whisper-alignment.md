---
type: Architecture Decision Record
title: 'ADR-0006: audio-separator (ONNX, CPU) and whisper-timestamped for stems and lyric alignment'
description: 'The companion server separates stems with the audio-separator CLI and the UVR-MDX-NET-Inst_HQ_3 ONNX model on CPU and aligns USDB lyrics with whisper-timestamped; supersedes the Demucs wording of ADR-0004.'
resource: server/src/plugins/melodiq/services/separator.ts
tags: [adr, ai, audio-separation, onnx, whisper, melodiq, server]
status: stable
generated:
  at: 2026-11-15T12:00:00+01:00
  by: claude-code
verified:
  at: 2026-11-15
  method: 'Read server/src/plugins/melodiq/services/separator.ts, server/src/scripts/align_lyrics.py, server/Dockerfile, server/README.md and docs/tech/song-pipeline.md; git log -S"Demucs" and -S"UVR-MDX" on server/ and docs/ (no commit explains the switch)'
sources:
  - 'server/src/plugins/melodiq/services/separator.ts'
  - 'server/src/scripts/align_lyrics.py'
  - 'server/Dockerfile'
  - 'server/README.md'
  - 'docs/tech/song-pipeline.md'
---

# ADR-0006: audio-separator (ONNX, CPU) and whisper-timestamped for stems and lyric alignment

## Status

Accepted 2026-11-15 (maintainer decision on [Q13](../open-questions.md): "whichever is more stable"; the running, tested stack is the stable one). Supersedes [ADR-0004](0004-pytorch-demucs-vocal-separation.md), whose core decision (local `audio-separator` subprocess, no cloud API) is kept; only the model and the alignment tool changed.

## Context

- Melodiq needs a vocal stem and an instrumental stem per song, and word-level timing of the USDB lyrics against the audio ([song-pipeline](../tech/song-pipeline.md)). Both must run offline on the companion server.
- ADR-0004 named "Demucs via PyTorch". The code never reflects that: `separator.ts` runs the `audio-separator` CLI with `--model_filename UVR-MDX-NET-Inst_HQ_3.onnx` and `--model_file_dir` set to `MODELS_DIR` (default `<cwd>/models`); output stems are `.mp3` files matched by `Vocals` / `Instrumental` in their names.
- Lyrics are aligned by `server/src/scripts/align_lyrics.py` with `whisper-timestamped` (model `base`, `device="cpu"`, optional `auditok` VAD), matching Whisper words to the USDB syllables.
- The server installs the tools on demand (`POST /api/separator/install`): CPU-only PyTorch from the PyTorch CPU wheel index first (avoids >1 GB of CUDA wheels), then `audio-separator[cpu]` and `whisper-timestamped`. `server/Dockerfile` (stage `full`) bakes the same set in.
- **Unverified:** why and when Demucs was replaced. `git log -S"Demucs"` / `-S"UVR-MDX"` over `server/` and `docs/` shows no commit that explains the switch, and the code carries no comment. Plausible reasons visible from the code and README are model size (UVR MDX-Net about 60 MB, per `server/README.md`) and CPU-only operation, but these are inferences, not recorded facts.

## Decision

1. **Stems:** `audio-separator[cpu]` with the ONNX model `UVR-MDX-NET-Inst_HQ_3.onnx`, executed as a local subprocess on CPU. No cloud API.
2. **Alignment:** `whisper-timestamped` (Whisper `base`, CPU) in `align_lyrics.py`; models cached in `WHISPER_MODELS_DIR` / `TORCH_HOME`.
3. **CPU PyTorch stays.** The separator model is ONNX, but `whisper-timestamped` needs `torch`, so the CPU-only `torch`, `torchvision`, `torchaudio` wheels remain a dependency of the full image and of the on-demand install.
4. Models are downloaded on first use into `MODELS_DIR` and persisted across restarts.

## Alternatives considered

- **Demucs (HTDemucs) via PyTorch, as in ADR-0004**: higher reference quality, but a larger model download and heavier CPU runtime; it is not what runs, and the maintainer chose the running stack as the more stable one.
- **Cloud separation or alignment APIs**: need internet, cost and privacy trade-offs; rejected in ADR-0004, unchanged.
- **Spleeter, WASM models**: rejected in ADR-0004 (older quality, far too slow); unchanged.
- **GPU builds (CUDA wheels)**: not used; the install deliberately takes CPU wheels. **Unverified:** whether GPU support is wanted later.

## Consequences

**Positive**: matches the code, the Dockerfile and the docs; no CUDA footprint; the ONNX stem model is small; one pip install covers separation and alignment.

**Negative**: PyTorch CPU wheels still make the full image large (about 3.0 to 3.5 GB per `server/README.md`); CPU-only processing is slow; separation quality is bounded by the UVR MDX-Net model; two Python-side tools (`audio-separator`, `whisper-timestamped`) to keep compatible with the installed PyTorch.

**Follow-up**: if the model or alignment tool changes again, write a new ADR instead of editing this one.
