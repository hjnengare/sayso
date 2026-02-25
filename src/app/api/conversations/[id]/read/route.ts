import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';
import { getConversationAccessContext, isConversationSchemaDriftError } from '@/app/api/conversations/_lib';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

const MESSAGE_SCHEMA_DRIFT_MARKERS = [
  'schema cache',
  'does not exist',
  'status',
  'sender_type',
  'delivered_at',
  'read_at',
];

function isMessageSchemaDriftError(error: any): boolean {
  if (!error) return false;
  const haystack = [
    error?.code,
    error?.message,
    error?.details,
    error?.hint,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return MESSAGE_SCHEMA_DRIFT_MARKERS.some((marker) => haystack.includes(marker));
}

export const POST = withUser(async (_req: NextRequest, { user, supabase, params }) => {
  try {
    const { id: conversationId } = await (params as RouteContext['params']);

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    const access = await getConversationAccessContext(supabase, conversationId, user.id);
    if (!access) {
      return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 });
    }

    const senderTypeToMarkRead = access.role === 'user' ? 'business' : 'user';
    const senderUserIdToMarkRead = access.role === 'user'
      ? access.conversation.owner_id
      : access.conversation.user_id;
    const nowIso = new Date().toISOString();

    const { data: modernUpdatedRows, error: modernUpdateError } = await supabase
      .from('messages')
      .update({
        status: 'read',
        read: true,
        delivered_at: nowIso,
        read_at: nowIso,
      })
      .eq('conversation_id', conversationId)
      .eq('sender_type', senderTypeToMarkRead)
      .neq('status', 'read')
      .select('id');

    let updatedRows = modernUpdatedRows || [];
    let finalUpdateError = modernUpdateError;

    if (modernUpdateError && isMessageSchemaDriftError(modernUpdateError)) {
      let legacyUpdateQuery = supabase
        .from('messages')
        .update({
          read: true,
          updated_at: nowIso,
        })
        .eq('conversation_id', conversationId)
        .eq('read', false);

      if (senderUserIdToMarkRead) {
        legacyUpdateQuery = legacyUpdateQuery.eq('sender_id', senderUserIdToMarkRead);
      } else {
        legacyUpdateQuery = legacyUpdateQuery.neq('sender_id', user.id);
      }

      const { data: legacyUpdatedRows, error: legacyUpdateError } = await legacyUpdateQuery.select('id');
      updatedRows = legacyUpdatedRows || [];
      finalUpdateError = legacyUpdateError;
    }

    if (finalUpdateError) {
      console.error('[Conversation Read API] Update error:', finalUpdateError);
      return NextResponse.json(
        { error: 'Failed to mark messages as read', details: finalUpdateError?.message || null },
        { status: 500 }
      );
    }

    const { data: modernConversation, error: modernConversationError } = await supabase
      .from('conversations')
      .select('id, user_unread_count, business_unread_count')
      .eq('id', conversationId)
      .maybeSingle();

    let conversation: any = modernConversation;
    if (modernConversationError && isConversationSchemaDriftError(modernConversationError)) {
      const { data: legacyConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .maybeSingle();
      conversation = legacyConversation;
    }

    return NextResponse.json({
      data: {
        conversation_id: conversationId,
        marked_count: (updatedRows || []).length,
        unread_count: access.role === 'user'
          ? Number(conversation?.user_unread_count || 0)
          : Number(conversation?.business_unread_count || 0),
      },
    });
  } catch (error: any) {
    console.error('[Conversation Read API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error?.message }, { status: 500 });
  }
});
