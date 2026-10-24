import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
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

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ pb: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StyleIcon color="primary" />
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  {t('games.qwixx.select_sheet_title', 'Wähle deinen Qwixx-Block')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t(
                    'games.qwixx.select_sheet_subtitle',
                    'Entdecke offizielle Editionen, alternative Layouts und Randomizer-Modi',
                  )}
                </Typography>
              </Box>
            </Box>

            <Button
              variant="contained"
              color="secondary"
              size="small"
              startIcon={<CasinoIcon />}
              onClick={state.handleGlobalRandom}
              sx={{ fontWeight: 'bold', borderRadius: 2 }}
            >
              {t('games.qwixx.random_block_button', 'Zufälliger Block')}
            </Button>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 2.5,
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

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} color="inherit">
            {t('common.close', 'Schließen')}
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
