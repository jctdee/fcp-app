import type { Station } from '@/lib/stations';

export type ResolveInput = {
  station_id?: string;
  station_query?: string;
};

export type ResolveSuccess = { ok: true; station: Station };

export type ResolveFailure =
  | { ok: false; reason: 'unknown_station'; query: string }
  | {
      ok: false;
      reason: 'ambiguous_station';
      query: string;
      candidates: { id: string; name: string }[];
    }
  | { ok: false; reason: 'missing_argument' };

export type ResolveResult = ResolveSuccess | ResolveFailure;

export function resolveStation(
  input: ResolveInput,
  canonical: readonly Station[],
): ResolveResult {
  const id =
    typeof input.station_id === 'string' ? input.station_id.trim() : '';
  if (id.length > 0) {
    const hit = canonical.find((s) => s.id === id);
    if (hit) return { ok: true, station: hit };
  }

  const q =
    typeof input.station_query === 'string'
      ? input.station_query.trim().toLowerCase()
      : '';
  if (q.length > 0) {
    const matches = canonical.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q),
    );
    if (matches.length === 1) {
      return { ok: true, station: matches[0] };
    }
    if (matches.length === 0) {
      return { ok: false, reason: 'unknown_station', query: q };
    }
    return {
      ok: false,
      reason: 'ambiguous_station',
      query: q,
      candidates: matches.map((s) => ({ id: s.id, name: s.name })),
    };
  }

  if (id.length > 0) {
    // station_id was provided but didn't match — treat as unknown_station.
    return { ok: false, reason: 'unknown_station', query: id };
  }

  return { ok: false, reason: 'missing_argument' };
}
