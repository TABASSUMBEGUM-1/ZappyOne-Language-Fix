import { Camera, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProviderMissingPhotosQuery } from '../../services/api';
import { useServiceProT } from '../../i18n/I18nProvider';

// Jobs on the pro's menu with no photo: one tap to the menu to add them (server repair provider-menu missingPhotos).
export default function MissingPhotosCard({ to = '/provider/services', className = '' }) {
  const t = useServiceProT();
  const nav = useNavigate();
  const { data } = useProviderMissingPhotosQuery();
  if (!data?.count) return null;
  const names = data.names.join(', ') + (data.count > data.names.length ? ` ${t('sp.and_n_more', 'and {n} more').replace('{n}', data.count - data.names.length)}` : '');
  return (
    <button type="button" onClick={() => nav(to)} className={`flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-left ${className}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Camera size={17} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-navy">{data.count === 1 ? t('sp.1_job_is_hidden_no_photo', '1 job is hidden: no photo') : t('sp.n_jobs_are_hidden_no_photo', '{n} jobs are hidden: no photo').replace('{n}', data.count)}</span>
        <span className="block truncate text-[12px] text-slate-600">{t('sp.hidden_from_customers_until_it_has_a_photo_add_one_to_names', 'Hidden from customers until it has a photo. Add one to {names}.').replace('{names}', names)}</span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-slate-400" />
    </button>
  );
}
