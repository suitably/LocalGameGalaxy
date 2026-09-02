import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Box,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

interface KnisterCombinationsLegendProps {
  open: boolean;
  onClose: () => void;
}

export const KnisterCombinationsLegend: React.FC<KnisterCombinationsLegendProps> = ({
  open,
  onClose,
}) => {
  const { t } = useTranslation();

  const combinations = [
    { key: 'games.knister.combos.pair', example: '2 Zahlen gleich (z.B. 4-4)', points: 1 },
    { key: 'games.knister.combos.two_pairs', example: '2x 2 Zahlen gleich (z.B. 3-3, 5-5)', points: 3 },
    { key: 'games.knister.combos.triple', example: '3 Zahlen gleich (z.B. 8-8-8)', points: 3 },
    { key: 'games.knister.combos.full_house', example: '3 gleiche + 2 gleiche (z.B. 7-7-7, 2-2)', points: 6 },
    { key: 'games.knister.combos.four_of_a_kind', example: '4 Zahlen gleich (z.B. 9-9-9-9)', points: 6 },
    { key: 'games.knister.combos.straight_with_seven', example: '5 aufeinanderfolgende MIT 7 (z.B. 5-6-7-8-9)', points: 9 },
    { key: 'games.knister.combos.straight_without_seven', example: '5 aufeinanderfolgende OHNE 7 (z.B. 2-3-4-5-6, 8-9-10-11-12)', points: 10 },
    { key: 'games.knister.combos.five_of_a_kind', example: '5 Zahlen gleich (z.B. 6-6-6-6-6)', points: 10 },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(22, 22, 35, 0.98)',
          borderRadius: 4,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 800, fontSize: '1.25rem' }}>
        {t('games.knister.legend_title', 'Knister Punkteübersicht')}
      </DialogTitle>

      <DialogContent sx={{ px: { xs: 1.5, sm: 3 } }}>
        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(171, 71, 188, 0.15)', borderRadius: 2, border: '1px solid rgba(171, 71, 188, 0.3)' }}>
          <Typography variant="body2" sx={{ color: '#e1bee7', fontWeight: 600 }}>
            ★ {t('games.knister.diagonal_bonus_hint', 'Wichtig: Die beiden Diagonalen zählen jeweils DOPPELT (2x Punkte)!')}
          </Typography>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>{t('games.knister.combination', 'Kombination')}</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>{t('games.knister.example', 'Beispiel')}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>{t('games.knister.points', 'Punkte')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {combinations.map((c) => (
              <TableRow key={c.key} sx={{ '&:last-child td': { border: 0 } }}>
                <TableCell sx={{ fontWeight: 600 }}>{t(c.key)}</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>{c.example}</TableCell>
                <TableCell align="right">
                  <Chip label={`+${c.points}`} size="small" color="primary" sx={{ fontWeight: 700 }} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained" fullWidth sx={{ borderRadius: 50 }}>
          {t('common.close', 'Schließen')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
