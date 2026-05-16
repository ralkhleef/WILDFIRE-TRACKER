# WildFire-Tracker

Real-time wildfire tracking web app. Plots active fires on a map, surfaces details (size, containment, source, status), supports location-based alerts, and provides evacuation/help resources. Backend is Node + Express + Prisma + PostgreSQL. Frontend is React + Vite + Leaflet.

---

## 1. Project Overview

- **Backend** lives in `server/` and serves the JSON API on port **5050**.
- **Frontend** lives in `client/` and runs the Vite dev server on `http://localhost:5173`.
- Database is **PostgreSQL**, accessed via Prisma.
- External wildfire data: CAL FIRE incidents endpoint and NASA FIRMS (optional API key).

## 2. Tech Stack

- Node.js 20+
- Express 4 (REST API)
- Prisma 6 (ORM)
- PostgreSQL 14+
- JWT auth + Passport (Google OAuth optional)
- React 19 + Vite
- React Router 7
- Leaflet + react-leaflet (maps)

## 3. Folder Structure

```
WILDFIRE-TRACKER/
├── README.md
├── client/                  ← React + Vite frontend
│   ├── package.json
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── App.jsx
│       ├── components/      (Navbar, Sidebar, WildfireMap, Footer)
│       └── pages/           (Dashboard, MapView, Alerts, FireDetails, ...)
└── server/                  ← Express + Prisma backend
    ├── package.json
    ├── .env.example         (template — copy to .env)
    ├── prisma/
    │   ├── schema.prisma
    │   ├── migrations/
    │   └── seed.js
    └── src/
        ├── server.js
        ├── app.js
        ├── config/          (env, prisma, passport)
        ├── controllers/
        ├── middleware/
        ├── routes/
        ├── services/        (calfireService, nasaService, ...)
        └── utils/
```

## 4. Requirments

You'll need:

- **Node.js 20 or newer** (`node -v` to check)
- **npm 9 or newer** (ships with Node)
- **PostgreSQL 14 or newer** running locally
- **Git**

Optional:

- A **NASA FIRMS** map key if you want NASA hotspot data wired in.
- A **Google OAuth client id/secret** if you want the Google sign-in flow.

---

## 5. Mac Setup

Use Homebrew to install Node and PostgreSQL.

```bash
# Install Homebrew if you don't have it: https://brew.sh
brew install node
brew install postgresql@16
brew services start postgresql@16

# Create the database (uses your Mac username as the Postgres role)
createdb wildfire_tracker

# Verify it exists
psql -d wildfire_tracker -c "\conninfo"
```

Your Mac `DATABASE_URL` (no password, default Homebrew install):

```
DATABASE_URL="postgresql://YOUR_MAC_USERNAME@localhost:5432/wildfire_tracker?schema=public"
```

Find your Mac username with `whoami`.

## 6. Windows Setup

1. Install **Node.js LTS** from <https://nodejs.org/> (use the default options).
2. Install **PostgreSQL** from <https://www.postgresql.org/download/windows/>.
   - During install, set a password for the `postgres` user — **remember it**.
   - Make sure "pgAdmin" and "Command Line Tools" are checked.
3. Open **PowerShell** and confirm versions:

```powershell
node -v
npm -v
psql --version
```

4. Create the database. If `psql`/`createdb` are on your PATH:

```powershell
createdb -U postgres wildfire_tracker
```

If `createdb` isn't recognized, either add `C:\Program Files\PostgreSQL\16\bin` to your PATH, or use **pgAdmin**:

- Open pgAdmin → expand "Servers" → right-click "Databases" → Create → Database…
- Name: `wildfire_tracker` → Save.

Your Windows `DATABASE_URL` (replace `YOUR_PASSWORD`):

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/wildfire_tracker?schema=public"
```

---

## 7. Backend Setup (`server/`)

Run from the project root:

```bash
cd server
npm install
```

Copy the env template and fill in your values:

**Mac / Linux**
```bash
cp .env.example .env
```

**Windows (PowerShell)**
```powershell
copy .env.example .env
```

Open `server/.env` and at minimum set:

- `PORT=5050`
- `DATABASE_URL` (use the Mac or Windows example above)
- `JWT_SECRET` (any long random string)
- `NASA_FIRMS_MAP_KEY` (optional, see section 14)

Generate the Prisma client and apply migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run seed        # optional: inserts demo wildfire records
```

