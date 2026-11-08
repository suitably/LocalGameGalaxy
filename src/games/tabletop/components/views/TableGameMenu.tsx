/**
 * Game menu of the running table: back to the lobby, save/load, restart [ID: COMP-TABLETOP-GAME-MENU]
 *
 * One labelled menu instead of two look-alike round icons, so a restart is never one stray
 * tap away; restarting still asks first.
 */
import React, { useState } from 'react';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVertRounded';
import SaveIcon from '@mui/icons-material/SaveRounded';
import ReplayIcon from '@mui/icons-material/ReplayRounded';
import GroupsIcon from '@mui/icons-material/GroupsRounded';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';
import { useTableSaves } from '../../hooks/useTableSaves';
import type { TableOrigin } from '../../logic/gameSource';
import type { TabletopGameDefinition } from '../../logic/types';
import { SaveStateDialog } from '../saves/SaveStateDialog';

interface TableGameMenuProps {
  game: TabletopGameDefinition;
  /** Where the game comes from; device-only and starter games get local default templates. */
  origin: TableOrigin | null;
  onLoad: (game: TabletopGameDefinition) => void;
  onRestart: () => void;
  /** TV host in a party: back to the lobby for everyone. */
  onBackToLobby?: () => void;
}

export const TableGameMenu: React.FC<TableGameMenuProps> = ({
  game,
  origin,
  onLoad,
  onRestart,
  onBackToLobby,
}) => {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [dialog, setDialog] = useState<'saves' | 'restart' | null>(null);
  const saves = useTableSaves(game, origin, onLoad, dialog === 'saves');
  const open = (which: 'saves' | 'restart') => {
    setAnchor(null);
    setDialog(which);
  };

  return (
    <>
      <Tooltip title={t('games.tabletop.gameMenu')}>
        <IconButton
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 1000,
            bgcolor: 'background.paper',
          }}
          aria-label={t('games.tabletop.gameMenu')}
          aria-haspopup="menu"
        >
          <MoreVertIcon />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {onBackToLobby && (
          <MenuItem
            onClick={() => {
              setAnchor(null);
              onBackToLobby();
            }}
          >
            <ListItemIcon>
              <GroupsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('party.backToLobby')}</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => open('saves')}>
          <ListItemIcon>
            <SaveIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('games.tabletop.saves.title')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => open('restart')}>
          <ListItemIcon>
            <ReplayIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('games.tabletop.restart')}</ListItemText>
        </MenuItem>
      </Menu>
      {/* mounted only while open, so each opening starts fresh */}
      {dialog === 'saves' && (
        <SaveStateDialog open onClose={() => setDialog(null)} gameName={game.name} saves={saves} />
      )}
      <ConfirmDialog
        open={dialog === 'restart'}
        title={t('games.tabletop.restart')}
        message={t('games.tabletop.restart_confirm')}
        confirmColor="warning"
        onConfirm={() => {
          setDialog(null);
          onRestart();
        }}
        onCancel={() => setDialog(null)}
      />
    </>
  );
};
