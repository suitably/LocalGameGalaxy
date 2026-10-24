import React, { useState } from 'react';
import { alpha, Box, Button, Tooltip } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScannerRounded';
import { useTranslation } from 'react-i18next';
import { QRScannerDialog } from './QRScannerDialog';

export interface DeviceQRCodeCardProps {
  qrCodeDataUrl: string;
  onScanSuccess: (rawText: string) => void;
}

export const DeviceQRCodeCard: React.FC<DeviceQRCodeCardProps> = ({
  qrCodeDataUrl,
  onScanSuccess,
}) => {
  const { t } = useTranslation();
  const [scannerOpen, setScannerOpen] = useState(false);

  const handleScan = (rawText: string) => {
    setScannerOpen(false);
    onScanSuccess(rawText);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      {qrCodeDataUrl && (
        <Box sx={{ p: 2, bgcolor: 'text.primary', borderRadius: 2, boxShadow: 0 }}>
          <img
            src={qrCodeDataUrl}
            alt="QR Code"
            style={{ display: 'block', width: 250, height: 250 }}
          />
        </Box>
      )}

      {/* Scan to Join Button */}
      <Tooltip
        title={t(
          'connection.scan_tooltip',
          "Open camera to scan another host's QR code and join as a client",
        )}
      >
        <Button
          variant="outlined"
          startIcon={<QrCodeScannerIcon />}
          onClick={() => setScannerOpen(true)}
          sx={{
            borderRadius: 999,
            px: 3,
            py: 1,
            borderColor: (theme) => alpha(theme.palette.secondary.main, 0.5),
            color: 'secondary.main',
            '&:hover': {
              borderColor: 'secondary.main',
              bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.08),
            },
          }}
        >
          {t('connection.scan_to_join', 'Scan QR to Join another Host')}
        </Button>
      </Tooltip>

      {/* QR Scanner Dialog */}
      <QRScannerDialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
      />
    </Box>
  );
};
