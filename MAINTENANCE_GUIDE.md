# MuniMap System - Maintenance Guide

## 8.2.1 Development Tools

### Required Tools

#### 1. Code Editor
- **Tool**: Visual Studio Code (VS Code)
- **Link**: https://code.visualstudio.com/
- **Purpose**: Primary IDE with TypeScript, React, and Next.js support. Includes integrated terminal, debugging, and Git integration.

#### 2. Node.js Runtime
- **Tool**: Node.js (Version 20 or higher)
- **Link**: https://nodejs.org/en
- **Purpose**: Enables server-side JavaScript execution and includes npm (Node Package Manager) for dependency management.
- **Installation Tip**: Download the LTS version for stability.

#### 3. Git Version Control
- **Tool**: Git
- **Link**: https://git-scm.com/
- **Purpose**: Version control system for tracking code changes and team collaboration.
- **Installation Tip**: Configure Git with `git config --global user.name "Your Name"` and `git config --global user.email "your@email.com"`

#### 4. Web Browser
- **Tool**: Google Chrome
- **Link**: https://www.google.com/chrome/
- **Purpose**: Testing the application and debugging with Chrome DevTools.
- **Recommended Extensions**: React Developer Tools for component inspection.

#### 5. Firebase CLI (Optional but Recommended)
- **Tool**: Firebase Command Line Tools
- **Installation**: `npm install -g firebase-tools`
- **Purpose**: Deploy Firebase security rules, test with emulators, and manage Firebase projects from terminal.

### Optional Tools

#### 6. API Testing
- **Tool**: Postman
- **Link**: https://www.postman.com/
- **Purpose**: Test API endpoints (`/api/reports`, `/api/anomalies`, `/api/statistics`, etc.).

#### 7. Email Testing
- **Tool**: Mailtrap (Development) or Gmail
- **Link**: https://mailtrap.io/
- **Purpose**: Test email notifications without sending real emails during development.

---

## 8.2.2 Installation Checklist

Before starting, verify installations:
```powershell
node -v          # Should show v20.x.x or higher
npm -v           # Should show v10.x.x or higher
git --version    # Should show git version 2.x.x or higher
```

---

## 8.2.3 Running the Application Locally

