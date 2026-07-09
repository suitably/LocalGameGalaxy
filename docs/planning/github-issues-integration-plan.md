# GitHub Issues Integration Plan [ID: PLAN-GITHUB-ISSUES-002]

Create a global feedback and bug reporting system using a reusable popup dialog, allowing users to submit labeled issues (Bug, Feature Request, Suggestion, Other) directly to GitHub from anywhere in the app, including Melodiq.

## Goal Description
The goal is to implement a global feedback button and dialog in the app, accessible from both the main layout (header) and individual game screens (such as Melodiq Settings). Issues must support categorization (type selector: Bug, Feature, Suggestion, Other) and map them to appropriate GitHub labels (`bug`, `enhancement`, `question`, `user-feedback`).

## Proposed Changes

### Server Configuration & Routes
#### [MODIFY] [server/src/routes/index.js](file:///home/deck/Projects/LocalGameGalaxy/server/src/routes/index.js)
- Update `POST /api/feedback` to accept `type` in the request body (values: `bug`, `feature`, `suggestion`, `other`).
- Map the incoming `type` to GitHub labels:
  - `bug` -> `['bug', 'user-feedback']`
  - `feature` -> `['enhancement', 'user-feedback']`
  - `suggestion` -> `['question', 'user-feedback']`
  - `other` -> `['user-feedback']`

### Global State & Layout
#### [MODIFY] [src/context/LayoutContext.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/context/LayoutContext.tsx)
- Add `feedbackOpen` (boolean) and `setFeedbackOpen` (setter function) to the `LayoutContextType`.
- Implement state hook inside the `LayoutProvider`.

#### [CREATE] [src/components/Layout/FeedbackDialog.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/components/Layout/FeedbackDialog.tsx)
- Implement a reusable dialog component containing the feedback form.
- Form inputs:
  - Type (Select dropdown: Bug, Feature Request, Suggestion, Other)
  - Title (TextField)
  - Description (TextField multiline)
- Submission logic using the `/api/feedback` backend endpoint.
- Displays success status with a link to the created GitHub issue.

#### [MODIFY] [src/components/Layout/MainLayout.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/components/Layout/MainLayout.tsx)
- Mount the `FeedbackDialog` and control its visibility using `feedbackOpen` and `setFeedbackOpen` from `useLayout()`.

#### [MODIFY] [src/components/Layout/GlobalHeader.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/components/Layout/GlobalHeader.tsx)
- Render a new "Feedback" icon button (e.g. `RateReviewIcon`) next to the settings icon.
- Tapping the icon calls `setFeedbackOpen(true)`.

### Settings & Game Integration
#### [MODIFY] [src/features/settings/Settings.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/features/settings/Settings.tsx)
- Replace the inline feedback form with a clean call-to-action button "Open Feedback Form" that triggers `setFeedbackOpen(true)`.

#### [MODIFY] [src/games/melodiq/MelodiqSettings.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/MelodiqSettings.tsx)
- Add a new "Give Feedback" button (styled to match Melodiq's theme) that triggers `setFeedbackOpen(true)` when clicked.

### Internationalization (i18n)
#### [MODIFY] [public/locales/en/translation.json](file:///home/deck/Projects/LocalGameGalaxy/public/locales/en/translation.json)
- Add English translations for feedback types (`Bug`, `Feature Request`, `Suggestion`, `Other`), fields, buttons, and helper texts.

#### [MODIFY] [public/locales/de/translation.json](file:///home/deck/Projects/LocalGameGalaxy/public/locales/de/translation.json)
- Add German translations for feedback types (`Fehler`, `Funktionswunsch`, `Vorschlag`, `Sonstiges`), fields, buttons, and helper texts.

## Verification Plan

### Automated Verification
- Run `npm run lint` and `npm run build` in the main workspace to ensure zero compilation or build errors.

### Manual Verification
1. Access the app and verify the Feedback button is visible in the Global Header.
2. Click the Feedback button. Verify that:
   - The Feedback dialog pops up.
   - It contains a dropdown to select Type (Bug, Feature Request, etc.).
   - Filling the form and submitting creates a labeled GitHub issue successfully.
3. Open Melodiq and navigate to Melodiq Settings. Click the new "Give Feedback" button. Verify the dialog pops up and submits issues correctly.
