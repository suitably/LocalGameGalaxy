import { useState, useEffect } from 'react';

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
                // Read config from storage
                const url = localStorage.getItem('melodiq_helper_url') || 'http://localhost:3000';
                const token = localStorage.getItem('melodiq_helper_token') || '';
                const helperUrl = url.replace(/\/$/, "");

                const responseUsdb = await fetch(`${helperUrl}/api/usdb/jobs`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const responseSeparator = await fetch(`${helperUrl}/api/separator/jobs`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (responseUsdb.ok && responseSeparator.ok) {
                    const dataUsdb = await responseUsdb.json();
                    const dataSeparator = await responseSeparator.json();
                    if (isMounted) {
                        setJobs([...dataUsdb, ...dataSeparator]);
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
