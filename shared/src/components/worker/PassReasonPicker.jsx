import { Loader2 } from 'lucide-react';

import { PASS_REASONS } from '../jobs/jobOffers';
import { useServiceProT } from '../../i18n/I18nProvider';
import { labelKey } from '../../i18n/translations';

export { PASS_REASONS };

/** Why a job is being passed — kept so owners and ops see real reasons, not "declined". */
export default function PassReasonPicker({ title, busy, onPick, onCancel }) {
  const t = useServiceProT();
  return (
    <div>
      <p className="text-sm font-bold text-[#0F172A]">{title || t('sp.why_are_you_passing_this_job', 'Why are you passing this job?')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {PASS_REASONS.map((r) => (
          <button
            key={r}
            disabled={busy}
            onClick={() => onPick(r)}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-zappy-300 disabled:opacity-50"
          >
            {t(labelKey(r), r)}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button onClick={onCancel} disabled={busy} className="text-xs font-semibold text-slate-400 hover:text-slate-600">
          {t('sp.back', 'Back')}
        </button>
        {busy && <Loader2 size={15} className="animate-spin text-slate-400" />}
      </div>
    </div>
  );
}
