import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Typography,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteRounded';
import EditIcon from '@mui/icons-material/EditRounded';
import ContentCopyIcon from '@mui/icons-material/ContentCopyRounded';
import QrCode2Icon from '@mui/icons-material/QrCode2Rounded';
import type { ApiKey } from '../hooks/useServerApiKeys';
import { PERMISSION_FLAGS } from './permissionFlags';

interface Props {
  apiKeys: ApiKey[];
  onEdit: (key: ApiKey) => void;
  onDelete: (id: string) => void;
  onCopyLink: (key: ApiKey) => void;
  onShowQR: (key: ApiKey) => void;
}

export const ApiKeyTable: React.FC<Props> = ({
  apiKeys,
  onEdit,
  onDelete,
  onCopyLink,
  onShowQR,
}) => {
  const { t } = useTranslation();

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('server.admin.key_name', 'Name')}</TableCell>
            <TableCell>{t('server.admin.key_permissions', 'Permissions')}</TableCell>
            <TableCell>{t('server.admin.key_created', 'Created')}</TableCell>
            <TableCell align="right">{t('server.admin.key_actions', 'Actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {apiKeys.map((key) => (
            <TableRow key={key.id}>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {key.name}
                </Typography>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                  {PERMISSION_FLAGS.filter(({ flag }) => key[flag] === true).map(
                    ({ flag, labelKey, color }) => (
                      <Chip
                        key={flag}
                        label={t(labelKey)}
                        size="small"
                        color={color}
                        variant="outlined"
                      />
                    ),
                  )}
                  {!PERMISSION_FLAGS.some(({ flag }) => key[flag] === true) && (
                    <Chip
                      label={t('server.admin.perm_readonly', 'Read Only')}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  )}
                  <Tooltip title={t('server.admin.edit_permissions', 'Edit Permissions')}>
                    <IconButton size="small" onClick={() => onEdit(key)}>
                      <EditIcon
                        fontSize="small"
                        sx={{ fontSize: '1rem', color: 'text.secondary' }}
                      />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="caption" color="text.secondary">
                  {new Date(key.createdAt).toLocaleDateString()}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                  <Tooltip title={t('server.admin.copy_link', 'Copy Connection Link')}>
                    <IconButton size="small" onClick={() => onCopyLink(key)}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('server.admin.show_qr', 'Show QR Code')}>
                    <IconButton size="small" onClick={() => onShowQR(key)}>
                      <QrCode2Icon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('server.admin.delete_key', 'Delete Key')}>
                    <IconButton size="small" color="error" onClick={() => onDelete(key.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