### Step 1: Clone and Open Project
1. Open **Visual Studio Code**
2. Click **File → Open Folder**
3. Navigate to the MuniMap project directory
4. Open integrated terminal: **Terminal → New Terminal** (or press `` Ctrl + ` ``)

### Step 2: Install Dependencies
In the terminal, run:
```powershell
npm install
```
This installs all required packages from `package.json` including Next.js, Firebase, React, TypeScript, and other dependencies.

### Step 3: Configure Environment Variables

#### Create `.env` file in root directory:
```env
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

# Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your-google-maps-api-key
```

#### Create `server/.env` file:
```env
# Firebase Admin Configuration
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

# Email Service Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-digit-app-password
```

#### Add `serviceAccountKey.json` to root directory:
Download from Firebase Console (see External Services Setup section below).

### Step 4: Start Development Servers

MuniMap requires **TWO servers** running simultaneously:

#### Terminal 1 - Next.js Application (Port 3000):
```powershell
npm run dev
```
- Starts the web application at http://localhost:3000
- Hot-reloads when you make code changes
- Handles UI, authentication, and API routes

#### Terminal 2 - Background Server (Port 4000):
Open a **second terminal** in VS Code:
```powershell
npm run server
```
- Starts anomaly detection server at http://localhost:4000
- Runs automated jobs:
  - **Anomaly Detection**: Every 4 hours
  - **Anomaly Cleanup**: Every 4 hours  
  - **Report Archival**: Every 24 hours (moves reports older than 1 year)

### Step 5: Access the Application
1. Open Chrome browser
2. Navigate to http://localhost:3000
3. Login with credentials stored in Firestore `users` collection
4. Default cities: חיפה, נשר, חוף הכרמל

---

## 8.2.4 External Services Setup

### A. Google Maps API Configuration

#### Step 1: Create/Access Google Cloud Project
1. Go to **Google Cloud Console**: https://console.cloud.google.com/
2. Sign in with your Google account
3. Click **Select a Project** dropdown at the top
4. Click **NEW PROJECT**
5. Enter project name (e.g., "MuniMap") and click **CREATE**
6. Wait for project creation, then select the new project

#### Step 2: Enable Required APIs
1. In left sidebar, click **APIs & Services → Library**
2. Search for "**Maps JavaScript API**" and click on it
3. Click **ENABLE** button
4. Go back to Library (use browser back button)
5. Search for "**Geocoding API**" and click on it
6. Click **ENABLE** button

#### Step 3: Create API Credentials
1. In left sidebar, click **APIs & Services → Credentials**
2. Click **+ CREATE CREDENTIALS** at the top
3. Select **API key**
4. Copy the generated API key immediately
5. Click **RESTRICT KEY** (important for security)

#### Step 4: Restrict API Key (Security)
1. Under **API restrictions**, select **Restrict key**
2. Check only:
   - ✅ Maps JavaScript API
   - ✅ Geocoding API
3. Under **Application restrictions** (optional for development):
   - For development: Select **None**
   - For production: Select **HTTP referrers** and add your domain
4. Click **SAVE**

#### Step 5: Add to Environment
Paste the API key into `.env`:
```env
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaSyC_your_actual_key_here
```

---

### B. Firebase Configuration

#### Step 1: Create Firebase Project
1. Go to **Firebase Console**: https://console.firebase.google.com/
2. Click **Add project** (or select existing project)
3. Enter project name (e.g., "MuniMap")
4. Click **Continue**
5. Disable Google Analytics (optional) and click **Create project**
6. Wait for initialization, then click **Continue**

#### Step 2: Register Web App
1. Click the **Web icon** (`</>`) to add Firebase to your web app
2. Enter app nickname (e.g., "MuniMap Web")
3. **Do NOT** check "Set up Firebase Hosting"
4. Click **Register app**
5. **Copy the configuration values** shown:
   ```javascript
   apiKey: "AIzaSy..."
   authDomain: "project-name.firebaseapp.com"
   projectId: "project-name"
   appId: "1:123456..."
   databaseURL: "https://project-name.firebaseio.com"
   ```
6. Add these to your `.env` file with `NEXT_PUBLIC_` prefix

#### Step 3: Enable Authentication
1. In left sidebar, click **Build → Authentication**
2. Click **Get started**
3. Click **Email/Password** under Sign-in providers
4. Toggle **Enable** switch ON
5. Click **Save**

#### Step 4: Create Realtime Database
1. In left sidebar, click **Build → Realtime Database**
2. Click **Create Database**
3. Select location (e.g., "us-central1")
4. Select **Start in test mode** (for development)
5. Click **Enable**
6. Copy the database URL (e.g., `https://project-name.firebaseio.com`)

#### Step 5: Set Realtime Database Rules
1. Click **Rules** tab
2. Replace with (adjust for production):
   ```json
   {
     "rules": {
       ".read": "auth != null",
       ".write": "auth != null"
     }
   }
   ```
3. Click **Publish**

#### Step 6: Create Firestore Database
1. In left sidebar, click **Build → Firestore Database**
2. Click **Create database**
3. Select **Start in test mode**
4. Choose location (same as Realtime Database)
5. Click **Enable**

#### Step 7: Set Firestore Rules
1. Click **Rules** tab
2. Replace with:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```
3. Click **Publish**

#### Step 8: Enable Cloud Storage
1. In left sidebar, click **Build → Storage**
2. Click **Get started**
3. Select **Start in test mode**
4. Click **Next**
5. Choose location (same as databases)
6. Click **Done**

#### Step 9: Set Storage Rules
1. Click **Rules** tab
2. Replace with:
   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /reportImages/{imageId} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```
3. Click **Publish**

#### Step 10: Generate Service Account Key
1. Click **⚙️ Project settings** (gear icon near "Project Overview")
2. Click **Service accounts** tab
3. Click **Generate new private key** button
4. Click **Generate key** in confirmation dialog
5. Save the downloaded JSON file as `serviceAccountKey.json`
6. **Move this file to your project root directory**
7. ⚠️ **IMPORTANT**: Add `serviceAccountKey.json` to `.gitignore` to prevent committing credentials

#### Step 11: Configure Email Notifications
For Gmail SMTP:
1. Go to Google Account: https://myaccount.google.com/
2. Click **Security** in left sidebar
3. Enable **2-Step Verification** (required for app passwords)
4. Search for "**App passwords**"
5. Click **App passwords**
6. Select **Mail** and **Other (Custom name)**
7. Enter "MuniMap Server" and click **Generate**
8. Copy the 16-digit password (e.g., `abcd efgh ijkl mnop`)
9. Add to `server/.env`:
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=abcdefghijklmnop
   ```

---

## 8.2.5 Database Structure

### Firestore (NoSQL) Collections

#### `users` Collection
Stores user profiles and permissions.

| Field | Type | Description |
|-------|------|-------------|
| `email` | string | User email address (used for authentication) |
| `authority` | string | User role/department (e.g., "manager", "municipal_worker") |
| `city` | string | Assigned city (e.g., "חיפה", "נשר", "חוף הכרמל") |
| `district` | string (optional) | Specific district within city |
| `permissions.city` | string | City permission for developer tools and simulation |

**Example Document** (`users/user@example.com`):
```json
{
  "email": "manager@haifa.gov.il",
  "authority": "manager",
  "city": "חיפה",
  "permissions": {
    "city": "חיפה"
  }
}
```

---

### Firebase Realtime Database Structure

#### `/Reports/ActiveReports/{city}/{reportId}`
Stores active municipal reports (complaints).

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique report identifier |
| `area` | string | City name (e.g., "חיפה") |
| `type` | string | Report category: `lighting`, `roads`, `sanitation`, `parks`, `infrastructure`, `other` |
| `description` | string | Report details in Hebrew or English |
| `lat` | number | Latitude coordinate |
| `lng` | number | Longitude coordinate |
| `address` | string (optional) | Human-readable address |
| `status` | string | Current status: `open`, `pending`, `in progress`, `resolved` |
| `timestamp` | number | Creation timestamp (milliseconds) |
| `resolvedAt` | number (optional) | Resolution timestamp |
| `statusHistory` | array | Array of status changes with timestamps and changedBy |
| `images` | array (optional) | Array of image objects: `{url: string, path: string, uploadedAt: number}` |
| `deleted` | boolean (optional) | Soft delete flag |
| `deletedAt` | number (optional) | Deletion timestamp |
| `deletedBy` | string (optional) | Email of user who deleted |
| `comments` | array (optional) | Array of comment objects: `{text: string, timestamp: number, author: string}` |
| `submittedBy` | string (optional) | Submitter name |
| `email` | string (optional) | Submitter email |
| `phone` | string (optional) | Submitter phone |

**Path Structure**:
```
/Reports
  /ActiveReports
    /חיפה
      /report-uuid-1: { ... }
      /report-uuid-2: { ... }
    /נשר
      /report-uuid-3: { ... }
```

#### `/Anomalies/ActiveAnomalies/{city}/{anomalyId}`
Stores detected system anomalies for municipal managers.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique anomaly identifier |
| `firebaseKey` | string | Firebase database key |
| `category` | string | Related report category or "multiple" |
| `type` | string | Anomaly type: `spike`, `slow_response`, `geo_cluster`, `trend`, `drop`, `unclosed_cases`, `delay`, `custom` |
| `area` | string | Affected city |
| `title` | string | Anomaly title (multilingual) |
| `description` | string | Detailed description |
| `generalMessage` | string (optional) | Summary message |
| `severity` | string | Severity level: `low`, `medium`, `high` |
| `status` | string | Status: `active`, `reviewing`, `resolved`, `dismissed` |
| `metrics` | object | Detection metrics (e.g., `{count, threshold, timeframe}`) |
| `relatedReports` | array | Array of related report IDs |
| `center` | object (optional) | Geographic center: `{lat: number, lng: number}` |
| `firstDetected` | number | First detection timestamp |
| `lastUpdated` | number | Last update timestamp |
| `reviewedBy` | object (optional) | Map of reviewer emails to timestamps |
| `comments` | array (optional) | Array of comment objects |

**Anomaly Types**:
- **spike**: Sudden increase in reports (e.g., 15+ reports in 3 days)
- **slow_response**: SLA violations (reports open >7 days)
- **geo_cluster**: Geographic concentration (5+ reports within 200m)

#### `/Archive/{city}/{reportId}`
Stores archived reports (older than 1 year).
- Same structure as ActiveReports
- Automatically moved by archival job every 24 hours
- Used for historical analysis and exports

---

## 8.2.6 Project Folder Structure

```
muni-map/
├── app/                          # Next.js App Router
│   ├── api/                      # API Route Handlers
│   │   ├── reports/route.ts      # CRUD for reports
│   │   ├── anomalies/route.ts    # Anomaly management
│   │   ├── statistics/           # Various analytics endpoints
│   │   ├── archive/route.ts      # Archive operations
│   │   └── admin/route.ts        # Admin operations
│   ├── dashboard/page.tsx        # Main dashboard page
│   ├── page.tsx                  # Login page
│   ├── layout.tsx                # Root layout (Auth, i18n providers)
│   └── globals.css               # Global styles
│
├── components/                   # React Components
│   ├── AuthProvider.tsx          # Authentication context
│   ├── RequireAuth.tsx           # Route protection wrapper
│   └── dashboard/                # Dashboard-specific components
│       ├── layout/               # TopBar, Sidebar, BottomBar
│       ├── maps/MapCanvas.tsx    # Google Maps integration
│       ├── reports/              # Report list, filters, details
│       ├── statistics/           # Charts and graphs
│       ├── anomalies/            # Anomaly display
│       └── simulation/           # Simulation controls
│
├── lib/                          # Business Logic
│   ├── types.ts                  # TypeScript interfaces
│   ├── categories.ts             # Report categories definition
│   ├── client/                   # Client-side (browser)
│   │   ├── firebase.ts           # Firebase client SDK init
│   │   ├── firestore.ts          # Firestore operations
│   │   ├── auth-client.ts        # Authentication functions
│   │   ├── dataStores.ts         # Real-time data subscriptions
│   │   └── hooks/                # Custom React hooks
│   ├── server/                   # Server-side (API routes)
│   │   ├── firebase-admin.ts     # Firebase Admin SDK init
│   │   ├── reports-service.ts    # Fetch/manage reports
│   │   ├── anomalies-service.ts  # Anomaly CRUD
│   │   ├── email-service.ts      # Send email notifications
│   │   ├── storage-service.ts    # Cloud Storage operations
│   │   ├── archive-service.ts    # Archive management
│   │   └── anomalyDetector/      # Detection algorithms
│   ├── simulation/               # Report generation engine
│   └── i18n/                     # Internationalization (en, he)
│
├── server/                       # Background Server (Port 4000)
│   ├── index.ts                  # Express server + scheduled jobs
│   └── tsconfig.server.json      # TypeScript config for server
│
├── scripts/                      # Maintenance Scripts
│   ├── add-city-to-user.ts       # Add city permissions
│   └── seed-data/                # Database seeding scripts
│
├── public/                       # Static Assets
│   ├── data/                     # City boundaries GeoJSON
│   └── icons/                    # Category icons
│
├── locales/                      # Translation Files
│   ├── en.json                   # English translations
│   └── he.json                   # Hebrew translations (RTL)
│
├── docs/                         # Documentation
├── .env                          # Environment variables (Next.js)
├── server/.env                   # Environment variables (server)
├── serviceAccountKey.json        # Firebase Admin credentials
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
└── next.config.ts                # Next.js configuration
```

### Key Directory Purposes:

- **`app/`**: Next.js 13+ App Router for pages and API endpoints. Each folder under `api/` creates an endpoint (e.g., `api/reports/route.ts` → `/api/reports`).

- **`components/`**: Reusable React components. Organized by feature area. Uses TypeScript for type safety.

- **`lib/client/`**: Client-side code that runs in the browser. Includes Firebase client SDK, real-time subscriptions, and React hooks.

- **`lib/server/`**: Server-side code for API routes and background jobs. Uses Firebase Admin SDK with elevated privileges. Includes email service and anomaly detection algorithms.

- **`server/`**: Separate Express server for scheduled background jobs (anomaly detection every 4 hours, archival every 24 hours). Runs independently on port 4000.

- **`scripts/`**: One-time maintenance scripts run via `npx ts-node scripts/script-name.ts`.

---

## 8.2.7 Environment Variables Reference

### `.env` (Root Directory - Next.js)

#### Firebase Client SDK:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyB...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_APP_ID=1:699543006688:web:...
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```
**Where used**: `lib/client/firebase.ts` - Initializes Firebase for browser authentication, real-time database subscriptions, and client-side operations.

#### Google Maps API:
```env
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaSyDMdI...
```
**Where used**: `components/dashboard/maps/MapCanvas.tsx` - Loads Google Maps JavaScript API for interactive map display, markers, and geocoding.

---

### `server/.env` (Server Directory - Background Server)

#### Firebase Admin SDK:
```env
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```
**Where used**: `lib/server/firebase-admin.ts` - Initializes Firebase Admin SDK for server-side database operations with full permissions (used with `serviceAccountKey.json`).

#### Email Service (Gmail):
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
```
**Where used**: `lib/server/email-service.ts` - Configures Nodemailer to send anomaly notifications to municipal managers via Gmail SMTP. Password must be a Google App Password (16 digits, no spaces in actual usage).

---

### `serviceAccountKey.json` (Root Directory)

Firebase Admin service account credentials (JSON file). Downloaded from Firebase Console → Project Settings → Service Accounts.

**Where used**: `lib/server/firebase-admin.ts` - Provides authentication for Firebase Admin SDK operations.

**Security**: Never commit this file to Git. Always listed in `.gitignore`.

---

## 8.2.8 Common Maintenance Tasks

### Starting Development
```powershell
# Terminal 1 - Web Application
npm run dev

# Terminal 2 - Background Server
npm run server
```

### Testing Email Configuration
```powershell
npm run test-email
```
Sends a test email using configured Gmail credentials. Verify email arrives before deploying.

### Adding City Permission to User
```powershell
npx ts-node scripts/add-city-to-user.ts
```
Grants simulation and developer tool access to a user for a specific city. Follow prompts to enter email and city.

### Seeding Test Data
```powershell
cd scripts/seed-data
npx ts-node seed-realistic-data-v2.ts
```
Generates test reports with anomaly patterns (spikes, clusters, slow resolutions) for cities: חיפה, נשר, חוף הכרמל.

### Clearing Database
```powershell
cd scripts/seed-data
npx ts-node clear-firebase-data.ts
```
⚠️ **Warning**: Removes all reports and anomalies from Firebase. Use only in development.

### Building for Production
```powershell
npm run build
npm start
```
Creates optimized production build with Turbopack and starts production server on port 3000.

### Code Quality
```powershell
npm run lint
```
Runs ESLint to check code quality and style consistency.

---

## 8.2.9 Troubleshooting

| Issue | Likely Cause | Resolution |
|-------|--------------|------------|
| Map fails to render | Missing/Invalid Google Maps API Key | Verify `NEXT_PUBLIC_GOOGLE_MAPS_KEY` in `.env`. Check API is enabled in Google Cloud Console → APIs & Services. |
| No anomalies detected | Insufficient test data | Ensure at least 5 reports exist in cluster area. For spike detection, add 15+ reports within 3 days. Check background server is running. |
| Emails not sending | Gmail App Password incorrect | Update `EMAIL_PASSWORD` in `server/.env` using 16-digit Google App Password (not regular password). Enable 2-Step Verification first. |
| Reports not displaying | Firestore permissions or Firebase initialization | Verify Firebase security rules allow authenticated reads. Check `serviceAccountKey.json` exists and is valid. Check browser console for errors. |
| Real-time updates not working | Background server not running or Firebase connection | Ensure `npm run server` is running in second terminal. Check `FIREBASE_DATABASE_URL` matches in both `.env` files. |
| Image upload fails | Storage bucket permissions or missing configuration | Verify Firebase Storage rules allow writes for authenticated users. Check storage bucket exists in Firebase Console. |
| Simulation not available | User lacks city permission | Run `npx ts-node scripts/add-city-to-user.ts` to grant permission. Verify Firestore `users` collection has `permissions.city` field. |
| Authentication redirect loops | Firebase config mismatch | Verify all `NEXT_PUBLIC_FIREBASE_*` variables in `.env` match Firebase Console values exactly. Clear browser cache/cookies. |
| Archive export fails/timeouts | Large dataset or memory limits | Reduce date range for export. Check server memory allocation. For large exports, export by month instead of year. |
| Port already in use | Another application using port 3000 or 4000 | Kill process: `netstat -ano | findstr :3000` (find PID), then `taskkill /PID <pid> /F`. Or change port in Next.js config/server config. |
| TypeScript errors after dependency update | Type definition mismatch | Run `npm install` to ensure all type definitions are installed. Check `tsconfig.json` settings. Restart VS Code TypeScript server. |

### Debug Checklist:
1. ✅ Both servers running (`npm run dev` + `npm run server`)
2. ✅ All environment variables set correctly
3. ✅ `serviceAccountKey.json` exists in root
4. ✅ Firebase services enabled (Auth, Realtime DB, Firestore, Storage)
5. ✅ Google Maps API enabled with correct restrictions
6. ✅ User exists in Firestore `users` collection
7. ✅ Browser console shows no errors (F12 → Console tab)

---

## 8.2.10 Additional Resources

### Documentation Files:
- `README.md` - Project overview and quick start
- `IMPLEMENTATION_SUMMARY.md` - Feature implementation details
- `API_ARCHITECTURE_REFACTORING.md` - API design patterns
- `SIMULATION_SERVER_GUIDE.md` - Simulation system guide
- `EMAIL_NOTIFICATION_SETUP.md` - Email configuration guide
- `USER_GUIDE_OPERATIONAL_INSTRUCTIONS.md` - End-user guide
- `docs/Capstone_Project_Phase_B.md` - Full project documentation

### External Documentation:
- Next.js: https://nextjs.org/docs
- Firebase: https://firebase.google.com/docs
- Google Maps API: https://developers.google.com/maps/documentation
- React: https://react.dev/
- TypeScript: https://www.typescriptlang.org/docs

### Getting Help:
- Check browser console (F12) for error messages
- Check terminal output for server errors
- Review Firebase Console for database/storage issues
- Test API endpoints with Postman
- Review commit history in Git for recent changes

---

**Last Updated**: January 2026  
**MuniMap Version**: Next.js 16.1.1 with Turbopack  
**Node.js Requirement**: 20+
