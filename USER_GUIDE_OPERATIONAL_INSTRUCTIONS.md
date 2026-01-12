# MuniMap - User's Guide: Operating Instructions
## דרכון משתמש: הנחיות תפעול

**Version:** 2.1  
**Target Audience:** Municipal Employees & Department Managers  
**System URL:** https://astounding-cannoli-8f55f1.netlify.app/

---

## 1. System Access | גישה למערכת

### 1.1 Login Process | תהליך התחברות

1. **Navigate to System** | גש לכתובת המערכת  
   Open browser → Enter: `https://astounding-cannoli-8f55f1.netlify.app/`

2. **Enter Credentials** | הזן פרטי כניסה
   - Email: `yourname@city.gov.il` (assigned by IT)
   - Password: Your secure password
   - Click **🔑 Login** button

3. **Dashboard Loads** | המערכת נפתחת
   - Map displays your city boundary (blue polygon)
   - Report markers visible with color-coded urgency
   - Top bar: Filters, Search, Archive, Logout
   - Right sidebar: Statistics button and filter summary
   - Bottom bar: Anomaly detection section

**Troubleshooting:**
- ✗ Login failed → Verify email/password, check Caps Lock
- ✗ Access denied → Contact IT at `munimap@gmail.com`

---

## 2. Main Dashboard Operations | פעולות במסך ראשי

### 2.1 Understanding the Map | הבנת המפה

**Report Marker Colors = SLA Urgency:**
- 🟢 **Green** (New): 0-50% of SLA time used
- 🟡 **Yellow** (Medium): 50-100% of SLA time used  
- 🟠 **Orange** (Old): 100-200% of SLA time used
- 🔴 **Red** (Critical): Over 200% of SLA time used

**Click any marker** → Opens Report Details modal with:
- Title, description, status, location, images
- Status history timeline with update dates
- Comments section (add notes)
- Update status button

### 2.2 Applying Filters | הפעלת סינונים

**Step-by-Step:**

1. Click **🧰 Filters** button (top bar)
2. Select desired criteria:
   - **Category:** Garbage, Lighting, Tree, Cleaning, Signage, Roads
   - **Status:** Open, Pending, In Progress, Resolved, or All
   - **Criticality:** New, Medium, Old, Critical, or All
   - **Date Range:** From date → To date (optional)
   - **Media Only:** Toggle ON to show only reports with images
3. Click **✅ ACCEPT** button
4. Map updates to show filtered reports only

**Best Practice Filter Combinations:**  
*(Expand "💡 Filter Tips" in the modal for real-time guidance)*

| Goal | Category | Status | Criticality |
|------|----------|--------|-------------|
| Critical Attention | Any | Open | Critical (Red) |
| Bottleneck Analysis | Any | Pending/In Progress | Old/Critical |
| Performance Check | Any | Resolved | New/Medium |
| Infrastructure Issues | Specific (e.g., Lighting) | All | Critical |

**Clear Filters:**  
Click **🔄 Refresh** button (top bar) → Resets all filters and shows all reports

### 2.3 Viewing Report Details | צפייה בפרטי דיווח

**From Map:**  
Click marker → Report Details modal opens

**From Table View:**  
1. Click **📋 View Reports** button (top bar)
2. Table displays filtered reports with columns:
   - Category, Area, Address, Date, Status, Media indicator
3. Click any row → Report Details opens

**In Report Details Modal:**
- **Status History:** Shows progression (Open → Pending → In Progress → Resolved)
- **Images:** Click thumbnail to expand full-size view
- **Comments:** View existing comments or add new ones
- **Update Status:** Select new status + Add comment → Click **Update**
- **Map Location:** Click **📍 Show on Map** to see geographic position

---

## 3. Statistics & Analytics | סטטיסטיקה וניתוח

### 3.1 Accessing Statistics | גישה לסטטיסטיקה

1. Click **📊 סטטיסטיקה** button (right sidebar)
2. Statistics modal opens with summary cards:
   - **Total Reports:** Count with percentage change
   - **Open:** Awaiting assignment
   - **Pending:** Assigned but not started
   - **In Progress:** Active resolution
   - **Resolved:** Completed reports

### 3.2 Time Range Selection | בחירת טווח זמן

Select time period:
- **Month** (30 days)
- **3 Months** (90 days)
- **6 Months** (180 days)
- **Year** (365 days)
- **Custom:** Pick specific From/To dates

### 3.3 Resolution Time Graph | גרף זמן פתרון

**Displays:** Average days to resolve reports over time  
**X-axis:** Month-Year (e.g., Jan 25, Feb 25)  
**Y-axis:** Days  
**Manual Refresh:** Click **🔄 Refresh Graph Data** to update without auto-animation

