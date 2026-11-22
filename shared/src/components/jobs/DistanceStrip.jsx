import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Navigation, MapPin } from 'lucide-react';
import { roadMinutes } from '../../utils/distance';
import { useServiceProT } from '../../i18n/I18nProvider';

// How far the job is, drawn as the trip: you, the road, the customer; the kilometres count up and a dot travels the route.
export default function DistanceStrip({ km }) {
  const t = useServiceProT();
  const still = useReducedMotion();
  const [shown, setShown] = useState(still ? km : 0);
  useEffect(() => {
    if (still || km == null) { setShown(km); return undefined; }
    let frame; const start = performance.now();
    const tick = (t) => { const p = Math.min(1, (t - start) / 700); setShown(km * (1 - (1 - p) ** 3)); if (p < 1) frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [km, still]);
  if (km == null) return null;
  const mins = roadMinutes(km);
  return (
    <div className="mt-2 rounded-2xl bg-zappy-50 px-3 py-2.5" aria-label={t('sp.km_km_away_about_n_minutes', '{km} km away, about {n} minutes').replace('{km}', km.toFixed(1)).replace('{n}', mins)}>
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 text-[11px] font-bold text-zappy-700"><Navigation size={12} /> {t('sp.you', 'You')}</span>
        <div className="relative h-1.5 flex-1">
          <div className="absolute inset-0 rounded-full bg-[repeating-linear-gradient(90deg,#9db4f0_0_6px,transparent_6px_11px)]" />
          <motion.div className="absolute inset-y-0 left-0 rounded-full bg-zappy-600" initial={{ width: still ? '100%' : 0 }} animate={{ width: '100%' }} transition={{ duration: 0.7, ease: 'easeOut' }} />
          {!still && (
            <motion.span className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-zappy-700 shadow"
              initial={{ left: '0%' }} animate={{ left: ['0%', '96%'] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.7 }} />
          )}
        </div>
        <span className="flex items-center gap-1 text-[11px] font-bold text-zappy-700">{t('sp.customer', 'Customer')} <MapPin size={12} /></span>
      </div>
      <p className="mt-1.5 text-center text-[13px] font-extrabold tabular-nums text-navy">
        {shown.toFixed(1)} {t('sp.km', 'km')} <span className="font-semibold text-slate-500">· {t('sp.about_n_min_away', 'about {n} min away').replace('{n}', mins)}</span>
      </p>
    </div>
  );
}
