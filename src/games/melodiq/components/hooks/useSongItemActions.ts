import type { SongMeta } from '../../db';
import type { UsdbSongItem } from '../../types';
import type { DownloadJob } from '../../hooks/useDownloads';

interface UseSongItemActionsProps {
    song: UsdbSongItem;
    songs: SongMeta[];
    jobs: DownloadJob[];
    isSinger?: boolean;
    canDownload?: boolean;
    handleSelectSong: (song: SongMeta) => void;
    handleDownloadAndQueue: (song: UsdbSongItem) => void;
    handleDownloadOnly: (song: UsdbSongItem) => void;
}

export function getSongItemActions({
    song,
    songs,
    jobs,
    isSinger,
    canDownload = true,
    handleSelectSong,
    handleDownloadAndQueue,
    handleDownloadOnly
}: UseSongItemActionsProps) {
    const localSong = songs.find(s =>
        s.title.toLowerCase() === song.title.toLowerCase() &&
        s.artist.toLowerCase() === song.artist.toLowerCase()
    );

    const activeJob = jobs.find(j =>
        j.usdbId === song.usdbId &&
        (j.status === 'pending' || j.status === 'running')
    );

    const isDownloaded = !!localSong;
    const isDownloading = !!(activeJob && !isDownloaded);
    const progress = activeJob ? activeJob.progress : 0;

    const displaySong = localSong || song;

    const onClick = () => {
        if (isSinger) return;
        if (isDownloaded && localSong) {
            handleSelectSong(localSong);
        } else if (!isDownloading && !isDownloaded && canDownload) {
            handleDownloadAndQueue(song);
        }
    };

    let onActionClick = undefined;
    if (canDownload && !isSinger) {
        onActionClick = () => {
            if (!isDownloading && !isDownloaded) handleDownloadOnly(song);
        };
    }

    return {
        song: displaySong,
        localSong,
        isDownloaded,
        isDownloading,
        progress,
        onClick,
        onActionClick
    };
}
