# MuniMap
LINK TO DRIVE: https://drive.google.com/drive/folders/1BnrCm6oEGkO_fMpBg_KcRhgdLAhIZ5ZR?usp=drive_link

## About

Municipal authorities handle large volumes of citizen reports related to urban infrastructure, such as sanitation issues, lighting failures, and public safety hazards. While these reports are routinely collected and stored, they are often managed in a reactive manner, limiting the ability of decision-makers to identify emerging patterns, prioritize responses, and allocate resources efficiently.
This project presents MuniMap, a web-based municipal monitoring system that integrates interactive geographic visualization with automated anomaly detection and performance analytics. The system aggregates citizen reports, visualizes them on dynamic maps, and applies statistical and spatial algorithms to detect abnormal activity patterns, service delays, and geographic hotspots. By transforming raw municipal data into actionable insights, MuniMap aims to support municipal managers in proactive decision-making, operational oversight, and long-term infrastructure planning.

## Setup

```bash
npm install
npm run dev
```

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

## Tech Stack

- Next.js 16
- Firebase (Realtime DB + Auth)
- Google Maps API
- TypeScript

## Deploy

Built for Vercel deployment.
