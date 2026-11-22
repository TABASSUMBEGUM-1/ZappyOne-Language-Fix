import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import JobChat from './JobChat';
import { useServiceProT } from '../../i18n/I18nProvider';

/** "Message customer" on a provider's job screen; opens the job's conversation. */
export default function JobChatButton({ jobId, title, className = '' }) {
  const t = useServiceProT();
  const [open, setOpen] = useState(false);
  if (!jobId) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`btn-outline min-h-[40px] px-3 text-[14px] ${className}`}>
        <MessageCircle size={16} /> {t('sp.message', 'Message')}
      </button>
      <AnimatePresence>{open && <JobChat jobId={jobId} title={title || t('sp.your_customer', 'Your customer')} onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  );
}
