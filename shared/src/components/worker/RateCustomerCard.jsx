import { useState } from 'react';
import toast from 'react-hot-toast';
import { Star, Loader2, ShieldAlert } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useRateCustomerMutation, useBlockJobCustomerMutation } from '../../services/api';
import { selectRole } from '../../modules/auth/authSlice';
import { rateOptions } from '../../provider/jobFlows';
import { useServiceProT } from '../../i18n/I18nProvider';
import { labelKey } from '../../i18n/translations';

/**
 * After the job, the provider rates the customer (server jobs/customer-rating).
 * The customer never sees who rated them; other providers see the average on
 * offers, and ZappyOne looks at anyone rated low or marked unsafe.
 * Shows once per job; nothing after it is sent.
 */
export default function RateCustomerCard({ jobId, rated }) {
  const t = useServiceProT();
  const [rate, { isLoading }] = useRateCustomerMutation();
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState([]);
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);
  const [block, setBlock] = useState(false);
  const [blockCustomer] = useBlockJobCustomerMutation();
  const isWorker = useSelector(selectRole) === 'worker';
  if (rated || done) {
    return <p className="rounded-2xl bg-slate-50 px-4 py-3 text-[12.5px] text-slate-500">{t('sp.you_rated_this_customer_thank_you', 'You rated this customer. Thank you.')}</p>;
  }
  const options = rateOptions(stars);
  const toggle = (tag) => setTags((xs) => (xs.includes(tag) ? xs.filter((x) => x !== tag) : [...xs, tag]));

  async function send() {
    try {
      const r = await rate({ id: jobId, stars, tags, note: note.trim() }).unwrap();
      if (block) await blockCustomer({ id: jobId, reason: note.trim() }).unwrap().catch(() => toast.error(t('sp.rating_saved_but_the_block_did_not_go_through', 'Rating saved, but the block did not go through')));
      toast.success(r.message);
      setDone(true);
    } catch (err) {
      if (err?.data?.code === 'ALREADY_RATED') setDone(true);
      toast.error(err?.data?.error || t('sp.could_not_save_the_rating', 'Could not save the rating'));
    }
  }

  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-4">
      <p className="text-sm font-bold text-[#0F172A]">{t('sp.how_was_the_customer', 'How was the customer?')}</p>
      <p className="mt-0.5 text-[11.5px] text-slate-500">{t('sp.private_they_never_see_who_rated_them_it_helps_other_pros_and_zappyone_steps_in_when_someone_is_unsafe', 'Private: they never see who rated them. It helps other pros, and ZappyOne steps in when someone is unsafe.')}</p>
      <div className="mt-3 flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => { setStars(n); setTags([]); }} aria-label={n > 1 ? t('sp.n_stars', '{n} stars').replace('{n}', n) : t('sp.n_star', '{n} star').replace('{n}', n)}>
            <Star size={30} className={n <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
          </button>
        ))}
      </div>
      {stars > 0 && (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {options.map(([tag, label]) => (
              <button key={tag} type="button" onClick={() => toggle(tag)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${tags.includes(tag)
                  ? (tag === 'unsafe' ? 'border-red-600 bg-red-600 text-white' : 'border-slate-900 bg-slate-900 text-white')
                  : (tag === 'unsafe' ? 'border-red-200 text-red-700' : 'border-slate-200 text-slate-600')}`}>
                {tag === 'unsafe' && <ShieldAlert size={12} />}{t(labelKey(label), label)}
              </button>
            ))}
          </div>
          {stars <= 3 && (
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={2} placeholder={t('sp.what_happened_optional_only_zappyone_reads_this', 'What happened? (optional, only ZappyOne reads this)')}
              className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zappy-100" />
          )}
          {isWorker && stars <= 2 && (
            <label className="mt-3 flex items-center gap-2 text-[12.5px] font-semibold text-slate-700">
              <input type="checkbox" checked={block} onChange={(e) => setBlock(e.target.checked)} className="h-4 w-4 accent-zappy-600" />
              {t('sp.do_not_send_me_jobs_from_this_customer_again', 'Do not send me jobs from this customer again')}
            </label>
          )}
          <button type="button" onClick={send} disabled={isLoading}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F172A] py-3 text-sm font-bold text-white disabled:opacity-50">
            {isLoading && <Loader2 size={15} className="animate-spin" />} {t('sp.send_rating', 'Send rating')}
          </button>
        </>
      )}
    </div>
  );
}
