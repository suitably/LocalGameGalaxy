/**
 * A titled list of pots with open and forget actions [ID: DRAWPOT-POT-LIST]
 */
import React, { useState } from 'react';
import {
  Card,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';

export interface PotListItem {
  id: string;
  primary: string;
  secondary: string;
  expired: boolean;
}

interface PotListProps {
  title: string;
  empty: string;
  items: PotListItem[];
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
  removeLabel: string;
}

export const PotList: React.FC<PotListProps> = ({
  title,
  empty,
  items,
  onOpen,
  onRemove,
  removeLabel,
}) => {
  const { t } = useTranslation();
  const [pending, setPending] = useState<string | null>(null);
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ px: 2, pt: 1.5 }}>
        {title}
      </Typography>
      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1.5 }}>
          {empty}
        </Typography>
      ) : (
        <List dense>
          {items.map((item) => (
            <ListItem
              key={item.id}
              disablePadding
              secondaryAction={
                <IconButton edge="end" aria-label={removeLabel} onClick={() => setPending(item.id)}>
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemButton onClick={() => onOpen(item.id)}>
                <ListItemText
                  primary={item.primary}
                  secondary={item.secondary}
                  slotProps={{ primary: { sx: { fontWeight: 600 } }, secondary: { noWrap: true } }}
                />
                {item.expired && (
                  <Chip size="small" label={t('drawpot.home.expired')} sx={{ ml: 1 }} />
                )}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
      <ConfirmDialog
        open={pending !== null}
        title={removeLabel}
        message={t('drawpot.home.forgetMessage')}
        confirmText={removeLabel}
        confirmColor="error"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) onRemove(pending);
          setPending(null);
        }}
      />
    </Card>
  );
};
