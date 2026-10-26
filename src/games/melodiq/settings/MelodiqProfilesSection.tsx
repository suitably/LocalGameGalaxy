import React, { useEffect, useState } from 'react';
import { MicrophoneManager } from '../audio/MicrophoneManager';
import { UserProfilesManager } from '../components/UserProfilesManager';
import { useProfiles } from '../hooks/useProfiles';
import { initMelodiqI18n } from '../i18n';

initMelodiqI18n();

/** Melodiq player profiles (names, colours, microphone assignment). */
export const MelodiqProfilesSection: React.FC = () => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const profiles = useProfiles(devices);

  useEffect(() => {
    void MicrophoneManager.getDevices().then(setDevices);
  }, []);

  return (
    <UserProfilesManager
      profiles={profiles.profiles}
      onAddProfile={profiles.addProfile}
      onUpdateProfile={profiles.updateProfile}
      onDeleteProfile={profiles.deleteProfile}
    />
  );
};
