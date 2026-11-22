// Translated wording for the dues cards. The shared workerHome.js helpers (also used by the mobile app) return English only, so the
// web cards build the same sentences here from the raw dues figures, through the Service Pro translator.
const rupees = (p) => `₹${Math.round((p || 0) / 100).toLocaleString('en-IN')}`;

/** "5 Nov, 3:07 pm" in India time, with the month and am/pm from the translation tables. */
export function istWhenT(t, at) {
  const d = new Date(new Date(at).getTime() + 330 * 60000);
  const h = d.getUTCHours();
  const mon = t(`sp.dues.m.${d.getUTCMonth()}`, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]);
  return `${d.getUTCDate()} ${mon}, ${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, '0')} ${h < 12 ? t('sp.dues.am', 'am') : t('sp.dues.pm', 'pm')}`;
}

/** The headline and sentence for the dues card (same wording as duesView in workerHome.js). */
export function duesTextT(t, d) {
  const blocked = d.status === 'blocked';
  const title = blocked ? t('sp.new_jobs_are_paused', 'New jobs are paused') : t('sp.you_owe_zappyone_amt', 'You owe ZappyOne {amt}').replace('{amt}', rupees(d.duesPaise));
  const body = blocked
    ? t('sp.you_owe_amt_pay_at_least_min_to_get_jobs_again_a_job_you_are_already_on_is_not_affected', 'You owe {amt}. Pay at least {min} to get jobs again. A job you are already on is not affected.').replace('{amt}', rupees(d.duesPaise)).replace('{min}', rupees(d.duesPaise - d.limitPaise + 100))
    : d.status === 'warning'
      ? t('sp.new_jobs_stop_at_limit_left_left_pay_some_now_to_keep_working', 'New jobs stop at {limit}. {left} left. Pay some now to keep working.').replace('{limit}', rupees(d.limitPaise)).replace('{left}', rupees(d.leftPaise))
      : t('sp.your_zappyone_amount_from_finished_jobs_new_jobs_stop_at_limit', 'Your ZappyOne amount from finished jobs. New jobs stop at {limit}.').replace('{limit}', rupees(d.limitPaise));
  return { title, body };
}

/** The "payment done" / "last paid" content (same rules as duesPaidView in workerHome.js). */
export function duesPaidT(t, dues, now = Date.now()) {
  const p = dues?.lastPaid;
  if (!p?.at || !(p.amountPaise > 0)) return null;
  const line = t('sp.amt_paid_on_when', '{amt} paid on {when}').replace('{amt}', rupees(p.amountPaise)).replace('{when}', istWhenT(t, p.at));
  const cleared = !(dues.duesPaise > 0);
  if (cleared && now - new Date(p.at).getTime() > 3 * 86400000) return null;
  return { cleared, title: cleared ? t('sp.payment_done', 'Payment done') : null, line, body: cleared ? t('sp.you_owe_zappyone_nothing_now', 'You owe ZappyOne nothing now.') : null };
}

/** Same checks as duesClaimError in workerHome.js, with translated messages. */
export function duesClaimErrorT(t, { amount, method, reference }) {
  const paise = Math.round(Number(amount) * 100);
  if (!Number.isFinite(paise) || paise < 100) return t('sp.enter_the_amount_you_paid', 'Enter the amount you paid');
  if (method !== 'cash' && String(reference || '').trim().length < 4) return t('sp.enter_the_upi_or_bank_reference_number', 'Enter the UPI or bank reference number');
  return null;
}
