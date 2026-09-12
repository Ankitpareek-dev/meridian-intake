import React from 'react';
import { Sparkles } from 'lucide-react';

export default function Header({ onSeedSamples, onOpenNewModal, isSeeding }) {
  return (
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between flex-shrink-0 shadow-2xs">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-sm flex-shrink-0">
          M
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-slate-900 text-sm leading-none">Meridian Tax & Advisory</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Intake Triage
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Automated Client Intake & Service Matching</p>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Run 4 Samples Action */}
        <button
          onClick={onSeedSamples}
          disabled={isSeeding}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5 text-meridian-600" />
          {isSeeding ? 'Processing...' : 'Run 4 Samples'}
        </button>

        {/* User Profile Avatar */}
        <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold cursor-pointer hover:ring-2 hover:ring-slate-400">
          A
        </div>
      </div>
    </header>
  );
}
