import {
  ArrowRight,
  BatteryCharging,
  Bus,
  CalendarClock,
  Check,
  Footprints,
  HeartHandshake,
  Languages,
  MessagesSquare,
  Search,
  ShieldCheck,
  Ticket,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { CountUp } from '../components/countup';
import { useT } from '../lib/i18n';

// The corridor as drawn on the front page: north up, each town where it lies, so Pune sits
// above and a little west of Kolhapur. Decoration only; the real route comes from OSRM.
const TOWNS = [
  { name: 'Kolhapur', x: 146, y: 228 },
  { name: 'Karad', x: 132, y: 164 },
  { name: 'Satara', x: 92, y: 121 },
  { name: 'Pune', x: 54, y: 29 },
] as const;
const ROAD = 'M146 228 C 152 202, 126 186, 132 164 S 98 140, 92 121 S 48 64, 54 29';

/** A section that rises into place the first time it is scrolled to; shown at once where that cannot be told. */
function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (shown || !ref.current) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [shown]);
  return (
    <div ref={ref} className={`${shown ? 'animate-pop-in' : 'opacity-0'} ${className}`}>
      {children}
    </div>
  );
}

function CorridorArt() {
  const t = useT();
  const still = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[19rem]">
      <svg viewBox="0 0 200 260" className="w-full drop-shadow-[0_10px_30px_rgb(0_0_0_/_0.25)]">
        <path d={ROAD} fill="none" stroke="rgb(255 255 255 / 0.18)" strokeWidth="16" strokeLinecap="round" />
        <path d={ROAD} fill="none" stroke="#fff" strokeWidth="2.5" strokeDasharray="7 7" strokeLinecap="round" className="animate-route-dash" />
        {TOWNS.map((town, index) => {
          const end = index === 0 || index === TOWNS.length - 1;
          // Kolhapur's name goes under it, leaving the corner beside it for a note.
          const label = index === 0 ? { x: town.x, y: town.y + 24, anchor: 'middle' }
            : town.x > 100 ? { x: town.x - 14, y: town.y + 4, anchor: 'end' }
              : { x: town.x + 14, y: town.y + 4, anchor: 'start' };
          return (
            <g key={town.name}>
              <circle cx={town.x} cy={town.y} r={end ? 8 : 5.5} fill="#fff" />
              <circle cx={town.x} cy={town.y} r={end ? 3.5 : 2.5} fill="#0f766e" />
              <text x={label.x} y={label.y} textAnchor={label.anchor} className="fill-white text-[11px] font-semibold">
                {t(town.name)}
              </text>
            </g>
          );
        })}
        <circle r="6" fill="#fef08a" stroke="#fff" strokeWidth="2" cx={still ? 92 : 0} cy={still ? 121 : 0}>
          {!still && (
            <animateMotion dur="6s" repeatCount="indefinite" path={ROAD} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.25 1" />
          )}
        </circle>
      </svg>
      {/* Each note in a corner the road and the names leave free. */}
      <FloatingChip icon={Undo2} className="-right-2 top-[24%] sm:-right-8" delay="0.5s">
        {t('The earlier you cancel, the more comes back')}
      </FloatingChip>
      <FloatingChip icon={Ticket} className="-left-3 top-[47%] sm:-left-10" delay="0.8s">
        {t('Your seat is held while you pay')}
      </FloatingChip>
      <FloatingChip icon={ShieldCheck} className="-left-3 bottom-[2%] sm:-left-6" delay="1.1s">
        {t('An emergency button on every trip')}
      </FloatingChip>
    </div>
  );
}

