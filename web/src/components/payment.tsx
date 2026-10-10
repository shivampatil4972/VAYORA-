import { useQuery } from '@tanstack/react-query';

import { api } from '../lib/api';
import type { PaymentTerms } from '../lib/types';
import { Notice } from './ui';

const percent = new Intl.NumberFormat('en-IN', { style: 'percent', maximumFractionDigits: 0 });

// The terms change only with a redeploy; one fetch per visit is enough.
export const usePaymentTerms = () =>
  useQuery({ queryKey: ['payment-terms'], queryFn: () => api<PaymentTerms>('/payment-terms'), staleTime: Infinity });

/** Says, wherever money is mentioned, that none of it is real. */
export function SimulatedPaymentNotice() {
  const terms = usePaymentTerms();
  if (terms.data && terms.data.provider !== 'MOCK') return null;
  return (
    <Notice tone="info">
      Payments here are simulated. No card, UPI or wallet is contacted and no money is taken or paid out.
    </Notice>
  );
}

/** The refund policy in words, built from what the server will actually apply. */
export function RefundTerms() {
  const terms = usePaymentTerms();
  if (!terms.data) return null;
  const tiers = terms.data.refundTiers;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
      <p className="font-medium text-slate-900">If you cancel</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        <li>Before the driver accepts: everything back, including the service fee.</li>
        {tiers.map((tier, index) => (
          <li key={tier.atLeastHoursBefore}>
            {index === 0
              ? `${tier.atLeastHoursBefore} hours or more before boarding`
              : `${tier.atLeastHoursBefore} to ${tiers[index - 1].atLeastHoursBefore} hours before boarding`}
            : {tier.fareShare === 1 ? 'the whole fare' : `${percent.format(tier.fareShare)} of the fare`} back.
          </li>
        ))}
        {tiers.length > 0 && <li>Less than {tiers[tiers.length - 1].atLeastHoursBefore} hours before boarding: nothing back.</li>}
        <li>Once the driver has accepted, the service fee is not returned.</li>
        <li>If the driver cancels or declines: everything back.</li>
      </ul>
    </div>
  );
}
