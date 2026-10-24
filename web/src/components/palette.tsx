import { AnimatePresence, motion } from 'framer-motion';
import { CornerDownLeft, Search, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';

import { useT } from '../lib/i18n';

export interface Command {
  id: string;
  /** English, translated when shown, unless `literal`. */
  label: string;
  group: string;
  icon: LucideIcon;
  run: () => void;
  /** Shown as written, such as a language's own name for itself. */
  literal?: boolean;
  /** Called when the command is highlighted, to fetch a page's code ahead. */
  onHighlight?: () => void;
}

function isMac() {
  try {
    return /Mac|iPhone|iPad/.test(navigator.platform);
  } catch {
    return false;
  }
}

/**
 * Every page and quick action in one searchable list, opened with Ctrl+K (⌘K on a Mac) or the
 * button it draws. Type to narrow it, arrows to move, Enter to choose, Escape to close; focus
 * goes back to where it was.
 */
export function CommandPalette({ commands }: { commands: Command[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        // The browser's own Ctrl+K would focus its search bar instead.
        event.preventDefault();
        setOpen((was) => !was);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={t('Search pages and actions')}
        // A keyboard's tool: a phone has the tab bar and its More sheet instead, and the room is needed.
        className="hidden h-8 items-center gap-2 rounded-full bg-slate-900/[0.05] px-2.5 sm:inline-flex text-sm font-medium text-slate-600 hover:bg-slate-900/[0.09] active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/30"
      >
        <Search aria-hidden="true" className="h-4 w-4" />
        <span className="hidden md:inline">{t('Go to…')}</span>
        <kbd aria-hidden="true" className="hidden rounded-md bg-surface px-1.5 py-0.5 font-sans text-[11px] font-semibold text-slate-500 ring-1 ring-slate-900/[0.08] md:inline">
          {isMac() ? '⌘K' : 'Ctrl K'}
        </kbd>
      </button>
      {createPortal(
        <AnimatePresence>{open && <Panel commands={commands} onClose={() => setOpen(false)} />}</AnimatePresence>,
        document.body,
      )}
    </>
  );
}

function Panel({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
  const t = useT();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const opener = useRef<Element | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const shown = useMemo(() => {
    const wanted = query.trim().toLowerCase();
    return commands.filter((command) => {
      if (!wanted) return true;
      const label = command.literal ? command.label : t(command.label);
      return `${label} ${command.label} ${t(command.group)}`.toLowerCase().includes(wanted);
    });
  }, [commands, query, t]);
  const current = shown[Math.min(active, shown.length - 1)];
  const optionId = (command: Command) => `${listId}-${command.id}`;

  useEffect(() => {
    opener.current = document.activeElement;
    input.current?.focus();
    return () => {
      if (opener.current instanceof HTMLElement) opener.current.focus();
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    current.onHighlight?.();
    document.getElementById(`${listId}-${current.id}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [current, listId]);

  const choose = (command: Command) => {
    onClose();
    command.run();
  };

  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((index) => (shown.length ? (Math.min(index, shown.length - 1) + step + shown.length) % shown.length : 0));
    } else if (event.key === 'Enter' && current) {
      event.preventDefault();
      choose(current);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={t('Search pages and actions')}
        className="relative w-full max-w-lg overflow-hidden rounded-[22px] bg-surface shadow-float ring-1 ring-slate-900/[0.06]"
        initial={{ opacity: 0, scale: 0.96, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -6 }}
        transition={{ type: 'spring', stiffness: 520, damping: 40 }}
      >
        <div className="flex items-center gap-3 border-b border-slate-900/[0.07] px-4">
          <Search aria-hidden="true" className="h-5 w-5 flex-none text-slate-400" />
          <input
            ref={input}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={current ? optionId(current) : undefined}
            aria-label={t('Search pages and actions')}
            placeholder={t('Search pages and actions')}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            className="h-14 w-full bg-transparent text-[17px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
        <ul id={listId} role="listbox" aria-label={t('Search pages and actions')} className="max-h-[55vh] overflow-y-auto p-2">
          {shown.map((command, index) => {
            const Icon = command.icon;
            const selected = command === current;
            const firstOfGroup = index === 0 || shown[index - 1].group !== command.group;
            return (
              <li key={command.id} role="presentation">
                {firstOfGroup && (
                  <p aria-hidden="true" className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 first:pt-1">
                    {t(command.group)}
                  </p>
                )}
                <div
                  id={optionId(command)}
                  role="option"
                  aria-selected={selected}
                  tabIndex={-1}
                  onMouseMove={() => setActive(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(command)}
                  onKeyDown={onKeyDown}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium ${
                    selected ? 'bg-teal-600/[0.12] text-teal-900' : 'text-slate-800'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg ${selected ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{command.literal ? command.label : t(command.label)}</span>
                  {selected && <CornerDownLeft aria-hidden="true" className="h-4 w-4 flex-none text-teal-800" />}
                </div>
              </li>
            );
          })}
        </ul>
        {shown.length === 0 && (
          <p role="status" className="-mt-2 px-5 pb-6 pt-2 text-center text-[15px] text-slate-500">
            {t('Nothing matches that.')}
          </p>
        )}
        <p aria-hidden="true" className="hidden border-t border-slate-900/[0.07] px-4 py-2 text-[12px] text-slate-400 sm:block">
          {t('Arrows to move, Enter to choose, Esc to close')}
        </p>
      </motion.div>
    </div>
  );
}
