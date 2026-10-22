/**
 * Form fields for the selected widget, common and per type [ID: COMP-TABLETOP-INSPECTOR-FIELDS]
 */
import React from 'react';
import { FormControlLabel, MenuItem, Stack, Switch, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TabletopWidget } from '../../logic/types';
import type { WidgetPatch } from '../../logic/widgetEdits';

interface InspectorFieldsProps {
  widget: TabletopWidget;
  onPatch: (patch: WidgetPatch) => void;
}

type Values = Record<string, unknown>;

export const InspectorFields: React.FC<InspectorFieldsProps> = ({ widget, onPatch }) => {
  const { t } = useTranslation();
  const values = widget as unknown as Values;
  const label = (key: string) => t(`games.tabletop.editor.${key}`);

  const num = (key: string) => (
    <TextField
      key={key}
      size="small"
      type="number"
      label={label(key)}
      value={typeof values[key] === 'number' ? values[key] : ''}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (e.target.value !== '' && Number.isFinite(n)) onPatch({ [key]: n } as WidgetPatch);
      }}
      sx={{ flex: 1, minWidth: 0 }}
    />
  );

  const text = (key: string) => (
    <TextField
      key={key}
      size="small"
      fullWidth
      label={label(key)}
      value={typeof values[key] === 'string' ? values[key] : ''}
      onChange={(e) => onPatch({ [key]: e.target.value || undefined } as WidgetPatch)}
    />
  );

  const bool = (key: string) => (
    <FormControlLabel
      key={key}
      control={
        <Switch
          checked={Boolean(values[key])}
          onChange={(e) => onPatch({ [key]: e.target.checked } as WidgetPatch)}
        />
      }
      label={label(key)}
    />
  );

  return (
    <Stack spacing={1.5}>
      {text('label')}
      <Stack direction="row" spacing={1}>
        {num('x')}
        {num('y')}
      </Stack>
      <Stack direction="row" spacing={1}>
        {num('width')}
        {num('height')}
      </Stack>
      <Stack direction="row" spacing={1}>
        {num('zIndex')}
        {num('rotation')}
      </Stack>
      {text('image')}
      <TextField
        select
        size="small"
        label={label('ownerSeat')}
        value={typeof widget.ownerSeat === 'number' ? String(widget.ownerSeat) : ''}
        onChange={(e) =>
          onPatch({ ownerSeat: e.target.value === '' ? undefined : Number(e.target.value) })
        }
      >
        <MenuItem value="">{label('none')}</MenuItem>
        {Array.from({ length: 8 }, (_, i) => (
          <MenuItem key={i} value={String(i)}>
            {i + 1}
          </MenuItem>
        ))}
      </TextField>
      {bool('pinned')}

      {(widget.type === 'token' || widget.type === 'die') && text('color')}
      {widget.type === 'counter' && (
        <Stack direction="row" spacing={1}>
          {num('value')}
          {num('step')}
        </Stack>
      )}
      {widget.type === 'die' && num('sides')}
      {widget.type === 'holder' && (
        <>
          <TextField
            select
            size="small"
            label={label('layout')}
            value={widget.layout}
            onChange={(e) => onPatch({ layout: e.target.value } as WidgetPatch)}
          >
            {['stack', 'fan', 'grid'].map((l) => (
              <MenuItem key={l} value={l}>
                {label(`layout_${l}`)}
              </MenuItem>
            ))}
          </TextField>
          {bool('isHand')}
        </>
      )}
      {widget.type === 'label' && (
        <>
          <TextField
            size="small"
            multiline
            label={label('text')}
            value={widget.text}
            onChange={(e) => onPatch({ text: e.target.value } as WidgetPatch)}
          />
          {num('fontSize')}
          {text('color')}
        </>
      )}
      {widget.type === 'timer' && (
        <TextField
          size="small"
          type="number"
          label={label('duration_seconds')}
          helperText={label('duration_hint')}
          value={Math.round(widget.durationMs / 1000)}
          onChange={(e) =>
            onPatch({ durationMs: Math.max(0, Number(e.target.value) || 0) * 1000 } as WidgetPatch)
          }
        />
      )}
      {widget.type === 'spinner' && (
        <TextField
          size="small"
          label={label('options')}
          helperText={label('options_hint')}
          value={widget.options.join(', ')}
          onChange={(e) =>
            onPatch({
              options: e.target.value
                .split(',')
                .map((o) => o.trim())
                .filter(Boolean),
            } as WidgetPatch)
          }
        />
      )}
      {widget.type === 'card' && (
        <TextField
          size="small"
          label={label('front_text')}
          value={widget.frontContent.type === 'text' ? widget.frontContent.value : ''}
          disabled={widget.frontContent.type !== 'text'}
          onChange={(e) =>
            onPatch({ frontContent: { type: 'text', value: e.target.value } } as WidgetPatch)
          }
        />
      )}
    </Stack>
  );
};
