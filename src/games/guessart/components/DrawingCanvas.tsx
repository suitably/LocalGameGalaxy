import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Paper, Typography } from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import BrushRoundedIcon from '@mui/icons-material/BrushRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import { useTranslation } from 'react-i18next';
import { ensureDrawMetadata, parseSceneData, type ExcalidrawScenePayload } from '../logic/excalidrawScene';
import { ExcalidrawLazy } from './ExcalidrawLazy';
import type { GuessArtRound } from '../logic/types';

interface DrawingCanvasProps {
  currentRound: GuessArtRound | null;
  onSubmit: (canvasData: string) => Promise<void>;
  loading?: boolean;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  currentRound,
  onSubmit,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [feedback, setFeedback] = useState<{ type: 'error' | 'warning' | 'success'; text: string } | null>(null);
  const initialScene = useMemo(() => parseSceneData(currentRound?.canvasData), [currentRound?.canvasData]);
  const latestSceneRef = useRef<ExcalidrawScenePayload>(initialScene);
  const serializedSceneRef = useRef<string>('');
  const hasInitializedScene = useRef<boolean>(false);
  const [excalidrawAPI, setExcalidrawAPI] = useState<{
    updateScene: (scene: ExcalidrawScenePayload) => void;
  } | null>(null);

  const handleExcalidrawInit = useCallback((api: unknown) => {
    if (!api) return;
    setExcalidrawAPI(api as { updateScene: (scene: ExcalidrawScenePayload) => void });
  }, []);

  const serializeScene = useCallback((scene: ExcalidrawScenePayload) => {
    try {
      return JSON.stringify(scene);
    } catch (error) {
      console.warn('Failed to serialize scene', error);
      return null;
    }
  }, []);

  useEffect(() => {
    latestSceneRef.current = initialScene;
    const serialized = serializeScene(initialScene);
    if (serialized) {
      serializedSceneRef.current = serialized;
    }
  }, [initialScene, serializeScene]);

  useEffect(() => {
    if (!excalidrawAPI || typeof excalidrawAPI.updateScene !== 'function') {
      return;
    }

    const incomingScene = parseSceneData(currentRound?.canvasData);
    const serializedIncoming = serializeScene(incomingScene);
    if (serializedIncoming == null) {
      return;
    }

    if (!hasInitializedScene.current) {
      hasInitializedScene.current = true;
      latestSceneRef.current = incomingScene;
      serializedSceneRef.current = serializedIncoming;
      excalidrawAPI.updateScene(incomingScene);
      return;
    }

    if (serializedIncoming !== serializedSceneRef.current) {
      latestSceneRef.current = incomingScene;
      serializedSceneRef.current = serializedIncoming;
      excalidrawAPI.updateScene(incomingScene);
    }
  }, [currentRound?.canvasData, excalidrawAPI, serializeScene]);

  const handleSubmit = async () => {
    const scene = latestSceneRef.current;
    const cleanElements = Array.isArray(scene?.elements)
      ? scene.elements.filter((element) => element && !element.isDeleted && element.type !== 'selection')
      : [];

    if (cleanElements.length === 0) {
      setFeedback({ type: 'warning', text: t('guessart.canvasEmptyWarning', 'Please draw something before submitting!') });
      return;
    }

    const payload = JSON.stringify({
      elements: cleanElements,
      appState: {
        ...(scene.appState || {}),
        selectedElementIds: {},
        selectedGroupIds: {},
        editingElement: null,
        draggingElement: null,
        selectedLinearElement: null,
        editingLinearElement: null,
        selectionElement: null,
        collaborators: [],
        viewModeEnabled: false,
      },
      files: scene.files || {},
    });

    try {
      await onSubmit(payload);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : t('guessart.genericError', 'An error occurred'),
      });
    }
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Secret Word Banner for Drawer */}
      {currentRound?.word && (
        <Paper
          elevation={1}
          sx={{
            px: { xs: 1.5, sm: 2 },
            py: 0.8,
            mb: 1,
            borderRadius: 2.5,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <BrushRoundedIcon sx={{ fontSize: 20 }} />
            <Typography variant="body2" fontWeight={700}>
              {t('guessart.drawWordPrompt', 'Zeichne:')}
            </Typography>
            <Chip
              label={currentRound.word}
              size="medium"
              sx={{
                fontWeight: 900,
                fontSize: { xs: '1rem', sm: '1.15rem' },
                bgcolor: 'background.paper',
                color: 'text.primary',
                px: 0.5,
                boxShadow: 1,
              }}
            />
          </Box>

          <Box display="flex" alignItems="center" gap={0.5} sx={{ opacity: 0.9 }}>
            <LockRoundedIcon sx={{ fontSize: 15 }} />
            <Typography variant="caption" fontWeight={600}>
              {t('guessart.secretWordOnlyYou', 'Nur für dich sichtbar')}
            </Typography>
          </Box>
        </Paper>
      )}

      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          height: '100%',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          position: 'relative',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'absolute', inset: 0 }}>
          <React.Suspense
            fallback={
              <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress size={32} />
              </Box>
            }
          >
            <ExcalidrawLazy
              excalidrawAPI={handleExcalidrawInit}
              initialData={initialScene as unknown as Record<string, unknown>}
              onChange={(elements, appState, files) => {
                const mergedAppState = {
                  ...(latestSceneRef.current?.appState || {}),
                  ...(appState || {}),
                };
                const mergedFiles = files || latestSceneRef.current?.files || {};
                const normalizedScene = ensureDrawMetadata({
                  elements,
                  appState: mergedAppState,
                  files: mergedFiles,
                });
                latestSceneRef.current = normalizedScene;
                const serialized = serializeScene(normalizedScene);
                if (serialized) {
                  serializedSceneRef.current = serialized;
                }
              }}
              viewModeEnabled={false}
            />
          </React.Suspense>
        </Box>
      </Box>

      {feedback && (
        <Alert severity={feedback.type} onClose={() => setFeedback(null)} sx={{ mt: 1 }}>
          {feedback.text}
        </Alert>
      )}

      <Box sx={{ pt: { xs: 1, sm: 2 }, pb: { xs: 0.5, sm: 1 } }}>
        <Button
          variant="contained"
          color="primary"
          size="medium"
          fullWidth
          onClick={handleSubmit}
          disabled={loading}
          endIcon={loading ? null : <SendRoundedIcon />}
          sx={{ py: { xs: 1, sm: 1.5 }, fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1.05rem' } }}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : t('guessart.submitDrawing', 'Fertig gezeichnet')}
        </Button>
      </Box>
    </Box>
  );
};
