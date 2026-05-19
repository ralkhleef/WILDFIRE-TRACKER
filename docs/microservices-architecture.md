# Microservices Architecture

The React frontend still uses one API URL:

```text
VITE_API_URL=http://localhost:5050
```

Port `5050` is now an API Gateway. It accepts browser requests, handles CORS/logging/health, then forwards the same route names to independent services.

## Services

| Service | Port | Main Routes | Responsibility |
| --- | --- | --- | --- |
| API Gateway | 5050 | `/api/*` | Frontend entrypoint, CORS, logging, health, forwarding |
| Auth/User Service | 5051 | `/api/auth/*`, `/api/users/*` | Signup, login, JWT, current user, profile, saved locations |
| Fire Data Service | 5052 | `/api/fires/*`, `/api/nws-alerts/*`, `/api/locations/*` | CAL FIRE/NASA feeds, wildfire CRUD, nearby fires, weather/location helpers |
| Alert/Notification Service | 5053 | `/api/alerts/*` | Alert preferences, local alerts, notification-ready payloads |
| Evacuation Resource Service | 5054 | `/api/evacuation-resources/*` | Shelter/resource CRUD and nearby lookup |

## Database

All services use the existing PostgreSQL database through Prisma.

## Service Communication

- Frontend -> API Gateway only.
- API Gateway -> domain service by HTTP.
- Alert/Notification Service -> Fire Data Service by HTTP when building local fire alerts.
- JWT stays shared because every service reads the same `JWT_SECRET`.
- Protected routes keep using `Authorization: Bearer <token>`.

## Local Startup

```bash
cd server
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev:microservices
```

Or run services individually:

```bash
npm run dev:gateway
npm run dev:auth
npm run dev:fire
npm run dev:alerts
npm run dev:evacuation
```

## Checks

```bash
curl http://localhost:5050/api/health
curl http://localhost:5051/api/health
curl http://localhost:5052/api/health
curl http://localhost:5053/api/health
curl http://localhost:5054/api/health
```