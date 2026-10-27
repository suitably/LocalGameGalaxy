## 2026-10-27 — Server image tags latest/base/full follow main (claude-code)

- `docs/tech/deployment.md`: documents which `nexumia/nexumia-server` tags move with main (`latest`, `base`, `full`) and which pin a build (`X.Y.Z`, `sha-<commit>`, with `-full` for the AI image), after `docker-publish.yml` stopped publishing `full` as `full-full` and `latest` only on releases.
