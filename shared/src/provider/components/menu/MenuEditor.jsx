import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock3, Eye, ImageIcon, Loader2, Pencil, Plus, Sparkles, Tag, Trash2, X } from 'lucide-react';
import {
  useProviderMenuQuery, useSaveProviderMenuItemMutation, useRemoveProviderMenuItemMutation,
  useAdjustProviderMenuMutation, useStartMenuFromSamplesMutation, useSetProviderMenuOfferMutation,
} from '../../../services/api';
import { OFFER_CHOICES, END_CHOICES, sameOffer, offerBody } from '../../offerChoices';
import PhotoTiles from '../../../components/common/PhotoTiles';
import PriceNotice from '../PriceNotice';
import { useI18n, useServiceProT } from '../../../i18n/I18nProvider';
import { labelKey } from '../../../i18n/translations';

const rupees = (p) => `₹${Math.round((p || 0) / 100).toLocaleString('en-IN')}`;
const toRupees = (p) => (p == null ? '' : String(Math.round(p / 100)));
const COMMON_INCLUDES = ['Tools and materials', 'Clean-up after the work', 'Before and after photos'];

// The provider's own menu for one fixed-price service, live as they save: keep or drop ZappyOne's sample jobs, add their own, and set a price per option.
export default function MenuEditor({ vertical, onNext, nextLabel }) {
  const t = useServiceProT();
  const { data, isLoading } = useProviderMenuQuery(vertical);
  const [startSamples, { isLoading: starting }] = useStartMenuFromSamplesMutation();
  const [adjust, { isLoading: adjusting }] = useAdjustProviderMenuMutation();
  const [editing, setEditing] = useState(null);
  const [pct, setPct] = useState('');
  const [preview, setPreview] = useState(false);

  if (isLoading || !data) return <div className="space-y-2" aria-hidden="true">{[0, 1, 2].map((k) => <div key={k} className="h-20 animate-pulse rounded-card bg-sunken" />)}</div>;
  const offered = data.items.filter((i) => i.offered);
  const more = data.items.filter((i) => !i.offered && !i.own);
  const allIncludes = [...new Set([...data.items.flatMap((i) => i.includes), ...COMMON_INCLUDES])];

  async function useSamples() {
    try { await startSamples({ vertical }).unwrap(); toast.success(t('sp.sample_jobs_added_at_suggested_prices_change_any_price_or_remove_a_job', 'Sample jobs added at suggested prices. Change any price, or remove a job.')); } catch (e) { toast.error(e?.data?.error || t('sp.could_not_add_the_samples', 'Could not add the samples')); }
  }
  async function applyPct() {
    try { await adjust({ vertical, pct: Number(pct) }).unwrap(); toast.success(t('sp.all_prices_changed_by_n', 'All prices changed by {n}%').replace('{n}', pct)); setPct(''); } catch (e) { toast.error(e?.data?.error || t('sp.could_not_change_the_prices', 'Could not change the prices')); }
  }

  return (
    <div className="space-y-4">
      <PriceNotice />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[20px] font-extrabold text-ink-900">{t('sp.your_menu', 'Your menu')}</h2>
          <p className="mt-0.5 text-[13.5px] text-ink-500">{t('sp.customers_near_you_book_from_this_every_change_is_live_as_soon_as_you_save', 'Customers near you book from this. Every change is live as soon as you save.')}</p>
        </div>
        {offered.length > 0 && (
          <button type="button" onClick={() => setPreview((p) => !p)} aria-pressed={preview} className="flex items-center gap-1.5 text-[13px] font-bold text-zappy-700 hover:underline">
            <Eye size={14} /> {preview ? t('sp.back_to_editing', 'Back to editing') : t('sp.preview_as_a_customer', 'Preview as a customer')}
          </button>
        )}
      </div>

      {data.tips.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {data.tips.map((tip) => <li key={tip} className="rounded-full bg-amber-50 px-3 py-1 text-[12px] font-semibold text-amber-800">{t(labelKey(tip), tip)}</li>)}
        </ul>
      )}

      {!offered.length && more.length > 0 && (
        <div className="rounded-card border border-zappy-200 bg-zappy-50 p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-btn bg-white text-zappy-700"><Sparkles size={18} /></span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-ink-900">{t('sp.start_with_n_ready_jobs', 'Start with {n} ready jobs').replace('{n}', more.length)}</p>
              <p className="mt-0.5 text-[13px] text-ink-700">{t('sp.added_at_suggested_starting_prices_then_change_any_price_or_remove_what_you_do_not_do_takes_a_minute', 'Added at suggested starting prices. Then change any price or remove what you do not do. Takes a minute.')}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={useSamples} disabled={starting} className="btn-primary h-10 px-4 text-[13.5px]">
              {starting && <Loader2 size={15} className="animate-spin" />} {t('sp.use_these_jobs', 'Use these jobs')}
            </button>
            <button type="button" onClick={() => setEditing({})} className="btn-secondary h-10 px-4 text-[13.5px]"><Plus size={15} /> {t('sp.add_my_own_job', 'Add my own job')}</button>
          </div>
        </div>
      )}

      {preview && <CustomerPreview items={offered} types={data.types} />}

      {!preview && offered.length > 0 && (
        <ul className="space-y-2">
          {offered.map((item) => (
            <motion.li layout key={item.repairCode} className="card flex items-start gap-3 p-3">
              {/* The photo opens the job's editor, where it is added or changed. */}
              <button type="button" onClick={() => setEditing(item)} aria-label={(item.photoUrl ? t('sp.change_the_photo_of_name', 'Change the photo of {name}') : t('sp.add_a_photo_to_name', 'Add a photo to {name}')).replace('{name}', item.name)} className="h-16 w-16 shrink-0 overflow-hidden rounded-btn bg-sunken ring-zappy-300 hover:ring-2">
                {item.photoUrl ? <img src={item.photoUrl} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-ink-400"><ImageIcon size={18} /><span className="text-[10px] font-semibold">{t('sp.add_photo', 'Add photo')}</span></span>}
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink-900">{item.name}{item.own && <span className="ml-1.5 rounded-full bg-sunken px-2 py-0.5 align-middle text-[10.5px] font-bold text-ink-500">{t('sp.your_job', 'Your job')}</span>}{item.offer && <span className="ml-1.5 rounded-full bg-emerald-50 px-2 py-0.5 align-middle text-[10.5px] font-bold text-emerald-700">{t(labelKey(item.offer.label), item.offer.label)}</span>}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-ink-500">
                  {item.minutes && <span className="flex items-center gap-1"><Clock3 size={12} /> {t('sp.n_min', '~{n} min').replace('{n}', item.minutes)}</span>}
                  <span className="font-semibold text-ink-700">
                    {data.types.filter((ty) => item.prices[ty.code] != null).map((ty) => `${data.types.length > 1 ? `${ty.name} ` : ''}${rupees(item.prices[ty.code])}`).join(' · ')}
                  </span>
                </p>
                {item.includes.length > 0 && <p className="mt-1 truncate text-[12px] text-ink-500">{t('sp.includes_list', 'Includes {list}').replace('{list}', item.includes.map((x) => t(labelKey(x), x)).join(', '))}</p>}
              </div>
              <button type="button" onClick={() => setEditing(item)} aria-label={t('sp.edit_name', 'Edit {name}').replace('{name}', item.name)} className="grid h-9 w-9 shrink-0 place-items-center rounded-btn text-ink-500 hover:bg-sunken"><Pencil size={16} /></button>
            </motion.li>
          ))}
        </ul>
      )}

      {!preview && offered.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setEditing({})} className="btn-secondary h-10 px-4 text-[13.5px]"><Plus size={15} /> {t('sp.add_a_job', 'Add a job')}</button>
          <span className="flex items-center gap-1.5 rounded-btn border border-line bg-white px-2 py-1">
            <span className="text-[12.5px] font-semibold text-ink-500">{t('sp.all_prices', 'All prices')}</span>
            <input value={pct} onChange={(e) => setPct(e.target.value.replace(/[^\d-]/g, '').slice(0, 4))} placeholder="+10" aria-label={t('sp.change_all_prices_by_percent', 'Change all prices by percent')} inputMode="numeric" className="w-12 bg-transparent text-center text-[13px] font-bold outline-none" />
            <span className="text-[12.5px] font-semibold text-ink-500">%</span>
            <button type="button" onClick={applyPct} disabled={!pct || adjusting || Number(pct) === 0} className="rounded-md bg-ink-900 px-2.5 py-1 text-[12px] font-bold text-white disabled:opacity-40">{t('sp.apply', 'Apply')}</button>
          </span>
        </div>
      )}

      {!preview && offered.length > 0 && more.length > 0 && (
        <div>
          <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.1em] text-ink-400">{t('sp.more_jobs_you_can_add', 'More jobs you can add')}</p>
          <div className="flex flex-wrap gap-2">
            {more.map((item) => (
              <button key={item.repairCode} type="button" onClick={() => setEditing({ ...item, prices: item.suggested })} className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-[13px] font-semibold text-ink-700 hover:border-zappy-400">
                <Plus size={13} /> {item.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {onNext && <button type="button" onClick={onNext} disabled={!offered.length} className="btn-primary h-12 w-full">{nextLabel || t('sp.continue', 'Continue')}</button>}

      <AnimatePresence>
        {editing && <ItemSheet key={editing.repairCode || 'new'} vertical={vertical} types={data.types} item={editing} suggestions={allIncludes} onClose={() => setEditing(null)} />}
      </AnimatePresence>
    </div>
  );
}

// The menu the way a customer sees it on the storefront: photo, what is included, time and the lowest price.
function CustomerPreview({ items, types }) {
  const t = useServiceProT();
  return (
    <ul className="divide-y divide-line rounded-card border border-line bg-white px-4">
      {items.map((item) => {
        const shown = types.filter((ty) => item.prices[ty.code] != null).map((ty) => item.prices[ty.code]);
        return (
          <li key={item.repairCode} className="flex gap-3 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-[15.5px] font-bold text-ink-900">{item.name}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[13px] text-ink-500">
                <span className="font-semibold tabular-nums text-ink-900">{shown.length > 1 ? `${t('sp.from', 'from').trim()} ` : ''}{rupees(Math.min(...shown))}</span>
                {item.minutes && <span className="flex items-center gap-1"><Clock3 size={13} /> {t('sp.about_n_min', 'about {n} min').replace('{n}', item.minutes)}</span>}
              </p>
              {item.includes.length > 0 && <p className="mt-1.5 text-[12.5px] text-ink-500">{t('sp.includes_list', 'Includes {list}').replace('{list}', item.includes.map((x) => t(labelKey(x), x)).join(' · '))}</p>}
            </div>
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-btn bg-sunken">
              {item.photoUrl && <img src={item.photoUrl} alt="" className="h-full w-full object-cover" />}
              <span className="absolute inset-x-2 bottom-2 rounded-md bg-white py-1 text-center text-[12.5px] font-bold text-zappy-700 shadow">{t('sp.book', 'Book')}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// One job: name (for their own), photo, what is included, time and a price per option; filling the first price fills the rest in proportion.
function ItemSheet({ vertical, types, item, suggestions, onClose }) {
  const t = useServiceProT();
  const isNew = !item.repairCode;
  const [name, setName] = useState(item.name || '');
  const [photos, setPhotos] = useState(item.photoKeys?.length ? item.photoKeys : item.photoKey ? [item.photoKey] : []);
  const [includes, setIncludes] = useState(item.includes || []);
  const [draft, setDraft] = useState('');
  const [minutes, setMinutes] = useState(item.minutes ? String(item.minutes) : '');
  const [prices, setPrices] = useState(() => Object.fromEntries(types.map((ty) => [ty.code, toRupees(item.prices?.[ty.code])])));
  const [save, { isLoading: saving }] = useSaveProviderMenuItemMutation();
  const [remove, { isLoading: removing }] = useRemoveProviderMenuItemMutation();
  const ratio = useMemo(() => {
    const base = item.suggested?.[types[0]?.code];
    return Object.fromEntries(types.map((ty) => [ty.code, base && item.suggested?.[ty.code] ? item.suggested[ty.code] / base : 1]));
  }, [item, types]);
  const priced = Object.values(prices).filter((v) => Number(v) >= 1).length;

  function addInclude(text) {
    const v = String(text).trim();
    if (v.length < 2 || includes.includes(v) || includes.length >= 8) return;
    setIncludes((l) => [...l, v]);
    setDraft('');
  }
  function fillFrom(code) {
    const first = Number(prices[code]);
    if (!(first >= 1) || code !== types[0]?.code) return;
    setPrices((p) => Object.fromEntries(types.map((ty) => [ty.code, p[ty.code] || String(Math.round(first * ratio[ty.code]))])));
  }
  async function submit() {
    try {
      await save({
        vertical, repairCode: item.repairCode || null, name: name.trim(), includes, photoKey: photos[0] || '', photoKeys: photos,
        minutes: Number(minutes) || null,
        prices: Object.fromEntries(types.map((ty) => [ty.code, Number(prices[ty.code]) >= 1 ? Math.round(Number(prices[ty.code]) * 100) : null])),
      }).unwrap();
      toast.success(isNew ? t('sp.added_to_your_menu', 'Added to your menu') : t('sp.saved_live_now', 'Saved. Live now.'));
      onClose();
    } catch (e) { toast.error(e?.data?.error || t('sp.could_not_save', 'Could not save')); }
  }
  async function drop() {
    try { await remove({ vertical, repairCode: item.repairCode }).unwrap(); toast.success(t('sp.removed_from_your_menu', 'Removed from your menu')); onClose(); } catch (e) { toast.error(e?.data?.error || t('sp.could_not_remove', 'Could not remove')); }
  }

  return (
    <motion.div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink-900/50 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div role="dialog" aria-modal="true" aria-label={isNew ? t('sp.add_a_job', 'Add a job') : t('sp.edit_name', 'Edit {name}').replace('{name}', item.name)}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-sheet bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-lg sm:rounded-sheet"
        initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} transition={{ type: 'spring', stiffness: 380, damping: 34 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[18px] font-extrabold text-ink-900">{isNew ? t('sp.add_a_job', 'Add a job') : item.name}</h3>
          <button type="button" onClick={onClose} aria-label={t('sp.close', 'Close')} className="grid h-9 w-9 place-items-center rounded-full text-ink-500 hover:bg-sunken"><X size={18} /></button>
        </div>

        <div className="mt-4 space-y-5">
          {(isNew || item.own) && (
            <label className="block text-[13px] font-semibold text-ink-700">{t('sp.job_name', 'Job name')}
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={t('sp.e_g_fridge_inside_clean', 'e.g. Fridge inside clean')} className="input mt-1.5 w-full text-[15px]" />
            </label>
          )}

          <div>
            <p className="text-[13px] font-semibold text-ink-700">{t('sp.photo_of_your_work', 'Photo of your work')}</p>
            <p className="mb-2 text-[12px] text-ink-500">{t('sp.a_real_photo_helps_customers_choose_you', 'A real photo helps customers choose you.')}</p>
            <PhotoTiles value={photos} onChange={setPhotos} previews={Object.fromEntries((item.photoKeys || []).map((k, i) => [k, item.photoUrls?.[i]]).filter(([, u]) => u))} max={6} folder="menu" />
          </div>

          <div>
            <p className="text-[13px] font-semibold text-ink-700">{t('sp.what_s_included', 'What\'s included')}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {includes.map((inc) => (
                <span key={inc} className="flex items-center gap-1 rounded-full bg-zappy-50 px-2.5 py-1 text-[12.5px] font-semibold text-zappy-800">
                  {t(labelKey(inc), inc)}<button type="button" onClick={() => setIncludes((l) => l.filter((x) => x !== inc))} aria-label={t('sp.remove_name', 'Remove {name}').replace('{name}', inc)}><X size={12} /></button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInclude(draft); } }} maxLength={60} placeholder={t('sp.e_g_mopping_all_rooms', 'e.g. Mopping all rooms')} className="input min-w-0 flex-1 text-[14px]" />
              <button type="button" onClick={() => addInclude(draft)} className="btn-secondary px-3 text-[13px]">{t('sp.add', 'Add')}</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.filter((s) => !includes.includes(s)).slice(0, 8).map((s) => (
                <button key={s} type="button" onClick={() => addInclude(s)} className="rounded-full border border-line px-2.5 py-1 text-[12px] font-medium text-ink-500 hover:border-zappy-400 hover:text-zappy-700">+ {t(labelKey(s), s)}</button>
              ))}
            </div>
          </div>

          <label className="block text-[13px] font-semibold text-ink-700">{t('sp.time_it_takes_minutes', 'Time it takes (minutes)')}
            <input value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder={t('sp.e_g_60', 'e.g. 60')} className="input mt-1.5 w-32 text-[15px]" />
          </label>

          <div>
            <p className="text-[13px] font-semibold text-ink-700">{types.length > 1 ? t('sp.your_price_for_each_size', 'Your price for each size') : t('sp.your_price', 'Your price')}</p>
            {types.length > 1 && <p className="text-[12px] text-ink-500">{t('sp.type_the_first_price_and_the_rest_fill_in_change_any_of_them_leave_one_empty_if_you_do_not_do_that_size', 'Type the first price and the rest fill in. Change any of them. Leave one empty if you do not do that size.')}</p>}
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {types.map((ty) => (
                <label key={ty.code} className="block">
                  {types.length > 1 && <span className="text-[12px] font-semibold text-ink-500">{ty.name}</span>}
                  <span className="mt-1 flex h-11 items-center rounded-btn border border-line-strong bg-white px-2.5 focus-within:border-zappy-600 focus-within:ring-2 focus-within:ring-zappy-100">
                    <span className="text-[14px] font-semibold text-ink-400">₹</span>
                    <input value={prices[ty.code]} onChange={(e) => setPrices((p) => ({ ...p, [ty.code]: e.target.value.replace(/\D/g, '').slice(0, 6) }))} onBlur={() => fillFrom(ty.code)}
                      inputMode="numeric" aria-label={t('sp.price_for_name', 'Price for {name}').replace('{name}', ty.name)} className="min-w-0 flex-1 bg-transparent pl-1 text-[15px] font-bold tabular-nums text-ink-900 outline-none" />
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {!isNew && item.offered && <OfferPicker vertical={vertical} item={item} types={types} />}

        <div className="mt-6 flex gap-2">
          {!isNew && item.offered && (
            <button type="button" onClick={drop} disabled={removing} className="btn-secondary h-12 px-4 text-red-700"><Trash2 size={16} /> {t('sp.remove', 'Remove')}</button>
          )}
          <button type="button" onClick={submit} disabled={saving || !priced || ((isNew || item.own) && name.trim().length < 2)} className="btn-primary h-12 flex-1">
            {saving && <Loader2 size={16} className="animate-spin" />} {isNew ? t('sp.add_to_my_menu', 'Add to my menu') : t('sp.save', 'Save')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// One tap puts an offer on this job or takes it off; the server sends back what customers will pay.
function OfferPicker({ vertical, item, types }) {
  const t = useServiceProT();
  const { lang: chosen } = useI18n();
  const dl = import.meta.env.VITE_CLIENT_SURFACE === 'servicepro' ? chosen : 'en';
  const [offer, setOffer] = useState(item.offer || null);
  const [days, setDays] = useState(item.offer?.endsAt ? -1 : 0);
  const [save, { isLoading }] = useSetProviderMenuOfferMutation();
  const first = types.find((ty) => item.prices?.[ty.code] != null);

  async function choose(choice, d = days) {
    try {
      const res = await save({ vertical, repairCode: item.repairCode, offer: offerBody(choice, d) }).unwrap();
      setOffer(res.items.find((i) => i.repairCode === item.repairCode)?.offer || null);
      toast.success(choice ? t('sp.offer_is_live', 'Offer is live') : t('sp.offer_removed', 'Offer removed'));
    } catch (e) { toast.error(e?.data?.error || t('sp.could_not_save_the_offer', 'Could not save the offer')); }
  }

  return (
    <div className="mt-5 rounded-card border border-line p-4">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-700"><Tag size={14} /> {t('sp.offer', 'Offer')} <span className="font-normal text-ink-500">({t('sp.optional', 'optional')})</span></p>
      <p className="text-[12px] text-ink-500">{t('sp.customers_see_your_offer_price_with_your_normal_price_crossed_out_stop_it_any_time', 'Customers see your offer price with your normal price crossed out. Stop it any time.')}</p>
      <div className="mt-2.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('sp.offer', 'Offer')}>
        {OFFER_CHOICES.map((c) => (
          <button key={c.label} type="button" role="radio" aria-checked={sameOffer(c.offer, offer)} disabled={isLoading} onClick={() => choose(c.offer)}
            className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition ${sameOffer(c.offer, offer) ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-line text-ink-700 hover:border-emerald-400'}`}>
            {t(labelKey(c.label), c.label)}
          </button>
        ))}
      </div>
      {offer && (
        <>
          <div className="mt-2.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('sp.how_long', 'How long')}>
            {END_CHOICES.map((e) => (
              <button key={e.days} type="button" role="radio" aria-checked={days === e.days} disabled={isLoading} onClick={() => { setDays(e.days); choose(offer, e.days); }}
                className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${days === e.days ? 'border-ink-900 bg-ink-900 text-white' : 'border-line text-ink-500 hover:border-ink-400'}`}>
                {t(labelKey(e.label), e.label)}
              </button>
            ))}
          </div>
          {first && offer.prices?.[first.code] != null && (
            <p className="mt-2.5 text-[13px] text-ink-700">
              {t('sp.customers_pay_a_instead_of_b', 'Customers pay {a} instead of {b}').split(/(\{a\}|\{b\})/).map((part, i) => {
                if (part === '{a}') return <b key={i} className="text-emerald-700">{rupees(offer.prices[first.code])}</b>;
                if (part === '{b}') return <s key={i} className="text-ink-400">{rupees(item.prices[first.code])}</s>;
                return part;
              })}{types.length > 1 ? ` ${t('sp.for_name', 'for {name}').replace('{name}', first.name)}` : ''} · {offer.endsAt ? t('sp.ends_d', 'Ends {d}').replace('{d}', new Date(offer.endsAt).toLocaleDateString(`${dl}-IN`, { day: 'numeric', month: 'short' })) : t('sp.no_end_date', 'No end date')}
            </p>
          )}
        </>
      )}
    </div>
  );
}
