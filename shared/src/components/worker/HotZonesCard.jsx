import { Flame, Navigation, UserX } from 'lucide-react';
import { useWorkerHotZonesQuery } from '../../services/api';
import { useServiceProT } from '../../i18n/I18nProvider';
import { labelKey } from '../../i18n/translations';

/**
 * Where to be: zones where surge is on (or nobody is) for the services this
 * worker does, near them, refreshed every minute (server jobs/surge). Going
 * there is how they earn the surge — and how customers there get served.
 * Shows nothing when nothing is hot.
 */
export default function HotZonesCard({ coords, className = '' }) {
  const t = useServiceProT();
  const [lng, lat] = coords?.length === 2 ? coords : [];
  const { data } = useWorkerHotZonesQuery({ lat, lng }, { pollingInterval: 60000 });
  const zones = data?.zones || [];
  if (!data?.on || !zones.length) return null;
  return (
    <section className={`overflow-hidden rounded-2xl border border-orange-200 bg-orange-50 ${className}`}>
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5">
        <p className="flex items-center gap-1.5 text-[14px] font-black text-orange-900"><Flame size={16} className="text-orange-500" /> {t('sp.surge_near_you', 'Surge near you')}</p>
        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-800">{t('sp.you_keep_n_of_surge', 'You keep {n}% of surge').replace('{n}', data.sharePct)}</span>
      </div>
      <ul className="mt-2 divide-y divide-orange-100">
        {zones.map((z) => (
          <li key={`${z.line}-${z.lat}-${z.lng}`} className="flex items-center gap-3 px-4 py-2.5">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${z.nobody && z.multiplier <= 1 ? 'bg-slate-100 text-slate-600' : 'bg-orange-500 text-white'}`}>
              {z.nobody && z.multiplier <= 1 ? <UserX size={16} /> : <Flame size={16} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-semibold text-slate-900">{t(labelKey(z.service), z.service)}</span>
              <span className="block text-[12px] text-slate-500">
                {z.multiplier > 1 ? t('sp.surge_x', 'Surge {x}×').replace('{x}', z.multiplier.toFixed(2)) : t('sp.no_pro_nearby_yet', 'No pro nearby yet')}
                {z.km != null ? `, ${t('sp.n_km_away', '{n} km away').replace('{n}', z.km)}` : ''}{z.demand ? `, ${t('sp.n_looking', '{n} looking').replace('{n}', z.demand)}` : ''}
              </span>
            </span>
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${z.lat},${z.lng}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-[12px] font-semibold text-white">
              <Navigation size={12} /> {t('sp.go', 'Go')}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
