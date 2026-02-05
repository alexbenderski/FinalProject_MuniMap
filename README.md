# MuniMap

Municipal Infrastructure Monitoring System

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
