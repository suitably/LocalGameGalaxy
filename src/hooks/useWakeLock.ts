import { useEffect, useRef } from 'react';

// Tiny blank 1-frame silent WebM and MP4 video data URIs (NoSleep standard)
const NO_SLEEP_WEBM =
    'data:video/webm;base64,GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQAR3ZWJtQoeBAkKFgQIYU4BnQI0VSalmQCgq17FAAw9CQE2AQAZ3aGFtbXlXQUAGd2hhbW15RIlACECPQAAAAAAAFlSua0AxrkAu14EBY8WBAZyBACK1nEADdW5khkAFVl9WUDglhohAA1ZQOIOBAeBABrCBCLqBCB9DtnVAIueBAKNAHIEAAIAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AAA=';

const NO_SLEEP_MP4 =
    'data:video/mp4;base64,AAAAIGZ0eXBtcDQyAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAACKBtZGF0AAAC8wYF///v3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE0MiByMjQ3OSBkZDc5YTYxIC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxNCAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTEgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MToweDExMSBtZT1oZXggc3VibWU9MiBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0wIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MCA4eDhkY3Q9MCBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0wIHRocmVhZHM9NiBsb29rYWhlYWRfdGhyZWFkcz0xIHNsaWNlZF90aHJlYWRzPTAgbnI9MCBkZWNpbWF0ZT0xIGludGVybGFjZWQ9MCBibHVyYXlfY29tcGF0PTAgY29uc3RyYWluZWRfaW50cmE9MCBiZnJhbWVzPTMgYl9weXJhbWlkPTIgYl9hZGFwdD0xIGJfYmlhcz0wIGRpcmVjdD0xIHdlaWdodGI9MSBvcGVuX2dvcD0wIHdlaWdodHA9MSBrZXlpbnQ9MzAwIGtleWludF9taW49MzAgc2NlbmVjdXQ9NDAgaW50cmFfcmVmcmVzaD0wIHJjX2xvb2thaGVhZD0xMCByYz1jcmYgbWJ0cmVlPTEgY3JmPTIwLjAgcWNvbXA9MC42MCBxcG1pbj0wIHFwbWF4PTY5IHFwc3RlcD00IHZidl9tYXhyYXRlPTIwMDAwIHZidl9idWZzaXplPTI1MDAwIGNyZl9tYXg9MC4wIG5hbF9ocmQ9bm9uZSBmaWxsZXI9MCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAAOWWIhAA3//p+C7v8tDDSTjf97w55i3SbRPO4ZY+hkjD5hbkAkL3zpJ6h/LR1CAABzgB1kqqzUorlhQAAAAxBmiQYhn/+qZYADLgAAAAJQZ5CQhX/AAj5IQADQGgcIQADQGgcAAAACQGeYUQn/wALKCEAA0BoHAAAAAkBnmNEJ/8ACykhAANAaBwhAANAaBwAAAANQZpoNExDP/6plgAMuSEAA0BoHAAAAAtBnoZFESwr/wAI+SEAA0BoHCEAA0BoHAAAAAkBnqVEJ/8ACykhAANAaBwAAAAJAZ6nRCf/AAsoIQADQGgcIQADQGgcAAAADUGarDRMQz/+qZYADLghAANAaBwAAAALQZ7KRRUsK/8ACPkhAANAaBwAAAAJAZ7pRCf/AAsoIQADQGgcIQADQGgcAAAACQGe60Qn/wALKCEAA0BoHAAAAA1BmvA0TEM//qmWAAy5IQADQGgcIQADQGgcAAAAC0GfDkUVLCv/AAj5IQADQGgcAAAACQGfLUQn/wALKSEAA0BoHCEAA0BoHAAAAAkBny9EJ/8ACyghAANAaBwAAAANQZs0NExDP/6plgAMuCEAA0BoHAAAAAtBn1JFFSwr/wAI+SEAA0BoHCEAA0BoHAAAAAkBn3FEJ/8ACyghAANAaBwAAAAJAZ9zRCf/AAsoIQADQGgcIQADQGgcAAAADUGbeDRMQz/+qZYADLkhAANAaBwAAAALQZ+WRRUsK/8ACPghAANAaBwhAANAaBwAAAAJAZ+1RCf/AAspIQADQGgcAAAACQGft0Qn/wALKSEAA0BoHCEAA0BoHAAAAA1Bm7w0TEM//qmWAAy4IQADQGgcAAAAC0Gf2kUVLCv/AAj5IQADQGgcAAAACQGf+UQn/wALKCEAA0BoHCEAA0BoHAAAAAkBn/tEJ/8ACykhAANAaBwAAAANQZvgNExDP/6plgAMuSEAA0BoHCEAA0BoHAAAAAtBnh5FFSwr/wAI+CEAA0BoHAAAAAkBnj1EJ/8ACyghAANAaBwhAANAaBwAAAAJAZ4/RCf/AAspIQADQGgcAAAADUGaJDRMQz/+qZYADLghAANAaBwAAAALQZ5CRRUsK/8ACPkhAANAaBwhAANAaBwAAAAJAZ5hRCf/AAsoIQADQGgcAAAACQGeY0Qn/wALKSEAA0BoHCEAA0BoHAAAAA1Bmmg0TEM//qmWAAy5IQADQGgcAAAAC0GehkUVLCv/AAj5IQADQGgcIQADQGgcAAAACQGepUQn/wALKSEAA0BoHAAAAAkBnqdEJ/8ACyghAANAaBwAAAAN';

