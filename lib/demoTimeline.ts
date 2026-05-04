import type { Station } from './stations';

export type DemoEvent = {
  at: number; // ms since demo start
  stationId: string;
  patch: Partial<Station>;
};

// Scripted timeline used by Demo Mode. Tweak `at` values to control demo pacing.
export const DEMO_TIMELINE: DemoEvent[] = [
  // 4s: Greenbelt 5 frees a slot — the headline auto-prompt moment
  {
    at: 4_000,
    stationId: 'st-1',
    patch: { available: 1, status: 'open', waitMinutes: undefined },
  },
  // 8s: Glorietta also opens up
  {
    at: 8_000,
    stationId: 'st-2',
    patch: { available: 1, status: 'open', waitMinutes: undefined },
  },
  // 12s: Greenbelt 5 fills again
  {
    at: 12_000,
    stationId: 'st-1',
    patch: { available: 0, status: 'busy', waitMinutes: 10 },
  },
  // 16s: SM Mall of Asia frees up
  {
    at: 16_000,
    stationId: 'st-5',
    patch: { available: 2, status: 'open', waitMinutes: undefined },
  },
  // 20s: Robinsons Galleria comes back online
  {
    at: 20_000,
    stationId: 'st-7',
    patch: { status: 'open', available: 2, total: 2 },
  },
];
