import React, { useState } from 'react';
import { CareTrackProvider } from './context/CareTrackContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import type { NavTab } from './components/common/Sidebar';

import { DashboardView } from './components/dashboard/DashboardView';
import { PatientsView } from './components/patients/PatientsView';
import { TemperatureView } from './components/temperature/TemperatureView';
import { RoundsView } from './components/rounds/RoundsView';
import { DischargesView } from './components/discharges/DischargesView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { HandoverModal } from './components/common/HandoverModal';
import { PatientDetailsDrawer } from './components/patients/PatientDetailsDrawer';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);

  // Cross-page interaction states
  const [selectedDrawerPatientId, setSelectedDrawerPatientId] = useState<string | null>(null);
  const [selectedPatientForTemp, setSelectedPatientForTemp] = useState<string | null>(null);
  const [selectedPatientForVisit, setSelectedPatientForVisit] = useState<string | null>(null);
  const [selectedPatientForDischarge, setSelectedPatientForDischarge] = useState<string | null>(null);

  const handleOpenRecordTemp = (patientId: string) => {
    setSelectedPatientForTemp(patientId);
    setActiveTab('temperature');
    setSelectedDrawerPatientId(null);
  };

  const handleOpenDoctorVisit = (patientId: string) => {
    setSelectedPatientForVisit(patientId);
    setActiveTab('rounds');
    setSelectedDrawerPatientId(null);
  };

  const handleOpenDischarge = (patientId: string) => {
    setSelectedPatientForDischarge(patientId);
    setActiveTab('discharges');
    setSelectedDrawerPatientId(null);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800">
      {/* Persistent Desktop Sidebar / Mobile Drawer */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onOpenHandover={() => setIsHandoverOpen(true)}
        />

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              onNavigate={setActiveTab}
              onOpenHandover={() => setIsHandoverOpen(true)}
              onSelectPatient={setSelectedDrawerPatientId}
            />
          )}

          {activeTab === 'patients' && (
            <PatientsView
              onSelectPatient={setSelectedDrawerPatientId}
              onOpenRecordTemp={handleOpenRecordTemp}
              onOpenDoctorVisit={handleOpenDoctorVisit}
              onOpenDischarge={handleOpenDischarge}
            />
          )}

          {activeTab === 'temperature' && (
            <TemperatureView
              onSelectPatient={setSelectedDrawerPatientId}
              selectedPatientIdForTemp={selectedPatientForTemp}
              onClearSelectedPatient={() => setSelectedPatientForTemp(null)}
            />
          )}

          {activeTab === 'rounds' && (
            <RoundsView
              onSelectPatient={setSelectedDrawerPatientId}
              selectedPatientIdForVisit={selectedPatientForVisit}
              onClearSelectedPatient={() => setSelectedPatientForVisit(null)}
            />
          )}

          {activeTab === 'discharges' && (
            <DischargesView
              onSelectPatient={setSelectedDrawerPatientId}
              selectedPatientIdForDischarge={selectedPatientForDischarge}
              onClearSelectedPatient={() => setSelectedPatientForDischarge(null)}
            />
          )}

          {activeTab === 'reports' && <ReportsView />}

          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Daily Handover Brief Modal */}
      <HandoverModal
        isOpen={isHandoverOpen}
        onClose={() => setIsHandoverOpen(false)}
      />

      {/* Patient Details Drawer */}
      <PatientDetailsDrawer
        patientId={selectedDrawerPatientId}
        onClose={() => setSelectedDrawerPatientId(null)}
        onOpenRecordTemp={handleOpenRecordTemp}
        onOpenDoctorVisit={handleOpenDoctorVisit}
        onOpenDischarge={handleOpenDischarge}
      />
    </div>
  );
};

export default function App() {
  return (
    <CareTrackProvider>
      <AppContent />
    </CareTrackProvider>
  );
}
