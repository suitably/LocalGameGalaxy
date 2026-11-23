/**
 * Host views of a room [ID: COMP-TABLETOP-HOST]
 *
 * `role=tv`: the shared table (editor, no hand). `role=tv&seat=N`: the host plays seat N with its
 * own hand on this device (phone controller) while the table is shown on a TV (`role=screen`).
 * Both keep the owner menu and offer "Show on TV" and the switch between the two.
 */
import React, { useState } from 'react';
import { Box } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TvThemeProvider } from '../../../../components/common/TvThemeProvider';
import { ShowOnTvDialog } from '../../../../components/common/ShowOnTvDialog';
import { universalPartyManager } from '../../../../features/party/logic/universalPartyManager';
import type { TabletopAction, TabletopGameState } from '../../logic/tabletopReducer';
import type { TabletopSyncAction } from '../../logic/syncProtocol';
import { buildScreenRoute, hostSeatFromRoster, withHostSeat } from '../../logic/tabletopRoute';
import { TabletopEditor } from '../editor/TabletopEditor';
import { TabletopControllerView } from '../controller/TabletopControllerView';
import { TableGameMenu } from './TableGameMenu';

type OwnerMenuProps = Omit<React.ComponentProps<typeof TableGameMenu>, 'onBack'>;

interface TabletopHostViewProps {
  roomId: string;
  gameId: string;
  /** The host's own seat, `null` = table only. */
  seat: number | null;
  state: TabletopGameState;
  dispatch: React.Dispatch<TabletopAction>;
  /** Applies locally and broadcasts (host state is the truth). */
  syncedDispatch: React.Dispatch<TabletopAction>;
  broadcastAction: (action: TabletopSyncAction) => void;
  ownerMenu: OwnerMenuProps;
  tableSettings: { tableSettingsOpen: boolean; onCloseTableSettings: () => void };
  onBackToLobby: () => void;
}

export const TabletopHostView: React.FC<TabletopHostViewProps> = ({
  roomId,
  gameId,
  seat,
  state,
  dispatch,
  syncedDispatch,
  broadcastAction,
  ownerMenu,
  tableSettings,
  onBackToLobby,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tvOpen, setTvOpen] = useState(false);

  const switchSeat = (next: number | null) =>
    navigate({ search: withHostSeat(searchParams, next) }, { replace: true });
  const playAlong = () =>
    switchSeat(
      hostSeatFromRoster(
        universalPartyManager.getRoomState()?.players,
        universalPartyManager.getMyPlayerId(),
      ),
    );

  const menu = (
    <>
      <TableGameMenu
        {...ownerMenu}
        onBack={onBackToLobby}
        onBackToLobby={onBackToLobby}
        onShowOnTv={() => setTvOpen(true)}
        onPlayAlong={seat === null ? playAlong : undefined}
        onShowTableOnly={seat !== null ? () => switchSeat(null) : undefined}
      />
      <ShowOnTvDialog
        open={tvOpen}
        onClose={() => setTvOpen(false)}
        screenRoute={buildScreenRoute(roomId, gameId)}
        mirrorSafe={seat === null}
      />
    </>
  );

  if (seat !== null) {
    return (
      <>
        {menu}
        <TabletopControllerView
          state={state}
          dispatch={syncedDispatch}
          mySeat={seat}
          onFlickCardToTable={(cardId, targetHolderId) => {
            // host state is the truth: apply locally, the delta broadcasts it
            broadcastAction({
              type: 'FLICK_CARD_TO_TABLE',
              cardId,
              targetHolderId,
              senderSeat: seat,
            });
            dispatch({ type: 'ANIMATE_CARD_TO_TABLE', payload: { cardId, targetHolderId } });
          }}
        />
      </>
    );
  }

  return (
    <TvThemeProvider>
      <Box position="relative" width="100%" height="100%">
        {menu}
        <TabletopEditor state={state} dispatch={syncedDispatch} isTvMode {...tableSettings} />
      </Box>
    </TvThemeProvider>
  );
};
