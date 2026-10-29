"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import type { Mode, Place, Route, Stop } from "@/lib/types";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

type Hit = { display_name: string; lat: string; lon: string };
type Geo = { coords: [number, number][]; km: number; min: number };

export default function App() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [routeId, setRouteId] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [draftName, setDraftName] = useState("");
  const [newRoute, setNewRoute] = useState("");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [fly, setFly] = useState<[number, number, number] | null>(null);
  const [mode, setMode] = useState<Mode>("foot");
  const [geo, setGeo] = useState<Geo | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const [p, r, s] = await Promise.all([
      supabase.from("places").select("id,name,note,lat,lng,category,visited").order("created_at"),
      supabase.from("routes").select("id,name").order("created_at"),
      supabase.from("route_stops").select("route_id,place_id,position"),
    ]);
    const e = p.error || r.error || s.error;
    if (e) return setErr(e.message);
    setPlaces(p.data ?? []);
    setRoutes(r.data ?? []);
    setStops(s.data ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const placeById = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  const routeStops = useMemo(
    () => stops.filter((s) => s.route_id === routeId).sort((a, b) => a.position - b.position),
    [stops, routeId]
  );
  const routePlaces = routeStops.map((s) => placeById.get(s.place_id)).filter(Boolean) as Place[];
  const routePlaceIds = useMemo(() => new Set(routePlaces.map((p) => p.id)), [routePlaces]);

  // Trasa: OSRM (publiczny serwer demo), przy błędzie prosta linia
  useEffect(() => {
    setGeo(null);
    if (routePlaces.length < 2) return;
    const pts = routePlaces.map((p) => `${p.lng},${p.lat}`).join(";");
    const straight: [number, number][] = routePlaces.map((p) => [p.lat, p.lng]);
    const ctrl = new AbortController();
    fetch(`https://routing.openstreetmap.de/routed-${mode}/route/v1/driving/${pts}?overview=full&geometries=geojson`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => {
        const rt = d.routes?.[0];
        if (!rt) throw new Error("brak trasy");
        setGeo({
          coords: rt.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]),
          km: rt.distance / 1000,
          min: rt.duration / 60,
        });
      })
      .catch((e) => { if (e.name !== "AbortError") setGeo({ coords: straight, km: 0, min: 0 }); });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeStops.map((s) => s.place_id).join(","), mode]);

  async function savePlace() {
    if (!draft || !draftName.trim()) return;
    const { error } = await supabase.from("places").insert({ name: draftName.trim(), lat: draft.lat, lng: draft.lng });
    if (error) return setErr(error.message);
    setDraft(null); setDraftName(""); load();
  }

  async function toggleVisited(p: Place) {
    await supabase.from("places").update({ visited: !p.visited }).eq("id", p.id);
    load();
  }

  async function deletePlace(p: Place) {
    if (!confirm(`Usunąć „${p.name}”?`)) return;
    await supabase.from("places").delete().eq("id", p.id);
    load();
  }

  async function addRoute() {
    if (!newRoute.trim()) return;
    const { data, error } = await supabase.from("routes").insert({ name: newRoute.trim() }).select("id").single();
    if (error) return setErr(error.message);
    setNewRoute(""); await load(); setRouteId(data.id);
  }

  async function deleteRoute() {
    if (!routeId || !confirm("Usunąć trasę?")) return;
    await supabase.from("routes").delete().eq("id", routeId);
    setRouteId(""); load();
  }

  async function addStop(p: Place) {
    if (!routeId || routePlaceIds.has(p.id)) return;
    const position = routeStops.length ? routeStops[routeStops.length - 1].position + 1 : 0;
    await supabase.from("route_stops").insert({ route_id: routeId, place_id: p.id, position });
    load();
  }

  async function removeStop(placeId: string) {
    await supabase.from("route_stops").delete().eq("route_id", routeId).eq("place_id", placeId);
    load();
  }

  async function moveStop(i: number, dir: -1 | 1) {
    const a = routeStops[i], b = routeStops[i + dir];
    if (!a || !b) return;
    await Promise.all([
      supabase.from("route_stops").update({ position: b.position }).eq("route_id", routeId).eq("place_id", a.place_id),
      supabase.from("route_stops").update({ position: a.position }).eq("route_id", routeId).eq("place_id", b.place_id),
    ]);
    load();
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`);
    setHits(await r.json());
  }

  function pickHit(h: Hit) {
    const lat = parseFloat(h.lat), lng = parseFloat(h.lon);
    setFly([lat, lng, 16]);
    setDraft({ lat, lng });
    setDraftName(h.display_name.split(",")[0]);
    setHits([]);
  }

  function selectPlace(p: Place) {
    setSelectedId(p.id);
    setFly([p.lat, p.lng, 15]);
  }

  const line = geo?.coords ?? null;

  return (
    <div className="layout">
      <aside className="side">
        <div className="row">
          <strong style={{ flex: 1 }}>Mapa</strong>
          <button onClick={() => supabase.auth.signOut()}>Wyloguj</button>
        </div>
        {err && <div className="err">{err}</div>}

        <h3>Szukaj miejsca</h3>
        <form onSubmit={search}>
          <input placeholder="Adres lub nazwa…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </form>
        {hits.map((h, i) => (
          <div key={i} className="item"><span className="name muted" onClick={() => pickHit(h)}>{h.display_name}</span></div>
        ))}

        {draft && (
          <>
            <h3>Nowy punkt</h3>
            <input autoFocus placeholder="Nazwa" value={draftName} onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && savePlace()} />
            <div className="row">
              <button onClick={savePlace}>Zapisz</button>
              <button onClick={() => setDraft(null)}>Anuluj</button>
            </div>
          </>
        )}
        {!draft && <p className="muted">Kliknij na mapie, aby dodać punkt.</p>}

        <h3>Trasa</h3>
        <select value={routeId} onChange={(e) => setRouteId(e.target.value)}>
          <option value="">— wybierz trasę —</option>
          {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <div className="row">
          <input placeholder="Nowa trasa" value={newRoute} onChange={(e) => setNewRoute(e.target.value)} />
          <button onClick={addRoute}>+</button>
          {routeId && <button onClick={deleteRoute}>🗑</button>}
        </div>
        {routeId && (
          <>
            <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
              <option value="foot">Pieszo</option>
              <option value="bike">Rower</option>
              <option value="car">Samochód</option>
            </select>
            {geo && geo.km > 0 && <div className="muted">{geo.km.toFixed(1)} km · ok. {Math.round(geo.min)} min</div>}
            {routePlaces.map((p, i) => (
              <div key={p.id} className="item">
                <span className="muted">{i + 1}.</span>
                <span className="name" onClick={() => selectPlace(p)}>{p.name}</span>
                <button onClick={() => moveStop(i, -1)} disabled={i === 0}>↑</button>
                <button onClick={() => moveStop(i, 1)} disabled={i === routePlaces.length - 1}>↓</button>
                <button onClick={() => removeStop(p.id)}>✕</button>
              </div>
            ))}
          </>
        )}

        <h3>Punkty ({places.length})</h3>
        {places.map((p) => (
          <div key={p.id} className={`item ${selectedId === p.id ? "sel" : ""} ${p.visited ? "done" : ""}`}>
            <span className="name" onClick={() => selectPlace(p)}>{p.name}</span>
            <button title="Odwiedzone" onClick={() => toggleVisited(p)}>{p.visited ? "↺" : "✓"}</button>
            {routeId && <button title="Dodaj do trasy" disabled={routePlaceIds.has(p.id)} onClick={() => addStop(p)}>＋</button>}
            <button title="Usuń" onClick={() => deletePlace(p)}>🗑</button>
          </div>
        ))}
      </aside>

      <main className="mapbox">
        <MapView
          places={places}
          line={line}
          draft={draft}
          selectedId={selectedId}
          routePlaceIds={routePlaceIds}
          fly={fly}
          onClick={(lat, lng) => { setDraft({ lat, lng }); setDraftName(""); }}
          onSelect={(id) => setSelectedId(id)}
        />
      </main>
    </div>
  );
}
