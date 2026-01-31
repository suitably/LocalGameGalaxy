import React from 'react';
import { AppBar, Toolbar, Typography, Container, Box, IconButton, Menu, MenuItem } from '@mui/material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import TranslateIcon from '@mui/icons-material/Translate';
import HomeIcon from '@mui/icons-material/Home';
import { useTranslation } from 'react-i18next';
import { useTitle } from '../../context/TitleContext';

export const MainLayout: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { pageTitle } = useTitle();
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

    const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        handleClose();
    };

    const location = useLocation();
    const isMelodiq = location.pathname.includes('/games/melodiq');

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            <AppBar position="static">
                <Toolbar>
                    <IconButton
                        size="large"
                        edge="start"
                        color="inherit"
                        aria-label="home"
                        sx={{ mr: 2 }}
                        onClick={() => navigate('/')}
                    >
                        <HomeIcon />
                    </IconButton>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        {pageTitle || t('app.title')}
                    </Typography>
                    <div>
                        <IconButton
                            size="large"
                            aria-label="language selector"
                            aria-controls="menu-appbar"
                            aria-haspopup="true"
                            onClick={handleMenu}
                            color="inherit"
                        >
                            <TranslateIcon />
                        </IconButton>
                        <Menu
                            id="menu-appbar"
                            anchorEl={anchorEl}
                            anchorOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            keepMounted
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            open={Boolean(anchorEl)}
                            onClose={handleClose}
                        >
                            <MenuItem onClick={() => changeLanguage('en')}>English</MenuItem>
                            <MenuItem onClick={() => changeLanguage('de')}>Deutsch</MenuItem>
                        </Menu>
                    </div>
                </Toolbar>
            </AppBar>

            {isMelodiq ? (
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