Start the dev server (hot reload via nodemon):

```bash
npm run dev
```

You should see:

```
WildFire-Tracker backend listening on port 5050
```

## 8. Frontend Setup (`client/`)

In a new terminal:

```bash
cd client
npm install
```

Create the frontend env file:

**Mac / Linux**
```bash
cp .env.example .env
```

**Windows (PowerShell)**
```powershell
copy .env.example .env
```

The frontend `.env` only needs:

```
VITE_API_URL=http://localhost:5050
```

Run the dev server:

```bash
npm run dev
```

Vite prints a local URL (usually `http://localhost:5173`). Open it in your browser.

PWA/Add to Home Screen notes:

- The app includes `client/public/manifest.json` and `client/public/service-worker.js`.
- On iPhone/iPad Safari, open the deployed site, tap Share, then tap Add to Home Screen.
- On desktop Chrome/Edge, use the install icon in the address bar when available.
- The app can be installed to the home screen as a PWA.

## 9. PostgreSQL / Database Setup

You only need this once per machine.

**Mac (Homebrew):**

```bash
brew services start postgresql@16     # start it
brew services stop postgresql@16      # stop it
createdb wildfire_tracker             # create the DB
dropdb wildfire_tracker               # delete it (e.g. to start over)
```

**Windows:**

The PostgreSQL service starts automatically after install. To manage it:

- Services app → "postgresql-x64-16" → Start/Stop/Restart
- Or PowerShell as admin: `Restart-Service postgresql-x64-16`

Create or drop the DB:

```powershell
createdb -U postgres wildfire_tracker
dropdb -U postgres wildfire_tracker
```

## 10. Prisma — Migrate / Seed Commands

All Prisma commands run from `server/`.

```bash
# Generate the typed Prisma client (run after editing schema.prisma)
npm run prisma:generate

# Create + apply a new migration in dev
npm run prisma:migrate

# Open the Prisma Studio GUI to browse data
npm run prisma:studio

# Seed demo data
npm run seed
```

If migrations get into a bad state in dev (and only in dev), reset with:

```bash
npx prisma migrate reset
```

That command **drops the database**, re-applies all migrations, and reruns the seed.

## 11. Running Microservices and Frontend

The React frontend still calls only the API Gateway:

```
VITE_API_URL=http://localhost:5050
```

The backend now runs as five independent Node/Express services:

| Service | Port | Start script |
| --- | --- | --- |
| API Gateway | 5050 | `npm run dev:gateway` |
| Auth/User Service | 5051 | `npm run dev:auth` |
| Fire Data Service | 5052 | `npm run dev:fire` |
| Alert/Notification Service | 5053 | `npm run dev:alerts` |
| Evacuation Resource Service | 5054 | `npm run dev:evacuation` |

Open **two terminals**.

Terminal 1 — all backend microservices:
```bash
cd server
npm run dev:microservices
```

Terminal 2 — frontend:
```bash
cd client
npm run dev
```

Health checks:

```bash
curl http://localhost:5050/api/health
curl http://localhost:5051/api/health
curl http://localhost:5052/api/health
curl http://localhost:5053/api/health
curl http://localhost:5054/api/health
```

The old single-process `server/src/app.js` is kept as a simple legacy/reference app, but normal development should use `npm run dev:microservices`.

## 12. Microservices Architecture

See `docs/microservices-architecture.md` for the service responsibilities, service-to-service communication, and demo explanation.

Gateway routing:

- `/api/auth/*` and `/api/users/*` -> Auth/User Service on `5051`
- `/api/fires/*`, `/api/nws-alerts/*`, `/api/locations/*`, `/api/resources/*`, `/api/air-quality` -> Fire Data Service on `5052`
- `/api/alerts/*` -> Alert/Notification Service on `5053`
- `/api/evacuation-resources/*` -> Evacuation Resource Service on `5054`

All protected routes still use:

```http
Authorization: Bearer <token>
```

All services use the same PostgreSQL database through Prisma and the same `JWT_SECRET`, which keeps local setup simple for the assignment.

## 13. Assignment 3/4 Completion Map

Implemented backend/full-stack features:

