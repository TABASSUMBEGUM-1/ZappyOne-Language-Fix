import { useRef, useState } from 'react';
import { KeyRound, Loader2, X } from 'lucide-react';

import { useServiceProT } from '../../i18n/I18nProvider';

/**
 * The provider's half of the start code (server: jobs/start-code.js).
 *
 *   const gate = useStartCodeGate();
 *   gate.run((code) => advance({ id, status, code }).unwrap());
 *   ...
 *   {gate.prompt}
 *
 * `run` tries the move as-is; if the server says the customer's code is
 * needed (or the one typed was wrong), it asks for it and tries again with it.
 * Any other error is thrown to the caller as before.
 */
export function useStartCodeGate() {
  const t = useServiceProT();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const pending = useRef(null);

  async function run(attempt) {
    try {
      return await attempt(undefined);
    } catch (err) {
      const c = err?.data?.code;
      if (c !== 'START_CODE_REQUIRED' && c !== 'START_CODE_INVALID') throw err;
      pending.current = attempt;
      setError('');
      setCode('');
      setOpen(true);
      return null;
    }
  }

  async function submit(e) {
    e?.preventDefault();
    if (!/^[0-9]{4,6}$/.test(code)) { setError(t('sp.enter_the_code_the_customer_reads_out', 'Enter the code the customer reads out')); return; }
    setBusy(true);
    try {
      await pending.current(code);
      setOpen(false);
    } catch (err) {
      setError(err?.data?.error || t('sp.that_did_not_work_try_again', 'That did not work. Try again.'));
    } finally {
      setBusy(false);
    }
  }

  const prompt = open ? (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 sm:items-center" role="dialog" aria-label={t('sp.customer_s_start_code', 'Customer\'s start code')}>
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-card bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[16px] font-bold text-navy"><KeyRound size={17} className="text-zappy-600" /> {t('sp.ask_for_the_code', 'Ask for the code')}</p>
            <p className="mt-1 text-[13px] text-slate-600">{t('sp.the_customer_sees_a_code_in_their_app_type_what_they_read_out_to_you', 'The customer sees a code in their app. Type what they read out to you.')}</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label={t('sp.close', 'Close')} className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          aria-label={t('sp.start_code', 'Start code')}
          className="w-full rounded-2xl border-2 border-slate-200 py-3 text-center text-3xl font-bold tracking-[0.5em] text-navy outline-none focus:border-zappy-500"
        />
        {error && <p className="text-[13px] font-medium text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-zappy-600 py-3 font-semibold text-white disabled:opacity-50">
          {busy ? <Loader2 size={16} className="animate-spin" /> : t('sp.confirm', 'Confirm')}
        </button>
      </form>
    </div>
  ) : null;

  return { run, prompt };
}
