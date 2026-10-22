/**
 * Create a card deck from image URLs or a spritesheet [ID: COMP-TABLETOP-DECK-BUILDER]
 */
import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Tab,
  Tabs,
  TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { facesFromImageList, facesFromSpritesheet, type DeckDraft } from '../../logic/deckBuilder';

interface DeckBuilderDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (draft: DeckDraft) => void;
}

export const DeckBuilderDialog: React.FC<DeckBuilderDialogProps> = ({
  open,
  onClose,
  onCreate,
}) => {
  const { t } = useTranslation();
  const label = (key: string) => t(`games.tabletop.editor.deck_${key}`);
  const [tab, setTab] = useState<'list' | 'sheet'>('list');
  const [name, setName] = useState('');
  const [urls, setUrls] = useState('');
  const [sheet, setSheet] = useState({ url: '', cols: 10, rows: 7, count: 70 });
  const [back, setBack] = useState('');
  const [size, setSize] = useState({ width: 80, height: 120 });

  const faces =
    tab === 'list'
      ? facesFromImageList(urls)
      : sheet.url.trim()
        ? facesFromSpritesheet(sheet.url.trim(), sheet.cols, sheet.rows, sheet.count)
        : [];

  const numField = (key: string, value: number, onChange: (n: number) => void) => (
    <TextField
      size="small"
      type="number"
      label={label(key)}
      value={value}
      onChange={(e) => onChange(Math.max(1, Math.round(Number(e.target.value) || 1)))}
      sx={{ flex: 1 }}
    />
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{label('title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            size="small"
            label={label('name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab value="list" label={label('from_list')} />
            <Tab value="sheet" label={label('from_sheet')} />
          </Tabs>
          {tab === 'list' ? (
            <TextField
              multiline
              minRows={5}
              label={label('urls')}
              helperText={label('urls_hint')}
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
            />
          ) : (
            <>
              <TextField
                size="small"
                label={label('sheet_url')}
                value={sheet.url}
                onChange={(e) => setSheet({ ...sheet, url: e.target.value })}
              />
              <Stack direction="row" spacing={1}>
                {numField('cols', sheet.cols, (cols) => setSheet({ ...sheet, cols }))}
                {numField('rows', sheet.rows, (rows) => setSheet({ ...sheet, rows }))}
                {numField('count', sheet.count, (count) => setSheet({ ...sheet, count }))}
              </Stack>
            </>
          )}
          <TextField
            size="small"
            label={label('back')}
            value={back}
            onChange={(e) => setBack(e.target.value)}
          />
          <Stack direction="row" spacing={1}>
            {numField('width', size.width, (width) => setSize({ ...size, width }))}
            {numField('height', size.height, (height) => setSize({ ...size, height }))}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('games.tabletop.editor.close')}</Button>
        <Button
          variant="contained"
          disabled={faces.length === 0}
          onClick={() => onCreate({ label: name.trim(), backImage: back.trim(), ...size, faces })}
        >
          {t('games.tabletop.editor.deck_create', { count: faces.length })}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
