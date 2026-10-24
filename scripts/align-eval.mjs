#!/usr/bin/env node
/**
 * Dev tool: aligns a score (.mxl/.musicxml/.mid) with a recording outside the browser
 * and prints the bar marks, so alignment changes can be checked on real songs.
 *
 *   node scripts/align-eval.mjs <score> <audio> [truth.marks.json] [--parts=id,id]
 *
 * Needs ffmpeg on PATH. With a marks file (as stored next to a score, ideally
 * corrected by hand) it prints the per-bar deviation from it.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const args = process.argv.slice(2);
const partsArg = args.find((a) => a.startsWith('--parts='));
const [scorePath, audioPath, truthPath] = args.filter((a) => !a.startsWith('--'));
if (!scorePath || !audioPath) {
  console.error(
    'usage: node scripts/align-eval.mjs <score> <audio> [truth.marks.json] [--parts=id,id]',
  );
  process.exit(1);
}

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const tmp = mkdtempSync(path.join(tmpdir(), 'align-eval-'));
try {
  const bundle = path.join(tmp, 'music-score.mjs');
  await build({
    entryPoints: [path.join(root, 'src/modules/music-score/index.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: bundle,
    logLevel: 'error',
  });
  const ms = await import(pathToFileURL(bundle).href);
  const { DOMParser } = await import('@xmldom/xmldom');
  const parseXml = (text) => new DOMParser().parseFromString(text, 'application/xml');

  const data = new Uint8Array(readFileSync(scorePath));
  const name = path.basename(scorePath);
  let song;
  if (/\.midi?$/i.test(name)) song = ms.parseMidi(data, name);
  else {
    const xml = /\.mxl$/i.test(name) ? ms.extractMxl(data) : new TextDecoder().decode(data);
    song = ms.parseMusicXml(xml, name, parseXml);
  }
  if (partsArg) {
    const ids = partsArg.slice(8).split(',');
    song = { ...song, parts: song.parts.filter((p) => ids.includes(p.id)) };
  }
  console.log(
    `score: ${song.title} — ${song.measureStarts.length} bars, ${ms.songSeconds(song).toFixed(1)} s at score tempo`,
  );
  for (const p of song.parts)
    console.log(`  part ${p.id}: ${p.name} (${p.guess}, ${p.notes.length} notes)`);

  const raw = execFileSync(
    'ffmpeg',
    [
      '-v',
      'error',
      '-i',
      audioPath,
      '-ac',
      '1',
      '-ar',
      String(ms.ALIGN_SAMPLE_RATE),
      '-f',
      'f32le',
      '-',
    ],
    { maxBuffer: 1 << 30 },
  );
  const samples = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
  console.log(`audio: ${(samples.length / ms.ALIGN_SAMPLE_RATE).toFixed(1)} s`);

  const t0 = Date.now();
  const { marks, tuning } = await ms.alignRecording(song, samples);
  console.log(`aligned in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  console.log(`tuning: ${tuning.cents} cents, score shifted ${tuning.semitones} semitones`);

  const truth = truthPath ? JSON.parse(readFileSync(truthPath, 'utf-8')).marks : null;
  const errs = [];
  marks.forEach((m, i) => {
    const bar = song.measureNumbers[i] ?? 'end';
    let line = `bar ${String(i + 1).padStart(3)} (written ${String(bar).padStart(3)}) beat ${m.beat.toFixed(1).padStart(6)} → ${m.sec.toFixed(2).padStart(7)} s`;
    if (truth?.[i]) {
      const d = m.sec - truth[i].sec;
      errs.push(Math.abs(d));
      line += `   Δ ${(d * 1000).toFixed(0).padStart(5)} ms`;
    }
    console.log(line);
  });
  if (errs.length) {
    errs.sort((a, b) => a - b);
    console.log(
      `median ${(errs[errs.length >> 1] * 1000).toFixed(0)} ms, max ${(errs[errs.length - 1] * 1000).toFixed(0)} ms`,
    );
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
