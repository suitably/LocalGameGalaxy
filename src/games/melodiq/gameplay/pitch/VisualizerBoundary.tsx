import React from 'react';
import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from '../../../../components/ErrorBoundary';

const VisualizerFallback: React.FC = () => {
  const { t } = useTranslation();
  return <Box sx={{ color: 'error.main', p: 1 }}>{t('melodiq.session.visualizer_error')}</Box>;
};

/** Error boundary around the pitch visualizer with a translated fallback. */
export const VisualizerBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary fallback={<VisualizerFallback />}>{children}</ErrorBoundary>
);