/**
 * Universal Screen WakeLock hook.
 *
 * Supports:
 * 1. Native Screen WakeLock API (`navigator.wakeLock`) on Chromium / Firefox / Safari 16.4+ (PWA)
 * 2. Invisible looping dummy video fallback for iOS WebKit (Safari / Chrome for iOS / non-secure contexts)
 *    to prevent device display auto-lock and black screens.
 *
 * @param enabled - Whether the screen lock should be active.
 */
export function useWakeLock(enabled: boolean = true) {
    const sentinelRef = useRef<any>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        if (!enabled) {
            // Clean up native sentinel
            if (sentinelRef.current) {
                sentinelRef.current.release().catch(() => {});
                sentinelRef.current = null;
            }
            // Clean up video fallback
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.removeAttribute('src');
                videoRef.current.load();
                videoRef.current.remove();
                videoRef.current = null;
            }
            return;
        }

        let isMounted = true;

        // 1. Fallback Video Setup (for iOS WebKit / non-native WakeLock browsers)
        const setupVideoFallback = () => {
            if (videoRef.current || !isMounted) return;

            try {
                const video = document.createElement('video');
                video.setAttribute('title', 'Screen Wake Lock');
                video.setAttribute('playsinline', '');
                video.setAttribute('webkit-playsinline', '');
                video.setAttribute('muted', '');
                video.muted = true;
                video.loop = true;
                video.playsInline = true;
                video.autoplay = true;

                // Hidden but rendered so WebKit doesn't pause it
                video.style.position = 'fixed';
                video.style.top = '0px';
                video.style.left = '0px';
                video.style.width = '1px';
                video.style.height = '1px';
                video.style.opacity = '0.01';
                video.style.pointerEvents = 'none';
                video.style.zIndex = '-9999';

                // Provide webm and mp4 sources
                const sourceWebm = document.createElement('source');
                sourceWebm.src = NO_SLEEP_WEBM;
                sourceWebm.type = 'video/webm';
                video.appendChild(sourceWebm);

                const sourceMp4 = document.createElement('source');
                sourceMp4.src = NO_SLEEP_MP4;
                sourceMp4.type = 'video/mp4';
                video.appendChild(sourceMp4);

                document.body.appendChild(video);
                videoRef.current = video;

                const playVideo = () => {
                    if (videoRef.current && videoRef.current.paused) {
                        videoRef.current.play().catch(() => {
                            // Autoplay might require user interaction on iOS
                        });
                    }
                };

                playVideo();

                // Listen for first user interaction if autoplay policy delayed playback
                const interactionEvents = ['touchstart', 'touchend', 'click', 'pointerdown', 'keydown'];
                const handleUserInteraction = () => {
                    playVideo();
                    interactionEvents.forEach((ev) => window.removeEventListener(ev, handleUserInteraction));
                };

                interactionEvents.forEach((ev) => window.addEventListener(ev, handleUserInteraction, { passive: true }));
            } catch (err) {
                console.debug('[useWakeLock] Video fallback setup error:', err);
            }
        };

        // 2. Native WakeLock with graceful fallback
        const requestWakeLock = async () => {
            if ('wakeLock' in navigator) {
                try {
                    const lock = await (navigator as any).wakeLock.request('screen');
                    if (isMounted) {
                        sentinelRef.current = lock;
                        lock.addEventListener('release', () => {
                            sentinelRef.current = null;
                        });
                        return;
                    } else {
                        lock.release().catch(() => {});
                    }
                } catch (err: any) {
                    console.debug('[useWakeLock] Native wake lock rejected, falling back to video:', err.message);
                }
            }

            // Fallback to video wake lock (iOS WebKit / Safari tabs / HTTP LAN)
            setupVideoFallback();
        };

        requestWakeLock();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && enabled) {
                if (!sentinelRef.current) {
                    requestWakeLock();
                }
                if (videoRef.current && videoRef.current.paused) {
                    videoRef.current.play().catch(() => {});
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            isMounted = false;
            document.removeEventListener('visibilitychange', handleVisibilityChange);

            if (sentinelRef.current) {
                sentinelRef.current.release().catch(() => {});
                sentinelRef.current = null;
            }

            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.removeAttribute('src');
                videoRef.current.load();
                videoRef.current.remove();
                videoRef.current = null;
            }
        };
    }, [enabled]);
}
