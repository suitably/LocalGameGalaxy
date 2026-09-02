/**
 * WordleDuelModal.tsx - Create a Custom 5-Letter Word Challenge Link / QR Code
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  InputAdornment,
  Alert,
} from '@mui/material';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { wordleEngine } from '../logic/wordleEngine';

interface WordleDuelModalProps {
  open: boolean;
  onClose: () => void;
}

export const WordleDuelModal: React.FC<WordleDuelModalProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const [customWord, setCustomWord] = useState('');
  const [copied, setCopied] = useState(false);

  const cleanWord = customWord.trim().toUpperCase().replace(/[^A-Z]/g, '').substring(0, 5);
  const isValid = cleanWord.length === 5;

  const duelLink = isValid
    ? `${window.location.origin}${window.location.pathname}#/games/wordle?duel=${wordleEngine.encodeDuelWord(cleanWord)}`
    : '';

  const handleCopy = () => {
    if (!duelLink) return;
    navigator.clipboard.writeText(duelLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    if (!duelLink) return;
    const shareText = `🧩 Ich habe ein 5-Buchstaben-Wort für dich ausgesucht! Kannst du es erraten?\n${duelLink}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Wordle Challenge',
          text: shareText,
          url: duelLink,
        });
        return;
      } catch {
        // Fallback
      }
    }

    handleCopy();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', fontWeight: 800 }}>
        {t('wordle.duel.title', 'Freund herausfordern ⚔️')}
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {t('wordle.duel.desc', 'Wähle ein beliebiges 5-Buchstaben-Wort. Dein Freund muss es erraten!')}
        </Typography>

        <TextField
          autoFocus
          label={t('wordle.duel.input_label', 'Geheimes Wort (5 Buchstaben)')}
          value={cleanWord}
          onChange={(e) => setCustomWord(e.target.value)}
          inputProps={{ maxLength: 5, style: { textTransform: 'uppercase', letterSpacing: 4, textAlign: 'center', fontWeight: 700 } }}
          fullWidth
          error={cleanWord.length > 0 && cleanWord.length < 5}
          helperText={cleanWord.length > 0 && cleanWord.length < 5 ? `${cleanWord.length}/5 Buchstaben` : ''}
        />

        {isValid && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, mt: 1 }}>
            <Box sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: 2 }}>
              <QRCodeSVG value={duelLink} size={150} />
            </Box>

            <TextField
              value={duelLink}
              size="small"
              fullWidth
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleCopy} edge="end" color={copied ? 'success' : 'primary'}>
                      {copied ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        )}

        {copied && (
          <Alert severity="success" sx={{ py: 0.5 }}>
            {t('wordle.copied_to_clipboard', 'Link kopiert!')}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose}>{t('common.close', 'Schließen')}</Button>
        {isValid && (
          <Button variant="contained" startIcon={<ShareRoundedIcon />} onClick={handleShare}>
            {t('common.share', 'Teilen')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
