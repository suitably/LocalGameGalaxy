# Declarative Jules Agents Registry

This directory contains standalone agent definitions for autonomous repository audits.

## How It Works

- Each `.md` file defines one autonomous agent.
- A daily orchestrator workflow (`.github/workflows/jules-audit.yml`) inspects all files here.
- When an agent is scheduled for today (or triggered manually via `workflow_dispatch`), Jules runs with the agent's instructions and automatically opens a Pull Request with fixes or improvements.

## Weekly Audit Schedule

The agents are orchestrated across the week to cover the most critical quality and security dimensions:

| Day           | Agent ID               | Focus / RepoLens Domains                                                        |
| :------------ | :--------------------- | :------------------------------------------------------------------------------ |
| **Monday**    | `security`             | Injection, XSS/Sanitization, Secrets, CVEs, Rate Abuse                          |
| **Tuesday**   | `performance`          | Bundle Size, Re-Renders, Web Audio/Canvas, Memory Leaks                         |
| **Wednesday** | `architecture`         | Anti-God-Components, Cross-Game Isolation, Dead Code, Duplicate Logic (`jscpd`) |
| **Thursday**  | `testing`              | Vitest Suite, Game Logic Coverage, Race Conditions, Edge Cases                  |
| **Friday**    | `mobile-ux`            | Capacitor Safe Areas, Touch Targets, UX Anti-Patterns                           |
| **Saturday**  | `i18n-maintainability` | DE/EN Translation Parity, Type Safety (`no any`), Tech Debt                     |
| **Sunday**    | `open-source`          | Documentation Gaps, Architecture Sync (SSoT), Licenses, Media Hygiene           |

The granular RepoLens prompts backing these domains are mirrored under `.github/lenses/`.

## Configuration (Frontmatter)

Every agent markdown file begins with YAML frontmatter:

```markdown
---
id: security # Unique identifier
name: Security & Vulnerability Auditor # Human-readable name
enabled: true # true to run on schedule, false to pause
schedule: monday # monday, tuesday, wednesday, thursday, friday, saturday, sunday, or daily
domain: security # Associated RepoLens domain
---
```

## Adding a New Agent

1. Create a new markdown file in this directory: `.github/agents/<id>.md`.
2. Add the frontmatter at the top (`id`, `name`, `enabled`, `schedule`).
3. Write the agent's prompt, role, and task instructions in markdown.
4. Commit and push. The agent is automatically discovered by the orchestrator!

## Manual Execution

Go to **Actions** → **Jules Scheduled Audit** → **Run workflow** and select the agent `id` (e.g. `performance`, `architecture`, `testing` or `all`) to trigger an immediate run.
