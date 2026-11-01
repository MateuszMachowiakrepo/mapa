"use client";
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { KINDS, ROUTE_COLOR } from "@/lib/types";
import type { Kind, Place, Route, RoutePoint } from "@/lib/types";
import { PlaceForm, RouteForm } from "./Forms";
import type { PlaceValues, RouteValues } from "./Forms";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

type Hit = { display_name: string; lat: string; lon: string };
type Step = "idle" | "pickKind" | "placing" | "drawing";

export default function App() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [step, setStep] = useState<Step>("idle");
  const [kind, setKind] = useState<Kind>("place");
  const [pending, setPending] = useState<{ kind: Kind; lat: number; lng: number } | null>(null);
  const [editPlace, setEditPlace] = useState<Place | null>(null);
  const [draft, setDraft] = useState<RoutePoint[]>([]);
  const [routeForm, setRouteForm] = useState(false);
  const [editRoute, setEditRoute] = useState<Route | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [fly, setFly] = useState<[number, number, number] | null>(null);
  const [err, setErr] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch {}
  }

  const load = useCallback(async () => {
    const [p, r] = await Promise.all([
      supabase.from("places").select("id,kind,name,lat,lng,fields,inspiration").order("created_at"),
      supabase.from("routes").select("id,name,theme,inspiration,points").order("created_at"),
    ]);
    const e = p.error || r.error;
    if (e) return setErr(e.message);
    setErr("");
    setPlaces(p.data ?? []);
    setRoutes(r.data ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const mode = step === "placing" ? "place" : step === "drawing" ? "route" : "idle";

  function cancel() {
    setStep("idle");
    setDraft([]);
  }

  function onMapClick(lat: number, lng: number) {
    if (step === "placing") {
      setPending({ kind, lat, lng });
      setStep("idle");
    } else if (step === "drawing") {
      setDraft((d) => [...d, { lat, lng }]);
    }
  }

  async function savePlace(v: PlaceValues) {
    const row = { name: v.name, fields: v.fields, inspiration: v.inspiration || null };
    const res = editPlace
      ? await supabase.from("places").update(row).eq("id", editPlace.id)
      : await supabase.from("places").insert({ ...row, kind: pending!.kind, lat: pending!.lat, lng: pending!.lng });
    if (res.error) return setErr(res.error.message);
    setPending(null); setEditPlace(null); load();
  }

  async function deletePlace() {
    if (!editPlace || !confirm(`Usunąć „${editPlace.name}”?`)) return;
    const { error } = await supabase.from("places").delete().eq("id", editPlace.id);
    if (error) return setErr(error.message);
    setEditPlace(null); load();
  }

  async function saveRoute(v: RouteValues) {
    const row = { name: v.name, theme: v.theme || null, inspiration: v.inspiration || null };
    const { error } = editRoute
      ? await supabase.from("routes").update(row).eq("id", editRoute.id)
      : await supabase.from("routes").insert({ ...row, points: draft });
    if (error) return setErr(error.message);
    setRouteForm(false); setEditRoute(null); setDraft([]); setStep("idle"); load();
  }

  async function deleteRoute() {
    if (!editRoute || !confirm(`Usunąć trasę „${editRoute.name}”?`)) return;
    const { error } = await supabase.from("routes").delete().eq("id", editRoute.id);
    if (error) return setErr(error.message);
    setEditRoute(null); setHighlightId(null); load();
  }

  async function renamePoint(routeId: string, idx: number, name: string) {
    const r = routes.find((x) => x.id === routeId);
    if (!r) return;
    const points = r.points.map((p, i) => (i === idx ? { ...p, name } : p));
    const { error } = await supabase.from("routes").update({ points }).eq("id", routeId);
    if (error) return setErr(error.message);
    load();
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`);
    setHits(await r.json());
  }

  function pickHit(h: Hit) {
    setFly([parseFloat(h.lat), parseFloat(h.lon), 15]);
    setHits([]);
  }

  return (
    <div className="mapbox" data-adding={mode !== "idle"}>
      <MapView
        places={places}
        routes={routes}
        mode={mode}
        pending={pending}
        draft={draft}
        highlightId={highlightId}
        fly={fly}
        onMapClick={onMapClick}
        onHighlight={setHighlightId}
        onEditPlace={setEditPlace}
        onEditRoute={setEditRoute}
        onRenamePoint={renamePoint}
      />

      <div className="search">
        <form onSubmit={search}>
          <input placeholder="Szukaj adresu lub nazwy" value={query} onChange={(e) => setQuery(e.target.value)} />
        </form>
        {hits.map((h, i) => (
          <div key={i} className="hit" onClick={() => pickHit(h)}>{h.display_name}</div>
        ))}
      </div>

      <div className="topright">
        <button onClick={toggleTheme} title="Zmień motyw">{theme === "dark" ? "Jasny" : "Ciemny"}</button>
        <button onClick={() => supabase.auth.signOut()}>Wyloguj</button>
      </div>
      {err && <div className="errbar">{err}</div>}

      <div className="bar">
        {step === "idle" && (
          <>
            <button className="primary" onClick={() => setStep("pickKind")}>Dodaj punkt</button>
            <button className="primary" style={{ background: ROUTE_COLOR }} onClick={() => { setStep("drawing"); setDraft([]); setHighlightId(null); }}>Dodaj trasę</button>
          </>
        )}
        {step === "pickKind" && (
          <>
            {(Object.keys(KINDS) as Kind[]).map((k) => (
              <button key={k} className="kind" onClick={() => { setKind(k); setStep("placing"); }}>
                <span className="dot" style={{ background: KINDS[k].color }} />{KINDS[k].label}
              </button>
            ))}
            <button onClick={cancel}>Anuluj</button>
          </>
        )}
        {step === "placing" && (
          <>
            <span className="hint">Kliknij na mapie, aby umieścić punkt: {KINDS[kind].label}</span>
            <button onClick={cancel}>Anuluj</button>
          </>
        )}
        {step === "drawing" && (
          <>
            <span className="hint">Klikaj na mapie, aby dodawać punkty trasy ({draft.length})</span>
            <button disabled={!draft.length} onClick={() => setDraft((d) => d.slice(0, -1))}>Cofnij</button>
            <button className="primary" style={{ background: ROUTE_COLOR }} disabled={draft.length < 2} onClick={() => setRouteForm(true)}>Zakończ trasę</button>
            <button onClick={cancel}>Anuluj</button>
          </>
        )}
      </div>

      {pending && <PlaceForm kind={pending.kind} onSave={savePlace} onCancel={() => setPending(null)} />}
      {editPlace && (
        <PlaceForm
          kind={editPlace.kind}
          initial={{ name: editPlace.name, fields: editPlace.fields, inspiration: editPlace.inspiration ?? "" }}
          onSave={savePlace}
          onCancel={() => setEditPlace(null)}
          onDelete={deletePlace}
        />
      )}
      {routeForm && <RouteForm onSave={saveRoute} onCancel={() => setRouteForm(false)} />}
      {editRoute && (
        <RouteForm
          initial={{ name: editRoute.name, theme: editRoute.theme ?? "", inspiration: editRoute.inspiration ?? "" }}
          onSave={saveRoute}
          onCancel={() => setEditRoute(null)}
          onDelete={deleteRoute}
        />
      )}
    </div>
  );
}
