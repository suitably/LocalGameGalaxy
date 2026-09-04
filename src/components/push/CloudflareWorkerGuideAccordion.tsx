import React, { useState, useCallback } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Button,
  Typography,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloudQueueRoundedIcon from '@mui/icons-material/CloudQueueRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import { useTranslation } from 'react-i18next';

export const CloudflareWorkerGuideAccordion: React.FC = () => {
  const { t } = useTranslation();
  const [copiedCommands, setCopiedCommands] = useState(false);

  const workerDeployCommands = `# 1. In den Worker-Ordner wechseln
cd server/cloudflare-push-relay

# 2. VAPID-Schlüssel generieren
npx web-push generate-vapid-keys

# 3. Secrets bei Cloudflare hinterlegen
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY

# 4. Optional: KV Namespace für persistente Speicherung erstellen
npx wrangler kv:namespace create PUSH_KV

# 5. Deployen
npx wrangler deploy`;

  const handleCopyCommands = useCallback(() => {
    navigator.clipboard.writeText(workerDeployCommands);
    setCopiedCommands(true);
    setTimeout(() => setCopiedCommands(false), 2500);
  }, [workerDeployCommands]);

  return (
    <Box sx={{ mt: 1 }}>
      <Accordion
        variant="outlined"
        sx={{
          bgcolor: 'rgba(255, 255, 255, 0.03)',
          borderRadius: 2,
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CloudQueueRoundedIcon color="primary" fontSize="small" />
            <Typography variant="body2" fontWeight={600}>
              {t('settings.relay_worker_guide_title', 'Eigenen Cloudflare Worker aufsetzen (24/7 kostenlos)')}
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            {t(
              'settings.relay_worker_guide_desc',
              'Der Cloudflare Worker läuft rund um die Uhr kostenlos in der Cloud und unterstützt sowohl Web-Push als auch Google-freies ntfy.',
            )}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              size="small"
              href="https://deploy.workers.cloudflare.com/?url=https://github.com/suitably/LocalGameGalaxy/tree/main/server/cloudflare-push-relay"
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<LaunchRoundedIcon />}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              {t('settings.relay_1click_deploy', '1-Klick Deploy auf Cloudflare')}
            </Button>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              {t(
                'settings.relay_1click_deploy_note',
                'Erfordert ein Cloudflare- und ein GitHub-Konto (Cloudflare forkt das Repository in dein GitHub-Profil).',
              )}
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.85rem' }}>
            {t(
              'settings.relay_dashboard_note',
              "Ohne GitHub: Du kannst auf dash.cloudflare.com einfach einen Worker erstellen ('Create Worker' ➔ 'Quick Edit') und den Code aus server/cloudflare-push-relay hineinkopieren. Kein Git nötig.",
            )}
          </Typography>

          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 1 }}>
            {t('settings.relay_manual_title', 'Alternative: Manuelles CLI-Deployment im Terminal:')}
          </Typography>
          <Box
            component="pre"
            sx={{
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: 'rgba(0, 0, 0, 0.4)',
              fontSize: '0.8rem',
              overflowX: 'auto',
              m: 0,
              color: '#81c784',
            }}
          >
            {workerDeployCommands}
          </Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={copiedCommands ? <CheckCircleRoundedIcon /> : <ContentCopyIcon />}
            onClick={handleCopyCommands}
            sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
          >
            {copiedCommands
              ? t('settings.relay_worker_copied', 'Befehle kopiert!')
              : t('settings.relay_worker_copy', 'Befehle kopieren')}
          </Button>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};