- Express backend with CORS, JSON parsing, centralized 404/error handling, env config, graceful Prisma shutdown.
- PostgreSQL through Prisma for users, saved locations, alert preferences, wildfire records, and evacuation resources.
- Auth flow: signup/register, login, JWT protected routes, current user/profile route, logout endpoint.
- CRUD: profile update/delete, saved locations create/read/update/delete, alert preference upsert/read, internal wildfire record create/read/update/delete, evacuation resource create/read/update/delete.
- Frontend pages use backend data for Dashboard, Map, Fire Details, Alerts, Settings/Profile, and Resources.
- Location features: browser geolocation, nearby fire lookup, saved monitored locations, location-based alert check.
- Notification support: alert preferences in database, `/api/alerts/local` nearby-fire check, Alerts UI notification toggle, browser notification permission/request.
- Email notifications: Resend-backed email alerts, persisted email opt-in, and duplicate-email cooldown.
- PWA/Add to Home Screen support: `manifest.json`, Apple touch icon, theme metadata, and a lightweight service worker.
- Social sharing: Fire Details has Facebook, X, and TikTok/Instagram-style copy template.
- Evacuation resources: seeded mock shelter/evacuation data in PostgreSQL plus nearby resource endpoint and Resources UI.
- True local microservices: API Gateway plus Auth/User, Fire Data, Alert/Notification, and Evacuation Resource services on separate ports.
- C4 diagrams: `docs/c4-context.md`, `docs/c4-container.md`, `docs/c4-component.md`.
- API testing docs: `docs/api-testing.md`.
- Demo checklist: `docs/demo-checklist.md`.

## 14. API Testing

See `docs/api-testing.md` for Postman/Insomnia setup and curl commands covering auth, CRUD, local alerts, wildfire records, and evacuation resources.

Quick smoke test:

```bash
curl http://localhost:5050/api/health
curl "http://localhost:5050/api/fires?demo=true"
curl "http://localhost:5050/api/evacuation-resources/nearby?latitude=33.6846&longitude=-117.8265&radius=75"
```

Email alert test:

```bash
TOKEN="paste-login-token"

curl -X POST http://localhost:5050/api/alerts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"radius":75,"enabled":true,"emailAlertsEnabled":true}'

curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5050/api/alerts/local?latitude=33.6846&longitude=-117.8265&radius=75"
```

The response includes `data.emailNotification`. It will show `sent: true` when Resend is configured and an email was sent, or a skipped reason when email is disabled, Resend is not configured, no fires were found, or the cooldown prevented a duplicate.

## 15. Production Build

Backend:

```bash
cd server
npm install
npm run prisma:generate
npm run prisma:migrate
npm start
```

Frontend:

```bash
cd client
npm install
npm run build
npm run preview
```

## 16. AWS Deployment Readiness

- Backend can deploy to Elastic Beanstalk, EC2, ECS, or Lambda/API Gateway. Set `PORT`, `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, and `FRONTEND_URL` in the AWS environment/secret manager.
- Database should be a managed PostgreSQL instance such as Amazon RDS. Run Prisma migrations during deployment or from a trusted admin machine.
- Frontend can deploy to S3 + CloudFront, Amplify, or be served by the same Node/Express host. Set `VITE_API_URL` to the deployed backend URL before `npm run build`.
- Use CloudWatch Logs for backend logs and alarms.
- Use HTTPS with AWS Certificate Manager (ACM). Add the HTTPS frontend domain to `FRONTEND_URL` for CORS.
- Store Google/NASA/API keys in environment variables or AWS Secrets Manager, never in Git.

## 17. Resend Email Alerts

Install dependency:

```bash
cd server
npm install resend
```

Add these to `server/.env`:

```bash
RESEND_API_KEY=re_your_key_here
ALERT_FROM_EMAIL="Wildfire Tracker <alerts@your-verified-domain.com>"
ALERT_EMAIL_COOLDOWN_MINUTES=60
```

For a quick Resend test account, use a verified sender/domain from the Resend dashboard. In the live demo:

1. Start microservices with `npm run dev:microservices`.
2. Log in as `demo@example.com`.
3. Open Settings and enable Email alerts.
4. Save preferences.
5. Click Check local alerts or call `/api/alerts/local`.
6. Show the `emailNotification.sent` field in the API response and the email received in the inbox.

Backend: `http://localhost:5050`
Frontend: `http://localhost:5173`

