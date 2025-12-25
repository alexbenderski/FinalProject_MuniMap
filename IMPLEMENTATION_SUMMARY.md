# Email Notification Implementation - Summary

## ✅ What Was Implemented

### 1. **Email Service** (`lib/server/email-service.ts`)
   - ✅ Query Firestore users by authority field
   - ✅ Send formatted HTML emails in Hebrew (RTL)
   - ✅ Filter for "garbage related manager" authority
   - ✅ Extract valid email addresses
   - ✅ Rich email template with anomaly details

### 2. **Integration with Anomaly Detection** (`lib/server/anomalyDetector/index.ts`)
   - ✅ Automatically triggers after each anomaly is saved
   - ✅ Checks if anomaly category is "garbage"
   - ✅ Sends email only for garbage-type anomalies
   - ✅ Non-blocking async operation

### 3. **Configuration Files**
   - ✅ `.env.example` - Template for email credentials
   - ✅ `server/.env` - Updated with EMAIL_USER and EMAIL_PASSWORD placeholders
   - ✅ `EMAIL_NOTIFICATION_SETUP.md` - Comprehensive setup guide

### 4. **Testing Tools**
   - ✅ `test-email.ts` - Manual test script
   - ✅ `npm run test-email` - Added to package.json scripts

### 5. **Dependencies**
   - ✅ `nodemailer` - Installed
   - ✅ `@types/nodemailer` - Installed

## 📋 Setup Checklist

### Step 1: Configure Email Credentials
1. Open `server/.env`
2. Replace `your-email@gmail.com` with your actual Gmail address
3. Create a Gmail App Password:
   - Go to Google Account → Security
   - Enable 2-Step Verification
   - Generate App Password for "Mail"
4. Replace `your-app-password-here` with the 16-digit password

### Step 2: Set Up Firestore Users
Create users in Firestore with this structure:
```
users/{userId}/
  ├── email: "manager@example.com"
  ├── authority: "garbage related manager"  ← MUST match exactly
  ├── city: "ירושלים"
  └── district: "Jerusalem District"
```

### Step 3: Test the Email System
Run the test script:
```bash
npm run test-email
```

Expected output:
- ✅ "Found X garbage manager(s) to notify"
- ✅ "Email sent successfully to X recipient(s)"

### Step 4: Verify in Production
1. Run the server: `npm run server`
2. Wait for anomaly detection to run (or trigger manually)
3. Check console logs for email notifications
4. Verify email received in manager's inbox

## 🔄 How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  Anomaly Detection Cycle (every 3 minutes by default)       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  runAllDetectors(reports)                                   │
│  - detectHighActivity()                                     │
│  - detectSlowResolution()                                   │
│  - detectSpatialClusters()                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  For each detected anomaly:                                 │
│  1. saveFullAnomalySnapshot(anomaly) → Firebase             │
│  2. notifyGarbageAnomalyManagers(anomaly) → Email           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  notifyGarbageAnomalyManagers():                            │
│  1. Check if category === "garbage"                         │
│  2. Query Firestore: authority === "garbage related manager"│
│  3. Extract email addresses                                 │
│  4. Send formatted email to all managers                    │
└─────────────────────────────────────────────────────────────┘
```

## 📧 Email Content Includes

- 🚨 Anomaly alert title (Hebrew)
- 📍 Category, type, area, severity, status
- 📝 Description and general message
- 📊 Metrics (current reports, baseline, change %, z-score)
- 🔗 Number of related reports
- ⏰ Detection timestamp

## 🎯 Key Features

1. **Automatic Filtering**: Only garbage anomalies trigger emails
2. **Firestore Query**: Uses efficient where clause
3. **Email Validation**: Filters out invalid email addresses
4. **Graceful Degradation**: Warns if email not configured, doesn't crash
5. **Rich HTML**: Formatted with CSS, RTL support
6. **Logging**: Console logs show detailed status

## 🔧 Customization Options

### Change Email Service
Edit `lib/server/email-service.ts`:
```typescript
const transporter = nodemailer.createTransport({
  service: "hotmail", // or "outlook", "yahoo", etc.
  auth: { ... }
});
```

### Add More Authority Types
Call the function for different authorities:
```typescript
await notifyManagersByAuthority(anomaly, "lighting related manager");
```

### Filter by City/District
Modify the Firestore query:
```typescript
.where("authority", "==", authority)
.where("city", "==", anomaly.area)
```

### Customize Email Template
Edit the `emailContent` variable in `sendAnomalyEmail()`.

## ⚠️ Important Notes

1. **Gmail App Password**: Use app password, NOT your regular password
2. **Rate Limits**: Gmail has sending limits (500/day for free accounts)
3. **Spam Filters**: First email may go to spam, mark as "Not Spam"
4. **Authority Matching**: Must be exactly "garbage related manager"
5. **Email Field**: Users must have valid email addresses in Firestore

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Email service not configured" | Add EMAIL_USER and EMAIL_PASSWORD to .env |
| "No garbage managers found" | Check Firestore users have correct authority |
| "Invalid credentials" | Use Gmail App Password, not regular password |
| "No recipients to send email" | Verify users have email field with @ symbol |
| Email not received | Check spam folder, verify email address |

## 📁 Files Modified/Created

```
✅ Created:
   - lib/server/email-service.ts
   - test-email.ts
   - .env.example
   - EMAIL_NOTIFICATION_SETUP.md

✅ Modified:
   - lib/server/anomalyDetector/index.ts
   - server/.env
   - package.json

✅ Installed:
   - nodemailer
   - @types/nodemailer
```

## 🚀 Next Steps

1. **Configure email credentials** in `server/.env`
2. **Add test users** to Firestore with "garbage related manager" authority
3. **Run test**: `npm run test-email`
4. **Deploy and monitor** production emails

## 📞 Support

If you need to:
- Add more notification types (SMS, push)
- Create email digest (daily summary)
- Add unsubscribe functionality
- Customize for other anomaly categories

Just ask! 😊
