import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Images, Pencil, Trash2, Users, Clock, Star, Video } from 'lucide-react';
import { usePartnerThemesQuery, useDeleteEventThemeMutation } from '@shared/services/api';
import { PageHeader, Spinner, Empty } from '../../components/ui';
import { rupees } from '../../lib/format';
import { placeName } from '@shared/constants/telanganaPlaces';
import { PACKAGE_STATUS_LABEL, EDITABLE } from '@shared/events/partnerBookings';
import { useT } from '@shared/i18n/I18nProvider';
import { tl } from '../../lib/labels';

const TONE = {
  pending: 'bg-amber-50 text-amber-800', approved: 'bg-green-50 text-green-700', featured: 'bg-green-50 text-green-700',
  hidden: 'bg-sunken text-ink-700', rejected: 'bg-red-50 text-red-700',
};
/** Packages go live only after review; live ones are changed through support (shared/events/partnerBookings). */
export const PACKAGE_STATUS = Object.fromEntries(Object.entries(PACKAGE_STATUS_LABEL).map(([k, label]) => [k, { label, tone: TONE[k] }]));
export { EDITABLE };

export default function PackagesPage() {
  const tr = useT();
  const { data, isLoading } = usePartnerThemesQuery();
  const [remove] = useDeleteEventThemeMutation();
  const rows = data?.themes || [];

  async function del(t) {
    if (!window.confirm(tr('sp.ev.pk.delQ', 'Delete "{t}"? This cannot be undone.').replace('{t}', t.title))) return;
    try { await remove(t._id).unwrap(); toast.success(tr('sp.ev.pk.deleted', 'Package deleted')); } catch (e) { toast.error(e?.data?.error || tr('sp.ev.pk.delFail', 'Could not delete')); }
  }

  return (
    <div>
      <PageHeader title={tr('sp.ev.pk.title', 'Packages')} subtitle={tr('sp.ev.pk.sub', 'What customers can book from you, with one all-in price.')}
        action={<Link to="/partner/packages/new" className="btn-primary"><Plus size={16} /> {tr('sp.ev.pk.new', 'New package')}</Link>} />

      {isLoading ? <Spinner /> : !rows.length ? (
        <Empty icon={Images} title={tr('sp.ev.pk.none', 'No packages yet')} text={tr('sp.ev.pk.noneT', 'Add your first setup with photos, price and what is included. We review it within a day.')}
          action={<Link to="/partner/packages/new" className="btn-primary"><Plus size={16} /> {tr('sp.ev.pk.add', 'Add a package')}</Link>} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((t) => {
            const st = PACKAGE_STATUS[t.status] || PACKAGE_STATUS.pending;
            const editable = EDITABLE.includes(t.status);
            return (
              <li key={t._id} className="flex flex-col overflow-hidden rounded-card border border-line bg-white">
                <div className="relative aspect-[4/3] bg-sunken">
                  {t.coverImage && <img src={t.coverImage} alt="" className="h-full w-full object-cover" loading="lazy" />}
                  <span className={`chip absolute left-2 top-2 ${st.tone}`}>{tl(tr, st.label)}</span>
                  {t.videoUrl && <span className="chip absolute right-2 top-2 bg-white text-ink-900"><Video size={12} /> {tr('sp.ev.pk.video', 'Video')}</span>}
                </div>
                <div className="flex flex-1 flex-col p-3.5">
                  <p className="line-clamp-1 text-[15px] font-semibold text-ink-900">{t.title}</p>
                  <p className="text-[13px] text-ink-500">{t.categoryId?.name}</p>
                  <p className="mt-2 text-[18px] font-bold tabular-nums text-ink-900">{rupees(t.startingPricePaise)}</p>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-500">
                    <span className="flex items-center gap-1"><Users size={12} /> {tr('sp.ev.pk.upTo', 'Up to {n}').replace('{n}', t.guestCapacity?.max || '-')}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {tr('sp.ev.pk.setup', '{n} h setup').replace('{n}', Math.round((t.setupDurationMinutes || 120) / 6) / 10)}</span>
                    {t.reviewCount > 0 && <span className="flex items-center gap-1"><Star size={12} /> {Number(t.rating).toFixed(1)}</span>}
                    <span>{tr('sp.ev.pk.booked', '{n} booked').replace('{n}', t.bookingCount || 0)}</span>
                  </div>
                  {t.cities?.length > 0 && <p className="mt-1.5 line-clamp-1 text-[12px] text-ink-400">{t.cities.map(placeName).join(', ')}</p>}
                  {t.status === 'rejected' && t.adminNote && <p className="mt-2 rounded-btn bg-red-50 p-2 text-[12px] text-red-700">{t.adminNote}</p>}
                  <div className="mt-auto flex gap-2 pt-3">
                    {editable ? (
                      <>
                        <Link to={`/partner/packages/${t._id}/edit`} className="btn-outline min-h-[38px] flex-1 px-3 text-[13px]"><Pencil size={14} /> {tr('sp.ev.pk.edit', 'Edit')}</Link>
                        <button type="button" onClick={() => del(t)} aria-label={tr('sp.ev.pk.delAria', 'Delete {t}').replace('{t}', t.title)} className="btn-outline min-h-[38px] w-10 px-0 text-red-700"><Trash2 size={15} /></button>
                      </>
                    ) : (
                      <p className="text-[12px] text-ink-500">{tr('sp.ev.pk.liveNote', 'Live packages are changed through support, so bookings already made stay as sold.')}</p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
