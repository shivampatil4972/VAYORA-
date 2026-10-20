import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { SimulatedPaymentNotice, usePaymentTerms } from '../components/payment';
import { ReceiptButton } from '../components/receipt';
import { Button, Card, Notice, Page, QueryState, SelectField } from '../components/ui';
import { api } from '../lib/api';
import { formatDateTime, formatRupees } from '../lib/format';
import { useT } from '../lib/i18n';
import { passKindLabels as kindLabels } from '../lib/passes';
import { payAtCheckout } from '../lib/razorpay';
import type { PassKind, PassOffer, PaymentMethod, TravelPass } from '../lib/types';

/** Buying and seeing travel passes. A pass waives the service fee; the fare is the driver's. */
export function PassesPage() {
  const t = useT();
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  // With Razorpay the passenger pays in its checkout first.
  const checkout = usePaymentTerms().data?.checkout === true;
  const offers = useQuery({ queryKey: ['passes', 'offers'], queryFn: () => api<PassOffer[]>('/passes/offers'), staleTime: Infinity });
  const mine = useQuery({ queryKey: ['passes', 'mine'], queryFn: () => api<TravelPass[]>('/passes') });
  const buy = useMutation({
    mutationFn: async (kind: PassKind) => {
      const razorpay = checkout ? await payAtCheckout('/passes/checkout', { kind }, t(kindLabels[kind])) : undefined;
      return api<TravelPass>('/passes', { method: 'POST', body: { kind, ...(razorpay ? { razorpay } : { paymentMethod: method }) } });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['passes', 'mine'] });
      // Prices in search results change while a pass runs.
      void queryClient.invalidateQueries({ queryKey: ['search'] });
    },
  });
  const now = Date.now();

  return (
    <Page title={t('Travel passes')}>
      <p className="text-sm text-slate-600">
        {t('While a pass runs, you pay no service fee on the rides you book. Drivers are paid the same fare either way.')}
      </p>
      <SimulatedPaymentNotice />

      <section aria-label={t('Your passes')} className="space-y-3">
        <h2 className="text-lg font-semibold">{t('Your passes')}</h2>
        <QueryState
          isPending={mine.isPending}
          error={mine.error}
          isEmpty={mine.data?.length === 0}
          empty={t('You have no pass.')}
          onRetry={() => void mine.refetch()}
        />
        {mine.data?.map((pass) => {
          const starts = Date.parse(pass.startsAt);
          const ends = Date.parse(pass.endsAt);
          return (
            <Card key={pass.id}>
              <p className="font-medium">{t(kindLabels[pass.kind])}</p>
              <p className="mt-1 text-sm text-slate-600">
                {starts > now
                  ? t('Starts {start}, runs until {end}', { start: formatDateTime(pass.startsAt), end: formatDateTime(pass.endsAt) })
                  : ends > now
                    ? t('Running until {end}', { end: formatDateTime(pass.endsAt) })
                    : t('Ended {end}', { end: formatDateTime(pass.endsAt) })}
                {' · '}
                {pass.reward ? t('Free: a reward for an invitation') : formatRupees(pass.price)}
              </p>
              <p className="mt-2">
                <ReceiptButton path={`/passes/${pass.id}/receipt`} filename={`journex-pass-${pass.id}.pdf`} />
              </p>
            </Card>
          );
        })}
      </section>

      <section aria-label={t('Buy a pass')} className="space-y-3">
        <h2 className="text-lg font-semibold">{t('Buy a pass')}</h2>
        <p className="text-sm text-slate-600">{t('A pass bought while another runs starts when that one ends.')}</p>
        {buy.error && <Notice tone="error">{buy.error.message}</Notice>}
        {buy.isSuccess && <Notice tone="success">{t('Your pass is bought.')}</Notice>}
        {checkout ? (
          <p className="text-sm text-slate-600">{t("You pay by card, UPI or a wallet in Razorpay's checkout when you buy.")}</p>
        ) : (
          <div className="max-w-xs">
            <SelectField label={t('Pay with')} value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
              <option value="UPI">{t('UPI')}</option>
              <option value="CARD">{t('Card')}</option>
              <option value="WALLET">{t('Wallet')}</option>
            </SelectField>
          </div>
        )}
        <QueryState isPending={offers.isPending} error={offers.error} isEmpty={false} empty="" onRetry={() => void offers.refetch()} />
        <div className="grid gap-3 sm:grid-cols-3">
          {offers.data?.map((offer) => (
            <Card key={offer.kind}>
              <p className="font-medium">{t(kindLabels[offer.kind])}</p>
              <p className="mt-1 text-2xl font-semibold">{formatRupees(offer.price)}</p>
              <p className="text-sm text-slate-600">{t('{n} days', { n: offer.days })}</p>
              <Button className="mt-3" disabled={buy.isPending} onClick={() => buy.mutate(offer.kind)}>
                {t('Buy {pass}', { pass: t(kindLabels[offer.kind]) })}
              </Button>
            </Card>
          ))}
        </div>
      </section>
    </Page>
  );
}
