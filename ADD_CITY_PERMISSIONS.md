# 🔐 Adding City Permissions to Users

## Problem
When trying to use dev tools (Simulation, Anomaly Threshold Calculator), you see:
```
🚫 SECURITY: Cannot write reports without authorized city. User must be authenticated.
```

Or:
```
🚫 Missing city in Firestore
```

## Why?
For security, these tools only write reports to the **authenticated user's city**. The city is stored in Firestore under `users/{userId}/permissions/city`.

## Solution: Add City to User in Firestore

### Option 1: Using Firebase Console (Recommended)

1. **Open Firebase Console**
   - Go to: https://console.firebase.google.com
   - Select your project

2. **Navigate to Firestore Database**
   - Click "Firestore Database" in left menu
   - Click "users" collection

3. **Find Your User Document**
   - Find document with your user ID (UID)
   - Click to open it

4. **Add permissions Field**
   - If `permissions` field doesn't exist, click "Add field":
     - Field: `permissions`
     - Type: `map`
     - Click "Add field"
   
5. **Add city Inside permissions**
   - Expand `permissions` map
   - Click "Add field":
     - Field: `city`
     - Type: `string`
     - Value: `חיפה` (or your city name)
   
6. **Save**
   - Your user document should look like:
     ```
     users/{userId}
       ├─ email: "user@example.com"
       ├─ permissions:
       │   └─ city: "חיפה"
       └─ ...
     ```

### Option 2: Using Firebase Admin Script

Create `scripts/add-user-city.ts`:

```typescript
import admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

async function main() {
  // Initialize Firebase Admin
  const serviceAccount = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../serviceAccountKey.json"), "utf-8")
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  const firestore = admin.firestore();

  // Replace with your user email
  const userEmail = "your-email@example.com";
  const cityName = "חיפה";

  // Find user by email
  const usersSnapshot = await firestore.collection("users")
    .where("email", "==", userEmail)
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    console.error(`❌ User not found: ${userEmail}`);
    return;
  }

  const userDoc = usersSnapshot.docs[0];
  console.log(`✅ Found user: ${userDoc.id}`);

  // Add city permission
  await firestore.collection("users").doc(userDoc.id).set({
    permissions: {
      city: cityName
    }
  }, { merge: true });

  console.log(`✅ Added city permission: ${cityName}`);
  process.exit(0);
}

main().catch(console.error);
```

Run it:
```bash
npx ts-node scripts/add-user-city.ts
```

### Option 3: Automatic on Login (Recommended for Production)

Modify your sign-up/login logic to automatically add default city.

In `lib/client/auth-client.ts` or similar:

```typescript
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firestore";

// After user signs up or logs in
async function ensureUserPermissions(userId: string, userEmail: string) {
  const userRef = doc(db, "users", userId);
  
  await setDoc(userRef, {
    email: userEmail,
    permissions: {
      city: "חיפה" // Default city
    },
    createdAt: Date.now()
  }, { merge: true });
}
```

## Verification

After adding city permission:

1. **Refresh the page**
2. **Check the dev tool**:
   - Should see: `🔒 חיפה` (green badge)
   - Not: `🚫 Missing city in Firestore` (red badge)

## Supported Cities

Current cities in the system:
- חיפה (Haifa)
- נשר (Nesher)
- חוף הכרמל (Hof HaCarmel)

Make sure the city name **exactly matches** the name in `cities_municipal_boundaries.json`.

## Security Notes

⚠️ **Important**: These dev tools are for **development/testing only**. In production:
- Remove dev tools UI from dashboard
- Use proper admin authentication
- Implement role-based access control (RBAC)

## Troubleshooting

### Still seeing "Missing city" after adding?
1. **Log out and log in again** - permissions are loaded on login
2. **Check spelling** - city name must match exactly (including Hebrew characters)
3. **Check Firestore structure** - must be `permissions.city`, not `city` at root level

### Can't access Firebase Console?
Contact your Firebase project admin to add the permission for you.

### Want to use a different city?
1. Check available cities in `public/data/cities_municipal_boundaries.json`
2. Update `permissions.city` to match the exact city name

## See Also
- [Simulation Implementation Guide](SIMULATION_SECURITY_AND_SEEDER.md)
- [Dev Tools Documentation](lib/dev-tools/report-generator/README.md)
