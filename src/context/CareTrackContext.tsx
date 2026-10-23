import React, { createContext, useContext, useEffect, useState } from 'react';
import type {
  AppSettings,
  DischargeRecord,
  DoctorVisit,
  NotificationItem,
  Patient,
  PatientOutcome,
  TemperatureMeasurement,
  UserProfile,
  UserRole,
} from '../types';

import {
  INITIAL_PATIENTS,
  INITIAL_SETTINGS,
  INITIAL_TEMPERATURES,
  INITIAL_VISITS,
} from '../data/seedData';
import { addDays } from '../utils/feverCalculation';

const STORAGE_KEY = 'caretrack_prototype_v1';

export const PROFILES: Record<UserRole, UserProfile> = {
  nurse: {
    role: 'nurse',
    name: 'Nurse Sarah Jenkins',
    title: 'Registered Nurse (Quarantine Ward Lead)',
    badgeId: 'RN-8842',
  },
  doctor: {
    role: 'doctor',
    name: 'Dr. Marcus Vance',
    title: 'Attending Physician & Infectious Disease Specialist',
    badgeId: 'MD-4109',
  },
  admin: {
    role: 'admin',
    name: 'Elena Rostova',
    title: 'Hospital Operations Director & Bed Coordinator',
    badgeId: 'ADM-1002',
  },
};

interface CareTrackContextType {
  // State
  patients: Patient[];
  temperatures: TemperatureMeasurement[];
  visits: DoctorVisit[];
  settings: AppSettings;
  currentRole: UserRole;
  currentProfile: UserProfile;
  notifications: NotificationItem[];

  // Actions
  setRole: (role: UserRole) => void;
  admitPatient: (patientData: {
    name: string;
    age: number;
    gender: 'Female' | 'Male' | 'Other';
    roomBed: string;
    admissionDate: string;
    symptoms: string[];
    notes?: string;
  }) => { success: boolean; message: string; patient?: Patient };
  recordTemperature: (data: {
    patientId: string;
    celsius: number;
    recordedAt?: string;
    duplicateReason?: string;
    notes?: string;
  }) => { success: boolean; message: string; record?: TemperatureMeasurement };
  recordDoctorVisit: (data: {
    patientId: string;
    visitedAt?: string;
    notes: string;
    followUpFlag: boolean;
    followUpReason?: string;
    isExceptionalPreTemp?: boolean;
    recommendDischarge?: boolean;
  }) => { success: boolean; message: string; visit?: DoctorVisit };
  dischargePatient: (
    patientId: string,
    data: { dischargeNotes: string; destination: string; verifiedFeverFreeDays: number }
  ) => { success: boolean; message: string };
  recordPatientOutcome: (patientId: string, outcome: PatientOutcome) => { success: boolean; message: string };
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  advanceSimulatedDate: (days?: number) => void;
  resetDemoData: () => void;
  dismissNotification: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Active metrics helpers
  activePatients: Patient[];
  occupiedBedsCount: number;
  availableBedsCount: number;
}

const CareTrackContext = createContext<CareTrackContextType | undefined>(undefined);

