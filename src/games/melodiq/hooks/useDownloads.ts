import { useState, useEffect } from 'react';

export interface DownloadJob {
    jobId: string;
    usdbId: string | null;
    artist: string;
    title: string;
    videoMode: string;
    status: 'pending' | 'running' | 'completed' | 'error';
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
                const response = await fetch('/api/usdb/jobs');
                if (response.ok) {
                    const data = await response.json();
                    if (isMounted) {
                        setJobs(data);
                    }
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
