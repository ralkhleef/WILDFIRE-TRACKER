# WildFire-Tracker

WildFire-Tracker is a full-stack wildfire tracking app. Users can view wildfire data, save monitored locations, check alerts, update a profile, and view evacuation resources.

## Main Features

- Auth: login/register with JWT, guest mode, and Google OAuth placeholder.
- Map: Google Maps, CAL FIRE official fires, NASA thermal detections, and NWS weather alerts.
- User tools: profile update, saved locations, alert preferences, and local alert checks.
- Resources: evacuation resources, help/offline pages, PWA files, and microservices extra credit.

## Tech Stack

| Area | Tools |
| --- | --- |
| Frontend | React, Vite, React Router, Google Maps |
| Backend | Node.js, Express, JWT, Passport |
| Database | PostgreSQL, Prisma |
| External APIs | CAL FIRE, NASA FIRMS, NWS, Google Maps, Resend |
| Bonus | API Gateway plus separate backend services |

## Architecture

Full version: [System architecture diagram](docs/system-architecture.md)

```mermaid
%%{init: {
  "theme": "base",
  "themeVariables": {
    "background": "#fffdf7",
    "primaryColor": "#ffffff",
    "primaryTextColor": "#111827",
    "primaryBorderColor": "#cbd5e1",
    "lineColor": "#334155",
    "fontFamily": "Inter, Arial, sans-serif"
  }
}}%%

flowchart LR
    U["User"] --> F["React + Vite Frontend"]
    F --> G["API Gateway / Express"]
    G --> MS["Microservices"]
    MS --> P["Prisma ORM"]
    P --> DB[("PostgreSQL")]
    MS --> EXT["External APIs<br/>CAL FIRE, NASA FIRMS, NWS, Google, Resend"]

    classDef user fill:#ffffff,stroke:#94a3b8,stroke-width:2px,color:#0f172a;
    classDef frontend fill:#eff6ff,stroke:#60a5fa,stroke-width:2px,color:#0f172a;
    classDef backend fill:#f0fdf4,stroke:#4ade80,stroke-width:2px,color:#0f172a;
    classDef service fill:#fff7ed,stroke:#fb923c,stroke-width:2px,color:#0f172a;
    classDef data fill:#f0f9ff,stroke:#38bdf8,stroke-width:2px,color:#0f172a;
    classDef external fill:#faf5ff,stroke:#a78bfa,stroke-width:2px,color:#0f172a;

    class U user;
    class F frontend;
    class G backend;
    class MS service;
    class P,DB data;
    class EXT external;
```

## Microservices Diagram

```mermaid
flowchart LR
    Frontend[React Frontend] --> Gateway[API Gateway<br/>:5050]
    Gateway --> Auth[Auth/User Service<br/>:5051]
    Gateway --> Fire[Fire Data Service<br/>:5052]
    Gateway --> Alerts[Alert/Notification Service<br/>:5053]
    Gateway --> Evac[Evacuation Resource Service<br/>:5054]
    Auth --> DB[(Shared PostgreSQL)]
    Fire --> DB
    Alerts --> DB
    Evac --> DB
```

## Data Flow

```mermaid
flowchart LR
    Action[User action] --> UI[Frontend request]
    UI --> Route[Backend route]
    Route --> Source[Database or external API]
    Source --> Response[JSON response]
    Response --> Screen[UI updates]
```

## Quick Setup

Create the database first:

```bash
createdb wildfire_tracker
```

Backend:

```bash
cd server
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev:microservices
```

Frontend:

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

Seeded login: `demo@example.com` / `password123`

Single-server option: `cd server && npm run dev:single`

## Required Environment 

Minimum `server/.env`:

```bash
DATABASE_URL="postgresql://YOUR_USER@localhost:5432/wildfire_tracker?schema=public"
JWT_SECRET=replace_with_a_long_random_value
FRONTEND_URL=http://localhost:5173
```

Minimum `client/.env`:

```bash
VITE_API_URL=http://localhost:5050
VITE_GOOGLE_MAPS_API_KEY=your_browser_maps_key
```

## Helpful Docs

- [System architecture diagram](docs/system-architecture.md)
- [C4 diagrams](docs/c4-diagrams.md)
- [Microservices architecture](docs/microservices-architecture.md)
- [Backend and deployment notes](docs/BACKEND_NOTES.md)
- [Remaining TODOs](docs/TODO_NOTES.md)
