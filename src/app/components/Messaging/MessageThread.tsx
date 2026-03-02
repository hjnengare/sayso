'use client';

import React from 'react';
import { Loader2 } from "@/app/lib/icons";
import type { ConversationMessage, MessagingRole } from '@/app/hooks/messaging';
import { MessageBubbleAvatar } from './MessageBubbleAvatar';

interface MessageVisualIdentity { name: string; avatarUrl: string | null; }

interface MessageThreadProps {
  messages: ConversationMessage[];
  messagesLoading: boolean;
  hasMore: boolean;
  isLoadingOlder: boolean;
  onLoadOlder: () => void;
  role: MessagingRole;
  animatedMessageIds: Set<string>;
  prefersReducedMotion: boolean | null | undefined;
  resolveMessageIdentity: (ownMessage: boolean) => MessageVisualIdentity;
  onRetryMessage: (message: ConversationMessage) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

function getStatusLabel(message: ConversationMessage): string {
  if (message.client_state === 'sending') return 'Sending';
  if (message.client_state === 'failed') return 'Failed';
  if (message.status === 'read') return 'Read';
  if (message.status === 'delivered') return 'Delivered';
  return 'Sent';
}

function formatThreadTimestamp(value: string): string {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function MessageThread({
  messages,
  messagesLoading,
  hasMore,
  isLoadingOlder,
  onLoadOlder,
  role,
  animatedMessageIds,
  prefersReducedMotion,
  resolveMessageIdentity,
  onRetryMessage,
  scrollRef,
}: MessageThreadProps) {
  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-off-white px-4 py-5 sm:px-6">
      {messagesLoading && (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-charcoal/35" />
        </div>
      )}

      {!messagesLoading && (
        <>
          {hasMore && (
            <div className="mb-5 flex justify-center">
              <button
                type="button"
                onClick={onLoadOlder}
                disabled={isLoadingOlder}
                className="inline-flex items-center gap-1.5 rounded-full bg-charcoal/[0.06] px-4 py-1.5 text-xs font-semibold text-charcoal/55 transition-colors hover:bg-charcoal/[0.09] disabled:opacity-60"
                style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
              >
                {isLoadingOlder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Load earlier messages
              </button>
            </div>
          )}

          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-charcoal/45" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                Start the conversation.
              </p>
            </div>
          )}

          {messages.length > 0 && (
            <div className="space-y-[2px]">
              {messages.map((message, index) => {
                const ownMessage = message.sender_type === role;
                const prevMessage = index > 0 ? messages[index - 1] : null;
                const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
                const isFirstInGroup = !prevMessage || prevMessage.sender_type !== message.sender_type;
                const isLastInGroup = !nextMessage || nextMessage.sender_type !== message.sender_type;
                const statusLabel = getStatusLabel(message);
                const senderIdentity = resolveMessageIdentity(ownMessage);
                const shouldAnimateMessage = animatedMessageIds.has(message.id);
                const animationClassName = shouldAnimateMessage
                  ? prefersReducedMotion
                    ? 'message-bubble-enter-reduced'
                    : 'message-bubble-enter'
                  : '';

                // Instagram-style corner radii: full round except the corner touching the avatar side
                const ownBubbleRadius = isFirstInGroup && isLastInGroup
                  ? 'rounded-[20px]'
                  : isFirstInGroup
                    ? 'rounded-[20px] rounded-br-[6px]'
                    : isLastInGroup
                      ? 'rounded-[20px] rounded-tr-[6px]'
                      : 'rounded-[20px] rounded-r-[6px]';
                const otherBubbleRadius = isFirstInGroup && isLastInGroup
                  ? 'rounded-[20px]'
                  : isFirstInGroup
                    ? 'rounded-[20px] rounded-bl-[6px]'
                    : isLastInGroup
                      ? 'rounded-[20px] rounded-tl-[6px]'
                      : 'rounded-[20px] rounded-l-[6px]';

                return (
                  <div
                    key={message.id}
                    className={`flex ${ownMessage ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-4' : 'mt-[3px]'} ${animationClassName}`}
                  >
                    <div className={`flex items-end gap-2 max-w-[82%] sm:max-w-[65%] ${ownMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar — only on last message of group, recipient side only */}
                      {!ownMessage ? (
                        isLastInGroup ? (
                          <MessageBubbleAvatar name={senderIdentity.name} avatarUrl={senderIdentity.avatarUrl} />
                        ) : (
                          <div className="h-8 w-8 flex-shrink-0 sm:h-9 sm:w-9" aria-hidden />
                        )
                      ) : null}

                      <div className="flex flex-col gap-[2px]">
                        {/* Bubble */}
                        <div
                          className={`px-4 py-2.5 ${
                            ownMessage
                              ? `bg-navbar-bg text-white ${ownBubbleRadius}`
                              : `bg-charcoal/[0.08] text-charcoal ${otherBubbleRadius}`
                          }`}
                        >
                          <p
                            className="whitespace-pre-wrap break-words text-sm leading-relaxed"
                            style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
                          >
                            {message.body}
                          </p>
                        </div>

                        {/* Timestamp + status — only on last message of group */}
                        {isLastInGroup && (
                          <div className={`flex items-center gap-1 px-1 text-[11px] text-charcoal/40 ${ownMessage ? 'justify-end' : 'justify-start'}`}>
                            <span>{formatThreadTimestamp(message.created_at)}</span>
                            {ownMessage && (
                              <>
                                <span aria-hidden>·</span>
                                <span>{statusLabel}</span>
                                {message.client_state === 'failed' && (
                                  <button
                                    type="button"
                                    onClick={() => { void onRetryMessage(message); }}
                                    className="ml-1 rounded-full bg-coral/10 px-2 py-0.5 text-[10px] font-semibold text-coral transition-colors hover:bg-coral/20"
                                  >
                                    Retry
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
