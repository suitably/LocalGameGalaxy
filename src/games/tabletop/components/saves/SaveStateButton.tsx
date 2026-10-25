/**
 * Opens the save dialog of the running table (#538) [ID: COMP-TABLETOP-SAVE-BUTTON]
 */
import React, { useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import SaveIcon from '@mui/icons-material/SaveRounded';
import { useTranslation } from 'react-i18next';
import { useTableSaves } from '../../hooks/useTableSaves';
import type { TabletopGameDefinition } from '../../logic/types';
import { SaveStateDialog } from './SaveStateDialog';

interface Props {
  game: TabletopGameDefinition;
  onLoad: (game: TabletopGameDefinition) => void;
}

export const SaveStateButton: React.FC<Props> = ({ game, onLoad }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const saves = useTableSaves(game, onLoad, open);

  return (
    <>
      <Tooltip title={t('games.tabletop.saves.title')}>
        <IconButton
          onClick={() => setOpen(true)}
          sx={{
            position: 'absolute',
            top: 12,
            right: 64,
            zIndex: 1000,
            bgcolor: 'background.paper',
            opacity: 0.85,
          }}
          aria-label={t('games.tabletop.saves.title')}
        >
          <SaveIcon />
        </IconButton>
      </Tooltip>
      {/* mounted only while open, so each opening starts fresh */}
      {open && (
        <SaveStateDialog open onClose={() => setOpen(false)} gameName={game.name} saves={saves} />
      )}
    </>
  );
};
