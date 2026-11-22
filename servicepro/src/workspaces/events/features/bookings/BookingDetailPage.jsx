import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Phone, MapPin, Users, Clock, StickyNote, Camera, Loader2, CheckCircle2, XCircle, Navigation } from 'lucide-react';
import {
  usePartnerBookingQuery, useUpdatePartnerBookingStatusMutation, useDeclineEventBookingMutation, useEventDeclineQuoteQuery,
  useAddPartnerSetupPhotosMutation, usePresignUploadMutation,
} from '@shared/services/api';
import { useStartCodeGate } from '@shared/components/worker/StartCodePrompt';
import { Spinner, Card } from '../../components/ui';
import { useI18n } from '@shared/i18n/I18nProvider';
import { tl } from '../../lib/labels';
import { StatusChip, NEXT_STEP } from './status';
import { rupees, longDate } from '../../lib/format';
import { uploadFile } from '../../lib/upload';
import { placeName } from '@shared/constants/telanganaPlaces';
import { PHOTO_STATES, BEFORE_OPEN, AFTER_OPEN } from '@shared/events/partnerBookings';

/**
 * One booking, worked from top to bottom: what, when, where, the customer's
 * notes and room photos, then the next step. Setup photos are the proof the
 * customer sees; the finished ones are required to complete.
 */
