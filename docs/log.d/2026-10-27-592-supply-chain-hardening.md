## 2026-10-27 — Supply-chain hardening, #592 (claude-code)

- `docs/workflows/ci-cd-pipelines.md`: new "Supply chain (provenance, SBOM, dependency audit)" in §2.3, `sbom` job, GHCR, Docker row without the removed `melodiq-server` alias, secrets table (keystore required for tag releases, `GITHUB_TOKEN` pushes to GHCR).
- New `docs/operations/verify-release-artifacts.md` (listed in `docs/operations/index.md`): `gh attestation verify` for assets and images, SBOM files. `docs/tech/deployment.md`: GHCR image names.
- Outside `docs/`: `release.yml` (blocking audit in `gates`, attestations for every asset, `sbom` job, permissions for `build-docker`), `docker-publish.yml` (GHCR login and tags, attestation per image and registry), `ci.yml` step name, `scripts/check-audit.mjs`, `scripts/lib/audit.mjs` (+ test), `scripts/audit-allowlist.json`, `check:security` runs the new script.
