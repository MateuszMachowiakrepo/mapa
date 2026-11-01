export type Kind = "city" | "attraction" | "restaurant" | "place";

export type Field = { key: string; label: string; long?: boolean };

export const KINDS: Record<Kind, { label: string; icon: string; color: string; fields: Field[] }> = {
  city: {
    label: "Miasto",
    icon: "🏙️",
    color: "#2563eb",
    fields: [
      { key: "type", label: "Typ miasta" },
      { key: "days", label: "Na ile dni?" },
      { key: "see", label: "Co warto tam zobaczyć", long: true },
    ],
  },
  attraction: {
    label: "Atrakcja",
    icon: "🎡",
    color: "#dc2626",
    fields: [
      { key: "type", label: "Typ atrakcji" },
      { key: "duration", label: "Czas trwania" },
      { key: "price", label: "Cena" },
      { key: "extra", label: "Dodatkowe info", long: true },
    ],
  },
  restaurant: {
    label: "Restauracja",
    icon: "🍽️",
    color: "#16a34a",
    fields: [
      { key: "type", label: "Typ restauracji" },
      { key: "rating", label: "Ocena" },
      { key: "prices", label: "Ceny" },
      { key: "order", label: "Co warto tam zamówić?", long: true },
    ],
  },
  place: {
    label: "Miejsce",
    icon: "📍",
    color: "#eab308",
    fields: [
      { key: "type", label: "Typ miejsca" },
      { key: "qualities", label: "Walory tego miejsca", long: true },
    ],
  },
};

export const ROUTE_COLOR = "#7c3aed";
export const ROUTE_ICON = "🛣️";

export type Place = {
  id: string;
  kind: Kind;
  name: string;
  lat: number;
  lng: number;
  fields: Record<string, string>;
  inspiration: string | null;
};

export type RoutePoint = { lat: number; lng: number; name?: string };

export type Route = {
  id: string;
  name: string;
  theme: string | null;
  inspiration: string | null;
  points: RoutePoint[];
};

// Link tylko gdy wpis wygląda jak adres (https://…, www.… albo domena.tld bez spacji); reszta to zwykły tekst.
export function isLink(text: string) {
  const t = text.trim();
  return /^https?:\/\//i.test(t) || /^(www\.)?[\w-]+(\.[\w-]+)*\.[a-z]{2,}(\/\S*)?$/i.test(t);
}

export function linkHref(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}
