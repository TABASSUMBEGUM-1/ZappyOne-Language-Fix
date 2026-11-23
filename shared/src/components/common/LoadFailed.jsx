import { useServiceProT } from '../../i18n/I18nProvider';

// A screen whose data did not arrive says so and offers a retry, instead of loading forever.
export default function LoadFailed({ what, onRetry }) {
  const t = useServiceProT();
  const name = what || t('sp.this_page', 'This page');
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div role="alert" className="rounded-card border border-line bg-white p-6 text-center">
        <p className="text-[14px] font-semibold text-ink-900">{t('sp.x_did_not_load', '{x} did not load.').replace('{x}', name)}</p>
        <p className="mt-1 text-[13px] text-ink-500">{t('sp.check_your_connection_and_try_again', 'Check your connection and try again.')}</p>
        <button type="button" onClick={onRetry} className="btn-outline mt-4 min-h-[38px] px-4 text-[13px]">{t('sp.try_again', 'Try Again')}</button>
      </div>
    </div>
  );
}
