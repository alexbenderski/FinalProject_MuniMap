// add-city-to-user.ts
// Quick script to add city permission to a user in Firestore

import admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  // Get user email and city from command line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log("╔════════════════════════════════════════════════════╗");
    console.log("║  Add City Permission to User                       ║");
    console.log("╚════════════════════════════════════════════════════╝\n");
    console.log("Usage:");
    console.log('  npx ts-node scripts/add-city-to-user.ts <email> <city>\n');
    console.log("Examples:");
    console.log('  npx ts-node scripts/add-city-to-user.ts user@example.com "חיפה"');
    console.log('  npx ts-node scripts/add-city-to-user.ts admin@test.com "נשר"');
    console.log('  npx ts-node scripts/add-city-to-user.ts test@demo.com "חוף הכרמל"\n');
    console.log("Available cities:");
    console.log("  - חיפה (Haifa)");
    console.log("  - נשר (Nesher)");
    console.log("  - חוף הכרמל (Hof HaCarmel)");
    process.exit(1);
  }

  const userEmail = args[0];
  const cityName = args[1];

  console.log("╔════════════════════════════════════════════════════╗");
  console.log("║  Add City Permission to User                       ║");
  console.log("╚════════════════════════════════════════════════════╝\n");

  // Initialize Firebase Admin
  const serviceAccountPath = path.join(__dirname, "../serviceAccountKey.json");

  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error("❌ serviceAccountKey.json not found");
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));

  try {
    admin.app();
  } catch {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  const firestore = admin.firestore();

  console.log(`🔍 Looking for user: ${userEmail}`);

  // Find user by email
  const usersSnapshot = await firestore
    .collection("users")
    .where("email", "==", userEmail)
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    console.error(`\n❌ User not found: ${userEmail}`);
    console.log("\nTip: Make sure the user has logged in at least once.");
    process.exit(1);
  }

  const userDoc = usersSnapshot.docs[0];
  console.log(`✅ Found user: ${userDoc.id}`);

  // Get current data
  const currentData = userDoc.data();
  console.log(`📋 Current permissions:`, currentData.permissions || "None");

  // Add city permission
  console.log(`\n📝 Adding city permission: ${cityName}`);

  await firestore
    .collection("users")
    .doc(userDoc.id)
    .set(
      {
        permissions: {
          city: cityName,
        },
      },
      { merge: true }
    );

  // Verify
  const updatedDoc = await firestore.collection("users").doc(userDoc.id).get();
  const updatedData = updatedDoc.data();

  console.log(`\n✅ Success! Updated permissions:`, updatedData?.permissions);
  console.log(`\n📌 User ${userEmail} can now use dev tools for city: ${cityName}`);
  console.log(`\nℹ️  User must log out and log in again to see the changes.`);

  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
