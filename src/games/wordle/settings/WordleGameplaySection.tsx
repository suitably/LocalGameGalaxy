import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingSwitch } from '../../../components/settings';
import { loadDictionaryOnly, saveDictionaryOnly } from '../logic/wordleStorage';

/** Wordle gameplay settings: "only dictionary words" (stored via wordleStorage). */
export const WordleGameplaySection: React.FC = () => {
  const { t } = useTranslation();
  const [dictionaryOnly, setDictionaryOnly] = useState(loadDictionaryOnly);

  return (
    <SettingSwitch
      checked={dictionaryOnly}
      onChange={(value) => {
        setDictionaryOnly(value);
        saveDictionaryOnly(value);
      }}
      label={t('wordle.settings.dictionary_only')}
      description={t('wordle.settings.dictionary_only_hint')}
    />
  );
};
