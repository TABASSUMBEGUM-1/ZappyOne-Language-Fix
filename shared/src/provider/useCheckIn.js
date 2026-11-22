import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useGoOnlineMutation } from '../services/api';
import { useGeolocation } from '../hooks/useGeolocation';
import { useServiceProT } from '../i18n/I18nProvider';

// Runs an accept; when the server says the technician has not checked in (jobs/assignment assertCheckedIn), checks them in where they stand and tries once more.
export function useCheckInThen() {
  const t = useServiceProT();
  const [goOnline] = useGoOnlineMutation();
  const { getCurrent } = useGeolocation();
  return useCallback(async (run) => {
    try { return await run(); } catch (err) {
      if (err?.data?.code !== 'NOT_CHECKED_IN') throw err;
      const pos = await getCurrent();
      await goOnline({ lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy ?? null }).unwrap();
      toast.success(t('sp.checked_in_for_your_shift', 'Checked in for your shift'));
      return run();
    }
  }, [goOnline, getCurrent, t]);
}
