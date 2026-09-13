import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Box, Typography, Snackbar, Alert } from '@mui/material';
import { YouTubeBackgroundPlayer, getYouTubeVideoId } from '../YouTubeBackgroundPlayer';

export interface SessionBackgroundMediaProps {
    videoSrc?: string | null;
    hideBackgroundVideo?: boolean;
    fallbackBackgroundUrl?: string;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    initialTime?: number;
    videoError: string | null;
    showVideoErrors?: boolean;
    setVideoError: (err: string | null) => void;
    passivePlayBlocked: boolean;
    isPassive: boolean;
    onPassiveUnblock: () => void;
}

export const SessionBackgroundMedia: React.FC<SessionBackgroundMediaProps> = ({
    videoSrc,
    hideBackgroundVideo = false,
    fallbackBackgroundUrl,
    videoRef,
    initialTime,
    videoError,
    showVideoErrors = false,
    setVideoError,
    passivePlayBlocked,
    isPassive,
    onPassiveUnblock
}) => {
    const youTubeVideoId = useMemo(() => getYouTubeVideoId(videoSrc || undefined), [videoSrc]);
    const [youTubeFailed, setYouTubeFailed] = useState(false);

    useEffect(() => {
        setYouTubeFailed(false);
    }, [videoSrc]);

    const handleYouTubeError = useCallback((err: any) => {
        console.warn("YouTube video player reported:", err);
        if (err === 101 || err === 150 || err === 100 || err === 2) {
            setYouTubeFailed(true);
            setVideoError(err === 101 || err === 150 
                ? "Video embedding disabled by YouTube owner" 
                : "YouTube video not available");
        }
    }, [setVideoError]);

    return (
        <>
            {videoSrc && !hideBackgroundVideo && (
                youTubeVideoId && !youTubeFailed ? (
                    <YouTubeBackgroundPlayer
                        key={youTubeVideoId}
                        videoId={youTubeVideoId}
                        videoRef={videoRef}
                        initialTime={initialTime}
                        onError={handleYouTubeError}
                    />
                ) : (
                    <video
                        ref={videoRef}
                        src={videoSrc}
                        muted
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            zIndex: 0,
                            opacity: 1.0
                        }}
                        onError={(e) => {
                            console.warn("Video playback failed.", e);
                            if (videoError !== "Video format not supported") {
                                setVideoError("Video format not supported");
                            }
                        }}
                    />
                )
            )}
            {(!videoSrc || (youTubeVideoId && youTubeFailed)) && !hideBackgroundVideo && fallbackBackgroundUrl && (
                fallbackBackgroundUrl.match(/\.(mp4|webm|mov|ogg)$/i) ? (
                    <video
                        src={fallbackBackgroundUrl}
                        autoPlay
                        loop
                        muted
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            zIndex: 0,
                            opacity: 1.0
                        }}
                    />
                ) : (
                    <img
                        src={fallbackBackgroundUrl}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            zIndex: 0,
                            opacity: 1.0
                        }}
                        alt="Background"
                    />
                )
            )}

            <Snackbar
                open={!!videoError && showVideoErrors}
                autoHideDuration={6000}
                onClose={() => setVideoError(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={() => setVideoError(null)} severity="warning" sx={{ width: '100%' }}>
                    {videoError}
                </Alert>
            </Snackbar>

            {passivePlayBlocked && isPassive && (
                <Box
                    onClick={onPassiveUnblock}
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 100,
                        bgcolor: 'rgba(0,0,0,0.85)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        gap: 2
                    }}
                >
                    <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold' }}>
                        🔇 Audio blocked
                    </Typography>
                    <Typography variant="h5" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Tap anywhere to start playback
                    </Typography>
                </Box>
            )}
        </>
    );
};
