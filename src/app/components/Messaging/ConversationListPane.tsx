'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Loader2, MessageCircle, Search } from 'lucide-react';
import type { ConversationListItem, MessagingRole } from '@/app/hooks/messaging';
import { MessageBubbleAvatar, buildInitials } from './MessageBubbleAvatar';

interface BusinessOption { id: string; name: string; image_url?: string | null; }

interface ReviewedBusinessSuggestion {
  business_id: string;
  business_name: string;
  business_image_url: string | null;
}

interface ConversationListPaneProps {
  title: string;
  unreadTotal: number;
  role: MessagingRole;
  businessOptions?: BusinessOption[];
  activeBusinessId: string | null;
  onActiveBusinessChange: (id: string | null) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  conversationsLoading: boolean;
  isResolvingStartConversation: boolean;
  filteredConversations: ConversationListItem[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  startConversationError: string | null;
  reviewedBusinessSuggestions: ReviewedBusinessSuggestion[];
  getFallbackBusinessName: (conversation: ConversationListItem) => string | undefined;
  listPaneVisibleClass: string;
}

function formatListTimestamp(value: string): string {
  if (!value) return '';

  const date = new Date(value);
  const now = new Date();

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getConversationTitle(conversation: ConversationListItem, role: MessagingRole, fallbackBusinessName?: string): string {
  if (role === 'business') return conversation.participant?.display_name || 'Unknown';
  return conversation.business?.name || fallbackBusinessName || 'Unknown';
}
function getConversationSubtitle(conversation: ConversationListItem, role: MessagingRole, fallbackBusinessName?: string): string {
  if (role === 'business') return conversation.business?.name || fallbackBusinessName || 'Unknown';
  return conversation.business?.category || conversation.business?.name || fallbackBusinessName || 'Unknown';
}
function getConversationAvatar(conversation: ConversationListItem, role: MessagingRole): string | null {
  if (role === 'business') return conversation.participant?.avatar_url || null;
  return conversation.business?.image_url || null;
}

export function ConversationListPane({
  title,
  unreadTotal,
  role,
  businessOptions,
  activeBusinessId,
  onActiveBusinessChange,
  searchQuery,
  onSearchQueryChange,
  conversationsLoading,
  isResolvingStartConversation,
  filteredConversations,
  selectedConversationId,
  onSelectConversation,
  startConversationError,
  reviewedBusinessSuggestions,
  getFallbackBusinessName,
  listPaneVisibleClass,
}: ConversationListPaneProps) {
  return (
    <aside className={`${listPaneVisibleClass} w-full lg:w-[360px] xl:w-[400px] flex-col border-r border-charcoal/8 bg-white`}>

      {/* Header */}
      <div className="px-5 pb-3 pt-5">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-charcoal" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
            {title}
          </h1>
          {unreadTotal > 0 && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-navbar-bg px-1.5 text-[11px] font-bold text-white">
              {unreadTotal > 99 ? '99+' : unreadTotal}
            </span>
          )}
        </div>

        {role === 'business' && businessOptions && businessOptions.length > 0 && (
          <div className="mt-3">
            <label className="sr-only" htmlFor="business-filter">Business filter</label>
            <select
              id="business-filter"
              value={activeBusinessId || '__all__'}
              onChange={(event) => {
                const value = event.target.value;
                onActiveBusinessChange(value === '__all__' ? null : value);
              }}
              className="w-full rounded-xl border-0 bg-charcoal/[0.06] px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/25"
              style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
            >
              <option value="__all__">All businesses</option>
              {businessOptions.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Search — borderless, filled like Instagram */}
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
          <input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search"
            className="w-full rounded-full border-0 bg-charcoal/[0.06] py-2 pl-10 pr-4 text-sm text-charcoal placeholder:text-charcoal/40 focus:bg-charcoal/[0.09] focus:outline-none"
            style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {(conversationsLoading || isResolvingStartConversation) && (
          <div className="flex h-full items-center justify-center">
            <div className="inline-flex items-center gap-2 text-sm text-charcoal/50" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          </div>
        )}

        {!conversationsLoading && !isResolvingStartConversation && filteredConversations.length === 0 && (
          <>
            {searchQuery.trim() ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <Search className="mb-2 h-7 w-7 text-charcoal/20" />
                <p className="text-sm font-semibold text-charcoal/60" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                  No results for &ldquo;{searchQuery}&rdquo;
                </p>
              </div>
            ) : role === 'user' ? (
              <div className="flex h-full flex-col items-center justify-center px-5 py-8 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sage/15">
                  <MessageCircle className="h-6 w-6 text-sage" />
                </div>
                <p className="text-base font-bold text-charcoal" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                  No conversations yet
                </p>
                {reviewedBusinessSuggestions.length > 0 ? (
                  <>
                    <p className="mt-1.5 text-sm text-charcoal/50" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                      Message businesses you&apos;ve reviewed
                    </p>
                    <ul className="mt-5 w-full max-w-[280px] space-y-2.5">
                      {reviewedBusinessSuggestions.map((suggestion) => (
                        <li key={suggestion.business_id}>
                          <Link
                            href={`/dm?business_id=${suggestion.business_id}`}
                            className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left transition-colors hover:bg-charcoal/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navbar-bg/40"
                          >
                            <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-sage/15">
                              {suggestion.business_image_url ? (
                                <Image src={suggestion.business_image_url} alt={suggestion.business_name} fill sizes="40px" className="object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[11px] font-bold text-sage">
                                  {buildInitials(suggestion.business_name)}
                                </div>
                              )}
                            </div>
                            <span className="flex-1 truncate text-sm font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                              {suggestion.business_name}
                            </span>
                            <span className="inline-flex flex-shrink-0 items-center rounded-full bg-navbar-bg px-3 py-1 text-[11px] font-bold text-white">
                              Message
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="mt-1.5 text-sm text-charcoal/50" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                      Discover and review local businesses to start a conversation
                    </p>
                    <Link
                      href="/home"
                      className="mt-5 inline-flex items-center gap-2 rounded-full bg-navbar-bg px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-navbar-bg/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navbar-bg/40"
                      style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
                    >
                      Discover businesses
                    </Link>
                  </>
                )}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sage/15">
                  <MessageCircle className="h-5 w-5 text-sage" />
                </div>
                <p className="text-sm font-semibold text-charcoal/60" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                  No customer messages yet
                </p>
                <p className="mt-1 text-xs text-charcoal/40" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                  Customer conversations will appear here.
                </p>
              </div>
            )}
          </>
        )}

        {startConversationError && (
          <div className="mx-4 mt-4 rounded-xl border border-coral/25 bg-coral/10 px-3 py-2 text-xs text-coral">
            {startConversationError}
          </div>
        )}

        {!conversationsLoading && filteredConversations.length > 0 && (
          <ul className="py-2">
            {filteredConversations.map((conversation) => {
              const isSelected = selectedConversationId === conversation.id;
              const fallbackBusinessName = getFallbackBusinessName(conversation);
              const avatar = getConversationAvatar(conversation, role);
              const name = getConversationTitle(conversation, role, fallbackBusinessName);
              const subtitleValue = getConversationSubtitle(conversation, role, fallbackBusinessName);
              const hasUnread = conversation.unread_count > 0;

              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => onSelectConversation(conversation.id)}
                    className={`flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors duration-100 ${
                      isSelected ? 'bg-sage/[0.08]' : 'hover:bg-charcoal/[0.04]'
                    }`}
                  >
                    {/* Avatar — larger (56 px) with unread ring */}
                    <div className="relative flex-shrink-0">
                      <div className="relative h-14 w-14 overflow-hidden rounded-full bg-sage/15">
                        {avatar ? (
                          <Image src={avatar} alt={name} fill sizes="56px" className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-base font-bold text-sage">
                            {buildInitials(name)}
                          </div>
                        )}
                      </div>
                      {hasUnread && (
                        <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-navbar-bg" aria-hidden />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p
                          className={`truncate text-sm ${hasUnread ? 'font-bold text-charcoal' : 'font-semibold text-charcoal/85'}`}
                          style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
                        >
                          {name}
                        </p>
                        <span className="flex-shrink-0 text-[11px] text-charcoal/35" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                          {formatListTimestamp(conversation.last_message_at)}
                        </span>
                      </div>
                      <p
                        className={`mt-0.5 truncate text-xs ${hasUnread ? 'font-semibold text-charcoal/70' : 'text-charcoal/45'}`}
                        style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
                      >
                        {conversation.last_message_preview || subtitleValue}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
