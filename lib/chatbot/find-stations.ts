import { CARS, isStationCompatible } from '@/lib/cars';
import {
  estimateDriveMinutes,
  formatDistance,
  formatPricePerKwh,
  formatWait,
  type StationStatus,
} from '@/lib/stations';
import type { StationWithDistance } from './view';

export type RankBy = 'nearest' | 'cheapest' | 'fastest' | 'available';

export type FormattedStation = {
  id: string;
  name: string;
  address: string;
  connectors: string[];
  status: StationStatus;
  available: number;
  total: number;
  maxPowerKw: number;
  pricePerKwh: number;
  distanceKm: number;
  distanceLabel: string;
  priceLabel: string;
  waitLabel: string | null;
  etaMinutes: number;
};

export type FindStationsInput = {
  rank_by: RankBy;
  limit: number;
  only_open: boolean;
  position: { lat: number; lng: number } | null;
  carId: string;
  view: StationWithDistance[];
};

export type FindStationsResult =
  | { results: FormattedStation[] }
  | { error: 'no_location' };

function format(s: StationWithDistance): FormattedStation {
  return {
    id: s.id,
    name: s.name,
    address: s.address,
    connectors: s.connectors,
    status: s.status,
    available: s.available,
    total: s.total,
    maxPowerKw: s.maxPowerKw,
    pricePerKwh: s.pricePerKwh,
    distanceKm: s.distanceKm,
    distanceLabel: formatDistance(s.distanceKm),
    priceLabel: formatPricePerKwh(s.pricePerKwh),
    waitLabel: s.waitMinutes !== undefined ? formatWait(s.waitMinutes) : null,
    etaMinutes: estimateDriveMinutes(s.distanceKm),
  };
}

export function findStations(input: FindStationsInput): FindStationsResult {
  if (input.position === null) {
    return { error: 'no_location' };
  }

  const car = CARS.find((c) => c.id === input.carId) ?? CARS[0];
  let filtered = input.view.filter((s) =>
    isStationCompatible(s.connectors, car.connectors),
  );

  if (input.only_open) {
    filtered = filtered.filter(
      (s) => s.status === 'open' && s.available > 0,
    );
  }

  if (input.rank_by === 'available') {
    filtered = filtered.filter(
      (s) => s.status === 'open' && s.available > 0,
    );
  }

  const sorted = [...filtered].sort((a, b) => {
    switch (input.rank_by) {
      case 'nearest':
        return a.distanceKm - b.distanceKm;
      case 'cheapest':
        return a.pricePerKwh - b.pricePerKwh;
      case 'fastest':
        return b.maxPowerKw - a.maxPowerKw;
      case 'available':
        return a.distanceKm - b.distanceKm;
    }
  });

  return { results: sorted.slice(0, input.limit).map(format) };
}
