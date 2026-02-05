## Link to drive
https://drive.google.com/drive/folders/1BnrCm6oEGkO_fMpBg_KcRhgdLAhIZ5ZR?usp=drive_link

## Live Demo
- System: https://muni-map.vercel.app/
  
## MuniMapAbout

Municipal authorities handle large volumes of citizen reports related to urban infrastructure, such as sanitation issues, lighting failures, and public safety hazards. While these reports are routinely collected and stored, they are often managed in a reactive manner, limiting the ability of decision-makers to identify emerging patterns, prioritize responses, and allocate resources efficiently.
This project presents MuniMap, a web-based municipal monitoring system that integrates interactive geographic visualization with automated anomaly detection and performance analytics. The system aggregates citizen reports, visualizes them on dynamic maps, and applies statistical and spatial algorithms to detect abnormal activity patterns, service delays, and geographic hotspots. By transforming raw municipal data into actionable insights, MuniMap aims to support municipal managers in proactive decision-making, operational oversight, and long-term infrastructure planning.


## Main Features
- Interactive Google Maps dashboard (city boundaries, markers, SLA-based colors)
- Advanced filtering (category, status, date range, criticality, media)
- Anomaly detection:
  - High Activity (volume spikes)
  - Slow Resolution (SLA risk)
  - Spatial Clustering (geographic hotspots)
- Analytics dashboards (KPIs, trends, status transition bottlenecks, graphs generator)
- Archive & export (Excel/PDF)
- Role-based access (Firebase Auth + Firestore users)

## Tech Stack
- Frontend: Next.js (App Router), React, TypeScript, Tailwind
- Data: Firebase Realtime Database (reports/anomalies), Firestore (users), Storage (images)
- Maps: Google Maps JavaScript API (@react-google-maps/api)
- Background jobs: Node/Express service (scheduled detectors)
- Charts: Recharts

## Repository Structure (High Level)
- `app/` — Next.js routes/pages
- `components/` — UI components
- `lib/client/` — Firebase client SDK, subscriptions
- `lib/server/` — Firebase Admin services, email, archive
- `server/` — Express background server (detectors + schedulers)
- `public/data/` — city boundaries (GeoJSON/JSON)

## Requirements
- Node.js 20+
- npm
- Google Maps API key (Maps JavaScript API)
- Firebase project (Realtime DB + Firestore + Auth + Storage)
- (Optional) Gmail App Password for email notifications

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_maps_key
NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_db_url
FIREBASE_DATABASE_URL=your_db_url
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY=your_private_key
```

## Background server (server/.env)
FIREBASE_DATABASE_URL=
EMAIL_USER=
EMAIL_PASSWORD=
# Recommended for Vercel/cloud:
FIREBASE_SERVICE_ACCOUNT_JSON=

Never commit secrets (service account / env files).
serviceAccountKey.json should be ignored via .gitignore.

## Local Installation & Run
git clone https://github.com/alexbenderski/FinalProject_MuniMap.git
cd FinalProject_MuniMap
npm install

## Run the Next.js app
npm run dev
# http://localhost:3000

## Run the anomaly detection server (separate terminal)
npm run server
# http://localhost:4000

## Deployment Notes
The UI is deployed on Vercel.
Google Maps key must allow the production domain in HTTP referrers.
Firebase Admin credentials should be provided via FIREBASE_SERVICE_ACCOUNT_JSON in the hosting environment.

## Default Test Users (Demo)
City manager accounts are described in the project report (Phase B document).

## Documentation
Full report: Capstone_Project_Phase_B.docx (or link if hosted)
User Guide and Maintenance Guide are included in the report.

## Deploy
Built for Vercel deployment.

##License
Academic project (Braude College). No commercial license.
