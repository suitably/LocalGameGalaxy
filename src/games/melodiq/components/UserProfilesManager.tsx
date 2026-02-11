import React, { useState } from 'react';
import {
    Box, Button, Typography, TextField, IconButton, Avatar, Popover, Slider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
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
    onDeleteProfile
}) => {
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

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">User Profiles</Typography>
                <Button
                    startIcon={<PersonAddIcon />}
                    variant="contained"
                    onClick={onAddProfile}
                    sx={{
                        borderRadius: 50,
                        px: 3,
                        py: 1,
                        backgroundImage: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                        boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
                        color: 'white'
                    }}
                >
                    New User
                </Button>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {profiles.map(profile => (
                    <Box key={profile.id} sx={{ p: 2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: `hsl(${profile.hue}, 100%, 50%)` }}>
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
                                    bgcolor: `hsl(${profile.hue}, 100%, 50%)`,
                                    cursor: 'pointer',
                                    border: '2px solid white',
                                    boxShadow: '0 0 4px rgba(0,0,0,0.3)',
                                    transition: 'transform 0.2s',
                                    '&:hover': { transform: 'scale(1.1)' }
                                }}
                                title="Change Color"
                            />
                        </Box>
                        <IconButton onClick={() => onDeleteProfile(profile.id)} color="error" disabled={profiles.length <= 1}>
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
                <Box sx={{ p: 2, bgcolor: '#1a1a1a', minWidth: 200 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, textAlign: 'center' }}>Pick Color</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                            sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                bgcolor: editingProfileId ? `hsl(${profiles.find(p => p.id === editingProfileId)?.hue || 0}, 100%, 50%)` : 'grey',
                                border: '1px solid rgba(255,255,255,0.3)'
                            }}
                        />
                        <Slider
                            value={editingProfileId ? profiles.find(p => p.id === editingProfileId)?.hue || 0 : 0}
                            min={0}
                            max={360}
                            onChange={(_, val) => {
                                if (editingProfileId) {
                                    onUpdateProfile(editingProfileId, { hue: val as number });
                                }
                            }}
                            sx={{
                                width: 200,
                                '& .MuiSlider-track': {
                                    border: 'none',
                                    background: 'transparent'
                                },
                                '& .MuiSlider-rail': {
                                    opacity: 1,
                                    background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #00f 83%, #f00 100%)',
                                    height: 8,
                                    borderRadius: 4
                                },
                                '& .MuiSlider-thumb': {
                                    height: 20,
                                    width: 20,
                                    backgroundColor: '#fff',
                                    border: '2px solid currentColor',
                                    '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
                                        boxShadow: 'inherit',
                                    },
                                    '&:before': {
                                        display: 'none',
                                    },
                                },
                                color: 'white'
                            }}
                        />
                    </Box>
                </Box>
            </Popover>
        </Box>
    );
};
