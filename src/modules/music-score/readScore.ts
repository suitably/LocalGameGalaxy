/**
 * Score file bytes → `ScoreSong`, by file name: .mxl, .musicxml/.xml, .mid/.midi or Guitar Pro 7/8
 * .gp. Shared by Melodiq Notes and Melodiq (a song without karaoke `.txt`, #604).
 */
import { extractGpif, parseGuitarPro } from './guitarPro';
import { parseMidi } from './midi';
import { parseMusicXml } from './musicXml';
import { extractMxl } from './mxl';
import type { ScoreSong, XmlParser } from './types';

export interface ScoreFileContent {
  song: ScoreSong;
  /** MusicXML text when the source was MusicXML (needed to export it with the recording's tempo). */
  xml: string | null;
}

export function readScoreBytes(
  fileName: string,
  data: ArrayBuffer,
  xmlParser: XmlParser,
): ScoreFileContent {
  const lower = fileName.toLowerCase();
  const bytes = new Uint8Array(data);
  if (/\.midi?$/.test(lower)) return { song: parseMidi(bytes, fileName), xml: null };
  if (lower.endsWith('.gp'))
    return { song: parseGuitarPro(extractGpif(bytes), fileName, xmlParser), xml: null };
  const xml = lower.endsWith('.mxl') ? extractMxl(bytes) : new TextDecoder().decode(bytes);
  return { song: parseMusicXml(xml, fileName, xmlParser), xml };
}
