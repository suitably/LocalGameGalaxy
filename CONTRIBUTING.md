# Contributing to LocalGameGalaxy

Thank you for contributing to LocalGameGalaxy! To maintain code quality, consistency, and clean git histories, please follow these guidelines when submitting contributions.

---

## 1. Branch Naming Conventions

All branch names should be lowercase and hyphen-separated, prefixed by the type of change being introduced:

- **Features**: `feature/[short-description]` (e.g., `feature/latency-calibration`)
- **Bugfixes**: `bugfix/[short-description]` (e.g., `bugfix/pitch-scoring-leak`)
- **Documentation**: `docs/[short-description]` (e.g., `docs/testing-guide`)
- **Refactoring**: `refactor/[short-description]` (e.g., `refactor/api-client-unification`)
- **Chore/Maintenance**: `chore/[short-description]` (e.g., `chore/dependency-upgrade`)

---

## 2. Commit Message Guidelines

We enforce the **Conventional Commits** specification. Commit messages should have the following format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: A new feature (e.g., `feat(melodiq): add audio latency calibration slider`)
- `fix`: A bug fix (e.g., `fix(webrtc): prevent listener leak on session restart`)
- `docs`: Documentation-only changes (e.g., `docs(tech): create secrets management guide`)
- `style`: Changes that do not affect the meaning of the code (formatting, white-space, semi-colons, etc.)
- `refactor`: A code change that neither fixes a bug nor adds a feature (e.g., `refactor(werewolf): split roles editor component`)
- `perf`: A code change that improves performance (e.g., `perf(canvas): optimize particle renderer physics`)
- `test`: Adding missing tests or correcting existing tests (e.g., `test(parser): add test coverage for USDB scraper`)
- `chore`: Build processes, tooling configuration, or dependency updates (e.g., `chore(root): install vitest and prettier`)

---

## 3. Pre-Contribution Checklist

Before pushing your branch or opening a pull request, you **must** run the following checks locally:

1. **Code Formatting**: Ensure all files are formatted using Prettier:
   ```bash
   npx prettier --write "src/**/*.{ts,tsx}"
   ```
2. **Linting**: Ensure there are no ESLint warnings or errors:
   ```bash
   npm run lint
   ```
3. **Building**: Ensure the TypeScript compiler and Vite bundling compile without errors:
   ```bash
   npm run build
   ```
4. **Quality gates**: hygiene, architecture, component budget, duplicates, lint and tests in one go (the same checks Husky and CI run):
   ```bash
   npm run quality-gates
   ```
5. **Docs**: if you change architecture, a game, storage keys, sync messages or server routes, update the owning doc in `docs/` and add a fragment `docs/log.d/YYYY-MM-DD-<slug>.md` (rules in [docs/workflows/knowledge-base-maintenance.md](docs/workflows/knowledge-base-maintenance.md)).
6. **Changelog**: user-facing changes add a fragment `changelog.d/<slug>.<type>.md` (types and format: [changelog.d/README.md](changelog.d/README.md)); never edit `CHANGELOG.md` directly. `npm run check:changelog` validates fragments. PRs titled `chore|refactor|style|test|docs|perf:` or labelled `no-changelog` need none.

---

## 4. Pull Request Workflow

1. **Create a Branch**: Fork the repo or create your branch locally using the naming conventions above.
2. **Develop**: Keep changes focused and small, respecting SOLID design principles.
3. **Validate**: Ensure all tests and static analysis checks pass.
4. **Open a Pull Request**:
   - Provide a clear, descriptive title.
   - Describe the changes in the PR body.
   - Link any related issues (e.g., `Closes #78`).
5. **Review**: Address review feedback and update the branch as needed.

## 5. Releases

Releases are not cut by hand. `.github/workflows/changelog-release.yml` runs weekly (or via **Run workflow**, with an optional bump or exact version): it computes the next version from the fragment types (`added`/`changed`/`deprecated`/`removed` → minor, `fixed`/`security` → patch), collects `changelog.d/` into `CHANGELOG.md` and `docs/log.d/` into `docs/log.md`, bumps every `package.json`, `package-lock.json` and the Android `versionName`/`versionCode`, and opens the PR `release/vX.Y.Z`. Merging it tags `vX.Y.Z`, and `release.yml` publishes the release with the changelog section as its text. Details: [docs/workflows/ci-cd-pipelines.md §2.6](docs/workflows/ci-cd-pipelines.md#26-changelog-release-pr--tag-changelog-releaseyml).
