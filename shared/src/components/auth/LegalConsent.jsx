import { PORTAL_URLS } from '../../config/portals';
import { useServiceProT } from '../../i18n/I18nProvider';

/**
 * "By continuing you agree to…" under every web sign-in, linking the pages
 * admin publishes (Admin → Content → Legal pages). Customers agree to the
 * Terms of Use, providers to the Partner Terms; both to the Privacy Policy.
 * The pages live on the customer website, so the portals link there.
 */
export default function LegalConsent({ audience = 'customer', className = '' }) {
  const t = useServiceProT();
  const base = audience === 'customer' ? '' : PORTAL_URLS.customer;
  const link = 'font-semibold text-zappy-600 hover:underline';
  const out = audience === 'customer' ? {} : { target: '_blank', rel: 'noreferrer' };
  return (
    <p className={`text-center text-[12px] leading-relaxed text-slate-500 ${className}`}>
      {t('sp.by_continuing_you_agree_to_zappyone_s', "By continuing, you agree to ZappyOne's")}{' '}
      <a href={`${base}/policy/${audience === 'customer' ? 'terms' : 'partner-terms'}`} className={link} {...out}>{audience === 'customer' ? t('sp.terms_of_use', 'Terms of Use') : t('sp.partner_terms', 'Partner Terms')}</a>
      {' '}{t('sp.and', 'and')}{' '}
      <a href={`${base}/policy/privacy-policy`} className={link} {...out}>{t('sp.privacy_policy', 'Privacy Policy')}</a>.
    </p>
  );
}
