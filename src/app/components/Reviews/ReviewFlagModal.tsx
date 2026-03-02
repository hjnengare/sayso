'use client';

import { useState } from 'react';
import { X, AlertCircle, Loader2 } from "@/app/lib/icons";

const FLAG_REASONS = [
  { value: 'spam', label: 'Spam', desc: 'Promotional or repetitive content' },
  { value: 'inappropriate', label: 'Inappropriate', desc: 'Offensive or adult content' },
  { value: 'harassment', label: 'Harassment', desc: 'Targets or bullies someone' },
  { value: 'off_topic', label: 'Off-topic', desc: 'Not related to this business' },
  { value: 'other', label: 'Other', desc: 'Something else' },
] as const;

export type FlagReason = (typeof FLAG_REASONS)[number]['value'];

interface ReviewFlagModalProps {
  onClose: () => void;
  onSubmit: (reason: FlagReason, details: string) => Promise<void>;
  submitting: boolean;
}

export function ReviewFlagModal({ onClose, onSubmit, submitting }: ReviewFlagModalProps) {
  const [reason, setReason] = useState<FlagReason | null>(null);
  const [details, setDetails] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!reason) {
      setLocalError('Please select a reason.');
      return;
    }
    if (reason === 'other' && !details.trim()) {
      setLocalError("Please add details for 'Other'.");
      return;
    }
    await onSubmit(reason, details);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-charcoal/20" />
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-2 pb-6 sm:pt-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-urbanist text-lg font-bold text-charcoal">Report Review</h2>
              <p className="font-urbanist text-sm text-charcoal/50">Help us keep sayso trustworthy</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-charcoal/8 text-charcoal/40 hover:text-charcoal transition-colors"
              aria-label="Close report modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-2 mb-4">
            {FLAG_REASONS.map(({ value, label, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setReason(value);
                  setLocalError(null);
                }}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                  reason === value
                    ? 'border-navbar-bg bg-navbar-bg/5'
                    : 'border-charcoal/10 hover:border-charcoal/20 hover:bg-charcoal/[0.025]'
                }`}
              >
                <div className="flex-1">
                  <p className="font-urbanist text-sm font-semibold text-charcoal">{label}</p>
                  <p className="font-urbanist text-xs text-charcoal/50">{desc}</p>
                </div>
                {reason === value && (
                  <div className="w-4 h-4 rounded-full bg-navbar-bg flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 fill-none stroke-white stroke-[1.5]">
                      <polyline points="1.5,5 4,7.5 8.5,2.5" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          {reason && (
            <label className="block mb-4">
              <span className="font-urbanist text-xs font-semibold text-charcoal/60 uppercase tracking-wider mb-1.5 block">
                Additional details {reason === 'other' ? '(required)' : '(optional)'}
              </span>
              <textarea
                value={details}
                onChange={(e) => {
                  setDetails(e.target.value);
                  setLocalError(null);
                }}
                rows={3}
                placeholder="Describe the issue..."
                className="w-full rounded-2xl border border-charcoal/15 bg-charcoal/[0.025] px-4 py-3 font-urbanist text-sm text-charcoal placeholder-charcoal/35 focus:outline-none focus:ring-2 focus:ring-navbar-bg/25 focus:border-navbar-bg/40 resize-none"
              />
            </label>
          )}

          {localError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm font-urbanist mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {localError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-3 rounded-2xl border border-charcoal/15 font-urbanist text-sm font-semibold text-charcoal/70 hover:bg-charcoal/5 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!reason || submitting}
              className="flex-1 py-3 rounded-2xl bg-navbar-bg font-urbanist text-sm font-semibold text-white hover:bg-navbar-bg/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
