import { type Station, haversineKm } from '@/lib/stations';
import type { StationOverride } from './overrides';

export type StationWithDistance = Station & { distanceKm: number };

export function buildStationView(input: {
  position: { lat: number; lng: number } | null;
  overrides: Record<string, StationOverride>;
  canonical: readonly Station[];
}): StationWithDistance[] {
  const { position, overrides, canonical } = input;
  return canonical
    .map((s) => {
      const patch = overrides[s.id];
      const merged: Station = patch ? { ...s, ...patch } : s;
      return {
        ...merged,
        distanceKm: position
          ? haversineKm(position.lat, position.lng, s.lat, s.lng)
          : Infinity,
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
