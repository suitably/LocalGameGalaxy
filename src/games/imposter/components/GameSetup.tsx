import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, List, ListItem, ListItemText, IconButton, Paper, Typography, Checkbox, FormControlLabel, FormGroup, InputAdornment } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestoreIcon from '@mui/icons-material/Restore';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import { useTranslation } from 'react-i18next';
import type { DbCategory } from '../logic/types';
import { db } from '../../../lib/db';

const STORAGE_KEY_SETTINGS = 'imposter-setup-settings';

interface GameSetupProps {
    players: { id: string; name: string }[];
    onAddPlayer: (name: string) => void;
    onRemovePlayer: (id: string) => void;
    onClearAllPlayers: () => void;
    onStartGame: (setup: {
        categories: DbCategory[];
        imposterCount: number;
        timerLength: number;
    }) => void;
}

export const GameSetup: React.FC<GameSetupProps> = ({ players, onAddPlayer, onRemovePlayer, onClearAllPlayers, onStartGame }) => {
    const { t, i18n } = useTranslation();
    const [newName, setNewName] = useState('');
    const [allCategories, setAllCategories] = useState<DbCategory[]>([]);

    // Fetch categories from database
    useEffect(() => {
        const fetchCategories = async () => {
            const cats = await db.imposter_categories.toArray();
            setAllCategories(cats);
        };
        fetchCategories();
    }, []);

    // Load settings from localStorage
    const [imposterCount, setImposterCount] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.imposterCount ?? 1;
            }
        } catch { }
        return 1;
    });
    const [isManualImposterCount, setIsManualImposterCount] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.isManualImposterCount ?? false;
            }
        } catch { }
        return false;
    });
    const [timerMinutes, setTimerMinutes] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.timerMinutes ?? 5;
            }
        } catch { }
        return 5;
    });
    const [timerSeconds, setTimerSeconds] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.timerSeconds ?? 0;
            }
        } catch { }
        return 0;
    });
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.selectedCategoryIds) return parsed.selectedCategoryIds;
            }
        } catch { }
        return allCategories.map(c => c.id);
    });

    // Save settings to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify({
            imposterCount,
            isManualImposterCount,
            timerMinutes,
            timerSeconds,
            selectedCategoryIds
        }));
    }, [imposterCount, isManualImposterCount, timerMinutes, timerSeconds, selectedCategoryIds]);

    // Auto-calculate imposter count based on players
    useEffect(() => {
        if (!isManualImposterCount) {
            const calculated = Math.max(1, Math.floor(players.length / 4));
            setImposterCount(calculated);
        }
    }, [players.length, isManualImposterCount]);

    const handleAdd = () => {
        if (newName.trim()) {
            onAddPlayer(newName.trim());
            setNewName('');
        }
    };

    const handleStart = () => {
        const categories = allCategories.filter(c => selectedCategoryIds.includes(c.id));
        const totalTimerSeconds = (timerMinutes * 60) + (timerSeconds || 0);

        onStartGame({
            categories,
            imposterCount,
            timerLength: totalTimerSeconds,
        });
    };

    const toggleCategory = (id: string) => {
        setSelectedCategoryIds(prev =>
            prev.includes(id)
                ? prev.filter(cid => cid !== id)
                : [...prev, id]
        );
    };

    const handleImposterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        if (!isNaN(val)) {
            setImposterCount(val);
            setIsManualImposterCount(true);
        } else if (e.target.value === '') {
            setImposterCount(0);
            setIsManualImposterCount(true);
        }
    };

    const resetImposterCount = () => {
        setIsManualImposterCount(false);
    };

    const currentLang = i18n.language.startsWith('de') ? 'de' : 'en';

    return (
        <Box maxWidth="sm" mx="auto">
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h5" gutterBottom>{t('common.players')}</Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <TextField
                        fullWidth
                        label={t('games.werewolf.ui.player_name')}
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                    <Button variant="contained" onClick={handleAdd} startIcon={<PersonAddIcon />}>
                        {t('games.werewolf.ui.add')}
                    </Button>
                </Box>
                <List dense sx={{ mb: 2 }}>
                    {players.map(player => (
                        <ListItem
                            key={player.id}
                            secondaryAction={
                                <IconButton edge="end" aria-label="delete" onClick={() => onRemovePlayer(player.id)}>
                                    <DeleteIcon />
                                </IconButton>
                            }
                        >
                            <ListItemText primary={player.name} />
                        </ListItem>
                    ))}
                    {players.length === 0 && (
                        <Typography variant="body2" color="text.secondary" align="center">
                            {t('games.werewolf.ui.add_players_hint')}
                        </Typography>
                    )}
                </List>
                {players.length > 0 && (
                    <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<ClearAllIcon />}
                        onClick={onClearAllPlayers}
                        sx={{ mt: 1 }}
                    >
                        {t('common.clear_all_players')}
                    </Button>
                )}
            </Paper>

            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>{t('games.imposter.setup.title')}</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Box>
                        <Typography variant="subtitle1" gutterBottom>
                            {t('games.imposter.setup.select_category')}
                        </Typography>
                        <Box sx={{ mb: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Button size="small" onClick={() => setSelectedCategoryIds(allCategories.map(c => c.id))}>
                                {t('games.imposter.setup.select_all')}
                            </Button>
                            <Button size="small" onClick={() => setSelectedCategoryIds([])}>
                                {t('games.imposter.setup.select_none')}
                            </Button>
                        </Box>
                        <FormGroup sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                            {allCategories.map((category) => (
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
                                onChange={(e) => setTimerMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">m</InputAdornment>,
                                }}
                            />
                            <TextField
                                label={t('games.imposter.setup.seconds')}
                                type="number"
                                value={timerSeconds}
                                onChange={(e) => setTimerSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
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
            >
                {t('common.start')}
            </Button>
        </Box>
    );
};
