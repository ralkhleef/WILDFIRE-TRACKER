# Backend Notes — WildFire-Tracker (INF 124 A3/A4)

This document captures the backend architecture, current endpoints, and a
 curl checklist for testing

---

## Architecture

`server/src` is organized into three layers:

```
routes/         HTTP surface — declares URL → controller wiring
controllers/    HTTP layer  — parses req, calls services, formats res
services/       Domain layer — business logic + external API calls
config/         env, prisma, passport
middleware/     auth, validation, error, 404
utils/          ApiError, asyncHandler, geolocation, californiaFilter
prisma/         schema.prisma, migrations, seed.js
```

Each service module is independent of HTTP concerns and could be lifted into
its own microservice (`authService`, `fireService`, `alertService`,
`nwsAlertService`, `locationService`, `userService`). The current deployment
keeps them in one Express process for simplicity.

---

## Environment variables

See `server/.env.example` for the full list. Required at minimum:

- `PORT` (defaults to 5050)
- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL` (comma-separated list for CORS)

Optional:

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` — Google OAuth login
- `GOOGLE_MAPS_API_KEY` (or per-API keys) — geocode / nearby / air quality
- `NASA_FIRMS_API_URL` / `NASA_FIRMS_MAP_KEY` — satellite hotspots
- `CALFIRE_API_URL` — official incidents
- `NWS_ALERTS_API_URL` — National Weather Service alerts (already defaults to api.weather.gov)

---

## Routes

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET    | `/api/health` | — | Liveness check |
| POST   | `/api/auth/signup` | — | Email/password signup, returns JWT |
| POST   | `/api/auth/login`  | — | Email/password login, returns JWT |
| GET    | `/api/auth/me`     | jwt | Current user |
| POST   | `/api/auth/logout` | — | Stateless logout (frontend clears token) |
| GET    | `/api/auth/google` | — | Begin Google OAuth (501 if not configured) |
| GET    | `/api/auth/google/callback` | — | Google OAuth callback |
| GET    | `/api/fires` | — | All current California fires (last-7-days filter, source-aware order) |
| GET    | `/api/fires/:id` | — | Single fire detail (unfiltered) |
| GET    | `/api/fires/nearby?latitude=&longitude=&radius=` | — | Fires within radius miles |
| GET    | `/api/alerts` | jwt | User alert preferences + saved locations |
| POST   | `/api/alerts` | jwt | Upsert alert preferences |
| PUT    | `/api/alerts` | jwt | Same as POST (idempotent) |
| GET    | `/api/alerts/local?latitude=&longitude=&radius=` | jwt | Fires near user's saved location |
| GET    | `/api/users/profile` | jwt | Current user profile |
| PUT    | `/api/users/profile` | jwt | Update name/email |
| POST   | `/api/users/saved-locations` | jwt | Create saved location |
| GET    | `/api/users/saved-locations` | jwt | List saved locations |
| PUT    | `/api/users/saved-locations/:id` | jwt | Update saved location |
| DELETE | `/api/users/saved-locations/:id` | jwt | Delete saved location |
| GET    | `/api/nws-alerts?area=CA` | — | Active NWS fire-relevant alerts (Red Flag, Fire Weather, Evacuation) |
| GET    | `/api/nws-alerts/nearby?lat=&lng=` | — | Same feed, with origin echoed |
| GET    | `/api/locations/geocode?address=` | — | Server-side Google geocoding |
| GET    | `/api/locations/nearby?lat=&lng=&type=fire_station` | — | Google Places nearby search |
| GET    | `/api/resources/nearby?lat=&lng=&type=` | — | Alias for `/api/locations/nearby` |
| GET    | `/api/air-quality?lat=&lng=` | — | Google Air Quality Universal AQI |

All Google-backed endpoints return `{ success: true, data: null/[] }` when
the relevant API key is missing, so the rest of the app keeps working.

---

## Fire payload shape

`/api/fires*` always returns objects with:

