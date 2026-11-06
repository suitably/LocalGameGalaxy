/** Static privacy notice in public/: German for a German UI, English otherwise. */
export const privacyNoticePath = (language: string | undefined): string =>
  language?.toLowerCase().startsWith('de') ? '/datenschutz.html' : '/privacy.html';
