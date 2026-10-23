import React, { useState } from 'react';
import { useCareTrack, PROFILES } from '../../context/CareTrackContext';
import type { UserRole } from '../../types';
import { formatReadableDate } from '../../utils/feverCalculation';
import {
  Activity,
  Bell,
  Calendar,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
  FastForward,
  Menu,
  Stethoscope,
  Building2,
  X,
} from 'lucide-react';


interface NavbarProps {
  onToggleMobileMenu: () => void;
  onOpenHandover: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu, onOpenHandover }) => {
  const {
    currentRole,
    setRole,
    currentProfile,
    settings,
    advanceSimulatedDate,
    notifications,
    dismissNotification,
    markAllNotificationsRead,
    occupiedBedsCount,
  } = useCareTrack();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const unreadNotifs = notifications.filter(n => !n.read);
  const occupancyPercent = ((occupiedBedsCount / settings.maxCapacity) * 100).toFixed(0);

  const roleIcons: Record<UserRole, React.ReactNode> = {
    nurse: <Activity className="w-4 h-4 text-emerald-500" />,
    doctor: <Stethoscope className="w-4 h-4 text-sky-500" />,
    admin: <Building2 className="w-4 h-4 text-purple-500" />,
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3 transition-shadow">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Menu Toggle & Brand */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-teal-600/20">
              <Activity className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold tracking-tight text-slate-900">
                  Care<span className="text-teal-600">Track</span>
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                  FACILITY OPS
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-slate-500 -mt-0.5 font-medium">
                Hospital Quarantine & Treatment Prototype
              </p>
            </div>
          </div>
        </div>

        {/* Center / Right: Operational Date & Capacity & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Simulated Date Widget */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100/80 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="hidden sm:inline text-slate-500">Hospital Date:</span>
            <span className="font-semibold text-slate-900">{formatReadableDate(settings.currentSimulatedDate)}</span>
            <button
              type="button"
              onClick={() => advanceSimulatedDate(1)}
              title="Advance Hospital Date by 1 Day (Test 3-day fever-free progression)"
              className="ml-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-white hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 border border-slate-200 text-[11px] text-slate-600 font-semibold shadow-2xs transition-all active:scale-95"
            >
              <FastForward className="w-3 h-3 text-teal-600" />
              <span>+1 Day</span>
            </button>
          </div>

          {/* Bed Occupancy Pill */}
          <div
            title={`Facility Bed Capacity: ${occupiedBedsCount} of ${settings.maxCapacity} occupied`}
            className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
              occupiedBedsCount >= settings.maxCapacity
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : occupiedBedsCount >= 60
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            <span>Beds: {occupiedBedsCount} / {settings.maxCapacity}</span>
            <span className="text-[11px] opacity-75 font-normal">({occupancyPercent}%)</span>
          </div>

          {/* AI / Handover Brief Button */}
          <button
            type="button"
            onClick={onOpenHandover}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-700 hover:to-sky-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-teal-600/20 transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-200" />
            <span className="hidden sm:inline">Daily</span> Handover
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowNotifMenu(!showNotifMenu);
                setShowRoleMenu(false);
              }}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifs.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                  {unreadNotifs.length}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Alerts & Notifications
                    </span>
                    {unreadNotifs.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                        {unreadNotifs.length} new
                      </span>
                    )}
                  </div>
                  {unreadNotifs.length > 0 && (
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      className="text-[11px] text-teal-600 hover:text-teal-700 font-semibold"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No notifications recorded
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`p-3.5 flex items-start gap-3 transition-colors ${
                          n.read ? 'bg-white' : 'bg-teal-50/30'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {n.type === 'urgent' ? (
                            <AlertTriangle className="w-4 h-4 text-rose-500" />
                          ) : n.type === 'warning' ? (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          ) : n.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Info className="w-4 h-4 text-sky-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {n.title}
                            </span>
                            <span className="text-[10px] text-slate-400">{n.time}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                            {n.message}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => dismissNotification(n.id)}
                          className="text-slate-300 hover:text-slate-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Demo Role Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowRoleMenu(!showRoleMenu);
                setShowNotifMenu(false);
              }}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 shadow-2xs transition-all text-left"
              aria-label="Switch demo staff role"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                {roleIcons[currentRole]}
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 capitalize">
                    {currentRole}
                  </span>
                  <span className="text-[10px] px-1 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                    DEMO
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium truncate max-w-[110px]">
                  {currentProfile.name}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95">
                <div className="p-3 bg-slate-50 border-b border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Switch Active Staff Perspective
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Frontend prototype simulation. Permissions reflect assigned role.
                  </p>
                </div>
                <div className="p-2 space-y-1">
                  {(['nurse', 'doctor', 'admin'] as UserRole[]).map(role => {
                    const prof = PROFILES[role];
                    const isActive = currentRole === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          setRole(role);
                          setShowRoleMenu(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 ${
                          isActive
                            ? 'bg-teal-50 border border-teal-200 text-teal-900'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">{roleIcons[role]}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold capitalize text-slate-900">
                              {role} View
                            </span>
                            {isActive && (
                              <span className="text-[10px] font-bold text-teal-700 bg-teal-100/70 px-1.5 py-0.2 rounded">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 font-medium truncate">
                            {prof.name}
                          </p>
                          <p className="text-[10px] text-slate-400">{prof.title}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="p-3 bg-amber-50/60 border-t border-amber-100 text-[10px] text-amber-800 leading-tight">
                  <span className="font-semibold">Note:</span> Production environments must enforce security via backend RBAC tokens.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
