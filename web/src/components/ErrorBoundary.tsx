import { TriangleAlert } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { useT } from '../lib/i18n';
import { Button } from './ui';

function Fallback({ retry }: { retry: () => void }) {
  const t = useT();
  return (
    <div role="alert" className="flex flex-col items-center gap-4 rounded-3xl bg-surface px-6 py-12 text-center shadow-card ring-1 ring-slate-900/[0.04]">
      <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-amber-100 text-amber-800">
        <TriangleAlert className="h-8 w-8" />
      </span>
      <p className="max-w-sm text-[15px] font-medium text-slate-800">{t('Something went wrong on this screen.')}</p>
      <Button onClick={retry}>{t('Try again')}</Button>
    </div>
  );
}

/**
 * Keeps one broken screen from blanking the whole app: the header, the emergency button
 * and every other page keep working. Keyed by the path where it is used, so moving to
 * another page clears it.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('A screen failed to render', error, info.componentStack);
  }

  render() {
    return this.state.failed ? <Fallback retry={() => this.setState({ failed: false })} /> : this.props.children;
  }
}
