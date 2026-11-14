import React, { forwardRef } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { ScoreBoard } from './ScoreBoard';
import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { useMelodiqSessionCore } from './hooks/useMelodiqSessionCore';
import { SessionStage } from './components/SessionStage';
import { SessionFolderPrompt } from './components/SessionFolderPrompt';
import type { MelodiqSessionHandle, MelodiqSessionProps } from './types';

export type { MelodiqSessionHandle, MelodiqSessionProps } from './types';

const MelodiqSessionContent = forwardRef(
  (props: MelodiqSessionProps, ref: React.ForwardedRef<MelodiqSessionHandle>): React.ReactNode => {
    const { song, onExit, onMinimize, isPassive = false, suppressResults = false } = props;
    const core = useMelodiqSessionCore(props, ref);
    const { parsedSong, contentLoading, loadError, needsFolderAccess, folderInputRef } = core;
    const { handleFolderInputChange, audioCtrl, players, ready, results } = core;

    if (loadError) {
      return (
        <Box
          sx={{
            bgcolor: 'black',
            height: '100vh',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            p: 3,
          }}
        >
          <Typography variant="h6" color="error" align="center">
            {loadError}
          </Typography>
          <Button variant="contained" onClick={() => onExit(true)}>
            Go Back
          </Button>
        </Box>
      );
    }

    if (!audioCtrl.isPausedForScore && (!ready || contentLoading || !parsedSong)) {
      return (
        <Box
          sx={{
            bgcolor: 'black',
            height: '100vh',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography>Loading...</Typography>
        </Box>
      );
    }

    if (needsFolderAccess) {
      return (
        <SessionFolderPrompt
          artist={song.artist}
          title={song.title}
          folderInputRef={folderInputRef}
          onFolderInputChange={handleFolderInputChange}
          onExit={onExit}
        />
      );
    }

    if (audioCtrl.isFinished && !suppressResults) {
      return (
        <ScoreBoard
          players={
            results.length > 0
              ? results
              : players.map((p) => ({
                  config: p.config,
                  score: p.score,
                  history: [],
                  isNewRecord: false,
                }))
          }
          onExit={onExit}
          isPassive={isPassive}
          onMinimize={onMinimize}
        />
      );
    }
    return <SessionStage session={props} core={core} />;
  },
);
MelodiqSessionContent.displayName = 'MelodiqSessionContent';

export const MelodiqSession = forwardRef<MelodiqSessionHandle, MelodiqSessionProps>(
  (props, ref) => (
    <ErrorBoundary
      fallback={
        <Box
          sx={{
            bgcolor: 'black',
            height: '100vh',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="h5" color="error">
            Session Crashed
          </Typography>
          <Button onClick={() => props.onExit(true)} sx={{ mt: 2 }} variant="contained">
            Exit
          </Button>
        </Box>
      }
    >
      <MelodiqSessionContent {...props} ref={ref} />
    </ErrorBoundary>
  ),
);
MelodiqSession.displayName = 'MelodiqSession';
