import React, { useState } from 'react';
import { useCareTrack } from '../../context/CareTrackContext';
import { calculateFeverFreeEligibility, diffDays, formatReadableDate, formatReadableTime } from '../../utils/feverCalculation';
import {
  X,
  Thermometer,
  Stethoscope,
  Calendar,
  Bed,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from '../common/Badge';

interface PatientDetailsDrawerProps {
  patientId: string | null;
  onClose: () => void;
  onOpenRecordTemp: (patientId: string) => void;
  onOpenDoctorVisit: (patientId: string) => void;
  onOpenDischarge: (patientId: string) => void;
}

export const PatientDetailsDrawer: React.FC<PatientDetailsDrawerProps> = ({
  patientId,
  onClose,
  onOpenRecordTemp,
  onOpenDoctorVisit,
  onOpenDischarge,
}) => {
  const { patients, temperatures, visits, settings, currentRole } = useCareTrack();
  const [activeTab, setActiveTab] = useState<'overview' | 'temperatures' | 'visits' | 'eligibility'>('overview');

  if (!patientId) return null;

  const patient = patients.find(p => p.id === patientId);
  if (!patient) return null;

  const today = settings.currentSimulatedDate;
  const patientTemps = temperatures
    .filter(t => t.patientId === patient.id)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

  const patientVisits = visits
    .filter(v => v.patientId === patient.id)
    .sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime());

  const hasTempToday = patientTemps.some(t => t.recordedDate === today);
  const hasVisitToday = patientVisits.some(v => v.visitedDate === today);

  const eligibility = calculateFeverFreeEligibility(
    patient,
    temperatures,
    today,
    settings.feverThresholdCelsius
  );

  const lengthOfStay = diffDays(
    patient.admissionDate,
    patient.dischargeRecord?.dischargedDate || patient.outcome?.outcomeDate || today
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">{patient.name}</h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                  {patient.id}
                </span>
                <Badge
                  variant={
                    patient.status === 'discharged'
                      ? 'neutral'
                      : patient.status === 'deceased'
                      ? 'danger'
                      : eligibility.status === 'eligible'
                      ? 'success'
                      : 'info'
                  }
                  size="sm"
                >
                  {patient.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2 font-medium">
                <span className="flex items-center gap-1">
                  <Bed className="w-3.5 h-3.5 text-teal-600" /> {patient.roomBed}
                </span>
                <span>
                  {patient.age} yrs • {patient.gender}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Admitted:{' '}
                  {formatReadableDate(patient.admissionDate)} ({lengthOfStay} days stay)
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Today's Dual Workflow Status Pill */}
          <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/60">
            <div
              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                hasTempToday
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Thermometer className="w-4 h-4" /> Today's Temp:
              </span>
              <span>
                {hasTempToday
                  ? `${patientTemps.find(t => t.recordedDate === today)?.celsius.toFixed(1)}°C (Logged)`
                  : 'Pending'}
              </span>
            </div>

            <div
              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                hasVisitToday
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-sky-50 text-sky-800 border-sky-200'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4" /> Doctor Round:
              </span>
              <span>{hasVisitToday ? 'Completed' : 'Pending'}</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mt-4 border-b border-slate-200">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'temperatures', label: `Temperatures (${patientTemps.length})` },
              { id: 'visits', label: `Doctor Visits (${patientVisits.length})` },
              { id: 'eligibility', label: '3-Day Fever Audit' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition-all -mb-px ${
                  activeTab === tab.id
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Discharge Eligibility Summary */}
              <div
                className={`p-4 rounded-2xl border ${
                  eligibility.status === 'eligible'
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : eligibility.status === 'needs_review'
                    ? 'bg-indigo-50/70 border-indigo-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Discharge Criterion Evaluation
                  </span>
                  <Badge
                    variant={
                      eligibility.status === 'eligible'
                        ? 'success'
                        : eligibility.status === 'needs_review'
                        ? 'purple'
                        : 'warning'
                    }
                  >
                    {eligibility.status === 'eligible'
                      ? 'Criteria Met (3 Full Days)'
                      : eligibility.status === 'needs_review'
                      ? 'Documentation Needs Review'
                      : 'Ineligible'}
                  </Badge>
                </div>
                <ul className="text-xs text-slate-600 space-y-1 mt-2">
                  {eligibility.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-teal-600 font-bold">•</span> {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Symptoms & Notes */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide block">
                  Admission Notes & Symptoms
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {patient.symptoms.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-medium"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                {patient.notes && (
                  <p className="text-xs text-slate-600 italic bg-white p-3 rounded-xl border border-slate-200">
                    "{patient.notes}"
                  </p>
                )}
              </div>

              {/* Preserved Discharge / Outcome Details if closed */}
              {patient.dischargeRecord && (
                <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase">
                    <CheckCircle2 className="w-4 h-4" /> Official Discharge Record
                  </div>
                  <div className="text-xs text-slate-700 space-y-1">
                    <p>
                      <strong>Discharged:</strong> {formatReadableDate(patient.dischargeRecord.dischargedDate)} by{' '}
                      {patient.dischargeRecord.dischargedBy} ({patient.dischargeRecord.authorizedRole})
                    </p>
                    <p>
                      <strong>Verified Fever-Free Days:</strong>{' '}
                      {patient.dischargeRecord.verifiedFeverFreeDays} days
                    </p>
                    <p>
                      <strong>Destination:</strong> {patient.dischargeRecord.destination}
                    </p>
                    <p className="italic text-slate-600">
                      "{patient.dischargeRecord.dischargeNotes}"
                    </p>
                  </div>
                </div>
              )}

              {patient.outcome && patient.status === 'deceased' && (
                <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/50 space-y-2">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase">
                    <AlertTriangle className="w-4 h-4" /> Mortality Outcome Record
                  </div>
                  <div className="text-xs text-slate-700 space-y-1">
                    <p>
                      <strong>Recorded Date:</strong> {formatReadableDate(patient.outcome.outcomeDate)}
                    </p>
                    <p>
                      <strong>Cause:</strong> {patient.outcome.causeOfDeath || 'Not specified'}
                    </p>
                    <p>
                      <strong>Certified by:</strong> {patient.outcome.recordedBy}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'temperatures' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Temperature Measurement Log
                </span>
                {patient.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => onOpenRecordTemp(patient.id)}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold"
                  >
                    + Record Reading
                  </button>
                )}
              </div>

              {patientTemps.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  No temperature records logged yet.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {patientTemps.map(t => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-bold text-slate-900">
                            {t.celsius.toFixed(1)}°C
                          </span>
                          {t.isHighAlert ? (
                            <Badge variant="danger" size="sm">
                              High Alert ≥39.5°C
                            </Badge>
                          ) : t.isFever ? (
                            <Badge variant="warning" size="sm">
                              Fever (≥{settings.feverThresholdCelsius}°C)
                            </Badge>
                          ) : (
                            <Badge variant="success" size="sm">
                              Normal
                            </Badge>
                          )}
                          {t.isDuplicateOverride && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                              Re-check
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatReadableDate(t.recordedDate)} at {formatReadableTime(t.recordedAt)} • Logged by{' '}
                          {t.recordedBy}
                        </p>
                        {t.duplicateReason && (
                          <p className="text-xs text-amber-700 mt-1 font-medium bg-amber-50/70 p-2 rounded-lg border border-amber-200">
                            <strong>Reason:</strong> {t.duplicateReason}
                          </p>
                        )}
                        {t.notes && (
                          <p className="text-xs text-slate-600 mt-1 italic">"{t.notes}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'visits' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Doctor Rounds History
                </span>
                {patient.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => onOpenDoctorVisit(patient.id)}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold"
                  >
                    + Document Round
                  </button>
                )}
              </div>

              {patientVisits.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  No doctor rounds recorded for this patient.
                </p>
              ) : (
                <div className="space-y-3">
                  {patientVisits.map(v => (
                    <div
                      key={v.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{v.visitedBy}</span>
                          <span className="text-xs text-slate-400">
                            {formatReadableDate(v.visitedDate)} at {formatReadableTime(v.visitedAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {v.followUpFlag && (
                            <Badge variant="warning" size="sm">
                              Follow-Up Flag
                            </Badge>
                          )}
                          {v.recommendDischarge && (
                            <Badge variant="success" size="sm">
                              Discharge Recommended
                            </Badge>
                          )}
                          {v.isExceptionalPreTemp && (
                            <Badge variant="danger" size="sm">
                              Exceptional Visit (Pre-Temp)
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-100">
                        {v.notes}
                      </p>

                      {v.followUpReason && (
                        <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                          <strong>Action Plan:</strong> {v.followUpReason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'eligibility' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide block mb-1">
                  Transparent 3-Day Fever-Free Calculation Rule
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Assessment standard: 3 full consecutive calendar days without fever (<strong className="font-semibold">{settings.feverThresholdCelsius}°C</strong>).
                  Missing records are never treated as fever-free. Today is considered partial until completed.
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700">Daily Telemetry Audit:</span>
                {eligibility.dayDetails.map((day, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      day.status === 'fever_free'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : day.status === 'fever_detected'
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : day.status === 'no_record'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div>
                      <span className="font-bold">{formatReadableDate(day.date)}</span>
                      {day.date === today && (
                        <span className="ml-2 text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                          TODAY (PARTIAL)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {day.hasRecord ? (
                        <span className="font-mono font-bold">
                          Max: {day.maxCelsius?.toFixed(1)}°C
                        </span>
                      ) : (
                        <span className="text-amber-700 font-semibold italic">No Record</span>
                      )}

                      <Badge
                        variant={
                          day.status === 'fever_free'
                            ? 'success'
                            : day.status === 'fever_detected'
                            ? 'danger'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {day.status === 'fever_free'
                          ? 'Fever-Free (Verified)'
                          : day.status === 'fever_detected'
                          ? 'Fever Detected'
                          : day.status === 'no_record'
                          ? 'Missing Record'
                          : 'In Progress'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions based on Role */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Active Role: <strong className="capitalize text-slate-900">{currentRole}</strong>
          </div>

          <div className="flex items-center gap-2">
            {patient.status === 'active' && (
              <>
                <button
                  type="button"
                  onClick={() => onOpenRecordTemp(patient.id)}
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Log Temp
                </button>
                <button
                  type="button"
                  onClick={() => onOpenDoctorVisit(patient.id)}
                  className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Doctor Round
                </button>
                {eligibility.status === 'eligible' && (
                  <button
                    type="button"
                    onClick={() => onOpenDischarge(patient.id)}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    Discharge Review
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
