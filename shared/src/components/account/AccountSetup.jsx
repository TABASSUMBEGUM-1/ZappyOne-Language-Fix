import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, MailCheck, ShieldCheck, LogOut } from 'lucide-react';
import {
  useAccountMeQuery, useSetAccountNameMutation, useSetAccountPasswordMutation,
  useStartEmailVerificationMutation, useCompleteAccountSetupMutation, useSkipAccountPhotoMutation,
} from '../../services/api';
import ProfilePhoto from './ProfilePhoto';
import { ZappyWordmark } from '../common/ZappyLogo';
import PasswordField, { passwordOk } from './PasswordField';
import { useServiceProT } from '../../i18n/I18nProvider';

/**
 * First-time setup, right after the first OTP sign-in: the details we need
 * once so every later sign-in is free (password) and the account can be
 * recovered (email). Customers give a name and may skip email; providers give
 * an email because statements and resets go there.
 *
 * Everything is on one screen and saved in order: name, password, email (a
 * confirmation link is sent; the account works before it is opened), then
 * setup is marked complete. A profile photo is offered on the same screen.
 *
 * Accounts that are already set up but have never been asked for a photo
 * (including everyone who signed up before photos existed) see a short
 * photo-only version once; "Skip for now" is remembered.
 */
export default function AccountSetup({ appName = 'ZappyOne', intro, onDone, onSignOut }) {
  const t = useServiceProT();
  const { data: st, isLoading } = useAccountMeQuery();
  const [setName] = useSetAccountNameMutation();
  const [setPassword] = useSetAccountPasswordMutation();
  const [startEmail] = useStartEmailVerificationMutation();
  const [complete] = useCompleteAccountSetupMutation();
  const [skipPhoto, { isLoading: skipping }] = useSkipAccountPhotoMutation();

  const [name, setNameV] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [sentTo, setSentTo] = useState(null);

  useEffect(() => {
    if (!st) return;
    setNameV((v) => v || st.name || '');
    setEmail((v) => v || st.pendingEmail || st.email || '');
  }, [st?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading || !st) {
    return <div className="flex min-h-screen items-center justify-center bg-canvas"><Loader2 size={24} className="animate-spin text-zappy-600" /></div>;
  }

  const askName = st.needs.name;
  const askPassword = st.needs.password;
  const emailOk = !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const ready = (!askName || name.trim().length >= 2)
    && (!askPassword || (passwordOk(pw, st.phone) && pw === pw2))
    && (!st.emailRequired || (email.trim() && emailOk)) && emailOk;

  async function submit(e) {
    e.preventDefault();
    if (!ready) return;
    setSaving(true);
    try {
      if (askName) await setName({ name: name.trim() }).unwrap();
      if (askPassword) await setPassword({ newPassword: pw }).unwrap();
      const wantEmail = email.trim().toLowerCase();
      if (wantEmail && !(st.emailVerified && st.email === wantEmail) && st.pendingEmail !== wantEmail) {
        const r = await startEmail({ email: wantEmail }).unwrap();
        setSentTo(r.emailSent ? wantEmail : null);
      }
      await complete().unwrap();
      // They saw the photo offer here; it is not asked again on its own screen.
      if (st.askPhoto) await skipPhoto().unwrap().catch(() => {});
      toast.success(t('sp.all_set', 'All set'));
      onDone?.();
    } catch (err) {
      toast.error(err?.data?.error || t('sp.could_not_save_try_again', 'Could not save. Try again.'));
    } finally { setSaving(false); }
  }

  const header = (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3.5">
        <ZappyWordmark size={26} />
        {onSignOut && (
          <button type="button" onClick={onSignOut} className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-500 hover:text-ink-900">
            <LogOut size={15} /> {t('sp.sign_out', 'Sign out')}
          </button>
        )}
      </div>
    </header>
  );

  // Already set up; only the photo is new to them.
  if (!st.needsSetup) {
    const provider = st.role !== 'user';
    return (
      <div className="flex min-h-screen flex-col bg-canvas">
        {header}
        <main className="mx-auto w-full max-w-md flex-1 px-5 py-8 text-center">
          <h1 className="text-[24px] font-bold leading-tight text-ink-900">{st.role === 'shop' ? t('sp.add_a_photo_of_your_shop', 'Add a photo of your shop') : t('sp.add_your_photo', 'Add your photo')}</h1>
          <p className="mx-auto mt-2 max-w-sm text-[15px] text-ink-500">
            {provider
              ? t('sp.customers_book_more_readily_when_they_can_see_who_is_coming_your_photo_shows_on_your_profile_and_on_their_booking', 'Customers book more readily when they can see who is coming. Your photo shows on your profile and on their booking.')
              : t('sp.it_helps_your_technician_recognise_you_and_makes_app_feel_like_yours', 'It helps your technician recognise you, and makes {app} feel like yours.').replace('{app}', appName)}
          </p>
          <div className="mt-8 rounded-card border border-line bg-white p-6">
            <ProfilePhoto url={st.photoUrl} role={st.role} size={112} label={st.role === 'shop' ? 'Shop photo' : 'Your photo'} onSaved={() => onDone?.()} />
          </div>
          <button type="button" onClick={() => skipPhoto().unwrap().then(() => onDone?.()).catch(() => {})} disabled={skipping}
            className="mt-4 w-full text-[14px] font-semibold text-ink-500 hover:text-ink-900">
            {skipping ? <Loader2 size={15} className="mx-auto animate-spin" /> : t('sp.skip_for_now', 'Skip for now')}
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {header}

      <main className="mx-auto w-full max-w-md flex-1 px-5 py-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-btn bg-zappy-50 text-zappy-600"><ShieldCheck size={21} /></span>
        {/* Already set up and only the email is missing: say just that. */}
        <h1 className="mt-3 text-[24px] font-bold leading-tight text-ink-900">{!askName && !askPassword ? t('sp.add_your_email', 'Add your email') : t('sp.finish_setting_up_your_account', 'Finish setting up your account')}</h1>
        <p className="mt-1 text-[15px] text-ink-500">
          {!askName && !askPassword
            ? t('sp.so_booking_confirmations_receipts_and_updates_reach_you_it_takes_a_moment', 'So booking confirmations, receipts and updates reach you. It takes a moment.')
            : intro || t('sp.set_a_password_so_you_can_sign_in_to_app_without_waiting_for_an_otp_next_time', 'Set a password so you can sign in to {app} without waiting for an OTP next time.').replace('{app}', appName)}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-5 rounded-card border border-line bg-white p-5">
          <ProfilePhoto url={st.photoUrl} role={st.role} label={st.role === 'shop' ? 'Shop photo' : 'Your photo'} />

          {askName && (
            <div>
              <label htmlFor="setup-name" className="mb-1.5 block text-[13px] font-semibold text-ink-700">{t('sp.your_name', 'Your name')}</label>
              <input id="setup-name" className="input w-full" autoComplete="name" value={name} onChange={(e) => setNameV(e.target.value)} placeholder={t('sp.e_g_ravi_kumar', 'e.g. Ravi Kumar')} maxLength={60} />
            </div>
          )}

          <div>
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-700">{t('sp.mobile_number', 'Mobile number')}</span>
            <div className="flex min-h-[44px] items-center rounded-btn border border-line bg-sunken px-3.5 text-[15px] font-semibold tabular-nums text-ink-700">{st.phone}</div>
          </div>

          {askPassword && (
            <>
              <PasswordField id="setup-pw" label={t('sp.create_a_password', 'Create a password')} value={pw} onChange={setPw} showRules phone={st.phone} />
              <PasswordField id="setup-pw2" label={t('sp.type_it_again', 'Type it again')} value={pw2} onChange={setPw2} />
              {pw2 && pw !== pw2 && <p className="-mt-3 text-[12px] font-semibold text-red-700">{t('sp.the_two_passwords_do_not_match', 'The two passwords do not match')}</p>}
            </>
          )}

          {/* Everyone gives an email: receipts and booking updates go there. */}
          <div>
            <label htmlFor="setup-email" className="mb-1.5 block text-[13px] font-semibold text-ink-700">
              {t('sp.email', 'Email')} {st.emailRequired ? <span className="text-red-600">*</span> : <span className="font-normal text-ink-400">({t('sp.optional', 'optional')})</span>}
            </label>
            <input id="setup-email" type="email" inputMode="email" autoComplete="email" className="input w-full" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            <p className="mt-1 text-[12px] text-ink-500">
              {st.role === 'user' ? t('sp.booking_confirmations_receipts_and_updates_come_here_we_send_a_link_to_confirm_it', 'Booking confirmations, receipts and updates come here. We send a link to confirm it.') : t('sp.for_statements_receipts_and_resetting_your_password_we_send_a_link_to_confirm_it', 'For statements, receipts and resetting your password. We send a link to confirm it.')}
            </p>
            {!emailOk && <p className="mt-1 text-[12px] font-semibold text-red-700">{t('sp.that_email_does_not_look_right', 'That email does not look right')}</p>}
          </div>

          <button type="submit" disabled={!ready || saving} className="btn-primary w-full">
            {saving && <Loader2 size={16} className="animate-spin" />} {t('sp.continue', 'Continue')}
          </button>
          {sentTo && <p className="flex items-center gap-1.5 text-[13px] text-green-700"><MailCheck size={15} /> {t('sp.link_sent_to_x', 'Link sent to {x}').replace('{x}', sentTo)}</p>}
        </form>
      </main>
    </div>
  );
}
