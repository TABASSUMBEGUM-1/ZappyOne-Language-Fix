import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { mmss, waitingNow } from '../../customer/repairBill';
import { useServiceProT } from '../../i18n/I18nProvider';
import { labelKey } from '../../i18n/translations';

const rupees = (p) => `₹${(p / 100).toFixed(p % 100 ? 2 : 0)}`;

const fill = (s, o) => Object.keys(o).reduce((a, k) => a.split(`{${k}}`).join(o[k]), s);

// The wait at the door, counting on the screen (the app's WaitingMeter): free time left, then what it adds. Ticks locally; no server calls.
export default function WaitingMeter({ booking, audience = 'pro', pro = 'pro' }) {
  const t = useServiceProT();
  const [now, setNow] = useState(Date.now());
  const w = waitingNow(booking, now);
  const live = !!w && !w.stopped;
  useEffect(() => {
    if (!live) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [live]);
  if (!w || (audience === 'customer' && w.stopped && !w.paise)) return null;

  const rate = w.rule.maxPaise > 0
    ? fill(t('sp.amt_a_minute_at_most_max', '{amt} a minute, at most {max}'), { amt: rupees(w.rule.perMinPaise), max: rupees(w.rule.maxPaise) })
    : fill(t('sp.amt_a_minute', '{amt} a minute'), { amt: rupees(w.rule.perMinPaise) });
  const free = w.freeLeftSec > 0 && !w.stopped;
  const proW = t(labelKey(pro), pro);
  const amt = rupees(w.paise);
  const text = audience === 'pro'
    ? (w.stopped ? [t('sp.waiting_ended_at_the_code', 'Waiting ended at the code'), w.paise ? fill(t('sp.amt_added_for_you', '{amt} added for you.'), { amt }) : t('sp.no_waiting_charge', 'No waiting charge.')]
      : free ? [fill(t('sp.free_waiting_time_left', 'Free waiting: {time} left'), { time: mmss(w.freeLeftSec) }), fill(t('sp.then_rate_is_added_for_you', 'Then {rate} is added for you.'), { rate })]
        : [fill(t('sp.customer_is_late_n_min', 'Customer is late: {n} min'), { n: w.billableMin }), fill(w.capped ? t('sp.amt_added_for_you_so_far_the_most', '{amt} added for you so far (the most).') : t('sp.amt_added_for_you_so_far', '{amt} added for you so far.'), { amt })])
    : (w.stopped ? [t('sp.waiting_charge', 'Waiting charge'), fill(t('sp.amt_for_the_extra_minutes_your_pro_waited', '{amt} for the extra minutes your {pro} waited.'), { amt, pro: proW })]
      : free ? [fill(t('sp.your_pro_is_at_your_door', 'Your {pro} is at your door'), { pro: proW }), fill(t('sp.free_waiting_time_left_then_rate', 'Free waiting: {time} left, then {rate}.'), { time: mmss(w.freeLeftSec), rate })]
        : [fill(t('sp.your_pro_has_waited_n_extra_min', 'Your {pro} has waited {n} extra min'), { pro: proW, n: w.billableMin }), fill(w.capped ? t('sp.amt_added_to_your_bill_the_most_give_them_your_code_to_start', '{amt} added to your bill (the most). Give them your code to start.') : t('sp.amt_added_to_your_bill_give_them_your_code_to_start', '{amt} added to your bill. Give them your code to start.'), { amt })]);
  const late = !free && w.paise > 0;

  return (
    <div role="status" aria-live="polite" className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${late ? 'border-amber-200 bg-amber-50' : 'border-zappy-100 bg-zappy-50'}`}>
      <Timer size={18} className={`mt-0.5 shrink-0 ${late ? 'text-amber-700' : 'text-zappy-700'}`} aria-hidden="true" />
      <span className="min-w-0">
        <span className={`block text-[14px] font-bold tabular-nums ${late ? 'text-amber-900' : 'text-zappy-900'}`}>{text[0]}</span>
        <span className={`mt-0.5 block text-[12.5px] ${late ? 'text-amber-800' : 'text-zappy-800'}`}>{text[1]}</span>
      </span>
    </div>
  );
}
