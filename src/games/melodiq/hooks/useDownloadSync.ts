import { useEffect, useRef } from 'react';

interface UseDownloadSyncProps {
    isClient: boolean;
    jobs: any[];
    queue: any[];
    refreshSongs: () => Promise<void>;
    replaceItem: (id: string, song: any) => void;
    selectedSong?: any;
    onCurrentSongDownloaded?: (realSong: any) => void;
}

export const useDownloadSync = ({
    isClient, jobs, queue, refreshSongs, replaceItem, selectedSong, onCurrentSongDownloaded
}: UseDownloadSyncProps) => {
    const lastProcessedJobs = useRef<Set<string>>(new Set());

    useEffect(() => {
        const checkDownloads = async () => {
            const completedJobs = jobs.filter(j => j.status === 'done' && !lastProcessedJobs.current.has(j.jobId));
            const newlyCompletedJobIds = completedJobs.map(j => j.jobId);

            if (newlyCompletedJobIds.length > 0) {
                // Wait briefly for scan
                await new Promise(r => setTimeout(r, 1000));
                await refreshSongs();

                if (isClient) {
                    newlyCompletedJobIds.forEach(jobId => lastProcessedJobs.current.add(jobId));
                    return;
                }

                try {
                    const url = localStorage.getItem('melodiq_helper_url') || 'http://localhost:3000';
                    const token = localStorage.getItem('melodiq_helper_token') || '';
                    const helperUrl = url.replace(/\/$/, "");

                    const res = await fetch(`${helperUrl}/api/songs`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const freshSongs = await res.json();

                    newlyCompletedJobIds.forEach(jobId => {
                        const job = jobs.find(j => j.jobId === jobId);
                        if (!job) return;

                        const realSong = freshSongs.find((s: any) => {
                            const sTitle = s.title || "";
                            const jTitle = job.title || "";
                            const sArtist = s.artist || "";
                            const jArtist = job.artist || "";
                            return sTitle.toLowerCase() === jTitle.toLowerCase() &&
                                   sArtist.toLowerCase() === jArtist.toLowerCase();
                        });

                        // If song isn't in library yet, don't mark as processed. 
                        // It will retry on next poll.
                        if (!realSong) return;

                        lastProcessedJobs.current.add(jobId);

                        // If it's in the queue, swap the dummy
                        const qItem = queue.find(q => q.song.isDownloading && q.song.jobId === jobId);
                        if (qItem) {
                            replaceItem(qItem.id, realSong);
                        }

                        // If it is currently selected and waiting, swap it there too
                        if (selectedSong && selectedSong.isDownloading && selectedSong.jobId === jobId) {
                            if (onCurrentSongDownloaded) {
                                onCurrentSongDownloaded(realSong);
                            }
                        }
                    });
                } catch (e) {
                    console.error('Failed to swap dummy song', e);
                }
            }
        };

        checkDownloads();
    }, [jobs, queue, isClient, refreshSongs, replaceItem]);
};
