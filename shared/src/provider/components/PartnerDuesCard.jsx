import { useState } from 'react';
import ZappyPayTo from './ZappyPayTo';
import toast from 'react-hot-toast';
import { AlertTriangle, CircleCheck, Clock3, Wallet } from 'lucide-react';
import { useShopDuesQuery, useClaimShopDuesPaymentMutation } from '../../services/api';
import { formatPaise } from '../../utils/money';
import PayDuesButton from './PayDuesButton';
import DuesPaidCard, { LastPaidLine } from './DuesPaidCard';
import { duesPaidT } from '../duesText';
import { labelKey } from '../../i18n/translations';
import { useServiceProT } from '../../i18n/I18nProvider';

const STATE = { pending: ['Being checked', Clock3, 'text-amber-700'], confirmed: ['Received', CircleCheck, 'text-emerald-700'], rejected: ['Not found', AlertTriangle, 'text-red-700'] }; // labels translated where shown

// What this business owes ZappyOne from cash jobs, and telling ZappyOne once it has paid; hidden when nothing is owed (server shop/shop-dues).
export default function PartnerDuesCard() {
  const t = useServiceProT();
  const { data } = useShopDuesQuery(undefined, { pollingInterval: 300000 });
  const [claim, { isLoading }] = useClaimShopDuesPaymentMutation();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ amount: '', reference: '' });
  const paid = duesPaidT(t, data);
  if (!data || (data.duesPaise <= 0 && !data.claims?.some((c) => c.status === 'pending'))) return paid?.cleared ? <DuesPaidCard paid={paid} /> : null;
  const stopped = data.isBlocked;
  const near = !stopped && data.duesPaise >= data.warnPaise;
  async function send(e) {
    e.preventDefault();
    try {
      await claim({ amountRupees: Number(f.amount), reference: f.reference.trim(), method: 'upi' }).unwrap();
      toast.success(t('sp.sent_zappyone_will_check_it_and_update_your_balance', 'Sent. ZappyOne will check it and update your balance.'));
      setOpen(false); setF({ amount: '', reference: '' });
    } catch (err) { toast.error(err?.data?.error || t('sp.could_not_send_try_again', 'Could not send. Try again.')); }
  }
  return (
    <section className={`rounded-2xl border p-4 ${stopped ? 'border-red-200 bg-red-50/70' : near ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center gap-2">
        {stopped ? <AlertTriangle size={18} className="text-red-600" /> : <Wallet size={18} className="text-slate-600" />}
        <h2 className="text-[15px] font-bold text-slate-900">{t('sp.you_owe_zappyone_amt', 'You owe ZappyOne {amt}').replace('{amt}', formatPaise(data.duesPaise))}</h2>
      </div>
      <p className="mt-1 text-[13px] text-slate-600">
        {stopped
          ? t('sp.new_jobs_are_paused_until_it_is_under_limit', 'New jobs are paused until it is under {limit}.').replace('{limit}', formatPaise(data.limitPaise))
          : t('sp.your_zappyone_amount_from_finished_jobs_new_jobs_pause_at_limit', 'Your ZappyOne amount from finished jobs. New jobs pause at {limit}.').replace('{limit}', formatPaise(data.limitPaise))}
      </p>
      {data.payInstructions && <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-[12.5px] font-semibold text-slate-700">{data.payInstructions}</p>}
      <ZappyPayTo payTo={data.payTo} amountPaise={data.duesPaise} />
      <LastPaidLine paid={paid} />
      {(data.claims || []).slice(0, 3).map((c) => { const [label, Icon, tone] = STATE[c.status] || STATE.pending; return (
        <p key={c._id} className={`mt-2 flex items-center gap-1.5 text-[12.5px] font-semibold ${tone}`}><Icon size={14} /> {formatPaise(c.amountPaise)} · {c.reference} · {t(labelKey(label), label)}</p>
      ); })}
      {open ? (
        <form onSubmit={send} className="mt-3 grid gap-2 sm:grid-cols-[8rem_1fr_auto]">
          <input required inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/[^\d.]/g, '') })} placeholder={`${t('sp.amount', 'Amount')} ₹`} aria-label={t('sp.amount_paid_in_rupees', 'Amount paid in rupees')} className="input text-sm" />
          <input required minLength={4} maxLength={80} value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} placeholder={t('sp.upi_or_bank_reference', 'UPI or bank reference')} aria-label={t('sp.payment_reference', 'Payment reference')} className="input text-sm" />
          <button type="submit" disabled={isLoading} className="btn-primary px-4 text-sm">{t('sp.send', 'Send')}</button>
        </form>
      ) : data.duesPaise > 0 && (
        <>
          <PayDuesButton duesPaise={data.duesPaise} className="mt-3" />
          <button type="button" onClick={() => setOpen(true)} className="mt-2 text-[13px] font-bold text-zappy-600">{t('sp.paid_another_way_tell_zappyone', 'Paid another way? Tell ZappyOne')}</button>
        </>
      )}
    </section>
  );
}
