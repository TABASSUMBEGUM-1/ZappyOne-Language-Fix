import { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { useCreateDuesPaymentMutation, useGetPaymentAvailabilityQuery, useVerifyPaymentMutation } from '../../services/api';
import { openCheckout } from '../../services/cashfree';
import { useServiceProT } from '../../i18n/I18nProvider';

const rupees = (p) => `₹${Math.round((p || 0) / 100).toLocaleString('en-IN')}`;

// Pay what is owed to ZappyOne online, all of it; cleared the moment the gateway confirms (server worker/dues-pay). Hidden until a gateway has keys.
export default function PayDuesButton({ duesPaise, onPaid, className = '' }) {
  const t = useServiceProT();
  const { data: avail } = useGetPaymentAvailabilityQuery();
  const [create] = useCreateDuesPaymentMutation();
  const [verify] = useVerifyPaymentMutation();
  const [busy, setBusy] = useState(false);
  if (!avail?.gateway || !(duesPaise > 0)) return null;

  async function pay() {
    setBusy(true);
    try {
      const order = await create({}).unwrap();
      const done = await openCheckout({ ...order, purpose: 'ZappyOne dues' });
      await verify({ cfOrderId: done.cfOrderId, cfPaymentId: done.cfPaymentId, ...(done.razorpaySignature && { razorpaySignature: done.razorpaySignature }) }).unwrap();
      toast.success(t('sp.paid_you_can_take_new_jobs', 'Paid. You can take new jobs.'));
      onPaid?.();
    } catch (err) {
      const msg = err?.data?.error || err?.message || t('sp.payment_did_not_go_through', 'Payment did not go through');
      if (/cancel/i.test(msg)) toast(t('sp.payment_cancelled', 'Payment cancelled')); else toast.error(msg);
    } finally { setBusy(false); }
  }

  return (
    <button type="button" onClick={pay} disabled={busy} className={`btn-primary h-11 w-full ${className}`}>
      {busy && <Loader2 size={16} className="animate-spin" />} {t('sp.pay_amt_now', 'Pay {amt} now').replace('{amt}', rupees(duesPaise))}
    </button>
  );
}
