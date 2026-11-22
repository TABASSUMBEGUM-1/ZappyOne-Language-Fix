/**
 * The one-time gate a worker passes before reaching their dashboard.
 *
 * It asks for two things only: who they are, and who to call if something
 * happens on a job. It used to ask a third — "what services do you offer?" —
 * with the whole catalog as tick-boxes. That was self-certification: ticking a
 * box made you dispatchable, with nothing verified behind it.
 *
 * What a worker may do is now decided by enrolling in a service and passing ITS
 * verification (see /provider/onboarding), so this screen hands them straight
 * there instead of collecting a claim we cannot stand behind.
 */
import { useScrollTopOnChange } from '../../components/common/ScrollToTop';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Phone, Heart, ChevronRight, CheckCircle2, Loader2, ArrowLeft, ShieldCheck,
} from 'lucide-react';
import { useWorkerCompleteOnboardingMutation, useGetWorkerMeQuery } from '../../services/api';
import { ZappyWordmark } from '../../components/common/ZappyLogo';
import toast from 'react-hot-toast';
import { useServiceProT } from '../../i18n/I18nProvider';

const STEPS = ['name', 'emergency'];

export default function WorkerOnboarding({ onComplete }) {
  const t = useServiceProT();
  const nav = useNavigate();
  const { data: meData } = useGetWorkerMeQuery();
  const [complete, { isLoading }] = useWorkerCompleteOnboardingMutation();

  const [step, setStep] = useState(0);

  useScrollTopOnChange(step);
  const [name, setName] = useState(meData?.worker?.name ?? '');
  const [ecName, setEcName] = useState('');
  const [ecPhone, setEcPhone] = useState('');

  const phone = meData?.worker?.phone ?? '';

  // Optional, but if it is given it has to be reachable — a wrong number in an
  // emergency contact is worse than a blank one, because it is trusted.
  const ecPhoneDigits = ecPhone.replace(/\D/g, '');
  const ecPhoneValid = ecPhoneDigits.length === 0 || /^[6-9]\d{9}$/.test(ecPhoneDigits);

  async function handleFinish({ withContact }) {
    if (withContact && !ecPhoneValid) {
      toast.error(t('sp.wo.badPhone', 'Enter a valid 10-digit mobile number'));
      return;
    }
    try {
      await complete({
        name: name.trim(),
        ...(withContact && (ecName.trim() || ecPhoneDigits)
          ? { emergencyContact: { name: ecName.trim(), phone: ecPhoneDigits } }
          : {}),
      }).unwrap();

      onComplete?.();
      // The account exists; nothing can be earned from it until they are
      // verified for a service, so that is where they go next.
      nav('/provider/onboarding', { replace: true });
    } catch (err) {
      toast.error(err.data?.error || t('sp.wo.fail', 'Setup failed'));
    }
  }

  const field = 'input text-[16px] font-semibold';
  const label = 'mb-1.5 block text-[13px] font-semibold text-ink-700';

  const stepContent = [
    /* Step 0 — Name */
    <div key="name" className="flex flex-1 flex-col gap-6">
      <div className="space-y-1.5">
        <span className="flex h-11 w-11 items-center justify-center rounded-btn bg-zappy-50 text-zappy-600">
          <User size={20} />
        </span>
        <h1 className="pt-2 text-[24px] font-bold leading-tight text-ink-900">{t('sp.wo.nameQ', 'What\'s your name?')}</h1>
        <p className="text-[15px] text-ink-500">{t('sp.wo.nameSub', 'Customers see this when you\'re assigned to their job.')}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="ob-name" className={label}>{t('sp.wo.fullName', 'Full name')}</label>
          <input
            id="ob-name"
            autoFocus
            autoComplete="name"
            className={field}
            placeholder={t('sp.wo.namePh', 'e.g. Ravi Kumar')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <span className={label}>{t('sp.wo.mobile', 'Mobile number')}</span>
          <div className="flex min-h-[44px] items-center gap-2 rounded-btn border border-line bg-sunken px-3.5">
            <Phone size={16} className="text-ink-400" />
            <span className="text-[16px] font-semibold tabular-nums text-ink-700">{phone}</span>
            <span className="chip ml-auto bg-green-50 text-green-700"><CheckCircle2 size={12} /> {t('sp.wo.verified', 'Verified')}</span>
          </div>
        </div>
      </div>

      {/* Said up front, so the verification step is expected rather than a wall. */}
      <div className="flex items-start gap-2.5 rounded-card border border-line bg-sunken p-3.5">
        <ShieldCheck size={17} className="mt-0.5 shrink-0 text-zappy-600" />
        <p className="text-[13px] leading-relaxed text-ink-700">
          {t('sp.wo.next', 'Next you\'ll choose what you work on: phones, laptops and more. Each one is verified separately, so customers know exactly what you\'re qualified for.')}
        </p>
      </div>

      <button
        disabled={name.trim().length < 2}
        onClick={() => setStep(1)}
        className="btn-primary mt-auto w-full"
      >
        {t('sp.wo.continue', 'Continue')} <ChevronRight size={18} />
      </button>
    </div>,

    /* Step 1 — Emergency contact */
    <div key="emergency" className="flex flex-1 flex-col gap-6">
      <div className="space-y-1.5">
        <span className="flex h-11 w-11 items-center justify-center rounded-btn bg-red-50 text-red-600">
          <Heart size={20} />
        </span>
        <h1 className="pt-2 text-[24px] font-bold leading-tight text-ink-900">{t('sp.wo.ecTitle', 'Emergency contact')}</h1>
        <p className="text-[15px] text-ink-500">
          {t('sp.wo.ecSub', 'Who should we call if something happens on a job? Optional, but strongly recommended.')}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="ob-ec-name" className={label}>{t('sp.wo.ecName', 'Contact name')}</label>
          <input
            id="ob-ec-name"
            className={field}
            placeholder={t('sp.wo.ecNamePh', 'e.g. Wife, Mother, Friend')}
            value={ecName}
            onChange={(e) => setEcName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="ob-ec-phone" className={label}>{t('sp.wo.ecPhone', 'Contact phone')}</label>
          <input
            id="ob-ec-phone"
            type="tel"
            inputMode="numeric"
            className={`${field} ${ecPhoneValid ? '' : 'border-red-300 bg-red-50'}`}
            placeholder={t('sp.wo.ecPhonePh', '10-digit mobile number')}
            value={ecPhone}
            onChange={(e) => setEcPhone(e.target.value)}
          />
          {!ecPhoneValid && (
            <p className="mt-1.5 text-[13px] font-semibold text-red-600">
              {t('sp.wo.ecBad', 'That doesn\'t look like an Indian mobile number.')}
            </p>
          )}
        </div>
      </div>

      <div className="mt-auto space-y-2">
        <div className="flex gap-2">
          <button onClick={() => setStep(0)} className="btn-outline px-4">
            <ArrowLeft size={16} /> {t('sp.back', 'Back')}
          </button>
          <button
            onClick={() => handleFinish({ withContact: true })}
            disabled={isLoading || !ecPhoneValid}
            className="btn-primary flex-1"
          >
            {isLoading && <Loader2 size={18} className="animate-spin" />}
            {isLoading ? t('sp.wo.settingUp', 'Setting up…') : t('sp.wo.continue', 'Continue')}
          </button>
        </div>
        <button
          onClick={() => handleFinish({ withContact: false })}
          disabled={isLoading}
          className="min-h-[44px] w-full text-[13px] font-semibold text-ink-500 hover:text-ink-700"
        >
          {t('sp.wo.skip', 'Skip for now')}
        </button>
      </div>
    </div>,
  ];

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-line bg-white" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="mx-auto w-full max-w-md px-5 pb-3 pt-4">
          <div className="flex items-center justify-between">
            <ZappyWordmark size={24} />
            <span className="text-[13px] font-semibold tabular-nums text-ink-500">{t('sp.wo.stepOf', 'Step {a} of {b}').replace('{a}', step + 1).replace('{b}', STEPS.length)}</span>
          </div>
          <div className="mt-3 flex gap-1.5" aria-hidden="true">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-zappy-600' : 'bg-line'}`} />
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col bg-white px-5 pb-6 pt-6 sm:my-6 sm:flex-none sm:rounded-card sm:border sm:border-line sm:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="flex flex-1 flex-col"
          >
            {stepContent[step]}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
