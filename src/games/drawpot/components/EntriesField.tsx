/**
 * Entry list input with counter and group helper [ID: DRAWPOT-ENTRIES-FIELD]
 */
import React, { useState } from 'react';
import { Box, Button, Card, Chip, Collapse, Stack, TextField, Typography } from '@mui/material';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import { useTranslation } from 'react-i18next';
import type { CreatePotForm } from '../hooks/useCreatePotForm';
import { balancedGroupLines, MAX_ENTRIES } from '../logic/entries';

const clampInt = (v: string, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.floor(Number(v) || min)));

export const EntriesField: React.FC<{ form: CreatePotForm }> = ({ form }) => {
  const { t } = useTranslation();
  const [helper, setHelper] = useState(false);
  const [people, setPeople] = useState(12);
  const [size, setSize] = useState(4);
  const santa = form.mode === 'secret-santa';
  const tooMany = form.entries.length > MAX_ENTRIES;

  return (
    <Box>
      <TextField
        label={santa ? t('drawpot.create.names') : t('drawpot.create.entries')}
        placeholder={
          santa ? t('drawpot.create.namesPlaceholder') : t('drawpot.create.entriesPlaceholder')
        }
        helperText={santa ? t('drawpot.create.namesHint') : t('drawpot.create.entriesHint')}
        value={form.entriesText}
        onChange={(e) => form.setEntriesText(e.target.value)}
        error={form.touched && (form.problem === 'entries' || tooMany)}
        slotProps={{ inputLabel: { shrink: true } }}
        multiline
        minRows={6}
        maxRows={16}
        fullWidth
      />
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap mt={1}>
        <Chip
          size="small"
          color={tooMany ? 'error' : 'default'}
          label={t('drawpot.create.count', { count: form.entries.length, max: MAX_ENTRIES })}
        />
        {form.duplicates.length > 0 && (
          <Chip
            size="small"
            color={santa ? 'warning' : 'default'}
            variant="outlined"
            label={t('drawpot.create.duplicates', {
              names: form.duplicates.slice(0, 3).join(', '),
            })}
          />
        )}
        {!santa && (
          <Button
            size="small"
            startIcon={<GroupsRoundedIcon />}
            onClick={() => setHelper((v) => !v)}
            sx={{ ml: 'auto' }}
          >
            {t('drawpot.groups.open')}
          </Button>
        )}
      </Stack>
      <Collapse in={helper && !santa} unmountOnExit>
        <Card variant="outlined" sx={{ p: 2, mt: 1.5, borderRadius: 3 }}>
          <Typography variant="body2" color="text.secondary" mb={1.5}>
            {t('drawpot.groups.hint')}
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              type="number"
              size="small"
              label={t('drawpot.groups.people')}
              value={people}
              onChange={(e) => setPeople(clampInt(e.target.value, 1, MAX_ENTRIES))}
              sx={{ width: 120 }}
            />
            <TextField
              type="number"
              size="small"
              label={t('drawpot.groups.size')}
              value={size}
              onChange={(e) => setSize(clampInt(e.target.value, 1, 100))}
              sx={{ width: 120 }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                form.appendEntries(balancedGroupLines(t('drawpot.groups.prefix'), people, size));
                setHelper(false);
              }}
            >
              {t('drawpot.groups.add', { count: Math.ceil(people / size) })}
            </Button>
          </Stack>
        </Card>
      </Collapse>
    </Box>
  );
};
