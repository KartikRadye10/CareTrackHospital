export type UserRole = 'nurse' | 'doctor' | 'admin';

export interface UserProfile {
  role: UserRole;
  name: string;
  title: string;
  badgeId: string;
}

export type PatientStatus = 'active' | 'discharge_ready' | 'discharged' | 'deceased';

export type OutcomeType = 'recovered' | 'deceased' | 'transferred' | 'unknown';

export interface TemperatureMeasurement {
  id: string;
  patientId: string;
  celsius: number;
  recordedAt: string; // ISO string
  recordedDate: string; // YYYY-MM-DD
  recordedBy: string; // Staff name & role
  isFever: boolean;
  isHighAlert: boolean; // e.g. >= 39.5 C
  isDuplicateOverride: boolean;
  duplicateReason?: string;
  notes?: string;
}

export interface DoctorVisit {
  id: string;
  patientId: string;
  visitedAt: string; // ISO string
  visitedDate: string; // YYYY-MM-DD
  visitedBy: string; // Doctor name
  notes: string;
  followUpFlag: boolean;
  followUpReason?: string;
  isExceptionalPreTemp: boolean; // Visited before temperature was logged
  recommendDischarge: boolean;
}

export interface DischargeRecord {
  id: string;
  patientId: string;
  dischargedAt: string; // ISO string
  dischargedDate: string; // YYYY-MM-DD
  dischargedBy: string; // Admin staff name
  authorizedRole: UserRole;
  verifiedFeverFreeDays: number;
  dischargeNotes: string;
  destination: string; // Home quarantine, Outpatient, Transfer
}

export interface PatientOutcome {
  patientId: string;
  outcomeDate: string; // YYYY-MM-DD
  outcomeType: OutcomeType;
  causeOfDeath?: string;
  recordedBy: string;
  notes?: string;
}

export interface Patient {
  id: string; // CT-2026-XXX
  name: string;
  age: number;
  gender: 'Female' | 'Male' | 'Other';
  roomBed: string; // e.g. "Ward A - Bed 04"
  admissionDate: string; // YYYY-MM-DD
  status: PatientStatus;
  symptoms: string[];
  notes?: string;
  
  // Outcome reference if completed
  outcome?: PatientOutcome;
  dischargeRecord?: DischargeRecord;
}

export interface FeverFreeCalculation {
  status: 'eligible' | 'ineligible' | 'needs_review';
  consecutiveDays: number;
  requiredDays: number;
  reasons: string[];
  dayDetails: {
    date: string;
    hasRecord: boolean;
    maxCelsius: number | null;
    isFever: boolean;
    status: 'fever_free' | 'fever_detected' | 'no_record' | 'partial_pending';
  }[];
}

export interface AppSettings {
  facilityName: string;
  maxCapacity: number; // 74
  feverThresholdCelsius: number; // default 38.0
  feverThresholdIsAssumption: boolean;
  currentSimulatedDate: string; // YYYY-MM-DD
  expectedMortalityBenchmark: number; // 15%
  expectedSurvivalBenchmark: number; // 85%
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'urgent' | 'warning' | 'info' | 'success';
  patientId?: string;
  read: boolean;
}
