/**
 * One catalogue entry in the party picker: area symbol, title, party description
 * [ID: COMP-PARTY-CATALOG-CARD]
 */
import React from 'react';
import { useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AreaSymbol } from '../../../components/brand/AreaSymbol';
import { entryColor } from '../../../lib/catalog/views';
import type { CatalogEntry } from '../../../lib/catalog/types';
import { PartyPickerCard } from './PartyPickerCard';

export const PartyCatalogCard: React.FC<{ entry: CatalogEntry; onClick: () => void }> = ({
  entry,
  onClick,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <PartyPickerCard
      icon={
        <AreaSymbol
          area={entry.area}
          color={entryColor(entry)}
          cut={theme.palette.background.paper}
          size={36}
        />
      }
      title={t(entry.titleKey, entry.title)}
      desc={t(entry.party?.descKey ?? entry.descKey, '')}
      onClick={onClick}
    />
  );
};
