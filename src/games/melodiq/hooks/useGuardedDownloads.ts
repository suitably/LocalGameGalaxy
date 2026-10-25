import { useSongDownloader } from './useSongDownloader';
import { type UsdbSongItem } from '../types';

type DownloaderArgs = Parameters<typeof useSongDownloader>[0];

/** Song download handlers that clients may only use as admin / queue manager. */
export function useGuardedDownloads(
  isClient: boolean,
  clientRole: string | null | undefined,
  args: DownloaderArgs,
) {
  const { handleDownloadOnly, handleDownloadAndQueue } = useSongDownloader(args);
  const canDownload = !isClient || clientRole === 'admin' || clientRole === 'queue_manager';

  const guard =
    (run: (song: UsdbSongItem) => Promise<unknown>) => async (usdbSong: UsdbSongItem) => {
      if (!canDownload) {
        args.setFeedbackMessage('Nur Queue Manager können Songs herunterladen.');
        return;
      }
      return run(usdbSong);
    };

  return {
    canDownload,
    handleDownloadOnly: guard(handleDownloadOnly),
    handleDownloadAndQueue: guard(handleDownloadAndQueue),
  };
}
