import { labelKey } from '@shared/i18n/translations';

/** Translate a label the shared event modules (shared/events/partnerBookings) hold in English: the key is made from the English text, which stays the fallback. */
export const tl = (t, text) => t(labelKey(text), text);
