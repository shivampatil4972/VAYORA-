import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '../lib/api';
import { useT } from '../lib/i18n';
import { Button, Notice } from './ui';

/**
 * A completed trip is marked so on the driver's word. This asks the passenger, once.
 * Saying it did not happen reaches an administrator; it changes nothing by itself.
 */
export function TripConfirmation({ bookingId }: { bookingId: number }) {
  const t = useT();
  const queryClient = useQueryClient();
  const answer = useMutation({
    mutationFn: (travelled: boolean) =>
      api<void>(`/bookings/${bookingId}/trip-confirmation`, { method: 'POST', body: { travelled } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  });
  if (answer.isSuccess) {
    return (
      <Notice tone="success">
        {answer.variables
          ? t('Thank you for confirming.')
          : t('Thank you. An administrator will look into it; nothing has been changed yet.')}
      </Notice>
    );
  }
  return (
    <div className="mt-3 space-y-2 rounded-2xl border border-slate-200 p-3">
      <p className="text-sm font-medium">{t('The driver marked this trip completed. Did it happen?')}</p>
      {answer.error && <Notice tone="error">{answer.error.message}</Notice>}
      <div className="flex flex-wrap gap-2">
        <Button tone="secondary" disabled={answer.isPending} onClick={() => answer.mutate(true)}>
          {t('Yes, I travelled')}
        </Button>
        <Button tone="secondary" disabled={answer.isPending} onClick={() => answer.mutate(false)}>
          {t('No, it did not happen')}
        </Button>
      </div>
    </div>
  );
}
