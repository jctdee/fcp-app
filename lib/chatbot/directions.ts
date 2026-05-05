import {
  type Station,
  googleMapsDirectionsUrl,
  wazeDirectionsUrl,
} from '@/lib/stations';

export type Directions = {
  id: string;
  name: string;
  googleMapsUrl: string;
  wazeUrl: string;
};

export class UnknownStationError extends Error {
  constructor(stationId: string) {
    super(`Unknown station id: ${stationId}`);
    this.name = 'UnknownStationError';
  }
}

// Build both Maps + Waze URLs from canonical station coordinates only. The
// resolver is expected to have produced a valid stationId before this is
// called; this function throws on unknown ids as defense-in-depth.
export function getDirections(
  stationId: string,
  canonical: readonly Station[],
): Directions {
  const station = canonical.find((s) => s.id === stationId);
  if (!station) throw new UnknownStationError(stationId);
  return {
    id: station.id,
    name: station.name,
    googleMapsUrl: googleMapsDirectionsUrl(station.lat, station.lng),
    wazeUrl: wazeDirectionsUrl(station.lat, station.lng),
  };
}
