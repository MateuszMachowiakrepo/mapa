# Mapa — moje miejsca i trasy

Next.js + react-leaflet (OpenStreetMap) + Supabase. Wersja jednoużytkownikowa, cały stack darmowy.

## 1. Supabase
1. Załóż projekt na supabase.com (free).
2. SQL Editor → wklej `supabase/schema.sql` → Run.
   (Masz już starą bazę? Uruchom zamiast tego `supabase/migration.sql`.)
3. Authentication → Users → **Add user** (Twój e-mail + hasło, zaznacz auto-confirm).
4. Authentication → Sign In / Providers → wyłącz **Allow new users to sign up**.
5. Project Settings → API → skopiuj `Project URL` i `anon public key`.

## 2. Lokalnie
```bash
cp .env.example .env.local   # uzupełnij dwie wartości
npm install
npm run dev
```

## 3. Online (Vercel)
1. Wrzuć repo na GitHub.
2. vercel.com → Add New Project → import repo.
3. Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy → adres `*.vercel.app`.

## Użycie
- Dodaj punkt: wybierz rodzaj (Miasto, Atrakcja, Restauracja, Miejsce) → kliknij na mapie → wypełnij formularz.
- Klik w punkt: karta z informacjami, ołówek edytuje, przycisk Inspiracja otwiera zapisany link.
- Dodaj trasę: klikaj punkty na mapie → Zakończ trasę → nazwa, główny motyw, inspiracja.
- Klik w trasę podświetla ją; klik w jej punkt pozwala go nazwać.

## Uwagi
- Kafelki OSM i Nominatim: użycie osobiste OK, nie do dużego ruchu.
- Supabase free usypia projekt po tygodniu bez aktywności (wznowienie jednym kliknięciem).
