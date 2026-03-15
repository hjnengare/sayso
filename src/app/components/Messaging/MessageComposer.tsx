'use client';

import React from 'react';
import { Loader2, Send } from "@/app/lib/icons";

const QUICK_REPLIES = [
  "Thanks so much for your review! 🙏",
  "We'd love to make it right — can you share more details?",
  "Thank you for visiting! We hope to see you again soon.",
];

interface MessageComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isSending: boolean;
  showTemplates?: boolean;
}

export function MessageComposer({ value, onChange, onSend, isSending, showTemplates = false }: MessageComposerProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  };

  return (
    <div
      className="border-t border-charcoal/8 bg-off-white px-4 py-3 sm:px-5"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {showTemplates && (
        <div className="flex flex-wrap gap-2 mb-2">
          {QUICK_REPLIES.map((template) => (
            <button
              key={template}
              type="button"
              onClick={() => onChange(template)}
              className="rounded-full bg-off-white border border-charcoal/15 px-3 py-1 text-xs font-medium text-charcoal/70 hover:border-charcoal/30 hover:text-charcoal transition-colors"
              style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
            >
              {template}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-3">
        <div className="flex flex-1 items-end rounded-[24px] border border-charcoal/15 bg-off-white px-4 py-2.5 focus-within:border-charcoal/25 transition-colors">
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            placeholder="Message..."
            rows={1}
            className="max-h-[120px] min-h-[22px] flex-1 resize-none bg-transparent text-sm text-charcoal placeholder:text-charcoal/40 focus:outline-none disabled:opacity-70"
            style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
          />
        </div>
        <button
          type="button"
          onClick={onSend}
          disabled={isSending || !value.trim()}
          className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-navbar-bg text-white transition-[background-color,opacity] hover:bg-navbar-bg/90 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Send message"
        >
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
