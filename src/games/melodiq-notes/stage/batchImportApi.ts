import { fetchCompanionFile } from '../../../lib/companion/songScoresApi';
import { getSongMarks, saveSongMarks } from '../../../lib/companion/notesLibraryApi';
import { searchYouTube } from '../../../lib/companion/songDownloadApi';
import { alignRecordingInBrowser } from './engine/browserRecording';
import { readScoreFile } from './loadScore';
import type { BatchApi } from './logic/batchImport';
import { defaultImportApi } from './logic/youtubeImport';

/** The batch import against the companion server, aligning in this browser. */
export const browserBatchApi: BatchApi = {
  ...defaultImportApi,
  readScore: (fileName, data) => readScoreFile(fileName, data).song,
  search: (query) => searchYouTube(query),
  fetchFile: fetchCompanionFile,
  getMarks: getSongMarks,
  saveMarks: saveSongMarks,
  align: async (audio, song) => (await alignRecordingInBrowser(audio, song)).marks,
};
