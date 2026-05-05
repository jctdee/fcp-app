'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { CARS } from '@/lib/cars';
import {
  type StationStatus,
  formatDistance,
  formatDriveTime,
  formatPricePerKwh,
  formatWait,
  googleMapsDirectionsUrl,
  wazeDirectionsUrl,
} from '@/lib/stations';
import type { Position, StationWithDistance } from './AppShell';

const StationMap = dynamic(() => import('./StationMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] items-center justify-center rounded-3xl border border-ink-800 bg-ink-800/40 text-sm text-ink-400 sm:h-[60vh]">
      Loading map…
    </div>
  ),
});

type ViewMode = 'list' | 'map';

const DISTANCE_FILTERS: Array<{ label: string; max: number | null }> = [
  { label: 'All', max: null },
  { label: '≤ 1 km', max: 1 },
  { label: '≤ 3 km', max: 3 },
  { label: '≤ 10 km', max: 10 },
];

const DEMO_LOCATION: Position = {
  lat: 14.5547,
  lng: 121.0244,
  label: 'Ayala Avenue, Makati (demo)',
};

type Props = {
  position: Position | null;
  onPositionChange: (p: Position) => void;
  stations: StationWithDistance[];
  demoMode: boolean;
  onToggleDemo: () => void;
  carId: string;
  onCarChange: (id: string) => void;
};

export default function StationList({
  position,
  onPositionChange,
  stations,
  demoMode,
  onToggleDemo,
  carId,
  onCarChange,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('list');
  const [maxKm, setMaxKm] = useState<number | null>(null);

  const visibleStations =
    maxKm === null
      ? stations
      : stations.filter((s) => s.distanceKm <= maxKm);

  function requestLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported in this browser.');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        onPositionChange({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLoading(false);
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Try the demo location below.'
            : err.message || 'Could not read your location.',
        );
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  if (!position) {
    return (
      <div className="rounded-3xl border border-ink-800 bg-ink-800/40 p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/15 text-brand-500">
          <PinIcon />
        </div>
        <h2 className="text-lg font-semibold text-white">
          Find chargers near you
        </h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-400">
          Allow location access and we&apos;ll show the closest EV chargers, sorted
          by distance.
        </p>

        <button
          type="button"
          onClick={requestLocation}
          disabled={loading}
          className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-ink-900 transition hover:bg-brand-600 disabled:opacity-50 sm:w-auto"
        >
          {loading ? 'Locating…' : 'Use my location'}
        </button>

        <button
          type="button"
          onClick={() => onPositionChange(DEMO_LOCATION)}
          className="mt-2.5 block w-full text-xs text-ink-400 underline-offset-4 hover:text-ink-200 hover:underline"
        >
          Or try a demo location ({DEMO_LOCATION.label})
        </button>

        {error && (
          <p className="mt-4 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-ink-400">
            Showing chargers near
          </p>
          <p className="truncate text-sm font-medium text-white">
            {position.label ??
              `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle value={view} onChange={setView} />
          <button
            type="button"
            onClick={onToggleDemo}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              demoMode
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-ink-700 text-ink-400 hover:bg-ink-800 hover:text-ink-200'
            }`}
            aria-pressed={demoMode}
          >
            {demoMode ? '● Demo' : 'Demo'}
          </button>
          <button
            type="button"
            onClick={requestLocation}
            disabled={loading}
            className="rounded-full border border-ink-700 px-3 py-1.5 text-xs text-ink-200 transition hover:bg-ink-800 disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 px-1">
        <label
          htmlFor="car-select"
          className="text-[10px] uppercase tracking-wider text-ink-400"
        >
          Driving
        </label>
        <div className="relative">
          <select
            id="car-select"
            value={carId}
            onChange={(e) => onCarChange(e.target.value)}
            className="appearance-none rounded-full bg-ink-800 py-1.5 pl-3 pr-8 text-xs font-medium text-ink-200 transition hover:bg-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {CARS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-ink-400">
            ▼
          </span>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 px-1">
        <span className="text-[10px] uppercase tracking-wider text-ink-400">
          Within
        </span>
        {DISTANCE_FILTERS.map((f) => {
          const active = maxKm === f.max;
          return (
            <button
              key={f.label}
              type="button"
              onClick={() => setMaxKm(f.max)}
              aria-pressed={active}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                active
                  ? 'bg-brand-500 text-ink-900'
                  : 'bg-ink-800 text-ink-400 hover:bg-ink-700 hover:text-ink-200'
              }`}
            >
              {f.label}
            </button>
          );
        })}
        {maxKm !== null && (
          <span className="ml-auto text-[11px] text-ink-400">
            {visibleStations.length} of {stations.length}
          </span>
        )}
      </div>

      {visibleStations.length === 0 ? (
        <div className="rounded-2xl border border-ink-800 bg-ink-800/40 p-6 text-center">
          <p className="text-sm text-ink-200">
            {stations.length === 0
              ? "No stations match your car's connectors."
              : `No stations within ${maxKm} km.`}
          </p>
          <button
            type="button"
            onClick={() => {
              if (stations.length === 0) onCarChange('any');
              else setMaxKm(null);
            }}
            className="mt-2 text-xs font-semibold text-brand-500 hover:underline"
          >
            {stations.length === 0 ? 'Show all cars' : 'Show all distances'}
          </button>
        </div>
      ) : view === 'list' ? (
        <ul className="space-y-3">
          {visibleStations.map((s) => (
            <StationCard key={s.id} station={s} />
          ))}
        </ul>
      ) : (
        <StationMap position={position} stations={visibleStations} />
      )}
    </div>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div
      role="tablist"
      className="flex items-center rounded-full bg-ink-800 p-1"
    >
      {(['list', 'map'] as const).map((mode) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(mode)}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition ${
              active
                ? 'bg-brand-500 text-ink-900'
                : 'text-ink-400 hover:text-ink-200'
            }`}
          >
            {mode === 'list' ? <ListIcon /> : <MapIcon />}
            <span className="capitalize">{mode}</span>
          </button>
        );
      })}
    </div>
  );
}

function ListIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  );
}

