import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    componentName?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <Box sx={{ p: 4, bgcolor: 'background.paper', border: '1px solid error.main', borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="h5" color="error" gutterBottom>
                        Something went wrong in {this.props.componentName || 'this component'}.
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {this.state.error?.message}
                    </Typography>
                    <Button variant="outlined" onClick={() => this.setState({ hasError: false, error: null })}>
                        Try Again
                    </Button>
                </Box>
            );
        }

        return this.props.children;
    }
}
