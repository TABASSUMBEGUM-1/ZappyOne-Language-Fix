import toast from 'react-hot-toast';
import { Zap } from 'lucide-react';
import { useAutoAcceptQuery, useSaveAutoAcceptMutation } from '../../services/api';
import { AUTO_ACCEPT_KM } from './autoAccept';
import { useI18n, useServiceProT } from '../../i18n/I18nProvider';

const fill = (s, o) => Object.keys(o).reduce((a, k) => a.split(`{${k}}`).join(o[k]), s);

/**
 * Auto-accept: jobs nearby become the provider's with no tap (server
 * jobs/fast-assign). `who` is 'workers' or 'shops'. Hidden when the platform
 * has it off or the worker is a shop's technician.
 */
export default function AutoAcceptCard({ who = 'workers' }) {
  const t = useServiceProT();
  const { lang } = useI18n();
  const { data } = useAutoAcceptQuery(who);
  const [save, { isLoading }] = useSaveAutoAcceptMutation();
  if (!data?.available) return null;
  const a = data.autoAccept;
  const day = (at) => new Date(at).toLocaleDateString(`${lang}-IN`, { day: 'numeric', month: 'short' });
  const km0 = a.maxKm ? Math.min(a.maxKm, data.radiusKm) : data.radiusKm;
  const status = a.pausedUntil
    ? fill(t('sp.paused_until_date_a_job_it_took_for_you_was_handed_back', 'Paused until {date}: a job it took for you was handed back.'), { date: day(a.pausedUntil) })
    : !a.enabled
      ? fill(t('sp.off_turn_it_on_and_jobs_within_km_km_come_to_you_with_no_tap_while_you_are_online_and_free', 'Off. Turn it on and jobs within {km} km come to you with no tap while you are online and free.'), { km: km0 })
      : fill(t('sp.on_jobs_within_km_km_are_yours_the_moment_they_come_in_while_you_are_online_and_free', 'On. Jobs within {km} km are yours the moment they come in, while you are online and free.'), { km: km0 });

  async function change(body) {
    try { await save({ who, ...body }).unwrap(); } catch (err) { toast.error(err?.data?.error || t('sp.could_not_save_try_again', 'Could not save. Try again.')); }
  }

  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
      <label className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Zap size={17} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-slate-900">{t('sp.auto_accept_jobs', 'Auto-accept jobs')}</span>
          <span className="mt-0.5 block text-[12.5px] leading-relaxed text-slate-500">{status}</span>
        </span>
        <input type="checkbox" checked={a.enabled} disabled={isLoading || !!a.pausedUntil} onChange={(e) => change({ enabled: e.target.checked })}
          className="mt-1 h-5 w-5" aria-label={t('sp.auto_accept_jobs', 'Auto-accept jobs')} />
      </label>
      {a.enabled && !a.pausedUntil && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[12px] font-semibold text-slate-500">{t('sp.only_within', 'Only within')}</span>
          {AUTO_ACCEPT_KM.filter((km) => km == null || km < data.radiusKm).map((km) => (
            <button key={String(km)} type="button" disabled={isLoading} onClick={() => change({ maxKm: km })}
              className={`rounded-full px-3 py-1 text-[12px] font-semibold ${(a.maxKm ?? null) === km ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
              {km == null ? `${data.radiusKm} ${t('sp.km', 'km')}` : `${km} ${t('sp.km', 'km')}`}
            </button>
          ))}
        </div>
      )}
      <p className="mt-2 text-[11.5px] text-slate-400">{fill(t('sp.hand_back_a_job_it_took_and_auto_accept_pauses_for_n_days', 'Hand back a job it took and auto-accept pauses for {n} days.'), { n: data?.pauseDays ?? 7 })}</p>
    </section>
  );
}
