import React from 'react';
import { Box, Card, CardContent, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { useTranslation } from 'react-i18next';
import type { CategoryItem, WordItem } from '../../logic/types';

interface WordListItemProps {
  word: WordItem;
  categories: CategoryItem[];
  onEdit: (word: WordItem) => void;
  onDelete: (id: string | number) => void;
}

const LangTag: React.FC<{ code: string }> = ({ code }) => (
  <Box component="span" sx={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.7, mr: 0.5 }}>
    {code}
  </Box>
);

const difficultyColor = (diff: number) => {
  if (diff === 1) return 'success';
  if (diff === 2) return 'primary';
  return 'warning';
};

export const WordListItem: React.FC<WordListItemProps> = ({
  word,
  categories,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  const de = word.translations?.de?.canonical || '-';
  const deSyn = word.translations?.de?.synonyms || [];
  const en = word.translations?.en?.canonical || word.word || '-';
  const enSyn = word.translations?.en?.synonyms || [];
  const cat = categories.find((c) => String(c.id) === String(word.categoryId));
  const catName =
    cat?.translations?.find((tr) => tr.languageCode === 'de')?.name || cat?.name || word.categoryId;

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <Typography variant="subtitle2" fontWeight={800} color="primary.text">
                <LangTag code="DE" />
                {de}
              </Typography>
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                / <LangTag code="EN" />
                {en}
              </Typography>
              <Chip
                label={
                  word.difficulty === 1
                    ? t('guessart.diffEasy', 'Leicht')
                    : word.difficulty === 3
                      ? t('guessart.diffHard', 'Schwer')
                      : t('guessart.diffMedium', 'Mittel')
                }
                size="small"
                color={difficultyColor(word.difficulty || 2)}
                sx={{ height: 20, fontSize: '0.75rem' }}
              />
              <Chip
                label={catName}
                size="small"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.75rem' }}
              />
            </Box>

            {(deSyn.length > 0 || enSyn.length > 0) && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, display: 'block' }}
              >
                {t('guessart.synonymsLabel', 'Synonyme')}: {[...deSyn, ...enSyn].join(', ')}
              </Typography>
            )}
          </Box>

          <Box display="flex" gap={0.5}>
            <Tooltip title={t('common.edit', 'Bearbeiten')}>
              <IconButton size="small" onClick={() => onEdit(word)}>
                <EditRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('common.delete', 'Löschen')}>
              <IconButton size="small" color="error" onClick={() => onDelete(word.id)}>
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
