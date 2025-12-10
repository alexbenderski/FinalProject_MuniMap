// // app/api/tests/[...path]/route.ts

// import { NextRequest } from "next/server";
// import { getReportsForDetector } from "@/lib/server/reports-service";
// import { saveOrUpdateAnomaliesToDB } from "@/lib/server/anomalies-service";
// import { Anomaly } from "@/lib/server/anomalyDetector/builders";






// export async function GET(
//   req: NextRequest,
//   { params }: { params: { path?: string[] } }
// ) {
//   const segments = params.path || [];
//   const action = segments[0]; // לדוגמה: tests/reports → "reports"

//   try {


    
//     //  לקרוא דיווחים מהשרת (Admin)
//     if (action === "reports-fetch") {
//         try {
//             const data = await getReportsForDetector();
//             return Response.json({ ok: true, data });
//         } catch (err: unknown) {
//             console.error("TEST ERROR:", err);
//             return new Response("Error", { status: 500 });
//         }
//     }

//     //שמירת אנומליה במסד
//     if (action === "test-save-anomaly") { //working
//     const fake: Anomaly = {
//         id: "test123",
//         title: "🔥 TEST anomaly",
//         description: "זה רק בדיקה",
//         category: "garbage",
//         area: "Testing Area",
//         metrics: {
//             currentReports: 5,
//             baselineMean: 2,
//             baselineStd: 1,
//             threshold: 3,
//             pctChange: 0,
//             zScore: 0,
//             bins: []
//         },
//         relatedReports: [],
//         firstDetected: Date.now(),
//         lastUpdated: Date.now(),
//         // reviewedBy: {},
//         status: "open",
//         // firebaseKey: "",
//         type: "spike",
//         severity: "medium"
//     };
//     await saveOrUpdateAnomaliesToDB([fake]);
//     return Response.json({
//         ok: true,
//         message: "Saved test anomaly",
//         anomaly: fake,
//     });
//     }







//     // 🔹 ברירת מחדל
//     return new Response(`Unknown test: ${action}`, { status: 404 });

//   } catch (err) {
//     console.error("TEST ERROR:", err);
//     return new Response("Server error", { status: 500 });
//   }
// }