import { CARS } from '@/lib/cars';

export const MAX_PRIOR_TURNS = 10;
export const MAX_TEXT_LEN = 1000;

const KNOWN_CAR_IDS = new Set(CARS.map((c) => c.id));

export type ValidatedPriorTurn = { speaker: 'driver' | 'bot'; text: string };

export type ValidatedRequest = {
  priorTurns: ValidatedPriorTurn[];
  driverMessage: string;
  latestAnnouncement?: string;
  position: { lat: number; lng: number } | null;
  carId: string;
  rawOverrides: unknown;
};

export type ValidationError = { error: string };

export function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

export function validateChatRequest(
  body: unknown,
): ValidatedRequest | ValidationError {
  if (!isRecord(body)) {
    return { error: 'body must be a JSON object' };
  }

  const dm = body.driverMessage;
  if (typeof dm !== 'string' || dm.trim().length === 0) {
    return { error: 'driverMessage required' };
  }
  const driverMessage = dm.slice(0, MAX_TEXT_LEN);

  let priorTurns: ValidatedPriorTurn[] = [];
  if (Array.isArray(body.priorTurns)) {
    priorTurns = body.priorTurns
      .slice(-MAX_PRIOR_TURNS)
      .filter(isRecord)
      .map((t) => {
        const speaker: 'driver' | 'bot' =
          t.speaker === 'driver' || t.speaker === 'bot' ? t.speaker : 'driver';
        const text =
          typeof t.text === 'string' ? t.text.slice(0, MAX_TEXT_LEN) : '';
        return { speaker, text };
      })
      .filter((t) => t.text.length > 0);
  }

  const latestAnnouncement =
    typeof body.latestAnnouncement === 'string'
      ? body.latestAnnouncement.slice(0, MAX_TEXT_LEN)
      : undefined;

  let position: ValidatedRequest['position'] = null;
  if (isRecord(body.position)) {
    const lat = body.position.lat;
    const lng = body.position.lng;
    if (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      position = { lat, lng };
    }
  }

  const carId =
    typeof body.carId === 'string' && KNOWN_CAR_IDS.has(body.carId)
      ? body.carId
      : 'any';

  const rawOverrides = isRecord(body.overrides) ? body.overrides : {};

  return {
    priorTurns,
    driverMessage,
    latestAnnouncement,
    position,
    carId,
    rawOverrides,
  };
}
