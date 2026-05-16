# TODO

## Not finished yet

* Finish final map popup polish so Official Fires, Thermal Detection, and Weather Alerts use a consistent popup style.
* Make Weather Alerts feel more connected to the map instead of looking like separate cards.
* Test saved locations CRUD fully from the UI.
* Test alert preferences and email alert flow fully from the UI.
* Test guest mode restrictions on protected actions.
* Test Google OAuth end-to-end after deployment URLs are finalized.
* Test on moblie.
* Clean up Fire Details page layout if needed.
* Deploy the full-stack app and add production environment variables/deployed URLs.
* Confirm AWS/CloudWatch/HTTPS deployment notes are ready for submission.

## Current working features

* Microservices are implemented:

  * API Gateway on port 5050
  * Auth/User Service on port 5051
  * Fire Data Service on port 5052
  * Alert/Notification Service on port 5053
  * Evacuation Resource Service on port 5054
* React frontend runs with Vite.
* API Gateway forwards frontend requests to the correct microservice.
* PostgreSQL and Prisma are connected.
* JWT login/register/profile routes are wired.
* Saved locations CRUD exists.
* Alert preferences CRUD exists.
* Resend email notification support exists.
* Email and SMS-style notification previews exist in Settings.
* Evacuation resources CRUD and nearby lookup exist.
* Google Maps loads.
* Official fire incidents layer works.
* NASA FIRMS thermal detections work as an optional layer.
* NWS weather alerts layer exists.
* Social sharing works from Alerts and Fire Details.
* PWA/Add to Home Screen support exists.
* Demo data can be enabled with demo mode.
* Guest mode exists for map access.
