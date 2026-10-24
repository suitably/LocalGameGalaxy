import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { CardPlayer } from '../../logic/types';

interface CardScoreHistoryDialogProps {
  open: boolean;
  title: string;
  maxWidth?: 'xs' | 'sm' | 'md';
  onClose: () => void;
  children: React.ReactNode;
}

/** Dialog shell with a title, scrollable content and a close action. */
export const CardScoreHistoryDialog: React.FC<CardScoreHistoryDialogProps> = ({
  open,
  title,
  maxWidth = 'sm',
  onClose,
  children,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {children}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close', 'Schließen')}</Button>
      </DialogActions>
    </Dialog>
  );
};

interface CardRoundTableProps {
  players: CardPlayer[];
  roundCount: number;
  /** Extra leading header labels, e.g. the cards-per-round column. */
  leadingHeaders?: string[];
  /** Extra leading cells for a zero-based round index; must match `leadingHeaders`. */
  leadingCells?: (roundIdx: number) => React.ReactNode[];
  renderScore: (player: CardPlayer, roundIdx: number) => React.ReactNode;
}

/** Round-by-round score table: one row per round, one column per player. */
export const CardRoundTable: React.FC<CardRoundTableProps> = ({
  players,
  roundCount,
  leadingHeaders = [],
  leadingCells,
  renderScore,
}) => {
  const { t } = useTranslation();

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 'bold' }}>{t('games.cards.round', 'Runde')}</TableCell>
          {leadingHeaders.map((label) => (
            <TableCell key={label} sx={{ fontWeight: 'bold' }}>
              {label}
            </TableCell>
          ))}
          {players.map((p) => (
            <TableCell key={p.id} align="center" sx={{ fontWeight: 'bold' }}>
              {p.name}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {Array.from({ length: roundCount }, (_, rIdx) => (
          <TableRow key={rIdx}>
            <TableCell>{rIdx + 1}</TableCell>
            {leadingCells?.(rIdx).map((cell, i) => (
              <TableCell key={i}>{cell}</TableCell>
            ))}
            {players.map((p) => (
              <TableCell key={p.id} align="center">
                {renderScore(p, rIdx)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
