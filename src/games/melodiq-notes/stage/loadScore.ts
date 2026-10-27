import {
  extractGpif,
  extractMxl,
  parseGuitarPro,
  parseMidi,
  parseMusicXml,
  type ScoreSong,
} from '../../../modules/music-score';

const browserXml = (text: string) => new DOMParser().parseFromString(text, 'application/xml');

export interface LoadedScore {
  song: ScoreSong;
  /** MusicXML text when the source was MusicXML (needed to export it with the recording's tempo). */
  xml: string | null;
}

/** Reads .mxl, .musicxml/.xml, .mid/.midi or Guitar Pro 7/8 .gp bytes into a song. */
export function readScoreFile(fileName: string, data: ArrayBuffer): LoadedScore {
  const lower = fileName.toLowerCase();
  const bytes = new Uint8Array(data);
  if (/\.midi?$/.test(lower)) return { song: parseMidi(bytes, fileName), xml: null };
  if (lower.endsWith('.gp'))
    return { song: parseGuitarPro(extractGpif(bytes), fileName, browserXml), xml: null };
  const xml = lower.endsWith('.mxl') ? extractMxl(bytes) : new TextDecoder().decode(bytes);
  return { song: parseMusicXml(xml, fileName, browserXml), xml };
}

export function readMusicXmlText(xml: string, name: string): LoadedScore {
  return { song: parseMusicXml(xml, name, browserXml), xml };
}

export const serializeXml = (doc: Document) => new XMLSerializer().serializeToString(doc);
export { browserXml };

/** Offers a text file for download. */
export function downloadText(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
