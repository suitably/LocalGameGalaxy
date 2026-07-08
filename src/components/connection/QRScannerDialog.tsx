import React, { useEffect, useRef, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Alert,
    CircularProgress,
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { Html5Qrcode } from 'html5-qrcode';

const SCANNER_ELEMENT_ID = 'qr-scanner-reader';

export interface QRScannerDialogProps {
    open: boolean;
    onClose: () => void;
    /** Called with the raw decoded text when a QR code is successfully scanned */
    onScan: (decodedText: string) => void;
}

/**
 * QRScannerDialog – Renders an Html5Qrcode camera scanner inside a MUI Dialog.
 * Uses the html5-qrcode library which works both in the browser and inside a
 * Capacitor Android WebView (requires android.permission.CAMERA in manifest).
 */
export const QRScannerDialog: React.FC<QRScannerDialogProps> = ({ open, onClose, onScan }) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isStarting, setIsStarting] = useState(false);

    // Start scanner when dialog opens
    useEffect(() => {
        if (!open) return;

        let cancelled = false;

        const startScanner = async () => {
            setError(null);
            setIsStarting(true);

            // Small delay to let the Dialog DOM render before we attach
            await new Promise<void>(resolve => setTimeout(resolve, 300));
            if (cancelled) return;

            try {
                const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
                scannerRef.current = scanner;

                await scanner.start(
                    { facingMode: 'environment' }, // prefer back camera
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                    },
                    (decodedText) => {
                        if (!cancelled) {
                            onScan(decodedText);
                        }
                    },
                    () => {
                        // scan failure – ignore, keep scanning
                    }
                );
                setIsStarting(false);
            } catch (err: any) {
                if (!cancelled) {
                    setIsStarting(false);
                    setError(
                        err?.message?.includes('Permission')
                            ? 'Camera permission denied. Please allow camera access and try again.'
                            : `Could not start camera: ${err?.message ?? String(err)}`
                    );
                }
            }
        };

        startScanner();

        return () => {
            cancelled = true;
            // Stop and clear the scanner on unmount / close
            const scanner = scannerRef.current;
            if (scanner) {
                if (scanner.isScanning) {
                    scanner.stop().then(() => scanner.clear()).catch(() => {});
                } else {
                    scanner.clear();
                }
                scannerRef.current = null;
            }
        };
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleClose = () => {
        const scanner = scannerRef.current;
        if (scanner) {
            const stop = scanner.isScanning ? scanner.stop() : Promise.resolve();
            stop.then(() => scanner.clear()).catch(() => {}).finally(() => {
                scannerRef.current = null;
                onClose();
            });
        } else {
            onClose();
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: '#1a1a2e',
                    backgroundImage: 'linear-gradient(135deg, rgba(144,202,249,0.05) 0%, rgba(244,143,177,0.05) 100%)',
                    border: '1px solid rgba(144,202,249,0.2)',
                    borderRadius: 3,
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
                <QrCodeScannerIcon sx={{ color: '#90caf9' }} />
                <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
                    Scan QR Code
                </Typography>
            </DialogTitle>

            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Point your camera at the QR code on the Host screen to join automatically.
                </Typography>

                {/* Camera viewfinder – html5-qrcode mounts into this div */}
                <Box
                    sx={{
                        position: 'relative',
                        width: '100%',
                        borderRadius: 2,
                        overflow: 'hidden',
                        bgcolor: '#000',
                        minHeight: 280,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {isStarting && (
                        <Box
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 2,
                                zIndex: 10,
                                bgcolor: 'rgba(0,0,0,0.7)',
                            }}
                        >
                            <CircularProgress size={48} sx={{ color: '#90caf9' }} />
                            <Typography variant="body2" color="text.secondary">
                                Starting camera…
                            </Typography>
                        </Box>
                    )}
                    {/* html5-qrcode renders into this element */}
                    <div
                        id={SCANNER_ELEMENT_ID}
                        style={{ width: '100%' }}
                    />
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button
                    onClick={handleClose}
                    variant="outlined"
                    sx={{ borderRadius: 50, px: 3 }}
                >
                    Cancel
                </Button>
            </DialogActions>
        </Dialog>
    );
};