function FloatingChip({ icon: Icon, className, delay, children }: { icon: LucideIcon; className: string; delay: string; children: ReactNode }) {
  return (
    <span
      style={{ animationDelay: delay }}
      className={`absolute flex max-w-[9.75rem] animate-pop-in items-center gap-2 rounded-2xl bg-white/90 px-3 py-2 text-[12px] font-semibold leading-tight text-[#134e4a] shadow-float backdrop-blur ${className}`}
    >
      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-xl bg-[#ccfbf1] text-[#0f766e]">
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </span>
      {children}
    </span>
  );
}

function Hero() {
  const t = useT();
  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#14b8a6] via-[#0f766e] to-[#134e4a] px-6 pb-10 pt-9 text-white shadow-float sm:px-10 sm:pb-12 sm:pt-12">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-[#5eead4]/30 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-20 -z-10 h-80 w-80 rounded-full bg-[#fde68a]/20 blur-3xl" />
      <div className="grid items-center gap-10 md:grid-cols-[1.15fr_1fr]">
        <div className="space-y-6">
          <p className="inline-flex flex-wrap items-center gap-x-2 rounded-full bg-white/15 px-3 py-1 text-[13px] font-semibold tracking-wide ring-1 ring-inset ring-white/25">
            {TOWNS.map((town, index) => (
              <span key={town.name} className="inline-flex items-center gap-2">
                {index > 0 && <span aria-hidden="true">·</span>}
                {t(town.name)}
              </span>
            ))}
          </p>
          <h1 className="text-balance text-[34px] font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
            {t('Share the road between Kolhapur and Pune')}
          </h1>
          <p className="max-w-xl text-[17px] leading-relaxed text-white/85">
            {t('Book a seat in a car already making the trip, or fill the empty seats in yours. If your plans change, JOURNEX reminds you to give the seat back while someone else can still take it.')}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/register?as=passenger"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[15px] font-bold text-[#0f766e] shadow-lg shadow-black/10 transition-transform hover:-translate-y-0.5 active:scale-[0.97] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
            >
              <Search aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
              {t('Find a ride')}
            </Link>
            <Link
              to="/register?as=driver"
              className="inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-3 text-[15px] font-bold text-white ring-1 ring-inset ring-white/40 transition-transform hover:-translate-y-0.5 hover:bg-white/20 active:scale-[0.97] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
            >
              {t('Offer a ride')}
              <ArrowRight aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
            </Link>
          </div>
          <p className="text-sm text-white/80">
            {t('Already have an account?')}{' '}
            <Link to="/login" className="font-semibold text-white underline decoration-white/50 underline-offset-4 hover:decoration-white">
              {t('Sign in')}
            </Link>
          </p>
        </div>
        <CorridorArt />
      </div>
    </section>
  );
}

