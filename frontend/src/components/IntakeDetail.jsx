import React, { useState } from 'react';
import { AlertTriangle, Flag, Trash2, CheckCircle, XCircle, Clock, Plus, X, Layers, ArrowUp, RotateCcw } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export default function IntakeDetail({
  intake,
  services = [],
  onUpdateStatus,
  onDeleteIntake,
  onAddService,
  onRemoveService,
  isUpdating
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addType, setAddType] = useState('REQUIRED'); // 'REQUIRED' | 'SUGGESTED'
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [customRationale, setCustomRationale] = useState('');
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    variant: 'danger',
    onConfirm: () => {}
  });

  if (!intake) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 flex flex-col items-center justify-center h-full">
        <p className="text-sm font-semibold text-slate-600">No Intake Selected</p>
        <p className="text-xs text-slate-400 mt-1">Select an intake from the queue on the left.</p>
      </div>
    );
  }

  const clientName = intake.client_name || 'Unknown Client';
  const source = intake.contact_info?.email ? 'Email' : 'Voicemail';
  const isHighUrgency = intake.urgency?.toUpperCase() === 'HIGH';

  const allMatches = intake.matched_services || [];
  const requiredServices = allMatches.filter(m => m.match_type === 'REQUIRED' || (!m.match_type && m.is_primary));
  const suggestedServices = allMatches.filter(m => m.match_type === 'SUGGESTED' || (!m.match_type && !m.is_primary));
  const hasRequiredServices = requiredServices.length > 0;
  const hasClientName = Boolean(intake.client_name && intake.client_name.trim());
  const hasContactInfo = Boolean(intake.contact_info?.phone || intake.contact_info?.email);
  const canApprove = hasClientName && hasContactInfo && hasRequiredServices;

  const attachedServiceIds = allMatches.map(m => m.service_id);
  const availableServices = services.filter(s => !attachedServiceIds.includes(s.id));

  // Open modal to add service
  const handleOpenAdd = (type) => {
    setAddType(type);
    const existingIds = (intake.matched_services || []).map(m => m.service_id);
    const available = services.filter(s => !existingIds.includes(s.id));
    setSelectedServiceId(available.length > 0 ? available[0].id : '');
    setCustomRationale('');
    setIsAddOpen(true);
  };

  const handleSaveAddService = (e) => {
    e.preventDefault();
    if (!selectedServiceId) return;
    if (onAddService) {
      onAddService(intake.id, selectedServiceId, addType, customRationale);
    }
    setIsAddOpen(false);
  };

  // Highlight key phrases in transcript
  const renderHighlightedTranscript = (text) => {
    const keywords = [
      'estate stuff',
      'estate taxes',
      'retirement planning',
      'retirement thing',
      'dad passed',
      'business taxes',
      'quarterly stuff',
      'finances month to month',
      'audit protection',
      'run the finance side',
      'profitable',
      'call me back',
      'llc to an s-corp',
      'bookkeeping myself',
      'hiring another crew'
    ];

    let segments = [text];

    keywords.forEach((keyword) => {
      let nextSegments = [];
      segments.forEach((seg) => {
        if (typeof seg !== 'string') {
          nextSegments.push(seg);
          return;
        }
        const regex = new RegExp(`(${keyword})`, 'gi');
        const parts = seg.split(regex);
        parts.forEach((part) => {
          if (part.toLowerCase() === keyword.toLowerCase()) {
            nextSegments.push(
              <span key={Math.random()} className="bg-sky-100 text-sky-900 px-1 py-0.5 rounded font-semibold">
                {part}
              </span>
            );
          } else if (part) {
            nextSegments.push(part);
          }
        });
      });
      segments = nextSegments;
    });

    return segments;
  };

  return (
    <div className="flex flex-col h-full space-y-3.5 relative">
      {/* Header Row */}
      <div className="flex items-center justify-between pb-0.5 gap-2 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {intake.client_name || intake.business_name || 'Inquiry Details'}
          </h2>
          {intake.client_name && intake.business_name && (
            <p className="text-xs font-semibold text-slate-500 mt-0.5">{intake.business_name}</p>
          )}
        </div>
        <div>
          {intake.status === 'APPROVED' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-2xs">
              <CheckCircle className="w-3.5 h-3.5" />
              Approved
            </span>
          ) : intake.status === 'REJECTED' ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
              Rejected
            </span>
          ) : (intake.is_flagged_for_review || intake.status === 'UNDER_REVIEW') ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
              Review Needed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-sky-500 text-white shadow-2xs">
              Awaiting Confirmation
            </span>
          )}
        </div>
      </div>

      {/* Main Content Area: Responsive Grid Cards */}
      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3.5 flex-1 overflow-y-auto min-h-0 pr-1">
        
        {/* Left Sub-Card: Raw Spoken Transcript */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex flex-col h-auto 2xl:h-full">
          <h3 className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">Raw Spoken Transcript</h3>
          <div className="flex-1 overflow-y-auto text-xs text-slate-700 leading-relaxed space-y-2 font-sans">
            <p className="whitespace-pre-wrap">{renderHighlightedTranscript(intake.raw_transcript)}</p>
          </div>
        </div>

        {/* Right Sub-Card: Extracted Structured Data */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-3 overflow-y-auto flex flex-col justify-between">
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Extracted Structured Data</h3>

            {/* Client Name Box */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-0.5">Client Name</label>
              <div className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center justify-between ${
                hasClientName
                  ? 'border-slate-200 bg-white text-slate-900'
                  : 'border-amber-200 bg-amber-50/50 text-slate-800'
              }`}>
                <span>{intake.client_name || <span className="text-slate-400 italic">Not Provided</span>}</span>
                {!hasClientName && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                    Missing (Required for approval)
                  </span>
                )}
              </div>
            </div>

            {/* Business / Company Name Box */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-0.5">Business / Entity Name</label>
              <div className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800">
                {intake.business_name ? (
                  <span className="font-semibold text-slate-900">{intake.business_name}</span>
                ) : (
                  <span className="text-slate-400 italic">None Provided in Transcript</span>
                )}
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-0.5">Contact Info</label>
              <div className={`flex items-center justify-between gap-2 flex-wrap text-xs font-medium p-1.5 rounded-lg border ${
                hasContactInfo ? 'border-transparent text-slate-800' : 'border-amber-200 bg-amber-50/50'
              }`}>
                <span>
                  {intake.contact_info?.phone && intake.contact_info?.email
                    ? `${intake.contact_info.phone} • ${intake.contact_info.email}`
                    : intake.contact_info?.phone || intake.contact_info?.email || 'None Provided'}
                </span>
                {!hasContactInfo && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                    Missing (Phone or Email required for approval)
                  </span>
                )}
              </div>
            </div>

            {/* Required & Suggested Services Sections */}
            <div className="space-y-3">
              {/* Required Services Block */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Required Services</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-slate-800 text-white">
                      {requiredServices.length}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleOpenAdd('REQUIRED')}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Add Required
                  </button>
                </div>

                <div className="space-y-1.5">
                  {requiredServices.length > 0 ? (
                    requiredServices.map((m, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-300 text-xs shadow-2xs group relative">
                        <div className="flex items-center justify-between gap-1.5 mb-1">
                          <span className="font-bold text-slate-900 pr-6">{m.service_name}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white tracking-wide uppercase">
                              Required
                            </span>
                            {onRemoveService && (
                              <button
                                type="button"
                                title="Remove Service"
                                onClick={() => {
                                  setConfirmModal({
                                    isOpen: true,
                                    title: 'Remove Required Service',
                                    message: `Are you sure you want to remove "${m.service_name}" from required services for this intake?`,
                                    confirmText: 'Remove Service',
                                    cancelText: 'Cancel',
                                    variant: 'danger',
                                    onConfirm: () => {
                                      setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                      onRemoveService(intake.id, m.service_id);
                                    }
                                  });
                                }}
                                className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        {m.rationale && (
                          <p className="text-[11px] text-slate-700 leading-normal">{m.rationale}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-[11px] text-amber-800 font-medium p-2.5 rounded-lg bg-amber-50 border border-dashed border-amber-300">
                      ⚠️ No required services assigned. At least 1 required service must be added before this intake can be approved.
                    </div>
                  )}
                </div>
              </div>

              {/* Suggested Services Block */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Suggested / Advisory Services</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-indigo-600 text-white">
                      {suggestedServices.length}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleOpenAdd('SUGGESTED')}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-900 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Add Suggested
                  </button>
                </div>

                <div className="space-y-1.5">
                  {suggestedServices.length > 0 ? (
                    suggestedServices.map((m, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-200 text-xs group relative">
                        <div className="flex items-center justify-between gap-1.5 mb-1 flex-wrap">
                          <span className="font-bold text-indigo-950 pr-4">{m.service_name}</span>
                          <div className="flex items-center gap-1.5">
                            {/* Action to move/promote to Required panel */}
                            <button
                              type="button"
                              title="Move service to Required panel"
                              onClick={() => {
                                if (onAddService) {
                                  onAddService(intake.id, m.service_id, 'REQUIRED', m.rationale);
                                }
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 transition-colors shadow-2xs cursor-pointer"
                            >
                              <ArrowUp className="w-3.5 h-3.5 text-slate-600" />
                              <span>Move to Required</span>
                            </button>

                            {onRemoveService && (
                              <button
                                type="button"
                                title="Remove Service"
                                onClick={() => {
                                  setConfirmModal({
                                    isOpen: true,
                                    title: 'Remove Suggested Service',
                                    message: `Are you sure you want to remove "${m.service_name}" from suggested services for this intake?`,
                                    confirmText: 'Remove Service',
                                    cancelText: 'Cancel',
                                    variant: 'danger',
                                    onConfirm: () => {
                                      setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                      onRemoveService(intake.id, m.service_id);
                                    }
                                  });
                                }}
                                className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        {m.rationale && (
                          <p className="text-[11px] text-indigo-900/80 leading-normal">{m.rationale}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-[11px] text-slate-400 italic p-2 rounded bg-slate-50 border border-dashed border-slate-200">
                      No suggested advisory services. Click "+ Add Suggested" to add one.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Urgency Level */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-0.5">Urgency Level</label>
              <div className="relative inline-block group">
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold text-white ${
                    isHighUrgency ? 'bg-rose-600 cursor-help shadow-2xs' : intake.urgency === 'MEDIUM' ? 'bg-amber-500' : 'bg-slate-500'
                  }`}
                >
                  {intake.urgency || 'Low'}
                </span>
                {isHighUrgency && (
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-72 p-2.5 rounded-xl bg-slate-900 text-white shadow-2xl border border-slate-700 text-left pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center gap-1.5 font-bold text-[11px] text-rose-400 mb-1">
                      <span>⚡ High Urgency Rationale</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-200 font-normal">
                      {intake.urgency_rationale || 'Potential statutory filing deadline or high-risk timeline requiring immediate attention.'}
                    </p>
                    <div className="absolute left-4 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900" />
                  </div>
                )}
              </div>
            </div>

            {/* Statutory Tax Deadline Alert Banner (High Urgency Only) */}
            {isHighUrgency && (
              <div className="p-2.5 rounded-lg bg-rose-50/90 border border-rose-200 text-rose-900 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Statutory Tax Deadline Alert:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-rose-800 pl-5">
                  {intake.urgency_rationale || 'Potential statutory filing deadline risk - Prioritize review.'}
                </p>
              </div>
            )}

            {/* Review Flags */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Review Flags</label>
              <ul className="space-y-1 text-xs text-slate-700">
                {intake.flag_reasons && intake.flag_reasons.length > 0 ? (
                  intake.flag_reasons.map((flag, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <Flag className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <span className="text-[11px] text-slate-800">{flag}</span>
                    </li>
                  ))
                ) : (
                  <li className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Clean intake — No active triage flags</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons Row */}
      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
        {/* Left Side: Delete Action */}
        <div>
          {onDeleteIntake && (
            <button
              type="button"
              onClick={() => {
                setConfirmModal({
                  isOpen: true,
                  title: 'Delete Intake Record',
                  message: `Are you sure you want to permanently delete the intake for ${intake.client_name || intake.business_name || 'this client'}? This action cannot be undone.`,
                  confirmText: 'Delete Record',
                  cancelText: 'Cancel',
                  variant: 'danger',
                  onConfirm: () => {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    onDeleteIntake(intake.id);
                  }
                });
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Intake
            </button>
          )}
        </div>

        {/* Right Side: Status Management Actions */}
        <div className="flex items-center gap-2 flex-wrap">

          <button
            type="button"
            onClick={() => {
              if (intake.status === 'APPROVED') {
                onUpdateStatus(intake.id, 'PROCESSED');
              } else {
                onUpdateStatus(intake.id, 'APPROVED');
              }
            }}
            disabled={isUpdating || (intake.status !== 'APPROVED' && !canApprove)}
            title={
              intake.status === 'APPROVED'
                ? 'Currently Approved. Click to unapprove and restore to previous queue state.'
                : !canApprove
                ? `Cannot approve: ${[
                    !hasClientName ? 'Client Name is missing' : null,
                    !hasContactInfo ? 'Contact Info is missing (phone or email required)' : null,
                    !hasRequiredServices ? 'At least 1 required service must be assigned' : null
                  ].filter(Boolean).join('; ')}.`
                : 'Approve & Assign this intake'
            }
            className={`group px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              intake.status === 'APPROVED'
                ? 'bg-emerald-600 hover:bg-rose-600 text-white shadow-xs cursor-pointer'
                : !canApprove
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 cursor-pointer shadow-2xs'
            }`}
          >
            {intake.status === 'APPROVED' ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 group-hover:hidden" />
                <RotateCcw className="w-3.5 h-3.5 hidden group-hover:inline" />
                <span className="group-hover:hidden">Approved</span>
                <span className="hidden group-hover:inline">Unapprove</span>
              </>
            ) : (
              <span>Approve & Assign</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (intake.status === 'REJECTED') {
                onUpdateStatus(intake.id, 'PROCESSED');
              } else {
                onUpdateStatus(intake.id, 'REJECTED');
              }
            }}
            disabled={isUpdating}
            title={
              intake.status === 'REJECTED'
                ? 'Currently Rejected. Click to restore to previous queue state.'
                : 'Reject this intake'
            }
            className={`group px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              intake.status === 'REJECTED'
                ? 'bg-rose-600 hover:bg-slate-800 text-white shadow-xs'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300'
            }`}
          >
            {intake.status === 'REJECTED' ? (
              <>
                <XCircle className="w-3.5 h-3.5 group-hover:hidden" />
                <RotateCcw className="w-3.5 h-3.5 hidden group-hover:inline" />
                <span className="group-hover:hidden">Rejected</span>
                <span className="hidden group-hover:inline">Unreject / Restore</span>
              </>
            ) : (
              <span>Reject Intake</span>
            )}
          </button>
        </div>
      </div>

      {/* Add Service Modal for Human Reviewer */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${addType === 'REQUIRED' ? 'bg-slate-900' : 'bg-indigo-600'}`} />
                <h3 className="font-bold text-slate-900 text-sm">
                  Add {addType === 'REQUIRED' ? 'Required Service' : 'Suggested / Advisory Service'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAddService} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Select Practice Service</label>
                {availableServices.length > 0 ? (
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="w-full text-xs font-medium border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer"
                    required
                  >
                    {availableServices.map((svc) => (
                      <option key={svc.id} value={svc.id}>
                        {svc.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs text-slate-500 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    All practice services from the catalog are already attached.
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Category Classification</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAddType('REQUIRED')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      addType === 'REQUIRED'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Required Service
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddType('SUGGESTED')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      addType === 'SUGGESTED'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Suggested Advisory
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">CPA Rationale / Triage Note (Optional)</label>
                <textarea
                  rows={2}
                  value={customRationale}
                  onChange={(e) => setCustomRationale(e.target.value)}
                  placeholder="E.g., Added manually per client request during intake review..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedServiceId || availableServices.length === 0}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow-2xs transition-colors ${
                    !selectedServiceId || availableServices.length === 0
                      ? 'bg-slate-300 cursor-not-allowed'
                      : addType === 'REQUIRED'
                      ? 'bg-slate-900 hover:bg-slate-800'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {addType === 'REQUIRED' ? 'Add to Required' : 'Add to Suggested'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
