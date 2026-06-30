
interface UseSongDownloaderProps {
    addToQueue: (song: any, requester?: string) => void;
    setFeedbackMessage: (msg: string | null) => void;
}

export const useSongDownloader = ({ addToQueue, setFeedbackMessage }: UseSongDownloaderProps) => {

    const handleDownloadOnly = async (usdbSong: any) => {
        try {
            const url = localStorage.getItem('melodiq_helper_url') || 'http://localhost:3000';
            const token = localStorage.getItem('melodiq_helper_token') || '';
            const helperUrl = url.replace(/\/$/, "");

            const res = await fetch(`${helperUrl}/api/usdb/download`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    usdbId: usdbSong.usdbId,
                    artist: usdbSong.artist,
                    title: usdbSong.title,
                    videoMode: 'stream'
                })
            });
            const data = await res.json();
            if (data.jobIds && data.jobIds.length > 0) {
                setFeedbackMessage(`Downloading: ${usdbSong.title}`);
            }
        } catch (err) {
            console.error('Download failed', err);
        }
    };

    const handleDownloadAndQueue = async (usdbSong: any) => {
        try {
            const url = localStorage.getItem('melodiq_helper_url') || 'http://localhost:3000';
            const token = localStorage.getItem('melodiq_helper_token') || '';
            const helperUrl = url.replace(/\/$/, "");

            const res = await fetch(`${helperUrl}/api/usdb/download`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    usdbId: usdbSong.usdbId,
                    artist: usdbSong.artist,
                    title: usdbSong.title,
                    videoMode: 'stream'
                })
            });
            const data = await res.json();
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
