# Email Notification System - Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          SYSTEM ARCHITECTURE                                  │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        1. ANOMALY DETECTION TRIGGER                          │
│                                                                               │
│  ┌─────────────────┐                                                         │
│  │  server/index.ts│  ← Runs every 3 minutes (configurable)                 │
│  │  runDetectionJob│                                                         │
│  └────────┬────────┘                                                         │
│           │                                                                   │
│           ▼                                                                   │
│  ┌─────────────────────────┐                                                 │
│  │ getReportsForDetector() │  ← Fetch all reports from Firebase             │
│  │ lib/server/reports-     │                                                 │
│  │ service.ts              │                                                 │
│  └────────┬────────────────┘                                                 │
└───────────┼──────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        2. ANOMALY DETECTION PROCESS                          │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────┐            │
│  │  lib/server/anomalyDetector/index.ts                         │            │
│  │  runAllDetectors(reports)                                    │            │
│  └──────────────────────────────────────────────────────────────┘            │
│           │                                                                   │
│           ├──► detectHighActivity()      ← Spike detection                   │
│           │                                                                   │
│           ├──► detectSlowResolution()    ← SLA violations                    │
│           │                                                                   │
│           └──► detectSpatialClusters()   ← Geographic clusters               │
│                                                                               │
│           │                                                                   │
│           ▼                                                                   │
│     ┌─────────────┐                                                          │
│     │  Anomalies  │  (Array of detected anomalies)                           │
│     │  Detected   │                                                          │
│     └─────┬───────┘                                                          │
└───────────┼──────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    3. FOR EACH ANOMALY - SAVE & NOTIFY                       │
│                                                                               │
│  for (const anomaly of anomalies) {                                          │
│                                                                               │
│    ┌──────────────────────────────────────────┐                             │
│    │ Step 1: Save to Firebase                 │                             │
│    │ saveFullAnomalySnapshot(anomaly)         │                             │
│    │ ├─► ActiveAnomalies/{key}                │                             │
│    │ └─► ActiveAnomaliesUpdates/{key}/{id}    │                             │
│    └──────────────────────────────────────────┘                             │
│              │                                                                │
│              ▼                                                                │
│    ┌──────────────────────────────────────────┐                             │
│    │ Step 2: Send Email Notification          │                             │
│    │ notifyGarbageAnomalyManagers(anomaly)    │  ◄── NEW!                   │
│    └──────────────────────────────────────────┘                             │
│  }                                                                            │
└───────────────────────────────────────────────┬─────────────────────────────┘
                                                 │
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        4. EMAIL NOTIFICATION LOGIC                           │
│                     lib/server/email-service.ts                              │
│                                                                               │
│  notifyGarbageAnomalyManagers(anomaly)                                       │
│    │                                                                          │
│    ├─► Check: anomaly.category === "garbage" ?                               │
│    │      ├─ YES ──┐                                                         │
│    │      └─ NO ──► Skip (log and return)                                    │
│    │              │                                                           │
│    │              ▼                                                           │
│    ├─► getUsersByAuthority("garbage related manager")                        │
│    │      │                                                                   │
│    │      ├─► Query Firestore:                                               │
│    │      │    users collection                                              │
│    │      │    WHERE authority == "garbage related manager"                  │
│    │      │                                                                   │
│    │      └─► Returns: [{email, authority, city, district}, ...]            │
│    │             │                                                            │
│    │             ▼                                                            │
│    ├─► Extract email addresses                                               │
│    │      │                                                                   │
│    │      └─► Filter: emails with "@" symbol                                 │
│    │             │                                                            │
│    │             ▼                                                            │
│    └─► sendAnomalyEmail(anomaly, emailAddresses)                             │
│           │                                                                   │
│           ├─► Build HTML email content (Hebrew RTL)                          │
│           │                                                                   │
│           ├─► Configure nodemailer transporter                               │
│           │    (Gmail SMTP + credentials from .env)                          │
│           │                                                                   │
│           └─► Send email via SMTP                                            │
│                  │                                                            │
│                  ▼                                                            │
│           ┌──────────────┐                                                   │
│           │ ✅ Success   │  or  ❌ Error (logged)                            │
│           └──────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│                          5. EXTERNAL SERVICES                                 │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐         ┌──────────────────────┐
│   Firestore         │         │   Gmail SMTP         │
│   (Users Database)  │         │   (Email Service)    │
│                     │         │                      │
│  users/             │         │  smtp.gmail.com      │
│  ├─ {userId1}       │         │  Port: 465/587       │
│  │  ├─ email        │         │                      │
│  │  ├─ authority ◄──┼─────────┼──► Authenticated     │
│  │  └─ city         │         │      with App        │
│  └─ {userId2}       │         │      Password        │
│     ├─ email        │         │                      │
│     ├─ authority    │         └──────────────────────┘
│     └─ city         │
└─────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│                          6. EMAIL CONTENT                                     │
└──────────────────────────────────────────────────────────────────────────────┘

