import React, { useState, useMemo } from 'react';
import { useCareTrack } from '../../context/CareTrackContext';
import { calculateFeverFreeEligibility, formatReadableDate, formatReadableTime } from '../../utils/feverCalculation';
import {
  Stethoscope,
  Search,
  AlertTriangle,
  CheckCircle2,
  Flag,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface RoundsViewProps {
  onSelectPatient: (patientId: string) => void;
  selectedPatientIdForVisit: string | null;
  onClearSelectedPatient: () => void;
}

export const RoundsView: React.FC<RoundsViewProps> = ({
  onSelectPatient,
  selectedPatientIdForVisit,
  onClearSelectedPatient,
}) => {
  const {
    patients,
    temperatures,
    visits,
    settings,
    currentProfile,
    recordDoctorVisit,
  } = useCareTrack();

  const today = settings.currentSimulatedDate;
  const activePatients = patients.filter(p => p.status === 'active' || p.status === 'discharge_ready');

  // Queue tab filter
  const [queueTab, setQueueTab] = useState<
    'ready' | 'pending_temp' | 'pending_visit' | 'completed' | 'flagged'
  >('ready');

  const [searchQuery, setSearchQuery] = useState('');

  // Visit Documentation Modal State
  const [activeModalPatientId, setActiveModalPatientId] = useState<string | null>(
    selectedPatientIdForVisit
  );
  const [visitNotes, setVisitNotes] = useState('');
  const [followUpFlag, setFollowUpFlag] = useState(false);
  const [followUpReason, setFollowUpReason] = useState('');
  const [recommendDischarge, setRecommendDischarge] = useState(false);
  const [allowExceptionPreTemp, setAllowExceptionPreTemp] = useState(false);
  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  React.useEffect(() => {
    if (selectedPatientIdForVisit) {
      setActiveModalPatientId(selectedPatientIdForVisit);
    }
  }, [selectedPatientIdForVisit]);

  const modalPatient = patients.find(p => p.id === activeModalPatientId);

  // Check today's temperature status for modal patient
  const modalPatientTodayTemps = useMemo(() => {
    if (!activeModalPatientId) return [];
    return temperatures.filter(
      t => t.patientId === activeModalPatientId && t.recordedDate === today
    );
  }, [temperatures, activeModalPatientId, today]);

  const hasTempToday = modalPatientTodayTemps.length > 0;

  // Queues:
  // 1. Ready for doctor review (Temp recorded today, but visit pending)
  const readyQueue = activePatients.filter(p => {
    const hasTemp = temperatures.some(t => t.patientId === p.id && t.recordedDate === today);
    const hasVisit = visits.some(v => v.patientId === p.id && v.visitedDate === today);
    return hasTemp && !hasVisit;
  });

  // 2. Temperature not yet recorded (Nurse pending)
  const tempNotRecordedQueue = activePatients.filter(
    p => !temperatures.some(t => t.patientId === p.id && t.recordedDate === today)
  );

  // 3. Doctor visit pending (All needing visit today, regardless of temp)
  const allVisitPendingQueue = activePatients.filter(
    p => !visits.some(v => v.patientId === p.id && v.visitedDate === today)
  );

  // 4. Visit completed today
  const completedQueue = activePatients.filter(p =>
    visits.some(v => v.patientId === p.id && v.visitedDate === today)
  );

  // 5. Patients requiring follow-up (flagged in recent visit)
  const flaggedQueue = activePatients.filter(p => {
    const pVisits = visits.filter(v => v.patientId === p.id);
    return pVisits.some(v => v.followUpFlag);
  });

  const displayedQueue = useMemo(() => {
    let list: typeof activePatients = [];
    if (queueTab === 'ready') list = readyQueue;
    else if (queueTab === 'pending_temp') list = tempNotRecordedQueue;
    else if (queueTab === 'pending_visit') list = allVisitPendingQueue;
    else if (queueTab === 'completed') list = completedQueue;
    else if (queueTab === 'flagged') list = flaggedQueue;

    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.roomBed.toLowerCase().includes(q)
    );
  }, [
    queueTab,
    readyQueue,
    tempNotRecordedQueue,
    allVisitPendingQueue,
    completedQueue,
    flaggedQueue,
    searchQuery,
  ]);

  const handleOpenVisitModal = (patientId: string) => {
    setActiveModalPatientId(patientId);
    setVisitNotes('');
    setFollowUpFlag(false);
    setFollowUpReason('');
    setRecommendDischarge(false);
    setAllowExceptionPreTemp(false);
    setFormError('');
  };

  const handleCloseModal = () => {
    setActiveModalPatientId(null);
    onClearSelectedPatient();
  };

  const handleSaveVisit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!activeModalPatientId) return;

    if (!visitNotes.trim()) {
      setFormError('Please enter clinical progress notes for this round.');
      return;
    }

    if (!hasTempToday && !allowExceptionPreTemp) {
      setFormError(
        'Workflow guard: Mandatory daily temperature measurement has not been recorded for today. You must either wait for nurse measurement, or check "Document as exceptional visit before temperature".'
      );
      return;
    }

    if (followUpFlag && !followUpReason.trim()) {
      setFormError('Please provide a specific clinical follow-up reason or action plan.');
      return;
    }

    const res = recordDoctorVisit({
      patientId: activeModalPatientId,
      notes: visitNotes.trim(),
      followUpFlag,
      followUpReason: followUpFlag ? followUpReason.trim() : undefined,
      isExceptionalPreTemp: !hasTempToday && allowExceptionPreTemp,
      recommendDischarge,
    });

    if (!res.success) {
      setFormError(res.message);
    } else {
      setSuccessToast(res.message);
      setTimeout(() => setSuccessToast(''), 3500);
      handleCloseModal();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Physician Rounds & Clinical Oversight
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
              {allVisitPendingQueue.length} Rounds Pending
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Standard clinical workflow: Patient temperature should be recorded prior to completing daily doctor visits.
          </p>
        </div>

        {/* Discharge candidate count prompt */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Physicians can recommend candidates for Admin discharge sign-off</span>
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

      {/* Queues Navigation Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search queue by patient name, ID, or bed..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setQueueTab('ready')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                queueTab === 'ready'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Ready for Review ({readyQueue.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setQueueTab('pending_temp')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                queueTab === 'pending_temp'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Temp Not Recorded ({tempNotRecordedQueue.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setQueueTab('flagged')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                queueTab === 'flagged'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Flagged Follow-ups ({flaggedQueue.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setQueueTab('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                queueTab === 'completed'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completed ({completedQueue.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Patient Cards in Active Queue */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedQueue.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 text-sky-500 mx-auto mb-2" />
            No patients currently in this queue.
          </div>
        ) : (
          displayedQueue.map(patient => {
            const patientTemps = temperatures
              .filter(t => t.patientId === patient.id)
              .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
            const latestTemp = patientTemps[0];
            const hasTempToday = patientTemps.some(t => t.recordedDate === today);

            const patientVisits = visits.filter(v => v.patientId === patient.id);
            const hasVisitToday = patientVisits.some(v => v.visitedDate === today);
            const latestVisit = patientVisits[patientVisits.length - 1];

            const calc = calculateFeverFreeEligibility(
              patient,
              temperatures,
              today,
              settings.feverThresholdCelsius
            );

            return (
              <div
                key={patient.id}
                className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-slate-900">{patient.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">({patient.id})</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded mt-1 inline-block">
                        {patient.roomBed}
                      </span>
                    </div>

                    {hasVisitToday ? (
                      <Badge variant="success" size="sm">
                        Visited
                      </Badge>
                    ) : (
                      <Badge variant="info" size="sm">
                        Visit Due
                      </Badge>
                    )}
                  </div>

                  {/* Temperature Snapshot */}
                  <div className="my-3 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Today's Temperature:</span>
                      {hasTempToday ? (
                        <span
                          className={`font-mono font-bold text-sm ${
                            latestTemp.isHighAlert
                              ? 'text-rose-600'
                              : latestTemp.isFever
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {latestTemp.celsius.toFixed(1)}°C
                        </span>
                      ) : (
                        <span className="text-amber-700 font-semibold italic flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Pending Nurse Log
                        </span>
                      )}
                    </div>

                    {/* Fever-free duration */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                      <span>Fever-free progress:</span>
                      <strong className="text-slate-800">
                        {calc.consecutiveDays} full day(s)
                      </strong>
                    </div>

                    {latestVisit?.followUpFlag && (
                      <div className="text-[11px] text-rose-800 bg-rose-50 p-2 rounded-lg border border-rose-200 mt-2">
                        <span className="font-bold block">Follow-Up Flag:</span>
                        {latestVisit.followUpReason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectPatient(patient.id)}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                  >
                    Patient Chart
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenVisitModal(patient.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 ${
                      hasVisitToday
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        : 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/20'
                    }`}
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>{hasVisitToday ? 'Add Progress Note' : 'Conduct Round'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Doctor Visit Documentation Modal */}
      {modalPatient && (
        <Modal
          isOpen={!!activeModalPatientId}
          onClose={handleCloseModal}
          title={`Document Physician Round — ${modalPatient.name}`}
          subtitle={`${modalPatient.roomBed} • Patient ID: ${modalPatient.id}`}
          maxWidth="lg"
        >
          <form onSubmit={handleSaveVisit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Workflow Rule Guard: Temp Check */}
            {!hasTempToday ? (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Mandatory Workflow Notice: Temperature Not Recorded Today</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  CareTrack requires a daily temperature measurement before physician rounds can be marked normally complete.
                  You may return to the pending queue to allow nursing staff to record vitals, OR document this round as an exceptional pre-measurement visit.
                </p>

                <label className="flex items-start gap-2 pt-1 font-semibold text-amber-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowExceptionPreTemp}
                    onChange={e => setAllowExceptionPreTemp(e.target.checked)}
                    className="mt-0.5 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                  />
                  <span>
                    Document as exceptional visit before temperature (Preserves exception flag without falsely marking regular workflow complete).
                  </span>
                </label>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    Today's Temperature Logged: <strong>{modalPatientTodayTemps[0].celsius}°C</strong> by {modalPatientTodayTemps[0].recordedBy}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-emerald-700">
                  {formatReadableTime(modalPatientTodayTemps[0].recordedAt)}
                </span>
              </div>
            )}

            {/* Clinical Progress Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Clinical Examination & Progress Notes *
              </label>
              <textarea
                rows={4}
                required
                value={visitNotes}
                onChange={e => setVisitNotes(e.target.value)}
                placeholder="Document respiratory effort, breath sounds, hydration, response to symptomatic care, and clinical trajectory..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            {/* Follow-up Flag Checkbox */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={followUpFlag}
                  onChange={e => setFollowUpFlag(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5 text-amber-600" /> Flag Patient For Clinical Follow-Up
                </span>
              </label>

              {followUpFlag && (
                <div>
                  <input
                    type="text"
                    required
                    value={followUpReason}
                    onChange={e => setFollowUpReason(e.target.value)}
                    placeholder="Specify action plan (e.g. repeat chest auscultation this evening, check O2 saturation)..."
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Recommend for Discharge Checkbox */}
            <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl">
              <label className="flex items-center gap-2 text-xs font-bold text-emerald-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recommendDischarge}
                  onChange={e => setRecommendDischarge(e.target.checked)}
                  className="rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Physician Recommends Discharge Clearance Review
                </span>
              </label>
              <p className="text-[10px] text-emerald-700 mt-1 pl-5">
                Note: Final discharge execution is performed by an authorized Administrator in accordance with institutional policy.
              </p>
            </div>

            {/* Audit Metadata */}
            <div className="p-3 rounded-xl bg-slate-100 text-slate-600 text-[11px] space-y-0.5">
              <div>
                <strong>Attending Physician:</strong> {currentProfile.name} ({currentProfile.badgeId})
              </div>
              <div>
                <strong>Timestamp:</strong> {formatReadableDate(today)} • {new Date().toLocaleTimeString()}
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                Save Doctor Round
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
