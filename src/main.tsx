import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import App from './App';
import theme from './theme';
import { TitleProvider } from './context/TitleContext';
import { LayoutProvider } from './context/LayoutContext';
import './i18n';
import './index.css';

import { SafeArea } from 'capacitor-plugin-safe-area';

const initSafeArea = async () => {
  try {
    const { insets } = await SafeArea.getSafeAreaInsets();
    for (const [key, value] of Object.entries(insets)) {
      document.documentElement.style.setProperty(`--safe-area-inset-${key}`, `${value}px`);
    }
    SafeArea.addListener('safeAreaChanged', data => {
      for (const [key, value] of Object.entries(data.insets)) {
        document.documentElement.style.setProperty(`--safe-area-inset-${key}`, `${value}px`);
      }
    });
  } catch (e) {
    console.warn('SafeArea plugin not available (probably running in browser)', e);
  }
};
initSafeArea();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <TitleProvider>
          <LayoutProvider>
            <App />
          </LayoutProvider>
        </TitleProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
