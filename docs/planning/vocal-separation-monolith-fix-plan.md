# Vocal Separation Monolith Fix & CPU Optimization Plan

This plan addresses the installation failure of the vocal separator tool and optimizes its resource usage (reducing download and storage size by avoiding CUDA packages).

## Goal Description
1. **Fix compilation error**: Resolve `error: command 'x86_64-linux-gnu-gcc' failed: No such file or directory` when building `diffq` (a dependency of `audio-separator`).
2. **Reduce disk/download size**: Prevent the installation of CUDA dependencies (over 1GB) by explicitly installing the CPU-only version of PyTorch (`torch`, `torchvision`, `torchaudio`) via PyTorch's custom pip repository.

## Proposed Changes

### Infrastructure
#### [MODIFY] [server/Dockerfile](file:///home/deck/Projects/LocalGameGalaxy/server/Dockerfile)
- Add `build-essential` and `python3-dev` to the `apt-get install` command. This provides the compiler and header files needed to compile python C-extensions (specifically `diffq`'s `bitpack.c`).

### Backend Service
#### [MODIFY] [server/src/services/separator.js](file:///home/deck/Projects/LocalGameGalaxy/server/src/services/separator.js)
- Update `runInstallJob` to run in two sequential steps:
  1. Install CPU-only `torch`, `torchvision`, and `torchaudio` from `https://download.pytorch.org/whl/cpu`.
  2. Install `audio-separator[cpu]`.

## Verification Plan

### Automated / Command-line Verification
1. Rebuild the docker image:
   ```bash
   docker compose -f server/docker-compose.dev.yml build melodiq-server
   ```
2. Run the helper server container.
3. Trigger the installation tool from the UI (or mock the API call `/api/separator/install`).
4. Verify that the install logs show `torch` installing from the CPU whl index, and `audio-separator` successfully building and installing `diffq` using GCC.
