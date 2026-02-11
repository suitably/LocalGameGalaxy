import React, { useEffect, useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import CastIcon from '@mui/icons-material/Cast';
import CastConnectedIcon from '@mui/icons-material/CastConnected';

/**
 * CastButton integrates with the Google Cast Web Sender SDK.
 * It initializes the Cast framework and provides a simple button
 * to start/stop casting the browser tab to a Chromecast-compatible device.
 *
 * The Cast SDK must be loaded in index.html:
 * <script src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1"></script>
 */
export const CastButton: React.FC = () => {
    const [castAvailable, setCastAvailable] = useState(false);
    const [isCasting, setIsCasting] = useState(false);

    useEffect(() => {
        // Wait for Cast API to become available
        const initCast = () => {
            const cast = (window as any).cast;
            const chrome = (window as any).chrome;

            if (!cast?.framework || !chrome?.cast) {
                console.log('[Cast] Cast SDK not available yet');
                return;
            }

            const castContext = cast.framework.CastContext.getInstance();

            castContext.setOptions({
                receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
                autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
            });

            setCastAvailable(true);

            // Listen for session state changes
            castContext.addEventListener(
                cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
                (event: any) => {
                    const sessionState = event.sessionState;
                    const connected =
                        sessionState === cast.framework.SessionState.SESSION_STARTED ||
                        sessionState === cast.framework.SessionState.SESSION_RESUMED;
                    setIsCasting(connected);
                    console.log('[Cast] Session state:', sessionState, 'Connected:', connected);
                }
            );
        };

        // The __onGCastApiAvailable callback is how Google's SDK signals readiness
        (window as any).__onGCastApiAvailable = (isAvailable: boolean) => {
            if (isAvailable) {
                initCast();
            }
        };

        // If the SDK was loaded before this component mounted
        if ((window as any).cast?.framework) {
            initCast();
        }

        return () => {
            // Cleanup: Don't set callback to null as other components might need it
        };
    }, []);

    const handleCastClick = () => {
        const cast = (window as any).cast;
        if (!cast?.framework) return;

        const castContext = cast.framework.CastContext.getInstance();

        if (isCasting) {
            // End session
            castContext.endCurrentSession(true);
        } else {
            // Request session (shows device picker)
            castContext.requestSession().catch((err: any) => {
                console.warn('[Cast] Request session failed:', err);
            });
        }
    };

    if (!castAvailable) return null;

    return (
        <Tooltip title={isCasting ? 'Stop Casting' : 'Cast to TV'}>
            <IconButton color="inherit" onClick={handleCastClick}>
                {isCasting ? <CastConnectedIcon /> : <CastIcon />}
            </IconButton>
        </Tooltip>
    );
};
