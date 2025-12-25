# Email Notification System for Anomaly Detection

## Overview
This system automatically sends email notifications to users with the authority "garbage related manager" when a new garbage-type anomaly is detected.

## Features
- Automatically detects garbage-related anomalies
- Queries Firestore for users with "garbage related manager" authority
- Sends formatted email notifications in Hebrew
- Includes full anomaly details (title, description, metrics, related reports)

## Setup Instructions

### 1. Install Dependencies
The required packages are already installed:
- `nodemailer` - for sending emails
- `@types/nodemailer` - TypeScript types

### 2. Configure Email Service

#### Option A: Using Gmail
1. **Enable 2-Step Verification** on your Google account
2. **Create an App Password**:
   - Go to Google Account → Security
   - Under "Signing in to Google" → 2-Step Verification
   - Scroll to bottom → App passwords
   - Select "Mail" and generate password
   
3. **Add to .env file**:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-16-digit-app-password
   ```

#### Option B: Using Other Email Services
Edit `lib/server/email-service.ts` and change the transporter configuration:

**For Outlook/Hotmail:**
```typescript
const transporter = nodemailer.createTransport({
  service: "hotmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});
```

**For Custom SMTP:**
```typescript
const transporter = nodemailer.createTransporter({
  host: "smtp.your-email-provider.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});
```

### 3. Firestore User Structure
Make sure users in Firestore have the following structure:

```
users/{userId}/
  ├── email: "manager@example.com"
  ├── authority: "garbage related manager"
  ├── city: "ירושלים"
  └── district: "Jerusalem District" (optional)
```

### 4. Testing

1. **Create test users in Firestore** with authority "garbage related manager"
2. **Run the anomaly detection** manually or wait for the scheduled run
3. **Check console logs** for email sending status
4. **Verify email delivery** to the manager's inbox

## How It Works

1. **Anomaly Detection**: The system runs `runAllDetectors()` periodically
2. **Anomaly Saved**: Each detected anomaly is saved to Firebase
3. **Email Trigger**: `notifyGarbageAnomalyManagers()` is called
4. **Check Category**: Only garbage anomalies trigger emails
5. **Query Users**: Firestore is queried for "garbage related manager" users
6. **Send Email**: Formatted email is sent to all managers

## File Structure

```
lib/server/
├── email-service.ts           # Email notification logic
├── anomalyDetector/
│   ├── index.ts               # Calls email service after saving anomaly
│   └── ...                    # Anomaly detection algorithms
└── firebase-admin.ts          # Firebase Admin initialization
```

## Email Content

The email includes:
- **Anomaly title and type** (in Hebrew)
- **Category** (garbage, lighting, etc.)
- **Area/Location**
- **Severity** (high/medium)
- **Description** of the anomaly
- **Metrics** (current reports, baseline, percent change, z-score, etc.)
- **Number of related reports**
- **Detection timestamp**

## Customization

### Change Email Template
Edit the `emailContent` variable in `lib/server/email-service.ts`:

```typescript
const emailContent = `
  <div dir="rtl" style="font-family: Arial, sans-serif;">
    <!-- Your custom HTML here -->
  </div>
`;
```

### Add More Recipient Types
Modify `notifyGarbageAnomalyManagers()` to handle other authority types:

```typescript
export async function notifyAnomalyManagers(
  anomaly: Anomaly,
  authorityType: string
): Promise<void> {
  const managers = await getUsersByAuthority(authorityType);
  // ... rest of logic
}
```

### Filter by City/District
Add filtering in `getUsersByAuthority()`:

```typescript
const usersSnapshot = await firestore
  .collection("users")
  .where("authority", "==", authority)
  .where("city", "==", anomaly.area)  // Filter by city
  .get();
```

## Troubleshooting

### Emails Not Sending
1. **Check environment variables**: Ensure EMAIL_USER and EMAIL_PASSWORD are set
2. **Check console logs**: Look for error messages
3. **Verify Gmail App Password**: Make sure it's a 16-digit app password, not your regular password
4. **Check Firestore**: Ensure users exist with correct authority field

### Wrong Recipients
1. **Check Firestore query**: Verify authority field matches exactly "garbage related manager"
2. **Check email addresses**: Ensure users have valid email field
3. **Check logs**: Console shows number of recipients found

### Email Format Issues
1. **HTML rendering**: Some email clients may render HTML differently
2. **Hebrew text**: Ensure `dir="rtl"` is set for right-to-left text
3. **Test in different clients**: Gmail, Outlook, etc. may display differently

## Security Notes

- **Never commit .env files** with real credentials
- **Use app passwords**, not your main email password
- **Consider rate limiting** to avoid spam filters
- **Add unsubscribe option** if sending to many users
- **Log email sends** for audit purposes

## Future Enhancements

- Add email templates for different anomaly types
- Support multiple languages
- Add email preferences in user profile
- Implement email digest (daily summary instead of immediate)
- Add SMS notifications as alternative
- Create admin panel to manage email settings
