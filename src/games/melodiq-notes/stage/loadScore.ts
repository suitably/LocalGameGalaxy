import {
  applyBarMarksToMusicXml,
  parseMusicXml,
  readScoreBytes,
  type BarMark,
  type ScoreFileContent,
  type ScoreSong,
} from '../../../modules/music-score';

const browserXml = (text: string) => new DOMParser().parseFromString(text, 'application/xml');

export type LoadedScore = ScoreFileContent;

/** Reads .mxl, .musicxml/.xml, .mid/.midi or Guitar Pro 7/8 .gp bytes into a song. */
export const readScoreFile = (fileName: string, data: ArrayBuffer): LoadedScore =>
  readScoreBytes(fileName, data, browserXml);

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

/** Downloads the MusicXML with the recording's tempo from its bar marks (shifted by the offset). */
export function downloadAlignedScore(
  song: ScoreSong,
  xml: string,
  played: BarMark[],
  offset: number,
) {
  const shifted = played.map((m) => ({ ...m, sec: m.sec + offset }));
  const out = applyBarMarksToMusicXml(xml, song, shifted, browserXml, serializeXml);
  downloadText(`${song.title || 'score'}.musicxml`, out, 'application/vnd.recordare.musicxml+xml');
}
