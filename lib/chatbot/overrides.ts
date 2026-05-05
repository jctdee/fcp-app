import type { Station, StationStatus } from '@/lib/stations';

// The four whitelisted, mutable demo-override fields. Any other field on a
// client-supplied station patch is dropped — name, address, lat/lng, price,
// power, connectors all come from canonical STATIONS only.
export type StationOverride = Partial<
  Pick<Station, 'available' | 'status' | 'waitMinutes' | 'total'>
>;

// Wire-form override used when the client serializes its in-memory overrides
// to JSON. JSON.stringify drops `undefined` values, so to preserve the "clear
// the wait" signal we map `waitMinutes: undefined` to `waitMinutes: null` on
// the wire. The server's sanitizer recognizes `null` as "clear".
export type SerializableOverride = {
  available?: number;
  status?: StationStatus;
  waitMinutes?: number | null;
  total?: number;
};

export type SerializableOverrides = Record<string, SerializableOverride>;

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

function isStationStatus(x: unknown): x is StationStatus {
  return x === 'open' || x === 'busy' || x === 'offline';
}

const MAX_AVAILABLE = 50;
const MAX_TOTAL = 50;
const MAX_WAIT_MINUTES = 600;

export function sanitizeOverrides(
  raw: unknown,
  canonical: readonly Station[],
): Record<string, StationOverride> {
  if (!isRecord(raw)) return {};
  const ids = new Set(canonical.map((s) => s.id));
  const out: Record<string, StationOverride> = {};

  for (const [stationId, value] of Object.entries(raw)) {
    if (!ids.has(stationId) || !isRecord(value)) continue;
    const patch: StationOverride = {};

    if (
      typeof value.available === 'number' &&
      Number.isFinite(value.available) &&
      value.available >= 0 &&
      value.available <= MAX_AVAILABLE
    ) {
      patch.available = Math.floor(value.available);
    }

    if (isStationStatus(value.status)) {
      patch.status = value.status;
    }

    if (value.waitMinutes === null) {
      // Explicit "clear the wait" signal — set the key with undefined so the
      // spread in buildStationView wipes any inherited waitMinutes.
      patch.waitMinutes = undefined;
    } else if (
      typeof value.waitMinutes === 'number' &&
      Number.isFinite(value.waitMinutes) &&
      value.waitMinutes >= 0 &&
      value.waitMinutes <= MAX_WAIT_MINUTES
    ) {
      patch.waitMinutes = value.waitMinutes;
    }

    if (
      typeof value.total === 'number' &&
      Number.isFinite(value.total) &&
      value.total >= 0 &&
      value.total <= MAX_TOTAL
    ) {
      patch.total = Math.floor(value.total);
    }

    out[stationId] = patch;
  }
  return out;
}

// Maps in-memory overrides to a wire form where `waitMinutes: undefined` is
// rewritten as `waitMinutes: null` so JSON.stringify preserves the clear
// signal for the server to recognize.
export function normalizeOverridesForWire(
  overrides: Record<string, StationOverride>,
): SerializableOverrides {
  const out: SerializableOverrides = {};
  for (const [id, patch] of Object.entries(overrides)) {
    const wire: SerializableOverride = {};
    if ('available' in patch && patch.available !== undefined) {
      wire.available = patch.available;
    }
    if ('status' in patch && patch.status !== undefined) {
      wire.status = patch.status;
    }
    if ('total' in patch && patch.total !== undefined) {
      wire.total = patch.total;
    }
    if ('waitMinutes' in patch) {
      wire.waitMinutes =
        patch.waitMinutes === undefined ? null : patch.waitMinutes;
    }
    out[id] = wire;
  }
  return out;
}
