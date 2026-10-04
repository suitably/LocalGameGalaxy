import React from 'react';
import { Box, Stack, Chip, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TargetNote } from '../useNoteVerifier';

interface NoteStatusBarProps {
    targetNotes: TargetNote[];
    playedPitches: number[];
    isCurrentNoteHit: boolean;
    score: number;
    hitCount: number;
}

export const NoteStatusBar: React.FC<NoteStatusBarProps> = ({
    targetNotes,
    playedPitches,
    isCurrentNoteHit,
    score,
    hitCount,
}) => {
    const { t } = useTranslation();

    const isRest = targetNotes.length > 0 && targetNotes.every(n => n.isRest);
    const targetString = isRest
        ? t('games.melodiq_notes.rest')
        : targetNotes.length > 0
        ? targetNotes.map(n => `MIDI ${n.pitch}`).join(', ')
        : t('games.melodiq_notes.none');

    const playedString = playedPitches.length > 0
        ? playedPitches.map(p => `MIDI ${p}`).join(', ')
        : t('games.melodiq_notes.none');

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 1.5,
                flexWrap: 'wrap',
                gap: 1,
            }}
        >
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip
                    size="small"
                    label={t('games.melodiq_notes.target_notes', { notes: targetString })}
                    color="primary"
                    variant="outlined"
                    sx={{ fontSize: { xs: '0.72rem', sm: '0.8rem' }, fontWeight: 600 }}
                />
                <Chip
                    size="small"
                    label={t('games.melodiq_notes.played_notes', { notes: playedString })}
                    color={isCurrentNoteHit ? 'success' : 'default'}
                    sx={{ fontSize: { xs: '0.72rem', sm: '0.8rem' }, fontWeight: 600 }}
                />
            </Stack>

            <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>
                    {t('games.melodiq_notes.score')}:{' '}
                    <Typography component="span" fontWeight="bold" color="primary.main">
                        {score}
                    </Typography>
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>
                    {t('games.melodiq_notes.hits')}:{' '}
                    <Typography component="span" fontWeight="bold" color="success.main">
                        {hitCount}
                    </Typography>
                </Typography>
            </Stack>
        </Box>
    );
};