export default function BookingDetailPage() {
  const { t, lang } = useI18n();
  const { id } = useParams();
  const { data, isLoading, refetch } = usePartnerBookingQuery(id);
  const [advance, { isLoading: moving }] = useUpdatePartnerBookingStatusMutation();
  const [decline, { isLoading: declining }] = useDeclineEventBookingMutation();
  const gate = useStartCodeGate();
  const [declineOpen, setDeclineOpen] = useState(false);
  // What cancelling costs, shown before they confirm (server events/partner-cancel).
  const { data: declineQuote } = useEventDeclineQuoteQuery(id, { skip: !declineOpen });
  const [reason, setReason] = useState('');

  if (isLoading) return <Spinner />;
  const b = data?.booking;
  if (!b) return <p className="py-16 text-center text-[15px] text-ink-500">{t('sp.ev.bd.notFound', 'This booking could not be found.')}</p>;

  const step = NEXT_STEP[b.status];
  const afterCount = b.setupPhotos?.after?.length || 0;
  const blocked = step?.needsAfterPhoto && !afterCount;
  const mapsUrl = b.address?.lat ? `https://www.google.com/maps/dir/?api=1&destination=${b.address.lat},${b.address.lng}` : null;

  async function next() {
    try {
      const run = (code) => advance({ id, status: step.to, code }).unwrap();
      if (step.needsCode) await gate.run(run); else await run();
      toast.success(step.to === 'completed' ? t('sp.ev.bd.done', 'Booking completed') : t('sp.ev.bd.updated', 'Updated'));
      refetch();
    } catch (e) {
      if (e?.data?.error) toast.error(e.data.error);
    }
  }

  async function doDecline() {
    try {
      await decline({ id, reason: reason.trim() || 'Partner unavailable' }).unwrap();
      toast.success(t('sp.ev.bd.declined', 'Booking declined. The customer is refunded in full.'));
      setDeclineOpen(false);
      refetch();
    } catch (e) { toast.error(e?.data?.error || t('sp.ev.bd.declFail', 'Could not decline')); }
  }

  return (
    <div className="space-y-4 pb-24 lg:pb-0">
      {gate.prompt}
      <Link to="/partner/bookings" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-700"><ArrowLeft size={16} /> {t('sp.ev.bd.bookings', 'Bookings')}</Link>

      <Card className="overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          {b.themeId?.coverImage && <img src={b.themeId.coverImage} alt="" className="h-16 w-16 shrink-0 rounded-btn object-cover" />}
          <div className="min-w-0 flex-1">
            <h1 className="text-[19px] font-bold leading-tight text-ink-900">{b.themeId?.title || t('sp.ev.event', 'Event')}</h1>
            <p className="mt-0.5 text-[14px] text-ink-500">{longDate(b.eventDate, lang)}, {b.eventTimeSlot}</p>
            <div className="mt-2"><StatusChip status={b.status} /></div>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-line text-[14px]">
          <div className="border-r border-line p-4">
            <p className="text-[12px] text-ink-500">{t('sp.ev.bd.pays', 'Customer pays')}</p>
            <p className="text-[17px] font-bold tabular-nums text-ink-900">{rupees(b.pricing?.totalPaise)}</p>
          </div>
          <div className="p-4">
            <p className="text-[12px] text-ink-500">{t('sp.ev.bd.youGet', 'You get')}</p>
            <p className="text-[17px] font-bold tabular-nums text-green-700">{rupees(b.payout?.netPaise)}</p>
          </div>
        </div>
      </Card>

      <Card className="divide-y divide-line">
        <Row Icon={Users} label={t('sp.ev.bd.customer', 'Customer')} value={b.userId?.name || t('sp.ev.bd.customer', 'Customer')}>
          {b.userId?.phone && (
            <a href={`tel:${b.userId.phone}`} className="btn-outline min-h-[36px] px-3 text-[13px]"><Phone size={14} /> {t('sp.ev.bd.call', 'Call')}</a>
          )}
        </Row>
        <Row Icon={MapPin} label={t('sp.ev.bd.venue', 'Venue')} value={[b.address?.line1, placeName(b.address?.city), b.address?.pincode].filter(Boolean).join(', ')}>
          {mapsUrl && <a href={mapsUrl} target="_blank" rel="noreferrer" className="btn-outline min-h-[36px] px-3 text-[13px]"><Navigation size={14} /> {t('sp.ev.bd.directions', 'Directions')}</a>}
        </Row>
        <Row Icon={Users} label={t('sp.ev.bd.guests', 'Guests')} value={String(b.guestCount || 1)} />
        <Row Icon={Clock} label={t('sp.ev.bd.setupT', 'Setup time')} value={t('sp.ev.bd.aboutH', 'About {n} hours').replace('{n}', Math.round((b.themeId?.setupDurationMinutes || 120) / 60 * 10) / 10)} />
        {b.notes && <Row Icon={StickyNote} label={t('sp.ev.bd.note', "Customer's note")} value={b.notes} />}
      </Card>

      {b.roomPhotos?.length > 0 && (
        <Card className="p-4">
          <p className="text-[15px] font-bold text-ink-900">{t('sp.ev.bd.room', "The customer's room")}</p>
          <PhotoStrip photos={b.roomPhotos} />
        </Card>
      )}

      {PHOTO_STATES.includes(b.status) && (
        <Card className="space-y-4 p-4">
          <div>
            <p className="text-[15px] font-bold text-ink-900">{t('sp.ev.bd.photos', 'Setup photos')}</p>
            <p className="text-[13px] text-ink-500">{t('sp.ev.bd.photosH', 'The customer sees these. At least one finished photo is needed to complete.')}</p>
          </div>
          <PhotoStage id={id} stage="before" title={t('sp.ev.bd.before', 'Before you start')} photos={b.setupPhotos?.before} enabled={BEFORE_OPEN.includes(b.status)} onDone={refetch} />
          <PhotoStage id={id} stage="after" title={t('sp.ev.bd.after', 'Finished setup')} photos={b.setupPhotos?.after} enabled={AFTER_OPEN.includes(b.status)}
            lockedText={t('sp.ev.bd.afterLocked', 'Add these once the setup has started')} onDone={refetch} />
        </Card>
      )}

      {step && (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+64px)] z-20 border-t border-line bg-white p-3 lg:static lg:rounded-card lg:border lg:p-4">
          <div className="mx-auto flex max-w-5xl gap-2">
            {b.status === 'confirmed' && (
              <button type="button" onClick={() => setDeclineOpen(true)} className="btn-outline flex-1 border-red-200 text-red-700"><XCircle size={16} /> {t('sp.ev.bd.decline', 'Decline')}</button>
            )}
            <button type="button" onClick={next} disabled={moving || blocked} className="btn-primary flex-[2]">
              {moving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {blocked ? t('sp.ev.bd.needFin', 'Add a finished photo first') : tl(t, step.label)}
            </button>
          </div>
          {step.needsCode && <p className="mx-auto mt-1.5 max-w-5xl text-center text-[12px] text-ink-500">{t('sp.ev.bd.askCode', 'Ask the host for their start code when you arrive.')}</p>}
        </div>
      )}

      {declineOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 sm:items-center" onClick={(e) => e.target === e.currentTarget && setDeclineOpen(false)}>
          <div className="w-full max-w-md rounded-t-sheet bg-white p-5 sm:rounded-card">
            <p className="text-[17px] font-bold text-ink-900">{t('sp.ev.bd.declQ', 'Decline this booking?')}</p>
            <p className="mt-1 text-[14px] text-ink-500">{t('sp.ev.bd.fullRefund', 'The customer gets a full refund.')}</p>
            {declineQuote?.quote ? (
              <p className={`mt-2 rounded-btn px-3 py-2 text-[13px] leading-relaxed ${declineQuote.quote.penaltyPaise || declineQuote.quote.willPause ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900'}`}>
                {declineQuote.quote.message}
              </p>
            ) : <p className="mt-2 flex items-center gap-1.5 text-[13px] text-ink-500"><Loader2 size={13} className="animate-spin" /> {t('sp.ev.bd.checking', 'Checking what it costs…')}</p>}
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder={t('sp.ev.bd.reason', 'Reason (the customer sees this)')} className="input mt-3 w-full" />
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setDeclineOpen(false)} className="btn-outline flex-1">{t('sp.ev.bd.keep', 'Keep it')}</button>
              <button type="button" onClick={doDecline} disabled={declining || !declineQuote?.quote} className="btn-primary flex-1 bg-red-600 hover:bg-red-700">
                {declining && <Loader2 size={16} className="animate-spin" />} {t('sp.ev.bd.decline', 'Decline')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ Icon, label, value, children }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-sunken text-ink-700"><Icon size={16} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] text-ink-500">{label}</span>
        <span className="block break-words text-[14px] font-medium text-ink-900">{value || '-'}</span>
      </span>
      {children}
    </div>
  );
}

