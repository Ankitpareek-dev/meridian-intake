import React, { useState } from 'react';
import { Search, ChevronDown, User, Plus, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export default function IntakeQueue({
  intakes,
  selectedIntakeId,
  onSelectIntake,
  onDeleteIntake,
  tabFilter,
  setTabFilter,
  serviceFilter,
  setServiceFilter,
  urgencyFilter = '',
  setUrgencyFilter,
  services,
  searchQuery,
  setSearchQuery,
  onOpenNewModal,
  isLoading
}) {
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [isUrgencyDropdownOpen, setIsUrgencyDropdownOpen] = useState(false);
  const [sortField, setSortField] = useState('confidence');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Helper to get source channel from transcript or id
  const getSourceChannel = (item, idx) => {
    const text = item.raw_transcript_preview.toLowerCase();
    if (text.includes('hold music') || text.includes('finally get through')) return 'Voicemail';
    if (text.includes('@') || text.includes('reach me at')) return 'Email';
    if (text.includes('got your number') || text.includes('call me back')) return 'Call';
    return 'Web Form';
  };

  const getUrgencyBadge = (item, idx = 0) => {
    const urgencyStr = item.urgency?.toUpperCase();
    const showBelow = idx <= 1;
    switch (urgencyStr) {
      case 'HIGH':
        return (
          <div className="relative inline-block group">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-600 text-white text-center cursor-help shadow-2xs">
              High
            </span>
            {/* Floating Tooltip Box */}
            <div
              className={`absolute left-1/2 -translate-x-1/2 hidden group-hover:block z-50 w-64 p-2.5 rounded-xl bg-slate-900 text-white shadow-2xl border border-slate-700 text-left pointer-events-none animate-in fade-in zoom-in-95 duration-150 ${
                showBelow ? 'top-full mt-2' : 'bottom-full mb-2'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-[11px] text-rose-400 mb-1">
                <span>⚡ High Urgency Rationale</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-200 font-normal">
                {item.urgency_rationale || 'Potential statutory filing deadline or high-risk timeline requiring immediate attention.'}
              </p>
              {showBelow ? (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-slate-900" />
              ) : (
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900" />
              )}
            </div>
          </div>
        );
      case 'MEDIUM':
        return (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-200 text-center">
            Medium
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 text-center">
            Low
          </span>
        );
    }
  };

  const getStatusBadge = (item) => {
    if (item.status === 'APPROVED') {
      return (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white text-center whitespace-nowrap shadow-2xs">
          Approved
        </span>
      );
    }
    if (item.status === 'REJECTED') {
      return (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200 text-center whitespace-nowrap">
          Rejected
        </span>
      );
    }
    if (item.is_flagged_for_review || item.status === 'UNDER_REVIEW') {
      return (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-200 text-center whitespace-nowrap">
          Review Needed
        </span>
      );
    }
    return (
      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500 text-white text-center whitespace-nowrap">
        Awaiting Confirmation
      </span>
    );
  };

  const getConfidenceColor = (score) => {
    if (score >= 0.80) return 'bg-emerald-500';
    if (score >= 0.60) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // For confidence and urgency, default to high to low ('desc'). For name/service/status, default to A to Z ('asc')
      setSortDirection(field === 'confidence' || field === 'urgency' ? 'desc' : 'asc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-slate-900 stroke-[2.5]" />
    ) : (
      <ArrowDown className="w-3 h-3 text-slate-900 stroke-[2.5]" />
    );
  };

  const sortedIntakes = [...intakes].sort((a, b) => {
    if (!sortField) return 0;
    let valA, valB;

    if (sortField === 'confidence') {
      valA = a.confidence_score ?? 0;
      valB = b.confidence_score ?? 0;
      return sortDirection === 'desc' ? valB - valA : valA - valB;
    }

    if (sortField === 'service') {
      valA = (a.primary_service || '').toLowerCase();
      valB = (b.primary_service || '').toLowerCase();
      return sortDirection === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
    }

    if (sortField === 'status') {
      const getStatusLabel = (item) => {
        if (item.status === 'APPROVED') return 'Approved';
        if (item.status === 'REJECTED') return 'Rejected';
        if (item.is_flagged_for_review || item.status === 'UNDER_REVIEW') return 'Review Needed';
        return 'Awaiting Confirmation';
      };
      valA = getStatusLabel(a).toLowerCase();
      valB = getStatusLabel(b).toLowerCase();
      return sortDirection === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
    }

    if (sortField === 'client') {
      valA = (a.client_name || a.business_name || '').toLowerCase();
      valB = (b.client_name || b.business_name || '').toLowerCase();
      return sortDirection === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
    }

    if (sortField === 'urgency') {
      const order = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      valA = order[a.urgency?.toUpperCase()] || 0;
      valB = order[b.urgency?.toUpperCase()] || 0;
      return sortDirection === 'desc' ? valB - valA : valA - valB;
    }

    return 0;
  });

  return (
    <div className="flex flex-col h-full space-y-3.5">
      {/* Top Title & Search Bar Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Client Inquiries</h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {intakes.length}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Search Box */}
          <div className="relative w-48 xl:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search inquiries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* Add New Inquiry Button */}
          <button
            type="button"
            onClick={onOpenNewModal}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-white hover:bg-slate-900 transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Inquiry
          </button>
        </div>
      </div>

      {/* Filter Tabs & Dropdowns Row */}
      <div className="flex items-center gap-2.5 relative">
        {/* Segmented Pill Tabs (All, Review Needed, Awaiting Confirmation, Approved, Rejected) */}
        <div className="inline-flex bg-slate-200/90 p-0.5 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTabFilter('ALL')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
              tabFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setTabFilter('FLAGGED')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
              tabFilter === 'FLAGGED'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Review Needed
          </button>
          <button
            type="button"
            onClick={() => setTabFilter('CLEAN')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
              tabFilter === 'CLEAN'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Awaiting Confirmation
          </button>
          <button
            type="button"
            onClick={() => setTabFilter('APPROVED')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
              tabFilter === 'APPROVED'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Approved
          </button>
          <button
            type="button"
            onClick={() => setTabFilter('REJECTED')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
              tabFilter === 'REJECTED'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rejected
          </button>
        </div>

        {/* Services Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsServiceDropdownOpen(!isServiceDropdownOpen);
              setIsUrgencyDropdownOpen(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <span>{serviceFilter ? services.find(s => s.id === serviceFilter)?.name || 'Services' : 'Services'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {isServiceDropdownOpen && (
            <div className="absolute left-0 top-8 z-30 w-56 rounded-xl bg-white border border-slate-200 shadow-lg p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => { setServiceFilter(''); setIsServiceDropdownOpen(false); }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                  !serviceFilter
                    ? 'bg-slate-100 text-slate-900 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                All Services
              </button>
              {services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setServiceFilter(s.id); setIsServiceDropdownOpen(false); }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs cursor-pointer ${
                    serviceFilter === s.id
                      ? 'bg-slate-100 text-slate-900 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Urgency Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsUrgencyDropdownOpen(!isUrgencyDropdownOpen);
              setIsServiceDropdownOpen(false);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              urgencyFilter
                ? 'border-meridian-300 bg-meridian-50/50 text-meridian-900'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>
              {urgencyFilter === 'HIGH'
                ? 'Urgency: High'
                : urgencyFilter === 'MEDIUM'
                ? 'Urgency: Medium'
                : urgencyFilter === 'LOW'
                ? 'Urgency: Low'
                : 'Urgency'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {isUrgencyDropdownOpen && (
            <div className="absolute left-0 top-8 z-30 w-44 rounded-xl bg-white border border-slate-200 shadow-lg p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => { setUrgencyFilter?.(''); setIsUrgencyDropdownOpen(false); }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                  !urgencyFilter
                    ? 'bg-slate-100 text-slate-900 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                All Urgencies
              </button>
              <button
                type="button"
                onClick={() => { setUrgencyFilter?.('HIGH'); setIsUrgencyDropdownOpen(false); }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between cursor-pointer ${
                  urgencyFilter === 'HIGH'
                    ? 'bg-rose-50 text-rose-700 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>High</span>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
              </button>
              <button
                type="button"
                onClick={() => { setUrgencyFilter?.('MEDIUM'); setIsUrgencyDropdownOpen(false); }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between cursor-pointer ${
                  urgencyFilter === 'MEDIUM'
                    ? 'bg-amber-50 text-amber-700 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>Medium</span>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              </button>
              <button
                type="button"
                onClick={() => { setUrgencyFilter?.('LOW'); setIsUrgencyDropdownOpen(false); }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between cursor-pointer ${
                  urgencyFilter === 'LOW'
                    ? 'bg-slate-100 text-slate-900 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>Low</span>
                <span className="w-2 h-2 rounded-full bg-slate-400" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          {/* Interactive Sortable Table Header Row */}
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold text-[11px] uppercase tracking-wider select-none">
              <th
                onClick={() => handleSort('client')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors group"
                title="Sort by Client Name"
              >
                <div className="flex items-center gap-1.5">
                  <span>Client / Source</span>
                  {renderSortIcon('client')}
                </div>
              </th>
              <th
                onClick={() => handleSort('urgency')}
                className="py-3 px-2 text-center cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors group"
                title="Sort by Urgency Level"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Urgency</span>
                  {renderSortIcon('urgency')}
                </div>
              </th>
              <th
                onClick={() => handleSort('service')}
                className="py-3 px-2.5 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors group"
                title="Sort alphabetically by Service Name"
              >
                <div className="flex items-center gap-1.5">
                  <span>Service</span>
                  {renderSortIcon('service')}
                </div>
              </th>
              <th
                onClick={() => handleSort('confidence')}
                className="py-3 px-2.5 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors group"
                title="Sort by Confidence Score (High to Low)"
              >
                <div className="flex items-center gap-1.5">
                  <span>Confidence</span>
                  {renderSortIcon('confidence')}
                </div>
              </th>
              <th
                onClick={() => handleSort('status')}
                className="py-3 px-2 text-center cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors group"
                title="Sort by Intake Status"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Status</span>
                  {renderSortIcon('status')}
                </div>
              </th>
              <th className="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan="6" className="py-12 text-center text-slate-400">
                  Loading intakes...
                </td>
              </tr>
            ) : sortedIntakes.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-12 text-center text-slate-400">
                  No intake records found.
                </td>
              </tr>
            ) : (
              sortedIntakes.map((item, idx) => {
                const isSelected = item.id === selectedIntakeId;
                const pctScore = Math.round(item.confidence_score * 100);
                const source = getSourceChannel(item, idx);
                const clientDisplayName = item.client_name || 'Unknown Client';
                const initialChar = (item.client_name || item.business_name || 'U').charAt(0).toUpperCase();

                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectIntake(item.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-slate-100/90 font-medium'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Client & Source */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {initialChar}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 leading-snug truncate max-w-[140px] xl:max-w-[170px]">
                            {clientDisplayName}
                          </div>
                          {item.business_name && (
                            <div className="text-[11px] font-medium text-indigo-900 truncate max-w-[140px] xl:max-w-[170px]" title={item.business_name}>
                              {item.business_name}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400">
                            {source}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Urgency */}
                    <td className="py-3 px-2 text-center align-middle">
                      {getUrgencyBadge(item, idx)}
                    </td>

                    {/* Service */}
                    <td className="py-3 px-2.5 text-slate-800 font-medium">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="truncate max-w-[140px] xl:max-w-[170px]">{item.primary_service || 'Uncategorized'}</span>
                        {item.required_services && item.required_services.length > 1 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800 whitespace-nowrap" title={`${item.required_services.length} Required Services`}>
                            +{item.required_services.length - 1} req
                          </span>
                        )}
                        {item.suggested_services && item.suggested_services.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-800 whitespace-nowrap" title={`${item.suggested_services.length} Suggested Services`}>
                            +{item.suggested_services.length} suggested
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Confidence Meter */}
                    <td className="py-3 px-2.5 whitespace-nowrap">
                      <div className="relative inline-flex items-center gap-2 group">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden flex-shrink-0 cursor-help">
                          <div
                            className={`h-full rounded-full ${getConfidenceColor(item.confidence_score)}`}
                            style={{ width: `${pctScore}%` }}
                          />
                        </div>
                        <span className={`text-[11px] font-bold ${pctScore < 80 ? 'cursor-help text-slate-800' : 'text-slate-800'}`}>
                          {pctScore}%
                        </span>

                        {/* Hover Tooltip when confidence is yellow or red (<80%) */}
                        {pctScore < 80 && (
                          <div
                            className={`absolute right-0 hidden group-hover:block z-50 w-80 max-w-sm whitespace-normal break-words p-3.5 rounded-xl bg-slate-900 text-white shadow-2xl border border-slate-700 text-left pointer-events-none animate-in fade-in zoom-in-95 duration-150 ${
                              idx <= 1 ? 'top-full mt-2' : 'bottom-full mb-2'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-2 border-b border-slate-800 pb-1.5">
                              <span className="font-bold text-[11px] text-amber-400">🔍 Confidence Rationale ({pctScore}%)</span>
                            </div>
                            {item.flag_reasons && item.flag_reasons.filter(r => !r.toLowerCase().includes('statutory') && !r.toLowerCase().includes('deadline')).length > 0 ? (
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Identified Factors:</p>
                                <ul className="space-y-1.5 text-[11px] text-slate-100">
                                  {item.flag_reasons.filter(r => !r.toLowerCase().includes('statutory') && !r.toLowerCase().includes('deadline')).map((reason, rIdx) => (
                                    <li key={rIdx} className="flex items-start gap-1.5 leading-snug">
                                      <span className="text-amber-400 font-bold flex-shrink-0">•</span>
                                      <span className="break-words">{reason}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : item.confidence_rationale ? (
                              <p className="text-[11px] text-slate-100 leading-relaxed font-normal break-words">{item.confidence_rationale}</p>
                            ) : (
                              <p className="text-[11px] text-slate-100 leading-relaxed font-normal">
                                Confidence lowered due to incomplete details or service scope ambiguity.
                              </p>
                            )}
                            {idx <= 1 ? (
                              <div className="absolute right-6 bottom-full w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-slate-900" />
                            ) : (
                              <div className="absolute right-6 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900" />
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-2 text-center align-middle">
                      {getStatusBadge(item)}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-right align-middle whitespace-nowrap">
                      <div className="flex items-center justify-end">
                        {onDeleteIntake && (
                          <button
                            type="button"
                            title="Delete Intake"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(item);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Intake Record"
        message={`Are you sure you want to permanently delete the intake for ${deleteTarget?.client_name || deleteTarget?.business_name || 'this client'}? This action cannot be undone.`}
        confirmText="Delete Record"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          if (onDeleteIntake && deleteTarget) {
            onDeleteIntake(deleteTarget.id);
          }
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
