import { useState } from 'react';

import { Card, Notice, Page, SelectField } from '../components/ui';
import whatif from '../data/whatif.json';
import { msg, useT } from '../lib/i18n';

interface Figure {
  mean: number;
  baselineMean: number;
  difference: number;
  ciLow: number;
  ciHigh: number;
  seeds: number;
}

interface Sweep {
  name: string;
  runId: string;
  variant: string;
  baseline: string;
  baselinePerCell: boolean;
  parameters: Record<string, number[]>;
  cells: { parameters: Record<string, number>; measures: Record<string, Figure> }[];
}

// Written by experiments/analysis/export_web.py from the committed sweep reports.
// JSON imports are typed from the file's contents; this is the shape export_web.py writes.
const sweeps = whatif.sweeps as unknown as Sweep[];

const sweepLabels: Record<string, string> = {
  'contact-budget': msg('How many reconfirmation requests may go out at once'),
  'departure-tolerance': msg('How far from their chosen time passengers will travel'),
  'publish-lead': msg('How early drivers publish their rides'),
};

const parameterLabels: Record<string, string> = {
  'variant.intervention.budget.contacts_per_round': msg('Requests per round'),
  'demand.departure_tolerance_hours': msg('Hours either side of the chosen time'),
  'supply.publish_lead_days_min': msg('Days ahead, at the least, that a ride is published'),
};

// As in experiments/sweep.py: the primary metric first, each with the decimals the reports use.
const measures: [string, string, number][] = [
  ['per_100', msg('Completed rides per 100 searches'), 2],
  ['late_share', msg('Late share of cancellations'), 3],
  ['contact_rate', msg('Reconfirmation requests per accepted booking'), 3],
  ['refilled', msg('Released seats refilled'), 1],
  ['refills_only_option', msg('Refills by a passenger offered no other ride'), 1],
  ['empty_share', msg('Searches offered no ride'), 3],
];

const signed = (value: number, digits: number) => (value > 0 ? '+' : value < 0 ? '−' : '') + Math.abs(value).toFixed(digits);

/**
 * Saved simulator runs, explored by changing one setting at a time. Nothing is simulated
 * here: every setting offered is one a sweep was run at, and every figure is that run's.
 */
export function WhatIfPage() {
  const t = useT();
  const [sweepName, setSweepName] = useState(sweeps[0].name);
  const sweep = sweeps.find((s) => s.name === sweepName)!;
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const value = (path: string) => chosen[path] ?? sweep.parameters[path][0];
  const cell = sweep.cells.find((c) => Object.entries(c.parameters).every(([path, v]) => v === value(path)))!;

  return (
    <Page title={t('What if')}>
      <Notice tone="info">
        {t('Simulator runs on synthetic data, not real passengers. Changing a setting shows another saved run: nothing is simulated on this page, and only the settings a sweep was run at can be chosen.')}
      </Notice>
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label={t('Question')}
            value={sweepName}
            onChange={(event) => {
              setSweepName(event.target.value);
              setChosen({});
            }}
          >
            {sweeps.map((s) => (
              <option key={s.name} value={s.name}>
                {sweepLabels[s.name] ? t(sweepLabels[s.name]) : s.name}
              </option>
            ))}
          </SelectField>
          {Object.entries(sweep.parameters).map(([path, values]) => (
            <SelectField
              key={`${sweep.name}-${path}`}
              label={parameterLabels[path] ? t(parameterLabels[path]) : path}
              value={String(value(path))}
              onChange={(event) => setChosen({ ...chosen, [path]: Number(event.target.value) })}
            >
              {values.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </SelectField>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-600">
          {t('{variant} compared with {baseline}, {seeds} seeds each, paired by seed.', {
            variant: sweep.variant,
            baseline: sweep.baseline,
            seeds: cell.measures.per_100.seeds,
          })}{' '}
          {sweep.baselinePerCell
            ? t('The baseline was run on the same changed world.')
            : t('The baseline was run once, on the unchanged world.')}
        </p>
      </Card>

      <Card>
        <table className="w-full text-left text-sm">
          <thead className="text-slate-600">
            <tr>
              <th className="py-2 pr-4 font-medium">{t('Measure')}</th>
              <th className="py-2 pr-4 font-medium">{sweep.variant}</th>
              <th className="py-2 pr-4 font-medium">{sweep.baseline}</th>
              <th className="py-2 font-medium">{t('Difference (95% interval)')}</th>
            </tr>
          </thead>
          <tbody>
            {measures
              .filter(([key]) => cell.measures[key])
              .map(([key, label, digits]) => {
                const m = cell.measures[key];
                const clear = m.ciLow > 0 || m.ciHigh < 0;
                return (
                  <tr key={key} className={`border-t border-slate-100 ${key === 'per_100' ? 'font-semibold' : ''}`}>
                    <th scope="row" className="py-2 pr-4 font-normal">
                      {t(label)}
                    </th>
                    <td className="py-2 pr-4">{m.mean.toFixed(digits)}</td>
                    <td className="py-2 pr-4">{m.baselineMean.toFixed(digits)}</td>
                    <td className="py-2">
                      {signed(m.difference, digits)} ({signed(m.ciLow, digits)} {t('to')} {signed(m.ciHigh, digits)})
                      {!clear && <span className="ml-2 text-slate-500">{t('no clear difference')}</span>}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-slate-500">
          {t('Run {run}. Rebuilt and checked by scripts/reproduce.sh.', { run: sweep.runId })}
        </p>
      </Card>
    </Page>
  );
}
