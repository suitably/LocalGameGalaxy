import { forwardRef, type ComponentProps } from 'react';
import { Box } from '@mui/material';
import { PhoneTrackChoiceOverlay } from '../gameplay/components/PhoneTrackChoiceOverlay';
import { MelodiqSession, type MelodiqSessionHandle } from '../gameplay/MelodiqSession';

interface PersistentSessionLayerProps extends ComponentProps<typeof MelodiqSession> {
  /** Session is shown full screen; otherwise it stays mounted but hidden. */
  visible: boolean;
}

/** Full-screen container that keeps the MelodiqSession mounted while the user browses. */
export const PersistentSessionLayer = forwardRef<MelodiqSessionHandle, PersistentSessionLayerProps>(
  ({ visible, ...sessionProps }, ref) => (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pt: 'var(--safe-area-inset-top, env(safe-area-inset-top, 0px))',
        pb: 'var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))',
        pl: 'var(--safe-area-inset-left, env(safe-area-inset-left, 0px))',
        pr: 'var(--safe-area-inset-right, env(safe-area-inset-right, 0px))',
        zIndex: visible ? 1400 : -1, // Below everything if hidden
        visibility: visible ? 'visible' : 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <MelodiqSession ref={ref} {...sessionProps} />
      {sessionProps.isClient && (
        <PhoneTrackChoiceOverlay
          song={sessionProps.song}
          clientDeviceId={sessionProps.clientDeviceId}
          activeSessionOverride={sessionProps.activeSessionOverride}
        />
      )}
    </Box>
  ),
);

PersistentSessionLayer.displayName = 'PersistentSessionLayer';
