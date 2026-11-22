import { Navigation } from 'lucide-react';

import { useServiceProT } from '../../i18n/I18nProvider';

/**
 * What the pro sees while on a trip: whether the customer can follow them,
 * and one tap to navigate.
 *
 * `sharing` is the state from usePublishTripLocation — "pending" (waiting for
 * a first GPS fix) is not "denied", and the copy never confuses the two.
 */
export default function TripSharingBanner({ sharing, to, toCustomer = true }) {
  const t = useServiceProT();
  const live = sharing === 'sharing';
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-blue-100 bg-blue-50 p-3">
      <span className="relative mt-0.5 flex h-2.5 w-2.5 shrink-0">
        {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${live ? 'bg-blue-600' : 'bg-slate-300'}`} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-bold text-blue-900">
          {live ? t('sp.customer_can_see_you_on_the_map', 'Customer can see you on the map')
            : sharing === 'denied' ? t('sp.location_access_is_blocked', 'Location access is blocked')
              : t('sp.getting_your_location', 'Getting your location…')}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-blue-700">
          {live
            ? (toCustomer ? t('sp.it_stops_by_itself_the_moment_you_mark_yourself_arrived', 'It stops by itself the moment you mark yourself arrived.') : t('sp.it_stops_by_itself_when_this_leg_of_the_trip_ends', 'It stops by itself when this leg of the trip ends.'))
            : sharing === 'denied'
              ? t('sp.allow_location_for_this_site_in_your_browser_so_the_customer_can_follow_your_trip', 'Allow location for this site in your browser so the customer can follow your trip.')
              : t('sp.waiting_for_the_first_gps_fix_this_can_take_a_few_seconds', 'Waiting for the first GPS fix. This can take a few seconds.')}
        </p>
      </div>
      {to && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1 rounded-xl bg-blue-600 px-2.5 py-1.5 text-[11px] font-bold text-white"
        >
          <Navigation size={11} /> {t('sp.directions', 'Directions')}
        </a>
      )}
    </div>
  );
}
