// Experience levels, in the words members see. The rules are set on the server.

import { msg } from './i18n';

export const levelLabels: Record<string, string> = {
  NEWCOMER: msg('Newcomer'),
  INTERMEDIATE: msg('Intermediate'),
  EXPERIENCED: msg('Experienced'),
  EXPERT: msg('Expert'),
  AMBASSADOR: msg('Ambassador'),
};
