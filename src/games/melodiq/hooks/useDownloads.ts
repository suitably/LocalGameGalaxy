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
                console.error("Failed to fetch jobs", err);
            }

            if (isMounted) {
                timeoutId = window.setTimeout(fetchJobs, pollingIntervalMs);
            }
        };

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
