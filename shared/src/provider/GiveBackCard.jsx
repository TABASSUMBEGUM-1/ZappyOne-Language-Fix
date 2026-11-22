import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarCheck, Clock, Loader2, ShieldCheck, UserX, Undo2 } from 'lucide-react';
import { useJobGiveBackQuery, useGiveBackJobMutation, useReportCustomerAbsentMutation, useConfirmJobSafeMutation, useAskJobMoreTimeMutation, useAnswerTimeCheckMutation } from '../services/api';
import { minsUntil } from './jobFlows';
import { useI18n, useServiceProT } from '../i18n/I18nProvider';
import { labelKey } from '../i18n/translations';

// "Are you OK?" after a long time at the customer (server: jobs/safety-check); unanswered, ops is alerted.
function SafetyCheck({ jobId, safety, onDone }) {
  const t = useServiceProT();
  const [confirm, { isLoading }] = useConfirmJobSafeMutation();
  if (!safety?.asked) return null;
  async function safe() {
    try { toast.success((await confirm(jobId).unwrap()).message); onDone(); }
    catch (err) { toast.error(err?.data?.error || t('sp.could_not_send_try_again', 'Could not send. Try again.')); }
  }
  return (
    <div role="alert" className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
      <p className="text-sm font-bold text-amber-900">{t('sp.are_you_ok', 'Are you OK?')}</p>
      <p className="mt-0.5 text-[12px] text-amber-900/80">{safety.escalated ? t('sp.zappyone_is_calling_you_tap_below_if_you_are_fine', 'ZappyOne is calling you. Tap below if you are fine.') : t('sp.you_have_been_at_the_customer_for_a_while_tap_below_or_use_sos_if_you_need_help', 'You have been at the customer for a while. Tap below, or use SOS if you need help.')}</p>
      <button type="button" onClick={safe} disabled={isLoading} className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-zappy-600 py-2.5 text-sm font-bold text-white disabled:opacity-60">
        {isLoading ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />} {t('sp.i_m_safe', 'I\'m safe')}
      </button>
    </div>
  );
}

const clockIn = (d, lang) => new Date(d).toLocaleTimeString(`${lang}-IN`, { hour: 'numeric', minute: '2-digit' });

// A job booked for later: confirm before the time, or say early that you can't and it goes to someone else free (server: jobs/time-check).
function TimeCheck({ jobId, check, onDone }) {
  const t = useServiceProT();
  const { lang } = useI18n();
  const clock = (d) => clockIn(d, lang);
  const nav = useNavigate();
  const [answer, { isLoading }] = useAnswerTimeCheckMutation();
  if (!check) return null;
  if (check.confirmedAt) return <p className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700"><CalendarCheck size={14} /> {t('sp.you_confirmed_be_there_by_time', 'You confirmed. Be there by {time}.').replace('{time}', clock(check.dueAt))}</p>;
  if (!check.askOpen) return null;
  async function reply(a) {
    if (a === 'no' && !window.confirm(t('sp.hand_this_job_back_it_is_free_until_time_and_goes_to_someone_else', 'Hand this job back? It is free until {time} and goes to someone else.').replace('{time}', clock(check.freeUntil)))) return;
    try {
      const out = await answer({ id: jobId, answer: a }).unwrap();
      toast.success(out.message);
      if (out.handedBack) nav('/worker/work'); else onDone();
    } catch (err) { toast.error(err?.data?.error || t('sp.could_not_send_try_again', 'Could not send. Try again.')); }
  }
  return (
    <div role="alert" className="rounded-2xl border-2 border-zappy-200 bg-zappy-50 p-4">
      <p className="text-sm font-bold text-slate-900">{t('sp.confirm_you_will_be_there_at_time', 'Confirm you will be there at {time}').replace('{time}', clock(check.dueAt))}</p>
      <p className="mt-0.5 text-[12px] text-slate-600">{check.canDeclineFree ? t('sp.not_confirmed_by_time_it_goes_to_another_pro_can_t_make_it_say_so_now_no_charge', 'Not confirmed by {time}, it goes to another pro. Can\'t make it? Say so now, no charge.').replace('{time}', clock(check.freeUntil)) : t('sp.confirm_now_to_keep_this_job', 'Confirm now to keep this job.')}</p>
      <div className="mt-2.5 flex gap-2">
        <button type="button" onClick={() => reply('yes')} disabled={isLoading} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-zappy-600 py-2.5 text-sm font-bold text-white disabled:opacity-60">
          {isLoading ? <Loader2 size={15} className="animate-spin" /> : <CalendarCheck size={15} />} {t('sp.i_ll_be_there', 'I\'ll be there')}
        </button>
        {check.canDeclineFree && <button type="button" onClick={() => reply('no')} disabled={isLoading} className="flex-1 rounded-xl bg-white py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 disabled:opacity-60">{t('sp.can_t_make_it', 'Can\'t make it')}</button>}
      </div>
    </div>
  );
}

