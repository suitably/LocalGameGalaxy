import { useEffect, useRef } from 'react';
import { melodiqFetch } from '../api/melodiqFetch';

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
    const retryCounts = useRef<Map<string, number>>(new Map());

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
                    const freshSongs = await melodiqFetch('/api/songs');

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

                        // If song isn't in library yet, allow up to 3 retries, then mark as processed
                        if (!realSong) {
                            const count = (retryCounts.current.get(jobId) || 0) + 1;
                            retryCounts.current.set(jobId, count);
                            if (count > 3) {
                                lastProcessedJobs.current.add(jobId);
                            }
                            return;
                        }

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
