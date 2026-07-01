# I18n UI Texts Refactoring Plan

## Goal Description
The objective is to ensure that all UI texts across the entire application are available via the multilingual system (`i18next`) and that both German and English translations are provided. Currently, many parts of the application, particularly the `Melodiq` game and some elements in `Hub.tsx`, contain hardcoded strings and completely lack translation keys.

## Open Questions
- There is a large number of missing translations for the Melodiq game. I will create a `melodiq` namespace in `i18n.ts` and populate it with English and German translations. Does this sound correct?
- Are there any specific German translations or terminology you prefer for Melodiq (e.g. should "Queue" be "Warteschlange", "Latency" be "Latenz")? I will use standard standard terms otherwise.

## Proposed Changes
We will modify the following areas:

### `src/i18n.ts`
- [MODIFY] `src/i18n.ts`
  - Add missing `melodiq` namespace for `en` and `de` resources.
  - Add missing `common` strings if necessary.

### Hub & Settings
- [MODIFY] `src/features/hub/Hub.tsx` - Extract hardcoded Melodiq game descriptions.
- [MODIFY] `src/features/settings/Settings.tsx` - Check for any hardcoded texts.
- [MODIFY] `src/components/Layout/GlobalHeader.tsx` - Check for hardcoded labels.

### Melodiq Game Components
- [MODIFY] `src/games/melodiq/components/GameSettingsPanel.tsx`
- [MODIFY] `src/games/melodiq/components/HardwareMicSetup.tsx`
- [MODIFY] `src/games/melodiq/components/HelperConnection.tsx`
- [MODIFY] `src/games/melodiq/components/HostQueueDrawer.tsx`
- [MODIFY] `src/games/melodiq/components/LatencyCalibrator.tsx`
- [MODIFY] `src/games/melodiq/components/LocalSongsView.tsx`
- [MODIFY] `src/games/melodiq/components/MiniPlayer.tsx`
- [MODIFY] `src/games/melodiq/components/OnlineSongsView.tsx`
- [MODIFY] `src/games/melodiq/components/PhoneJoinPrompt.tsx`
- [MODIFY] `src/games/melodiq/components/PhoneQueueBridge.tsx`
- [MODIFY] `src/games/melodiq/components/PlaybackManager.tsx`
- [MODIFY] `src/games/melodiq/components/QueueParticipantDialog.tsx`
- [MODIFY] `src/games/melodiq/components/RemoteLatencyCalibrator.tsx`
- [MODIFY] `src/games/melodiq/components/SessionSetup.tsx`
- [MODIFY] `src/games/melodiq/components/SongCard.tsx`
- [MODIFY] `src/games/melodiq/components/SongListItem.tsx`
- [MODIFY] `src/games/melodiq/components/TVModeButton.tsx`
- [MODIFY] `src/games/melodiq/components/UserProfilesManager.tsx`
- [MODIFY] `src/games/melodiq/components/YouTubeSearchDialog.tsx`
- [MODIFY] Other `.tsx` files in `src/games/melodiq/` and `src/games/melodiq/gameplay/` as needed to replace hardcoded strings with `t('melodiq...')`.

### Werewolf and Imposter
- Check existing files for any newly added hardcoded texts.

## Verification Plan
### Automated Tests
- Run `npm run lint` and `npm run build` (via `tsc -b && vite build`) to ensure there are no syntax errors or missing imports (e.g. `useTranslation`).

### Manual Verification
- Will ask you to manually verify the UI by switching the language in the settings to ensure that texts in Hub and Melodiq update correctly.
