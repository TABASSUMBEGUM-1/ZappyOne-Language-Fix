import { Camera, ImagePlus } from 'lucide-react';
import { useServiceProT } from '../../i18n/I18nProvider';

// Take a photo now or choose one: on a phone the first opens the camera straight away, the second the gallery.
export default function PhotoSourceButtons({ onFile, disabled = false, className = '' }) {
  const t = useServiceProT();
  const input = (capture) => (
    <input type="file" accept="image/*" {...(capture && { capture: 'environment' })} className="hidden" disabled={disabled}
      onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onFile(f); }} />
  );
  const btn = 'flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-[13px] font-semibold text-slate-700 hover:border-zappy-400 hover:text-zappy-700';
  return (
    <div className={`flex gap-2 ${disabled ? 'pointer-events-none opacity-50' : ''} ${className}`}>
      <label className={btn}><Camera size={16} /> {t('sp.take_a_photo', 'Take a photo')}{input(true)}</label>
      <label className={btn}><ImagePlus size={16} /> {t('sp.choose_from_gallery', 'Choose from gallery')}{input(false)}</label>
    </div>
  );
}
