import React from 'react';
import { Typography, Box, Card, CardContent, CardActionArea } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';

export const Hub: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <div>
            <Typography variant="h4" gutterBottom>
                {t('app.welcome')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ width: { xs: '100%', sm: '50%' } }}>
                    <Card>
                        <CardActionArea onClick={() => navigate('/games/werewolf')}>
                            <CardContent sx={{ textAlign: 'center', py: 5 }}>
                                <SportsEsportsIcon sx={{ fontSize: 60, mb: 2, color: 'secondary.main' }} />
                                <Typography variant="h5" component="div">
                                    {t('games.werewolf.title')}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {t('games.werewolf.description')}
                                </Typography>
                            </CardContent>
                        </CardActionArea>
                    </Card>
                </Box>
            </Box>
        </div>
    );
};
