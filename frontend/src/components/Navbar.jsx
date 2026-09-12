import React from 'react';
import { Layers, Plus, Sparkles, RefreshCw, Trash2 } from 'lucide-react';

export default function Navbar({ onOpenNewModal, onSeedSamples, onReset, isSeeding, totalCount, flaggedCount }) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-meridian-700 to-meridian-500 flex items-center justify-center text-white shadow-md shadow-meridian-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-lg tracking-tight">Meridian</span>
                <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Tax & Advisory
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Client Intake & Triage Assistant</p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center gap-3">
            {/* Seed 4 Transcripts Button */}
            <button
              onClick={onSeedSamples}
              disabled={isSeeding}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-meridian-50 text-meridian-700 border border-meridian-200 hover:bg-meridian-100 transition-colors shadow-xs disabled:opacity-50"
              title="Process the 4 official assessment transcripts"
            >
              <Sparkles className="w-3.5 h-3.5 text-meridian-600" />
              {isSeeding ? 'Processing 4 Samples...' : 'Run 4 Sample Transcripts'}
            </button>

            {/* Add New Intake Button */}
            <button
              onClick={onOpenNewModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-meridian-600 text-white hover:bg-meridian-700 transition-colors shadow-sm shadow-meridian-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              New Intake
            </button>

            {/* Clear All Data */}
            <button
              onClick={onReset}
              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Clear all intakes"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
