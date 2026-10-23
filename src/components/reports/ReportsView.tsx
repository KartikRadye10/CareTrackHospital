import React, { useState, useMemo } from 'react';
import { useCareTrack } from '../../context/CareTrackContext';
import { diffDays, formatReadableDate } from '../../utils/feverCalculation';
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  PlusCircle,
} from 'lucide-react';
import { Modal } from '../common/Modal';


export const ReportsView: React.FC = () => {
  const { patients, temperatures, visits, settings, currentRole, recordPatientOutcome } =
    useCareTrack();

  const today = settings.currentSimulatedDate;

  // Date range filter
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | '7days' | '14days' | '30days'>('all');

  // Record Outcome Modal (for testing epidemiology logs)
  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);
  const [outcomePatientId, setOutcomePatientId] = useState('');
  const [outcomeType, setOutcomeType] = useState<'deceased' | 'transferred' | 'unknown'>('deceased');
  const [causeOfDeath, setCauseOfDeath] = useState('Acute respiratory distress syndrome');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [outcomeSuccessToast, setOutcomeSuccessToast] = useState('');

  // Active inpatients list for outcome modal
  const activeInpatients = patients.filter(
    p => p.status === 'active' || p.status === 'discharge_ready'
  );

  // Filter cohort based on date range
  const filteredPatients = useMemo(() => {
    if (dateRangeFilter === 'all') return patients;
    const days = dateRangeFilter === '7days' ? 7 : dateRangeFilter === '14days' ? 14 : 30;
    return patients.filter(p => diffDays(p.admissionDate, today) <= days);
  }, [patients, dateRangeFilter, today]);

  // Cohort breakdown
  const cohortAdmissions = filteredPatients.length;
  const cohortActive = filteredPatients.filter(
    p => p.status === 'active' || p.status === 'discharge_ready'
  ).length;

  const cohortDischarges = filteredPatients.filter(p => p.status === 'discharged').length;

  const cohortDeaths = filteredPatients.filter(
    p => p.status === 'deceased' || p.outcome?.outcomeType === 'deceased'
  ).length;

  const cohortUnknown = filteredPatients.filter(
    p => p.outcome?.outcomeType === 'unknown'
  ).length;

  // Closed outcomes = Discharged (Recovered) + Deceased + Transferred + Unknown
  const totalClosedOutcomes = cohortDischarges + cohortDeaths + cohortUnknown;

  // Rigorous epidemiological mortality rate calculation:
  // Deaths among defined cohort / Total closed outcomes in that cohort * 100
  const observedMortalityRate =
    totalClosedOutcomes > 0
      ? Number(((cohortDeaths / totalClosedOutcomes) * 100).toFixed(1))
      : 0;

  const observedSurvivalRate =
    totalClosedOutcomes > 0
      ? Number(((cohortDischarges / totalClosedOutcomes) * 100).toFixed(1))
      : 100;

  // Length of Stay (LOS) Calculation:
  // Defined as days between admission and resolution (discharge/outcome), or current date for active
  const lengthsOfStay = useMemo(() => {
    return filteredPatients.map(p => {
      const endDate = p.dischargeRecord?.dischargedDate || p.outcome?.outcomeDate || today;
      return Math.max(1, diffDays(p.admissionDate, endDate));
    });
  }, [filteredPatients, today]);

  const avgLengthOfStay = useMemo(() => {
    if (lengthsOfStay.length === 0) return 0;
    const sum = lengthsOfStay.reduce((a, b) => a + b, 0);
    return (sum / lengthsOfStay.length).toFixed(1);
  }, [lengthsOfStay]);

  const medianLengthOfStay = useMemo(() => {
    if (lengthsOfStay.length === 0) return 0;
    const sorted = [...lengthsOfStay].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : ((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1);
  }, [lengthsOfStay]);

  // Dual compliance for today among active patients
  const activeNow = patients.filter(p => p.status === 'active' || p.status === 'discharge_ready');
  const tempComplianceCount = activeNow.filter(p =>
    temperatures.some(t => t.patientId === p.id && t.recordedDate === today)
  ).length;
  const tempCompliancePercent =
    activeNow.length > 0 ? Math.round((tempComplianceCount / activeNow.length) * 100) : 100;

  const visitComplianceCount = activeNow.filter(p =>
    visits.some(v => v.patientId === p.id && v.visitedDate === today)
  ).length;
  const visitCompliancePercent =
    activeNow.length > 0 ? Math.round((visitComplianceCount / activeNow.length) * 100) : 100;

  // Handle outcome submission
  const handleRecordOutcome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcomePatientId) return;

    const res = recordPatientOutcome(outcomePatientId, {
      patientId: outcomePatientId,
      outcomeDate: today,
      outcomeType,
      causeOfDeath: outcomeType === 'deceased' ? causeOfDeath : undefined,
      recordedBy: currentRole === 'doctor' ? 'Dr. Marcus Vance, MD' : 'Admin Elena Rostova',
      notes: outcomeNotes,
    });

    if (res.success) {
      setOutcomeSuccessToast(res.message);
      setTimeout(() => setOutcomeSuccessToast(''), 4000);
      setIsOutcomeModalOpen(false);
      setOutcomePatientId('');
    }
  };

  const isHighMortality = observedMortalityRate > settings.expectedMortalityBenchmark;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Clinical Reports & Epidemiological Outcomes
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
              Benchmark: 15% Mortality / 85% Survival
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Standardized outcome evaluation: Closed cohort outcomes analysis, dual daily compliance, and length of stay (LOS).
          </p>
        </div>

        {/* Date Filter & Record Outcome Action */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2" />
            <select
              value={dateRangeFilter}
              onChange={e => setDateRangeFilter(e.target.value as any)}
              className="bg-transparent px-2 py-1 text-xs text-slate-700 font-medium focus:outline-none"
            >
              <option value="all">All Cohort Inpatients</option>
              <option value="7days">Admitted Last 7 Days</option>
              <option value="14days">Admitted Last 14 Days</option>
              <option value="30days">Admitted Last 30 Days</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setOutcomePatientId(activeInpatients[0]?.id || '');
              setIsOutcomeModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5 text-teal-400" />
            <span>Record Outcome</span>
          </button>
        </div>
      </div>

      {outcomeSuccessToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{outcomeSuccessToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setOutcomeSuccessToast('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Cohort Definition Banner */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Defined Analytical Cohort
          </span>
          <span className="text-xs text-slate-500 font-mono">
            Reporting Date: {formatReadableDate(today)}
          </span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          <strong>Epidemiological Methodology: </strong>
          Mortality rate is calculated strictly as{' '}
          <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono font-semibold">
            Deaths in Cohort / Total Closed Outcomes × 100
          </code>
          . It is never calculated by dividing deaths by active inpatients alone, which would produce a statistically distorted rate.
        </p>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">Total Admissions</span>
          <span className="text-2xl font-black text-slate-900">{cohortAdmissions}</span>
          <span className="text-[11px] text-slate-400 block mt-1">In selected cohort</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">Active Inpatients</span>
          <span className="text-2xl font-black text-teal-700">{cohortActive}</span>
          <span className="text-[11px] text-slate-400 block mt-1">Under ongoing care</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">Discharges (Recovered)</span>
          <span className="text-2xl font-black text-emerald-700">{cohortDischarges}</span>
          <span className="text-[11px] text-emerald-600 block mt-1">Fever-free resolved</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">Recorded Deaths</span>
          <span className="text-2xl font-black text-rose-700">{cohortDeaths}</span>
          <span className="text-[11px] text-rose-500 block mt-1">Mortality outcome</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">Avg Length of Stay</span>
          <span className="text-2xl font-black text-slate-900">{avgLengthOfStay}d</span>
          <span className="text-[11px] text-slate-400 block mt-1">Median: {medianLengthOfStay}d</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">Unknown Outcomes</span>
          <span className="text-2xl font-black text-slate-700">{cohortUnknown}</span>
          <span className="text-[11px] text-slate-400 block mt-1">Lost to follow-up</span>
        </div>
      </div>

      {/* Benchmark Comparison & Mortality Warning */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mortality & Survival Comparison against 15% / 85% Benchmark */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                Outcome Benchmark Comparison (15% Mortality Benchmark)
              </h2>
              <span className="text-xs font-mono text-slate-500">
                N = {totalClosedOutcomes} Closed Cases
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Assessment baseline sets an expected mortality of 15% and an 85% survival benchmark.
            </p>
          </div>

          {/* Visual SVG Comparison Bar */}
          <div className="space-y-4">
            {/* Survival */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700">Survival / Recovery Rate</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">Benchmark: 85.0%</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    Observed: {observedSurvivalRate}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden relative">
                {/* 85% Benchmark marker line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-900 z-10"
                  style={{ left: '85%' }}
                  title="85% Expected Benchmark"
                />
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, observedSurvivalRate)}%` }}
                />
              </div>
            </div>

            {/* Mortality */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700">Mortality Rate</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">Benchmark: 15.0%</span>
                  <span className="font-mono font-bold text-rose-700 text-sm">
                    Observed: {observedMortalityRate}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden relative">
                {/* 15% Benchmark marker line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-900 z-10"
                  style={{ left: '15%' }}
                  title="15% Expected Benchmark"
                />
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isHighMortality ? 'bg-rose-500' : 'bg-slate-700'
                  }`}
                  style={{ width: `${Math.min(100, observedMortalityRate)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Stat Warning / Context Banner if exceeds benchmark */}
          {isHighMortality ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Observed Mortality ({observedMortalityRate}%) Exceeds 15% Benchmark</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                <strong>Sample Size & Variance Notice: </strong>
                The current sample size of closed outcomes is small (N = {totalClosedOutcomes} patient outcomes).
                In low-sample cohorts (e.g. N &lt; 30), discrete outcomes produce high statistical fluctuation.
                A single complex comorbidity case meaningfully swings the observed percentage and must not be interpreted as definitive proof of systemic clinical quality degradation.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Observed outcomes currently meet or outperform the 85% survival / 15% mortality benchmark.
              </span>
            </div>
          )}
        </div>

        {/* Daily Compliance & Operations Audit */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Daily Dual Mandate Compliance ({formatReadableDate(today)})
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Verification of same-day temperature recording + physician rounds across active census.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700">Temperature Logging Compliance</span>
                <span className="font-mono text-slate-900">
                  {tempComplianceCount} / {activeNow.length} ({tempCompliancePercent}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full"
                  style={{ width: `${tempCompliancePercent}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700">Physician Rounds Compliance</span>
                <span className="font-mono text-slate-900">
                  {visitComplianceCount} / {activeNow.length} ({visitCompliancePercent}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-sky-500 h-full rounded-full"
                  style={{ width: `${visitCompliancePercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-600 space-y-1">
            <span className="font-bold text-slate-800 block">Length of Stay (LOS) Definition:</span>
            <p>
              Calculated as the number of days between the patient's admission date and final clinical resolution (or current operational date if still active). Median length of stay ({medianLengthOfStay} days) provides a robust measure less sensitive to outlier cases.
            </p>
          </div>
        </div>
      </div>

      {/* Record Outcome Modal */}
      <Modal
        isOpen={isOutcomeModalOpen}
        onClose={() => setIsOutcomeModalOpen(false)}
        title="Document Patient Clinical Outcome"
        subtitle="Epidemiological registry recording for closed cases"
        maxWidth="md"
      >
        <form onSubmit={handleRecordOutcome} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Inpatient *
            </label>
            <select
              required
              value={outcomePatientId}
              onChange={e => setOutcomePatientId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="">Select patient...</option>
              {activeInpatients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.roomBed}) — {p.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Outcome Type *</label>
            <select
              value={outcomeType}
              onChange={e => setOutcomeType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="deceased">Deceased (Epidemiological Mortality Record)</option>
              <option value="transferred">Transferred to Tertiary ICU</option>
              <option value="unknown">Unknown / Lost to Follow-up</option>
            </select>
          </div>

          {outcomeType === 'deceased' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Clinical Cause of Death *
              </label>
              <input
                type="text"
                required
                value={causeOfDeath}
                onChange={e => setCauseOfDeath(e.target.value)}
                placeholder="e.g. Acute respiratory distress syndrome secondary to viral pyrexia"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Clinical Registry Notes
            </label>
            <textarea
              rows={2}
              value={outcomeNotes}
              onChange={e => setOutcomeNotes(e.target.value)}
              placeholder="Case review details, next of kin notification..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsOutcomeModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              Record Final Outcome
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
