/**
 * Test helper: a `t()` that reads the real `public/locales` file of one language, so component
 * tests assert the strings users see instead of key names (there are no default texts in t()).
 */
import de from '../../../public/locales/de/translation.json';
import en from '../../../public/locales/en/translation.json';

const LOCALES: Record<'de' | 'en', unknown> = { de, en };

export const localeT =
  (lang: 'de' | 'en') =>
  (key: string, options?: Record<string, unknown> | string): string => {
    const value = key
      .split('.')
      .reduce<unknown>(
        (node, part) => (node as Record<string, unknown> | undefined)?.[part],
        LOCALES[lang],
      );
    if (typeof value !== 'string') return key;
    const vars = typeof options === 'object' ? options : {};
    return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name: string) => String(vars[name] ?? ''));
  };
