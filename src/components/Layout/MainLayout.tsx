import React from 'react';
import { Container, Box } from '@mui/material';
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
                <Container maxWidth="md" sx={{ mt: 4, flex: 1, pb: 4, overflow: 'auto' }}>
                    <Outlet />
                </Container>
            )}
        </Box>
    );
};
