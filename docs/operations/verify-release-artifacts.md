---
type: Howto
title: 'Verifying release artefacts'
description: "How users check with gh attestation verify that an APK, server archive, SBOM or Docker image was built by this repository's release workflow, and where the SBOMs are."
tags: [runbook, release, supply-chain, provenance, sbom, docker]
status: stable
generated:
  at: 2026-10-27T18:00:00+01:00
  by: claude-code
verified:
  at: 2026-10-27
  method: 'read .github/workflows/release.yml and docker-publish.yml after #592; gh attestation verify syntax from the GitHub CLI manual'
sources:
  - '.github/workflows/release.yml'
  - '.github/workflows/docker-publish.yml'
---

# Verifying release artefacts

Since #592 every release asset and every pushed Docker image carries a signed build provenance attestation (SLSA provenance, created by `actions/attest-build-provenance` in GitHub Actions). It proves that the file was built by a workflow of `suitably/LocalGameGalaxy` from a given commit. Pipeline side: [ci-cd-pipelines.md — Supply chain](../workflows/ci-cd-pipelines.md#supply-chain-provenance-sbom-dependency-audit).

Releases published before this change have no attestations.

## Requirements

- [GitHub CLI](https://cli.github.com/) 2.49 or newer (`gh attestation`), logged in (`gh auth login`).
- For images: access to the registry (no login needed for public images).

## Release assets

Download the asset from the release page, then:

```sh
gh attestation verify nexumia-server-linux.tar.gz -R suitably/LocalGameGalaxy
gh attestation verify nexumia.apk -R suitably/LocalGameGalaxy
```

The same works for `nexumia-server-linux-arm64.tar.gz`, `nexumia-server-macos.tar.gz`, `nexumia-server-macos-arm64.tar.gz`, `nexumia-server-win.zip` and the SBOM files. To make sure the file came from a tag release and not from another workflow, add `--signer-workflow suitably/LocalGameGalaxy/.github/workflows/release.yml`.

A successful check prints `✓ Verification succeeded!` and the workflow, commit and ref that built the file. A modified file fails with "no matching attestations found".

## Docker images

Images are pushed to Docker Hub and to GitHub Container Registry with the same tags:

| Image     | Docker Hub                 | GHCR                                |
| --------- | -------------------------- | ----------------------------------- |
| Server    | `nexumia/nexumia-server`   | `ghcr.io/suitably/nexumia-server`   |
| Signaling | `nexumia/galaxy-signaling` | `ghcr.io/suitably/galaxy-signaling` |

```sh
gh attestation verify oci://ghcr.io/suitably/nexumia-server:1.3.0 -R suitably/LocalGameGalaxy
gh attestation verify oci://index.docker.io/nexumia/nexumia-server:1.3.0 -R suitably/LocalGameGalaxy
```

The tag is only an example; use the tag you pull (`base`, `full`, `1.3`, …). The check runs against the image digest, so pinning that digest in a compose file (`image: nexumia/nexumia-server@sha256:…`) keeps the verified image.

## SBOMs

Every release carries CycloneDX SBOMs of the production dependencies, one per npm project:

- `nexumia-sbom.cdx.json` — web app and Android app (root `package-lock.json`)
- `nexumia-server-sbom.cdx.json` — companion server (`server/package-lock.json`)
- `nexumia-signaling-sbom.cdx.json` — signaling tracker (`signaling/package-lock.json`)

Feed them to a scanner, e.g. `grype sbom:nexumia-server-sbom.cdx.json`.
