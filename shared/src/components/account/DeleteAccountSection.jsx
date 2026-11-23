import { useState } from 'react';
import { AlertTriangle, CircleAlert, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { logout } from '../../modules/auth/authSlice';
import { useDeleteAccountMutation, useDeletionCheckQuery } from '../../services/api';
import { useServiceProT } from '../../i18n/I18nProvider';
import { labelKey } from '../../i18n/translations';

// Delete this account, on every website (Google Play account deletion): what is in the way first, then why they are leaving, then typed DELETE (server: account/account-deletion).
function DeleteSheet({ onClose, onDeleted }) {
  const t = useServiceProT();
  const { data, isLoading, isError, refetch } = useDeletionCheckQuery();
  const [deleteAccount, { isLoading: deleting }] = useDeleteAccountMutation();
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [typed, setTyped] = useState('');
  const blockers = data?.blockers || [];
  const ready = data?.canDelete && reason && typed === 'DELETE';

  async function confirm() {
    try {
      await deleteAccount({ reason, note: note.trim() }).unwrap();
      toast.success(t('sp.your_account_has_been_deleted', 'Your account has been deleted'));
      onDeleted();
    } catch (err) {
      toast.error(err?.data?.error || t('sp.could_not_delete_the_account_try_again', 'Could not delete the account. Try again.'));
      refetch();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 sm:items-center sm:justify-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={t('sp.delete_account', 'Delete account')} className="max-h-[90vh] w-full space-y-4 overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-rose-600">{t('sp.delete_account', 'Delete account')}</h2>
          <button type="button" onClick={onClose} aria-label={t('sp.close', 'Close')} className="rounded-lg p-1 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>

        {isLoading && <div className="space-y-2"><div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" /><div className="h-16 animate-pulse rounded-xl bg-slate-100" /></div>}
        {isError && (
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            {t('sp.we_could_not_check_your_account_just_now', 'We could not check your account just now.')} <button type="button" onClick={refetch} className="font-semibold text-zappy-600">{t('sp.try_again', 'Try Again')}</button>
          </div>
        )}

        {data && blockers.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">{t('sp.sort_these_out_first_then_you_can_delete_your_account', 'Sort these out first, then you can delete your account:')}</p>
            {blockers.map((b) => (
              <div key={b.code} className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>{t(labelKey(b.message), b.message)}</span>
              </div>
            ))}
          </div>
        )}

        {data?.canDelete && (
          <>
            <div className="space-y-1 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
              <p className="font-medium">{t('sp.this_is_permanent', 'This is permanent.')}</p>
              <p className="text-xs">{t('sp.your_sign_in_name_contact_details_photo_saved_details_and_payout_details_are_removed_now_past_bookings_and_payments_are_kept_without_your_details_as_the_law_requires', 'Your sign-in, name, contact details, photo, saved details and payout details are removed now. Past bookings and payments are kept without your details, as the law requires.')}</p>
            </div>
            <fieldset>
              <legend className="mb-2 text-xs font-semibold text-slate-700">{t('sp.why_are_you_leaving', 'Why are you leaving?')}</legend>
              <div role="radiogroup" className="flex flex-wrap gap-2">
                {data.reasons.map((r) => (
                  <button key={r.code} type="button" role="radio" aria-checked={reason === r.code} onClick={() => setReason(r.code)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${reason === r.code ? 'border-zappy-600 bg-zappy-50 text-zappy-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    {t(labelKey(r.label), r.label)}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="block text-xs font-semibold text-slate-700">{t('sp.anything_we_should_know_optional', 'Anything we should know? (optional)')}
              <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-rose-300" />
            </label>
            <label className="block text-xs font-semibold text-slate-700">{t('sp.type_delete_to_confirm', 'Type DELETE to confirm').split('DELETE')[0]}<span className="font-mono">DELETE</span>{t('sp.type_delete_to_confirm', 'Type DELETE to confirm').split('DELETE')[1]}
              <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="DELETE" autoCapitalize="characters"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-rose-300" />
            </label>
            <button type="button" disabled={!ready || deleting} onClick={confirm}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-sm font-medium text-white disabled:opacity-40">
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />} {t('sp.permanently_delete_my_account', 'Permanently delete my account')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function DeleteAccountSection({ onDeleted }) {
  const t = useServiceProT();
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();
  // Signed out once the account is gone; the page may then take them somewhere (the customer site goes home).
  const done = () => { setOpen(false); dispatch(logout()); onDeleted?.(); };
  return (
    <div className="rounded-xl border border-rose-100 bg-white shadow-sm">
      <div className="flex items-center gap-2 px-4 pb-2 pt-4">
        <AlertTriangle className="h-4 w-4 text-rose-500" />
        <h2 className="text-sm font-semibold text-rose-600">{t('sp.delete_account', 'Delete account')}</h2>
      </div>
      <div className="px-4 pb-4">
        <p className="mb-3 text-xs text-slate-500">{t('sp.removes_your_personal_details_for_good_finish_any_open_booking_withdraw_your_money_and_clear_anything_you_owe_first_we_show_what_is_left_when_you_start', 'Removes your personal details for good. Finish any open booking, withdraw your money and clear anything you owe first; we show what is left when you start.')}</p>
        <button type="button" onClick={() => setOpen(true)}
          className="w-full rounded-xl border border-rose-200 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 active:bg-rose-100">
          {t('sp.delete_my_account', 'Delete my account')}
        </button>
      </div>
      {open && <DeleteSheet onClose={() => setOpen(false)} onDeleted={done} />}
    </div>
  );
}
