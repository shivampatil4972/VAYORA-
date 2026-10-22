import { useEffect, useState } from 'react';

/** Whether a media query matches now, kept current. False where there is no window to ask (tests). */
export function useMediaQuery(query: string): boolean {
  const read = () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
  const [matches, setMatches] = useState(read);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);
  return matches;
}

/** Phone width, where iOS-style navigation moves to the bottom of the screen. */
export const PHONE = '(max-width: 639px)';
