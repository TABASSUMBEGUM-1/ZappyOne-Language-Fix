/** Rupees from paise, Indian grouping, no decimals: 125000 -> "₹1,250". */
export function rupees(paise) {
  return `₹${Math.round((paise || 0) / 100).toLocaleString('en-IN')}`;
}

/** "Sat, 14 Dec" */
export function shortDate(d, lang = 'en') {
  if (!d) return '-';
  return new Date(d).toLocaleDateString(`${lang}-IN`, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "14 December 2026" */
export function longDate(d, lang = 'en') {
  if (!d) return '-';
  return new Date(d).toLocaleDateString(`${lang}-IN`, { day: 'numeric', month: 'long', year: 'numeric' });
}

/** "5m ago", "3h ago", "2d ago"; `t` is the translate function. */
export function timeAgo(date, t = (k, fb) => fb) {
  const ago = (k, fb, n) => t(k, fb).replace('{n}', n);
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return t('sp.ev.justNow', 'just now');
  if (mins < 60) return ago('sp.ev.mAgo', '{n}m ago', mins);
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return ago('sp.ev.hAgo', '{n}h ago', hrs);
  return ago('sp.ev.dAgo', '{n}d ago', Math.floor(hrs / 24));
}

/** yyyy-mm-dd in local time (what the calendar compares on); shared with the app. */
export { ymd } from '@shared/events/partnerBookings';
