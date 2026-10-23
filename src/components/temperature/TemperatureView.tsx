import React, { useState, useMemo } from 'react';
import { useCareTrack } from '../../context/CareTrackContext';
import { formatReadableDate, formatReadableTime } from '../../utils/feverCalculation';
import {
  Thermometer,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  Info,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface TemperatureViewProps {
  onSelectPatient: (patientId: string) => void;
  selectedPatientIdForTemp: string | null;
  onClearSelectedPatient: () => void;
}

export const TemperatureView: React.FC<TemperatureViewProps> = ({
  onSelectPatient,
  selectedPatientIdForTemp,
  onClearSelectedPatient,
}) => {
  const {
    patients,
    temperatures,
    settings,
    currentRole,
    currentProfile,
    recordTemperature,
  } = useCareTrack();

  const today = settings.currentSimulatedDate;
  const activePatients = patients.filter(p => p.status === 'active' || p.status === 'discharge_ready');

  // Search & tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [tabFilter, setTabFilter] = useState<'pending' | 'completed' | 'all'>('pending');

  // Record Temperature Modal State
  const [activeModalPatientId, setActiveModalPatientId] = useState<string | null>(
    selectedPatientIdForTemp
  );
  const [tempInput, setTempInput] = useState<string>('37.0');
  const [tempNotes, setTempNotes] = useState<string>('');
  const [duplicateReason, setDuplicateReason] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string>('');

  // Handle external selection prop
  React.useEffect(() => {
    if (selectedPatientIdForTemp) {
      setActiveModalPatientId(selectedPatientIdForTemp);
    }
  }, [selectedPatientIdForTemp]);

  const modalPatient = patients.find(p => p.id === activeModalPatientId);

  // Measurements recorded today for active modal patient
  const modalPatientTodayTemps = useMemo(() => {
    if (!activeModalPatientId) return [];
    return temperatures.filter(
      t => t.patientId === activeModalPatientId && t.recordedDate === today
    );
  }, [temperatures, activeModalPatientId, today]);

  const isDuplicateToday = modalPatientTodayTemps.length > 0;

  // Filter lists
  const pendingPatients = activePatients.filter(
    p => !temperatures.some(t => t.patientId === p.id && t.recordedDate === today)
  );
  const completedPatients = activePatients.filter(p =>
    temperatures.some(t => t.patientId === p.id && t.recordedDate === today)
  );

  const displayedPatients = useMemo(() => {
    const list =
      tabFilter === 'pending'
        ? pendingPatients
        : tabFilter === 'completed'
        ? completedPatients
        : activePatients;

    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.roomBed.toLowerCase().includes(q)
    );
  }, [tabFilter, pendingPatients, completedPatients, activePatients, searchQuery]);

  const handleOpenModal = (patientId: string) => {
    setActiveModalPatientId(patientId);
    setTempInput('37.0');
    setTempNotes('');
    setDuplicateReason('');
    setFormError('');
  };

  const handleCloseModal = () => {
    setActiveModalPatientId(null);
    onClearSelectedPatient();
  };

  const handleSaveTemperature = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!activeModalPatientId) return;

    const numericVal = parseFloat(tempInput);
    if (isNaN(numericVal)) {
      setFormError('Please enter a valid numeric temperature.');
      return;
    }

    if (numericVal < 32.0 || numericVal > 44.0) {
      setFormError('Measurement out of physiological range (32.0°C – 44.0°C). Please verify reading.');
      return;
    }

    if (isDuplicateToday && !duplicateReason.trim()) {
      setFormError('A reading already exists for this patient today. To prevent accidental duplicates, you must provide an explicit clinical reason (e.g. post-antipyretic re-check, patient shivering).');
      return;
    }

    const res = recordTemperature({
      patientId: activeModalPatientId,
      celsius: numericVal,
      duplicateReason: isDuplicateToday ? duplicateReason.trim() : undefined,
      notes: tempNotes.trim() || undefined,
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Nurse Station — Daily Temperature Tracking
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
              {pendingPatients.length} Pending Today
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Mandatory daily Celsius measurements for all inpatients. Accidental duplicates protected with mandatory override justification.
          </p>
        </div>

        {/* Threshold Assumption Notice */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600">
          <Info className="w-4 h-4 text-slate-400" />
          <span>Fever Threshold: <strong className="text-slate-800">{settings.feverThresholdCelsius}°C</strong></span>
          <span className="text-[10px] bg-slate-200 text-slate-600 px-1 rounded font-mono">
            {settings.feverThresholdIsAssumption ? 'ASSUMPTION' : 'CLINICAL'}
          </span>
        </div>
      </div>

      {/* Success Banner if toast active */}
      {successToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900 animate-in fade-in">
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

      {/* Search & Tabs Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter by patient name, ID, or bed..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setTabFilter('pending')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                tabFilter === 'pending'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Awaiting Measurement ({pendingPatients.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setTabFilter('completed')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                tabFilter === 'completed'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Logged Today ({completedPatients.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setTabFilter('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tabFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Inpatients ({activePatients.length})
            </button>
          </div>
        </div>
      </div>

      {/* Patient Queue Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedPatients.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            {tabFilter === 'pending'
              ? 'Great job! All active inpatients have received their required daily temperature reading today.'
              : 'No patient records found matching current query.'}
          </div>
        ) : (
          displayedPatients.map(patient => {
            const todayLogs = temperatures.filter(
              t => t.patientId === patient.id && t.recordedDate === today
            );
            const isLogged = todayLogs.length > 0;
            const latestLog = todayLogs[todayLogs.length - 1];

            return (
              <div
                key={patient.id}
                className={`p-5 rounded-2xl border bg-white shadow-2xs hover:shadow-md transition-all flex flex-col justify-between ${
                  isLogged ? 'border-emerald-200/80' : 'border-amber-200/90'
                }`}
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

                    {isLogged ? (
                      <Badge variant="success" size="sm">
                        Logged
                      </Badge>
                    ) : (
                      <Badge variant="warning" size="sm">
                        Due Today
                      </Badge>
                    )}
                  </div>

                  {/* Today Reading Status */}
                  <div className="my-3 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Today's Reading:</span>
                      {isLogged ? (
                        <span
                          className={`font-mono font-bold text-sm ${
                            latestLog.isHighAlert
                              ? 'text-rose-600'
                              : latestLog.isFever
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {latestLog.celsius.toFixed(1)}°C
                        </span>
                      ) : (
                        <span className="text-amber-700 font-semibold italic">Not Recorded</span>
                      )}
                    </div>

                    {isLogged && (
                      <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                        <span>By {latestLog.recordedBy}</span>
                        <span>{formatReadableTime(latestLog.recordedAt)}</span>
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
                    View History
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenModal(patient.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 ${
                      isLogged
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20'
                    }`}
                  >
                    <Thermometer className="w-3.5 h-3.5" />
                    <span>{isLogged ? 'Add Re-check' : 'Record Temp'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Record Temperature Modal */}
      {modalPatient && (
        <Modal
          isOpen={!!activeModalPatientId}
          onClose={handleCloseModal}
          title={`Record Temperature — ${modalPatient.name}`}
          subtitle={`${modalPatient.roomBed} • Patient ID: ${modalPatient.id}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveTemperature} className="space-y-4">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Accidental Duplicate Warning Banner */}
            {isDuplicateToday && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>Existing Measurement Detected For Today ({modalPatientTodayTemps[0].celsius}°C)</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  CareTrack prevents accidental overwrites. Both measurements will be preserved in the audit log.
                  To record an additional measurement, an explicit clinical rationale is required below.
                </p>
              </div>
            )}

            {/* Temperature Celsius Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Body Temperature (°C) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="32.0"
                  max="44.0"
                  required
                  value={tempInput}
                  onChange={e => setTempInput(e.target.value)}
                  className="w-full text-2xl font-mono font-bold px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">
                  °C
                </span>
              </div>

              {/* Dynamic Range Pill */}
              <div className="flex items-center justify-between text-[11px] mt-1.5">
                <span className="text-slate-400">Normal Range: 36.1°C – 37.2°C</span>
                {parseFloat(tempInput) >= 39.5 ? (
                  <span className="text-rose-600 font-bold flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5" /> High Pyrexia Alert Flag
                  </span>
                ) : parseFloat(tempInput) >= settings.feverThresholdCelsius ? (
                  <span className="text-amber-600 font-bold">
                    Fever Detected (≥{settings.feverThresholdCelsius}°C)
                  </span>
                ) : (
                  <span className="text-emerald-600 font-semibold">Within Normal Range</span>
                )}
              </div>
            </div>

            {/* Mandatory Duplicate Reason (if second reading) */}
            {isDuplicateToday && (
              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">
                  Clinical Reason for Second Reading *
                </label>
                <select
                  value={duplicateReason}
                  onChange={e => setDuplicateReason(e.target.value)}
                  className="w-full px-3 py-2 bg-amber-50 border border-amber-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 mb-2"
                >
                  <option value="">Select clinical reason...</option>
                  <option value="Post-antipyretic medication re-check">
                    Post-antipyretic medication re-check (1-2hr post dose)
                  </option>
                  <option value="Patient shivering / sudden temperature spike observed">
                    Patient shivering / sudden temperature spike observed
                  </option>
                  <option value="Device validation / re-calibration measurement">
                    Device validation / re-calibration measurement
                  </option>
                  <option value="Shift handover physician request">
                    Shift handover physician request
                  </option>
                  <option value="Other clinical rationale">Other clinical rationale</option>
                </select>

                {duplicateReason === 'Other clinical rationale' && (
                  <input
                    type="text"
                    required
                    placeholder="Specify other reason..."
                    onChange={e => setDuplicateReason(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs text-slate-900"
                  />
                )}
              </div>
            )}

            {/* Clinical Observations */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nurse Observations (Optional)
              </label>
              <textarea
                rows={2}
                value={tempNotes}
                onChange={e => setTempNotes(e.target.value)}
                placeholder="e.g. Patient diaphoretic, oral fluids encouraged."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            {/* Audit Metadata */}
            <div className="p-3 rounded-xl bg-slate-100 text-slate-600 text-[11px] space-y-0.5">
              <div>
                <strong>Recorded By:</strong> {currentProfile.name} ({currentRole})
              </div>
              <div>
                <strong>Date & Time:</strong> {formatReadableDate(today)} • {new Date().toLocaleTimeString()}
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
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                Save Reading
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
