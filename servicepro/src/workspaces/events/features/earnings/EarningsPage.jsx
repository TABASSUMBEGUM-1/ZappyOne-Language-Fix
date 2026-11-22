import { Link } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { useI18n } from '@shared/i18n/I18nProvider';
import { usePartnerEarningsQuery } from '@shared/services/api';
import { PageHeader, Spinner, Stat, Card, Empty } from '../../components/ui';
import { rupees, shortDate } from '../../lib/format';

/**
 * What the partner has earned, after ZappyOne's commission. Each booking is
 * shown at the rate agreed when it was made, so a later change to the rate
 * never rewrites past earnings.
 */
export default function EarningsPage() {
  const { t, lang } = useI18n();
  const monthName = (m) => new Date(2000, m - 1, 1).toLocaleDateString(`${lang}-IN`, { month: 'short' });
  const { data, isLoading } = usePartnerEarningsQuery();
  if (isLoading) return <Spinner />;
  const d = data || {};
  const monthly = [...(d.monthly || [])].reverse();
  const peak = Math.max(1, ...monthly.map((m) => m.netPaise || 0));

  return (
    <div className="space-y-5">
      <PageHeader title={t('sp.earnings', 'Earnings')} subtitle={t('sp.ev.eaSub', 'What each booking paid and what reached you.')} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t('sp.ev.eaEarned', 'You earned')} value={rupees(d.netPaise)} hint={t('sp.ev.eaDone', '{n} completed events').replace('{n}', d.totalJobs || 0)} />
        <Stat label={t('sp.ev.eaPaid', 'Customers paid')} value={rupees(d.grossPaise)} />
        <Stat label={t('sp.ev.eaFee', 'ZappyOne fee')} value={rupees(d.platformPaise)} />
        <Stat label={t('sp.ev.eaComing', 'Coming up')} value={rupees(d.upcomingNetPaise)} hint={t('sp.ev.eaAcc', '{n} accepted bookings').replace('{n}', d.upcomingCount || 0)} />
      </div>
      {/* Penalties for cancelled bookings come off what you are paid (server events/partner-cancel). */}
      {d.penaltiesPaise > 0 && (
        <p className="rounded-card bg-red-50 px-4 py-3 text-[13px] text-red-800">
          {t('sp.ev.eaPen', 'Cancellation penalties: {a}, taken from your payouts. After penalties you earned {b}.').replace('{a}', rupees(d.penaltiesPaise)).replace('{b}', rupees(d.netAfterPenaltiesPaise))}
        </p>
      )}

      {!d.totalJobs ? (
        <Empty icon={Wallet} title={t('sp.ev.eaNone', 'No earnings yet')} text={t('sp.ev.eaNoneT', 'Your share of each event shows here once you mark it completed.')} />
      ) : (
        <>
          <Card className="p-4">
            <p className="text-[15px] font-bold text-ink-900">{monthly.length === 1 ? t('sp.ev.eaLast1', 'Last month') : t('sp.ev.eaLastN', 'Last {n} months').replace('{n}', monthly.length)}</p>
            <div className="mt-4 flex h-40 items-end gap-3" role="img" aria-label={t('sp.ev.eaChart', 'Monthly earnings')}>
              {monthly.map((m) => (
                <div key={`${m._id.year}-${m._id.month}`} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[11px] font-semibold tabular-nums text-ink-700">{rupees(m.netPaise)}</span>
                  <span className="w-full max-w-[48px] rounded-t-btn bg-zappy-600" style={{ height: `${Math.max(4, (m.netPaise / peak) * 100)}%` }} />
                  <span className="text-[12px] text-ink-500">{monthName(m._id.month)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <p className="border-b border-line px-4 py-3 text-[15px] font-bold text-ink-900">{t('sp.ev.eaRecent', 'Recent events')}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[14px]">
                <thead className="text-left text-[12px] text-ink-500">
                  <tr><th className="px-4 py-2 font-medium">{t('sp.ev.eaEvent', 'Event')}</th><th className="px-4 py-2 font-medium">{t('sp.ev.eaDate', 'Date')}</th><th className="px-4 py-2 text-right font-medium">{t('sp.ev.eaPaidCol', 'Paid')}</th><th className="px-4 py-2 text-right font-medium">{t('sp.ev.eaGot', 'You got')}</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {(d.recent || []).map((r) => (
                    <tr key={r._id}>
                      <td className="max-w-[180px] truncate px-4 py-2.5"><Link to={`/partner/bookings/${r._id}`} className="font-medium text-ink-900 hover:underline">{r.title}</Link></td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-ink-500">{shortDate(r.eventDate, lang)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{rupees(r.grossPaise)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-green-700">{rupees(r.netPaise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
      <p className="text-[12px] text-ink-400">{t('sp.ev.eaNote', 'Sending money to your bank is being set up. Your earnings are recorded against every completed event.')}</p>
    </div>
  );
}
