// lib/server/email-service.ts
import nodemailer from "nodemailer";
import { getFirestore } from "firebase-admin/firestore";
import { Anomaly } from "./anomalyDetector/builders";
import admin from "firebase-admin";

// Create email transporter
// You'll need to configure these environment variables
const transporter = nodemailer.createTransport({
  service: "gmail", // or your email service
  auth: {
    user: process.env.EMAIL_USER, // your email address
    pass: process.env.EMAIL_PASSWORD, // your email password or app password
  },
});

interface User {
  email: string;
  authority: string;
  city: string;
  district?: string;
}

/**
 * Query Firestore users collection by authority and optionally by city
 */
export async function getUsersByAuthority(
  authority: string,
  city?: string
): Promise<User[]> {
  try {
    const firestore = getFirestore(admin.app());
    let query = firestore
      .collection("users")
      .where("authority", "==", authority);
    
    // Filter by city if provided
    if (city) {
      query = query.where("city", "==", city);
    }
    
    const usersSnapshot = await query.get();

    const users: User[] = [];
    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        email: data.email || "",
        authority: data.authority || "",
        city: data.city || "",
        district: data.district || "",
      });
    });

    return users;
  } catch (error) {
    console.error("❌ Error querying users by authority:", error);
    return [];
  }
}

/**
 * Send email notification about a new anomaly
 */
export async function sendAnomalyEmail(
  anomaly: Anomaly,
  recipients: string[]
): Promise<void> {
  if (recipients.length === 0) {
    console.log("⚠️ No recipients to send email to");
    return;
  }

  // Check if email service is configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn("⚠️ Email service not configured. Skipping email notification.");
    return;
  }

  const emailContent = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d32f2f;">🚨 אזהרת אנומליה חדשה</h2>
      
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #333; margin-top: 0;">${anomaly.title}</h3>
        
        <p><strong>סוג:</strong> ${anomaly.type}</p>
        <p><strong>קטגוריה:</strong> ${anomaly.category}</p>
        <p><strong>אזור:</strong> ${anomaly.area}</p>
        <p><strong>חומרה:</strong> ${anomaly.severity === "high" ? "גבוהה" : "בינונית"}</p>
        <p><strong>סטטוס:</strong> ${anomaly.status === "open" ? "פתוח" : "סגור"}</p>
        
        <div style="margin-top: 15px; padding: 15px; background-color: white; border-right: 4px solid #d32f2f;">
          <p><strong>תיאור:</strong></p>
          <p>${anomaly.description}</p>
        </div>

        ${anomaly.generalMessage ? `
          <div style="margin-top: 15px; padding: 15px; background-color: #fff3cd; border-radius: 4px;">
            <p style="margin: 0;">${anomaly.generalMessage}</p>
          </div>
        ` : ""}
        
        <div style="margin-top: 20px;">
          <p><strong>מדדים:</strong></p>
          <ul style="list-style: none; padding: 0;">
            ${Object.entries(anomaly.metrics)
              .map(([key, value]) => `<li>• <strong>${key}:</strong> ${value}</li>`)
              .join("")}
          </ul>
        </div>
        
        <p style="margin-top: 15px;"><strong>דיווחים קשורים:</strong> ${anomaly.relatedReports.length}</p>
        <p><strong>זוהה לראשונה:</strong> ${new Date(anomaly.firstDetected).toLocaleString("he-IL")}</p>
      </div>
      
      <p style="color: #666; font-size: 12px;">
        הודעה זו נשלחה אוטומטית ממערכת ניהול דיווחי העירייה.
      </p>
    </div>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipients.join(", "),
    subject: `🚨 אנומליה חדשה: ${anomaly.category} באזור ${anomaly.area}`,
    html: emailContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${recipients.length} recipient(s)`);
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
}

/**
 * Main function to notify users about a new garbage anomaly
 */
export async function notifyGarbageAnomalyManagers(anomaly: Anomaly): Promise<void> {
  // Only send emails for garbage anomalies
  if (anomaly.category.toLowerCase() !== "garbage") {
    console.log(`ℹ️ Anomaly is not garbage-related (${anomaly.category}). Skipping email.`);
    return;
  }

  console.log(`📧 Sending email notification for garbage anomaly: ${anomaly.id}`);
  console.log(`📍 Anomaly location: ${anomaly.area}`);
  console.log(`🔍 Looking for users with:`);
  console.log(`   - authority: "garbage related manager"`);
  console.log(`   - city: "${anomaly.area}"`);

  // Get all users with "garbage related manager" authority in the same city
  const managers = await getUsersByAuthority("garbage related manager", anomaly.area);

  console.log(`✅ Found ${managers.length} manager(s) in Firestore`);
  
  if (managers.length === 0) {
    console.log(`⚠️ No garbage managers found in the system for city: ${anomaly.area}`);
    console.log(`💡 Make sure Firestore has users with:`);
    console.log(`   - authority: "garbage related manager"`);
    console.log(`   - city: "${anomaly.area}"`);
    return;
  }

  // Log found managers
  console.log(`📋 Manager details:`);
  managers.forEach((m, i) => {
    console.log(`   ${i + 1}. City: ${m.city}, Email: ${m.email || "(missing)"}, Authority: ${m.authority}`);
  });

  // Extract email addresses
  const emailAddresses = managers
    .map((m) => m.email)
    .filter((email) => email && email.includes("@"));

  if (emailAddresses.length === 0) {
    console.log(`⚠️ No valid email addresses found for garbage managers`);
    console.log(`💡 The users exist but don't have valid email addresses.`);
    console.log(`   Please add "email" field to these users in Firestore.`);
    return;
  }

  console.log(`📧 Sending emails to ${emailAddresses.length} recipient(s):`);
  emailAddresses.forEach((email, i) => {
    console.log(`   ${i + 1}. ${email}`);
  });

  // Send the email
  await sendAnomalyEmail(anomaly, emailAddresses);
}
