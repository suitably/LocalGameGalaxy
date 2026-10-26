import React from 'react';
import { ClientSettings } from '../components/ClientSettings';
import { initMelodiqI18n } from '../i18n';

initMelodiqI18n();

/** Melodiq phone-client profile (name, colour, microphone, latency) without a back button. */
export const MelodiqClientSection: React.FC = () => <ClientSettings />;
