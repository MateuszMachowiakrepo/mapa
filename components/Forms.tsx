"use client";
import { useState } from "react";
import { KINDS, ROUTE_COLOR } from "@/lib/types";
import type { Kind } from "@/lib/types";

function Modal({ title, color, children, onClose }: { title: string; color: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ borderTopColor: color }}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Actions({ onCancel, onDelete }: { onCancel: () => void; onDelete?: () => void }) {
  return (
    <div className="actions">
      {onDelete && <button type="button" className="danger" onClick={onDelete}>Usuń</button>}
      <span style={{ flex: 1 }} />
      <button type="button" onClick={onCancel}>Anuluj</button>
      <button type="submit" className="primary">Zapisz</button>
    </div>
  );
}

export type PlaceValues = { name: string; fields: Record<string, string>; inspiration: string };

export function PlaceForm({ kind, initial, onSave, onCancel, onDelete }: {
  kind: Kind;
  initial?: PlaceValues;
  onSave: (v: PlaceValues) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const cfg = KINDS[kind];
  const [name, setName] = useState(initial?.name ?? "");
  const [fields, setFields] = useState<Record<string, string>>(initial?.fields ?? {});
  const [inspiration, setInspiration] = useState(initial?.inspiration ?? "");

  return (
    <Modal title={`${initial ? "Edytuj" : "Nowy punkt"}: ${cfg.label}`} color={cfg.color} onClose={onCancel}>
      <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSave({ name: name.trim(), fields, inspiration: inspiration.trim() }); }}>
        <label>Nazwa
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        {cfg.fields.map((f) => (
          <label key={f.key}>{f.label}
            {f.long ? (
              <textarea rows={5} value={fields[f.key] ?? ""} onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })} />
            ) : (
              <input value={fields[f.key] ?? ""} onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })} />
            )}
          </label>
        ))}
        <label>Inspiracja
          <input placeholder="Link, np. do TikToka" value={inspiration} onChange={(e) => setInspiration(e.target.value)} />
        </label>
        <Actions onCancel={onCancel} onDelete={onDelete} />
      </form>
    </Modal>
  );
}

export type RouteValues = { name: string; theme: string; inspiration: string };

export function RouteForm({ initial, onSave, onCancel, onDelete }: {
  initial?: RouteValues;
  onSave: (v: RouteValues) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [theme, setTheme] = useState(initial?.theme ?? "");
  const [inspiration, setInspiration] = useState(initial?.inspiration ?? "");

  return (
    <Modal title={initial ? "Edytuj trasę" : "Nowa trasa"} color={ROUTE_COLOR} onClose={onCancel}>
      <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSave({ name: name.trim(), theme: theme.trim(), inspiration: inspiration.trim() }); }}>
        <label>Nazwa trasy
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>Główny motyw
          <input value={theme} onChange={(e) => setTheme(e.target.value)} />
        </label>
        <label>Inspiracja
          <input placeholder="Link, np. do TikToka" value={inspiration} onChange={(e) => setInspiration(e.target.value)} />
        </label>
        <Actions onCancel={onCancel} onDelete={onDelete} />
      </form>
    </Modal>
  );
}