The frontend reads `VITE_API_URL` from `client/.env` to know where the API lives.

## 12. Testing Backend Endpoints with curl

The backend must be running on port 5050.

```bash
curl http://localhost:5050/api/health
curl http://localhost:5050/api/fires
curl "http://localhost:5050/api/fires/nearby?latitude=34.05&longitude=-118.24&radius=50"
```

Expected `/api/health` response:

```json
{ "success": true, "message": "WildFire-Tracker backend is running.", "timestamp": "..." }
```

## 13. Login / Signup Test Flow

Sign up:

```bash
curl -X POST http://localhost:5050/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","username":"testuser","password":"password123"}'
```

Log in:

```bash
curl -X POST http://localhost:5050/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

Copy the `data.token` from the response, then call a protected route:

```bash
curl http://localhost:5050/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

In the browser:

1. Visit `http://localhost:5173`.
2. Click **Register** in the sidebar → create the account.
3. You'll be redirected to the dashboard.
4. Use the sidebar **Logout** to sign out, then **Login** to sign back in.

## 14. NASA FIRMS Key Setup

NASA FIRMS provides satellite hotspot data.

1. Request a key: <https://firms.modaps.eosdis.nasa.gov/api/area/>
2. Add it to `server/.env` only (never the frontend):

```
NASA_FIRMS_MAP_KEY=your_key_here
NASA_FIRMS_API_URL=https://firms.modaps.eosdis.nasa.gov/api/area/csv
NASA_FIRMS_SOURCE=VIIRS_SNPP_NRT
NASA_FIRMS_AREA=world
NASA_FIRMS_DAY_RANGE=1
```

3. Restart the backend (`Ctrl+C` then `npm run dev`).

## 15. Common Errors and Fixes

**"ECONNREFUSED 127.0.0.1:5432"**
PostgreSQL isn't running. Mac: `brew services start postgresql@16`. Windows: start the `postgresql-x64-16` service.

**"P1001: Can't reach database server"**
Check `DATABASE_URL` in `server/.env`. On Mac, `YOUR_MAC_USERNAME` must match `whoami`. On Windows, the password must match what you set during PostgreSQL install.

**"role 'postgres' does not exist" (Mac)**
Homebrew Postgres uses your Mac username, not `postgres`. Use `postgresql://YOUR_MAC_USERNAME@localhost:5432/...`.

**"PrismaClientInitializationError" / "Did you forget to run `prisma generate`?"**
From `server/`: `npm run prisma:generate`.

**"Network error. Is the backend running?" in the UI**
The backend isn't on port 5050, or `client/.env` doesn't have `VITE_API_URL=http://localhost:5050`. Restart Vite after editing `.env`.

**Port 5050 or 5173 already in use**

Mac:
```bash
lsof -i :5050
kill -9 PID
```

Windows PowerShell:
```powershell
netstat -ano | findstr :5050
taskkill /PID PID_NUMBER /F
```

Same trick works for `:5173`.

**"npm error 403" or "ENOTCACHED" during install**
Network issue or restricted registry. Retry on a different network or run `npm config get registry` to confirm it's `https://registry.npmjs.org/`.

**Vite build fails with "Cannot find module '@rolldown/binding-...'"**
Your `node_modules` was installed on a different OS/architecture than the one you're now running on. Fix:
```bash
# Mac / Linux
rm -rf node_modules package-lock.json
npm install
```
```powershell
# Windows PowerShell
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
```

**CORS error in the browser console**
The backend allows `http://localhost:5173` by default. If you're running Vite on a different port, add it to the CORS origins in `server/src/app.js`.

## 16. Git Workflow

```bash
# get the latest main
git checkout main
git pull origin main

# start a feature branch
git checkout -b feat/<short-description>

# stage + commit
git status
git add <files>
git commit -m "feat: short clear description"

# push and open a PR
git push -u origin feat/<short-description>
```

Before pushing:

- Run `npm run build` in `client/` to confirm the frontend still builds.
- Run the backend locally (`npm run dev`) and hit `/api/health` to confirm it boots.
- Don't push your `.env` (see section 17).

Useful safety commands:

```bash
git diff                    # see unstaged changes
git diff --staged           # see staged changes
git restore <file>          # discard local changes to a file
git log --oneline -10       # last 10 commits
```
