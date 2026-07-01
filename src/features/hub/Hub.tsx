import React from 'react';
import { Typography, Box, Card, CardContent, CardActionArea, alpha } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';

const cardStyle = (gradientStart: string, gradientEnd: string, hoverColor: string) => ({
    height: '100%',
    borderRadius: 4,
    background: `linear-gradient(135deg, ${alpha(gradientStart, 0.1)} 0%, ${alpha(gradientEnd, 0.2)} 100%)`,
    border: `1px solid ${alpha(gradientStart, 0.2)}`,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
        transform: 'translateY(-8px)',
        boxShadow: `0 12px 24px ${alpha(hoverColor, 0.2)}`,
        border: `1px solid ${alpha(gradientStart, 0.4)}`,
        background: `linear-gradient(135deg, ${alpha(gradientStart, 0.15)} 0%, ${alpha(gradientEnd, 0.25)} 100%)`,
        '&::before': {
            opacity: 1,
        },
        '& .MuiSvgIcon-root': {
            transform: 'scale(1.1) rotate(5deg)',
            filter: `drop-shadow(0 0 12px ${alpha(gradientStart, 0.6)})`,
        }
    }
});

const contentStyle = {
    textAlign: 'center',
    py: 6,
    px: 4,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '100%',
    gap: 2
};

const iconStyle = {
    fontSize: 72,
    mb: 2,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
};

export const Hub: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <Box sx={{ width: '100%', animation: 'fadeIn 0.5s ease-out' }}>
            <Box mb={6} textAlign="center">
                <Typography
                    variant="h2"
                    component="h1"
                    gutterBottom
                    sx={{
                        fontWeight: 800,
                        background: 'linear-gradient(90deg, #90caf9, #f48fb1)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0 4px 12px rgba(144, 202, 249, 0.2)'
                    }}
                >
                    {t('app.welcome')}
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', fontWeight: 400 }}>
                    {t('app.select_game')}
                </Typography>
            </Box>

            <Box sx={{
                display: 'grid',
                gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)'
                },
                gap: 4
            }}>
                <Card sx={cardStyle('#90caf9', '#1e88e5', '#1e88e5')}>
                    <CardActionArea
                        onClick={() => navigate('/games/werewolf')}
                        sx={{ height: '100%' }}
                    >
                        <CardContent sx={contentStyle}>
                            <SportsEsportsIcon sx={{ ...iconStyle, color: '#90caf9' }} />
                            <Typography variant="h4" component="h2" fontWeight="bold">
                                {t('games.werewolf.title')}
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                                {t('games.werewolf.description')}
                            </Typography>
                        </CardContent>
                    </CardActionArea>
                </Card>

                <Card sx={cardStyle('#f48fb1', '#d81b60', '#d81b60')}>
                    <CardActionArea
                        onClick={() => navigate('/games/imposter')}
                        sx={{ height: '100%' }}
                    >
                        <CardContent sx={contentStyle}>
                            <PersonSearchIcon sx={{ ...iconStyle, color: '#f48fb1' }} />
                            <Typography variant="h4" component="h2" fontWeight="bold">
                                {t('games.imposter.title')}
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                                {t('games.imposter.description')}
                            </Typography>
                        </CardContent>
                    </CardActionArea>
                </Card>

                <Card sx={cardStyle('#81c784', '#388e3c', '#388e3c')}>
                    <CardActionArea
                        onClick={() => navigate('/games/melodiq')}
                        sx={{ height: '100%' }}
                    >
                        <CardContent sx={contentStyle}>
                            <GraphicEqIcon sx={{ ...iconStyle, color: '#81c784' }} />
                            <Typography variant="h4" component="h2" fontWeight="bold">
                                {t('games.melodiq.title')}
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                                {t('games.melodiq.description')}
                            </Typography>
                        </CardContent>
                    </CardActionArea>
                </Card>
            </Box>

            <style>
                {`
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}
            </style>
        </Box>
    );
};
