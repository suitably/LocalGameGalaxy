## 2026-11-23 — Context files export only components (#845) (agent)

- `docs/tech/architecture.md` §3.3: notes that context objects, hooks and types of `src/context/` live in `…ContextCore.ts` files next to the provider components.
- Code outside `docs/` changed: contexts, hooks and constants moved out of 13 component files into `…Core.ts` siblings; importers updated.