export const CareTrackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_patients`);
      return saved ? JSON.parse(saved) : INITIAL_PATIENTS;
    } catch {
      return INITIAL_PATIENTS;
    }
  });

  const [temperatures, setTemperatures] = useState<TemperatureMeasurement[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_temperatures`);
      return saved ? JSON.parse(saved) : INITIAL_TEMPERATURES;
    } catch {
      return INITIAL_TEMPERATURES;
    }
  });

  const [visits, setVisits] = useState<DoctorVisit[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_visits`);
      return saved ? JSON.parse(saved) : INITIAL_VISITS;
    } catch {
      return INITIAL_VISITS;
    }
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_settings`);
      return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  const [currentRole, setCurrentRole] = useState<UserRole>('nurse');

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'NOTIF-1',
      title: 'Shift Handover Brief Ready',
      message: 'Morning operations check: 4 patients awaiting temperature logs.',
      time: '08:00 AM',
      type: 'info',
      read: false,
    },
    {
      id: 'NOTIF-2',
      title: 'High Pyrexia Alert',
      message: 'Robert Tanaka (Ward A - Bed 03) recorded 39.6°C. High alert flagged.',
      time: '07:45 AM',
      type: 'urgent',
      patientId: 'CT-2026-003',
      read: false,
    },
    {
      id: 'NOTIF-3',
      title: 'Discharge Candidate',
      message: 'David Alvarez (Ward A - Bed 01) has completed 3 full fever-free days.',
      time: '08:15 AM',
      type: 'success',
      patientId: 'CT-2026-001',
      read: false,
    },
  ]);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_patients`, JSON.stringify(patients));
      localStorage.setItem(`${STORAGE_KEY}_temperatures`, JSON.stringify(temperatures));
      localStorage.setItem(`${STORAGE_KEY}_visits`, JSON.stringify(visits));
      localStorage.setItem(`${STORAGE_KEY}_settings`, JSON.stringify(settings));
    } catch (e) {
      console.warn('Could not persist state to localStorage:', e);
    }
  }, [patients, temperatures, visits, settings]);

  const activePatients = patients.filter(p => p.status === 'active' || p.status === 'discharge_ready');
  const occupiedBedsCount = activePatients.length;
  const availableBedsCount = Math.max(0, settings.maxCapacity - occupiedBedsCount);

  const addNotification = (item: Omit<NotificationItem, 'id' | 'time' | 'read'>) => {
    const newNotif: NotificationItem = {
      ...item,
      id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };
    setNotifications(prev => [newNotif, ...prev.slice(0, 19)]);
  };

  const admitPatient = (patientData: {
    name: string;
    age: number;
    gender: 'Female' | 'Male' | 'Other';
    roomBed: string;
    admissionDate: string;
    symptoms: string[];
    notes?: string;
  }) => {
    // Enforce 74 patient capacity limit
    if (occupiedBedsCount >= settings.maxCapacity) {
      return {
        success: false,
        message: `Admission blocked: Quarantine facility has reached maximum capacity (${settings.maxCapacity}/${settings.maxCapacity} beds occupied). A bed must be freed via discharge or transfer before admitting a new patient.`,
      };
    }

    // Check if bed is already assigned to another active patient
    const bedTaken = activePatients.some(
      p => p.roomBed.toLowerCase().trim() === patientData.roomBed.toLowerCase().trim()
    );
    if (bedTaken) {
      return {
        success: false,
        message: `Bed conflict: "${patientData.roomBed}" is currently occupied. Please select an available bed.`,
      };
    }

    // Generate unique ID
    const maxNum = patients.reduce((max, p) => {
      const match = p.id.match(/CT-\d{4}-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    const newId = `CT-2026-${String(maxNum + 1).padStart(3, '0')}`;

    const newPatient: Patient = {
      ...patientData,
      id: newId,
      status: 'active',
    };

    setPatients(prev => [newPatient, ...prev]);

    addNotification({
      title: 'New Patient Admitted',
      message: `${newPatient.name} assigned to ${newPatient.roomBed}. ID: ${newPatient.id}`,
      type: 'info',
      patientId: newPatient.id,
    });

    return {
      success: true,
      message: `Patient ${newPatient.name} successfully admitted to ${newPatient.roomBed}.`,
      patient: newPatient,
    };
  };

  const recordTemperature = (data: {
    patientId: string;
    celsius: number;
    recordedAt?: string;
    duplicateReason?: string;
    notes?: string;
  }) => {
    const patient = patients.find(p => p.id === data.patientId);
    if (!patient) {
      return { success: false, message: 'Patient not found' };
    }

    const recordedDate = settings.currentSimulatedDate;
    const recordedAt = data.recordedAt || new Date().toISOString();

    // Check if reading exists for today
    const existingToday = temperatures.filter(
      t => t.patientId === data.patientId && t.recordedDate === recordedDate
    );

    const isDuplicate = existingToday.length > 0;
    if (isDuplicate && !data.duplicateReason?.trim()) {
      return {
        success: false,
        message: 'A temperature measurement has already been recorded for this patient today. To record an additional reading, an explicit clinical reason must be provided.',
      };
    }

    const isFever = data.celsius >= settings.feverThresholdCelsius;
    const isHighAlert = data.celsius >= 39.5;

    const newRecord: TemperatureMeasurement = {
      id: `TEMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      patientId: data.patientId,
      celsius: Number(data.celsius.toFixed(1)),
      recordedAt,
      recordedDate,
      recordedBy: PROFILES[currentRole].name,
      isFever,
      isHighAlert,
      isDuplicateOverride: isDuplicate,
      duplicateReason: isDuplicate ? data.duplicateReason : undefined,
      notes: data.notes,
    };

    // Never overwrite; append record
    setTemperatures(prev => [...prev, newRecord]);

    if (isHighAlert) {
      addNotification({
        title: 'High Pyrexia Alert Flagged',
        message: `${patient.name} (${patient.roomBed}) recorded concerning pyrexia: ${data.celsius.toFixed(1)}°C.`,
        type: 'urgent',
        patientId: patient.id,
      });
    } else {
      addNotification({
        title: 'Temperature Logged',
        message: `Logged ${data.celsius.toFixed(1)}°C for ${patient.name}.`,
        type: 'info',
        patientId: patient.id,
      });
    }

    return {
      success: true,
      message: `Recorded ${data.celsius.toFixed(1)}°C for ${patient.name}.${isDuplicate ? ' (Additional reading preserved)' : ''}`,
      record: newRecord,
    };
  };

  const recordDoctorVisit = (data: {
    patientId: string;
    visitedAt?: string;
    notes: string;
    followUpFlag: boolean;
    followUpReason?: string;
    isExceptionalPreTemp?: boolean;
    recommendDischarge?: boolean;
  }) => {
    const patient = patients.find(p => p.id === data.patientId);
    if (!patient) {
      return { success: false, message: 'Patient not found' };
    }

    const visitedDate = settings.currentSimulatedDate;
    const visitedAt = data.visitedAt || new Date().toISOString();

    const newVisit: DoctorVisit = {
      id: `VIS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      patientId: data.patientId,
      visitedAt,
      visitedDate,
      visitedBy: PROFILES[currentRole].name,
      notes: data.notes,
      followUpFlag: data.followUpFlag,
      followUpReason: data.followUpReason,
      isExceptionalPreTemp: !!data.isExceptionalPreTemp,
      recommendDischarge: !!data.recommendDischarge,
    };

    setVisits(prev => [...prev, newVisit]);

    addNotification({
      title: 'Doctor Round Documented',
      message: `Dr. visit recorded for ${patient.name} (${patient.roomBed}).`,
      type: data.followUpFlag ? 'warning' : 'info',
      patientId: patient.id,
    });

    return {
      success: true,
      message: `Doctor round completed for ${patient.name}.`,
      visit: newVisit,
    };
  };

  const dischargePatient = (
    patientId: string,
    data: { dischargeNotes: string; destination: string; verifiedFeverFreeDays: number }
  ) => {
    // Enforce role authorization
    if (currentRole !== 'admin') {
      return {
        success: false,
        message: 'Discharge authorization denied: Only an authorized Hospital Administrator can execute patient discharge.',
      };
    }

    const patient = patients.find(p => p.id === patientId);
    if (!patient) {
      return { success: false, message: 'Patient not found' };
    }

    const dischargeRecord: DischargeRecord = {
      id: `DISC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      patientId,
      dischargedAt: new Date().toISOString(),
      dischargedDate: settings.currentSimulatedDate,
      dischargedBy: PROFILES[currentRole].name,
      authorizedRole: currentRole,
      verifiedFeverFreeDays: data.verifiedFeverFreeDays,
      dischargeNotes: data.dischargeNotes,
      destination: data.destination,
    };

    const outcome: PatientOutcome = {
      patientId,
      outcomeDate: settings.currentSimulatedDate,
      outcomeType: 'recovered',
      recordedBy: PROFILES[currentRole].name,
      notes: data.dischargeNotes,
    };

    setPatients(prev =>
      prev.map(p => {
        if (p.id === patientId) {
          return {
            ...p,
            status: 'discharged',
            dischargeRecord,
            outcome,
          };
        }
        return p;
      })
    );

    addNotification({
      title: 'Patient Discharged',
      message: `${patient.name} discharged to ${data.destination}. Bed ${patient.roomBed} is now freed.`,
      type: 'success',
      patientId: patient.id,
    });

    return {
      success: true,
      message: `Patient ${patient.name} discharged successfully. Bed ${patient.roomBed} is now available for new admissions.`,
    };
  };

  const recordPatientOutcome = (patientId: string, outcome: PatientOutcome) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) {
      return { success: false, message: 'Patient not found' };
    }

    const newStatus: Patient['status'] = outcome.outcomeType === 'deceased' ? 'deceased' : 'discharged';

    setPatients(prev =>
      prev.map(p => {
        if (p.id === patientId) {
          return {
            ...p,
            status: newStatus,
            outcome,
          };
        }
        return p;
      })
    );

    addNotification({
      title: outcome.outcomeType === 'deceased' ? 'Outcome: Patient Deceased' : 'Outcome Documented',
      message: `${patient.name} outcome recorded: ${outcome.outcomeType}. Bed ${patient.roomBed} freed.`,
      type: outcome.outcomeType === 'deceased' ? 'urgent' : 'info',
      patientId: patient.id,
    });

    return {
      success: true,
      message: `Outcome recorded for ${patient.name}. Bed freed and epidemiological record preserved.`,
    };
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    addNotification({
      title: 'Facility Settings Updated',
      message: 'CareTrack operational settings modified.',
      type: 'info',
    });
  };

  const advanceSimulatedDate = (days: number = 1) => {
    const newDate = addDays(settings.currentSimulatedDate, days);
    setSettings(prev => ({
      ...prev,
      currentSimulatedDate: newDate,
    }));
    addNotification({
      title: 'Hospital Date Advanced',
      message: `System operational date moved to ${newDate} (+${days} day).`,
      type: 'info',
    });
  };

  const resetDemoData = () => {
    setPatients(INITIAL_PATIENTS);
    setTemperatures(INITIAL_TEMPERATURES);
    setVisits(INITIAL_VISITS);
    setSettings(INITIAL_SETTINGS);
    setCurrentRole('nurse');
    localStorage.removeItem(`${STORAGE_KEY}_patients`);
    localStorage.removeItem(`${STORAGE_KEY}_temperatures`);
    localStorage.removeItem(`${STORAGE_KEY}_visits`);
    localStorage.removeItem(`${STORAGE_KEY}_settings`);
    addNotification({
      title: 'System Reset Complete',
      message: 'CareTrack database re-initialized with standard demonstration cohort.',
      type: 'info',
    });
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <CareTrackContext.Provider
      value={{
        patients,
        temperatures,
        visits,
        settings,
        currentRole,
        currentProfile: PROFILES[currentRole],
        notifications,
        setRole: setCurrentRole,
        admitPatient,
        recordTemperature,
        recordDoctorVisit,
        dischargePatient,
        recordPatientOutcome,
        updateSettings,
        advanceSimulatedDate,
        resetDemoData,
        dismissNotification,
        markAllNotificationsRead,
        activePatients,
        occupiedBedsCount,
        availableBedsCount,
      }}
    >
      {children}
    </CareTrackContext.Provider>
  );
};

export const useCareTrack = () => {
  const context = useContext(CareTrackContext);
  if (!context) {
    throw new Error('useCareTrack must be used within a CareTrackProvider');
  }
  return context;
};
