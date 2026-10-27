/**
 * Dark dialog frame with title and close button for Melodiq Notes [ID: COMP-NOTES-DIALOG-FRAME]
 */
import React from 'react';
import {
  Dialog,
  DialogTitle,
  IconButton,
  Typography,
  type SxProps,
  type Theme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/CloseRounded';

interface NotesDialogFrameProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  maxWidth: 'xs' | 'sm';
  /** Covers the whole screen (on a phone); the close button stays in the title. */
  fullScreen?: boolean;
  titleSx?: SxProps<Theme>;
  children: React.ReactNode;
}

export const NotesDialogFrame: React.FC<NotesDialogFrameProps> = ({
  open,
  onClose,
  title,
  maxWidth,
  fullScreen = false,
  titleSx = { pb: 1 },
  children,
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth={maxWidth}
    fullWidth
    fullScreen={fullScreen}
    PaperProps={{
      sx: {},
    }}
  >
    <DialogTitle
      sx={[
        { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
        ...(Array.isArray(titleSx) ? titleSx : [titleSx]),
      ]}
    >
      <Typography variant="h6" fontWeight={700}>
        {title}
      </Typography>
      <IconButton size="small" onClick={onClose}>
        <CloseIcon />
      </IconButton>
    </DialogTitle>
    {children}
  </Dialog>
);
