import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  useMediaQuery,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import StyleIcon from '@mui/icons-material/StyleRounded';
import CasinoIcon from '@mui/icons-material/CasinoRounded';
import { useTranslation } from 'react-i18next';
import type { QwixxSheetType } from '../logic/types';
import { ALL_SHEET_TYPES } from '../logic/sheetDefinitions';
import { QwixxRulesDialog } from './QwixxRulesDialog';
import { QwixxSheetCard } from './QwixxSheetCard';
import { useSheetSelectorState, type SelectSheetHandler } from './useSheetSelectorState';

interface QwixxSheetSelectorProps {
  open: boolean;
  currentSheetType: QwixxSheetType;
  onSelectSheet: SelectSheetHandler;
  onClose: () => void;
}

export const QwixxSheetSelector: React.FC<QwixxSheetSelectorProps> = ({
  open,
  currentSheetType,
  onSelectSheet,
  onClose,
}) => {
  const { t } = useTranslation();
  const state = useSheetSelectorState({ currentSheetType, onSelectSheet, onClose });
  // Phones: full-screen dialog with a compact two-column grid, so many sheets fit at once.
  const phone = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth fullScreen={phone}>
        <DialogTitle sx={{ pb: 1.5, px: { xs: 2, sm: 3 } }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: { xs: 'nowrap', sm: 'wrap' },
              gap: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              <StyleIcon color="primary" sx={{ display: { xs: 'none', sm: 'block' } }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  sx={{ fontSize: { xs: '1.05rem', sm: undefined }, lineHeight: 1.3 }}
                >
                  {t('games.qwixx.select_sheet_title')}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: { xs: 'none', sm: 'block' } }}
                >
                  {t('games.qwixx.select_sheet_subtitle')}
                </Typography>
              </Box>
            </Box>

            <Button
              variant="contained"
              color="secondary"
              size="small"
              startIcon={<CasinoIcon />}
              onClick={state.handleGlobalRandom}
              aria-label={t('games.qwixx.random_block_button')}
              sx={{
                fontWeight: 'bold',
                borderRadius: 2,
                flexShrink: 0,
                minWidth: { xs: 48, sm: 64 },
                minHeight: { xs: 48, sm: 'auto' },
                '& .MuiButton-startIcon': { mx: { xs: 0 }, ml: { sm: -0.5 }, mr: { sm: 1 } },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                {t('games.qwixx.random_block_button')}
              </Box>
            </Button>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: { xs: 1, sm: 2.5 } }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: { xs: 1, sm: 2.5 },
            }}
          >
            {ALL_SHEET_TYPES.map((type) => (
              <QwixxSheetCard
                key={type}
                type={type}
                isCurrent={currentSheetType === type}
                presetIndex={state.presetMap[type] ?? 0}
                randomCustomRows={state.randomCustomRows}
                onChoose={() => state.handleChooseCard(type)}
                onShowRules={() => state.setRulesTargetSheet(type)}
                onSelectPreset={(idx) => state.handleSelectPreset(type, idx)}
                onReroll={state.handleGenerateNewRandom}
              />
            ))}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: { xs: 1, sm: 2 } }}>
          <Button onClick={onClose} color="inherit">
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>

      <QwixxRulesDialog
        open={!!state.rulesTargetSheet}
        sheetType={state.rulesTargetSheet}
        presetIndex={state.rulesTargetSheet ? state.presetMap[state.rulesTargetSheet] : 0}
        onClose={() => state.setRulesTargetSheet(null)}
        onSelectAndPlay={state.handleRulesSelectAndPlay}
      />
    </>
  );
};