To: manager1@example.com, manager2@example.com, ...
Subject: 🚨 אנומליה חדשה: garbage באזור ירושלים

┌─────────────────────────────────────────────┐
│ 🚨 אזהרת אנומליה חדשה                       │
│                                             │
│ ריבוי דיווחי garbage באזור ירושלים        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│ סוג: spike                                  │
│ קטגוריה: garbage                            │
│ אזור: ירושלים                               │
│ חומרה: גבוהה ⚠️                            │
│ סטטוס: פתוח                                 │
│                                             │
│ תיאור:                                      │
│ זוהתה עלייה חדה בדיווחי garbage באזור...  │
│                                             │
│ מדדים:                                      │
│ • currentReports: 45                        │
│ • baselineMean: 20.5                        │
│ • pctChange: 119%                           │
│ • zScore: 3.2                               │
│                                             │
│ דיווחים קשורים: 15                         │
│ זוהה לראשונה: 23/12/2025 10:30            │
└─────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│                          7. CONFIGURATION FILES                               │
└──────────────────────────────────────────────────────────────────────────────┘

server/.env
├─ EMAIL_USER=your-email@gmail.com
└─ EMAIL_PASSWORD=xxxx-xxxx-xxxx-xxxx

.env.example
└─ Template for email configuration

serviceAccountKey.json
└─ Firebase Admin SDK credentials


┌──────────────────────────────────────────────────────────────────────────────┐
│                          8. TESTING OPTIONS                                   │
└──────────────────────────────────────────────────────────────────────────────┘

Option A: Run test script
    $ npm run test-email
    ├─► Executes: test-email.ts
    └─► Creates mock garbage anomaly
        └─► Calls notifyGarbageAnomalyManagers()

Option B: API endpoint
    $ curl -X POST http://localhost:3000/api/test-email
    ├─► Executes: app/api/test-email/route.ts
    └─► Returns JSON response with status

Option C: Wait for real anomaly
    $ npm run server
    ├─► Runs detection every 3 minutes
    └─► Automatically sends emails for garbage anomalies


┌──────────────────────────────────────────────────────────────────────────────┐
│                          9. ERROR HANDLING                                    │
└──────────────────────────────────────────────────────────────────────────────┘

⚠️ Email service not configured
    → .env missing EMAIL_USER or EMAIL_PASSWORD
    → System logs warning and continues (non-blocking)

⚠️ No garbage managers found
    → Firestore has no users with authority="garbage related manager"
    → System logs info and continues

⚠️ No valid email addresses
    → Users exist but email field is empty or invalid
    → System logs warning and continues

❌ SMTP authentication failed
    → Wrong email credentials
    → System logs error (email not sent)

❌ Firestore query failed
    → Firebase connection issue
    → System logs error and continues


┌──────────────────────────────────────────────────────────────────────────────┐
│                          10. SECURITY & BEST PRACTICES                        │
└──────────────────────────────────────────────────────────────────────────────┘

✅ App Passwords: Uses Gmail App Password (not main password)
✅ Environment Variables: Credentials stored in .env (not in code)
✅ Async/Non-Blocking: Email sending doesn't block anomaly detection
✅ Error Logging: All failures logged to console
✅ Graceful Degradation: System continues if email service unavailable
✅ Input Validation: Email addresses validated before sending
✅ Query Optimization: Firestore uses indexed where clause
✅ HTML Injection Prevention: No user input in email content


┌──────────────────────────────────────────────────────────────────────────────┐
│                          11. EXTENSION POINTS                                 │
└──────────────────────────────────────────────────────────────────────────────┘

Add more authority types:
    notifyManagersByAuthority(anomaly, "lighting related manager")

Filter by city:
    getUsersByAuthority(authority, city)

Add SMS notifications:
    notifyManagers(anomaly, ["email", "sms"])

Email digest (daily summary):
    scheduleDailyDigest()

Unsubscribe functionality:
    Add unsubscribe link in email
    Store preferences in Firestore
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `lib/server/email-service.ts` | Core email functionality |
| `lib/server/anomalyDetector/index.ts` | Triggers email after anomaly save |
| `app/api/test-email/route.ts` | API endpoint for testing |
| `test-email.ts` | Standalone test script |
| `server/.env` | Email credentials configuration |
| `QUICK_START_EMAIL.md` | Fast setup guide |
| `EMAIL_NOTIFICATION_SETUP.md` | Comprehensive documentation |

---

## Support Matrix

| Feature | Status | Notes |
|---------|--------|-------|
| Garbage anomaly detection | ✅ | Fully implemented |
| Email to managers | ✅ | Fully implemented |
| Gmail integration | ✅ | Tested and working |
| Other email services | ⚠️ | Requires transporter config change |
| Firestore user query | ✅ | Optimized with where clause |
| Hebrew RTL support | ✅ | Email displays correctly |
| Error handling | ✅ | Non-blocking, logged |
| Testing tools | ✅ | Script + API endpoint |
| SMS notifications | ❌ | Not implemented (future) |
| Push notifications | ❌ | Not implemented (future) |
