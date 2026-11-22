import { useState } from 'react';
import ZappyPayTo from './components/ZappyPayTo';
import toast from 'react-hot-toast';
import { AlertTriangle, ChevronDown, Loader2, Wallet } from 'lucide-react';
import { useWorkerDuesQuery, useClaimDuesPaymentMutation } from '../services/api';
import { duesView } from './workerHome';
import { duesTextT, duesPaidT, duesClaimErrorT } from './duesText';
import { useServiceProT } from '../i18n/I18nProvider';
import { labelKey } from '../i18n/translations';
import DuesPaidCard, { LastPaidLine } from './components/DuesPaidCard';
import PayDuesButton from './components/PayDuesButton';

const rupees = (p) => `₹${Math.round((p || 0) / 100).toLocaleString('en-IN')}`;

const TONE = {
  in_debt: 'bg-white ring-slate-200',
  warning: 'bg-amber-50 ring-amber-200',
  blocked: 'bg-red-50 ring-red-200',
};

/**
 * What the worker owes ZappyOne from cash jobs (worker-dues), on the screens
 * they see every day. Hidden when they owe nothing. Shows how close they are
 * to the limit, what makes up the amount, how to pay, and lets them tell us
 * they paid so admin can confirm it.
 */
export default function DuesCard({ compact = false }) {
  const t = useServiceProT();
  const { data, isLoading } = useWorkerDuesQuery(undefined, { pollingInterval: 120000 });
  const [claim, { isLoading: sending }] = useClaimDuesPaymentMutation();
  const [open, setOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('upi');
  const [reference, setReference] = useState('');

  const d = data?.dues;
  const view = duesView(d);
  const paid = duesPaidT(t, d);
  if (isLoading) return null;
  if (!view) return paid?.cleared && !compact ? <DuesPaidCard paid={paid} /> : null;
  const waiting = (d?.claims || []).filter((c) => c.status === 'pending');
  const { used } = view;
  const { title, body } = duesTextT(t, d);

  async function submit() {
    const problem = duesClaimErrorT(t, { amount, method, reference });
    if (problem) return toast.error(problem);
    const paise = Math.round(Number(amount) * 100);
    try {
      await claim({ amountPaise: paise, method, reference: reference.trim() }).unwrap();
      toast.success(t('sp.thanks_we_will_confirm_it_once_we_see_the_payment', 'Thanks. We will confirm it once we see the payment.'));
      setPaying(false); setAmount(''); setReference('');
    } catch (err) {
      toast.error(err?.data?.error || t('sp.could_not_send_that_try_again', 'Could not send that. Try again.'));
    }
  }

  return (
    <div className={`rounded-2xl p-4 ring-1 ${TONE[d.status] || TONE.in_debt}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${d.status === 'blocked' ? 'bg-red-100 text-red-600' : d.status === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
          {d.status === 'in_debt' ? <Wallet size={18} /> : <AlertTriangle size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#0F172A]">{title}</p>
          {d.duesPaise > 0 && <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-600">{body}</p>}
          {d.duesPaise > 0 && (
            <div className="mt-2.5">
              <div className="h-2 rounded-full bg-slate-200/70">
                <div className={`h-2 rounded-full ${d.status === 'blocked' ? 'bg-red-500' : d.status === 'warning' ? 'bg-amber-500' : 'bg-slate-500'}`} style={{ width: `${Math.max(4, used)}%` }} />
              </div>
              <p className="mt-1 flex justify-between text-[11px] tabular-nums text-slate-500">
                <span>{t('sp.amt_owed', '{amt} owed').replace('{amt}', rupees(d.duesPaise))}</span><span>{t('sp.limit_amt', 'limit {amt}').replace('{amt}', rupees(d.limitPaise))}</span>
              </p>
            </div>
          )}
          <LastPaidLine paid={paid} />
          {waiting.length > 0 && (
            <p className="mt-2 text-[12px] text-slate-600">
              {t('sp.waiting_to_confirm_list', 'Waiting to confirm: {list}').replace('{list}', waiting.map((c) => rupees(c.amountPaise)).join(', '))}
            </p>
          )}
        </div>
      </div>

      {!compact && d.duesPaise > 0 && (
        <>
          {d.payInstructions && (
            <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-[12.5px] text-slate-700 ring-1 ring-slate-100">
              <b>{t('sp.how_to_pay', 'How to pay:')}</b> {d.payInstructions}
            </p>
          )}
          <ZappyPayTo payTo={d.payTo} amountPaise={d.duesPaise} />

          {paying ? (
            <div className="mt-3 space-y-2 rounded-xl bg-white p-3 ring-1 ring-slate-100">
              <p className="text-[12.5px] font-semibold text-slate-700">{t('sp.tell_us_what_you_paid', 'Tell us what you paid')}</p>
              <div className="flex gap-2">
                {[['upi', t('sp.upi', 'UPI')], ['bank', t('sp.bank', 'Bank')], ['cash', t('sp.cash_at_office', 'Cash at office')]].map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setMethod(v)}
                    className={`flex-1 rounded-lg border px-2 py-2 text-[12px] font-semibold ${method === v ? 'border-zappy-600 bg-zappy-50 text-zappy-700' : 'border-slate-200 text-slate-600'}`}>{l}</button>
                ))}
              </div>
              <label className="flex items-center rounded-lg border border-slate-200 focus-within:ring-2 focus-within:ring-zappy-100">
                <span className="pl-3 text-sm text-slate-400">₹</span>
                <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                  placeholder={t('sp.amount', 'Amount')} className="w-full bg-transparent px-2 py-2 text-sm tabular-nums outline-none" />
              </label>
              {method !== 'cash' && (
                <input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={80}
                  placeholder={t('sp.upi_bank_reference_number', 'UPI / bank reference number')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zappy-100" />
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => setPaying(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-600">{t('sp.back', 'Back')}</button>
                <button type="button" onClick={submit} disabled={sending}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-zappy-600 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {sending && <Loader2 size={14} className="animate-spin" />} {t('sp.send', 'Send')}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <PayDuesButton duesPaise={d.duesPaise} />
              <button type="button" onClick={() => setPaying(true)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700">{t('sp.paid_another_way', 'Paid another way')}</button>
              <button type="button" onClick={() => setOpen((o) => !o)}
                className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700">
                {t('sp.what_is_this', 'What is this')} <ChevronDown size={14} className={open ? 'rotate-180' : ''} />
              </button>
            </div>
          )}

          {open && (
            <ul className="mt-3 divide-y divide-slate-100 rounded-xl bg-white text-[12.5px] ring-1 ring-slate-100">
              {(d.recent || []).map((tx) => (
                <li key={tx._id} className="flex justify-between gap-3 px-3 py-2">
                  <span className="min-w-0 truncate text-slate-600">{tx.description || (() => { const r = tx.reason.replace(/_/g, ' '); return t(labelKey(r), r); })()}</span>
                  <span className={`shrink-0 tabular-nums font-semibold ${tx.amountPaise < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {tx.amountPaise < 0 ? '−' : '+'}{rupees(Math.abs(tx.amountPaise))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
