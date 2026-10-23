import type { FeverFreeCalculation, Patient, TemperatureMeasurement } from '../types';

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Add days to a YYYY-MM-DD string
 */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

/**
 * Difference in days between two YYYY-MM-DD strings (date2 - date1)
 */
export function diffDays(date1Str: string, date2Str: string): number {
  const [y1, m1, d1] = date1Str.split('-').map(Number);
  const [y2, m2, d2] = date2Str.split('-').map(Number);
  const date1 = new Date(y1, m1 - 1, d1);
  const date2 = new Date(y2, m2 - 1, d2);
  const diffTime = date2.getTime() - date1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format readable date: "Oct 24, 2026"
 */
export function formatReadableDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format readable time from ISO string: "14:30"
 */
export function formatReadableTime(isoStr: string): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return isoStr;
  }
}

/**
 * Evaluates 3 full days fever-free criterion.
 * Rule:
 * 1. Must have 3 completed calendar days with verified temperature readings.
 * 2. Every reading on those days must be < feverThresholdCelsius.
 * 3. Missing records do NOT count as fever-free.
 * 4. Incomplete data flags "Needs Review".
 */
export function calculateFeverFreeEligibility(
  patient: Patient,
  allMeasurements: TemperatureMeasurement[],
  currentDateStr: string,
  feverThreshold: number
): FeverFreeCalculation {
  const requiredDays = 3;
  const patientMeasurements = allMeasurements.filter(m => m.patientId === patient.id);

  // Group measurements by date (YYYY-MM-DD)
  const measurementsByDate = new Map<string, TemperatureMeasurement[]>();
  patientMeasurements.forEach(m => {
    const list = measurementsByDate.get(m.recordedDate) || [];
    list.push(m);
    measurementsByDate.set(m.recordedDate, list);
  });

  // Collect the history of days up to current date
  const totalDaysStay = diffDays(patient.admissionDate, currentDateStr);
  const reasons: string[] = [];

  // If patient was admitted today or yesterday, they cannot have 3 full completed days yet
  if (totalDaysStay < 3) {
    reasons.push(`Inpatient for ${totalDaysStay} day(s); minimum 3 full completed days required.`);
  }

  // We look back over the preceding full completed days (excluding today which is partial, unless today has readings and we check the 3-day window)
  // Let's inspect the last 3 completed full calendar days: D-3, D-2, D-1
  const dayDetails: FeverFreeCalculation['dayDetails'] = [];
  
  // Look at up to 7 recent days up to today
  const daysToCheck = Math.max(totalDaysStay + 1, 4);
  const checkDates: string[] = [];
  
  for (let i = daysToCheck - 1; i >= 0; i--) {
    const dStr = addDays(currentDateStr, -i);
    // Only check from admission date onwards
    if (diffDays(patient.admissionDate, dStr) >= 0) {
      checkDates.push(dStr);
    }
  }

  let consecutiveFeverFreeDays = 0;

  for (const dateStr of checkDates) {
    const dayRecords = measurementsByDate.get(dateStr) || [];
    const isToday = dateStr === currentDateStr;

    if (dayRecords.length === 0) {
      dayDetails.push({
        date: dateStr,
        hasRecord: false,
        maxCelsius: null,
        isFever: false,
        status: isToday ? 'partial_pending' : 'no_record',
      });

      if (!isToday) {
        // Missing record breaks the confirmed fever-free streak!
        consecutiveFeverFreeDays = 0;
      }
    } else {
      const maxC = Math.max(...dayRecords.map(r => r.celsius));
      const isFever = maxC >= feverThreshold;

      dayDetails.push({
        date: dateStr,
        hasRecord: true,
        maxCelsius: maxC,
        isFever: isFever,
        status: isFever ? 'fever_detected' : 'fever_free',
      });

      if (isFever) {
        consecutiveFeverFreeDays = 0;
      } else {
        // Only full completed calendar days count towards the 3 FULL days
        // Today is partial unless already verified fever-free, but clinical protocol requires full 24h cycles.
        // If yesterday, D-2, D-3 were fever-free, that is 3 full days.
        if (!isToday) {
          consecutiveFeverFreeDays += 1;
        }
      }
    }
  }

  // Now evaluate the 3 completed days prior to today (e.g. yesterday, D-2, D-3)
  const dMinus1 = addDays(currentDateStr, -1);
  const dMinus2 = addDays(currentDateStr, -2);
  const dMinus3 = addDays(currentDateStr, -3);

  const pastThreeDays = [dMinus3, dMinus2, dMinus1];
  let eligibleThreeDays = true;
  let missingDaysCount = 0;
  let feverSpikeDates: string[] = [];

  for (const d of pastThreeDays) {
    if (diffDays(patient.admissionDate, d) < 0) {
      eligibleThreeDays = false;
      continue;
    }
    const records = measurementsByDate.get(d) || [];
    if (records.length === 0) {
      eligibleThreeDays = false;
      missingDaysCount++;
    } else {
      const maxC = Math.max(...records.map(r => r.celsius));
      if (maxC >= feverThreshold) {
        eligibleThreeDays = false;
        feverSpikeDates.push(`${d} (${maxC.toFixed(1)}°C)`);
      }
    }
  }

  let status: 'eligible' | 'ineligible' | 'needs_review' = 'ineligible';

  if (eligibleThreeDays && consecutiveFeverFreeDays >= 3) {
    status = 'eligible';
    reasons.push(`Verified 3 consecutive full calendar days with no temperature reading ≥ ${feverThreshold.toFixed(1)}°C.`);
  } else {
    if (missingDaysCount > 0) {
      status = 'needs_review';
      reasons.push(`Incomplete documentation: ${missingDaysCount} day(s) missing mandatory temperature measurements.`);
    }
    if (feverSpikeDates.length > 0) {
      reasons.push(`Elevated temperature detected: ${feverSpikeDates.join(', ')}.`);
    }
    if (consecutiveFeverFreeDays < 3 && missingDaysCount === 0 && feverSpikeDates.length === 0) {
      reasons.push(`Currently at ${consecutiveFeverFreeDays} of 3 full fever-free days.`);
    }
  }

  return {
    status,
    consecutiveDays: consecutiveFeverFreeDays,
    requiredDays,
    reasons,
    dayDetails,
  };
}
