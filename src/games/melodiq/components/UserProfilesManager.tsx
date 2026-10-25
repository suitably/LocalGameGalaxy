import React, { useState } from 'react';
import {
  alpha,
  Box,
  Button,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Popover,
  Switch,
  FormControlLabel,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteRounded';
import CheckIcon from '@mui/icons-material/CheckRounded';
import PersonAddIcon from '@mui/icons-material/PersonAddRounded';
import { useTranslation } from 'react-i18next';
import { piecePalette } from '../../../themeTokens';
import { hueForPieceColor, PIECE_HUES, pieceColorForHue, singerColor } from '../logic/singerColor';
import type { UserProfile } from '../types';

interface UserProfilesManagerProps {
  profiles: UserProfile[];
  onAddProfile: () => void;
  onUpdateProfile: (id: string, updates: Partial<UserProfile>) => void;
  onDeleteProfile: (id: string) => void;
}

export const UserProfilesManager: React.FC<UserProfilesManagerProps> = ({
  profiles,
  onAddProfile,
  onUpdateProfile,
  onDeleteProfile,
}) => {
  const { t } = useTranslation();
  // Color Picker State
  const [colorAnchorEl, setColorAnchorEl] = useState<HTMLElement | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  const handleColorClick = (event: React.MouseEvent<HTMLElement>, profileId: string) => {
    setEditingProfileId(profileId);
    setColorAnchorEl(event.currentTarget);
  };

  const handleColorClose = () => {
    setColorAnchorEl(null);
    setEditingProfileId(null);
  };

  const editingHue = profiles.find((p) => p.id === editingProfileId)?.hue;
  const editingColor = editingHue === undefined ? null : pieceColorForHue(editingHue);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">User Profiles</Typography>
        <Button
          startIcon={<PersonAddIcon />}
          variant="contained"
          onClick={onAddProfile}
          sx={{
            borderRadius: 999,
            px: 3,
            py: 1,
          }}
        >
          New User
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {profiles.map((profile) => (
          <Box
            key={profile.id}
            sx={{
              p: 2,
              border: (theme) => `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Avatar sx={{ bgcolor: singerColor(profile.hue), color: piecePalette.contrastText }}>
              {profile.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <TextField
                label="Name"
                value={profile.name}
                onChange={(e) => onUpdateProfile(profile.id, { name: e.target.value })}
                size="small"
                fullWidth
                variant="standard"
              />
              <Box
                onClick={(e) => handleColorClick(e, profile.id)}
                sx={{
                  mt: 1,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: singerColor(profile.hue),
                  cursor: 'pointer',
                  border: '2px solid white',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'scale(1.1)' },
                }}
                role="button"
                tabIndex={0}
                aria-label={t('melodiq.profile_color.change', {
                  color: t(`melodiq.profile_color.${pieceColorForHue(profile.hue)}`),
                })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleColorClick(e as unknown as React.MouseEvent<HTMLElement>, profile.id);
                  }
                }}
              />
            </Box>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={!!profile.hidePitch}
                  onChange={(e) => onUpdateProfile(profile.id, { hidePitch: e.target.checked })}
                />
              }
              label={<Typography variant="caption">Hide Pitch</Typography>}
              labelPlacement="top"
            />
            <IconButton
              onClick={() => onDeleteProfile(profile.id)}
              color="error"
              disabled={profiles.length <= 1}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        ))}
      </Box>

      {/* Color Picker Popover */}
      <Popover
        open={Boolean(colorAnchorEl)}
        anchorEl={colorAnchorEl}
        onClose={handleColorClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, minWidth: 200 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, textAlign: 'center' }}>
            {t('melodiq.profile_color.pick')}
          </Typography>
          <Box
            role="radiogroup"
            aria-label={t('melodiq.profile_color.pick')}
            sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 40px)', gap: 1 }}
          >
            {PIECE_HUES.map(([color]) => {
              const selected = color === editingColor;
              const name = t(`melodiq.profile_color.${color}`);
              return (
                <IconButton
                  key={color}
                  role="radio"
                  aria-checked={selected}
                  aria-label={name}
                  title={name}
                  onClick={() => {
                    if (editingProfileId) {
                      onUpdateProfile(editingProfileId, { hue: hueForPieceColor(color) });
                    }
                  }}
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: piecePalette[color],
                    color: piecePalette.contrastText,
                    border: (theme) =>
                      `2px solid ${selected ? theme.palette.text.primary : 'transparent'}`,
                    '&:hover': { bgcolor: piecePalette[color], opacity: 0.85 },
                  }}
                >
                  {selected ? <CheckIcon fontSize="small" /> : null}
                </IconButton>
              );
            })}
          </Box>
        </Box>
      </Popover>
    </Box>
  );
};
