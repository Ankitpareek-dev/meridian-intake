import React from 'react';
import { 
  Home, 
  ClipboardList, 
  Users, 
  BarChart3, 
  Settings, 
  User
} from 'lucide-react';

export default function Sidebar({ activeNav = 'queue' }) {
  return (
    <aside className="w-16 xl:w-56 bg-slate-50/80 border-r border-slate-200 flex flex-col justify-between p-3 xl:p-4 flex-shrink-0 select-none transition-all duration-200">
      {/* Top Logo & Navigation */}
      <div className="space-y-6">
        {/* Brand */}
        <div className="flex items-center gap-3 px-1 xl:px-2 py-1 justify-center xl:justify-start">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-sm flex-shrink-0">
            M
          </div>
          <div className="hidden xl:block overflow-hidden">
            <h1 className="font-bold text-slate-900 text-xs leading-tight truncate">Meridian Tax</h1>
            <p className="text-[11px] text-slate-500 font-medium truncate">& Advisory</p>
          </div>
        </div>

        {/* Main Nav Links */}
        <nav className="space-y-1">
          <button
            type="button"
            className="w-full flex items-center justify-center xl:justify-start gap-3 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            title="Dashboard"
          >
            <Home className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="hidden xl:inline truncate">Dashboard</span>
          </button>

          <button
            type="button"
            className="w-full flex items-center justify-center xl:justify-start gap-3 px-2.5 py-2 rounded-xl text-xs font-bold text-slate-900 bg-white border border-slate-200/80 shadow-xs"
            title="Intake Queue"
          >
            <ClipboardList className="w-4 h-4 text-meridian-600 flex-shrink-0" />
            <span className="hidden xl:inline truncate">Intake Queue</span>
          </button>

          <button
            type="button"
            className="w-full flex items-center justify-center xl:justify-start gap-3 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            title="Clients"
          >
            <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="hidden xl:inline truncate">Clients</span>
          </button>

          <button
            type="button"
            className="w-full flex items-center justify-center xl:justify-start gap-3 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            title="Reporting"
          >
            <BarChart3 className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="hidden xl:inline truncate">Reporting</span>
          </button>
        </nav>
      </div>

      {/* Bottom Nav Links */}
      <div className="space-y-1 border-t border-slate-200/80 pt-3">
        <button
          type="button"
          className="w-full flex items-center justify-center xl:justify-start gap-3 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className="hidden xl:inline truncate">Settings</span>
        </button>

        <button
          type="button"
          className="w-full flex items-center justify-center xl:justify-start gap-3 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          title="Profile"
        >
          <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className="hidden xl:inline truncate">Profile</span>
        </button>
      </div>
    </aside>
  );
}
