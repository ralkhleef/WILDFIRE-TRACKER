# System Architecture

This diagram shows the full WildFire-Tracker system and  includes the React frontend, API Gateway, backend services, PostgreSQL/Prisma database and any external APIs.

## Main Architecture Diagram

```mermaid
flowchart LR
    U["👤 User"]

    subgraph CLOUD["☁️ Deployment / Cloud Layer"]
        HOST_FE["🌐 Public Frontend Hosting<br/>(TODO deployed website)"]
        HOST_BE["☁️ AWS Backend Hosting<br/>(planned)"]
        HTTPS["🔒 HTTPS / ACM<br/>(planned)"]
        CW["📊 CloudWatch Logs<br/>(planned)"]
    end

    subgraph FE["💻 Frontend Layer"]
        REACT["⚛️ React + Vite Frontend<br/>Map, pages, forms"]
    end

    subgraph BE["🚪 Backend Layer"]
        GATEWAY["API Gateway / Express<br/>CORS, JSON, routing<br/>Local port 5050"]
    end

    subgraph MS["🧩 Microservices Layer"]
        AUTH["🔐 Auth/User Service<br/>JWT, profile, saved locations<br/>Port 5051"]
        FIRE["🔥 Fire Data Service<br/>CAL FIRE, NASA FIRMS, NWS, fire CRUD<br/>Port 5052"]
        ALERT["🔔 Alert/Notification Service<br/>preferences, local alerts, email<br/>Port 5053"]
        EVAC["🗺️ Evacuation Resource Service<br/>resource CRUD, nearby lookup<br/>Port 5054"]
    end

    subgraph DATA["🗄️ Data Layer"]
        PRISMA["Prisma ORM"]
        DB[("PostgreSQL Database<br/>users, fires, alerts, resources")]
    end

    subgraph EXT["🌎 External Services"]
        CF["🚒 CAL FIRE API<br/>official incidents"]
        NASA["🛰️ NASA FIRMS<br/>thermal detections"]
        NWS["🌦️ NWS Alerts API<br/>weather alerts"]
        MAPS["📍 Google Maps / Geolocation<br/>map and location tools"]
        OAUTH["🔑 Google OAuth<br/>optional placeholder"]
        RESEND["✉️ Resend Email<br/>optional email alerts"]
    end

    U --> HOST_FE
    HOST_FE --> REACT
    U --> REACT
    REACT -->|"HTTP requests"| HTTPS
    HTTPS --> GATEWAY
    HOST_BE --> GATEWAY
    GATEWAY --> AUTH
    GATEWAY --> FIRE
    GATEWAY --> ALERT
    GATEWAY --> EVAC

    AUTH --> PRISMA
    FIRE --> PRISMA
    ALERT --> PRISMA
    EVAC --> PRISMA
    PRISMA --> DB

    FIRE --> CF
    FIRE --> NASA
    FIRE --> NWS
    REACT --> MAPS
    FIRE --> MAPS
    AUTH -. optional .-> OAUTH
    ALERT -. optional .-> RESEND

    GATEWAY -. logs .-> CW
    AUTH -. logs .-> CW
    FIRE -. logs .-> CW
    ALERT -. logs .-> CW
    EVAC -. logs .-> CW

    classDef user fill:#f8fafc,stroke:#64748b,stroke-width:2px,color:#111827;
    classDef cloud fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#111827;
    classDef frontend fill:#dbeafe,stroke:#1d4ed8,stroke-width:2px,color:#111827;
    classDef backend fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#111827;
    classDef service fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#111827;
    classDef data fill:#ede9fe,stroke:#7c3aed,stroke-width:2px,color:#111827;
    classDef external fill:#fee2e2,stroke:#dc2626,stroke-width:2px,color:#111827;

    class U user;
    class HOST_FE,HOST_BE,HTTPS,CW cloud;
    class REACT frontend;
    class GATEWAY backend;
    class AUTH,FIRE,ALERT,EVAC service;
    class PRISMA,DB data;
    class CF,NASA,NWS,MAPS,OAUTH,RESEND external;
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
