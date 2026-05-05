import type { RankBy } from './find-stations';

const RANK_BY_VALUES: RankBy[] = ['nearest', 'cheapest', 'fastest', 'available'];

function isRankBy(x: unknown): x is RankBy {
  return typeof x === 'string' && (RANK_BY_VALUES as string[]).includes(x);
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

const FIND_STATIONS_LIMIT_MIN = 1;
const FIND_STATIONS_LIMIT_MAX = 5;
const FIND_STATIONS_LIMIT_DEFAULT = 3;

export type ValidatedFindStationsInput = {
  rank_by: RankBy;
  limit: number;
  only_open: boolean;
};

export type ToolInputError = { error: string };

export function validateFindStationsInput(
  raw: unknown,
): ValidatedFindStationsInput | ToolInputError {
  if (!isRecord(raw)) return { error: 'find_stations input must be an object' };
  if (!isRankBy(raw.rank_by)) {
    return {
      error: `rank_by must be one of ${RANK_BY_VALUES.join(', ')}`,
    };
  }

  let limit = FIND_STATIONS_LIMIT_DEFAULT;
  if (typeof raw.limit === 'number' && Number.isFinite(raw.limit)) {
    limit = Math.floor(raw.limit);
    if (limit < FIND_STATIONS_LIMIT_MIN) limit = FIND_STATIONS_LIMIT_MIN;
    if (limit > FIND_STATIONS_LIMIT_MAX) limit = FIND_STATIONS_LIMIT_MAX;
  }

  const only_open = typeof raw.only_open === 'boolean' ? raw.only_open : false;

  return { rank_by: raw.rank_by, limit, only_open };
}

export type ValidatedGetDirectionsInput = {
  station_id?: string;
  station_query?: string;
};

export function validateGetDirectionsInput(
  raw: unknown,
): ValidatedGetDirectionsInput | ToolInputError {
  if (!isRecord(raw)) {
    return { error: 'get_directions input must be an object' };
  }
  const id =
    typeof raw.station_id === 'string' ? raw.station_id.trim() : '';
  const query =
    typeof raw.station_query === 'string' ? raw.station_query.trim() : '';
  if (id.length === 0 && query.length === 0) {
    return { error: 'station_id or station_query is required' };
  }
  const out: ValidatedGetDirectionsInput = {};
  if (id.length > 0) out.station_id = id;
  if (query.length > 0) out.station_query = query;
  return out;
}
