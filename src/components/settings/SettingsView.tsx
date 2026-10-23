import React, { useState } from 'react';
import { useCareTrack } from '../../context/CareTrackContext';
import { formatReadableDate } from '../../utils/feverCalculation';
import {
  RotateCcw,
  CheckCircle2,
  Calendar,
  Thermometer,
  Lock,
  Download,
} from 'lucide-react';
import { ConfirmDialog } from '../common/ConfirmDialog';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    advanceSimulatedDate,
    resetDemoData,
    currentRole,
    patients,
    temperatures,
    visits,
  } = useCareTrack();

  const [feverInput, setFeverInput] = useState(settings.feverThresholdCelsius.toFixed(1));
  const [simDateInput, setSimDateInput] = useState(settings.currentSimulatedDate);
  const [facilityName, setFacilityName] = useState(settings.facilityName);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const isAdmin = currentRole === 'admin';

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const numericFever = parseFloat(feverInput);
    if (isNaN(numericFever) || numericFever < 36.5 || numericFever > 40.0) {
      alert('Please enter a reasonable fever threshold between 36.5°C and 40.0°C');
      return;
    }

    updateSettings({
      facilityName,
      feverThresholdCelsius: Number(numericFever.toFixed(1)),
      currentSimulatedDate: simDateInput,
    });

    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handleExportData = () => {
    const exportData = {
      settings,
      patients,
      temperatures,
      visits,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `caretrack_export_${settings.currentSimulatedDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">
          Facility Configuration & Simulation Parameters
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Adjust clinical threshold assumptions, fast-forward operational date for testing, and manage prototype data.
        </p>
      </div>

      {savedToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-900">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Facility configuration saved successfully.</span>
        </div>
      )}

      {/* Role permission banner if not admin */}
      {!isAdmin && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
          <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">Role Permission Notice: </strong>
            You are currently viewing in <strong className="capitalize font-bold">{currentRole}</strong> mode.
            Global institutional parameters (fever threshold and facility settings) can only be modified by the Administrator.
            Use the demo role switcher in the top bar to switch to Administrator.
          </div>
        </div>
      )}

      {/* Primary Configuration Form */}
      <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-3">
          Clinical Parameters
        </h2>

        {/* Fever Threshold Setting with Assumption Label */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Thermometer className="w-4 h-4 text-amber-600" />
                <span>Configurable Fever Threshold (°C)</span>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-mono font-bold">
                  PROTOTYPE ASSUMPTION
                </span>
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                The assessment problem statement states a 3-day fever-free discharge rule without prescribing a specific fever threshold.
                38.0°C is an initial demonstration default assumption, not an assessment-mandated medical rule.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                type="number"
                step="0.1"
                min="36.5"
                max="40.0"
                disabled={!isAdmin}
                value={feverInput}
                onChange={e => setFeverInput(e.target.value)}
                className="w-24 text-right font-mono font-bold px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
              <span className="text-xs font-bold text-slate-500">°C</span>
            </div>
          </div>
        </div>

        {/* Facility Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Facility Name
            </label>
            <input
              type="text"
              disabled={!isAdmin}
              value={facilityName}
              onChange={e => setFacilityName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Licensed Inpatient Bed Capacity
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                disabled
                value={settings.maxCapacity}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-mono font-bold cursor-not-allowed"
              />
              <span className="text-xs text-slate-500 shrink-0 font-medium">
                (74 Bed Max Mandate)
              </span>
            </div>
          </div>
        </div>

        {/* Simulation Date Controls */}
        <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-sky-600" /> Operational Simulation Date
            </span>
            <span className="text-xs font-mono font-bold text-sky-800">
              Active Date: {formatReadableDate(settings.currentSimulatedDate)}
            </span>
          </div>
          <p className="text-[11px] text-sky-900 leading-relaxed">
            Fast-forward simulation tool: Advancing the hospital date lets evaluators test the 3-day fever-free discharge progression across consecutive days without waiting real calendar time.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <input
              type="date"
              disabled={!isAdmin}
              value={simDateInput}
              onChange={e => setSimDateInput(e.target.value)}
              className="px-3 py-1.5 bg-white border border-sky-300 rounded-lg text-xs text-slate-900 focus:outline-none"
            />

            <button
              type="button"
              onClick={() => advanceSimulatedDate(1)}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
            >
              Advance Date +1 Day
            </button>

            <button
              type="button"
              onClick={() => advanceSimulatedDate(3)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
            >
              Advance +3 Days (Full Cycle)
            </button>
          </div>
        </div>

        {/* Save button */}
        {isAdmin && (
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              Save Configuration Changes
            </button>
          </div>
        )}
      </form>

      {/* Role Permission Matrix Guide */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-3">
          Demonstration Role Permissions Matrix
        </h2>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                <th className="py-2.5 px-3">Workflow Action</th>
                <th className="py-2.5 px-3">Nurse Role</th>
                <th className="py-2.5 px-3">Doctor Role</th>
                <th className="py-2.5 px-3">Administrator Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-2.5 px-3 font-semibold">Log Daily Temperatures</td>
                <td className="py-2.5 px-3 text-emerald-600 font-bold">✓ Full Access</td>
                <td className="py-2.5 px-3 text-emerald-600 font-bold">✓ Full Access</td>
                <td className="py-2.5 px-3 text-emerald-600 font-bold">✓ Full Access</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold">Document Doctor Rounds</td>
                <td className="py-2.5 px-3 text-slate-400">Read-Only</td>
                <td className="py-2.5 px-3 text-emerald-600 font-bold">✓ Full Access</td>
                <td className="py-2.5 px-3 text-emerald-600 font-bold">✓ Full Access</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold">Recommend Discharge Clearance</td>
                <td className="py-2.5 px-3 text-slate-400">—</td>
                <td className="py-2.5 px-3 text-emerald-600 font-bold">✓ Clinical Flag</td>
                <td className="py-2.5 px-3 text-emerald-600 font-bold">✓ Sign-off</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold">Execute Authorized Discharge & Bed Release</td>
                <td className="py-2.5 px-3 text-rose-500 font-bold">✕ Restricted</td>
                <td className="py-2.5 px-3 text-rose-500 font-bold">✕ Restricted</td>
                <td className="py-2.5 px-3 text-emerald-600 font-bold">✓ Authorized</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold">Modify Global Settings & Thresholds</td>
                <td className="py-2.5 px-3 text-rose-500 font-bold">✕ Restricted</td>
                <td className="py-2.5 px-3 text-rose-500 font-bold">✕ Restricted</td>
                <td className="py-2.5 px-3 text-emerald-600 font-bold">✓ Authorized</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Management & Reset Demo State */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-3">
          Prototype Data & Persistence Management
        </h2>

        <p className="text-xs text-slate-500 leading-relaxed">
          State is persistently stored in browser <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">localStorage</code> under safe versioned keys.
          You can export the entire state to JSON or reset back to the original demonstration cohort.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportData}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export State JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all"
          >
            <RotateCcw className="w-4 h-4 text-rose-600" />
            <span>Reset Demo Data to Initial State</span>
          </button>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={resetDemoData}
        title="Reset CareTrack Demonstration State?"
        description="This will clear your local storage changes and restore the realistic initial demonstration dataset (including sample patients awaiting temperatures, doctor visits, discharge candidates, and preserved outcome logs)."
        confirmLabel="Reset All Data"
        variant="danger"
      />
    </div>
  );
};
