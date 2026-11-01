"use client";
import "leaflet/dist/leaflet.css";
import { Fragment, useEffect, useState } from "react";
import type { LeafletMouseEvent } from "leaflet";
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap, useMapEvents } from "react-leaflet";
import { KINDS, ROUTE_COLOR, ROUTE_ICON, isLink, linkHref } from "@/lib/types";
import type { Kind, Place, Route, RoutePoint } from "@/lib/types";

export type MapMode = "idle" | "place" | "route";

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

function Pencil() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

// Trasa po realnych drogach: punkty trasy to punkty pośrednie, geometrię liczy publiczny OSRM.
// Do czasu odpowiedzi (lub gdy się nie uda) rysujemy linię prostą.
const roadCache = new Map<string, [number, number][]>();

function useRoad(points: RoutePoint[]) {
  const key = points.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(";");
  const straight = points.map((p) => [p.lat, p.lng] as [number, number]);
  const [line, setLine] = useState<[number, number][]>(() => roadCache.get(key) ?? straight);

  useEffect(() => {
    const cached = roadCache.get(key);
    if (cached) return setLine(cached);
    setLine(straight);
    if (points.length < 2) return;
    const ctl = new AbortController();
    fetch(`https://router.project-osrm.org/route/v1/driving/${key}?overview=full&geometries=geojson`, { signal: ctl.signal })
      .then((r) => r.json())
      .then((d) => {
        const coords: [number, number][] | undefined = d.routes?.[0]?.geometry?.coordinates;
        if (!coords) return;
        const road = coords.map(([lng, lat]) => [lat, lng] as [number, number]);
        roadCache.set(key, road);
        setLine(road);
      })
      .catch(() => {});
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return line;
}

function Road({ points, on, onClick }: { points: RoutePoint[]; on: boolean; onClick: (e: LeafletMouseEvent) => void }) {
  const line = useRoad(points);
  return (
    <>
      {on && <Polyline positions={line} interactive={false} pathOptions={{ color: ROUTE_COLOR, weight: 16, opacity: 0.3 }} />}
      <Polyline positions={line} interactive={false} pathOptions={{ color: ROUTE_COLOR, weight: on ? 6 : 4, opacity: on ? 1 : 0.8 }} />
      <Polyline positions={line} pathOptions={{ color: ROUTE_COLOR, weight: 20, opacity: 0, bubblingMouseEvents: false }} eventHandlers={{ click: onClick }} />
    </>
  );
}

function DraftRoad({ points }: { points: RoutePoint[] }) {
  const line = useRoad(points);
  if (points.length < 2) return null;
  return <Polyline positions={line} interactive={false} pathOptions={{ color: ROUTE_COLOR, weight: 4, opacity: 0.8, dashArray: "8 8" }} />;
}

function Card({ color, icon, tag, title, rows, link, onEdit }: {
  color: string;
  icon: string;
  tag: string;
  title: string;
  rows: [string, string][];
  link?: string | null;
  onEdit: () => void;
}) {
  return (
    <div className="card" style={{ "--c": color } as React.CSSProperties}>
      <div className="head">
        <span className="ico">{icon}</span>
        <span className="tag">{tag}</span>
        <button className="pencil" title="Edytuj" onClick={onEdit}><Pencil /></button>
      </div>
      <div className="body">
        <div className="title">{title}</div>
        {rows.map(([k, v]) => (
          <div key={k} className="row"><span>{k}</span>{v}</div>
        ))}
        {link && (isLink(link)
          ? <a className="insp" href={linkHref(link)} target="_blank" rel="noopener noreferrer">Inspiracja ↗</a>
          : <div className="row"><span>Inspiracja</span>{link}</div>)}
      </div>
    </div>
  );
}

function NameCard({ point, onSave }: { point: RoutePoint; onSave: (name: string) => void }) {
  const [name, setName] = useState(point.name ?? "");
  return (
    <form className="card" style={{ "--c": ROUTE_COLOR } as React.CSSProperties} onSubmit={(e) => { e.preventDefault(); onSave(name.trim()); }}>
      <div className="head">
        <span className="ico">{ROUTE_ICON}</span>
        <span className="tag">Punkt trasy</span>
      </div>
      <div className="body">
        <input autoFocus placeholder="Nazwa punktu" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="insp">Zapisz</button>
      </div>
    </form>
  );
}

type Open =
  | { type: "place"; id: string; seq: number }
  | { type: "route"; id: string; at: [number, number]; seq: number }
  | { type: "point"; routeId: string; idx: number; seq: number };

type Props = {
  places: Place[];
  routes: Route[];
  mode: MapMode;
  pending: { kind: Kind; lat: number; lng: number } | null;
  draft: RoutePoint[];
  highlightId: string | null;
  fly: [number, number, number] | null;
  onMapClick: (lat: number, lng: number) => void;
  onHighlight: (id: string | null) => void;
  onEditPlace: (p: Place) => void;
  onEditRoute: (r: Route) => void;
  onRenamePoint: (routeId: string, idx: number, name: string) => void;
};

// W trybie ciemnym kafelki OSM są odwracane filtrem CSS (.leaflet-tile-pane w globals.css), bez klucza API.
const TILES = {
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
};

export default function MapView({
  places, routes, mode, pending, draft, highlightId, fly,
  onMapClick, onHighlight, onEditPlace, onEditRoute, onRenamePoint,
}: Props) {
  const [open, setOpen] = useState<Open | null>(null);
  const [seq, setSeq] = useState(0);
  const idle = mode === "idle";

  // Kliknięcie w element w trybie dodawania traktujemy jak kliknięcie w mapę.
  function item(e: LeafletMouseEvent, fn: () => void) {
    if (!idle) return onMapClick(e.latlng.lat, e.latlng.lng);
    setSeq((s) => s + 1);
    fn();
  }

  useEffect(() => { if (!idle) setOpen(null); }, [idle]);

  const openPlace = open?.type === "place" ? places.find((p) => p.id === open.id) : undefined;
  const openRoute = open?.type === "route" ? routes.find((r) => r.id === open.id) : undefined;
  const openPointRoute = open?.type === "point" ? routes.find((r) => r.id === open.routeId) : undefined;
  const openPoint = open?.type === "point" ? openPointRoute?.points[open.idx] : undefined;

  return (
    <MapContainer center={[52.4, 16.93]} zoom={12} scrollWheelZoom>
      <TileLayer attribution={TILES.attribution} url={TILES.url} />
      <Clicks onClick={(lat, lng) => {
        if (!idle) return onMapClick(lat, lng);
        setOpen(null);
        onHighlight(null);
      }} />
      <Fly target={fly} />

      {routes.map((r) => {
        const on = highlightId === r.id;
        return (
          <Fragment key={r.id}>
            <Road
              points={r.points}
              on={on}
              onClick={(e) => item(e, () => { onHighlight(r.id); setOpen({ type: "route", id: r.id, at: [e.latlng.lat, e.latlng.lng], seq: seq + 1 }); })}
            />
            {r.points.map((p, i) => (
              <CircleMarker
                key={i}
                center={[p.lat, p.lng]}
                radius={on ? 8 : 6}
                pathOptions={{ color: "#fff", weight: 2, fillColor: ROUTE_COLOR, fillOpacity: 1, bubblingMouseEvents: false }}
                eventHandlers={{ click: (e) => item(e, () => { onHighlight(r.id); setOpen({ type: "point", routeId: r.id, idx: i, seq: seq + 1 }); }) }}
              />
            ))}
          </Fragment>
        );
      })}

      {places.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={9}
          pathOptions={{ color: "#fff", weight: 2, fillColor: KINDS[p.kind].color, fillOpacity: 1, bubblingMouseEvents: false }}
          eventHandlers={{ click: (e) => item(e, () => { onHighlight(null); setOpen({ type: "place", id: p.id, seq: seq + 1 }); }) }}
        />
      ))}

      {pending && (
        <CircleMarker center={[pending.lat, pending.lng]} radius={9} interactive={false}
          pathOptions={{ color: KINDS[pending.kind].color, weight: 2, dashArray: "3", fillColor: KINDS[pending.kind].color, fillOpacity: 0.3 }} />
      )}

      <DraftRoad points={draft} />
      {draft.map((p, i) => (
        <CircleMarker key={i} center={[p.lat, p.lng]} radius={6} interactive={false}
          pathOptions={{ color: "#fff", weight: 2, fillColor: ROUTE_COLOR, fillOpacity: 1 }} />
      ))}

      {open && openPlace && (
        <Popup key={open.seq} position={[openPlace.lat, openPlace.lng]} offset={[0, -8]} closeButton={false}>
          <Card
            color={KINDS[openPlace.kind].color}
            icon={KINDS[openPlace.kind].icon}
            tag={KINDS[openPlace.kind].label}
            title={openPlace.name}
            rows={KINDS[openPlace.kind].fields
              .filter((f) => openPlace.fields[f.key]?.trim())
              .map((f) => [f.label, openPlace.fields[f.key]] as [string, string])}
            link={openPlace.inspiration}
            onEdit={() => onEditPlace(openPlace)}
          />
        </Popup>
      )}

      {open && openRoute && open.type === "route" && (
        <Popup key={open.seq} position={open.at} offset={[0, 0]} closeButton={false}>
          <Card
            color={ROUTE_COLOR}
            icon={ROUTE_ICON}
            tag="Trasa"
            title={openRoute.name}
            rows={openRoute.theme?.trim() ? [["Główny motyw", openRoute.theme]] : []}
            link={openRoute.inspiration}
            onEdit={() => onEditRoute(openRoute)}
          />
        </Popup>
      )}

      {open && open.type === "point" && openPoint && openPointRoute && (
        <Popup key={open.seq} position={[openPoint.lat, openPoint.lng]} offset={[0, -6]} closeButton={false}>
          <NameCard point={openPoint} onSave={(name) => { onRenamePoint(open.routeId, open.idx, name); setOpen(null); }} />
        </Popup>
      )}
    </MapContainer>
  );
}
