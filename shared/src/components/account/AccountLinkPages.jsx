import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useConfirmEmailMutation, useResetPasswordMutation } from '../../services/api';
import { ZappyWordmark } from '../common/ZappyLogo';
import PasswordField, { passwordOk } from './PasswordField';
import { useServiceProT } from '../../i18n/I18nProvider';

/**
 * The two pages links in our emails open. They work signed in or out and in
 * whichever app sent them (the link carries the account type).
 */
function Frame({ children }) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-canvas px-4 py-10">
      <ZappyWordmark size={30} />
      <div className="mt-6 w-full max-w-md rounded-card border border-line bg-white p-6">{children}</div>
    </div>
  );
}

export function VerifyEmailPage({ homePath = '/' }) {
  const t = useServiceProT();
  const [params] = useSearchParams();
  const [confirm] = useConfirmEmailMutation();
  const [state, setState] = useState({ status: 'working' });
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    const token = params.get('token');
    const role = params.get('r');
    if (!token || !role) { setState({ status: 'error', message: t('sp.this_link_is_incomplete', 'This link is incomplete.') }); return; }
    confirm({ token, role }).unwrap()
      .then((r) => setState({ status: 'ok', email: r.email }))
      .catch((e) => setState({ status: 'error', message: e?.data?.error || t('sp.this_link_did_not_work', 'This link did not work.') }));
  }, [params, confirm, t]);

  return (
    <Frame>
      {state.status === 'working' && <p className="flex items-center gap-2 text-[15px] text-ink-700"><Loader2 size={18} className="animate-spin" /> {t('sp.confirming_your_email', 'Confirming your email…')}</p>}
      {state.status === 'ok' && (
        <>
          <CheckCircle2 size={32} className="text-green-600" />
          <h1 className="mt-3 text-[21px] font-bold text-ink-900">{t('sp.email_confirmed', 'Email confirmed')}</h1>
          <p className="mt-1 text-[15px] text-ink-500">{t('sp.x_is_now_on_your_account_you_can_use_it_to_sign_in_and_to_reset_your_password', '{x} is now on your account. You can use it to sign in and to reset your password.').replace('{x}', state.email)}</p>
          <Link to={homePath} className="btn-primary mt-5 w-full">{t('sp.continue', 'Continue')}</Link>
        </>
      )}
      {state.status === 'error' && (
        <>
          <XCircle size={32} className="text-red-600" />
          <h1 className="mt-3 text-[21px] font-bold text-ink-900">{t('sp.link_not_valid', 'Link not valid')}</h1>
          <p className="mt-1 text-[15px] text-ink-500">{state.message} {t('sp.open_your_account_settings_to_send_a_new_one', 'Open your account settings to send a new one.')}</p>
          <Link to={homePath} className="btn-outline mt-5 w-full">{t('sp.go_to_the_app', 'Go to the app')}</Link>
        </>
      )}
    </Frame>
  );
}

export function ResetPasswordPage({ loginPath = '/login' }) {
  const t = useServiceProT();
  const [params] = useSearchParams();
  const [reset, { isLoading }] = useResetPasswordMutation();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const token = params.get('token');
  const role = params.get('r');

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await reset({ role, token, newPassword: pw }).unwrap();
      setDone(true);
    } catch (err) { setError(err?.data?.error || t('sp.could_not_change_the_password', 'Could not change the password')); }
  }

  if (!token || !role) {
    return <Frame><p className="text-[15px] text-ink-700">{t('sp.this_link_is_incomplete_ask_for_a_new_reset_from_the_sign_in_page', 'This link is incomplete. Ask for a new reset from the sign-in page.')}</p></Frame>;
  }

  return (
    <Frame>
      {done ? (
        <>
          <CheckCircle2 size={32} className="text-green-600" />
          <h1 className="mt-3 text-[21px] font-bold text-ink-900">{t('sp.password_changed', 'Password changed')}</h1>
          <p className="mt-1 text-[15px] text-ink-500">{t('sp.for_your_safety_we_signed_you_out_everywhere_sign_in_with_your_new_password', 'For your safety we signed you out everywhere. Sign in with your new password.')}</p>
          <Link to={loginPath} className="btn-primary mt-5 w-full">{t('sp.sign_in', 'Sign in')}</Link>
        </>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <h1 className="text-[21px] font-bold text-ink-900">{t('sp.choose_a_new_password', 'Choose a new password')}</h1>
          <PasswordField id="rp-1" label={t('sp.new_password', 'New password')} value={pw} onChange={setPw} showRules />
          <PasswordField id="rp-2" label={t('sp.type_it_again', 'Type it again')} value={pw2} onChange={setPw2} />
          {pw2 && pw !== pw2 && <p className="-mt-2 text-[12px] font-semibold text-red-700">{t('sp.the_two_passwords_do_not_match', 'The two passwords do not match')}</p>}
          {error && <p className="rounded-btn bg-red-50 p-3 text-[13px] text-red-700">{error}</p>}
          <button type="submit" disabled={isLoading || !passwordOk(pw) || pw !== pw2} className="btn-primary w-full">
            {isLoading && <Loader2 size={16} className="animate-spin" />} {t('sp.change_password', 'Change password')}
          </button>
        </form>
      )}
    </Frame>
  );
}
