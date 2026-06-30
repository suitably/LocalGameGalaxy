import { useState, useEffect, useRef } from 'react';
import { type Song, getCachedFiles } from '../../db';

export function useMediaLoaders(song: Song, parsedSong: any, isClient: boolean = false) {
    const [audioSrc, setAudioSrc] = useState<string | undefined>();
    const [videoSrc, setVideoSrc] = useState<string | undefined>();
    const [vocalsSrc, setVocalsSrc] = useState<string | undefined>();
    const [needsFolderAccess, setNeedsFolderAccess] = useState(false);
    const [videoError, setVideoError] = useState<string | null>(null);

    // Ref for hidden folder input (Firefox compatible)
    const folderInputRef = useRef<HTMLInputElement>(null);

    // Audio Loader
    useEffect(() => {
        let activeUrl: string | undefined;
        let mounted = true;

        const loadAudio = async () => {
            if (!song.audio || isClient) return;
            try {
                if (song.audio instanceof Blob) {
                    activeUrl = URL.createObjectURL(song.audio);
                } else if (typeof song.audio === 'string') {
                    if (song.audio.startsWith('http://') || song.audio.startsWith('https://') || song.audio.startsWith('blob:') || song.audio.startsWith('/')) {
                        activeUrl = song.audio;

                        if (song.audio.startsWith('/') && !window.location.origin.includes('3000')) {
                            const helperUrl = localStorage.getItem('melodiq_helper_url')?.replace(/\/$/, "") || 'http://localhost:3000';
                            let finalUrl = song.audio.startsWith('http') ? song.audio : `${helperUrl}${song.audio}`;

                            if (finalUrl.includes('/media') && !finalUrl.includes('token=')) {
                                const token = localStorage.getItem('melodiq_helper_token');
                                if (token) {
                                    finalUrl += (finalUrl.includes('?') ? '&' : '?') + `token=${token}`;
                                }
                            }
                            activeUrl = finalUrl;
                        }
                    } else {
                        const cached = getCachedFiles(song.id);
                        if (cached?.audio) {
                            activeUrl = URL.createObjectURL(cached.audio);
                            console.log(`[MelodiqSession] Using cached audio file for ${song.title}:`, cached.audio.name, `(${cached.audio.size} bytes)`);
                        } else {
                            console.warn(`[MelodiqSession] Cache miss for audio: ${song.audio}. ID: ${song.id}`);
                            if (mounted) {
                                setNeedsFolderAccess(true);
                            }
                            return;
                        }
                    }
                } else {
                    // FileSystemFileHandle
                    // @ts-ignore
                    const file = await song.audio.getFile();
                    activeUrl = URL.createObjectURL(file);
                }
            } catch (e) {
                if ((e as Error).name === 'NotAllowedError') {
                    console.debug("Audio permission not granted yet");
                    if (mounted) setNeedsFolderAccess(true);
                } else {
                    console.error("Failed to load audio", e);
                }
            }
            if (mounted) setAudioSrc(activeUrl);
        };
        loadAudio();

        return () => {
            mounted = false;
            if (activeUrl && activeUrl.startsWith('blob:')) {
                URL.revokeObjectURL(activeUrl);
                console.log(`[MelodiqSession] Revoked audio URL: ${activeUrl}`);
            }
        };
    }, [song.audio, song.id, isClient]);

    // Vocals Loader
    useEffect(() => {
        if (!parsedSong?.headers?.VOCALS || typeof song.audio !== 'string') {
            setVocalsSrc(undefined);
            return;
        }

        try {
            let vocalsUrlString = song.audio;
            if (!vocalsUrlString.startsWith('http') && !vocalsUrlString.startsWith('/')) {
                const helperUrl = localStorage.getItem('melodiq_helper_url')?.replace(/\/$/, "") || 'http://localhost:3000';
                vocalsUrlString = `${helperUrl}${vocalsUrlString.startsWith('/') ? '' : '/'}${vocalsUrlString}`;
            } else if (vocalsUrlString.startsWith('/')) {
                const helperUrl = window.location.origin.includes('3000') ? window.location.origin : (localStorage.getItem('melodiq_helper_url')?.replace(/\/$/, "") || 'http://localhost:3000');
                vocalsUrlString = `${helperUrl}${vocalsUrlString}`;
            }

            const url = new URL(vocalsUrlString);
            const pathParam = url.searchParams.get('path');
            if (pathParam) {
                const pathParts = pathParam.split('/');
                pathParts[pathParts.length - 1] = parsedSong.headers.VOCALS;
                url.searchParams.set('path', pathParts.join('/'));
                setVocalsSrc(url.toString());
                console.log("[MelodiqSession] Resolved vocals track URL:", url.toString());
            }
        } catch (e) {
            console.warn("Could not resolve vocals URL", e);
        }
    }, [parsedSong, song.audio]);

    // Video Loader
    useEffect(() => {
        let activeUrl: string | undefined;
        let mounted = true;

        const loadVideo = async () => {
            if (!song.video || isClient) return;
            try {
                let fileOrBlob: Blob | File | null = null;
                let fileName: string = '';

                if (song.video instanceof Blob) {
                    fileOrBlob = song.video;
                    if (song.video instanceof File) {
                        fileName = song.video.name;
                    }
                } else if (typeof song.video === 'string') {
                    if (song.video.startsWith('http') || song.video.startsWith('/') || song.video.startsWith('blob:')) {
                        if (song.video.startsWith('/') && !window.location.origin.includes('3000')) {
                            const helperUrl = localStorage.getItem('melodiq_helper_url')?.replace(/\/$/, "") || 'http://localhost:3000';
                            let finalUrl = `${helperUrl}${song.video}`;
                            if (finalUrl.includes('/media') && !finalUrl.includes('token=')) {
                                const token = localStorage.getItem('melodiq_helper_token');
                                if (token) {
                                    finalUrl += (finalUrl.includes('?') ? '&' : '?') + `token=${token}`;
                                }
                            }
                            activeUrl = finalUrl;
                        } else {
                            activeUrl = song.video;
                        }
                    } else {
                        const cached = getCachedFiles(song.id);
                        if (cached?.video) {
                            fileOrBlob = cached.video;
                            fileName = cached.video.name;
                            console.log(`[MelodiqSession] Using cached video file for ${song.title}:`, fileName, `(${cached.video.size} bytes)`);
                        } else {
                            console.warn("Video file cache miss:", song.video);
                        }
                    }
                } else {
                    // @ts-ignore
                    const fileHandle = await song.video.getFile();
                    fileOrBlob = fileHandle;
                    fileName = fileHandle.name;
                }

                if (fileOrBlob) {
                    let blobToUrl = fileOrBlob;
                    const type = fileOrBlob.type;
                    const name = fileName.toLowerCase();
                    const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

                    if (name.endsWith('.avi') || type.includes('avi') || type === 'video/x-msvideo') {
                        if (isFirefox) {
                            console.warn('[Melodiq] Firefox detected: Skipping AVI-as-MP4 hack to prevent browser crash. Video may not play.');
                        } else {
                            console.log('[Melodiq] Attempting to force-load AVI file by masking as MP4:', name, 'Type:', type);
                            blobToUrl = new Blob([fileOrBlob], { type: 'video/mp4' });
                        }
                    }
                    activeUrl = URL.createObjectURL(blobToUrl);
                }

            } catch (e) {
                if ((e as Error).name !== 'NotAllowedError') {
                    console.error("Failed to load video", e);
                }
            }
            if (mounted) setVideoSrc(activeUrl);
        };
        loadVideo();

        return () => {
            mounted = false;
            if (activeUrl && activeUrl.startsWith('blob:')) {
                URL.revokeObjectURL(activeUrl);
                console.log(`[MelodiqSession] Revoked video URL: ${activeUrl}`);
            }
        };
    }, [song.video, song.id, isClient]);

    // Clear video error on song change
    useEffect(() => {
        setVideoError(null);
    }, [song.id]);

    const handleFolderInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const audioFilename = typeof song.audio === 'string' ? song.audio : null;
        const videoFilename = typeof song.video === 'string' ? song.video : null;

        if (audioFilename && song.dirPath) {
            const targetAudioPath = `${song.dirPath}/${audioFilename}`.replace(/^\.\//, '');

            let audioFile: File | undefined;
            let videoFile: File | undefined;

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const relativePath = file.webkitRelativePath;

                if (relativePath.endsWith(targetAudioPath) || relativePath === targetAudioPath) {
                    audioFile = file;
                }
                if (videoFilename) {
                    const targetVideoPath = `${song.dirPath}/${videoFilename}`.replace(/^\.\//, '');
                    if (relativePath.endsWith(targetVideoPath) || relativePath === targetVideoPath) {
                        videoFile = file;
                    }
                }

                if (audioFile && (!videoFilename || videoFile)) break;
            }

            if (audioFile) {
                setAudioSrc(URL.createObjectURL(audioFile));
                console.log('[Session] Loaded audio from re-selected folder:', audioFile.name);
            } else {
                console.error('Audio file not found in selected folder:', targetAudioPath);
            }

            if (videoFile) {
                setVideoSrc(URL.createObjectURL(videoFile));
                console.log('[Session] Loaded video from re-selected folder:', videoFile.name);
            }
        }

        setNeedsFolderAccess(false);
        e.target.value = '';
    };

    return {
        audioSrc,
        videoSrc,
        vocalsSrc,
        needsFolderAccess,
        videoError,
        setVideoError,
        folderInputRef,
        handleFolderInputChange
    };
}
