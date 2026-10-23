<<<<<<< HEAD
# CareTrack — Hospital Virus Quarantine & Treatment Operations Platform
**FactWise Technical Product Manager (TPM) Assessment Prototype**

CareTrack is a clinical operations web platform engineered for hospital virus quarantine and inpatient treatment facilities. It solves paper journal inefficiencies (missed vitals, delayed discharges, uncoordinated physician visits) by coordinating daily temperature monitoring, physician rounds, 3-day fever-free discharge clearance, 74-bed capacity management, and epidemiological cohort outcome monitoring.

---

## 1. Product Objective & Facility Operational Context

- **Facility Bed Capacity**: Strict maximum capacity of **74 isolation beds**. When all 74 beds are occupied, admissions are locked until a bed is released.
- **Dual Daily Clinical Mandates**:
  1. Every inpatient requires a daily body temperature measurement (Celsius).
  2. Every inpatient requires a physician round on the same day.
- **Discharge Criterion**: Minimum **three full consecutive calendar days without fever** (< configured threshold). Missing records are never assumed to be fever-free.
- **Outcome Benchmarks**: Baseline expected **15% mortality benchmark** and **85% survival benchmark**.
- **Roles Coordinated**: Nurses, Physicians, and Facility Administrators.

---

## 2. Technology Stack & Architectural Highlights

- **Framework**: React 19 + TypeScript (strict typing with `verbatimModuleSyntax`)
- **Build System**: Vite 8 + `@tailwindcss/vite`
- **Styling**: Tailwind CSS with clinical healthcare SaaS aesthetics (deep navy sidebar `#0f172a`, crisp light backgrounds `#f8fafc`, emerald completed indicators, amber pending indicators, rose urgent alerts)
- **Icons**: Lucide React
- **State & Persistence**: Centralized React Context (`CareTrackContext`) with versioned `localStorage` persistence (`caretrack_prototype_v1`), safe fallback defaults, and zero backend/secret dependencies
- **Simulation Tools**: Interactive **"+1 Day" / "+3 Days" Hospital Date Simulator** allowing evaluators to fast-forward through multi-day clinical progression in real time without waiting real-world calendar days.

---

## 3. Quickstart & Local Execution

### Prerequisites
- Node.js v18+ (tested on Node v22)
- npm v9+

### Installation & Startup
```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

### Build & Production Verification
```bash
# Run TypeScript typecheck and production bundle build
npm run build

