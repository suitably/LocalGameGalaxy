import React, { useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { StoryHeader } from './StoryHeader';
import { StoryWriterView } from './StoryWriterView';
import { WaitingForStoryTurnView } from './WaitingForStoryTurnView';
import { StoryReaderModal } from './StoryReaderModal';
import { EditStoryDialog } from './EditStoryDialog';
import { ShareStoryLinksDialog } from './ShareStoryLinksDialog';
import { LocalStoryEngine } from '../logic/engine';
import { PlayerJoinedSnackbar } from '../../../modules/player-management/PlayerJoinedSnackbar';
import type { StoryEntry, StoryGameRecord } from '../types';

interface StoryActiveViewProps {
  game: StoryGameRecord;
  entries: StoryEntry[];
  gameLoading: boolean;
  readerOpen: boolean;
  setReaderOpen: (open: boolean) => void;
  joinedNames: string[];
  clearJoined: () => void;
  isCurrentTurnLocal: boolean;
  claimPlayer: React.ComponentProps<typeof WaitingForStoryTurnView>['onClaimPlayer'];
  toggleCurrentTurn: () => void;
  onExit: () => void;
  onSubmitTurn: (text: string, timeSpentSeconds?: number) => Promise<void>;
  onFinishStory: () => Promise<void>;
  broadcastSnapshot: (game: StoryGameRecord, entries: StoryEntry[]) => void;
}

/** Running-story screen: header, writer/waiting view and the story dialogs. */
export const StoryActiveView: React.FC<StoryActiveViewProps> = ({
  game,
  entries,
  gameLoading,
  readerOpen,
  setReaderOpen,
  joinedNames,
  clearJoined,
  isCurrentTurnLocal,
  claimPlayer,
  toggleCurrentTurn,
  onExit,
  onSubmitTurn,
  onFinishStory,
  broadcastSnapshot,
}) => {
  const [editOpen, setEditOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <StoryHeader
        game={game}
        onExit={onExit}
        onOpenReader={() => setReaderOpen(true)}
        onOpenEdit={() => setEditOpen(true)}
        onOpenShare={() => setShareDialogOpen(true)}
        isCurrentTurnLocal={isCurrentTurnLocal}
        canToggleLocalRemote={true}
        onToggleLocalRemote={toggleCurrentTurn}
      />

      <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {gameLoading && !game ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress />
          </Box>
        ) : !isCurrentTurnLocal ? (
          <WaitingForStoryTurnView
            game={game}
            onClaimPlayer={claimPlayer}
            onShareTurn={() => setShareDialogOpen(true)}
            onOpenShare={() => setShareDialogOpen(true)}
            onOpenReader={() => setReaderOpen(true)}
          />
        ) : (
          <StoryWriterView
            game={game}
            entries={entries}
            onSubmitTurn={onSubmitTurn}
            onFinishStory={onFinishStory}
            loading={gameLoading}
          />
        )}
      </Box>

      <PlayerJoinedSnackbar names={joinedNames} onClose={clearJoined} />
      <StoryReaderModal
        open={readerOpen}
        onClose={() => setReaderOpen(false)}
        game={game}
        entries={entries}
      />

      <EditStoryDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        game={game}
        onSave={async (payload) => {
          const updated = await LocalStoryEngine.updateGameDetails(game.id, payload);
          broadcastSnapshot(updated.game, updated.entries);
        }}
      />

      <ShareStoryLinksDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        game={game}
        entries={entries}
        onPlayerChanged={async () => {
          const snap = await LocalStoryEngine.getGameSnapshot(game.id);
          broadcastSnapshot(snap.game, snap.entries);
        }}
      />
    </Box>
  );
};