### 3.4 Advanced Analytics | ניתוחים מתקדמים

**From Statistics modal, click:**

**📈 Detailed Graphs**
- Resolution time trends by category
- Category comparison charts
- Time-series analysis

**📊 Detailed Stats**
- Top categories by report count
- SLA breach rates (% exceeding target time)
- Aging reports analysis (7/14/30+ days old)

**🔄 Status Transitions**
- Matrix showing report flow between statuses
- Average transition times (e.g., Open → Pending: 4 hours)
- Bottleneck identification

---

## 4. Anomaly Detection & Response | זיהוי חריגות ותגובה

### 4.1 Understanding Anomaly Alerts | הבנת התרעות חריגות

**Bottom Bar Display:**
- Shows 3-5 most recent anomalies
- Each card shows: Category icon, Area, Report count, Severity, Time

**Anomaly Types:**
- **📈 Spike:** Sudden increase in reports (e.g., 15 reports in 2 hours vs. avg 2/day)
- **📍 Geo-Cluster:** Multiple reports in small geographic area
- **⏱️ Processing Delay:** Reports taking longer than average to resolve

### 4.2 Investigating Anomalies | חקירת חריגות

**Step-by-Step:**

1. **Click anomaly card** in bottom bar
2. **Anomaly Details modal opens** showing:
   - Full description and statistical metrics
   - Current reports vs. historical average
   - Affected geographic area
   - List of related report IDs
3. **Click "View Related Reports"** button
4. **Reports Table opens** filtered to anomaly reports
5. **Review reports** → Identify common pattern/root cause
6. **Take action:**
   - Update status (e.g., Open → In Progress)
   - Add comments with resolution plan
   - Dispatch resources as needed
7. **Return to anomaly** → Click **✅ Mark as Reviewed** button

### 4.3 Email Notifications | התרעות אימייל

**When anomaly detected in your responsibility area:**
- Email sent to your address
- Subject: "🚨 Anomaly Alert: [Category] Reports [Type] in [City]"
- Body contains: Description, Report count, Time window, Area
- **Click link** in email → Opens system login page
- After login → Navigate to Bottom Bar → Click anomaly card

### 4.4 Viewing All Anomalies | צפייה בכל החריגות

1. Click **📋 Full List** button (bottom bar)
2. **Anomalies Table opens** with columns:
   - Type, Category, Area, Report Count, Severity, Time, Reviewed Status
3. **Filter options:** By category, type, severity
4. Click any row → Opens Anomaly Details

---

## 5. Archive & Export | ארכיון ויצוא

### 5.1 Accessing Archive | גישה לארכיון

1. Click **📋 Archive** button (top bar, visible on larger screens)
2. **Archived Reports modal opens**

### 5.2 Filtering Archived Reports | סינון דוחות ארכיוניים

- **Year:** Select archive year from dropdown
- **Date Range:** From date → To date
- **Category:** Select specific infrastructure type
- Click **Apply Filters**

### 5.3 Exporting to Excel | יצוא לאקסל

1. Apply desired filters in Archive modal
2. Click **📤 Export to Excel** button
3. File downloads: `archive_reports_[timestamp].xlsx`
4. **Excel contains columns:**
   - ID, Title, Description, Category, Area, Address
   - Status, Timestamp, Media URL, Criticality
   - Status History with timestamps

**Use Case:** Monthly reports, compliance documentation, performance analysis

---

## 6. Search & Table View | חיפוש ותצוגת טבלה

### 6.1 Search by Report ID | חיפוש לפי מספר דיווח

1. Click **🔍 Search** button (top bar)
2. Enter Report ID (format: `{category}-{timestamp}`)
3. Click **Search**
4. Report Details modal opens directly

### 6.2 Table View | תצוגת טבלה

1. Apply filters first (Category, Status, Date Range)
2. Click **📋 View Reports** button (top bar)
3. **Table displays all filtered reports** with:
   - Sortable columns (click header to sort)
   - Row click → Opens Report Details
   - **Filter controls at top** (modify without closing table)
   - **🗺️ View on Map** button to see geographic distribution

---

## 7. Common Workflows | תהליכי עבודה נפוצים

### 7.1 Daily Morning Check | בדיקת בוקר יומית

```
1. Login to system
2. Apply Filters: Status = Open, Criticality = Critical
3. Review red markers on map
4. Click each critical report → Update status to "Pending"
5. Add comment: "Assigned to [team name]"
6. Check anomaly section for overnight alerts
```

### 7.2 Weekly Performance Review | סקירה שבועית

