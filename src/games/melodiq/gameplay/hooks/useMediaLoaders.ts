import { useState, useEffect, useRef } from 'react';
import { type Song, getCachedFiles } from '../../db';

export function useMediaLoaders(
    song: Song, 
    parsedSong: any, 
    isClient: boolean = false, 
    audioPlaybackMode: 'separated' | 'original' = 'separated'
) {
    const [audioSrc, setAudioSrc] = useState<string | undefined>();
    const [videoSrc, setVideoSrc] = useState<string | undefined>();
    const [vocalsSrc, setVocalsSrc] = useState<string | undefined>();
    const [needsFolderAccess, setNeedsFolderAccess] = useState(false);
    const [videoError, setVideoError] = useState<string | null>(null);

    // Ref for hidden folder input (Firefox compatible)
    const folderInputRef = useRef<HTMLInputElement>(null);

    const hasSeparation = Boolean(
        song.hasSeparation ||
        song.vocalsAudio ||
        parsedSong?.headers?.VOCALS ||
        (typeof song.audio === 'string' && song.audio.toLowerCase().includes('instrumental'))
    );

    // Helper to resolve an audio/video target (Blob, string, FileSystemHandle, or relative file)
    const resolveMediaTargetUrl = async (
        mediaTarget?: string | Blob | FileSystemFileHandle, 
        fallbackHeaderFilename?: string
    ): Promise<string | undefined> => {
        if (!mediaTarget && !fallbackHeaderFilename) return undefined;

        if (mediaTarget instanceof Blob) {
            return URL.createObjectURL(mediaTarget);
        }

        if (mediaTarget && typeof mediaTarget !== 'string') {
            try {
                // @ts-ignore
                const file = await mediaTarget.getFile();
                return URL.createObjectURL(file);
            } catch (e) {
                return undefined;
            }
        }

        let targetStr = typeof mediaTarget === 'string' ? mediaTarget : '';

        // If no direct target string but fallback header filename provided, resolve against base song.audio
        if (!targetStr && fallbackHeaderFilename && typeof song.audio === 'string') {
            try {
                let baseAudioUrl = song.audio;
                if (!baseAudioUrl.startsWith('http') && !baseAudioUrl.startsWith('/')) {
                    const helperUrl = localStorage.getItem('melodiq_helper_url')?.replace(/\/$/, "") || 'http://localhost:3000';
                    baseAudioUrl = `${helperUrl}/${baseAudioUrl}`;
                } else if (baseAudioUrl.startsWith('/')) {
                    const helperUrl = window.location.origin.includes('3000') ? window.location.origin : (localStorage.getItem('melodiq_helper_url')?.replace(/\/$/, "") || 'http://localhost:3000');
                    baseAudioUrl = `${helperUrl}${baseAudioUrl}`;
                }

                const url = new URL(baseAudioUrl);
                const pathParam = url.searchParams.get('path');
                if (pathParam) {
                    const pathParts = pathParam.split('/');
                    pathParts[pathParts.length - 1] = fallbackHeaderFilename;
                    url.searchParams.set('path', pathParts.join('/'));
                    targetStr = url.toString();
                }
            } catch (e) {
                targetStr = fallbackHeaderFilename;
            }
        }

        if (targetStr) {
            if (targetStr.startsWith('http://') || targetStr.startsWith('https://') || targetStr.startsWith('blob:') || targetStr.startsWith('/')) {
                if (targetStr.startsWith('/') && !window.location.origin.includes('3000')) {
                    const helperUrl = localStorage.getItem('melodiq_helper_url')?.replace(/\/$/, "") || 'http://localhost:3000';
                    let finalUrl = targetStr.startsWith('http') ? targetStr : `${helperUrl}${targetStr}`;

                    if (finalUrl.includes('/media') && !finalUrl.includes('token=')) {
                        const token = localStorage.getItem('melodiq_helper_token');
                        if (token) {
                            finalUrl += (finalUrl.includes('?') ? '&' : '?') + `token=${token}`;
                        }
                    }
                    return finalUrl;
                }
                return targetStr;
            } else {
                const cached = getCachedFiles(song.id);
                if (cached?.audio) {
                    return URL.createObjectURL(cached.audio);
                }
            }
        }
        return undefined;
    };

    // Audio & Vocals Loader
    useEffect(() => {
        let activeAudioUrl: string | undefined;
        let activeVocalsUrl: string | undefined;
        let mounted = true;

        const loadMediaTracks = async () => {
            if (isClient) return;

            const isSeparatedMode = audioPlaybackMode === 'separated' && hasSeparation;

            try {
                if (isSeparatedMode) {
                    // 1. Load Instrumental as primary audio track
                    const instrumentalTarget = song.instrumentalAudio || (typeof song.audio === 'string' && song.audio.includes('Instrumental') ? song.audio : undefined);
                    const instrumentalHeader = parsedSong?.headers?.INSTRUMENTAL || parsedSong?.headers?.MP3;
                    activeAudioUrl = await resolveMediaTargetUrl(instrumentalTarget || song.audio, instrumentalHeader);

                    // 2. Load Vocals as secondary track
                    const vocalsTarget = song.vocalsAudio;
                    const vocalsHeader = parsedSong?.headers?.VOCALS;
                    activeVocalsUrl = await resolveMediaTargetUrl(vocalsTarget, vocalsHeader);
                } else {
                    // Original Audio Mode: load untouched original mix, no secondary vocal track
                    const originalTarget = song.originalAudio || (typeof song.audio === 'string' && !song.audio.includes('Instrumental') ? song.audio : undefined);
                    const originalHeader = parsedSong?.headers?.ORIGINAL || parsedSong?.headers?.MP3;
                    activeAudioUrl = await resolveMediaTargetUrl(originalTarget || song.audio, originalHeader);
                    activeVocalsUrl = undefined;
                }

                if (!activeAudioUrl && song.audio) {
                    // Fallback to default audio
                    activeAudioUrl = await resolveMediaTargetUrl(song.audio);
                }
            } catch (e) {
                if ((e as Error).name === 'NotAllowedError') {
                    console.debug("Audio permission not granted yet");
                    if (mounted) setNeedsFolderAccess(true);
                } else {
                    console.error("Failed to load audio tracks", e);
                }
            }

            if (mounted) {
                setAudioSrc(activeAudioUrl);
                setVocalsSrc(activeVocalsUrl);
            }
        };

        loadMediaTracks();

        return () => {
            mounted = false;
            if (activeAudioUrl && activeAudioUrl.startsWith('blob:')) {
                URL.revokeObjectURL(activeAudioUrl);
            }
            if (activeVocalsUrl && activeVocalsUrl.startsWith('blob:')) {
                URL.revokeObjectURL(activeVocalsUrl);
            }
        };
    }, [song.audio, song.originalAudio, song.instrumentalAudio, song.vocalsAudio, song.id, isClient, audioPlaybackMode, hasSeparation, parsedSong]);

    // Video Loader
    useEffect(() => {
        let activeUrl: string | undefined;
        let mounted = true;

        const loadVideo = async () => {
            const targetVideo = song.video || parsedSong?.headers?.VIDEO;
            if (!targetVideo || isClient) return;
            try {
                let fileOrBlob: Blob | File | null = null;
                let fileName: string = '';

                if (targetVideo instanceof Blob) {
                    fileOrBlob = targetVideo;
                    if (targetVideo instanceof File) {
                        fileName = targetVideo.name;
                    }
                } else if (typeof targetVideo === 'string') {
                    if (targetVideo.startsWith('http') || targetVideo.startsWith('/') || targetVideo.startsWith('blob:')) {
                        if (targetVideo.startsWith('/') && !window.location.origin.includes('3000')) {
                            const helperUrl = localStorage.getItem('melodiq_helper_url')?.replace(/\/$/, "") || 'http://localhost:3000';
                            let finalUrl = `${helperUrl}${targetVideo}`;
                            if (finalUrl.includes('/media') && !finalUrl.includes('token=')) {
                                const token = localStorage.getItem('melodiq_helper_token');
                                if (token) {
                                    finalUrl += (finalUrl.includes('?') ? '&' : '?') + `token=${token}`;
                                }
                            }
                            activeUrl = finalUrl;
                        } else {
                            activeUrl = targetVideo;
                        }
                    } else if (typeof song.audio === 'string' && (song.audio.startsWith('http') || song.audio.startsWith('/'))) {
                        // Resolve relative video filename against song.audio URL (same as vocals loader)
                        try {
                            let baseAudioUrl = song.audio;
                            if (!baseAudioUrl.startsWith('http') && !baseAudioUrl.startsWith('/')) {
                                const helperUrl = localStorage.getItem('melodiq_helper_url')?.replace(/\/$/, "") || 'http://localhost:3000';
                                baseAudioUrl = `${helperUrl}/${baseAudioUrl}`;
                            } else if (baseAudioUrl.startsWith('/')) {
                                const helperUrl = window.location.origin.includes('3000') ? window.location.origin : (localStorage.getItem('melodiq_helper_url')?.replace(/\/$/, "") || 'http://localhost:3000');
                                baseAudioUrl = `${helperUrl}${baseAudioUrl}`;
                            }
                            const url = new URL(baseAudioUrl);
                            const pathParam = url.searchParams.get('path');
                            if (pathParam) {
                                const pathParts = pathParam.split('/');
                                pathParts[pathParts.length - 1] = targetVideo;
                                url.searchParams.set('path', pathParts.join('/'));
                                activeUrl = url.toString();
                            } else {
                                activeUrl = targetVideo;
                            }
                        } catch (e) {
                            activeUrl = targetVideo;
                        }
                    } else {
                        const cached = getCachedFiles(song.id);
                        if (cached?.video) {
                            fileOrBlob = cached.video;
                            fileName = cached.video.name;
                            console.log(`[MelodiqSession] Using cached video file for ${song.title}:`, fileName, `(${cached.video.size} bytes)`);
                        } else {
                            console.warn("Video file cache miss:", targetVideo);
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
        hasSeparation,
        needsFolderAccess,
        videoError,
        setVideoError,
        folderInputRef,
        handleFolderInputChange
    };
}
