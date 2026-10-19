import { msg } from './i18n';
import type { MatchReason } from './types';

/** What each reason behind a match score means, in words (feature 76). */
export const matchReasonLabels: Record<MatchReason, string> = {
  NEAR: msg('Pickup and drop-off close to you'),
  CHEAPEST: msg('The lowest price here'),
  SAME_SMOKING: msg('You agree about smoking'),
  DIFFERENT_SMOKING: msg('You differ about smoking'),
  SAME_PETS: msg('You agree about pets'),
  DIFFERENT_PETS: msg('You differ about pets'),
  SAME_MUSIC: msg('You agree about music'),
  DIFFERENT_MUSIC: msg('You differ about music'),
  SAME_CONVERSATION: msg('You like the same amount of conversation'),
  DIFFERENT_CONVERSATION: msg('One of you wants a quiet ride, the other likes to talk'),
};