```jsonc
{
  "id": "...",
  "name": "Canyon Fire" /* or "Riverside County, CA" for FIRMS */,
  "location": "Orange County, CA",
  "latitude": 33.74,
  "longitude": -117.74,
  "source": "CAL FIRE" /* or "NASA FIRMS" / "seed" */,
  "sourceLabel": "CAL FIRE",
  "sourceType": "confirmed_incident" /* or "satellite_hotspot" */,
  "confirmed": true /* false for satellite hotspots */,
  "status": "active",
  "size": 1250,
  "containment": 60,
  "reportedAt": "2026-05-11T14:30:00.000Z",
  "updatedAt": "2026-05-11T14:30:00.000Z"
}
```

The frontend uses `confirmed` + `sourceLabel` to pick marker color and copy.

---

## Curl checklist

Backend must be running on port 5050.

```bash
# Health
curl http://localhost:5050/api/health

# Fires
curl http://localhost:5050/api/fires
curl "http://localhost:5050/api/fires?includeExternal=true"
curl "http://localhost:5050/api/fires/nearby?latitude=34.05&longitude=-118.24&radius=50"

# Signup / Login / Me
curl -X POST http://localhost:5050/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo","email":"demo@example.com","username":"demo","password":"password123"}'

curl -X POST http://localhost:5050/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"password123"}'

# Replace <TOKEN> with the JWT from /login
TOKEN=...
curl -H "Authorization: Bearer $TOKEN" http://localhost:5050/api/auth/me
curl -H "Authorization: Bearer $TOKEN" http://localhost:5050/api/users/saved-locations
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"label":"Home","latitude":34.05,"longitude":-118.24}' \
  http://localhost:5050/api/users/saved-locations

# Logout (stateless)
curl -X POST http://localhost:5050/api/auth/logout

# NWS alerts
curl "http://localhost:5050/api/nws-alerts?area=CA"

# Google Maps helpers (requires keys in server/.env)
curl "http://localhost:5050/api/locations/geocode?address=Irvine,CA"
curl "http://localhost:5050/api/locations/nearby?lat=33.65&lng=-117.74&type=fire_station"
curl "http://localhost:5050/api/air-quality?lat=33.65&lng=-117.74"
```

---

## Local dev commands

```bash
# Backend
cd server
cp .env.example .env       # fill in values
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed               # optional demo data
npm run dev                # http://localhost:5050

# Frontend
cd ../client
cp .env.example .env       # fill in VITE_API_URL, VITE_GOOGLE_MAPS_API_KEY
npm install
npm run dev                # http://localhost:5173
npm run build              # production build
```

---

## Deployment readiness

- `process.env.PORT` is honored (cloud platforms set this).
- `FRONTEND_URL` is a comma-separated CORS allowlist — set this in production.
- Secrets live only in env vars; nothing in source.
- `.gitignore` excludes `.env`, `node_modules`, `dist`, `build`, `coverage`,
  `.DS_Store`, editor configs, and Prisma local DB artifacts.
- Each Google-backed endpoint degrades to a successful empty response when
  its key is not configured, so the app boots cleanly without keys.
- The service layer is split per-domain so individual services can later be
  promoted to their own microservices without touching controllers.

---

## What still needs manual setup

1. **PostgreSQL** must be installed locally (or provisioned in the cloud) and
   `DATABASE_URL` filled in. Run `npm run prisma:migrate` before first start.
2. **Google OAuth**: create a project in Google Cloud Console, enable OAuth,
   add `http://localhost:5050/api/auth/google/callback` as a redirect URI,
   paste the client id/secret into `server/.env`.
3. **Google Maps Platform**: enable Maps JavaScript API (browser),
   Geocoding API, Places API, and Air Quality API (server). Keys go in
   `server/.env` for the server-side ones and `client/.env` for the
   browser-only Maps JS key.
4. **NASA FIRMS**: request a free MAP_KEY at
   `https://firms.modaps.eosdis.nasa.gov/api/area/` and paste into
   `NASA_FIRMS_MAP_KEY`.
5. **NWS** needs no key but expects a `User-Agent` (already set).
