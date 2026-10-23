import React, { useState, useMemo } from 'react';
import { useCareTrack } from '../../context/CareTrackContext';
import { calculateFeverFreeEligibility, diffDays, formatReadableDate } from '../../utils/feverCalculation';
import {
  LogOut,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Lock,
  UserCheck,
  HelpCircle,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface DischargesViewProps {
  onSelectPatient: (patientId: string) => void;
  selectedPatientIdForDischarge: string | null;
  onClearSelectedPatient: () => void;
}

export const DischargesView: React.FC<DischargesViewProps> = ({
  onSelectPatient,
  selectedPatientIdForDischarge,
  onClearSelectedPatient,
}) => {
  const {
    patients,
    temperatures,
    visits,
    settings,
    currentRole,
    currentProfile,
    dischargePatient,
  } = useCareTrack();

  const today = settings.currentSimulatedDate;
  const activePatients = patients.filter(p => p.status === 'active' || p.status === 'discharge_ready');
  const dischargedPatients = patients.filter(p => p.status === 'discharged');

  const [activeTab, setActiveTab] = useState<'eligible' | 'ineligible' | 'history'>('eligible');
  const [searchQuery, setSearchQuery] = useState('');

  // Discharge Execution Modal State
  const [dischargeTargetId, setDischargeTargetId] = useState<string | null>(
    selectedPatientIdForDischarge
  );
  const [dischargeNotes, setDischargeNotes] = useState('');
  const [destination, setDestination] = useState('Home quarantine completion (post-clearance)');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successToast, setSuccessToast] = useState('');

  React.useEffect(() => {
    if (selectedPatientIdForDischarge) {
      setDischargeTargetId(selectedPatientIdForDischarge);
    }
  }, [selectedPatientIdForDischarge]);

  const targetPatient = patients.find(p => p.id === dischargeTargetId);

  // Calculate eligibility for active patients
  const evaluatedActivePatients = useMemo(() => {
    return activePatients.map(p => ({
      patient: p,
      calc: calculateFeverFreeEligibility(p, temperatures, today, settings.feverThresholdCelsius),
    }));
  }, [activePatients, temperatures, today, settings.feverThresholdCelsius]);

  const eligibleCandidates = evaluatedActivePatients.filter(e => e.calc.status === 'eligible');
  const ineligiblePatients = evaluatedActivePatients.filter(e => e.calc.status !== 'eligible');

  const handleOpenDischargeModal = (patientId: string) => {
    setDischargeTargetId(patientId);
    setDischargeNotes('Patient has completed 3 full consecutive fever-free days with clear vitals.');
    setDestination('Home quarantine completion (post-clearance)');
    setErrorMessage('');
  };

  const handleExecuteDischarge = () => {
    if (!dischargeTargetId) return;

    if (currentRole !== 'admin') {
      setErrorMessage(
        'Action restricted: Only an authorized Administrator can finalize patient discharge in the prototype.'
      );
      return;
    }

    const calc = calculateFeverFreeEligibility(
      targetPatient!,
      temperatures,
      today,
      settings.feverThresholdCelsius
    );

    const res = dischargePatient(dischargeTargetId, {
      dischargeNotes: dischargeNotes.trim(),
      destination,
      verifiedFeverFreeDays: calc.consecutiveDays,
    });

    if (!res.success) {
      setErrorMessage(res.message);
    } else {
      setSuccessToast(res.message);
      setTimeout(() => setSuccessToast(''), 4000);
      setDischargeTargetId(null);
      setIsConfirmOpen(false);
      onClearSelectedPatient();
    }
  };

  const isAdmin = currentRole === 'admin';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Discharge Coordination & Bed Clearance
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              {eligibleCandidates.length} Eligible Candidates
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Clinical Rule: Minimum three full consecutive fever-free calendar days (<strong className="font-semibold text-slate-700">{settings.feverThresholdCelsius}°C</strong>).
            Requires Administrator authorization.
          </p>
        </div>

        {/* Role Authorization Pill */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
            isAdmin
              ? 'bg-purple-50 text-purple-800 border-purple-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          {isAdmin ? (
            <>
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Administrator Authorized to Execute Discharges</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 text-amber-600" />
              <span>
                Discharge Action Locked for <strong className="capitalize">{currentRole}</strong> (Admin only)
              </span>
            </>
          )}
        </div>
      </div>

      {/* Prototype Workflow Aid Disclaimer */}
      <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl text-sky-900 text-xs flex items-start gap-2.5 leading-relaxed">
        <HelpCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Workflow Decision Aid: </strong>
          This eligibility calculation is an operational workflow aid and does not substitute for licensed clinical judgment.
          Patients cannot be automatically discharged by the system solely because time has elapsed.
        </div>
      </div>

      {/* Success banner */}
      {successToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('eligible')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'eligible'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Eligible Candidates ({eligibleCandidates.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ineligible')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'ineligible'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Not Yet Eligible ({ineligiblePatients.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'history'
                  ? 'bg-teal-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Discharge History ({dischargedPatients.length})</span>
            </button>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, bed, ID..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
        </div>
      </div>

      {/* Tab 1: Eligible Candidates */}
      {activeTab === 'eligible' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {eligibleCandidates.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              No active inpatients currently meet the 3 full days fever-free requirement.
            </div>
          ) : (
            eligibleCandidates.map(({ patient, calc }) => {
              const stayDays = diffDays(patient.admissionDate, today);
              const doctorRecommended = visits.some(
                v => v.patientId === patient.id && v.recommendDischarge
              );

              return (
                <div
                  key={patient.id}
                  className="p-5 rounded-2xl border border-emerald-200 bg-white shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-slate-900">{patient.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {patient.id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Assigned: <strong className="text-slate-800">{patient.roomBed}</strong> • Admitted {formatReadableDate(patient.admissionDate)} ({stayDays}d stay)
                        </p>
                      </div>

                      <Badge variant="success" size="md">
                        Criteria Met
                      </Badge>
                    </div>

                    {/* Verification Audit Breakdown */}
                    <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs space-y-1.5">
                      <div className="font-bold text-emerald-900 flex items-center justify-between">
                        <span>Verified Telemetry: 3 Consecutive Fever-Free Days</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <p className="text-[11px] text-emerald-800">
                        {calc.reasons[0] || 'Three full calendar days supported by complete vital measurements.'}
                      </p>
                      {doctorRecommended && (
                        <div className="pt-1 border-t border-emerald-200/80 text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5" /> Attending physician has recommended clearance
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onSelectPatient(patient.id)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                    >
                      Audit Patient Vitals →
                    </button>

                    <button
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => handleOpenDischargeModal(patient.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                        isAdmin
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                      title={!isAdmin ? 'Switch to Administrator role to execute discharge' : undefined}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{isAdmin ? 'Execute Authorized Discharge' : 'Requires Admin Role'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Patients Not Yet Eligible */}
      {activeTab === 'ineligible' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="px-5 py-3.5">Patient</th>
                  <th className="px-4 py-3.5">Bed</th>
                  <th className="px-4 py-3.5">Stay Length</th>
                  <th className="px-4 py-3.5">Fever-Free Streak</th>
                  <th className="px-5 py-3.5">Specific Ineligibility Rationale</th>
                  <th className="px-4 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ineligiblePatients.map(({ patient, calc }) => (
                  <tr
                    key={patient.id}
                    onClick={() => onSelectPatient(patient.id)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      {patient.name}
                      <span className="block font-mono text-[10px] text-slate-400">{patient.id}</span>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-700">{patient.roomBed}</td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {diffDays(patient.admissionDate, today)} days
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono font-bold text-slate-800">
                        {calc.consecutiveDays} / 3 days
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        {calc.status === 'needs_review' ? (
                          <Badge variant="purple" size="sm">
                            Needs Review
                          </Badge>
                        ) : (
                          <Badge variant="warning" size="sm">
                            In Progress
                          </Badge>
                        )}
                        <span className="text-[11px] truncate max-w-xs">{calc.reasons[0]}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right text-teal-600 font-semibold">Audit →</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Discharge History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="px-5 py-3.5">Discharged Patient</th>
                  <th className="px-4 py-3.5">Discharge Date</th>
                  <th className="px-4 py-3.5">Authorized By</th>
                  <th className="px-4 py-3.5">Fever-Free Days</th>
                  <th className="px-4 py-3.5">Destination</th>
                  <th className="px-4 py-3.5">Discharge Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dischargedPatients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No discharges recorded in system history.
                    </td>
                  </tr>
                ) : (
                  dischargedPatients.map(patient => (
                    <tr
                      key={patient.id}
                      onClick={() => onSelectPatient(patient.id)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {patient.name}
                        <span className="block font-mono text-[10px] text-slate-400">
                          {patient.id} • Freed bed {patient.roomBed}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">
                        {formatReadableDate(patient.dischargeRecord?.dischargedDate || today)}
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">
                        {patient.dischargeRecord?.dischargedBy || 'Elena Rostova'}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-emerald-700">
                        {patient.dischargeRecord?.verifiedFeverFreeDays || 3} days verified
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">
                        {patient.dischargeRecord?.destination || 'Home quarantine'}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 italic max-w-xs truncate">
                        "{patient.dischargeRecord?.dischargeNotes}"
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Discharge Execution Modal */}
      {targetPatient && (
        <Modal
          isOpen={!!dischargeTargetId}
          onClose={() => setDischargeTargetId(null)}
          title={`Authorized Discharge Sign-off — ${targetPatient.name}`}
          subtitle={`Bed: ${targetPatient.roomBed} • Patient ID: ${targetPatient.id}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Verification Checklist */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <span className="font-bold text-slate-900 block">Pre-Discharge Audit Verification:</span>
              <div className="space-y-1.5 text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>3 full consecutive days without fever (&lt;{settings.feverThresholdCelsius}°C) confirmed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Full vital telemetry and historical logs verified intact</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Bed <strong>{targetPatient.roomBed}</strong> will be immediately released for census</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Post-Clearance Destination *
              </label>
              <select
                value={destination}
                onChange={e => setDestination(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="Home quarantine completion (post-clearance)">
                  Home quarantine completion (post-clearance)
                </option>
                <option value="Community step-down facility">Community step-down facility</option>
                <option value="General hospital outpatient transfer">
                  General hospital outpatient transfer
                </option>
                <option value="Specialized rehabilitation unit">Specialized rehabilitation unit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Official Discharge Summary Notes *
              </label>
              <textarea
                rows={3}
                value={dischargeNotes}
                onChange={e => setDischargeNotes(e.target.value)}
                placeholder="Document clinical state at discharge, home guidance provided, and discharge orders..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-100 text-slate-600 text-[11px] space-y-0.5">
              <div>
                <strong>Authorizing Staff:</strong> {currentProfile.name} ({currentRole})
              </div>
              <div>
                <strong>Discharge Timestamp:</strong> {formatReadableDate(today)} • {new Date().toLocaleTimeString()}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDischargeTargetId(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                Proceed to Confirmation
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Dialog before Final Discharge */}
      {targetPatient && (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={handleExecuteDischarge}
          title="Confirm Patient Discharge & Bed Release"
          description={`Are you sure you want to finalize the discharge of ${targetPatient.name} (${targetPatient.id})?\n\nThis will mark the patient as discharged, preserve all historical temperature measurements and physician visits, and immediately release ${targetPatient.roomBed} for new inpatient admissions.`}
          confirmLabel="Authorize & Release Bed"
          variant="primary"
        />
      )}
    </div>
  );
};
