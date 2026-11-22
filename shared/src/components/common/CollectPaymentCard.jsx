import { useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Loader2, Heart, Phone } from 'lucide-react';
import { formatPaise } from '../../utils/money';
import { useReportCashRefusedMutation, useHelpLineQuery, useJobPayQrQuery } from '../../services/api';
import { helpPhoneFor, upiLink } from '../../customer/upiPay';
import { payQrDrawer } from './payQrSlot';
import { useI18n, useServiceProT } from '../../i18n/I18nProvider';

const fill = (s, o) => Object.keys(o).reduce((a, k) => a.split(`{${k}}`).join(o[k]), s);

// "Customer did not pay", with a confirm step; the same control on every kind of job (server: jobs/give-back reportCashRefused).
export function CashRefusedControl({ jobId }) {
  const t = useServiceProT();
  const [asking, setAsking] = useState(false);
  const [report, { isLoading }] = useReportCashRefusedMutation();
  async function send() {
    try { toast.success((await report({ id: jobId }).unwrap()).message); setAsking(false); }
    catch (err) { toast.error(err?.data?.error || t('sp.could_not_send_the_report', 'Could not send the report')); }
  }
  if (!asking) {
    return <button type="button" onClick={() => setAsking(true)} className="mt-2 w-full text-center text-[12.5px] font-semibold text-slate-500 hover:text-red-600">{t('sp.customer_did_not_pay', 'Customer did not pay')}</button>;
  }
  return (
    <div className="mt-2 rounded-xl bg-red-50 p-2.5 text-[12.5px] text-red-800">
      <p className="font-semibold">{t('sp.report_that_the_customer_did_not_pay_they_are_told_their_next_booking_waits_until_it_is_paid_and_zappyone_follows_up', 'Report that the customer did not pay? They are told, their next booking waits until it is paid, and ZappyOne follows up.')}</p>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={send} disabled={isLoading} className="rounded-lg bg-red-600 px-3 py-1.5 font-bold text-white disabled:opacity-60">{t('sp.yes_report', 'Yes, report')}</button>
        <button type="button" onClick={() => setAsking(false)} className="rounded-lg bg-white px-3 py-1.5 font-semibold ring-1 ring-red-200">{t('sp.cancel', 'Cancel')}</button>
      </div>
    </div>
  );
}

// The pro's own UPI QR with the amount filled in: the customer scans it with any UPI app.
function ScanToPay({ jobId }) {
  const t = useServiceProT();
  const { data, isLoading } = useJobPayQrQuery(jobId, { skip: !jobId });
  const pay = data?.pay;
  if (isLoading || !pay) return null;
  if (!pay.upiId) return <p className="mt-2.5 rounded-xl bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">{t('sp.add_your_upi_id_under_bank_upi_so_customers_can_scan_and_pay_you', 'Add your UPI ID under Bank & UPI so customers can scan and pay you.')}</p>;
  const Qr = payQrDrawer();
  const link = upiLink({ upiId: pay.upiId, name: pay.name, amountPaise: pay.amountPaise, reference: pay.reference });
  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-line p-3">
      {Qr && <Qr value={link} size={128} label={fill(t('sp.upi_qr_to_pay_amt_to_name', 'UPI QR to pay {amt} to {name}'), { amt: formatPaise(pay.amountPaise), name: pay.name })} />}
      <p className="min-w-0 text-[13px] text-ink-700">{Qr ? t('sp.show_this_to_the_customer_they_scan_it_with_any_upi_app_the_amount_is_filled_in', 'Show this to the customer. They scan it with any UPI app; the amount is filled in.') : t('sp.the_customer_pays_to_your_upi_id', 'The customer pays to your UPI ID:')} <span className="block truncate font-semibold text-ink-900">{pay.upiId}</span></p>
    </div>
  );
}

/**
 * The money step at the end of every job: the customer pays the pro directly
 * (UPI to the pro's own ID, or cash), the customer may tap "I've paid" (claim),
 * and the pro taps Received once the money is really in hand.
 */