// "This needs longer": pick how long and why; the customer is told the new finish time (server: jobs/more-time).
function MoreTime({ jobId, more, onDone }) {
  const t = useServiceProT();
  const { lang } = useI18n();
  const clock = (d) => clockIn(d, lang);
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState(0);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [ask, { isLoading }] = useAskJobMoreTimeMutation();
  if (!more?.canAsk && !more?.until) return null;
  async function send() {
    if (!minutes || !reason) return toast.error(t('sp.pick_how_long_and_why', 'Pick how long and why'));
    try {
      toast.success((await ask({ id: jobId, minutes, reason, note: note.trim() }).unwrap()).message);
      setOpen(false); setMinutes(0); setReason(''); setNote(''); onDone();
    } catch (err) { toast.error(err?.data?.error || t('sp.could_not_tell_the_customer', 'Could not tell the customer')); }
  }
  const chip = (on) => `rounded-full border px-3 py-1.5 text-[12px] font-semibold ${on ? 'border-zappy-600 bg-zappy-600 text-white' : 'border-slate-200 text-slate-600'}`;
  return (
    <div className="space-y-2">
      {more.until && <p className="text-[12px] font-semibold text-slate-600">{t('sp.customer_told_you_finish_by_about_time', 'Customer told you finish by about {time}.').replace('{time}', clock(more.until))}</p>}
      {more.canAsk && !open && (
        <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-slate-600">
          <Clock size={15} /> {t('sp.needs_longer_tell_the_customer', 'Needs longer? Tell the customer')}
        </button>
      )}
      {more.canAsk && open && (
        <div className="space-y-2.5 rounded-xl bg-slate-50 p-3">
          <div className="flex flex-wrap gap-1.5">{more.minutes.map((m) => <button key={m} type="button" onClick={() => setMinutes(m)} className={chip(minutes === m)}>{m < 60 ? `${m} ${t('sp.wpo.min', 'min')}` : t('sp.n_hr', '{n} hr').replace('{n}', m / 60)}</button>)}</div>
          <div className="flex flex-wrap gap-1.5">{more.reasons.map((r) => <button key={r.code} type="button" onClick={() => setReason(r.code)} className={chip(reason === r.code)}>{t(labelKey(r.label), r.label)}</button>)}</div>
          {reason === 'other' && <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder={t('sp.why_it_needs_longer', 'Why it needs longer')} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zappy-100" />}
          <div className="flex gap-2">
            <button type="button" onClick={send} disabled={isLoading} className="flex-1 rounded-xl bg-zappy-600 py-2.5 text-sm font-bold text-white disabled:opacity-60">{isLoading ? t('sp.sending', 'Sending…') : t('sp.tell_the_customer', 'Tell the customer')}</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-xl bg-white px-4 text-sm font-semibold ring-1 ring-slate-200">{t('sp.cancel', 'Cancel')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GiveBackCard({ jobId, status }) {
  const t = useServiceProT();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [now, setNow] = useState(Date.now());
  const { data, isFetching, refetch } = useJobGiveBackQuery({ id: jobId, reason: reason || 'other', status }, { skip: !jobId, pollingInterval: 60000 });
  const [giveBack, { isLoading: giving }] = useGiveBackJobMutation();
  const [reportAbsent, { isLoading: reporting }] = useReportCustomerAbsentMutation();

  const absent = data?.customerAbsent;
  // The door wait counts down on screen; nothing to poll.
  useEffect(() => {
    if (!absent || absent.open) return undefined;
    const tm = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(tm);
  }, [absent]);

  const safetyCard = <SafetyCheck jobId={jobId} safety={data?.safety} onDone={refetch} />;
  const more = data?.moreTime;
  const moreCard = <MoreTime jobId={jobId} more={more} onDone={refetch} />;
  const timeCard = <TimeCheck jobId={jobId} check={data?.timeCheck} onDone={refetch} />;
  if (!data || (!data.canGiveBack && !absent)) {
    return data?.safety?.asked || more?.canAsk || more?.until || data?.timeCheck?.askOpen || data?.timeCheck?.confirmedAt ? <div className="card space-y-3">{timeCard}{safetyCard}{moreCard}</div> : null;
  }
  const quote = data.quote;
  const waitLeft = minsUntil(absent?.opensAt, now);

  async function confirm() {
    if (!reason) return toast.error(t('sp.pick_a_reason_first', 'Pick a reason first'));
    if (reason === 'other' && note.trim().length < 5) return toast.error(t('sp.say_in_a_few_words_why_you_cannot_do_it', 'Say in a few words why you cannot do it'));
    try {
      const out = await giveBack({ id: jobId, reason, note: note.trim() }).unwrap();
      toast.success(out.toShop ? t('sp.sent_back_to_your_shop_owner', 'Sent back to your shop owner') : t('sp.handed_back_we_are_finding_someone_else', 'Handed back. We are finding someone else.'));
      nav('/worker/work');
    } catch (err) {
      toast.error(err?.data?.error || t('sp.could_not_hand_this_job_back', 'Could not hand this job back'));
    }
  }

  async function customerAbsent() {
    if (!window.confirm(t('sp.close_this_job_because_the_customer_is_not_here_they_are_charged_for_the_missed_visit', 'Close this job because the customer is not here? They are charged for the missed visit.'))) return;
    try {
      const out = await reportAbsent(jobId).unwrap();
      toast.success(out.message || t('sp.closed', 'Closed'));
      nav('/worker/work');
    } catch (err) {
      toast.error(err?.data?.error || t('sp.could_not_close_the_job', 'Could not close the job'));
    }
  }

  return (
    <div className="card space-y-3">
      {timeCard}
      {safetyCard}
      {moreCard}
      {absent && (
        <button type="button" onClick={customerAbsent} disabled={(!absent.open && waitLeft > 0) || reporting}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60">
          {reporting ? <Loader2 size={15} className="animate-spin" /> : <UserX size={15} />}
          {absent.open || waitLeft === 0 ? t('sp.customer_not_here_close_the_job', 'Customer not here? Close the job') : t('sp.customer_not_here_available_in_n_min_call_them_first', 'Customer not here? Available in {n} min. Call them first.').replace('{n}', waitLeft)}
        </button>
      )}

      {data.canGiveBack && !open && (
        <button type="button" onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700">
          <Undo2 size={15} /> {t('sp.can_t_do_this_job_hand_it_back', 'Can\'t do this job? Hand it back')}
        </button>
      )}

      {data.canGiveBack && open && quote && (
        <div className="space-y-2.5">
          <p className="text-sm font-bold text-[#0F172A]">{t('sp.why_can_t_you_do_it', 'Why can\'t you do it?')}</p>
          <div className="flex flex-wrap gap-2">
            {quote.reasons.map((r) => (
              <button key={r.code} type="button" onClick={() => setReason(r.code)}
                className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${reason === r.code ? 'border-zappy-600 bg-zappy-50 text-zappy-700' : 'border-slate-200 bg-white text-slate-700'}`}>
                {t(labelKey(r.label), r.label)}
              </button>
            ))}
          </div>
          {reason === 'other' && (
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300}
              placeholder={t('sp.what_happened', 'What happened?')}
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zappy-100" />
          )}
          {reason && (
            <p className={`rounded-xl p-2.5 text-[12px] leading-relaxed ${quote.penaltyPaise > 0 || quote.pauses ? 'bg-amber-50 text-amber-800' : 'bg-slate-50 text-slate-600'}`}>
              {isFetching ? t('sp.checking', 'Checking…') : quote.message}
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => { setOpen(false); setReason(''); setNote(''); }}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600">{t('sp.keep_the_job', 'Keep the job')}</button>
            <button type="button" onClick={confirm} disabled={!reason || giving || isFetching}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {giving && <Loader2 size={14} className="animate-spin" />} {t('sp.hand_it_back', 'Hand it back')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
