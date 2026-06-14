# Vocal Separation Monolith Fix & CPU Optimization Walkthrough

This document logs the fixes applied to the Vocal Separation installer and outlines the user verification steps.

## Changes Implemented

1. **Compiler Support for Cython/C Packages**:
   - Added `build-essential` and `python3-dev` to `server/Dockerfile`.
   - This provides `gcc` and Python headers required by `pip3` to compile the C-extensions of the `diffq` dependency (part of `audio-separator`).

2. **CPU-only PyTorch Pre-installation (Storage & Speed Optimization)**:
   - Modified `server/src/services/separator.js` to install CPU-only PyTorch packages (`torch`, `torchvision`, `torchaudio`) via the official PyTorch CPU wheel repository (`https://download.pytorch.org/whl/cpu`) in a separate step before installing `audio-separator[cpu]`.
   - This prevents `pip` from downloading massive CUDA wheels (`nvidia-cublas`, `nvidia-cudnn`, etc.), saving over **1 GB of storage/download** and significantly improving performance on CPU-only machines.

## Verification Steps for User

Since Docker is not available in the agent environment, please perform these verification steps on your host:

1. **Rebuild the Docker Container**:
   Build the helper container locally so it has `build-essential` and `python3-dev`:
   ```bash
   docker compose -f server/docker-compose.dev.yml build --no-cache melodiq-server
   ```

2. **Start the Container**:
   ```bash
   docker compose -f server/docker-compose.dev.yml up -d
   ```

3. **Install the Tool via UI**:
   - Navigate to the helper's web interface.
   - Click **"Install Tool"** in the Vocal Separation section.
   - Verify that:
     1. It successfully pulls CPU-only wheels for PyTorch from the CPU wheel index.
     2. It compiles and installs `diffq` without any GCC errors.
     3. The installation completes successfully (`done` status).
