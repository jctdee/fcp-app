export type StationStatus = 'open' | 'busy' | 'offline';

export type Station = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  connectors: string[];
  maxPowerKw: number;
  available: number;
  total: number;
  status: StationStatus;
  pricePerKwh: number; // Philippine pesos per kWh
  waitMinutes?: number; // estimated minutes until a slot frees up; only set when full
};

// Real Metro Manila locations. Coordinates are approximate but each address is
// a real, recognizable spot — judges and testers familiar with Manila will see
// names they trust.
export const STATIONS: Station[] = [
  {
    id: 'st-1',
    name: 'Greenbelt 5 EV Hub',
    address: 'Greenbelt 5, Ayala Center, Makati',
    lat: 14.5527,
    lng: 121.0214,
    connectors: ['CCS2'],
    maxPowerKw: 50,
    available: 0,
    total: 4,
    status: 'busy',
    pricePerKwh: 28,
    waitMinutes: 12,
  },
  {
    id: 'st-2',
    name: 'Glorietta ChargeStop',
    address: 'Glorietta 4 Carpark, Makati',
    lat: 14.5511,
    lng: 121.0240,
    connectors: ['CHAdeMO'],
    maxPowerKw: 150,
    available: 0,
    total: 3,
    status: 'busy',
    pricePerKwh: 32,
    waitMinutes: 8,
  },
  {
    id: 'st-3',
    name: 'Shell Magallanes',
    address: 'EDSA cor. South Superhighway, Makati',
    lat: 14.5377,
    lng: 121.0140,
    connectors: ['Type 2'],
    maxPowerKw: 22,
    available: 4,
    total: 6,
    status: 'open',
    pricePerKwh: 18,
  },
  {
    id: 'st-4',
    name: 'BGC High Street Charge',
    address: '7th Ave, Bonifacio Global City, Taguig',
    lat: 14.5503,
    lng: 121.0490,
    connectors: ['CCS2'],
    maxPowerKw: 180,
    available: 3,
    total: 8,
    status: 'open',
    pricePerKwh: 34,
  },
  {
    id: 'st-5',
    name: 'SM Mall of Asia EV',
    address: 'Seaside Blvd, Pasay City',
    lat: 14.5352,
    lng: 120.9826,
    connectors: ['CCS2', 'CHAdeMO', 'Type 2'],
    maxPowerKw: 350,
    available: 0,
    total: 4,
    status: 'busy',
    pricePerKwh: 48,
    waitMinutes: 25,
  },
  {
    id: 'st-6',
    name: 'NAIA Terminal 3 Charge Bay',
    address: 'NAIA-3 Carpark, Pasay',
    lat: 14.5126,
    lng: 121.0194,
    connectors: ['CCS2', 'Type 2'],
    maxPowerKw: 250,
    available: 5,
    total: 6,
    status: 'open',
    pricePerKwh: 42,
  },
  {
    id: 'st-7',
    name: 'Robinsons Galleria Ortigas',
    address: 'EDSA cor. Ortigas Ave, Quezon City',
    lat: 14.5901,
    lng: 121.0567,
    connectors: ['CHAdeMO'],
    maxPowerKw: 50,
    available: 0,
    total: 2,
    status: 'offline',
    pricePerKwh: 25,
  },
  {
    id: 'st-8',
    name: 'Petron NLEX Balintawak',
    address: 'NLEX Balintawak Toll, Quezon City',
    lat: 14.6608,
    lng: 121.0089,
    connectors: ['CCS2', 'CHAdeMO'],
    maxPowerKw: 350,
    available: 2,
    total: 4,
    status: 'open',
    pricePerKwh: 45,
  },
];

export function getStations(): Station[] {
  return STATIONS;
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
}

export function formatPricePerKwh(pricePerKwh: number): string {
  return `${formatPeso(pricePerKwh)}/kWh`;
}

export function formatWait(minutes: number): string {
  if (minutes < 1) return '<1 min';
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `~${h} hr` : `~${h} hr ${m} min`;
}

// Average urban driving speed used for ETA estimates. 18 km/h reflects normal
// Manila traffic — drop to ~12 for rush hour, raise to ~25 for off-peak.
const AVG_DRIVING_SPEED_KMH = 18;

export function estimateDriveMinutes(km: number): number {
  return Math.max(1, Math.ceil((km / AVG_DRIVING_SPEED_KMH) * 60));
}

export function formatDriveTime(km: number): string {
  const minutes = estimateDriveMinutes(km);
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `~${h} hr` : `~${h} hr ${m} min`;
}

export function googleMapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export function wazeDirectionsUrl(lat: number, lng: number): string {
  return `https://waze.com/ul?ll=${lat}%2C${lng}&navigate=yes`;
}
