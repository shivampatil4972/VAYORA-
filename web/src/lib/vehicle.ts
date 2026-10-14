// How a vehicle is described, in the words shown to drivers and passengers alike.

import { msg, type Translate } from './i18n';
import type { Comfort, Luggage } from './types';

export const comfortLabels: Record<Comfort, string> = {
  BASIC: msg('Basic'),
  COMFORT: msg('Comfortable'),
  PREMIUM: msg('Premium'),
};

/** The largest bag each passenger may bring. */
export const luggageLabels: Record<Luggage, string> = {
  NONE: msg('No luggage'),
  SMALL: msg('A small bag each'),
  MEDIUM: msg('A medium bag each'),
  LARGE: msg('A large suitcase each'),
};

/** What is known about a car, as short phrases. Nothing for what the driver did not say. */
export function vehiclePhrases(vehicle: { comfort: Comfort | null; luggage: Luggage | null; electric: boolean }, t: Translate): string[] {
  return [
    vehicle.comfort && t(comfortLabels[vehicle.comfort]),
    vehicle.luggage && t(luggageLabels[vehicle.luggage]),
    vehicle.electric && t('Electric'),
  ].filter((phrase): phrase is string => Boolean(phrase));
}
