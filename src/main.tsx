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
