import { msg } from './i18n';
import type { PassKind } from './types';

/** What each kind of travel pass is called, wherever it is named. */
export const passKindLabels: Record<PassKind, string> = {
  WEEKLY: msg('Weekly pass'),
  MONTHLY: msg('Monthly pass'),
  ANNUAL: msg('Annual pass'),
};
