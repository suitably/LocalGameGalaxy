import { strFromU8, unzipSync } from 'fflate';
import { ScoreImportError } from './musicXml';

/** Extracts the score XML from a compressed MusicXML (.mxl) archive. */
export function extractMxl(data: Uint8Array): string {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(data);
  } catch {
    throw new ScoreImportError('invalid-mxl');
  }
  let rootPath: string | undefined;
  const container = files['META-INF/container.xml'];
  if (container) {
    const match = strFromU8(container).match(/full-path="([^"]+)"/);
    if (match && files[match[1]]) rootPath = match[1];
  }
  rootPath ??= Object.keys(files).find(
    (n) => !n.startsWith('META-INF') && /\.(xml|musicxml)$/i.test(n),
  );
  if (!rootPath) throw new ScoreImportError('invalid-mxl');
  return strFromU8(files[rootPath]);
}