# Preview production build locally
npm run preview
```

### Running the Automated Clinical Workflow Test Suite
```bash
npx -y tsx test_workflows.ts
```
*(All 23 automated clinical test cases pass, verifying capacity limits, fever calculations, duplicate guards, and mortality equations).*

---

## 4. Evaluator Walkthrough & Core Clinical Workflows

### A. Dashboard Command Center
- **6 KPI Metric Cards**: Active Inpatients, Bed Occupancy (/74), Temperatures Awaiting Today, Doctor Visits Awaiting Today, Discharge Ready, and Recorded Deaths. All values derive dynamically from application state.
- **Dual Compliance Progress Meters**: Visual progress tracking completion percentages of today's temperature measurements and physician visits.
- **Attention Required Queue**: Automatically surfaces patients with active pyrexia (≥38.0°C), critical high alert (≥39.5°C), physician follow-up flags, or documentation data gaps.
- **Daily Handover Brief (Prototype Feature)**: Click **"Daily Handover"** in the top bar to generate a structured shift handover report with census, pending tasks, critical watchlists, and one-click clipboard copy.

### B. Nurse Workflow — Temperature Tracking
1. Open **Temperature Tracking** from the sidebar to view the **Awaiting Measurement** queue.
2. Select a patient (e.g., *Amina Mansour*) and click **Record Temp**.
3. Enter temperature in Celsius (e.g. `37.2°C`).
4. **Duplicate Protection Rule**: If an evaluator attempts to record a second reading for the same patient on the same day, CareTrack triggers an accidental duplicate warning and requires an **explicit clinical reason** (e.g., *Post-antipyretic re-check*, *Patient shivering/spike*). Both records are preserved in the audit log without overwriting.

### C. Doctor Workflow — Daily Physician Rounds
1. Open **Doctor Rounds** from the sidebar.
2. Inspect the categorized queues:
   - *Ready for Review* (Temperature already logged today, awaiting round)
   - *Temp Not Recorded* (Vitals pending from nursing staff)
   - *Flagged Follow-ups* (Patients flagged for follow-up)
   - *Completed* (Rounds completed today)
3. **Pre-Temperature Guard**: If a physician attempts to document a normal visit before today's temperature is logged, CareTrack displays a clinical warning. To prevent distorted records, the physician must either return to the pending queue or explicitly check *"Document as exceptional visit before temperature"*.
4. Physicians can add clinical notes, flag follow-up action items, and submit a **Discharge Clearance Recommendation**.

### D. Discharge Management & Bed Release
1. Open **Discharges** from the sidebar.
2. Review **Eligible Candidates** (e.g., *David Alvarez*, who has completed 3 full verified fever-free calendar days).
3. Review **Not Yet Eligible** candidates with transparent reasons (e.g., *Liam O'Connor* flagged as *"Needs Review"* due to a missing temperature record on Oct 22, demonstrating that missing records are never assumed to be fever-free).
4. **Role Authorization Guard**: Switch the demo role in the top bar:
   - *Nurse* and *Doctor* roles are prevented from executing final discharge (showing an explanatory permission notice).
   - Switch to **Administrator** (*Elena Rostova*). Click **Execute Authorized Discharge**.
5. Complete the checklist, enter destination notes, and confirm:
   - Patient status transitions to `discharged`.
   - Assigned bed is immediately freed and available for new admissions.
   - Bed occupancy and active counts update automatically.
   - Historical logs remain intact and visible in **Discharge History**.

### E. Patient Capacity & Admission Management
1. Open **Patients** from the sidebar.
2. Filter by status, search by patient name/ID, or sort columns.
3. Click **Admit New Patient** to open the admission modal with bed selection.
4. **74-Bed Limit Enforcement**: When 74 active inpatients are reached, admission is hard-disabled with a clear institutional capacity warning.

### F. Reports & Epidemiological Cohort Outcomes
1. Open **Reports & Outcomes** from the sidebar.
2. Filter by admission time window (Last 7 Days, 14 Days, 30 Days, All Time).
3. Inspect the **Mortality Rate Calculation**:
   $$\text{Mortality Rate} = \frac{\text{Deaths in Defined Cohort}}{\text{Total Closed Outcomes in Cohort}} \times 100$$
   *(Defined strictly over resolved cases; CareTrack never divides deaths by active inpatients alone).*
4. Visual comparison against the **15% mortality benchmark** and **85% survival benchmark**.
5. **Statistical Variance Notice**: When observed mortality exceeds 15% in small sample sizes ($N < 30$), CareTrack displays an explanatory banner noting that discrete outcomes in small cohorts have high variance and do not indicate systemic care degradation.
6. Clear definitions for **Average & Median Length of Stay (LOS)**.

### G. Facility Settings & Data Persistence
1. Open **Settings** from the sidebar.
2. **Configurable Fever Threshold**: Default set to `38.0°C` and clearly labeled with the **PROTOTYPE ASSUMPTION** badge.
3. **Simulation Controls**: Advance hospital date by +1 Day or +3 Days.
4. **Data Management**: Export the full system state to JSON, or click **Reset Demo Data** with confirmation to restore the initial evaluation dataset.

---

## 5. Demonstration Roles Matrix

CareTrack provides a demo staff role switcher in the top navigation bar:

| Feature / Action | Nurse View | Doctor View | Administrator View |
| :--- | :---: | :---: | :---: |
| **Record Daily Temperatures** | Full Access | Full Access | Full Access |
| **Document Physician Rounds** | Read-Only | Full Access | Full Access |
| **Recommend Discharge Clearance** | — | Clinical Flag | Clinical Flag |
| **Authorize Discharge & Bed Release** | Restricted (Notice) | Restricted (Notice) | **Authorized Sign-off** |
| **Modify Thresholds & Global Settings** | Restricted | Restricted | **Authorized** |

---

## 6. Known Limitations & Prototype Notice

1. **Client-Side Storage**: Prototype persistence uses browser `localStorage`. Real-world hospital deployments require a secure FHIR/HL7-compliant relational backend with encrypted audit logs.
2. **Demo Role Switching**: The top-bar role selector is designed for evaluating multidisciplinary workflows within a prototype environment. Production environments must enforce security via backend RBAC session tokens.
3. **Clinical Decision Support Aid**: The 3-day fever-free calculator is an operational workflow aid, not an automated diagnostic system. Clinical clearance requires human staff authorization.

---

## 7. Deployment Instructions

### Deploy to Vercel (Recommended)
1. Push this repository to GitHub or GitLab.
2. Go to [Vercel](https://vercel.com/) and click **Add New Project**.
3. Import this repository.
4. Framework Preset: **Vite**.
5. Build Command: `npm run build`
6. Output Directory: `dist`
7. Click **Deploy**.

### Deploy to Netlify
1. Connect repository on [Netlify](https://www.netlify.com/).
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Click **Deploy Site**.

### Deploy via Docker
```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```
=======
# CareTrackHospital
>>>>>>> 3b9e413b25ff400d34a0254811a43ce8abcecd30
