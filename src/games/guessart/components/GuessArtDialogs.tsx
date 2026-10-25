import React from 'react';
import { GameInfoDialog } from './GameInfoDialog';
import { RoundHistoryDialog } from './RoundHistoryDialog';
import { EditGameDialog } from './EditGameDialog';
import { SharePlayerLinksDialog } from './SharePlayerLinksDialog';
import { CatalogueEditorDialog } from './catalogue/CatalogueEditorDialog';
import type { GuessArtGameRecord, GuessArtRound } from '../logic/types';

type EditProps = React.ComponentProps<typeof EditGameDialog>;

interface GuessArtDialogsProps {
  infoOpen: boolean;
  onCloseInfo: () => void;
  catalogueEditorOpen: boolean;
  onCloseCatalogue: () => void;
  historyOpen: boolean;
  onCloseHistory: () => void;
  historyGameId: string | null;
  historyPlayers: React.ComponentProps<typeof RoundHistoryDialog>['players'];
  editDialogOpen: boolean;
  onCloseEdit: () => void;
  editGame: GuessArtGameRecord | null;
  isHost: boolean;
  localPlayerIds: string[];
  onSaveEdit: EditProps['onSave'];
  shareDialogOpen: boolean;
  onCloseShare: () => void;
  onPlayerChanged: () => Promise<void>;
  shareGame: GuessArtGameRecord | null;
  shareRound: GuessArtRound | null;
}

/** Dialogs shared by the lobby and the running game (info, history, edit, catalogue, share). */
export const GuessArtDialogs: React.FC<GuessArtDialogsProps> = (p) => (
  <>
    <GameInfoDialog open={p.infoOpen} onClose={p.onCloseInfo} />
    <CatalogueEditorDialog open={p.catalogueEditorOpen} onClose={p.onCloseCatalogue} />
    <EditGameDialog
      open={p.editDialogOpen}
      onClose={p.onCloseEdit}
      game={p.editGame}
      isHost={p.isHost}
      localPlayerIds={p.localPlayerIds}
      onSave={p.onSaveEdit}
    />
    <RoundHistoryDialog
      open={p.historyOpen}
      onClose={p.onCloseHistory}
      gameId={p.historyGameId}
      players={p.historyPlayers}
    />
    <SharePlayerLinksDialog
      open={p.shareDialogOpen}
      onClose={p.onCloseShare}
      onPlayerChanged={p.onPlayerChanged}
      game={p.shareGame}
      round={p.shareRound}
    />
  </>
);
