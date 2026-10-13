import { useQuery } from '@tanstack/react-query';

import { api } from '../lib/api';
import { formatPercent } from '../lib/format';
import { useT } from '../lib/i18n';
import type { PaymentTerms } from '../lib/types';
import { Notice } from './ui';

// The terms change only with a redeploy; one fetch per visit is enough.
export const usePaymentTerms = () =>
  useQuery({ queryKey: ['payment-terms'], queryFn: () => api<PaymentTerms>('/payment-terms'), staleTime: Infinity });

/** Says, wherever money is mentioned, that none of it is real. */
export function SimulatedPaymentNotice() {
  const t = useT();
  const terms = usePaymentTerms();
  if (terms.data && terms.data.provider !== 'MOCK') return null;
  return (
    <Notice tone="info">
      {t('Payments here are simulated. No card, UPI or wallet is contacted and no money is taken or paid out.')}
    </Notice>
  );
}

/** The refund policy in words, built from what the server will actually apply. */
export function RefundTerms() {
  const t = useT();
  const terms = usePaymentTerms();
  if (!terms.data) return null;
  const tiers = terms.data.refundTiers;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
      <p className="font-medium text-slate-900">{t('If you cancel')}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        <li>{t('Before the driver accepts: everything back, including the service fee.')}</li>
        {tiers.map((tier, index) => {
          const when =
            index === 0
              ? t('{hours} hours or more before boarding', { hours: tier.atLeastHoursBefore })
              : t('{from} to {to} hours before boarding', { from: tier.atLeastHoursBefore, to: tiers[index - 1].atLeastHoursBefore });
          return (
            <li key={tier.atLeastHoursBefore}>
              {tier.fareShare === 1
                ? t('{when}: the whole fare back.', { when })
                : t('{when}: {share} of the fare back.', { when, share: formatPercent(tier.fareShare) })}
            </li>
          );
        })}
        {tiers.length > 0 && (
          <li>{t('Less than {hours} hours before boarding: nothing back.', { hours: tiers[tiers.length - 1].atLeastHoursBefore })}</li>
        )}
        <li>{t('Once the driver has accepted, the service fee is not returned.')}</li>
        <li>{t('If the driver cancels or declines: everything back.')}</li>
      </ul>
    </div>
  );
}
