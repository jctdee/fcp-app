import {
  type Station,
  estimateDriveMinutes,
  formatDistance,
  formatPeso,
  formatPricePerKwh,
  formatWait,
  googleMapsDirectionsUrl,
  wazeDirectionsUrl,
} from './stations';

export type StationWithDistance = Station & { distanceKm: number };

export type Action = { label: string; href: string };

export type IntentReply = {
  reply: string;
  action?: Action;
  actions?: Action[];
  pendingNav?: { stationId: string };
};

const CHARGER_RE = /\b(charger|chargers|station|stations|charging|ev|electric)\b/i;

export function classifyIntent(
  text: string,
  stations: StationWithDistance[],
  hasPosition: boolean,
): IntentReply | null {
  const t = text.toLowerCase().trim();
  if (!t) return null;

  const wantsCharger = CHARGER_RE.test(t);

  // Nearest / how far
  if (wantsCharger && /\b(nearest|closest|nearby|how far|how close)\b/i.test(t)) {
    if (!hasPosition) {
      return {
        reply:
          "I need your location first — tap 'Use my location' on the main screen.",
      };
    }
    const c = stations[0];
    if (!c) return { reply: "I couldn't find any stations near you." };

    const closestUnavailable =
      c.status === 'offline' || c.available === 0;

    if (closestUnavailable) {
      // Find the next nearest station that actually has a free charger.
      const alternative = stations.find(
        (s) => s.id !== c.id && s.status !== 'offline' && s.available > 0,
      );

      const closestSummary = `${c.name} is the closest (${formatDistance(c.distanceKm)}, ${formatPricePerKwh(c.pricePerKwh)})`;
      const closestState =
        c.status === 'offline'
          ? "but it's offline right now."
          : c.waitMinutes !== undefined
            ? `but it's full — next slot in ${formatWait(c.waitMinutes)}.`
            : "but it's full right now.";

      if (alternative) {
        return {
          reply: `${closestSummary} ${closestState} The next nearest with free chargers is ${alternative.name}, ${formatDistance(alternative.distanceKm)} away — about ${estimateDriveMinutes(alternative.distanceKm)} min drive — at ${formatPricePerKwh(alternative.pricePerKwh)}, ${alternative.available} of ${alternative.total} free.`,
          action: {
            label: `Directions to ${alternative.name}`,
            href: googleMapsDirectionsUrl(alternative.lat, alternative.lng),
          },
        };
      }

      return {
        reply: `${closestSummary} ${closestState} All nearby stations are full or offline right now.`,
        action: {
          label: `Directions to ${c.name}`,
          href: googleMapsDirectionsUrl(c.lat, c.lng),
        },
      };
    }

    return {
      reply: `The closest is ${c.name}, ${formatDistance(c.distanceKm)} away — about ${estimateDriveMinutes(c.distanceKm)} min drive — at ${formatPricePerKwh(c.pricePerKwh)}. ${c.available} of ${c.total} chargers are free.`,
      action: {
        label: `Directions to ${c.name}`,
        href: googleMapsDirectionsUrl(c.lat, c.lng),
      },
    };
  }

  // Directions / "guide me" — multi-turn: ask which map app first.
  if (
    /\b(direction|directions|navigate|take me|guide me|drive me|bring me|go to|route)\b/i.test(t)
  ) {
    if (!hasPosition) {
      return { reply: 'I need your location first to give directions.' };
    }
    const named = stations.find((s) => t.includes(s.name.toLowerCase()));
    const target = named ?? stations[0];
    if (!target) return { reply: "I don't have any stations to route to yet." };
    const lead = named
      ? `Got it — guiding you to ${target.name}.`
      : `Guiding you to the nearest, ${target.name}.`;
    return {
      reply: `${lead} Google Maps or Waze?`,
      actions: [
        {
          label: 'Google Maps',
          href: googleMapsDirectionsUrl(target.lat, target.lng),
        },
        {
          label: 'Waze',
          href: wazeDirectionsUrl(target.lat, target.lng),
        },
      ],
      pendingNav: { stationId: target.id },
    };
  }

  // How many
  if (wantsCharger && /\b(how many|count|number of)\b/i.test(t)) {
    if (!hasPosition) {
      return { reply: 'Once you share your location, I can count the nearby stations.' };
    }
    return { reply: `I can see ${stations.length} stations near you right now.` };
  }

  // Available / free / open
  if (wantsCharger && /\b(available|free|open|unoccupied)\b/i.test(t)) {
    if (!hasPosition) {
      return { reply: 'Share your location and I can tell you what is free nearby.' };
    }
    const open = stations.filter((s) => s.status === 'open' && s.available > 0);
    if (open.length === 0) {
      return { reply: 'All nearby stations are full or offline right now.' };
    }
    const closest = open[0];
    return {
      reply: `${open.length} of ${stations.length} stations have chargers free. Closest free one: ${closest.name}, ${formatDistance(closest.distanceKm)} away.`,
      action: {
        label: `Directions to ${closest.name}`,
        href: googleMapsDirectionsUrl(closest.lat, closest.lng),
      },
    };
  }

  // Cheapest
  if (
    /\b(cheap|cheapest|lowest price|lowest rate|best price|most affordable)\b/i.test(t)
  ) {
    if (!hasPosition) {
      return { reply: 'Share your location and I can find the cheapest one nearby.' };
    }
    if (stations.length === 0) return { reply: 'No stations available.' };
    const cheapest = [...stations].sort(
      (a, b) => a.pricePerKwh - b.pricePerKwh,
    )[0];
    return {
      reply: `The cheapest is ${cheapest.name} at ${formatPricePerKwh(cheapest.pricePerKwh)}, ${formatDistance(cheapest.distanceKm)} away.`,
      action: {
        label: `Directions to ${cheapest.name}`,
        href: googleMapsDirectionsUrl(cheapest.lat, cheapest.lng),
      },
    };
  }

  // Price / how much (general or named station)
  if (/\b(how much|price|cost|rate|per kwh|peso)\b/i.test(t)) {
    if (stations.length === 0) {
      return { reply: 'Share your location and I can quote prices for nearby stations.' };
    }
    const named = stations.find((s) => t.includes(s.name.toLowerCase()));
    const target = named ?? stations[0];
    const fillKwh = 50;
    const estimate = target.pricePerKwh * fillKwh;
    return {
      reply: `${target.name} charges ${formatPricePerKwh(target.pricePerKwh)}. A ${fillKwh} kWh top-up would be about ${formatPeso(estimate)}.`,
      action: {
        label: `Directions to ${target.name}`,
        href: googleMapsDirectionsUrl(target.lat, target.lng),
      },
    };
  }

  // Wait time / next slot
  if (
    /\b(wait|how long until|next slot|next available|when (will|is|does).*(free|available|open|done|finish|empty))\b/i.test(t)
  ) {
    if (!hasPosition) {
      return { reply: 'Share your location and I can check wait times for nearby stations.' };
    }
    if (stations.length === 0) {
      return { reply: "I don't have any stations to check." };
    }

    // Did the driver name a specific station?
    const named = stations.find((s) => t.includes(s.name.toLowerCase()));
    if (named) return waitReplyFor(named);

    // "how long until the nearest is free"
    if (/\b(near(est)?|closest)\b/i.test(t)) {
      return waitReplyFor(stations[0]);
    }

    // General — point to the closest full station with a known wait.
    const waiting = stations
      .filter((s) => s.waitMinutes !== undefined && s.status !== 'offline')
      .sort((a, b) => a.distanceKm - b.distanceKm);
    if (waiting.length === 0) {
      return {
        reply:
          'No nearby stations are full right now — pull into the closest open one.',
      };
    }
    return waitReplyFor(waiting[0]);
  }

  // ETA / drive time to a station
  if (
    /\b(eta|drive time|driving time)\b/i.test(t) ||
    /\bhow (many|long)\b.*\b(minute|drive|get there|reach|destination)\b/i.test(t)
  ) {
    if (!hasPosition) {
      return { reply: 'Share your location and I can estimate the drive time.' };
    }
    if (stations.length === 0) {
      return { reply: "I don't have any stations to estimate." };
    }
    const named = stations.find((s) => t.includes(s.name.toLowerCase()));
    const target = named ?? stations[0];
    const minutes = estimateDriveMinutes(target.distanceKm);
    return {
      reply: `${target.name} is about ${minutes} minute${minutes === 1 ? '' : 's'} away by car (${formatDistance(target.distanceKm)}).`,
      action: {
        label: `Directions to ${target.name}`,
        href: googleMapsDirectionsUrl(target.lat, target.lng),
      },
    };
  }

  // Fastest / highest power
  if (wantsCharger && /\b(fast|fastest|fast charger|high power|highest power|kw)\b/i.test(t)) {
    if (!hasPosition) {
      return { reply: 'Share your location first and I can find the fastest one.' };
    }
    const fastest = [...stations].sort((a, b) => b.maxPowerKw - a.maxPowerKw)[0];
    if (!fastest) return { reply: 'No stations available.' };
    return {
      reply: `The fastest nearby is ${fastest.name} at ${fastest.maxPowerKw} kW, ${formatDistance(fastest.distanceKm)} away.`,
      action: {
        label: `Directions to ${fastest.name}`,
        href: googleMapsDirectionsUrl(fastest.lat, fastest.lng),
      },
    };
  }

  return null;
}

function waitReplyFor(s: StationWithDistance): IntentReply {
  const directions = {
    label: `Directions to ${s.name}`,
    href: googleMapsDirectionsUrl(s.lat, s.lng),
  };

  if (s.status === 'offline') {
    return {
      reply: `${s.name} is offline right now — I don't have an estimated time for it to come back.`,
    };
  }

  if (s.available > 0) {
    return {
      reply: `${s.name} has ${s.available} of ${s.total} chargers free right now — no wait.`,
      action: directions,
    };
  }

  if (s.waitMinutes !== undefined) {
    return {
      reply: `${s.name} is full — next slot in ${formatWait(s.waitMinutes)}. It's ${formatDistance(s.distanceKm)} away.`,
      action: directions,
    };
  }

  return {
    reply: `${s.name} is full and I don't have a wait estimate for it right now.`,
  };
}
