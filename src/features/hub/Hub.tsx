import React, { useState } from 'react';
import { Typography, Box, Card, CardContent, CardActionArea, Chip, Stack, alpha } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { gameRegistry, type GameCategory } from '../../lib/gameRegistry';
import { PWAInstallBanner } from '../../components/pwa';

const cardStyle = (gradientStart: string, gradientEnd: string, hoverColor: string) => ({
    height: '100%',
    borderRadius: 4,
    background: `linear-gradient(135deg, ${alpha(gradientStart, 0.1)} 0%, ${alpha(gradientEnd, 0.2)} 100%)`,
    border: `1px solid ${alpha(gradientStart, 0.2)}`,
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: `linear-gradient(90deg, ${gradientStart}, ${gradientEnd})`,
        opacity: 0.5,
        transition: 'opacity 0.3s ease',
    },
    '&:hover': {
        transform: 'translateY(-6px)',
        boxShadow: `0 12px 24px ${alpha(hoverColor, 0.2)}`,
        border: `1px solid ${alpha(gradientStart, 0.4)}`,
        background: `linear-gradient(135deg, ${alpha(gradientStart, 0.15)} 0%, ${alpha(gradientEnd, 0.25)} 100%)`,
        '&::before': {
            opacity: 1,
        },
        '& .MuiSvgIcon-root': {
            transform: 'scale(1.08) rotate(4deg)',
            filter: `drop-shadow(0 0 12px ${alpha(gradientStart, 0.6)})`,
        }
    },
    '&:active': {
        transform: 'scale(0.98)',
    }
});

const contentStyle = {
    textAlign: 'center',
    py: { xs: 3, sm: 4, md: 5 },
    px: { xs: 2.5, sm: 3, md: 4 },
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '100%',
    gap: { xs: 1, sm: 1.5, md: 2 }
};

export const Hub: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [selectedCategory, setSelectedCategory] = useState<GameCategory>('all');

    const categories: { key: GameCategory; labelKey: string; icon: string }[] = [
        { key: 'all', labelKey: 'hub.categories.all', icon: '✨' },
        { key: 'dice', labelKey: 'hub.categories.dice', icon: '🎲' },
        { key: 'cards', labelKey: 'hub.categories.cards', icon: '🃏' },
        { key: 'drawing', labelKey: 'hub.categories.drawing', icon: '🎨' },
        { key: 'music', labelKey: 'hub.categories.music', icon: '🎵' },
        { key: 'social_deduction', labelKey: 'hub.categories.social_deduction', icon: '🕵️' },
        { key: 'party', labelKey: 'hub.categories.party', icon: '🎉' },
    ];

    const displayedGames = gameRegistry.getGamesByCategory(selectedCategory);

    return (
        <Box sx={{ width: '100%', animation: 'fadeIn 0.4s ease-out' }}>
            <Box mb={{ xs: 2.5, sm: 3, md: 4 }} textAlign="center">
                <Typography
                    variant="h2"
                    component="h1"
                    gutterBottom
                    sx={{
                        fontWeight: 800,
                        fontSize: { xs: '1.85rem', sm: '2.5rem', md: '3.25rem' },
                        background: 'linear-gradient(90deg, #90caf9, #f48fb1)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0 4px 12px rgba(144, 202, 249, 0.2)'
                    }}
                >
                    {t('app.welcome')}
                </Typography>
                <Typography 
                    variant="body1" 
                    color="text.secondary" 
                    sx={{ 
                        maxWidth: 600, 
                        mx: 'auto', 
                        fontSize: { xs: '0.95rem', sm: '1.05rem', md: '1.15rem' },
                        fontWeight: 400 
                    }}
                >
                    {t('app.select_game')}
                </Typography>
            </Box>

            {/* PWA Mobile Fullscreen Install Callout */}
            <PWAInstallBanner />

            {/* Category Filter Pills */}
            <Stack
                direction="row"
                spacing={1}
                sx={{
                    mb: 3.5,
                    overflowX: 'auto',
                    pb: 1,
                    justifyContent: { xs: 'flex-start', sm: 'center' },
                    px: { xs: 1, sm: 0 },
                    scrollbarWidth: 'none',
                    '&::-webkit-scrollbar': { display: 'none' },
                }}
            >
                {categories.map(cat => {
                    const isSelected = selectedCategory === cat.key;
                    return (
                        <Chip
                            key={cat.key}
                            label={`${cat.icon} ${t(cat.labelKey)}`}
                            clickable
                            onClick={() => setSelectedCategory(cat.key)}
                            color={isSelected ? 'primary' : 'default'}
                            variant={isSelected ? 'filled' : 'outlined'}
                            sx={{
                                fontWeight: 700,
                                fontSize: { xs: '0.85rem', sm: '0.95rem' },
                                px: 1,
                                py: 2.2,
                                borderRadius: 50,
                                bgcolor: isSelected ? undefined : 'rgba(255, 255, 255, 0.04)',
                                borderColor: isSelected ? undefined : 'rgba(255, 255, 255, 0.12)',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    bgcolor: isSelected ? undefined : 'rgba(255, 255, 255, 0.08)',
                                    transform: 'translateY(-1px)',
                                }
                            }}
                        />
                    );
                })}
            </Stack>

            <Box sx={{
                display: 'grid',
                gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)'
                },
                gap: { xs: 2.5, sm: 3, md: 4 }
            }}>
                {displayedGames.map(game => (
                    <Card key={game.id} sx={cardStyle(game.colorStart, game.colorEnd, game.hoverColor)}>
                        <CardActionArea
                            onClick={() => navigate(`/${game.route}`)}
                            sx={{ height: '100%' }}
                        >
                            <CardContent sx={contentStyle}>
                                {React.cloneElement(game.icon as React.ReactElement<{ sx?: Record<string, unknown> }>, {
                                    sx: {
                                        fontSize: { xs: 48, sm: 58, md: 72 },
                                        mb: 1.5,
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        color: game.colorStart
                                    }
                                })}
                                <Typography 
                                    variant="h5" 
                                    component="h2" 
                                    fontWeight="bold" 
                                    sx={{ fontSize: { xs: '1.35rem', sm: '1.5rem', md: '1.75rem' } }}
                                >
                                    {t(game.titleKey)}
                                </Typography>
                                <Typography 
                                    variant="body2" 
                                    color="text.secondary" 
                                    sx={{ 
                                        lineHeight: 1.5,
                                        fontSize: { xs: '0.875rem', sm: '0.925rem', md: '1rem' } 
                                    }}
                                >
                                    {t(game.descriptionKey)}
                                </Typography>
                            </CardContent>
                        </CardActionArea>
                    </Card>
                ))}
            </Box>

            <style>
                {`
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(16px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}
            </style>
        </Box>
    );
};
