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
