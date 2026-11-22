import toast from 'react-hot-toast';
import { Copy, Landmark, Smartphone } from 'lucide-react';
import { useServiceProT } from '../../i18n/I18nProvider';

// Where to pay ZappyOne outside the app (admin sets it in Economics → Dues): UPI with the amount filled in, or the bank account.
export default function ZappyPayTo({ payTo, amountPaise = 0 }) {
  const t = useServiceProT();
  if (!payTo) return null;
  const copy = async (text) => { try { await navigator.clipboard.writeText(text); toast.success(t('sp.copied', 'Copied')); } catch { toast.error(t('sp.long_press_to_copy', 'Long-press to copy')); } };
  const upiLink = payTo.upiId ? `upi://pay?${new URLSearchParams({ pa: payTo.upiId, pn: payTo.accountName || 'ZappyOne', ...(amountPaise > 0 && { am: (amountPaise / 100).toFixed(2) }), cu: 'INR', tn: 'ZappyOne dues' })}` : null;
  return (
    <div className="mt-3 space-y-2 rounded-xl bg-white/80 p-3 text-[13px] ring-1 ring-slate-200">
      <p className="text-[12px] font-bold uppercase tracking-wide text-slate-500">{t('sp.pay_zappyone_at', 'Pay ZappyOne at')}</p>
      {payTo.upiId && (
        <div className="flex flex-wrap items-center gap-2">
          <Smartphone size={15} className="text-zappy-600" />
          <span className="font-mono font-semibold text-slate-800">{payTo.upiId}</span>
          <button type="button" onClick={() => copy(payTo.upiId)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-zappy-700"><Copy size={12} /> {t('sp.copy', 'Copy')}</button>
          <a href={upiLink} className="ml-auto rounded-lg bg-zappy-600 px-3 py-1.5 text-[12.5px] font-semibold text-white">{t('sp.open_upi_app', 'Open UPI app')}</a>
          {payTo.upiName && <span className="basis-full text-[12px] font-semibold text-green-700">{t('sp.verified_goes_to_name', 'Verified: goes to {name}').replace('{name}', payTo.upiName)}</span>}
        </div>
      )}
      {payTo.accountNumber && (
        <div className="flex items-start gap-2">
          <Landmark size={15} className="mt-0.5 text-zappy-600" />
          <div className="min-w-0 text-slate-700">
            <p className="font-semibold">{payTo.accountName}</p>
            <p className="font-mono">{payTo.accountNumber} <button type="button" onClick={() => copy(payTo.accountNumber)} className="ml-1 text-[12px] font-semibold text-zappy-700">{t('sp.copy', 'Copy')}</button></p>
            <p>{[payTo.ifsc && `IFSC ${payTo.ifsc}`, payTo.bankName].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
      )}
      <p className="text-[11.5px] text-slate-500">{t('sp.after_paying_tap_paid_another_way_tell_zappyone_with_the_reference', 'After paying, tap "Paid another way? Tell ZappyOne" with the reference.')}</p>
    </div>
  );
}
