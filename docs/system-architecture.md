# System Architecture

This diagram shows the full WildFire-Tracker system.

It includes the React frontend, API Gateway, backend services, PostgreSQL/Prisma database, external APIs, and planned deployment pieces.

## Main Architecture Diagram

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
    U["User"]

    subgraph FE["Frontend Layer"]
        direction TB
        F["React + Vite Frontend<br/>Map, pages, forms"]
    end

    subgraph BE["Backend Layer"]
        direction TB
        G["API Gateway / Express<br/>CORS, JSON, routing<br/>Local port 5050"]
    end

    subgraph MS["Microservices Layer"]
        direction TB
        FD["Fire Data Service<br/>CAL FIRE, NASA FIRMS, NWS<br/>Fire CRUD<br/>Port 5052"]
        AU["Auth / User Service<br/>JWT, profile, saved locations<br/>Port 5051"]
        AN["Alert / Notification Service<br/>Preferences, local alerts, email<br/>Port 5053"]
        ER["Evacuation Resource Service<br/>Resource CRUD, nearby lookup<br/>Port 5054"]
    end

    subgraph EXT["External Services"]
        direction TB
        CF["CAL FIRE API<br/>Official incidents"]
        NASA["NASA FIRMS<br/>Thermal detections"]
        NWS["NWS Alerts API<br/>Weather alerts"]
        GM["Google Maps / Geolocation<br/>Map and location tools"]
        GO["Google OAuth<br/>Optional placeholder"]
        RE["Resend Email<br/>Optional email alerts"]
    end

    subgraph DATA["Data Layer"]
        direction LR
        P["Prisma ORM"]
        DB[("PostgreSQL Database<br/>Users, fires, alerts, resources")]
    end

    subgraph DEP["Deployment / Cloud Layer"]
        direction LR
        HOST["Public Frontend Hosting<br/>TODO deployed website"]
        HTTPS["HTTPS / ACM<br/>Planned"]
        AWS["AWS Backend Hosting<br/>Planned"]
        CW["CloudWatch Logs<br/>Planned"]
    end

    U --> F
    F --> G
    G --> FD
    G --> AU
    G --> AN
    G --> ER

    FD --> CF
    FD --> NASA
    FD --> NWS
    FD --> GM

    AU -. optional .-> GO
    AN -. optional .-> RE

    FD --> P
    AU --> P
    AN --> P
    ER --> P
    P --> DB

    HOST -->|HTTP requests| HTTPS
    HTTPS --> AWS
    AWS -. logs .-> CW
    FD -. logs .-> CW
    AU -. logs .-> CW
    AN -. logs .-> CW
    ER -. logs .-> CW

    classDef user fill:#ffffff,stroke:#94a3b8,stroke-width:2px,color:#0f172a;
    classDef frontend fill:#eff6ff,stroke:#60a5fa,stroke-width:2px,color:#0f172a;
    classDef backend fill:#f0fdf4,stroke:#4ade80,stroke-width:2px,color:#0f172a;
    classDef service fill:#fff7ed,stroke:#fb923c,stroke-width:2px,color:#0f172a;
    classDef external fill:#faf5ff,stroke:#a78bfa,stroke-width:2px,color:#0f172a;
    classDef data fill:#f0f9ff,stroke:#38bdf8,stroke-width:2px,color:#0f172a;
    classDef deploy fill:#f8fafc,stroke:#93c5fd,stroke-width:2px,color:#0f172a;

    class U user;
    class F frontend;
    class G backend;
    class FD,AU,AN,ER service;
    class CF,NASA,NWS,GM,GO,RE external;
    class P,DB data;
    class HOST,HTTPS,AWS,CW deploy;

    style FE fill:#eff6ff,stroke:#93c5fd,stroke-width:2px,color:#1d4ed8;
    style BE fill:#f0fdf4,stroke:#86efac,stroke-width:2px,color:#15803d;
    style MS fill:#fff7ed,stroke:#fdba74,stroke-width:2px,color:#ea580c;
    style EXT fill:#faf5ff,stroke:#c4b5fd,stroke-width:2px,color:#7e22ce;
    style DATA fill:#f0f9ff,stroke:#7dd3fc,stroke-width:2px,color:#0369a1;
    style DEP fill:#f8fafc,stroke:#bfdbfe,stroke-width:2px,color:#2563eb;
```

## Component Explanation

| Part | What it does |
| --- | --- |
| React frontend | Shows the map, pages, forms, alerts, and resources. |
| API Gateway / Express | Main backend entry point. Handles CORS and sends requests to services. |
| Auth/User Service | Handles signup, login, JWT, profile, and saved locations. |
| Fire Data Service | Gets CAL FIRE, NASA FIRMS, NWS data, and supports wildfire CRUD. |
| Alert/Notification Service | Saves alert preferences and checks local alerts. |
| Evacuation Resource Service | Handles evacuation resource CRUD and nearby search. |
| Prisma + PostgreSQL | Stores users, saved locations, alert preferences, wildfire records, and resources. |
| External services | Provide maps, fire feeds, weather alerts, OAuth login, and optional email alerts. |
