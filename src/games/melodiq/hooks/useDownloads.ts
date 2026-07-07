import { useState, useEffect } from 'react';
import { melodiqFetch } from '../api/melodiqFetch';

export interface DownloadJob {
    jobId: string;
    usdbId: string | null;
    artist: string;
    title: string;
    videoMode: string;
    status: 'pending' | 'running' | 'done' | 'error';
    progress: number;
    error: string | null;
    log: string[];
}

export function useDownloads(pollingIntervalMs: number = 2000) {
    const [jobs, setJobs] = useState<DownloadJob[]>([]);

    useEffect(() => {
        let isMounted = true;
        let timeoutId: number;

        const fetchJobs = async () => {
            try {
                const dataUsdb = await melodiqFetch('/api/usdb/jobs');
                const dataSeparator = await melodiqFetch('/api/separator/jobs');

                if (isMounted) {
                    setJobs([...dataUsdb, ...dataSeparator]);
                }
            } catch (err) {
                if (err instanceof Error && (err.message.includes('Unauthorized') || err.message.includes('401') || err.message.includes('403'))) {
                    console.error("Helper server token invalid. Stopping download polling.");
                    isMounted = false; // Stop polling
                }
            }

            if (isMounted) {
                timeoutId = window.setTimeout(fetchJobs, pollingIntervalMs);
            }
        };

        // 0 means disabled (e.g., on client phones, download tracking is irrelevant)
        if (pollingIntervalMs === 0) return;
        
        fetchJobs();

        return () => {
            isMounted = false;
            if (timeoutId) {
                window.clearTimeout(timeoutId);
            }
        };
    }, [pollingIntervalMs]);

    return { jobs };
}
