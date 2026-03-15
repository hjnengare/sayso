'use client';

import MessagingWorkspace from '@/app/components/Messaging/MessagingWorkspace';
import { useAuth } from '@/app/contexts/AuthContext';
import { useOwnerBusinessesList } from '@/app/hooks/useOwnerBusinessesList';
import { useSearchParams } from 'next/navigation';

export default function BusinessMessagesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();

  const { businesses, isLoading: businessesLoading } = useOwnerBusinessesList(
    user?.id || null
  );

  if (authLoading || businessesLoading) {
    return (
      <div className="bg-off-white">
        <div className="mx-auto flex w-full max-w-7xl overflow-hidden sm:rounded-xl sm:border sm:border-charcoal/8 sm:shadow-sm h-[calc(100dvh-3.5rem)] lg:h-[100dvh] animate-pulse">
          {/* Conversation list sidebar skeleton */}
          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 flex flex-col border-r border-charcoal/8 bg-white">
            {/* Sidebar header */}
            <div className="px-4 py-4 border-b border-charcoal/8">
              <div className="h-6 w-20 rounded-md bg-charcoal/8 mb-3" />
              <div className="h-9 w-full rounded-full bg-charcoal/6" />
            </div>

            {/* Conversation items */}
            <div className="flex-1 overflow-hidden">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3.5 border-b border-charcoal/6">
                  <div className="h-10 w-10 rounded-full bg-charcoal/8 flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-28 rounded-md bg-charcoal/8" />
                      <div className="h-3 w-10 rounded-md bg-charcoal/6" />
                    </div>
                    <div className="h-3 w-full rounded-md bg-charcoal/6" />
                    <div className="h-3 w-2/3 rounded-md bg-charcoal/5" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Thread pane skeleton (desktop) */}
          <div className="hidden lg:flex min-w-0 flex-1 flex-col bg-off-white">
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="h-20 w-20 rounded-full bg-charcoal/6" />
              <div className="mt-4 h-5 w-32 rounded-md bg-charcoal/8" />
              <div className="mt-2 h-4 w-56 rounded-md bg-charcoal/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const businessOptions = businesses.map((business: any) => ({
    id: business.id,
    name: business.name,
    image_url: business.image_url || null,
  }));

  const initialConversationId = searchParams?.get('conversation') || null;
  const initialBusinessId = searchParams?.get('business_id') || null;
  const startUserId = searchParams?.get('user_id') || null;

  return (
    <MessagingWorkspace
      role="business"
      title="Inbox"
      subtitle="All customer conversations"
      viewportClassName="h-[calc(100dvh-3.5rem)] lg:h-[100dvh]"
      businessOptions={businessOptions}
      initialBusinessId={initialBusinessId}
      initialConversationId={initialConversationId}
      startBusinessId={initialBusinessId}
      startUserId={startUserId}
    />
  );
}
