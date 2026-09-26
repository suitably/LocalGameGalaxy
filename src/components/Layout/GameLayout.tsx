import React, { type ReactNode } from 'react';
import { Box, Container, type ContainerProps } from '@mui/material';

interface GameLayoutProps {
    children: ReactNode;
    maxWidth?: ContainerProps['maxWidth'];
    disablePadding?: boolean;
}

export const GameLayout: React.FC<GameLayoutProps> = ({ 
    children, 
    maxWidth = 'lg',
    disablePadding = false
}) => {
    return (
        <Box
            sx={{
                width: '100%',
                height: '100%',
                overflowY: 'auto',
                overflowX: 'hidden',
                WebkitOverflowScrolling: 'touch',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Container
                maxWidth={maxWidth}
                sx={{
                    py: disablePadding ? 0 : { xs: 1.5, sm: 3 },
                    px: { xs: 1, sm: 2 },
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                }}
            >
                {children}
            </Container>
        </Box>
    );
};
