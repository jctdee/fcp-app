export type Car = {
  id: string;
  label: string;
  connectors: string[]; // empty array means "no filter — any car"
};

// Common EV models in the Philippine market and the connector standards they
// support. CCS2 covers most newer EVs; CHAdeMO is mostly older Japanese cars.
export const CARS: Car[] = [
  { id: 'any', label: 'Any car', connectors: [] },
  {
    id: 'byd',
    label: 'BYD (Atto 3 / Dolphin / Seal)',
    connectors: ['CCS2', 'Type 2'],
  },
  {
    id: 'nissan-leaf',
    label: 'Nissan Leaf',
    connectors: ['CHAdeMO', 'Type 2'],
  },
  {
    id: 'hyundai-kia',
    label: 'Hyundai / Kia EV',
    connectors: ['CCS2', 'Type 2'],
  },
  { id: 'tesla', label: 'Tesla', connectors: ['CCS2', 'Type 2'] },
  { id: 'mg', label: 'MG ZS EV / 4', connectors: ['CCS2', 'Type 2'] },
  {
    id: 'vinfast',
    label: 'VinFast (VF 3 / VF 5 / VF 8)',
    connectors: ['CCS2', 'Type 2'],
  },
  {
    id: 'greengsm',
    // Demo-only profile: scoped to CHAdeMO so picking GreenGSM visibly excludes
    // the closest CCS2/Type 2 stations (Greenbelt 5 and Shell Magallanes) and
    // forces the bot to recommend a station further out.
    label: 'GreenGSM (VinFast fleet)',
    connectors: ['CHAdeMO'],
  },
  { id: 'phev', label: 'PHEV / Hybrid (AC only)', connectors: ['Type 2'] },
];

export function isStationCompatible(
  stationConnectors: string[],
  carConnectors: string[],
): boolean {
  if (carConnectors.length === 0) return true;
  return stationConnectors.some((c) => carConnectors.includes(c));
}