function StationCard({ station }: { station: StationWithDistance }) {
  return (
    <li className="rounded-2xl border border-ink-800 bg-ink-800/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-white">
            {station.name}
          </h3>
          <p className="mt-0.5 truncate text-xs text-ink-400">
            {station.address}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-extrabold leading-none text-brand-500">
            {formatDistance(station.distanceKm)}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-ink-400">
            🚗 {formatDriveTime(station.distanceKm)} drive
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={station.status} />
        {station.waitMinutes !== undefined && (
          <span className="rounded-full bg-orange-500/15 px-2.5 py-1 text-xs font-semibold text-orange-300">
            ⏱ {formatWait(station.waitMinutes)} wait
          </span>
        )}
        <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-300">
          {formatPricePerKwh(station.pricePerKwh)}
        </span>
        <span className="rounded-full bg-ink-900 px-2.5 py-1 text-xs text-ink-200">
          {station.maxPowerKw} kW
        </span>
        <span className="rounded-full bg-ink-900 px-2.5 py-1 text-xs text-ink-200">
          {station.available}/{station.total} free
        </span>
        {station.connectors.map((c) => (
          <span
            key={c}
            className="rounded-full border border-ink-700 px-2.5 py-1 text-xs text-ink-400"
          >
            {c}
          </span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <a
          href={googleMapsDirectionsUrl(station.lat, station.lng)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-ink-900 transition active:scale-95"
        >
          <PinIcon /> Google Maps
        </a>
        <a
          href={wazeDirectionsUrl(station.lat, station.lng)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl bg-[#33ccff] py-3 text-sm font-semibold text-ink-900 transition active:scale-95"
        >
          <ArrowIcon /> Waze
        </a>
      </div>
    </li>
  );
}

function StatusBadge({ status }: { status: StationStatus }) {
  const styles: Record<StationStatus, string> = {
    open: 'bg-emerald-500/15 text-emerald-300',
    busy: 'bg-amber-500/15 text-amber-300',
    offline: 'bg-ink-700 text-ink-400',
  };
  const labels: Record<StationStatus, string> = {
    open: '● Open',
    busy: '● Busy',
    offline: '● Offline',
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function PinIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 11 22 2l-9 19-2-8-8-2Z" />
    </svg>
  );
}
