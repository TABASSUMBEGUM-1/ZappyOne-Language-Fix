import { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, ArrowLeft, MailCheck } from 'lucide-react';
import { usePasswordLoginMutation, useForgotPasswordMutation, useResetPasswordMutation, useAccountCapabilitiesQuery } from '../../services/api';
import PasswordField, { passwordOk } from './PasswordField';
import { useServiceProT } from '../../i18n/I18nProvider';
import { labelKey } from '../../i18n/translations';

/**
 * Sign in with phone or verified email + password, and recover a forgotten
 * password: a free email link when the email is verified, otherwise an SMS
 * code entered right here with the new password.
 *
 *   role       'user' | 'worker' | 'shop' | 'event_partner'
 *   onSuccess  receives the login response ({ accessToken, user|worker|shop|partner })
 *   onUseOtp   switches the page back to OTP sign-in
 *   idLabel    what the sign-in field takes, when it is more than phone/email (a Worker ID)
 */
export default function PasswordLogin({ role, onSuccess, onUseOtp, idLabel }) {
  const t = useServiceProT();
  const [mode, setMode] = useState('login'); // login | forgot | otp-reset | sent
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPw, setNewPw] = useState('');
  const [sentTo, setSentTo] = useState(null);
  const [login, { isLoading: signingIn }] = usePasswordLoginMutation();
  const [forgot, { isLoading: asking }] = useForgotPasswordMutation();
  const [reset, { isLoading: resetting }] = useResetPasswordMutation();
  // Email sign-in and reset links are offered only once outgoing mail is set up.
  const { data: caps } = useAccountCapabilitiesQuery();
  const email = !!caps?.email;

  async function doLogin(e) {
    e.preventDefault();
    try {
      const r = await login({ role, identifier: identifier.trim(), password }).unwrap();
      onSuccess(r);
    } catch (err) { toast.error(err?.data?.error || t('sp.that_did_not_go_through_check_your_details_and_try_again', 'That did not go through. Check your details and try again.')); }
  }

  async function doForgot(e) {
    e.preventDefault();
    try {
      const r = await forgot({ role, identifier: identifier.trim() }).unwrap();
      setSentTo(r.to);
      setMode(r.channel === 'sms' ? 'otp-reset' : 'sent');
    } catch (err) { toast.error(err?.data?.error || t('sp.that_did_not_go_through_check_the_number_and_try_again', 'That did not go through. Check the number and try again.')); }
  }

  async function doOtpReset(e) {
    e.preventDefault();
    try {
      await reset({ role, identifier: identifier.trim(), otp, newPassword: newPw }).unwrap();
      toast.success(t('sp.password_changed_sign_in_with_it_now', 'Password changed. Sign in with it now.'));
      setPassword(''); setOtp(''); setNewPw('');
      setMode('login');
    } catch (err) { toast.error(err?.data?.error || t('sp.that_did_not_go_through_check_the_code_and_try_again', 'That did not go through. Check the code and try again.')); }
  }

  const idField = (
    <div>
      <label htmlFor="pl-id" className="mb-1.5 block text-[13px] font-semibold text-ink-700">{idLabel ? t(labelKey(idLabel), idLabel) : (email ? t('sp.mobile_number_or_email', 'Mobile number or email') : t('sp.mobile_number', 'Mobile number'))}</label>
      <input id="pl-id" className="input w-full" autoComplete="username" inputMode={email || idLabel ? 'text' : 'tel'} value={identifier} onChange={(e) => setIdentifier(e.target.value)}
        placeholder={email ? '98765 43210 or you@example.com' : '98765 43210'} />
    </div>
  );

  if (mode === 'sent') {
    return (
      <div className="space-y-4">
        <p className="flex items-start gap-2 rounded-btn bg-green-50 p-3 text-[14px] text-green-800">
          <MailCheck size={18} className="mt-0.5 shrink-0" />
          {sentTo ? t('sp.if_an_account_matches_a_reset_link_is_on_its_way_to_x_it_works_for_30_minutes', 'If an account matches, a reset link is on its way to {x}. It works for 30 minutes.').replace('{x}', sentTo) : t('sp.if_an_account_matches_a_reset_link_is_on_its_way_to_its_email_it_works_for_30_minutes', 'If an account matches, a reset link is on its way to its email. It works for 30 minutes.')}
        </p>
        <button type="button" onClick={() => setMode('login')} className="btn-outline w-full"><ArrowLeft size={16} /> {t('sp.back_to_sign_in', 'Back to sign in')}</button>
      </div>
    );
  }

  if (mode === 'otp-reset') {
    return (
      <form onSubmit={doOtpReset} className="space-y-4">
        <p className="text-[14px] text-ink-500">{t('sp.we_sent_a_code_to_x_enter_it_and_choose_a_new_password', 'We sent a code to {x}. Enter it and choose a new password.').replace('{x}', sentTo)}</p>
        <div>
          <label htmlFor="pl-otp" className="mb-1.5 block text-[13px] font-semibold text-ink-700">{t('sp.code', 'Code')}</label>
          <input id="pl-otp" className="input w-full tracking-[0.3em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
        </div>
        <PasswordField id="pl-new" label={t('sp.new_password', 'New password')} value={newPw} onChange={setNewPw} showRules />
        <button type="submit" disabled={resetting || otp.length < 4 || !passwordOk(newPw)} className="btn-primary w-full">
          {resetting && <Loader2 size={16} className="animate-spin" />} {t('sp.change_password', 'Change password')}
        </button>
        <button type="button" onClick={() => setMode('login')} className="w-full text-[13px] font-semibold text-ink-500">{t('sp.back_to_sign_in', 'Back to sign in')}</button>
      </form>
    );
  }

  if (mode === 'forgot') {
    return (
      <form onSubmit={doForgot} className="space-y-4">
        <p className="text-[14px] text-ink-500">
          {email ? t('sp.we_send_a_reset_link_to_your_confirmed_email_or_a_code_to_your_phone_if_you_have_not_confirmed_an_email', 'We send a reset link to your confirmed email, or a code to your phone if you have not confirmed an email.') : t('sp.we_send_a_code_to_your_phone_enter_it_with_your_new_password', 'We send a code to your phone. Enter it with your new password.')}
        </p>
        {idField}
        <button type="submit" disabled={asking || identifier.trim().length < 5} className="btn-primary w-full">
          {asking && <Loader2 size={16} className="animate-spin" />} {t('sp.send_reset', 'Send reset')}
        </button>
        <button type="button" onClick={() => setMode('login')} className="w-full text-[13px] font-semibold text-ink-500">{t('sp.back_to_sign_in', 'Back to sign in')}</button>
      </form>
    );
  }

  return (
    <form onSubmit={doLogin} className="space-y-4">
      {idField}
      <PasswordField id="pl-pw" label={t('sp.password', 'Password')} value={password} onChange={setPassword} autoComplete="current-password" />
      <div className="flex justify-end">
        <button type="button" onClick={() => setMode('forgot')} className="text-[13px] font-semibold text-zappy-600">{t('sp.forgot_password', 'Forgot password?')}</button>
      </div>
      <button type="submit" disabled={signingIn || !identifier.trim() || !password} className="btn-primary w-full">
        {signingIn && <Loader2 size={16} className="animate-spin" />} {t('sp.sign_in', 'Sign in')}
      </button>
      {onUseOtp && <button type="button" onClick={onUseOtp} className="w-full text-[13px] font-semibold text-ink-500">{t('sp.sign_in_with_an_otp_instead', 'Sign in with an OTP instead')}</button>}
    </form>
  );
}
