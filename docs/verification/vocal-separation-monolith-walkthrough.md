# Vocal Separation Monolith Migration

This walkthrough details the changes made to consolidate the Vocal Separation feature from a separate microservice back into the main `melodiq-server` container.

## Changes Implemented

1. **Docker Infrastructure Simplification**:
   - Updated `server/Dockerfile` to use the Debian-based `node:18-bookworm-slim` image, ensuring compatibility with Python 3.11 for `yt-dlp` compatibility (which dropped support for Python 3.9). Added installation of `python3`, `python3-pip`, and `ffmpeg`.
   - Removed the `melodiq-separator` service from both `server/docker-compose.yml` and `server/docker-compose.dev.yml`.
   - Mounted a persistent volume `./models:/app/models` to store downloaded neural network models permanently.
   - Deleted the `server/separator` directory containing the old Python Flask microservice wrapper.

2. **Backend Execution Refactoring**:
   - Modified `server/src/services/separator.js` to execute jobs directly via Node's `child_process`.
   - The `checkIsInstalled` function now natively calls `audio-separator --version` on the CLI to verify the installation status.
   - The installation process now dynamically detects support for `--break-system-packages` (which is required on newer Debian versions like Bookworm due to PEP 668) and sets a high request timeout to prevent PyTorch download failures.
   - Configured `audio-separator` to store models in `path.join(process.cwd(), 'models')` to route downloads into the persistent docker volume.
   - The actual `separate` job runs `audio-separator` via CLI and parses `stdout`/`stderr` to provide a progress bar and patch the `#MP3` and `#VOCALS` tags in the `.txt` file automatically.

3. **API Endpoints Updated**:
   - `server/src/routes/index.js` was updated to drop external health checks and instead trigger the internal `child_process` jobs seamlessly.

> [!NOTE]
   - All separation operations are now queued and executed within the main container environment. Since we default to the CPU build of `audio-separator`, no additional GPU pass-through logic is required in the Docker configuration.
   - Downloaded models are cached permanently on the host system under the `./models` directory and will not be re-downloaded when the container restarts.

## Verification Results

- ✅ Static code syntax check for modified backend services (`separator.js`, `routes/index.js`) completed successfully.
- ✅ Tasks tracking in `docs/tasks/vocal-separation-tasks.md` was successfully updated and completed.

## Outstanding Issues

- None. The feature is ready for end-user testing. The user will need to run `docker compose up --build -d` to build the new combined image.
