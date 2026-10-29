"use client";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMap, useMapEvents } from "react-leaflet";
import type { Place } from "@/lib/types";

function Clicks({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Fly({ target }: { target: [number, number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target[0], target[1]], target[2]);
  }, [target, map]);
  return null;
}

type Props = {
  places: Place[];
  line: [number, number][] | null;
  draft: { lat: number; lng: number } | null;
  selectedId: string | null;
  routePlaceIds: Set<string>;
  fly: [number, number, number] | null;
  onClick: (lat: number, lng: number) => void;
  onSelect: (id: string) => void;
};

export default function MapView({ places, line, draft, selectedId, routePlaceIds, fly, onClick, onSelect }: Props) {
  return (
    <MapContainer center={[52.4, 16.93]} zoom={12} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Clicks onClick={onClick} />
      <Fly target={fly} />
      {line && <Polyline positions={line} pathOptions={{ color: "#e11d48", weight: 5, opacity: 0.8 }} />}
      {places.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={selectedId === p.id ? 11 : 8}
          pathOptions={{
            color: routePlaceIds.has(p.id) ? "#e11d48" : "#1e3a8a",
            weight: routePlaceIds.has(p.id) ? 3 : 2,
            fillColor: selectedId === p.id ? "#f59e0b" : p.visited ? "#16a34a" : "#3b82f6",
            fillOpacity: 0.9,
          }}
          eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); onSelect(p.id); } }}
        >
          <Tooltip>{p.name}</Tooltip>
        </CircleMarker>
      ))}
      {draft && (
        <CircleMarker center={[draft.lat, draft.lng]} radius={8} pathOptions={{ color: "#000", dashArray: "3", fillOpacity: 0.1 }} />
      )}
    </MapContainer>
  );
}
