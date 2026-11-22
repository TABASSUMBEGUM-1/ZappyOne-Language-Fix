import { useState } from 'react';
import SOSButton from '@shared/components/worker/SOSButton';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import { useStartPlanVisitMutation, useCompletePlanVisitMutation } from '@shared/services/api';
import ProofPhotos, { readyKeys } from '@shared/components/common/ProofPhotos';
import { useI18n } from '@shared/i18n/I18nProvider';

const errOf = (e, t) => e?.data?.error || t('sp.pv.fail', 'That did not go through. Try again.');
const STATUS = { scheduled: ['sp.pv.scheduled', 'Scheduled'], started: ['sp.pv.started', 'Started'], done: ['sp.c.done', 'Done'], missed: ['sp.pv.missed', 'Missed'] };
const dayLabel = (d, lang) => new Date(`${d}T12:00:00+05:30`).toLocaleDateString(`${lang}-IN`, { weekday: 'short', day: 'numeric', month: 'short' });

// One plan visit, run at the door: the customer's code starts it, photos of the finished work close it.
export default function VisitRow({ v, sos = false }) {
  const { t, lang } = useI18n();
  const [start, { isLoading: starting }] = useStartPlanVisitMutation();
  const [complete, { isLoading: finishing }] = useCompletePlanVisitMutation();
  const [code, setCode] = useState('');
  const [photos, setPhotos] = useState([]);
  const tone = { scheduled: 'bg-slate-100 text-slate-700', started: 'bg-amber-100 text-amber-800', done: 'bg-emerald-100 text-emerald-800', missed: 'bg-red-100 text-red-700' }[v.status];
  return (
    <motion.li layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0"><p className="font-bold text-slate-900">{v.plan}</p><p className="truncate text-xs text-slate-500">{dayLabel(v.day, lang)} · {new Date(v.at).toLocaleTimeString(`${lang}-IN`, { hour: 'numeric', minute: '2-digit' })} · {v.address}</p></div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${tone}`}>{STATUS[v.status] ? t(STATUS[v.status][0], STATUS[v.status][1]) : v.status}</span>
      </div>
      {v.status === 'scheduled' && (
        <div className="flex gap-2">
          <input className="input flex-1 text-center font-mono text-lg tracking-[0.4em]" inputMode="numeric" maxLength={4} placeholder={t('sp.pv.code', 'Code')} aria-label={t('sp.pv.codeLabel', "Customer's start code")} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          <button type="button" disabled={code.length !== 4 || starting} onClick={async () => { try { await start({ id: v._id, code }).unwrap(); toast.success(t('sp.pv.visitStarted', 'Visit started')); } catch (e) { toast.error(errOf(e, t)); } }} className="btn-primary px-4"><KeyRound size={15} /> {t('sp.pv.start', 'Start')}</button>
        </div>
      )}
      {v.status === 'started' && (
        <div className="space-y-2">
          {sos && <SOSButton />}
          <ProofPhotos photos={photos} onChange={setPhotos} folder="completion-photos" max={4} title={t('sp.pv.photos', 'Photos of the finished work')} />
          <button type="button" disabled={!readyKeys(photos).length || finishing} onClick={async () => { try { await complete({ id: v._id, photoKeys: readyKeys(photos) }).unwrap(); toast.success(t('sp.pv.visitDone', 'Visit done. The customer has the photos.')); } catch (e) { toast.error(errOf(e, t)); } }} className="btn-primary w-full">{t('sp.pv.markDone', 'Mark done')}</button>
        </div>
      )}
    </motion.li>
  );
}
