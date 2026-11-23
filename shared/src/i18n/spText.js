import { translations } from './translations';

/**
 * Translated text for code that runs outside React (a toast raised from a socket handler,
 * the payment sheet). Only the Service Pro app translates; every other app gets the English
 * fallback unchanged. Reads the language the I18nProvider saved.
 */
export function spText(key, fallback) {
  if (import.meta.env.VITE_CLIENT_SURFACE !== 'servicepro') return fallback;
  let lang = 'en';
  try { lang = localStorage.getItem('zappyLang') || 'en'; } catch { /* storage blocked */ }
  return lang === 'en' ? fallback : (translations[lang]?.[key] ?? fallback);
}
