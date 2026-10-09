import { melodiqFetch } from '../api/melodiqFetch';
import type { UsdbSongItem } from '../types';
import type { SongMeta } from '../db';

interface UseSongDownloaderProps {
    addToQueue: (song: SongMeta, requester?: string) => void;
    setFeedbackMessage: (msg: string | null) => void;
}

export const useSongDownloader = ({ addToQueue, setFeedbackMessage }: UseSongDownloaderProps) => {

    const triggerSongDownload = async (usdbSong: UsdbSongItem, videoMode: string = 'stream'): Promise<string[] | null> => {
        try {
            const data = await melodiqFetch('/api/usdb/download', {
                method: 'POST',
                body: JSON.stringify({
                    usdbId: usdbSong.usdbId,
                    artist: usdbSong.artist,
                    title: usdbSong.title,
                    videoMode
                })
            });
            if (data.jobIds && data.jobIds.length > 0) {
                return data.jobIds;
            }
        } catch (err) {
            console.error('Download failed', err);
        }
        return null;
    };

    const handleDownloadOnly = async (usdbSong: UsdbSongItem) => {
        const jobIds = await triggerSongDownload(usdbSong);
        if (jobIds) {
            setFeedbackMessage(`Downloading: ${usdbSong.title}`);
        } else {
            setFeedbackMessage('Download fehlgeschlagen.');
        }
    };

    const handleDownloadAndQueue = async (usdbSong: UsdbSongItem) => {
        const jobIds = await triggerSongDownload(usdbSong);
        if (jobIds) {
            const jobId = jobIds[0];
            const dummySong: SongMeta = {
                id: `dl-${jobId}`,
                title: usdbSong.title,
                artist: usdbSong.artist,
                isDownloading: true,
                jobId: jobId
            };
            addToQueue(dummySong, 'User');
            setFeedbackMessage(`Downloading and Queuing: ${usdbSong.title}`);
        } else {
            setFeedbackMessage('Download fehlgeschlagen.');
        }
    };

    return { handleDownloadOnly, handleDownloadAndQueue };
};
