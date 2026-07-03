
import { melodiqFetch } from '../api/melodiqFetch';

interface UseSongDownloaderProps {
    addToQueue: (song: any, requester?: string) => void;
    setFeedbackMessage: (msg: string | null) => void;
}

export const useSongDownloader = ({ addToQueue, setFeedbackMessage }: UseSongDownloaderProps) => {

    const handleDownloadOnly = async (usdbSong: any) => {
        try {
            const data = await melodiqFetch('/api/usdb/download', {
                method: 'POST',
                body: JSON.stringify({
                    usdbId: usdbSong.usdbId,
                    artist: usdbSong.artist,
                    title: usdbSong.title,
                    videoMode: 'stream'
                })
            });
            if (data.jobIds && data.jobIds.length > 0) {
                setFeedbackMessage(`Downloading: ${usdbSong.title}`);
            }
        } catch (err) {
            console.error('Download failed', err);
        }
    };

    const handleDownloadAndQueue = async (usdbSong: any) => {
        try {
            const data = await melodiqFetch('/api/usdb/download', {
                method: 'POST',
                body: JSON.stringify({
                    usdbId: usdbSong.usdbId,
                    artist: usdbSong.artist,
                    title: usdbSong.title,
                    videoMode: 'stream'
                })
            });
            if (data.jobIds && data.jobIds.length > 0) {
                const jobId = data.jobIds[0];
                const dummySong = {
                    id: `dl-${jobId}`,
                    title: usdbSong.title,
                    artist: usdbSong.artist,
                    isDownloading: true,
                    jobId: jobId
                } as any;
                addToQueue(dummySong, 'User');
                setFeedbackMessage(`Downloading and Queuing: ${usdbSong.title}`);
            }
        } catch (err) {
            console.error('Download failed', err);
        }
    };

    return { handleDownloadOnly, handleDownloadAndQueue };
};
