'use client';

import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
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

const STATUS_COLOR: Record<StationStatus, string> = {
  open: '#22c55e',
  busy: '#f59e0b',
  offline: '#64748b',
};

function stationIcon(status: StationStatus): L.DivIcon {
  const color = STATUS_COLOR[status];
  return L.divIcon({
    className: '',
    html: `
      <div style="
        position: relative;
        width: 30px;
        height: 30px;
        background: ${color};
        border: 2px solid #fff;
        border-radius: 50%;
        box-shadow: 0 0 0 4px ${color}55, 0 4px 12px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #0f172a;
        font-weight: 800;
        font-size: 16px;
        line-height: 1;
      ">⚡</div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

const userIcon = L.divIcon({
  className: '',
  html: `
    <div style="
      width: 16px;
      height: 16px;
      background: #38bdf8;
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 0 0 6px rgba(56,189,248,0.35);
    "></div>
  `,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

type Props = {
  position: Position;
  stations: StationWithDistance[];
};

export default function StationMap({ position, stations }: Props) {
  const bounds = useMemo<L.LatLngBoundsExpression>(() => {
    const points: [number, number][] = [
      [position.lat, position.lng],
      ...stations.map((s) => [s.lat, s.lng] as [number, number]),
    ];
    return points;
  }, [position, stations]);

  return (
    <div className="h-[70vh] overflow-hidden rounded-3xl border border-ink-800 sm:h-[60vh]">
      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [40, 40] }}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        <FitBoundsOnUpdate bounds={bounds} />

        <Marker position={[position.lat, position.lng]} icon={userIcon}>
          <Popup>
            <strong>You are here</strong>
            <br />
            {position.label ?? `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`}
          </Popup>
        </Marker>

        {stations.map((s) => (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={stationIcon(s.status)}
          >
            <Popup>
              <StationPopupContent station={s} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

function FitBoundsOnUpdate({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  const initialFitDone = useRef(false);

  useEffect(() => {
    if (initialFitDone.current) return;
    map.fitBounds(bounds, { padding: [40, 40] });
    initialFitDone.current = true;
  }, [map, bounds]);

  return null;
}

function StationPopupContent({ station }: { station: StationWithDistance }) {
  return (
    <div>
      <strong style={{ fontSize: '14px' }}>{station.name}</strong>
      <div style={{ color: '#94a3b8', marginTop: 2 }}>{station.address}</div>
      <div style={{ marginTop: 8 }}>
        <span style={{ color: '#38bdf8', fontWeight: 700 }}>
          {formatDistance(station.distanceKm)}
        </span>
        <span style={{ color: '#94a3b8' }}>
          {' · ~'}{formatDriveTime(station.distanceKm).replace('~', '')}
          {' drive'}
        </span>
      </div>
      <div style={{ marginTop: 4, color: '#fcd34d', fontWeight: 600 }}>
        {formatPricePerKwh(station.pricePerKwh)} · {station.maxPowerKw} kW
      </div>
      <div style={{ marginTop: 4, color: '#cbd5e1' }}>
        {station.status === 'offline'
          ? 'Offline'
          : station.available > 0
            ? `${station.available} of ${station.total} free`
            : station.waitMinutes !== undefined
              ? `Full · next slot ${formatWait(station.waitMinutes)}`
              : 'Full'}
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        <a
          href={googleMapsDirectionsUrl(station.lat, station.lng)}
          target="_blank"
          rel="noreferrer"
          style={{
            background: '#fff',
            color: '#0f172a',
            padding: '6px 10px',
            borderRadius: 999,
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: 12,
          }}
        >
          Google Maps
        </a>
        <a
          href={wazeDirectionsUrl(station.lat, station.lng)}
          target="_blank"
          rel="noreferrer"
          style={{
            background: '#33ccff',
            color: '#0f172a',
            padding: '6px 10px',
            borderRadius: 999,
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: 12,
          }}
        >
          Waze
        </a>
      </div>
    </div>
  );
}