export default function CollectPaymentCard({ amountPaise, paymentMethod, paid, collecting, onCollect, tipPaise = 0, carriedPaise = 0, jobId = null, claim = null }) {
  const t = useServiceProT();
  const { lang: current } = useI18n();
  const lang = import.meta.env.VITE_CLIENT_SURFACE === 'servicepro' ? current : 'en';
  const timeOf = (d) => new Date(d).toLocaleTimeString(`${lang}-IN`, { hour: 'numeric', minute: '2-digit' });
  const { data: line } = useHelpLineQuery(undefined, { skip: !claim?.at || paid });
  if (!amountPaise || amountPaise <= 0) return null;
  const amount = formatPaise(amountPaise);
  const helpPhone = helpPhoneFor(claim, line?.help);
  const tipLine = tipPaise > 0 && (
    <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-rose-50 px-2.5 py-1.5 text-[12.5px] font-semibold text-rose-700">
      <Heart size={13} className="fill-rose-500 text-rose-500" /> {fill(t('sp.includes_a_tip_tip_from_the_customer_all_yours', 'Includes a {tip} tip from the customer. All yours.'), { tip: formatPaise(tipPaise) })}
    </p>
  );

  if (paid) {
    const done = paymentMethod === 'online' ? t('sp.amt_paid_online', '{amt} paid online') : claim?.method === 'upi' ? t('sp.amt_received_by_upi', '{amt} received by UPI') : t('sp.amt_received', '{amt} received');
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
        <p className="flex items-center gap-1.5 text-[15px] font-bold text-green-800"><Check size={16} /> {fill(done, { amt: amount })}</p>
        {tipLine}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-[17px] font-extrabold text-ink-900">{fill(t('sp.collect_amt', 'Collect {amt}'), { amt: amount })}</p>
      <p className="mt-0.5 text-[13px] leading-relaxed text-ink-500">
        {t('sp.the_customer_pays_you_by_upi_or_cash_tap_received_once_the_money_is_with_you', 'The customer pays you by UPI or cash. Tap Received once the money is with you.')}
        {carriedPaise > 0 && ` ${fill(t('sp.it_includes_amt_they_owed_from_an_earlier_cancelled_booking', 'It includes {amt} they owed from an earlier cancelled booking.'), { amt: formatPaise(carriedPaise) })}`}
      </p>
      {claim?.method && (
        <p className="mt-2.5 rounded-xl bg-zappy-50 px-3 py-2 text-[13px] font-semibold text-zappy-800">
          {claim.method === 'upi'
            ? (claim.utr
              ? fill(t('sp.the_customer_says_they_paid_amt_by_upi_at_time_ref_utr_find_it_in_your_upi_app_then_tap_received', 'The customer says they paid {amt} by UPI at {time}, ref {utr}. Find it in your UPI app, then tap Received.'), { amt: amount, time: timeOf(claim.at), utr: claim.utr })
              : fill(t('sp.the_customer_says_they_paid_amt_by_upi_at_time_find_it_in_your_upi_app_then_tap_received', 'The customer says they paid {amt} by UPI at {time}. Find it in your UPI app, then tap Received.'), { amt: amount, time: timeOf(claim.at) }))
            : fill(t('sp.the_customer_is_paying_amt_in_cash', 'The customer is paying {amt} in cash.'), { amt: amount })}
        </p>
      )}
      {tipLine}
      {jobId && <ScanToPay jobId={jobId} />}
      <button type="button" onClick={onCollect} disabled={collecting} className="btn-primary mt-3 h-12 w-full">
        {collecting ? <><Loader2 size={15} className="animate-spin" /> {t('sp.recording', 'Recording')}</> : fill(t('sp.received_amt', 'Received {amt}'), { amt: amount })}
      </button>
      {jobId && <CashRefusedControl jobId={jobId} />}
      {helpPhone && (
        <a href={`tel:${helpPhone.replace(/\s+/g, '')}`} className="mt-2 flex items-center justify-center gap-1.5 text-[13px] font-semibold text-zappy-700">
          <Phone size={14} /> {t('sp.need_help_call_zappyone', 'Need help? Call ZappyOne')} <span className="tabular-nums">{helpPhone}</span>
        </a>
      )}
    </div>
  );
}
