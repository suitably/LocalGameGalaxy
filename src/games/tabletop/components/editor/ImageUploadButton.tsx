/**
 * Picks an image file and returns it as a scaled data URL [ID: COMP-TABLETOP-IMAGE-UPLOAD]
 */
import React, { useRef, useState } from 'react';
import { CircularProgress, IconButton, Tooltip } from '@mui/material';
import UploadIcon from '@mui/icons-material/UploadRounded';
import { useTranslation } from 'react-i18next';
import { fileToDataUrl } from '../../logic/imageUpload';

interface ImageUploadButtonProps {
  onImage: (dataUrl: string) => void;
}

export const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({ onImage }) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <Tooltip title={t('games.tabletop.editor.upload_image')}>
        <span>
          <IconButton size="small" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? <CircularProgress size={18} /> : <UploadIcon fontSize="small" />}
          </IconButton>
        </span>
      </Tooltip>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          setBusy(true);
          try {
            onImage(await fileToDataUrl(file));
          } catch (err) {
            console.warn('[Tabletop] Image upload failed:', err);
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
};
