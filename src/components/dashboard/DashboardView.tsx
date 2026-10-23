import React from 'react';
import { useCareTrack } from '../../context/CareTrackContext';
import { calculateFeverFreeEligibility, formatReadableDate, formatReadableTime } from '../../utils/feverCalculation';
import type { NavTab } from '../common/Sidebar';
import {
  Users,
  Bed,
  Thermometer,
  Stethoscope,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Flame,
  ChevronRight,
  HeartPulse,
} from 'lucide-react';
import { Badge } from '../common/Badge';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
  onOpenHandover: () => void;
  onSelectPatient: (patientId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenHandover,
  onSelectPatient,
}) => {
  const { patients, temperatures, visits, settings, occupiedBedsCount } = useCareTrack();
  const today = settings.currentSimulatedDate;

  const activePatients = patients.filter(p => p.status === 'active' || p.status === 'discharge_ready');

  // Today's pending and completed counts
  const patientsWithTempToday = activePatients.filter(p =>
    temperatures.some(t => t.patientId === p.id && t.recordedDate === today)
  );
  const awaitingTempCount = activePatients.length - patientsWithTempToday.length;

  const patientsWithVisitToday = activePatients.filter(p =>
    visits.some(v => v.patientId === p.id && v.visitedDate === today)
  );
  const awaitingVisitCount = activePatients.length - patientsWithVisitToday.length;

  // Discharge candidates (3 full days fever-free)
  const dischargeCandidates = activePatients.filter(p => {
    const calc = calculateFeverFreeEligibility(p, temperatures, today, settings.feverThresholdCelsius);
    return calc.status === 'eligible';
  });

  // Recorded deaths in system
  const deceasedPatients = patients.filter(
    p => p.status === 'deceased' || p.outcome?.outcomeType === 'deceased'
  );

  // Completion percentages for today
  const tempCompletionPercent =
    activePatients.length > 0 ? Math.round((patientsWithTempToday.length / activePatients.length) * 100) : 100;
  const visitCompletionPercent =
    activePatients.length > 0 ? Math.round((patientsWithVisitToday.length / activePatients.length) * 100) : 100;

  // Patients requiring attention:
  // 1. High temperature reading today (>= 38.5 C or high alert)
  // 2. Doctor visit follow-up flagged
  // 3. Incomplete records (needs review)
  const attentionPatients = activePatients.filter(p => {
    const todayTemps = temperatures.filter(t => t.patientId === p.id && t.recordedDate === today);
    const hasHighTemp = todayTemps.some(t => t.celsius >= 38.5 || t.isHighAlert);
    const recentVisits = visits.filter(v => v.patientId === p.id);
    const hasFollowUp = recentVisits.some(v => v.followUpFlag);
    const calc = calculateFeverFreeEligibility(p, temperatures, today, settings.feverThresholdCelsius);
    const hasDataGap = calc.status === 'needs_review';
    return hasHighTemp || hasFollowUp || hasDataGap;
  });

  // Recent temperature logs (last 5)
  const recentTemperatures = [...temperatures]
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
    .slice(0, 5);

  // Pending Doctor Rounds queue (patients who have temperature recorded today, but no visit yet)
  const readyForRounds = activePatients.filter(p => {
    const hasTemp = temperatures.some(t => t.patientId === p.id && t.recordedDate === today);
    const hasVisit = visits.some(v => v.patientId === p.id && v.visitedDate === today);
    return hasTemp && !hasVisit;
  });

  // Outcome statistics for closed cases (Discharges + Deaths)
  const dischargedCount = patients.filter(p => p.status === 'discharged').length;
  const totalOutcomes = dischargedCount + deceasedPatients.length;
  const observedMortalityRate =
    totalOutcomes > 0 ? ((deceasedPatients.length / totalOutcomes) * 100).toFixed(1) : '0.0';
  const observedSurvivalRate =
    totalOutcomes > 0 ? ((dischargedCount / totalOutcomes) * 100).toFixed(1) : '100.0';

  return (
    <div className="space-y-6">
      {/* Top Welcome / Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-mono font-bold tracking-wide">
              LIVE CLINICAL OPERATIONS
            </span>
            <span className="text-slate-400 text-xs">• {formatReadableDate(today)}</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            CareTrack Command Center
          </h1>
          <p className="text-xs text-slate-300 max-w-xl">
            Coordinating daily temperature measurements, physician rounds, and 3-day fever-free discharge eligibility across 74 isolation beds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenHandover}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-600/30 transition-all active:scale-95 shrink-0"
          >
            <Sparkles className="w-4 h-4 text-teal-200" />
            <span>Generate Handover Brief</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Cards Grid (6 cards required) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Active Patients */}
        <div
          onClick={() => onNavigate('patients')}
          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Active Inpatients</span>
            <Users className="w-4 h-4 text-teal-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-slate-900">{occupiedBedsCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Currently isolated</p>
        </div>

        {/* Bed Occupancy / 74 */}
        <div
          onClick={() => onNavigate('patients')}
          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Bed Occupancy</span>
            <Bed className="w-4 h-4 text-sky-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {occupiedBedsCount} <span className="text-xs text-slate-400 font-normal">/ 74</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full ${
                occupiedBedsCount >= 74
                  ? 'bg-rose-500'
                  : occupiedBedsCount >= 60
                  ? 'bg-amber-400'
                  : 'bg-sky-500'
              }`}
              style={{ width: `${(occupiedBedsCount / 74) * 100}%` }}
            />
          </div>
        </div>

        {/* Awaiting Temperature Measurement */}
        <div
          onClick={() => onNavigate('temperature')}
          className={`p-4 rounded-2xl border shadow-2xs hover:shadow-md transition-all cursor-pointer group ${
            awaitingTempCount > 0
              ? 'bg-amber-50/60 border-amber-200 hover:border-amber-300'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Temps Awaiting</span>
            <Thermometer
              className={`w-4 h-4 ${
                awaitingTempCount > 0 ? 'text-amber-600' : 'text-slate-400'
              } group-hover:scale-110 transition-transform`}
            />
          </div>
          <div
            className={`text-2xl font-black ${
              awaitingTempCount > 0 ? 'text-amber-800' : 'text-slate-900'
            }`}
          >
            {awaitingTempCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Due today by nurses</p>
        </div>

        {/* Awaiting Doctor Visit */}
        <div
          onClick={() => onNavigate('rounds')}
          className={`p-4 rounded-2xl border shadow-2xs hover:shadow-md transition-all cursor-pointer group ${
            awaitingVisitCount > 0
              ? 'bg-sky-50/60 border-sky-200 hover:border-sky-300'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Visits Awaiting</span>
            <Stethoscope
              className={`w-4 h-4 ${
                awaitingVisitCount > 0 ? 'text-sky-600' : 'text-slate-400'
              } group-hover:scale-110 transition-transform`}
            />
          </div>
          <div
            className={`text-2xl font-black ${
              awaitingVisitCount > 0 ? 'text-sky-800' : 'text-slate-900'
            }`}
          >
            {awaitingVisitCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Doctor rounds pending</p>
        </div>

        {/* Discharge Criteria Met */}
        <div
          onClick={() => onNavigate('discharges')}
          className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 shadow-2xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-emerald-800 mb-2">
            <span className="text-xs font-semibold">Discharge Ready</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-emerald-800">
            {dischargeCandidates.length}
          </div>
          <p className="text-[11px] text-emerald-700 mt-1">3 full fever-free days</p>
        </div>

        {/* Recorded Deaths */}
        <div
          onClick={() => onNavigate('reports')}
          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Recorded Deaths</span>
            <HeartPulse className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {deceasedPatients.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Epidemiology cohort</p>
        </div>
      </div>

      {/* Daily Workflow Overview & Progress Bars */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Daily Facility Workflow Overview</h2>
            <p className="text-xs text-slate-500">
              Dual daily requirement: Mandatory temperature measurement + physician visit for every inpatient.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg self-start">
            Target: 100% daily compliance
          </span>
        </div>

        {/* Progress Bars for Both Mandates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Temperature Measurement Compliance */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Thermometer className="w-4 h-4 text-amber-500" /> Daily Temperature Logging
              </span>
              <span className="font-mono text-slate-900">
                {patientsWithTempToday.length} of {activePatients.length} ({tempCompletionPercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full transition-all duration-500 rounded-full"
                style={{ width: `${tempCompletionPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>{awaitingTempCount} patient(s) pending nurse measurement</span>
              <button
                type="button"
                onClick={() => onNavigate('temperature')}
                className="text-teal-600 hover:text-teal-700 font-semibold"
              >
                Open nurse queue →
              </button>
            </div>
          </div>

          {/* Doctor Rounds Compliance */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-sky-500" /> Daily Physician Rounds
              </span>
              <span className="font-mono text-slate-900">
                {patientsWithVisitToday.length} of {activePatients.length} ({visitCompletionPercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-sky-500 h-full transition-all duration-500 rounded-full"
                style={{ width: `${visitCompletionPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>{awaitingVisitCount} patient(s) pending doctor visit</span>
              <button
                type="button"
                onClick={() => onNavigate('rounds')}
                className="text-teal-600 hover:text-teal-700 font-semibold"
              >
                Open doctor queue →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Attention Required & Pending Rounds */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patients Requiring Attention */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-rose-50/40">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Patients Requiring Attention ({attentionPatients.length})
                </h3>
              </div>
              <span className="text-[11px] text-rose-700 font-medium">
                High pyrexia, physician flags, or data gaps
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {attentionPatients.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                  All active patients are clinically stable with complete documentation.
                </div>
              ) : (
                attentionPatients.map(p => {
                  const todayTemps = temperatures.filter(
                    t => t.patientId === p.id && t.recordedDate === today
                  );
                  const maxC =
                    todayTemps.length > 0 ? Math.max(...todayTemps.map(t => t.celsius)) : null;
                  const recentVisit = visits.find(v => v.patientId === p.id && v.followUpFlag);
                  const calc = calculateFeverFreeEligibility(
                    p,
                    temperatures,
                    today,
                    settings.feverThresholdCelsius
                  );

                  return (
                    <div
                      key={p.id}
                      onClick={() => onSelectPatient(p.id)}
                      className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4 cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-rose-100/70 text-rose-700 shrink-0 mt-0.5">
                          <Flame className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{p.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                              {p.roomBed}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">({p.id})</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            {maxC && maxC >= settings.feverThresholdCelsius && (
                              <Badge variant="danger" size="sm">
                                Pyrexia: {maxC.toFixed(1)}°C
                              </Badge>
                            )}
                            {recentVisit && (
                              <Badge variant="warning" size="sm">
                                Doctor Flag: {recentVisit.followUpReason || 'Follow-up requested'}
                              </Badge>
                            )}
                            {calc.status === 'needs_review' && (
                              <Badge variant="purple" size="sm">
                                Missing temperature record
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Upcoming or Pending Doctor Rounds */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Ready for Doctor Rounds ({readyForRounds.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('rounds')}
                className="text-xs text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1"
              >
                View all rounds <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {readyForRounds.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  {awaitingTempCount > 0
                    ? `No patients ready for rounds yet. ${awaitingTempCount} patient(s) await nurse temperature logging first.`
                    : 'All physician rounds have been completed for today.'}
                </div>
              ) : (
                readyForRounds.slice(0, 4).map(p => {
                  const todayTemp = temperatures.find(
                    t => t.patientId === p.id && t.recordedDate === today
                  );
                  return (
                    <div
                      key={p.id}
                      onClick={() => onSelectPatient(p.id)}
                      className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4 cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{p.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                            {p.roomBed}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Temp recorded: <strong className="text-slate-700">{todayTemp?.celsius}°C</strong> by {todayTemp?.recordedBy}
                        </p>
                      </div>

                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200">
                        Ready for review
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Discharge Candidates & Recent Measurements & Outcome Summary */}
        <div className="space-y-6">
          {/* Discharge Candidates Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-emerald-50/50">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Discharge Candidates ({dischargeCandidates.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('discharges')}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
              >
                Review <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {dischargeCandidates.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  No active patients currently meet the 3 full days fever-free requirement.
                </p>
              ) : (
                dischargeCandidates.map(p => (
                  <div
                    key={p.id}
                    onClick={() => onNavigate('discharges')}
                    className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{p.name}</span>
                      <Badge variant="success" size="sm">
                        3 Days Fever-Free
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Bed: {p.roomBed} • Admitted {formatReadableDate(p.admissionDate)}
                    </p>
                    <p className="text-[10px] text-emerald-700 font-medium mt-1">
                      Ready for Administrator authorized sign-off
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Temperature Measurements Feed */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">Recent Measurements</h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('temperature')}
                className="text-xs text-teal-600 hover:text-teal-700 font-semibold"
              >
                View all
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {recentTemperatures.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No temperature records logged.
                </div>
              ) : (
                recentTemperatures.map(m => {
                  const patient = patients.find(p => p.id === m.patientId);
                  return (
                    <div key={m.id} className="p-3.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-800">
                          {patient?.name || m.patientId}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {formatReadableTime(m.recordedAt)} • {m.recordedDate}
                        </span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-mono font-bold text-sm ${
                            m.isHighAlert
                              ? 'text-rose-600'
                              : m.isFever
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {m.celsius.toFixed(1)}°C
                        </span>
                        {m.isDuplicateOverride && (
                          <span className="block text-[9px] text-amber-600 font-medium">
                            re-check
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Mortality & Survival Benchmark Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Outcome Benchmarks</span>
              <button
                type="button"
                onClick={() => onNavigate('reports')}
                className="text-[11px] text-sky-600 hover:text-sky-700 font-semibold"
              >
                Detailed reports →
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Expected Survival Benchmark</span>
                <span className="font-mono font-bold text-emerald-600">
                  {settings.expectedSurvivalBenchmark}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Observed Cohort Survival</span>
                <span className="font-mono font-bold text-slate-900">
                  {observedSurvivalRate}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${Math.min(100, Number(observedSurvivalRate))}%` }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Expected Mortality: 15%</span>
              <span>Observed: {observedMortalityRate}%</span>
            </div>
            <p className="text-[10px] text-slate-400 italic">
              Derived from closed outcomes cohort ({totalOutcomes} patient cases).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
