/** Bundles the real TypeScript importer (ttsParser + steamWorkshopApi) with esbuild and loads it. */
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export async function loadParser() {
  const logic = path.join(ROOT, 'src/games/tabletop/logic');
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-compat-'));
  const outfile = path.join(outDir, 'parser.mjs');
  await build({
    stdin: {
      contents: `export { parseTtsSaveFile, isTtsSaveFile, sanitizeTtsUrl } from './ttsParser';
export { decodeModBuffer } from './steamWorkshopApi';`,
      resolveDir: logic,
      loader: 'ts',
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
    logLevel: 'error',
    nodePaths: [path.join(ROOT, 'node_modules')],
  });
  const mod = await import(pathToFileURL(outfile).href);
  return { mod, cleanup: () => fs.rmSync(outDir, { recursive: true, force: true }) };
}
