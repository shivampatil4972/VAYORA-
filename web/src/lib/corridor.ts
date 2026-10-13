// The Kolhapur to Pune corridor, in travel order. Offsets are typical driving times from
// Kolhapur and only pre-fill the publish form; the driver can change them.

import { msg } from './i18n';

export interface CorridorStop {
  /** The English name: what the server stores and matches. Display it through `t`. */
  name: string;
  lat: number;
  lon: number;
  typicalOffsetMinutes: number;
}

export const CORRIDOR: readonly CorridorStop[] = [
  { name: msg('Kolhapur'), lat: 16.705, lon: 74.2433, typicalOffsetMinutes: 0 },
  { name: msg('Karad'), lat: 17.289, lon: 74.1818, typicalOffsetMinutes: 75 },
  { name: msg('Satara'), lat: 17.6805, lon: 74.0183, typicalOffsetMinutes: 130 },
  { name: msg('Pune'), lat: 18.5204, lon: 73.8567, typicalOffsetMinutes: 270 },
];
