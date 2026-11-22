import { useState } from 'react';
import { Coffee, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMyBusyQuery, useSetBusyMutation } from '../../services/api';
import { BUSY_MINUTES, busyUntilChoices } from '../../provider/busyTimes';
import { useI18n, useServiceProT } from '../../i18n/I18nProvider';

// "Busy for 1 h / 2 h / until": stay online with your jobs, but no new offers until then (server jobs/busy).
export default function BusyCard({ className = '' }) {
  const t = useServiceProT();
  const { lang } = useI18n();
  const busyClock = (d) => new Date(d).toLocaleTimeString(`${lang}-IN`, { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  const { data, isLoading } = useMyBusyQuery();
  const [setBusy, { isLoading: saving }] = useSetBusyMutation();
  const [picking, setPicking] = useState(false);
  const until = data?.busyUntil ? new Date(data.busyUntil) : null;
  const busy = until && until.getTime() > Date.now();

  async function choose(body) {
    try {
      const res = await setBusy(body).unwrap();
      setPicking(false);
      toast.success(res.message);
    } catch (err) { toast.error(err?.data?.error || t('sp.that_did_not_go_through_try_again', 'That did not go through. Try again.')); }
  }

  if (isLoading) return null;
  const chip = 'rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:border-slate-300 disabled:opacity-50';
  return (
    <section className={`rounded-2xl border p-4 ${busy ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'} ${className}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${busy ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}><Coffee size={17} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-navy">{busy ? t('sp.busy_until_time', 'Busy until {time}').replace('{time}', busyClock(until)) : t('sp.need_a_break', 'Need a break?')}</p>
          <p className="text-[12.5px] text-slate-500">{busy ? t('sp.no_new_jobs_ring_in_your_current_jobs_stay_with_you', 'No new jobs ring in. Your current jobs stay with you.') : t('sp.stay_online_keep_your_jobs_and_pause_new_ones_for_a_while', 'Stay online, keep your jobs, and pause new ones for a while.')}</p>
        </div>
        {saving && <Loader2 size={16} className="mt-1 animate-spin text-slate-400" />}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {busy ? (
          <button type="button" className="btn-primary px-4 py-2 text-[13px]" disabled={saving} onClick={() => choose({ off: true })}>{t('sp.take_new_jobs_again', 'Take new jobs again')}</button>
        ) : (
          <>
            {BUSY_MINUTES.map((m) => <button key={m} type="button" className={chip} disabled={saving} onClick={() => choose({ minutes: m })}>{(m > 60 ? t('sp.n_hours', '{n} hours') : t('sp.n_hour', '{n} hour')).replace('{n}', m / 60)}</button>)}
            <button type="button" className={chip} disabled={saving} aria-expanded={picking} onClick={() => setPicking((p) => !p)}>{t('sp.until', 'Until…')}</button>
          </>
        )}
      </div>
      {picking && !busy && (
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={t('sp.busy_until', 'Busy until')}>
          {busyUntilChoices().map((tm) => <button key={tm.getTime()} type="button" className={chip} disabled={saving} onClick={() => choose({ until: tm.toISOString() })}>{busyClock(tm)}</button>)}
        </div>
      )}
    </section>
  );
}
