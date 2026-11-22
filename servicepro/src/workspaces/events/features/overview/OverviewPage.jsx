import { Link, useOutletContext } from 'react-router-dom';
import { ShieldCheck, ArrowRight, CalendarCheck, Images, Star } from 'lucide-react';
import { usePartnerOverviewQuery, usePartnerBookingsQuery } from '@shared/services/api';
import { Spinner, Stat, Card } from '../../components/ui';
import { StatusChip } from '../bookings/status';
import { rupees, shortDate } from '../../lib/format';
import { placeName } from '@shared/constants/telanganaPlaces';
import { useI18n } from '@shared/i18n/I18nProvider';

/**
 * What needs the partner today: requests waiting for an answer, what is coming
 * up, and what they have earned. Every number comes from the server.
 */
export default function OverviewPage() {
  const { t, lang } = useI18n();
  const { partner, verified } = useOutletContext();
  const { data, isLoading } = usePartnerOverviewQuery();
  const { data: newOnes } = usePartnerBookingsQuery({ status: 'confirmed' }, { skip: !verified });
  const { data: upcoming } = usePartnerBookingsQuery({ status: 'upcoming' }, { skip: !verified });

  if (isLoading) return <Spinner kind="dashboard" />;
  const s = data?.stats || {};
  const rating = partner?.reviewCount ? Number(partner.rating).toFixed(1) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-bold text-ink-900">{t('sp.ev.ov.hello', 'Hello, {name}').replace('{name}', partner?.ownerName?.split(' ')[0] || partner?.businessName || t('sp.ev.ov.partner', 'partner'))}</h1>
        <p className="mt-0.5 text-[14px] text-ink-500">{partner?.businessName}</p>
      </div>

      {!verified && (
        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-btn bg-amber-50 text-amber-700"><ShieldCheck size={20} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-ink-900">
              {partner?.kyc?.status === 'pending' ? t('sp.ev.ov.checking', 'We are checking your documents') : t('sp.ev.ov.showDocs', 'Show your business documents to start getting bookings')}
            </p>
            <p className="text-[13px] text-ink-500">
              {partner?.kyc?.status === 'pending'
                ? t('sp.ev.ov.reply24', 'We reply in about 24 hours. Finish your profile while you wait.')
                : t('sp.ev.ov.addId', 'Add your ID and a selfie. After we approve, packages, bookings and earnings open.')}
            </p>
          </div>
          <Link to="/partner/profile" className="btn-primary">{partner?.kyc?.status === 'pending' ? t('sp.ev.ov.viewStatus', 'View status') : t('sp.ev.ov.startNow', 'Start now')}</Link>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t('sp.ev.ov.newReq', 'New requests')} value={s.pendingConfirmations ?? 0} hint={t('sp.ev.ov.waiting', 'Waiting for your answer')} />
        <Stat label={t('sp.ev.ov.next7', 'Next 7 days')} value={s.upcomingEvents ?? 0} hint={t('sp.ev.ov.toSetUp', 'Events to set up')} />
        <Stat label={t('sp.ev.ov.livePk', 'Live packages')} value={s.themes ?? 0} />
        <Stat label={t('sp.ev.ov.earned', 'Earned so far')} value={rupees(s.netEarningsPaise)} hint={t('sp.ev.ov.afterComm', "After ZappyOne's commission")} />
      </div>

      {verified && (
        <div className="grid gap-4 lg:grid-cols-2">
          <BookingList title={t('sp.ev.ov.newReq', 'New requests')} empty={t('sp.ev.ov.noNew', 'No new requests right now.')} rows={newOnes?.bookings} to="/partner/bookings?status=confirmed" />
          <BookingList title={t('sp.ev.ov.comingUp', 'Coming up')} empty={t('sp.ev.ov.noAcc', 'Nothing accepted yet.')} rows={upcoming?.bookings} to="/partner/bookings?status=upcoming" />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Shortcut to="/partner/packages/new" Icon={Images} title={t('sp.ev.ov.addPk', 'Add a package')} text={t('sp.ev.ov.addPkT', 'Photos, price and what is included')} locked={!verified} />
        <Shortcut to="/partner/calendar" Icon={CalendarCheck} title={t('sp.ev.ov.block', 'Block dates')} text={t('sp.ev.ov.blockT', 'Days you are not available')} locked={!verified} />
        <Card className="flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-btn bg-amber-50 text-amber-700"><Star size={18} /></span>
          <span>
            <span className="block text-[15px] font-semibold text-ink-900">{rating ? t('sp.ev.ov.rating', '{r} rating').replace('{r}', rating) : t('sp.ev.ov.noRating', 'No ratings yet')}</span>
            <span className="block text-[13px] text-ink-500">{t('sp.ev.ov.evDone', '{n} events completed').replace('{n}', partner?.completedEvents || 0)}</span>
          </span>
        </Card>
      </div>
    </div>
  );
}

function BookingList({ title, empty, rows = [], to }) {
  const { t, lang } = useI18n();
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-[15px] font-bold text-ink-900">{title}</p>
        <Link to={to} className="flex items-center gap-1 text-[13px] font-semibold text-zappy-600">{t('sp.ev.ov.seeAll', 'See all')} <ArrowRight size={14} /></Link>
      </div>
      {!rows?.length ? <p className="px-4 py-6 text-[14px] text-ink-500">{empty}</p> : (
        <ul className="divide-y divide-line">
          {rows.slice(0, 4).map((b) => (
            <li key={b._id}>
              <Link to={`/partner/bookings/${b._id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-canvas">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-ink-900">{b.themeId?.title || t('sp.ev.event', 'Event')}</span>
                  <span className="block text-[13px] text-ink-500">{shortDate(b.eventDate, lang)}, {b.eventTimeSlot}, {placeName(b.address?.city) || '-'}</span>
                </span>
                <StatusChip status={b.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Shortcut({ to, Icon, title, text, locked }) {
  const { t } = useI18n();
  const body = (
    <>
      <span className="flex h-10 w-10 items-center justify-center rounded-btn bg-zappy-50 text-zappy-700"><Icon size={18} /></span>
      <span>
        <span className="block text-[15px] font-semibold text-ink-900">{title}</span>
        <span className="block text-[13px] text-ink-500">{locked ? t('sp.ev.ov.afterCheck', 'After ZappyOne checks it') : text}</span>
      </span>
    </>
  );
  return locked
    ? <div className="flex items-center gap-3 rounded-card border border-line bg-white p-4 opacity-60">{body}</div>
    : <Link to={to} className="flex items-center gap-3 rounded-card border border-line bg-white p-4 hover:border-line-strong">{body}</Link>;
}
