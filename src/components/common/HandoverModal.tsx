import React, { useState } from 'react';
import { useCareTrack } from '../../context/CareTrackContext';
import { calculateFeverFreeEligibility, formatReadableDate } from '../../utils/feverCalculation';
import { Modal } from './Modal';
import { Bot, Check, ClipboardCopy, FileText, ShieldAlert } from 'lucide-react';


interface HandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HandoverModal: React.FC<HandoverModalProps> = ({ isOpen, onClose }) => {
  const { patients, temperatures, visits, settings, occupiedBedsCount } = useCareTrack();
  const [copied, setCopied] = useState(false);

  const activePatients = patients.filter(p => p.status === 'active' || p.status === 'discharge_ready');
  const today = settings.currentSimulatedDate;

  // Derive metrics for handover
  const pendingTemps = activePatients.filter(
    p => !temperatures.some(t => t.patientId === p.id && t.recordedDate === today)
  );

  const pendingVisits = activePatients.filter(
    p => !visits.some(v => v.patientId === p.id && v.visitedDate === today)
  );

  // High pyrexia alert today (>= 39.0 C)
  const highFeverAlerts = activePatients.filter(p => {
    const todayTemps = temperatures.filter(t => t.patientId === p.id && t.recordedDate === today);
    return todayTemps.some(t => t.celsius >= 39.0 || t.isHighAlert);
  });

  // Discharge candidates
  const dischargeCandidates = activePatients.filter(p => {
    const evalResult = calculateFeverFreeEligibility(p, temperatures, today, settings.feverThresholdCelsius);
    return evalResult.status === 'eligible';
  });

  // Incomplete / Needs Review
  const needsReviewPatients = activePatients.filter(p => {
    const evalResult = calculateFeverFreeEligibility(p, temperatures, today, settings.feverThresholdCelsius);
    return evalResult.status === 'needs_review';
  });

  // Generate Handover Text
  const summaryText = `=====================================================
CARETRACK DAILY CLINICAL SHIFT HANDOVER BRIEF
Facility: ${settings.facilityName}
Operational Date: ${formatReadableDate(today)} (${today})
Generated: ${new Date().toLocaleTimeString()}
=====================================================

1. CENSUS & CAPACITY
- Total Active Inpatients: ${occupiedBedsCount} / ${settings.maxCapacity} (${((occupiedBedsCount / settings.maxCapacity) * 100).toFixed(0)}% Occupancy)
- Available Beds: ${settings.maxCapacity - occupiedBedsCount}

2. PENDING TASKS FOR CURRENT SHIFT
- Temperature Logs Pending: ${pendingTemps.length} patient(s)
  ${pendingTemps.map(p => `• [${p.roomBed}] ${p.name} (${p.id})`).join('\n  ') || '• All daily temperatures completed.'}

- Doctor Rounds Pending: ${pendingVisits.length} patient(s)
  ${pendingVisits.map(p => `• [${p.roomBed}] ${p.name} (${p.id})`).join('\n  ') || '• All doctor rounds completed.'}

3. CRITICAL ALERTS & WATCHLIST (≥39.0°C or Doctor Flags)
  ${
    highFeverAlerts.length > 0
      ? highFeverAlerts.map(p => {
          const maxT = Math.max(...temperatures.filter(t => t.patientId === p.id && t.recordedDate === today).map(t => t.celsius));
          return `• [ALERT] ${p.name} (${p.roomBed}): Max Temp ${maxT}°C. Requires urgent monitoring.`;
        }).join('\n  ')
      : '• No severe pyrexia (≥39.0°C) recorded today.'
  }

4. DISCHARGE CANDIDATES (3 Full Days Fever-Free)
  ${
    dischargeCandidates.length > 0
      ? dischargeCandidates.map(p => `• [ELIGIBLE] ${p.name} (${p.roomBed}) - ID: ${p.id}. Meets 3 full consecutive fever-free days. Pending Administrator sign-off.`).join('\n  ')
      : '• No patients currently eligible for discharge.'
  }

5. DOCUMENTATION DISCREPANCIES (Needs Review)
  ${
    needsReviewPatients.length > 0
      ? needsReviewPatients.map(p => `• [REVIEW NEEDED] ${p.name} (${p.roomBed}): Missing daily temperature data during stay.`).join('\n  ')
      : '• All inpatient documentation verified intact.'
  }

=====================================================
DISCLAIMER: Deterministic prototype handover brief synthesized from structured records. Non-diagnostic. All clinical care and discharges require human staff verification.
=====================================================`;

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Daily Handover Summary"
      subtitle={`Deterministic operational synthesis for ${formatReadableDate(today)}`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Banner with compliance disclaimer */}
        <div className="flex items-start gap-3 p-3.5 bg-sky-50 border border-sky-200 rounded-xl text-sky-900 text-xs leading-relaxed">
          <Bot className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Prototype Handover Generator: </span>
            This summary is deterministically extracted from live patient records, pending queues, and verified temperature telemetry.
            It does not invent medical diagnoses or automatically discharge patients. Clinical review is required.
          </div>
        </div>

        {/* Quick Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-xs text-slate-500 font-medium block">Active Census</span>
            <span className="text-lg font-bold text-slate-800">{occupiedBedsCount} <span className="text-xs text-slate-400 font-normal">/ 74</span></span>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <span className="text-xs text-amber-700 font-medium block">Temps Pending</span>
            <span className="text-lg font-bold text-amber-800">{pendingTemps.length}</span>
          </div>
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
            <span className="text-xs text-indigo-700 font-medium block">Rounds Pending</span>
            <span className="text-lg font-bold text-indigo-800">{pendingVisits.length}</span>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <span className="text-xs text-emerald-700 font-medium block">Discharge Ready</span>
            <span className="text-lg font-bold text-emerald-800">{dischargeCandidates.length}</span>
          </div>
        </div>

        {/* Preformatted Brief */}
        <div className="relative">
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 text-slate-200 rounded-t-xl text-xs font-medium">
            <span className="flex items-center gap-1.5 font-mono">
              <FileText className="w-3.5 h-3.5 text-teal-400" /> handover_report_{today}.txt
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                </>
              ) : (
                <>
                  <ClipboardCopy className="w-3.5 h-3.5" /> Copy Text
                </>
              )}
            </button>
          </div>
          <pre className="p-4 bg-slate-900 text-slate-100 font-mono text-xs rounded-b-xl overflow-x-auto max-h-72 border-t-0 border border-slate-800 leading-relaxed whitespace-pre-wrap select-all">
            {summaryText}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> Minimum-necessary data export
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
