import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Chip,
    Divider,
    IconButton,
    ToggleButtonGroup,
    ToggleButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useTranslation } from 'react-i18next';
import type { QwixxSheetType } from '../logic/types';
import { getSheetDefinition } from '../logic/sheetDefinitions';
import { QwixxMiniSheet } from './QwixxMiniSheet';

interface QwixxRulesDialogProps {
    open: boolean;
    sheetType: QwixxSheetType | null;
    presetIndex?: number;
    onClose: () => void;
    onSelectAndPlay?: (sheetType: QwixxSheetType, presetIndex?: number) => void;
}

export const QwixxRulesDialog: React.FC<QwixxRulesDialogProps> = ({
    open,
    sheetType,
    presetIndex = 0,
    onClose,
    onSelectAndPlay
}) => {
    const { t } = useTranslation();
    const [currentPreset, setCurrentPreset] = useState<number>(presetIndex);

    useEffect(() => {
        setCurrentPreset(presetIndex);
    }, [presetIndex, sheetType]);

    if (!sheetType) return null;

    const def = getSheetDefinition(sheetType);
    const hasPresets = def.presets && def.presets.length > 1;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <InfoIcon color="primary" />
                        <Typography variant="h6" fontWeight="bold">
                            {t(def.nameKey)}
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
                {/* Variant Header & Badge */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Chip size="small" label={t(def.badgeKey)} color="primary" variant="outlined" />
                    {hasPresets && def.presetNames && (
                        <ToggleButtonGroup
                            size="small"
                            value={currentPreset}
                            exclusive
                            onChange={(_, val) => {
                                if (val !== null) setCurrentPreset(val);
                            }}
                            sx={{ height: 26 }}
                        >
                            {def.presetNames.map((name, idx) => (
                                <ToggleButton key={idx} value={idx} sx={{ px: 1, py: 0, fontSize: '0.75rem', textTransform: 'none', fontWeight: 'bold' }}>
                                    {name}
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                    )}
                </Box>

                {/* Visual Sheet Preview */}
                <Box sx={{ width: '100%' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ display: 'block', mb: 0.5 }}>
                        {t('games.qwixx.preview_title', 'VORSCHAU DES WERTUNGSBLOCKS')}
                    </Typography>
                    <QwixxMiniSheet sheetType={sheetType} presetIndex={currentPreset} />
                </Box>

                {/* Main Description */}
                <Box>
                    <Typography variant="body2" sx={{ lineHeight: 1.5, fontWeight: 500 }}>
                        {t(def.descriptionKey)}
                    </Typography>
                </Box>

                <Divider />

                {/* Detailed Rules Section */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <CheckCircleOutlineIcon color="success" sx={{ fontSize: 20, mt: 0.2 }} />
                        <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                                {t('games.qwixx.rules_crossing_title', 'Ankreuz- & Würfelregeln')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {t(`games.qwixx.rules.${sheetType}.crossing`, t('games.qwixx.rules.default.crossing', 'Kreuze von links nach rechts setzen.'))}
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <EmojiEventsIcon sx={{ fontSize: 20, mt: 0.2, color: '#fbc02d' }} />
                        <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                                {t('games.qwixx.rules_scoring_title', 'Wertung & Besonderheiten')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {t(`games.qwixx.rules.${sheetType}.scoring`, t('games.qwixx.rules.default.scoring', 'Punkte steigen mit Anzahl der Kreuze.'))}
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <LightbulbIcon sx={{ fontSize: 20, mt: 0.2, color: '#42a5f5' }} />
                        <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                                {t('games.qwixx.rules_tips_title', 'Taktik-Tipp')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {t(`games.qwixx.rules.${sheetType}.tip`, t('games.qwixx.rules.default.tip', 'Plane deine Kreuze vorausschauend.'))}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
                <Button onClick={onClose} color="inherit">
                    {t('common.close', 'Schließen')}
                </Button>
                {onSelectAndPlay && (
                    <Button
                        onClick={() => {
                            onSelectAndPlay(sheetType, currentPreset);
                            onClose();
                        }}
                        variant="contained"
                        color="primary"
                    >
                        {t('games.qwixx.play_this_sheet', 'Diesen Block spielen')}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};
