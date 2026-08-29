import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Card,
    CardActionArea,
    Chip,
    IconButton,
    Tooltip,
    ToggleButtonGroup,
    ToggleButton,
    Paper
} from '@mui/material';
import StyleIcon from '@mui/icons-material/Style';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarsIcon from '@mui/icons-material/Stars';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LinkIcon from '@mui/icons-material/Link';
import Filter2Icon from '@mui/icons-material/Filter2';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CasinoIcon from '@mui/icons-material/Casino';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { useTranslation } from 'react-i18next';
import type { QwixxSheetType, SheetRowDefinition } from '../logic/types';
import { ALL_SHEET_TYPES, getSheetDefinition, generateRandomSheetRows } from '../logic/sheetDefinitions';
import { QwixxMiniSheet } from './QwixxMiniSheet';
import { QwixxRulesDialog } from './QwixxRulesDialog';

interface QwixxSheetSelectorProps {
    open: boolean;
    currentSheetType: QwixxSheetType;
    onSelectSheet: (sheetType: QwixxSheetType, presetIndex?: number, customRows?: SheetRowDefinition[]) => void;
    onClose: () => void;
}

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
    random_mix: <AutoFixHighIcon />
};

export const QwixxSheetSelector: React.FC<QwixxSheetSelectorProps> = ({
    open,
    currentSheetType,
    onSelectSheet,
    onClose
}) => {
    const { t } = useTranslation();
    const [rulesTargetSheet, setRulesTargetSheet] = useState<QwixxSheetType | null>(null);

    // Track active preset per sheet type
    const [presetMap, setPresetMap] = useState<Record<string, number>>({
        gemixxt_a: 0,
        gemixxt_b: 0
    });

    // Custom generated rows for random_mix
    const [randomCustomRows, setRandomCustomRows] = useState<SheetRowDefinition[] | undefined>(undefined);

    const handleSelectPreset = (sheetType: string, presetIndex: number) => {
        setPresetMap((prev) => ({ ...prev, [sheetType]: presetIndex }));
    };

    const handleGenerateNewRandom = (e: React.MouseEvent) => {
        e.stopPropagation();
        setRandomCustomRows(generateRandomSheetRows());
    };

    const handleGlobalRandom = () => {
        const otherTypes = ALL_SHEET_TYPES.filter((t) => t !== currentSheetType);
        const randomType = otherTypes[Math.floor(Math.random() * otherTypes.length)] || ALL_SHEET_TYPES[0];
        const def = getSheetDefinition(randomType);
        const randomPreset = def.presets ? Math.floor(Math.random() * def.presets.length) : 0;
        const customRows = randomType === 'random_mix' ? generateRandomSheetRows() : undefined;

        onSelectSheet(randomType, randomPreset, customRows);
        onClose();
    };

    const handleChooseCard = (sheetType: QwixxSheetType) => {
        const presetIndex = presetMap[sheetType] ?? 0;
        const customRows = sheetType === 'random_mix' ? (randomCustomRows || generateRandomSheetRows()) : undefined;
        onSelectSheet(sheetType, presetIndex, customRows);
        onClose();
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
                {/* Header */}
                <DialogTitle sx={{ pb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <StyleIcon color="primary" />
                            <Box>
                                <Typography variant="h6" fontWeight="bold">
                                    {t('games.qwixx.select_sheet_title', 'Wähle deinen Qwixx-Block')}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {t('games.qwixx.select_sheet_subtitle', 'Entdecke offizielle Editionen, alternative Layouts und Randomizer-Modi')}
                                </Typography>
                            </Box>
                        </Box>

                        {/* Top Random Button */}
                        <Button
                            variant="contained"
                            color="secondary"
                            size="small"
                            startIcon={<CasinoIcon />}
                            onClick={handleGlobalRandom}
                            sx={{ fontWeight: 'bold', borderRadius: 2 }}
                        >
                            {t('games.qwixx.random_block_button', '🎲 Zufälliger Block')}
                        </Button>
                    </Box>
                </DialogTitle>

                {/* Catalog Grid */}
                <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2.5 } }}>
                    {/* Prominent Hero Banner: Random Block Generator */}
                    <Paper
                        elevation={3}
                        sx={{
                            p: 2,
                            mb: 3,
                            borderRadius: 3,
                            background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.2), rgba(33, 150, 243, 0.2))',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 2
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <CasinoIcon sx={{ fontSize: 32, color: 'secondary.main' }} />
                            <Box>
                                <Typography variant="subtitle1" fontWeight="bold">
                                    {t('games.qwixx.random_pick_title', 'Zufälligen Block auswählen')}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {t('games.qwixx.random_pick_subtitle', 'Lass den Zufall entscheiden und starte mit einem zufälligen Spielmodus und Block-Layout!')}
                                </Typography>
                            </Box>
                        </Box>
                        <Button
                            variant="contained"
                            color="secondary"
                            size="medium"
                            startIcon={<CasinoIcon />}
                            onClick={handleGlobalRandom}
                            sx={{ fontWeight: 'bold', borderRadius: 2, px: 2.5, py: 1 }}
                        >
                            {t('games.qwixx.pick_random_block', '🎲 Zufälligen Block spielen')}
                        </Button>
                    </Paper>

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: '1fr',
                                sm: 'repeat(2, 1fr)',
                                md: 'repeat(3, 1fr)'
                            },
                            gap: 2.5
                        }}
                    >
                        {ALL_SHEET_TYPES.map((type) => {
                            const def = getSheetDefinition(type);
                            const isCurrent = currentSheetType === type;
                            const currentPreset = presetMap[type] ?? 0;
                            const hasPresets = def.presets && def.presets.length > 1;
                            const isRandomMix = type === 'random_mix';

                            return (
                                <Card
                                    key={type}
                                    elevation={isCurrent ? 5 : 1}
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        borderRadius: 3,
                                        border: isCurrent ? '2px solid' : '1px solid',
                                        borderColor: isCurrent ? 'primary.main' : 'divider',
                                        bgcolor: isCurrent ? 'action.selected' : 'background.paper',
                                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: 6,
                                            borderColor: 'primary.light'
                                        }
                                    }}
                                >
                                    <CardActionArea
                                        onClick={() => handleChooseCard(type)}
                                        sx={{
                                            p: 2,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'flex-start',
                                            height: '100%',
                                            justifyContent: 'flex-start'
                                        }}
                                    >
                                        {/* Header */}
                                        <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: isCurrent ? 'primary.main' : 'text.primary' }}>
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
                                                        sx={{ height: 22, fontSize: '0.7rem' }}
                                                    />
                                                )}
                                                <Tooltip title={t('games.qwixx.view_rules', 'Regeln lesen')}>
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setRulesTargetSheet(type);
                                                        }}
                                                        sx={{ color: 'primary.main', p: 0.5 }}
                                                    >
                                                        <InfoOutlinedIcon sx={{ fontSize: 20 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </Box>

                                        {/* Miniature Sheet Visual Preview */}
                                        <Box sx={{ width: '100%', my: 1 }}>
                                            <QwixxMiniSheet
                                                sheetType={type}
                                                presetIndex={currentPreset}
                                                customRows={isRandomMix ? randomCustomRows : undefined}
                                            />
                                        </Box>

                                        {/* Predefined Layout Switcher Chips if available */}
                                        {hasPresets && def.presetNames && (
                                            <Box
                                                sx={{ my: 0.75, width: '100%' }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                                                        {t('games.qwixx.select_preset', 'Block-Layout:')}
                                                    </Typography>
                                                    <Button
                                                        size="small"
                                                        variant="text"
                                                        color="secondary"
                                                        startIcon={<CasinoIcon sx={{ fontSize: 13 }} />}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const count = def.presets?.length || 1;
                                                            const randomIdx = Math.floor(Math.random() * count);
                                                            handleSelectPreset(type, randomIdx);
                                                        }}
                                                        sx={{ fontSize: '0.7rem', py: 0, px: 0.5, minWidth: 'auto', textTransform: 'none', fontWeight: 'bold' }}
                                                    >
                                                        {t('games.qwixx.random_block_in_mode', 'Zufall')}
                                                    </Button>
                                                </Box>
                                                <ToggleButtonGroup
                                                    size="small"
                                                    value={currentPreset}
                                                    exclusive
                                                    onChange={(_, val) => {
                                                        if (val !== null) handleSelectPreset(type, val);
                                                    }}
                                                    sx={{ height: 26, width: '100%' }}
                                                >
                                                    {def.presetNames.map((name, idx) => (
                                                        <ToggleButton key={idx} value={idx} sx={{ flex: 1, px: 0.5, py: 0, fontSize: '0.75rem', textTransform: 'none', fontWeight: 'bold' }}>
                                                            {name}
                                                        </ToggleButton>
                                                    ))}
                                                </ToggleButtonGroup>
                                            </Box>
                                        )}

                                        {/* Random Generator Reroll Button for random_mix */}
                                        {isRandomMix && (
                                            <Box sx={{ my: 0.75, width: '100%' }}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="secondary"
                                                    fullWidth
                                                    startIcon={<CasinoIcon />}
                                                    onClick={handleGenerateNewRandom}
                                                    sx={{ fontSize: '0.75rem', height: 26, textTransform: 'none', fontWeight: 'bold' }}
                                                >
                                                    {t('games.qwixx.reroll_layout', '🎲 Neu mischen')}
                                                </Button>
                                            </Box>
                                        )}

                                        {/* Badge */}
                                        <Chip
                                            size="small"
                                            label={t(def.badgeKey)}
                                            sx={{ mb: 1, fontSize: '0.7rem', height: 22, fontWeight: 'bold' }}
                                            color={isCurrent ? 'primary' : 'default'}
                                        />

                                        {/* Description */}
                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', lineHeight: 1.4, flexGrow: 1, mb: 1.5 }}>
                                            {t(def.descriptionKey)}
                                        </Typography>

                                        <Button
                                            variant={isCurrent ? 'contained' : 'outlined'}
                                            color="primary"
                                            fullWidth
                                            size="small"
                                            sx={{ mt: 'auto', borderRadius: 2 }}
                                        >
                                            {isCurrent ? t('games.qwixx.active_badge', 'Aktiv') : t('games.qwixx.apply_sheet', 'Block auswählen')}
                                        </Button>
                                    </CardActionArea>
                                </Card>
                            );
                        })}
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={onClose} color="inherit">
                        {t('common.close', 'Schließen')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Individual Rules & Guide Dialog */}
            <QwixxRulesDialog
                open={!!rulesTargetSheet}
                sheetType={rulesTargetSheet}
                presetIndex={rulesTargetSheet ? presetMap[rulesTargetSheet] : 0}
                onClose={() => setRulesTargetSheet(null)}
                onSelectAndPlay={(st, preset) => {
                    onSelectSheet(st, preset, st === 'random_mix' ? randomCustomRows : undefined);
                    onClose();
                }}
            />
        </>
    );
};
