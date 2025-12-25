# 🚀 Quick Start Guide - Email Notifications

## ⚡ Fast Setup (5 minutes)

### 1️⃣ Get Gmail App Password
```
1. Go to: https://myaccount.google.com/security
2. Enable "2-Step Verification"
3. Search for "App passwords"
4. Create password for "Mail"
5. Copy the 16-digit password
```

### 2️⃣ Update .env File
```bash
# Edit: server/.env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxx-xxxx-xxxx-xxxx  # Paste your app password
```

### 3️⃣ Create Test User in Firestore
```
Collection: users
Document ID: <any-id>
Fields:
  - email: "your-test-email@gmail.com"
  - authority: "garbage related manager"
  - city: "ירושלים"
```

### 4️⃣ Test It!

**Option A - Via Script:**
```bash
npm run test-email
```

**Option B - Via API:**
```bash
curl -X POST http://localhost:3000/api/test-email
```

**Option C - Via Browser:**
```
Open: http://localhost:3000/api/test-email
Method: POST (use Postman or browser extension)
```

## ✅ Verification Checklist

- [ ] Gmail App Password created
- [ ] .env file updated with EMAIL_USER and EMAIL_PASSWORD
- [ ] Firestore user created with authority "garbage related manager"
- [ ] Test script runs without errors
- [ ] Email received in inbox (check spam folder)

## 🎯 What Happens When Garbage Anomaly is Detected

```
1. Anomaly detected → category = "garbage"
2. System queries Firestore for users:
   WHERE authority = "garbage related manager"
3. Extracts email addresses
4. Sends formatted email to all managers
5. Logs success/failure to console
```

## 📧 Test Commands

| Command | Description |
|---------|-------------|
| `npm run test-email` | Run standalone test script |
| `curl -X POST http://localhost:3000/api/test-email` | Test via API |
| `npm run server` | Start detection server (auto-sends on real anomalies) |

## 🔍 Check Console Logs For:

```
✅ Good signs:
   "📧 Found X garbage manager(s) to notify"
   "✅ Email sent successfully to X recipient(s)"

⚠️ Warnings:
   "⚠️ Email service not configured"
   "⚠️ No garbage managers found"
   "⚠️ No valid email addresses found"

❌ Errors:
   "❌ Error sending email: Invalid credentials"
   "❌ Error querying users by authority"
```

## 🐛 Quick Fixes

| Error | Fix |
|-------|-----|
| "Email service not configured" | Add EMAIL_USER and EMAIL_PASSWORD to server/.env |
| "Invalid credentials" | Use Gmail App Password (16 digits), not regular password |
| "No garbage managers found" | Add user to Firestore with authority="garbage related manager" |
| "No recipients" | Check user has "email" field with valid address |
| Email in spam | Mark as "Not Spam" in Gmail |

## 📝 Firestore User Structure

```javascript
// Correct ✅
{
  email: "manager@example.com",
  authority: "garbage related manager",  // Exact match!
  city: "ירושלים"
}

// Wrong ❌
{
  email: "manager@example.com",
  authority: "garbage manager",  // Different text
  city: "ירושלים"
}
```

## 🎨 Email Preview

The email will look like:

```
┌─────────────────────────────────────┐
│ 🚨 אזהרת אנומליה חדשה                │
├─────────────────────────────────────┤
│ ריבוי דיווחי garbage באזור ירושלים  │
│                                     │
│ סוג: spike                          │
│ קטגוריה: garbage                    │
│ אזור: ירושלים                       │
│ חומרה: גבוהה                        │
│                                     │
│ תיאור:                              │
│ נמצאו 45 דיווחים בחודש הנוכחי...   │
│                                     │
│ מדדים:                              │
│ • currentReports: 45                │
│ • baselineMean: 20.5                │
│ • pctChange: 119                    │
│ • zScore: 3.2                       │
│                                     │
│ דיווחים קשורים: 15                 │
│ זוהה לראשונה: 23/12/2025 10:30    │
└─────────────────────────────────────┘
```

## 🚀 Production Deployment

1. **Update .env** with production email credentials
2. **Verify Firestore** has real managers with correct authority
3. **Start server**: `npm run server`
4. **Monitor logs** for email notifications
5. **Check email delivery** regularly

## 📞 Need Help?

- Read full guide: `EMAIL_NOTIFICATION_SETUP.md`
- Check implementation: `IMPLEMENTATION_SUMMARY.md`
- Review code: `lib/server/email-service.ts`

---

**Remember**: First email might go to spam. Mark as "Not Spam" to ensure future emails arrive in inbox!
