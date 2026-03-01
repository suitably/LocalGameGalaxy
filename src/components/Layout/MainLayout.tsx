import React from 'react';
import { Box } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import { GlobalHeader } from './GlobalHeader';

export const MainLayout: React.FC = () => {
    const location = useLocation();
    const isGame = location.pathname.includes('/games/');

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            <GlobalHeader />

            {isGame ? (
                <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <Outlet />
                </Box>
            ) : (
                <Box sx={{
                    flex: 1,
                    overflow: 'auto',
                    px: { xs: 2, sm: 4, md: 8, lg: 12 },
                    py: 4,
                    width: '100%',
                    maxWidth: '1920px',
                    margin: '0 auto'
                }}>
                    <Outlet />
                </Box>
            )}
        </Box>
    );
};
