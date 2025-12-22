import { Anomaly } from "./builders";

export const anomalyTemplates = {


  /////////////////////////////////////////////////////////////////////////////////////
        // done
  spike: (a: Anomaly) =>
    `נמצאה עלייה חדה בדיווחי ${a.category} באזור ${a.area}. 
החודש נרשמו ${a.metrics.currentReports} דיווחים מול ממוצע היסטורי של ${a.metrics.baselineMean}.
הערך חצה את סף הגילוי (${a.metrics.threshold}) עם שינוי של ${a.metrics.pctChange}% (Z=${a.metrics.zScore}).`,

  slow_response: (a: Anomaly) =>
    `זוהה זמן טיפול ארוך מהרגיל עבור דיווחי ${a.category} באזור ${a.area}.
זמן הטיפול הממוצע עומד על ${a.metrics.currentAvgDays} ימים,
לעומת ציפייה של ${a.metrics.threshold} ימים.`,

/////////////////////////////////////////////////////////////////////////////////////
        // not done yey

  trend: (a: Anomaly) =>
    `נמצאה עלייה מתמשכת בדיווחי ${a.category} באזור ${a.area}. 
העלייה אינה נקודתית אלא עקבית לאורך זמן, ומעידה על בעיה שהולכת ומחריפה.`,

  drop: (a: Anomaly) =>
    `נמצאה ירידה משמעותית בדיווחי ${a.category} באזור ${a.area}, ביחס להתנהגות ההיסטורית.`,
  


  unclosed_cases: (a: Anomaly) =>
    `קיימת הצטברות חריגה של דיווחים פתוחים מסוג ${a.category} באזור ${a.area}. 
ישנם ${a.metrics.openCases} דיווחים שלא נסגרו במשך ${a.metrics.daysOpen} ימים בממוצע.`,

  geo_cluster: (a: Anomaly) =>
    `זוהה ריכוז גיאוגרפי חריג של ${a.metrics.totalReports} דיווחי ${a.category} באזור ${a.area}.
מרכז האנומליה ברדיוס ${a.metrics.radiusMeters}מ' סביב קואורדינטות ${a.center?.lat?.toFixed(4)}, ${a.center?.lng?.toFixed(4)}.
הפעילות עלתה ב-${a.metrics.pctChange}% מול ההיסטוריה (Z-score מקסימלי: ${a.metrics.maxZScore}).
האנומליה כוללת ${a.metrics.cellsInvolved} תאי רשת צמודים עם צפיפות דיווחים חריגה.`,

  delay: (a: Anomaly) =>
    `נמצאה חריגה בזמני התגובה לדיווחי ${a.category} באזור ${a.area}. 
התגובה מתעכבת בממוצע ב-${a.metrics.delayFactor}× מהרגיל.`,

  custom: (a: Anomaly) =>
    `נמצאה אנומליה מסוג ${a.type} עבור דיווחי ${a.category} באזור ${a.area}.`,
};