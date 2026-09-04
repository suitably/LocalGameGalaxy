import React, { useState, useEffect } from 'react';
import { Box, Button, Paper, Typography, Checkbox, FormControlLabel, FormGroup, InputAdornment, TextField } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestoreIcon from '@mui/icons-material/Restore';
import { useTranslation } from 'react-i18next';
import type { DbCategory } from '../logic/types';
import { getImposterCategories } from '../logic/imposterRepository';
import { PlayerManagerCard } from '../../../modules/player-management';
import { storage, STORAGE_KEYS } from '../../../lib/storage';

interface ImposterSetupSettings {
    imposterCount: number;
    isManualImposterCount: boolean;
    timerMinutes: number;
    timerSeconds: number;
    selectedCategoryIds: string[];
}

const DEFAULT_SETTINGS: ImposterSetupSettings = {
    imposterCount: 1,
    isManualImposterCount: false,
    timerMinutes: 5,
    timerSeconds: 0,
    selectedCategoryIds: []
};

interface GameSetupProps {
    players: Array<{ name: string; isRemote?: boolean }>;
    onAddPlayer: (name: string) => void;
    onRemovePlayer: (name: string, index?: number) => void;
    onStartGame: (setup: {
        categories: DbCategory[];
        imposterCount: number;
        timerLength: number;
    }) => void;
}

export const GameSetup: React.FC<GameSetupProps> = ({ players, onAddPlayer, onRemovePlayer, onStartGame }) => {
    const { t, i18n } = useTranslation();
    const [allCategories, setAllCategories] = useState<DbCategory[]>([]);

    // Consolidated settings initialized from central storage
    const [settings, setSettings] = useState<ImposterSetupSettings>(() => 
        storage.getJson<ImposterSetupSettings>(STORAGE_KEYS.IMPOSTER_SETTINGS, DEFAULT_SETTINGS)
    );

    // Fetch categories from database
    useEffect(() => {
        const fetchCategories = async () => {
            const cats = await getImposterCategories();
            setAllCategories(cats);
            // If no categories were saved yet, default to all available categories
            setSettings(prev => {
                if (prev.selectedCategoryIds.length === 0 && cats.length > 0) {
                    return { ...prev, selectedCategoryIds: cats.map(c => c.id) };
                }
                return prev;
            });
        };
        fetchCategories();
    }, []);

    const { imposterCount, isManualImposterCount, timerMinutes, timerSeconds, selectedCategoryIds } = settings;

    const resolvedImposterCount = isManualImposterCount
        ? imposterCount
        : Math.max(1, Math.floor(players.length / 4));

    // Save settings to storage whenever they change
    useEffect(() => {
        storage.setJson(STORAGE_KEYS.IMPOSTER_SETTINGS, {
            ...settings,
            imposterCount: resolvedImposterCount
        });
    }, [settings, resolvedImposterCount]);

    const handleStart = () => {
        const categories = allCategories.filter(c => selectedCategoryIds.includes(c.id));
        const totalTimerSeconds = (timerMinutes * 60) + (timerSeconds || 0);

        onStartGame({
            categories,
            imposterCount: resolvedImposterCount,
            timerLength: totalTimerSeconds,
        });
    };

    const toggleCategory = (id: string) => {
        setSettings(prev => ({
            ...prev,
            selectedCategoryIds: prev.selectedCategoryIds.includes(id)
                ? prev.selectedCategoryIds.filter(cid => cid !== id)
                : [...prev.selectedCategoryIds, id]
        }));
    };

    const handleImposterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        if (!isNaN(val)) {
            setSettings(prev => ({ ...prev, imposterCount: val, isManualImposterCount: true }));
        } else if (e.target.value === '') {
            setSettings(prev => ({ ...prev, imposterCount: 0, isManualImposterCount: true }));
        }
    };

    const resetImposterCount = () => {
        setSettings(prev => ({ ...prev, isManualImposterCount: false }));
    };

    const currentLang = i18n.language.startsWith('de') ? 'de' : 'en';

    return (
        <Box maxWidth="sm" mx="auto">
            <PlayerManagerCard
                players={players}
                onAddPlayer={onAddPlayer}
                onRemovePlayer={onRemovePlayer}
                minPlayers={3}
                maxPlayers={20}
                sx={{ mb: 4 }}
            />

            <Paper sx={{ p: 4, mb: 4, borderRadius: 3, bgcolor: 'rgba(30, 30, 40, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: 6 }}>
                <Typography variant="h6" gutterBottom>{t('games.imposter.setup.title')}</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Box>
                        <Typography variant="subtitle1" gutterBottom>
                            {t('games.imposter.setup.select_category')}
                        </Typography>
                        <Box sx={{ mb: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Button size="small" onClick={() => setSettings((prev: ImposterSetupSettings) => ({ ...prev, selectedCategoryIds: allCategories.map((c: DbCategory) => c.id) }))}>
                                {t('games.imposter.setup.select_all')}
                            </Button>
                            <Button size="small" onClick={() => setSettings((prev: ImposterSetupSettings) => ({ ...prev, selectedCategoryIds: [] }))}>
                                {t('games.imposter.setup.select_none')}
                            </Button>
                        </Box>
                        <FormGroup sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                            {allCategories.map((category: DbCategory) => (
                                <FormControlLabel
                                    key={category.id}
                                    control={
                                        <Checkbox
                                            checked={selectedCategoryIds.includes(category.id)}
                                            onChange={() => toggleCategory(category.id)}
                                        />
                                    }
                                    label={category.name[currentLang] || category.name.en}
                                />
                            ))}
                        </FormGroup>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <TextField
                            label={t('games.imposter.setup.imposter_count')}
                            type="number"
                            value={imposterCount}
                            onChange={handleImposterChange}
                            inputProps={{ min: 1, max: Math.max(1, players.length - 1) }}
                            sx={{ width: 150 }}
                        />
                        {isManualImposterCount && (
                            <Button
                                size="small"
                                startIcon={<RestoreIcon />}
                                onClick={resetImposterCount}
                            >
                                {t('games.imposter.setup.reset_to_default')}
                            </Button>
                        )}
                    </Box>
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>
                            {t('games.imposter.setup.timer_length')}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                label={t('games.imposter.setup.minutes')}
                                type="number"
                                value={timerMinutes}
                                onChange={(e) => setSettings((prev: ImposterSetupSettings) => ({ ...prev, timerMinutes: Math.max(0, parseInt(e.target.value) || 0) }))}
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">m</InputAdornment>,
                                }}
                            />
                            <TextField
                                label={t('games.imposter.setup.seconds')}
                                type="number"
                                value={timerSeconds}
                                onChange={(e) => setSettings((prev: ImposterSetupSettings) => ({ ...prev, timerSeconds: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)) }))}
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">s</InputAdornment>,
                                }}
                            />
                        </Box>
                    </Box>
                </Box>
            </Paper>

            <Button
                variant="contained"
                size="large"
                fullWidth
                color="primary"
                disabled={players.length < 3 || selectedCategoryIds.length === 0}
                onClick={handleStart}
                startIcon={<PlayArrowIcon />}
                sx={{ py: 2, borderRadius: 2, fontSize: '1.2rem', fontWeight: 'bold', mb: 4 }}
            >
                {t('common.start')}
            </Button>
        </Box>
    );
};
