import React from 'react';
import { useCareTrack } from '../../context/CareTrackContext';
import { calculateFeverFreeEligibility } from '../../utils/feverCalculation';
import {
  LayoutDashboard,
  Users,
  Thermometer,
  Stethoscope,
  LogOut,
  BarChart3,
  Settings,
  X,
  Bed,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'patients'
  | 'temperature'
  | 'rounds'
  | 'discharges'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { patients, temperatures, visits, settings, currentRole, currentProfile, occupiedBedsCount } =
    useCareTrack();

  const today = settings.currentSimulatedDate;
  const activePatients = patients.filter(p => p.status === 'active' || p.status === 'discharge_ready');

  // Compute live badges
  const pendingTemperaturesCount = activePatients.filter(
    p => !temperatures.some(t => t.patientId === p.id && t.recordedDate === today)
  ).length;

  const pendingVisitsCount = activePatients.filter(
    p => !visits.some(v => v.patientId === p.id && v.visitedDate === today)
  ).length;

  const dischargeEligibleCount = activePatients.filter(p => {
    const calc = calculateFeverFreeEligibility(p, temperatures, today, settings.feverThresholdCelsius);
    return calc.status === 'eligible';
  }).length;

  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      badge: null,
    },
    {
      id: 'patients' as NavTab,
      label: 'Patients',
      icon: <Users className="w-5 h-5" />,
      badge: `${occupiedBedsCount}/${settings.maxCapacity}`,
      badgeColor: 'bg-slate-700 text-slate-300',
    },
    {
      id: 'temperature' as NavTab,
      label: 'Temperature Tracking',
      icon: <Thermometer className="w-5 h-5" />,
      badge: pendingTemperaturesCount > 0 ? `${pendingTemperaturesCount} due` : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    },
    {
      id: 'rounds' as NavTab,
      label: 'Doctor Rounds',
      icon: <Stethoscope className="w-5 h-5" />,
      badge: pendingVisitsCount > 0 ? `${pendingVisitsCount} due` : null,
      badgeColor: 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
    },
    {
      id: 'discharges' as NavTab,
      label: 'Discharges',
      icon: <LogOut className="w-5 h-5" />,
      badge: dischargeEligibleCount > 0 ? `${dischargeEligibleCount} ready` : null,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    },
    {
      id: 'reports' as NavTab,
      label: 'Reports & Outcomes',
      icon: <BarChart3 className="w-5 h-5" />,
      badge: null,
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
      badge: null,
    },
  ];

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container: Deep navy background */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:static lg:z-30`}
      >
        {/* Header / Brand in Sidebar */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-teal-500/20">
              CT
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight block">
                CareTrack OPS
              </span>
              <span className="text-[11px] text-teal-400 font-medium block">
                Inpatient Isolation Hub
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Clinical Workflows
          </div>

          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all group ${
                  isActive
                    ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30 font-semibold shadow-inner'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`${
                      isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      item.badgeColor || 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bed Capacity Card in Sidebar */}
        <div className="p-4 mx-3 mb-3 bg-slate-800/60 border border-slate-700/60 rounded-xl">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Bed className="w-3.5 h-3.5 text-teal-400" /> Bed Occupancy
            </span>
            <span className="font-mono text-teal-300 font-bold">
              {occupiedBedsCount} / {settings.maxCapacity}
            </span>
          </div>
          <div className="w-full bg-slate-700/70 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                occupiedBedsCount >= settings.maxCapacity
                  ? 'bg-rose-500'
                  : occupiedBedsCount >= 60
                  ? 'bg-amber-400'
                  : 'bg-teal-400'
              }`}
              style={{
                width: `${Math.min(100, (occupiedBedsCount / settings.maxCapacity) * 100)}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
            <span>Capacity Limit: 74</span>
            <span>{settings.maxCapacity - occupiedBedsCount} available</span>
          </div>
        </div>

        {/* Staff Profile Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 font-bold text-xs shrink-0">
              {currentProfile.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-white block truncate">
                {currentProfile.name}
              </span>
              <span className="text-[10px] text-teal-400 block font-mono capitalize">
                {currentRole} • {currentProfile.badgeId}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
