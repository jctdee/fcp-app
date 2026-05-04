'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CARS, isStationCompatible } from '@/lib/cars';
import { DEMO_TIMELINE } from '@/lib/demoTimeline';
import { STATIONS, haversineKm, type Station } from '@/lib/stations';
import Chatbot from './Chatbot';
import StationList from './StationList';

export type Position = { lat: number; lng: number; label?: string };
export type StationWithDistance = Station & { distanceKm: number };
export type Announcement = { id: string; text: string };

type Overrides = Record<string, Partial<Station>>;

export default function AppShell() {
  const [position, setPosition] = useState<Position | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [overrides, setOverrides] = useState<Overrides>({});
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [carId, setCarId] = useState<string>('any');

  const car = useMemo(
    () => CARS.find((c) => c.id === carId) ?? CARS[0],
    [carId],
  );

  // Demo timeline runner — kicks off setTimeouts on toggle, clears on toggle off.
  useEffect(() => {
    if (!demoMode) {
      setOverrides({});
      return;
    }
    const timers = DEMO_TIMELINE.map((event) =>
      window.setTimeout(() => {
        setOverrides((prev) => ({
          ...prev,
          [event.stationId]: {
            ...(prev[event.stationId] ?? {}),
            ...event.patch,
          },
        }));
      }, event.at),
    );
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [demoMode]);

  // Raw stations with distance + overrides applied. No car filter — the
  // chatbot needs the full set so it can refilter on the fly when the driver
  // mentions their car in conversation.
  const allStations = useMemo<StationWithDistance[]>(() => {
    if (!position) return [];
    return STATIONS.map((s) => ({
      ...s,
      ...(overrides[s.id] ?? {}),
      distanceKm: haversineKm(position.lat, position.lng, s.lat, s.lng),
    })).sort((a, b) => a.distanceKm - b.distanceKm);
  }, [position, overrides]);

  // Filtered subset for the UI list/map.
  const stations = useMemo<StationWithDistance[]>(
    () =>
      allStations.filter((s) =>
        isStationCompatible(s.connectors, car.connectors),
      ),
    [allStations, car],
  );

  // Diff against previous render — push announcements when something interesting happens.
  const prevStationsRef = useRef<StationWithDistance[]>([]);
  useEffect(() => {
    const prev = prevStationsRef.current;
    prevStationsRef.current = stations;
    if (prev.length === 0) return; // skip the first hydration

    const lines: string[] = [];
    for (const cur of stations) {
      const old = prev.find((p) => p.id === cur.id);
      if (!old) continue;

      // A slot just freed up at a previously-full station.
      if (
        old.available === 0 &&
        cur.available > 0 &&
        cur.status !== 'offline'
      ) {
        lines.push(
          `A slot just opened at ${cur.name} — ${cur.available} of ${cur.total} chargers free now.`,
        );
      }
      // Station came back online from offline.
      else if (old.status === 'offline' && cur.status !== 'offline') {
        lines.push(`${cur.name} is back online.`);
      }
    }

    if (lines.length > 0) {
      setAnnouncement({ id: crypto.randomUUID(), text: lines.join(' ') });
    }
  }, [stations]);

  return (
    <>
      <StationList
        position={position}
        onPositionChange={setPosition}
        stations={stations}
        demoMode={demoMode}
        onToggleDemo={() => setDemoMode((d) => !d)}
        carId={carId}
        onCarChange={setCarId}
      />
      <Chatbot
        position={position}
        allStations={allStations}
        carId={carId}
        onCarChange={setCarId}
        announcement={announcement}
      />
    </>
  );
}
