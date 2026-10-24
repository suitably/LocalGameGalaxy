import React from 'react';
import { Box, Container, Divider, Paper } from '@mui/material';
import { PartyGamePickerModal } from './components/PartyGamePickerModal';
import { EditPlayerNameDialog, EditRoomCodeDialog } from './components/PartySettingsDialogs';
import { PartyActiveGameBanner } from './components/PartyActiveGameBanner';
import { PartyPendingGame } from './components/PartyPendingGame';
import { PartyRoomHeader } from './components/PartyRoomHeader';
import { PartyRemovedNotice } from './components/PartyRemovedNotice';
import { PartyServerInfoCard } from './components/PartyServerInfoCard';
import { PartyShareCard } from './components/PartyShareCard';
import { PartyPlayerRoster } from './components/PartyPlayerRoster';
import { PartyGameSelection } from './components/PartyGameSelection';
import { usePartyLobbyController } from './hooks/usePartyLobbyController';

interface PartyLobbyProps {
  initialRoomId?: string;
}

export const PartyLobby: React.FC<PartyLobbyProps> = ({ initialRoomId }) => {
  const lobby = usePartyLobbyController(initialRoomId);
  const {
    editRoomOpen,
    setEditRoomOpen,
    customRoomInput,
    setCustomRoomInput,
    editNameOpen,
    setEditNameOpen,
    editNameInput,
    setEditNameInput,
    pickerOpen,
    setPickerOpen,
    handleSaveName,
    handleSaveCustomRoom,
    handleLaunchGame,
  } = lobby;

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        py: { xs: 1.5, sm: 3 },
        px: { xs: 1, sm: 2 },
      }}
    >
      <Container maxWidth="md" disableGutters>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3.5 },
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {lobby.removed ? (
            <PartyRemovedNotice lobby={lobby} />
          ) : (
            <>
              <PartyActiveGameBanner lobby={lobby} />

              <PartyRoomHeader lobby={lobby} />

              <PartyPendingGame lobby={lobby} />

              <PartyServerInfoCard lobby={lobby} />

              <PartyShareCard lobby={lobby} />

              <PartyPlayerRoster lobby={lobby} />

              <Divider sx={{ my: 3 }} />

              <PartyGameSelection lobby={lobby} />
            </>
          )}
        </Paper>

        <EditPlayerNameDialog
          open={editNameOpen}
          onClose={() => setEditNameOpen(false)}
          value={editNameInput}
          onChange={setEditNameInput}
          onSave={handleSaveName}
        />

        <EditRoomCodeDialog
          open={editRoomOpen}
          onClose={() => setEditRoomOpen(false)}
          value={customRoomInput}
          onChange={setCustomRoomInput}
          onSave={handleSaveCustomRoom}
        />

        <PartyGamePickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelectGame={handleLaunchGame}
        />
      </Container>
    </Box>
  );
};