```
1. Open Statistics modal
2. Set Time Range = Week (custom: 7 days back)
3. Review:
   - Total resolved reports
   - Average resolution time
   - SLA breach rate
4. Click "Detailed Stats" → Identify top problem categories
5. Click "Status Transitions" → Find bottlenecks
```

### 7.3 Responding to Anomaly Email | תגובה לאימייל חריגה

```
1. Open anomaly email notification
2. Click system link → Login
3. Navigate to Bottom Bar → Find anomaly card
4. Click anomaly → View Related Reports
5. Review pattern (e.g., all in same area)
6. Update reports: Status = In Progress, Add comment
7. Dispatch resources/coordinate with field teams
8. After resolution: Update to Resolved
9. Mark anomaly as Reviewed
```

### 7.4 Monthly Archive Export | יצוא ארכיון חודשי

```
1. Click Archive button
2. Set filters:
   - Year: Current year
   - Date: First day of last month → Last day of last month
   - Category: All
3. Click Export to Excel
4. Save file with naming: Reports_[Month]_[Year].xlsx
5. Upload to shared drive/send to management
```

---

## 8. Tips & Best Practices | טיפים ושיטות עבודה

### 8.1 Efficiency Tips | טיפים ליעילות

✅ **Always apply filters before table view** → Loads faster  
✅ **Use criticality filter** → Focus on urgent items first  
✅ **Check anomalies daily** → Early detection prevents escalation  
✅ **Add meaningful comments** → Helps team coordination  
✅ **Mark anomalies as reviewed** → Prevents duplicate investigation  
✅ **Use table view for bulk actions** → Faster than map clicking

### 8.2 System Limitations | מגבלות מערכת

⚠️ **Multi-device login:** Same credentials work on 5+ devices simultaneously  
⚠️ **Real-time updates:** Data refreshes every 0.8ms (listeners), but manual refresh recommended for reports table  
⚠️ **Browser compatibility:** Chrome/Edge recommended, Firefox/Safari supported  
⚠️ **Mobile responsive:** Dashboard works on tablets (min-width: 600px), limited phone support

### 8.3 Troubleshooting | פתרון בעיות

| Problem | Solution |
|---------|----------|
| Markers not showing | Apply filters → Click Accept |
| Map not loading | Refresh browser (Ctrl+R / Cmd+R) |
| Statistics empty | Check time range, ensure reports exist in period |
| Email not received | Check spam folder, verify email in system (IT) |
| Update status failed | Check internet connection, logout/login |

---

## 9. Support & Contact | תמיכה ויצירת קשר

**Technical Issues:**  
📧 Email: `munimap@gmail.com`  
📞 Phone: `+972-4-1234567`

**Password Reset:**  
Contact IT department with your registered email address

**Feature Requests:**  
Submit via email with subject: "Feature Request - [Your Request]"

**System Status:**  
Check deployment: https://astounding-cannoli-8f55f1.netlify.app/

---

## 10. Quick Reference | עזר מהיר

### Keyboard Shortcuts | קיצורי מקלדת
*(Browser default shortcuts apply)*

| Action | Shortcut |
|--------|----------|
| Refresh Page | Ctrl+R / Cmd+R |
| Close Modal | Esc key |
| Search Page | Ctrl+F / Cmd+F |

### Report Status Lifecycle | מחזור חיים של דיווח

```
Open → Pending → In Progress → Resolved → [Archived after 30 days]
  ↓        ↓            ↓             ↓
"New"  "Assigned"  "Being Fixed"  "Completed"
```

### SLA Time Targets by Category | יעדי זמן לפי קטגוריה

| Category | Target Resolution Time |
|----------|------------------------|
| Garbage | 3 days |
| Lighting | 5 days |
| Tree | 7 days |
| Cleaning | 2 days |
| Signage | 10 days |
| Roads | 14 days |

**Color Thresholds:**
- 🟢 Green: 0-50% of target time
- 🟡 Yellow: 50-100% of target time
- 🟠 Orange: 100-200% of target time
- 🔴 Red: Over 200% of target time

---

**End of User Guide | סוף מדריך משתמש**

*For detailed system architecture and maintenance information, refer to:*
- `docs/Capstone_Project_Phase_B.md` (Appendix A: User Guide - Extended)
- `SYSTEM_SCENARIOS.md` (Real-world usage scenarios)
- `REALTIME_FEATURES.md` (Real-time functionality details)

---

**Document Version:** 2.1  
**Last Updated:** January 2026  
**System Version:** MuniMap Production v1.0  
**Deployed URL:** https://astounding-cannoli-8f55f1.netlify.app/
