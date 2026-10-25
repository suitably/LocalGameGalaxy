import React from 'react';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';

import StyleIcon from '@mui/icons-material/StyleRounded';
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded';
import StarsIcon from '@mui/icons-material/StarsRounded';
import ShuffleIcon from '@mui/icons-material/ShuffleRounded';
import ColorLensIcon from '@mui/icons-material/ColorLensRounded';
import TrendingUpIcon from '@mui/icons-material/TrendingUpRounded';
import LinkIcon from '@mui/icons-material/LinkRounded';
import Filter2Icon from '@mui/icons-material/Filter2Rounded';
import CheckBoxIcon from '@mui/icons-material/CheckBoxRounded';
import EmojiEventsIcon from '@mui/icons-material/EmojiEventsRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoRounded';
import CasinoIcon from '@mui/icons-material/CasinoRounded';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHighRounded';
import { useTranslation } from 'react-i18next';
import { transitionOf } from '../../../lib/motion';
import type { QwixxSheetType, SheetRowDefinition } from '../logic/types';
import { getSheetDefinition } from '../logic/sheetDefinitions';
import { QwixxMiniSheet } from './QwixxMiniSheet';
import { QwixxPresetSwitcher } from './QwixxPresetSwitcher';

const SHEET_ICONS: Record<QwixxSheetType, React.ReactElement> = {
  classic: <StyleIcon />,
  gemixxt_a: <ColorLensIcon />,
  gemixxt_b: <ShuffleIcon />,
  big_points: <TrendingUpIcon />,
  connected_stairs: <EmojiEventsIcon />,
  connected_chains: <LinkIcon />,
  double_sub: <CheckBoxIcon />,
  double_numbers: <Filter2Icon />,
  bonus: <StarsIcon />,
  longo: <CasinoIcon />,
  random_mix: <AutoFixHighIcon />,
};

interface QwixxSheetCardProps {
  type: QwixxSheetType;
  isCurrent: boolean;
  presetIndex: number;
  randomCustomRows?: SheetRowDefinition[];
  onChoose: () => void;
  onShowRules: () => void;
  onSelectPreset: (presetIndex: number) => void;
  onReroll: (e: React.MouseEvent) => void;
}

/** One sheet type in the catalog: preview, layout presets, badge and select button. */
export const QwixxSheetCard: React.FC<QwixxSheetCardProps> = ({
  type,
  isCurrent,
  presetIndex,
  randomCustomRows,
  onChoose,
  onShowRules,
  onSelectPreset,
  onReroll,
}) => {
  const { t } = useTranslation();
  const def = getSheetDefinition(type);
  const hasPresets = def.presets && def.presets.length > 1;
  const isRandomMix = type === 'random_mix';

  return (
    <Card
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        touchAction: 'manipulation',
        borderRadius: 3,
        border: isCurrent ? '2px solid' : '1px solid',
        borderColor: isCurrent ? 'primary.main' : 'divider',
        bgcolor: isCurrent ? 'action.selected' : 'background.paper',
        transition: transitionOf(['border-color', 'background-color'], 'standard'),
        '&:hover': { borderColor: 'primary.light' },
      }}
    >
      <CardActionArea
        onClick={onChoose}
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          height: '100%',
          justifyContent: 'flex-start',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            width: '100%',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 1,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: isCurrent ? 'primary.main' : 'text.primary',
            }}
          >
            {SHEET_ICONS[type]}
            <Typography variant="subtitle1" fontWeight="bold">
              {t(def.nameKey)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {isCurrent && (
              <Chip
                size="small"
                label={t('games.qwixx.active_badge', 'Aktiv')}
                color="success"
                variant="outlined"
                icon={<CheckCircleIcon />}
                sx={{ height: 22, fontSize: '0.75rem' }}
              />
            )}
            <Tooltip title={t('games.qwixx.view_rules', 'Regeln lesen')}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onShowRules();
                }}
                sx={{ color: 'primary.main', p: 0.5 }}
              >
                <InfoOutlinedIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box sx={{ width: '100%', my: 1 }}>
          <QwixxMiniSheet
            sheetType={type}
            presetIndex={presetIndex}
            customRows={isRandomMix ? randomCustomRows : undefined}
          />
        </Box>

        {hasPresets && def.presetNames && (
          <QwixxPresetSwitcher
            presetNames={def.presetNames}
            value={presetIndex}
            onChange={onSelectPreset}
          />
        )}

        {isRandomMix && (
          <Box sx={{ my: 0.75, width: '100%' }}>
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              fullWidth
              startIcon={<CasinoIcon />}
              onClick={onReroll}
              sx={{ fontSize: '0.75rem', height: 26, textTransform: 'none', fontWeight: 'bold' }}
            >
              {t('games.qwixx.reroll_layout', 'Neu mischen')}
            </Button>
          </Box>
        )}

        <Chip
          size="small"
          label={t(def.badgeKey)}
          sx={{ mb: 1, fontSize: '0.75rem', height: 22, fontWeight: 'bold' }}
          color={isCurrent ? 'primary' : 'default'}
        />

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: '0.85rem', lineHeight: 1.4, flexGrow: 1, mb: 1.5 }}
        >
          {t(def.descriptionKey)}
        </Typography>

        <Button
          variant={isCurrent ? 'contained' : 'outlined'}
          color="primary"
          fullWidth
          size="small"
          sx={{ mt: 'auto', borderRadius: 2 }}
        >
          {isCurrent
            ? t('games.qwixx.active_badge', 'Aktiv')
            : t('games.qwixx.apply_sheet', 'Block auswählen')}
        </Button>
      </CardActionArea>
    </Card>
  );
};
