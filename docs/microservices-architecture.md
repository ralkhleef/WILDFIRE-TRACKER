# Microservices Architecture

This is the bonus extra credit part of the project.

The frontend still uses one API URL:

```text
VITE_API_URL=http://localhost:5050
```

Port `5050` is the API Gateway. It receives frontend requests and forwards them to smaller backend services.

## Diagram

```mermaid
flowchart LR
    Frontend[React Frontend] --> Gateway[API Gateway<br/>5050]
    Gateway --> Auth[Auth/User Service<br/>5051]
    Gateway --> Fire[Fire Data Service<br/>5052]
    Gateway --> Alerts[Alert/Notification Service<br/>5053]
    Gateway --> Evac[Evacuation Resource Service<br/>5054]

    Auth --> DB[(Shared PostgreSQL)]
    Fire --> DB
    Alerts --> DB
    Evac --> DB

    Fire --> External[CAL FIRE, NASA, NWS, Google APIs]
    Alerts --> Email[Resend Email]
```

## Services

| Service | What it does |
| --- | --- |
| API Gateway | Main entry point. Handles CORS, health check, logging, and forwarding. |
| Auth/User Service | Handles signup, login, JWT, Google OAuth placeholder, profile, and saved locations. |
| Fire Data Service | Gets fire data, weather alerts, Google helper data, and wildfire CRUD. |
| Alert/Notification Service | Saves alert preferences and checks local fire alerts. |
| Evacuation Resource Service | Saves, updates, deletes, lists, and searches evacuation resources. |
| PostgreSQL database | Shared database used by all services through Prisma. |

## How Requests Move

```mermaid
sequenceDiagram
    participant UI as React UI
    participant GW as API Gateway
    participant SVC as Domain Service
    participant DB as PostgreSQL

    UI->>GW: HTTP request to /api/...
    GW->>SVC: Forward to matching service
    SVC->>DB: Read or write with Prisma
    DB-->>SVC: Data
    SVC-->>GW: JSON response
    GW-->>UI: JSON response
```

## Local Commands

Run everything together:

```bash
cd server
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev:microservices
```

Run one service at a time:

```bash
npm run dev:gateway
npm run dev:auth
npm run dev:fire
npm run dev:alerts
npm run dev:evacuation
```