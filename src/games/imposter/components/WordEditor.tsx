import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    TextField,
    IconButton,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';
import type { Category } from '../logic/types';

interface WordEditorProps {
    customCategories: Category[];
    defaultCategories?: Category[];
    onSaveCategories: (categories: Category[]) => void;
    onClose: () => void;
}

export const WordEditor: React.FC<WordEditorProps> = ({
    customCategories,
    defaultCategories = [],
    onSaveCategories,
    onClose
}) => {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language.startsWith('de') ? 'de' : 'en';

    const [categories, setCategories] = useState<Category[]>(() => {
        const merged = [...defaultCategories];
        customCategories.forEach(custom => {
            const index = merged.findIndex(c => c.id === custom.id);
            if (index > -1) {
                merged[index] = { ...custom };
            } else {
                merged.push({ ...custom });
            }
        });
        return merged;
    });

    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleAddCategory = () => {
        setEditingCategory({
            id: crypto.randomUUID(),
            name: { en: '', de: '' },
            words: []
        });
        setIsDialogOpen(true);
    };

    const handleEditCategory = (category: Category) => {
        setEditingCategory(JSON.parse(JSON.stringify(category)));
        setIsDialogOpen(true);
    };

    const handleDeleteCategory = (id: string, isDefault: boolean) => {
        if (isDefault) {
            const originalDefault = defaultCategories.find(c => c.id === id);
            if (originalDefault) {
                setCategories(prev => prev.map(c => c.id === id ? originalDefault : c));
            }
        } else {
            setCategories(prev => prev.filter(c => c.id !== id));
        }
    };

    const handleSaveCategory = () => {
        if (editingCategory) {
            setCategories(prev => {
                const index = prev.findIndex(c => c.id === editingCategory.id);
                if (index > -1) {
                    const newCats = [...prev];
                    newCats[index] = editingCategory;
                    return newCats;
                }
                return [...prev, editingCategory];
            });
            setIsDialogOpen(false);
            setEditingCategory(null);
        }
    };

    const handleSaveAll = () => {
        const categoriesToSave = categories.filter(cat => {
            const defaultDef = defaultCategories.find(d => d.id === cat.id);
            if (!defaultDef) return true;
            return JSON.stringify(cat) !== JSON.stringify(defaultDef);
        });
        onSaveCategories(categoriesToSave);
    };

    const handleAddWord = () => {
        if (editingCategory) {
            setEditingCategory({
                ...editingCategory,
                words: [
                    ...editingCategory.words,
                    { en: '', de: '', hint: { en: '', de: '' } }
                ]
            });
        }
    };

    const handleUpdateWord = (index: number, field: string, value: string, subField?: string) => {
        if (editingCategory) {
            const newWords = [...editingCategory.words];
            if (subField) {
                // @ts-ignore
                newWords[index][field][subField] = value;
            } else {
                // @ts-ignore
                newWords[index][field] = value;
            }
            setEditingCategory({ ...editingCategory, words: newWords });
        }
    };

    const handleRemoveWord = (index: number) => {
        if (editingCategory) {
            setEditingCategory({
                ...editingCategory,
                words: editingCategory.words.filter((_, i) => i !== index)
            });
        }
    };

    const renderCategoryItem = (category: Category) => {
        const isDefault = defaultCategories.some(d => d.id === category.id);
        const defaultDef = defaultCategories.find(d => d.id === category.id);
        const isModified = isDefault && defaultDef && JSON.stringify(category) !== JSON.stringify(defaultDef);

        return (
            <ListItem key={category.id} divider>
                <ListItemText
                    primary={
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography>{category.name[currentLang] || category.name.en}</Typography>
                            {isModified && (
                                <Chip
                                    label={t('common.modified')}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                />
                            )}
                        </Box>
                    }
                    secondary={`${category.words.length} ${t('games.imposter.editor.words')}`}
                />
                <ListItemSecondaryAction>
                    <IconButton edge="end" onClick={() => handleEditCategory(category)} sx={{ mr: 1 }}>
                        <EditIcon />
                    </IconButton>
                    <IconButton
                        edge="end"
                        onClick={() => handleDeleteCategory(category.id, isDefault)}
                        color={isDefault ? "default" : "error"}
                    >
                        {isDefault ? <CloseIcon /> : <DeleteIcon />}
                    </IconButton>
                </ListItemSecondaryAction>
            </ListItem>
        );
    };

    const customCats = categories.filter(c => !defaultCategories.some(d => d.id === c.id));
    const standardCats = categories.filter(c => defaultCategories.some(d => d.id === c.id));

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5">{t('games.imposter.editor.title')}</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddCategory}>
                    {t('games.imposter.editor.add_category')}
                </Button>
            </Box>

            <Box display="flex" flexDirection="column" gap={2}>
                {customCats.length > 0 && (
                    <Paper>
                        <Typography variant="h6" sx={{ p: 2, pb: 0 }}>
                            {t('games.imposter.editor.custom_categories')}
                        </Typography>
                        <List>{customCats.map(renderCategoryItem)}</List>
                    </Paper>
                )}

                <Accordion defaultExpanded={customCats.length === 0}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">
                            {t('games.imposter.editor.standard_categories')} ({standardCats.length})
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                        <List>{standardCats.map(renderCategoryItem)}</List>
                    </AccordionDetails>
                </Accordion>
            </Box>

            <Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
                <Button onClick={onClose}>{t('common.back')}</Button>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveAll}
                >
                    {t('common.save_all')}
                </Button>
            </Box>

            <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    {editingCategory?.name.en ? t('games.imposter.editor.edit_category') : t('games.imposter.editor.add_category')}
                </DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <Box display="flex" gap={2}>
                            <TextField
                                label={t('games.imposter.editor.category_name_en')}
                                value={editingCategory?.name.en || ''}
                                onChange={e => setEditingCategory(prev => prev ? { ...prev, name: { ...prev.name, en: e.target.value } } : null)}
                                fullWidth
                            />
                            <TextField
                                label={t('games.imposter.editor.category_name_de')}
                                value={editingCategory?.name.de || ''}
                                onChange={e => setEditingCategory(prev => prev ? { ...prev, name: { ...prev.name, de: e.target.value } } : null)}
                                fullWidth
                            />
                        </Box>

                        <Divider sx={{ my: 1 }} />

                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle1">{t('games.imposter.editor.words')}</Typography>
                            <Button size="small" startIcon={<AddIcon />} onClick={handleAddWord}>
                                {t('games.imposter.editor.add_word')}
                            </Button>
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {editingCategory?.words.map((word, idx) => (
                                <Box
                                    key={idx}
                                    sx={{
                                        display: 'flex',
                                        gap: 1,
                                        alignItems: 'center',
                                        p: 1,
                                        bgcolor: 'background.default',
                                        borderRadius: 1
                                    }}
                                >
                                    <TextField
                                        label={t('games.imposter.editor.word_en')}
                                        value={word.en}
                                        onChange={e => handleUpdateWord(idx, 'en', e.target.value)}
                                        size="small"
                                        sx={{ flex: 1, minWidth: 0 }}
                                    />
                                    <TextField
                                        label={t('games.imposter.editor.word_de')}
                                        value={word.de}
                                        onChange={e => handleUpdateWord(idx, 'de', e.target.value)}
                                        size="small"
                                        sx={{ flex: 1, minWidth: 0 }}
                                    />
                                    <TextField
                                        label={t('games.imposter.editor.hint_en')}
                                        value={word.hint.en}
                                        onChange={e => handleUpdateWord(idx, 'hint', e.target.value, 'en')}
                                        size="small"
                                        sx={{ flex: 1, minWidth: 0 }}
                                    />
                                    <TextField
                                        label={t('games.imposter.editor.hint_de')}
                                        value={word.hint.de}
                                        onChange={e => handleUpdateWord(idx, 'hint', e.target.value, 'de')}
                                        size="small"
                                        sx={{ flex: 1, minWidth: 0 }}
                                    />
                                    <IconButton
                                        size="small"
                                        onClick={() => handleRemoveWord(idx)}
                                        color="error"
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsDialogOpen(false)}>{t('common.back')}</Button>
                    <Button onClick={handleSaveCategory} variant="contained" color="primary">
                        {t('common.save')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
