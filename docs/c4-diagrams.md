# C4 Diagrams

These diagrams show the current WildFire-Tracker architecture.

## 1. Context

The app is used by a visitor or logged-in user. It also talks to outside data providers.

```mermaid
flowchart TB
    User[User<br/>views map and alerts]
    Guest[Guest<br/>views public fire data]
    App[WildFire-Tracker<br/>React + Express app]

    Google[Google Maps<br/>map and location tools]
    CALFIRE[CAL FIRE<br/>official incidents]
    NASA[NASA FIRMS<br/>thermal detections]
    NWS[NWS<br/>weather alerts]
    OAuth[Google OAuth<br/>optional login]
    Resend[Resend<br/>email alerts]

    User --> App
    Guest --> App
    App --> Google
    App --> CALFIRE
    App --> NASA
    App --> NWS
    App --> OAuth
    App --> Resend
```

## 2. Container

The frontend calls one backend URL. The gateway sends requests to the service that owns that feature.

```mermaid
flowchart LR
    Browser[Browser]
    Frontend[React + Vite<br/>port 5173]
    Gateway[API Gateway<br/>Express port 5050]

    Auth[Auth/User Service<br/>port 5051]
    Fire[Fire Data Service<br/>port 5052]
    Alerts[Alert Service<br/>port 5053]
    Evac[Evacuation Service<br/>port 5054]

    DB[(PostgreSQL<br/>Prisma)]
    APIs[External APIs<br/>CAL FIRE, NASA, NWS, Google, Resend]

    Browser --> Frontend
    Frontend --> Gateway
    Gateway --> Auth
    Gateway --> Fire
    Gateway --> Alerts
    Gateway --> Evac
    Auth --> DB
    Fire --> DB
    Alerts --> DB
    Evac --> DB
    Fire --> APIs
    Alerts --> APIs
    Auth --> APIs
```

## 3. Component

Inside the backend, routes call controllers, controllers call services, and services use Prisma or outside APIs.

```mermaid
flowchart TB
    Frontend[React Frontend]
    Routes[Express Routes]
    Controllers[Controllers]
    Services[Services]
    Prisma[Prisma Client]
    DB[(PostgreSQL)]
    External[External APIs]

    Frontend --> Routes
    Routes --> Controllers
    Controllers --> Services
    Services --> Prisma
    Prisma --> DB
    Services --> External
```

## Code Match

| Diagram part | Code location |
| --- | --- |
| React frontend | `client/src` |
| API Gateway | `server/src/gateway` |
| Auth/User Service | `server/src/microservices/authUser` |
| Fire Data Service | `server/src/microservices/fireData` |
| Alert Service | `server/src/microservices/alertNotification` |
| Evacuation Service | `server/src/microservices/evacuationResource` |
| Prisma schema | `server/prisma/schema.prisma` |