function PhotoStrip({ photos = [] }) {
  return (
    <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
      {photos.map((src) => (
        <a key={src} href={src} target="_blank" rel="noreferrer" className="shrink-0">
          <img src={src} alt="" className="h-24 w-24 rounded-btn border border-line object-cover" />
        </a>
      ))}
    </div>
  );
}

function PhotoStage({ id, stage, title, photos = [], enabled, lockedText, onDone }) {
  const { t } = useI18n();
  const [presign] = usePresignUploadMutation();
  const [save] = useAddPartnerSetupPhotosMutation();
  const [busy, setBusy] = useState(false);

  async function add(files) {
    const list = Array.from(files || []).slice(0, 10 - photos.length);
    if (!list.length) return;
    setBusy(true);
    try {
      const keys = [];
      for (const f of list) keys.push(await uploadFile(presign, f, { folder: 'event-photos', t }));
      await save({ id, stage, keys }).unwrap();
      toast.success(keys.length === 1 ? t('sp.ev.bd.added1', '1 photo added') : t('sp.ev.bd.addedN', '{n} photos added').replace('{n}', keys.length));
      onDone?.();
    } catch (e) {
      toast.error(e?.data?.error || e.message || t('sp.ev.bd.addFail', 'Could not add photos'));
    } finally { setBusy(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[14px] font-semibold text-ink-900">{title} <span className="font-normal text-ink-500">({photos.length})</span></p>
        {enabled && photos.length < 10 && (
          <label className="btn-outline min-h-[36px] cursor-pointer px-3 text-[13px]">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />} {t('sp.ev.bd.addPhotos', 'Add photos')}
            <input type="file" accept="image/*" capture="environment" multiple className="hidden" disabled={busy} onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
          </label>
        )}
      </div>
      {photos.length ? <PhotoStrip photos={photos} /> : <p className="mt-2 text-[13px] text-ink-400">{enabled ? t('sp.ev.bd.noPhotos', 'No photos yet.') : lockedText || t('sp.ev.bd.notYet', 'Not yet.')}</p>}
    </div>
  );
}