function Facts() {
  const t = useT();
  const facts = [
    { value: 230, label: t('km of road, end to end') },
    { value: 4, label: t('towns on the way') },
    { value: 7, label: t('days ahead you can book') },
    { value: 3, label: t('languages') },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {facts.map((fact) => (
        <div key={fact.label} className="flex flex-col rounded-2xl bg-surface px-4 py-4 text-center shadow-card ring-1 ring-slate-900/[0.04]">
          <dt className="text-[13px] font-medium text-slate-500">{fact.label}</dt>
          <dd className="order-first text-3xl font-extrabold tabular-nums tracking-tight text-teal-800">
            <CountUp value={fact.value} format={(n) => String(Math.round(n))} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-[24px] font-bold tracking-tight text-slate-900 sm:text-[28px]">{children}</h2>;
}

function HowItWorks() {
  const t = useT();
  const steps: { icon: LucideIcon; title: string; body: string }[] = [
    {
      icon: Search,
      title: t('Search the corridor'),
      body: t('Choose where you start and where you are going, or a point on the map. Rides passing within reach are shown with the walk to where you board.'),
    },
    {
      icon: Ticket,
      title: t('Book a seat'),
      body: t('Your seat is held while you pay. Many drivers confirm at once; the others answer your request.'),
    },
    {
      icon: MessagesSquare,
      title: t('Travel together'),
      body: t('Chat with your driver and follow the car on the map. The emergency button puts calling 112 first.'),
    },
  ];
  return (
    <Reveal className="space-y-4">
      <SectionTitle>{t('How it works')}</SectionTitle>
      <ol className="grid gap-3 md:grid-cols-3">
        {steps.map(({ icon: Icon, title, body }, index) => (
          <li key={title} className="relative overflow-hidden rounded-2xl bg-surface p-5 shadow-card ring-1 ring-slate-900/[0.04]">
            <span aria-hidden="true" className="absolute right-4 top-2 text-[64px] font-black leading-none text-slate-900/[0.05]">
              {index + 1}
            </span>
            <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600/[0.12] text-teal-800">
              <Icon className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <h3 className="mt-4 text-[17px] font-semibold text-slate-900">{title}</h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{body}</p>
          </li>
        ))}
      </ol>
    </Reveal>
  );
}

/** The project's one idea, for anyone: a seat given back early is a seat someone else can take. */
function EarlyMatters() {
  const t = useT();
  return (
    <Reveal>
      <section className="grid gap-6 rounded-3xl bg-surface p-6 shadow-card ring-1 ring-slate-900/[0.04] sm:p-8 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div className="space-y-3">
          <SectionTitle>{t('Why giving a seat back early matters')}</SectionTitle>
          <p className="text-[15px] leading-relaxed text-slate-600">
            {t('A seat given back three days before departure can still be booked by someone else. Given back two hours before, it usually travels empty. So JOURNEX asks early, gives back more of the fare the earlier you cancel, and never cancels anyone on a guess.')}
          </p>
          <p className="text-[15px] font-medium leading-relaxed text-slate-800">
            {t('The project measures what counts: rides completed for every 100 searches, not bookings made.')}
          </p>
        </div>
        <div aria-hidden="true" className="space-y-2">
          <div className="h-3 rounded-full bg-gradient-to-r from-[#10b981] via-[#f59e0b] to-[#ef4444]" />
          <div className="flex justify-between gap-4 text-[13px] font-medium">
            <span className="flex max-w-[45%] items-start gap-1.5 text-emerald-800">
              <Check className="mt-0.5 h-3.5 w-3.5 flex-none" strokeWidth={3} />
              {t('Days before: someone else can book it')}
            </span>
            <span className="max-w-[45%] text-right text-red-700">{t('Hours before: the seat is usually lost')}</span>
          </div>
        </div>
      </section>
    </Reveal>
  );
}

const featureTones = [
  'bg-teal-600/[0.12] text-teal-800',
  'bg-red-100 text-red-800',
  'bg-amber-100 text-amber-900',
  'bg-emerald-100 text-emerald-900',
  'bg-sky-100 text-sky-900',
  'bg-slate-100 text-slate-800',
];

function Features() {
  const t = useT();
  const features: { icon: LucideIcon; title: string; body: string }[] = [
    { icon: Footprints, title: t('Pickups on the way'), body: t('A driver can take a few minutes out of the way to pick you up where the road passes.') },
    { icon: HeartHandshake, title: t('Women-only rides'), body: t('A driver can offer a ride to women only; only women see it or can book it.') },
    { icon: CalendarClock, title: t('Flexible bookings'), body: t('Choose a window of time. If your driver withdraws, JOURNEX looks for another ride in it, at the same price.') },
    { icon: BatteryCharging, title: t('Electric cars'), body: t('A route an electric car cannot cover on one charge is caught before it is published, with chargers along the way.') },
    { icon: Bus, title: t('Buses when no car goes'), body: t('When no ride fits, buses on the same stretch are suggested.') },
    { icon: Languages, title: t('Three languages'), body: t('Every screen in English, Hindi and Marathi, receipts included.') },
  ];
  return (
    <Reveal className="space-y-4">
      <SectionTitle>{t('Made for this road')}</SectionTitle>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, body }, index) => (
          <li
            key={title}
            className="group rounded-2xl bg-surface p-5 shadow-card ring-1 ring-slate-900/[0.04] transition-[transform,box-shadow] duration-300 ease-settle hover:-translate-y-1 hover:shadow-float"
          >
            <span aria-hidden="true" className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-transform duration-300 ease-spring group-hover:scale-110 ${featureTones[index]}`}>
              <Icon className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <h3 className="mt-4 text-[17px] font-semibold text-slate-900">{title}</h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{body}</p>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

function Side({ title, points, action, to, gradient }: { title: string; points: string[]; action: string; to: string; gradient: string }) {
  return (
    <section className={`flex flex-col gap-4 rounded-3xl bg-gradient-to-br p-6 text-white shadow-float sm:p-7 ${gradient}`}>
      <h2 className="text-[22px] font-bold tracking-tight">{title}</h2>
      <ul className="flex-1 space-y-2.5">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-2.5 text-[15px] leading-snug text-white/90">
            <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white/20">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            {point}
          </li>
        ))}
      </ul>
      <Link
        to={to}
        className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-white px-5 py-2.5 text-[15px] font-bold text-[#18181b] shadow-lg shadow-black/10 transition-transform hover:-translate-y-0.5 active:scale-[0.97] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
      >
        {action}
        <ArrowRight aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
      </Link>
    </section>
  );
}

function TwoSides() {
  const t = useT();
  return (
    <Reveal className="grid gap-4 md:grid-cols-2">
      <Side
        title={t('For passengers')}
        points={[t('Pay only for the stretch you ride'), t("Each driver's record of rides kept, and their ratings"), t('Passes that waive the service fee')]}
        action={t('Create a passenger account')}
        to="/register?as=passenger"
        gradient="from-[#14b8a6] to-[#0f766e]"
      />
      <Side
        title={t('For drivers')}
        points={[t('Publish once, or repeat a ride every week'), t('Approve each passenger, or let them book at once'), t('A lower fee for drivers who keep their rides')]}
        action={t('Create a driver account')}
        to="/register?as=driver"
        gradient="from-[#6366f1] to-[#4338ca]"
      />
    </Reveal>
  );
}

/** What a signed-out visitor sees first: what JOURNEX is, and the ways in. */
export function LandingPage() {
  const t = useT();
  return (
    <div className="space-y-10 sm:space-y-14">
      <Hero />
      <Facts />
      <HowItWorks />
      <EarlyMatters />
      <Features />
      <TwoSides />
      <footer className="border-t border-slate-900/[0.07] pt-6 text-center text-[13px] leading-relaxed text-slate-500">
        {t('A final-year project at DYPCET, Kolhapur. Payments, text messages and calls are simulated unless real services are connected.')}
      </footer>
    </div>
  );
}
