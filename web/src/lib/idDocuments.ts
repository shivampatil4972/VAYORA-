import { msg } from './i18n';
import type { IdDocument } from './types';

/** What each identity document a driver may declare is called. Declared, never checked. */
export const idDocumentLabels: Record<IdDocument, string> = {
  AADHAAR: msg('Aadhaar'),
  PAN: msg('PAN card'),
  DRIVING_LICENCE: msg('Driving licence'),
  PASSPORT: msg('Passport'),
  VOTER_ID: msg('Voter ID'),
};
