import React, { useState, useMemo } from 'react';
import { useCareTrack } from '../../context/CareTrackContext';
import { calculateFeverFreeEligibility, diffDays, formatReadableDate } from '../../utils/feverCalculation';
import {
  Search,
  Plus,
  ArrowUpDown,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface PatientsViewProps {
  onSelectPatient: (patientId: string) => void;
  onOpenRecordTemp: (patientId: string) => void;
  onOpenDoctorVisit: (patientId: string) => void;
  onOpenDischarge: (patientId: string) => void;
}

export const PatientsView: React.FC<PatientsViewProps> = ({
  onSelectPatient,
  onOpenRecordTemp,
  onOpenDoctorVisit,
  onOpenDischarge,
}) => {
  const {
    patients,
    temperatures,
    visits,
    settings,
    admitPatient,
    occupiedBedsCount,
    availableBedsCount,
  } = useCareTrack();

  const today = settings.currentSimulatedDate;

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending_temp' | 'pending_visit' | 'discharge_candidates' | 'discharged'>('active');
  const [sortField, setSortField] = useState<'name' | 'admission' | 'bed' | 'status'>('admission');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Add Patient Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    age: 35,
    gender: 'Female' as 'Female' | 'Male' | 'Other',
    roomBed: '',
    admissionDate: today,
    symptoms: 'Fever, cough, malaise',
    notes: '',
  });
  const [addError, setAddError] = useState('');

  // Pre-generate list of beds in 74 bed facility
  const existingAssignedBeds = useMemo(() => {
    return new Set(
      patients
        .filter(p => p.status === 'active' || p.status === 'discharge_ready')
        .map(p => p.roomBed.toLowerCase().trim())
    );
  }, [patients]);

  const allFacilityBeds = useMemo(() => {
    const wards = ['Ward A', 'Ward B', 'Ward C', 'Ward D'];
    const beds: string[] = [];
    wards.forEach(ward => {
      for (let i = 1; i <= 20; i++) {
        if (beds.length < settings.maxCapacity) {
          beds.push(`${ward} - Bed ${String(i).padStart(2, '0')}`);
        }
      }
    });
    return beds;
  }, [settings.maxCapacity]);

  const availableBedsList = useMemo(() => {
    return allFacilityBeds.filter(b => !existingAssignedBeds.has(b.toLowerCase().trim()));
  }, [allFacilityBeds, existingAssignedBeds]);

  // Handle Add Patient Submission
  const handleAddPatient = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    if (!addForm.name.trim()) {
      setAddError('Please enter the patient full name.');
      return;
    }
    if (!addForm.roomBed.trim()) {
      setAddError('Please select an available bed assignment.');
      return;
    }

    const res = admitPatient({
      name: addForm.name.trim(),
      age: Number(addForm.age),
      gender: addForm.gender,
      roomBed: addForm.roomBed.trim(),
      admissionDate: addForm.admissionDate,
      symptoms: addForm.symptoms.split(',').map(s => s.trim()).filter(Boolean),
      notes: addForm.notes.trim() || undefined,
    });

    if (!res.success) {
      setAddError(res.message);
    } else {
      setIsAddModalOpen(false);
      setAddForm({
        name: '',
        age: 35,
        gender: 'Female',
        roomBed: '',
        admissionDate: today,
        symptoms: 'Fever, cough, malaise',
        notes: '',
      });
      if (res.patient) {
        onSelectPatient(res.patient.id);
      }
    }
  };

  // Filter & Sort Logic
  const filteredPatients = useMemo(() => {
    return patients.filter(patient => {
      // Search match
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        patient.name.toLowerCase().includes(query) ||
        patient.id.toLowerCase().includes(query) ||
        patient.roomBed.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      const hasTempToday = temperatures.some(
        t => t.patientId === patient.id && t.recordedDate === today
      );
      const hasVisitToday = visits.some(
        v => v.patientId === patient.id && v.visitedDate === today
      );
      const calc = calculateFeverFreeEligibility(
        patient,
        temperatures,
        today,
        settings.feverThresholdCelsius
      );

      if (statusFilter === 'active') {
        return patient.status === 'active' || patient.status === 'discharge_ready';
      }
      if (statusFilter === 'pending_temp') {
        return (
          (patient.status === 'active' || patient.status === 'discharge_ready') && !hasTempToday
        );
      }
      if (statusFilter === 'pending_visit') {
        return (
          (patient.status === 'active' || patient.status === 'discharge_ready') && !hasVisitToday
        );
      }
      if (statusFilter === 'discharge_candidates') {
        return (
          (patient.status === 'active' || patient.status === 'discharge_ready') &&
          calc.status === 'eligible'
        );
      }
      if (statusFilter === 'discharged') {
        return patient.status === 'discharged' || patient.status === 'deceased';
      }
      return true;
    });
  }, [patients, searchQuery, statusFilter, temperatures, visits, today, settings.feverThresholdCelsius]);

  // Sort
  const sortedPatients = useMemo(() => {
    return [...filteredPatients].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'admission') {
        comparison = new Date(a.admissionDate).getTime() - new Date(b.admissionDate).getTime();
      } else if (sortField === 'bed') {
        comparison = a.roomBed.localeCompare(b.roomBed);
      } else if (sortField === 'status') {
        comparison = a.status.localeCompare(b.status);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredPatients, sortField, sortOrder]);

  const isCapacityReached = occupiedBedsCount >= settings.maxCapacity;

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Patient Roster & Capacity Management
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
              {occupiedBedsCount} / {settings.maxCapacity} Beds Occupied
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tracking individual vital records, daily dual compliance, and 3-day fever-free discharge eligibility.
          </p>
        </div>

        {/* Action: Admit Patient */}
        <div>
          <button
            type="button"
            disabled={isCapacityReached}
            onClick={() => {
              setAddError('');
              setAddForm(prev => ({
                ...prev,
                roomBed: availableBedsList[0] || '',
              }));
              setIsAddModalOpen(true);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 ${
              isCapacityReached
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Admit New Patient</span>
          </button>
        </div>
      </div>

      {/* Capacity Warning Banner if full */}
      {isCapacityReached && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-900 text-xs">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">Maximum Facility Capacity Reached (74/74 Beds Occupied): </strong>
            All inpatient isolation units are currently full. New admissions are disabled in compliance with facility licensing.
            A bed must be released through an authorized discharge or hospital transfer before admitting another patient.
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by patient name, ID (e.g. CT-2026-001), or room/bed..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            />
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: 'active', label: 'Active Inpatients' },
              { id: 'pending_temp', label: 'Temp Due' },
              { id: 'pending_visit', label: 'Round Due' },
              { id: 'discharge_candidates', label: 'Discharge Ready' },
              { id: 'discharged', label: 'Closed Cases' },
              { id: 'all', label: 'All Records' },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === f.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>Showing {sortedPatients.length} patient record(s)</span>
          <div className="flex items-center gap-2">
            <span>Sort by:</span>
            <select
              value={sortField}
              onChange={e => setSortField(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none"
            >
              <option value="admission">Admission Date</option>
              <option value="name">Patient Name</option>
              <option value="bed">Bed Assignment</option>
              <option value="status">Status</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
              className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
              title="Toggle sort direction"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Patients Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="px-5 py-3.5">Patient Details</th>
                <th className="px-4 py-3.5">Bed / Room</th>
                <th className="px-4 py-3.5">Admission</th>
                <th className="px-4 py-3.5">Latest Temp</th>
                <th className="px-4 py-3.5">Today's Temp</th>
                <th className="px-4 py-3.5">Today's Round</th>
                <th className="px-4 py-3.5">Fever-Free Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedPatients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No matching patient records found.
                  </td>
                </tr>
              ) : (
                sortedPatients.map(patient => {
                  const patientTemps = temperatures
                    .filter(t => t.patientId === patient.id)
                    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
                  const latestT = patientTemps[0];
                  const hasTempToday = patientTemps.some(t => t.recordedDate === today);
                  const hasVisitToday = visits.some(
                    v => v.patientId === patient.id && v.visitedDate === today
                  );
                  const calc = calculateFeverFreeEligibility(
                    patient,
                    temperatures,
                    today,
                    settings.feverThresholdCelsius
                  );

                  return (
                    <tr
                      key={patient.id}
                      onClick={() => onSelectPatient(patient.id)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Name & ID */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                          {patient.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {patient.id} • {patient.age}y {patient.gender[0]}
                        </div>
                      </td>

                      {/* Bed */}
                      <td className="px-4 py-4">
                        <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md text-[11px]">
                          {patient.roomBed}
                        </span>
                      </td>

                      {/* Admission */}
                      <td className="px-4 py-4 text-slate-600">
                        <div>{formatReadableDate(patient.admissionDate)}</div>
                        <div className="text-[10px] text-slate-400">
                          {diffDays(patient.admissionDate, today)}d stay
                        </div>
                      </td>

                      {/* Latest Temp */}
                      <td className="px-4 py-4">
                        {latestT ? (
                          <div className="font-mono font-bold text-slate-800">
                            {latestT.celsius.toFixed(1)}°C
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>

                      {/* Today's Temp */}
                      <td className="px-4 py-4">
                        {hasTempToday ? (
                          <Badge variant="success" size="sm">
                            Completed
                          </Badge>
                        ) : (
                          <Badge variant="warning" size="sm">
                            Pending
                          </Badge>
                        )}
                      </td>

                      {/* Today's Round */}
                      <td className="px-4 py-4">
                        {hasVisitToday ? (
                          <Badge variant="success" size="sm">
                            Completed
                          </Badge>
                        ) : (
                          <Badge variant="info" size="sm">
                            Pending
                          </Badge>
                        )}
                      </td>

                      {/* Fever-Free Status & Eligibility */}
                      <td className="px-4 py-4">
                        {patient.status === 'discharged' ? (
                          <Badge variant="neutral" size="sm">
                            Discharged
                          </Badge>
                        ) : patient.status === 'deceased' ? (
                          <Badge variant="danger" size="sm">
                            Deceased
                          </Badge>
                        ) : calc.status === 'eligible' ? (
                          <Badge variant="success" size="sm">
                            Eligible (3d clear)
                          </Badge>
                        ) : calc.status === 'needs_review' ? (
                          <Badge variant="purple" size="sm">
                            Needs Review
                          </Badge>
                        ) : (
                          <span className="text-slate-500 font-medium text-[11px]">
                            {calc.consecutiveDays} of 3 full days
                          </span>
                        )}
                      </td>

                      {/* Quick Actions */}
                      <td className="px-4 py-4 text-right">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={e => e.stopPropagation()}
                        >
                          {patient.status === 'active' && (
                            <>
                              {!hasTempToday && (
                                <button
                                  type="button"
                                  onClick={() => onOpenRecordTemp(patient.id)}
                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded border border-amber-200 text-[11px] font-semibold"
                                  title="Record temperature"
                                >
                                  + Temp
                                </button>
                              )}
                              {!hasVisitToday && (
                                <button
                                  type="button"
                                  onClick={() => onOpenDoctorVisit(patient.id)}
                                  className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded border border-sky-200 text-[11px] font-semibold"
                                  title="Doctor round"
                                >
                                  + Round
                                </button>
                              )}
                              {calc.status === 'eligible' && (
                                <button
                                  type="button"
                                  onClick={() => onOpenDischarge(patient.id)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold shadow-2xs"
                                  title="Discharge Review"
                                >
                                  Discharge
                                </button>
                              )}
                            </>
                          )}
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 ml-1" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Patient Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Admit New Inpatient"
        subtitle={`Current Bed Occupancy: ${occupiedBedsCount} of ${settings.maxCapacity} active`}
        maxWidth="lg"
      >
        <form onSubmit={handleAddPatient} className="space-y-4">
          {addError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{addError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Patient Full Name *
            </label>
            <input
              type="text"
              required
              value={addForm.name}
              onChange={e => setAddForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Julian Harris"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Age *</label>
              <input
                type="number"
                min={1}
                max={120}
                required
                value={addForm.age}
                onChange={e => setAddForm(prev => ({ ...prev, age: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Gender *</label>
              <select
                value={addForm.gender}
                onChange={e => setAddForm(prev => ({ ...prev, gender: e.target.value as any }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Room & Bed Assignment *
              </label>
              <select
                required
                value={addForm.roomBed}
                onChange={e => setAddForm(prev => ({ ...prev, roomBed: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                <option value="">Select available bed...</option>
                {availableBedsList.map(bed => (
                  <option key={bed} value={bed}>
                    {bed}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {availableBedsCount} bed(s) available in facility
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Admission Date *
              </label>
              <input
                type="date"
                required
                value={addForm.admissionDate}
                onChange={e => setAddForm(prev => ({ ...prev, admissionDate: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Presenting Symptoms (comma-separated)
            </label>
            <input
              type="text"
              value={addForm.symptoms}
              onChange={e => setAddForm(prev => ({ ...prev, symptoms: e.target.value }))}
              placeholder="e.g. Pyrexia, dry cough, myalgia"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Non-sensitive Clinical Demo Notes
            </label>
            <textarea
              rows={2}
              value={addForm.notes}
              onChange={e => setAddForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="e.g. Contact tracing source identified. Vital monitoring initiated."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              Complete Admission
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
