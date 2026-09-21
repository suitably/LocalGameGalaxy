import React from 'react';
import { Stack, Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TargetNote } from '../useNoteVerifier';

interface NoteStatusBarProps {
    targetNotes: TargetNote[];
    playedPitches: number[];
    isCurrentNoteHit: boolean;
}

export const NoteStatusBar: React.FC<NoteStatusBarProps> = ({
    targetNotes,
    playedPitches,
    isCurrentNoteHit
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
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Chip
                label={t('games.melodiq_notes.target_notes', { notes: targetString })}
                color="primary"
                variant="outlined"
            />
            <Chip
                label={t('games.melodiq_notes.played_notes', { notes: playedString })}
                color={isCurrentNoteHit ? 'success' : 'default'}
            />
        </Stack>
    );
};
