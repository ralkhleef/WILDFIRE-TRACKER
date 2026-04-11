## Project Overview

WildFire-Tracker is a real-time wildfire tracking web application that will display active fires on a map, provide location-based alerts, and surface details such as fire size, containment, and air quality using public wildfire data sources.

## Backend Folder Structure

```text
WildFire-Tracker/
├── README.md
└── server/
    ├── .env.example
    ├── .gitignore
    ├── package.json
    ├── prisma/
    │   └── schema.prisma
    └── src/
        ├── app.js
        ├── server.js
        ├── config/
        │   ├── env.js
        │   ├── passport.js
        │   └── prisma.js
        ├── controllers/
        │   ├── alertController.js
        │   ├── authController.js
        │   ├── fireController.js
        │   └── userController.js
        ├── middleware/
        │   ├── authMiddleware.js
        │   ├── errorMiddleware.js
        │   ├── notFoundMiddleware.js
        │   └── validationMiddleware.js
        ├── models/
        │   └── index.js
        ├── routes/
        │   ├── alertRoutes.js
        │   ├── authRoutes.js
        │   ├── fireRoutes.js
        │   ├── index.js
        │   └── userRoutes.js
        ├── services/
        │   ├── alertService.js
        │   ├── authService.js
        │   ├── calfireService.js
        │   ├── fireService.js
        │   ├── nasaService.js
        │   └── userService.js
        └── utils/
            ├── ApiError.js
            ├── asyncHandler.js
            └── geolocation.js
```

## Setup Instructions

1. Install Node.js 20+ and PostgreSQL on your machine.
2. Move into the backend folder:
   `cd server`
3. Install backend dependencies:
   `npm install`
4. Copy the environment template:
   `cp .env.example .env`
5. Update the values in `.env`, especially `DATABASE_URL`, `JWT_SECRET`, and Google OAuth keys.
6. Generate the Prisma client:
   `npx prisma generate`
7. Create and apply the first migration:
   `npx prisma migrate dev --name init`
8. Start the development server:
   `npm run dev`

## How To Run Locally

Use the backend health check once the server is running:

`GET http://localhost:5001/api/health`

Expected result:

- JSON response confirming the backend is running
- timestamp showing when the response was created

## Environment Variables Needed

- `PORT`: local Express server port
- `NODE_ENV`: environment mode, usually `development`
- `DATABASE_URL`: PostgreSQL connection string used by Prisma
- `JWT_SECRET`: secret used to sign JWT tokens
- `JWT_EXPIRES_IN`: JWT expiration window, such as `7d`
- `GOOGLE_CLIENT_ID`: Google OAuth client id placeholder
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret placeholder
- `GOOGLE_CALLBACK_URL`: Google OAuth callback route
- `CALFIRE_API_URL`: primary wildfire data source
- `NASA_API_URL`: secondary wildfire data source
- `DEFAULT_ALERT_RADIUS_MILES`: default search radius for nearby alerts

## API Route Summary

Auth routes:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/auth/google`
- `GET /api/auth/google/callback`

Fire routes:

- `GET /api/fires`
- `GET /api/fires/:id`
- `GET /api/fires/nearby`

Alert routes:

- `GET /api/alerts`
- `POST /api/alerts`
- `GET /api/alerts/local`

User routes:

- `GET /api/users/profile`
- `PUT /api/users/profile`
- `POST /api/users/saved-locations`
- `GET /api/users/saved-locations`

## Database Schema Summary

Prisma models included in [`server/prisma/schema.prisma`](server/prisma/schema.prisma):

- `User`: stores account information, hashed password for JWT login, optional Google OAuth id, and timestamps
- `SavedLocation`: stores user-linked latitude and longitude records for alert lookups
- `AlertPreference`: stores one alert preference record per user with radius and enabled status
- `WildfireRecord`: stores fire name, location, coordinates, size, containment, source, and timestamps

Relationship summary:

- one `User` can have many `SavedLocation` records
- one `User` can have one `AlertPreference`

## External API Usage

- CAL FIRE is the primary wildfire service placeholder in [`server/src/services/calfireService.js`](server/src/services/calfireService.js)
- NASA EONET is the secondary wildfire service placeholder in [`server/src/services/nasaService.js`](server/src/services/nasaService.js)
- `GET /api/fires` and `GET /api/fires/nearby` can be extended with `?includeExternal=true` to merge placeholder external service responses with database records
- `GET /api/alerts/local` uses the geolocation helper in [`server/src/utils/geolocation.js`](server/src/utils/geolocation.js) to find nearby fires

