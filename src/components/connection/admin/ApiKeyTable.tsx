import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, Typography, Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import type { ApiKey } from '../hooks/useServerApiKeys';

interface Props {
    apiKeys: ApiKey[];
    onEdit: (key: ApiKey) => void;
    onDelete: (id: string) => void;
    onCopyLink: (key: ApiKey) => void;
    onShowQR: (key: ApiKey) => void;
}

export const ApiKeyTable: React.FC<Props> = ({ apiKeys, onEdit, onDelete, onCopyLink, onShowQR }) => {
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
                                    {key.allowManagement && (
                                        <Chip label={t('server.admin.perm_manage', 'Admin')} size="small" color="warning" variant="outlined" />
                                    )}
                                    {key.allowSongDeletion && (
                                        <Chip label={t('server.admin.perm_delete', 'Delete Songs')} size="small" color="error" variant="outlined" />
                                    )}
                                    {!key.allowManagement && !key.allowSongDeletion && (
                                        <Chip label={t('server.admin.perm_readonly', 'Read Only')} size="small" color="success" variant="outlined" />
                                    )}
                                    <Tooltip title={t('server.admin.edit_permissions', 'Edit Permissions')}>
                                        <IconButton size="small" onClick={() => onEdit(key)}>
                                            <EditIcon fontSize="small" sx={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.6)' }} />
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
