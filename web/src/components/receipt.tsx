import { useState } from 'react';

import { download } from '../lib/api';
import { useT } from '../lib/i18n';

/** Saves a receipt PDF. The receipt itself is in English: its fonts cover Latin script only. */
export function ReceiptButton({ path, filename }: { path: string; filename: string }) {
  const t = useT();
  const [state, setState] = useState<'idle' | 'busy' | 'failed'>('idle');
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        disabled={state === 'busy'}
        onClick={() => {
          setState('busy');
          download(path, filename).then(
            () => setState('idle'),
            () => setState('failed'),
          );
        }}
        className="text-left text-sm font-medium text-teal-800 underline underline-offset-2 disabled:opacity-50"
      >
        {t('Download receipt (PDF, in English)')}
      </button>
      {state === 'failed' && (
        <span role="alert" className="text-xs text-red-700">
          {t('The receipt could not be downloaded. Try again.')}
        </span>
      )}
    </span>
  );
}
