export interface BrowseResponse {
    current: string;
    dirs: string[];
    error?: string;
}

export interface DownloadDirResponse {
    downloadDir: string | null;
    error?: string;
}

export interface UsdbCredentialsResponse {
    username: string | null;
    hasPassword: boolean;
    error?: string;
}

export type DownloadMode = 'stream' | 'mp4' | 'none';

export interface ServerPreferencesResponse {
    defaultDownloadMode: DownloadMode;
    autoVocalSeparation: boolean;
    error?: string;
}

export type ConfigLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';
