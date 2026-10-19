import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { Button, Card, Notice, Page, SelectField, TextField } from '../components/ui';
import whatif from '../data/whatif.json';
import { intel } from '../lib/api';
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
  'survival-threshold': msg('How risky a booking must look before its passenger is asked'),
  'oracle-response': msg('The most asking could gain, by how readily passengers release'),
  'flexible-booking': msg('How many passengers choose to be rebooked if their driver withdraws'),
};

const parameterLabels: Record<string, string> = {
  'variant.intervention.budget.contacts_per_round': msg('Requests per round'),
  'demand.departure_tolerance_hours': msg('Hours either side of the chosen time'),
  'supply.publish_lead_days_min': msg('Days ahead, at the least, that a ride is published'),
  'variant.intervention.survival_threshold': msg('Ask when the estimated chance of lasting to departure is below'),
  'demand.intervention_response.early_release_probability': msg('Chance an asked passenger releases at once'),
  'demand.flexible_booking.share': msg('Share of passengers with a flexible booking'),
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

/** A sweep intel will run live, and how far its one setting may go. */
interface LiveSweep {
  name: string;
  parameter: string;
  min: number;
  max: number;
  whole: boolean;
}

interface LiveMeasure {
  baseline_mean: number;
  mean: number;
  difference: number;
  seeds: number;
  seeds_up: number;
  seeds_down: number;
}

interface LiveResult {
  variant: string;
  baseline: string;
  value: number;
  seeds: number;
  measures: Record<string, LiveMeasure | null>;
}

const SEED_CHOICES = [5, 10, 30];

/**
 * One value of the question's setting that no sweep was run at, simulated now by intel
 * (feature 87). Exploratory: means and the mean paired difference, with no interval, and
 * kept nowhere.
 */
function LiveRun({ sweep }: { sweep: Sweep }) {
  const t = useT();
  const offered = useQuery({ queryKey: ['whatif', 'live'], queryFn: () => intel<LiveSweep[]>('/v1/whatif/sweeps'), retry: false });
  const live = offered.data?.find((s) => s.name === sweep.name);
  const [value, setValue] = useState('');
  const [seeds, setSeeds] = useState(10);
  const run = useMutation({
    mutationFn: () =>
      intel<LiveResult>('/v1/whatif/run', { method: 'POST', body: { sweep: sweep.name, value: Number(value), seeds } }),
  });
  const label = parameterLabels[live?.parameter ?? ''];

  return (
    <Card>
      <h2 className="text-lg font-semibold">{t('Simulate another value now')}</h2>
      <p className="mt-1 text-sm text-slate-600">
        {t('Runs the simulator now, at a value no sweep was run at. Exploratory: means and the mean difference only, with no interval; kept nowhere, and never a report figure. About a second for every two seeds.')}
      </p>
      {offered.error && <Notice tone="error">{offered.error.message}</Notice>}
      {offered.data && !live && <p className="mt-3 text-sm text-slate-600">{t('This question cannot be simulated live.')}</p>}
      {live && (
        <form
          className="mt-3 grid gap-4 sm:grid-cols-3 sm:items-start"
          onSubmit={(event) => {
            event.preventDefault();
            run.mutate();
          }}
        >
          <TextField
            label={t('Value to simulate')}
            type="number"
            required
            min={live.min}
            max={live.max}
            step={live.whole ? 1 : 'any'}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            hint={`${label ? t(label) : live.parameter}: ${t('from {min} to {max}', { min: live.min, max: live.max })}`}
          />
          <SelectField label={t('Seeds')} value={String(seeds)} onChange={(event) => setSeeds(Number(event.target.value))}>
            {SEED_CHOICES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </SelectField>
          <div className="sm:pt-6">
            <Button type="submit" disabled={run.isPending}>
              {run.isPending ? t('Simulating…') : t('Simulate')}
            </Button>
          </div>
        </form>
      )}
      {run.error && <Notice tone="error">{run.error.message}</Notice>}
      {run.data && (
        <section aria-label={t('Live result')} className="mt-4">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-600">
              <tr>
                <th className="py-2 pr-4 font-medium">{t('Measure')}</th>
                <th className="py-2 pr-4 font-medium">{run.data.variant}</th>
                <th className="py-2 pr-4 font-medium">{run.data.baseline}</th>
                <th className="py-2 pr-4 font-medium">{t('Difference')}</th>
                <th className="py-2 font-medium">{t('Seeds up / down')}</th>
              </tr>
            </thead>
            <tbody>
              {measures
                .filter(([key]) => run.data.measures[key])
                .map(([key, measureLabel, digits]) => {
                  const m = run.data.measures[key]!;
                  return (
                    <tr key={key} className={`border-t border-slate-100 ${key === 'per_100' ? 'font-semibold' : ''}`}>
                      <th scope="row" className="py-2 pr-4 font-normal">
                        {t(measureLabel)}
                      </th>
                      <td className="py-2 pr-4">{m.mean.toFixed(digits)}</td>
                      <td className="py-2 pr-4">{m.baseline_mean.toFixed(digits)}</td>
                      <td className="py-2 pr-4">{signed(m.difference, digits)}</td>
                      <td className="py-2">
                        {m.seeds_up} / {m.seeds_down}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-slate-500">
            {t('{variant} compared with {baseline} at {value}, on {seeds} seeds, simulated just now. Exploratory: no interval, and not a report figure.', {
              variant: run.data.variant,
              baseline: run.data.baseline,
              value: run.data.value,
              seeds: run.data.seeds,
            })}
          </p>
        </section>
      )}
    </Card>
  );
}

/**
 * Saved simulator runs, explored by changing one setting at a time; every setting offered
 * there is one a sweep was run at, and every figure that run's. Below them an
 * administrator may simulate a value no sweep covered.
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
        {t('Simulator runs on synthetic data, not real passengers. Changing a setting shows another saved run, and only the settings a sweep was run at can be chosen there. Any other value can be simulated below, as an exploration.')}
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

      <LiveRun key={sweep.name} sweep={sweep} />
    </Page>
  );
}
