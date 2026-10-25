// Preloaded by `npm test`. `node --test` runs each test file in its own process, in parallel;
// without a per-process config they all share ./config.json, so concurrent writes race
// (truncated reads, lost tabletop/music directories) and a developer's real config gets clobbered.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Only in the per-file child processes, not in the runner (children inherit its env).
if (process.env.NODE_TEST_CONTEXT) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexumia-test-config-'));
  process.env.CONFIG_PATH = path.join(dir, 'config.json');
  // Must exist: a missing CONFIG_PATH falls back to ./config.json.
  fs.writeFileSync(process.env.CONFIG_PATH, '{}');
  process.on('exit', () => fs.rmSync(dir, { recursive: true, force: true }));
}
