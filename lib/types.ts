export type Place = {
  id: string;
  name: string;
  note: string | null;
  lat: number;
  lng: number;
  category: string | null;
  visited: boolean;
};

export type Route = { id: string; name: string };

export type Stop = { route_id: string; place_id: string; position: number };

export type Mode = "foot" | "bike" | "car";
