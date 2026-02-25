import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';
import {
  decodeCursor,
  encodeCursor,
  getConversationAccessContext,
  parsePositiveInt,
} from '@/app/api/conversations/_lib';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

const MESSAGE_SELECT_V2 =
  'id, conversation_id, body, content, status, sender_type, sender_user_id, sender_business_id, created_at, delivered_at, read_at';
const MESSAGE_SELECT_LEGACY =
  'id, conversation_id, content, sender_id, read, created_at, updated_at';

const MESSAGE_SCHEMA_DRIFT_MARKERS = [
  'schema cache',
  'does not exist',
  'body',
  'status',
  'sender_type',
  'sender_user_id',
  'sender_business_id',
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

function mapMessageRow(row: any, conversationUserId: string, conversationBusinessId: string | null) {
  const senderUserId = row.sender_user_id ?? row.sender_id ?? null;
  const senderType = row.sender_type
    || (senderUserId && senderUserId === conversationUserId ? 'user' : 'business');
  const isRead = row.status === 'read' || Boolean(row.read);

  return {
    id: row.id,
    conversation_id: row.conversation_id,
    body: row.body || row.content || '',
    status: row.status || (isRead ? 'read' : 'sent'),
    sender_type: senderType || 'user',
    sender_user_id: senderUserId,
    sender_business_id:
      row.sender_business_id
      ?? (senderType === 'business' ? conversationBusinessId : null),
    created_at: row.created_at,
    delivered_at: row.delivered_at || (isRead ? (row.updated_at || row.created_at) : null),
    read_at: row.read_at || (isRead ? (row.updated_at || row.created_at) : null),
  };
}

async function fetchMessagesWithFallback(
  supabase: any,
  conversationId: string,
  limitPlusOne: number,
  cursorFilter: string | null
) {
  const applyCursor = (query: any) => (cursorFilter ? query.or(cursorFilter) : query);

  const modernQuery = applyCursor(
    supabase
      .from('messages')
      .select(MESSAGE_SELECT_V2)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limitPlusOne)
  );

  const modern = await modernQuery;
  if (!modern.error) {
    return { rows: modern.data || [], error: null };
  }

  if (!isMessageSchemaDriftError(modern.error)) {
    return { rows: [], error: modern.error };
  }

  const legacyQuery = applyCursor(
    supabase
      .from('messages')
      .select(MESSAGE_SELECT_LEGACY)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limitPlusOne)
  );

  const legacy = await legacyQuery;
  if (legacy.error) {
    return { rows: [], error: legacy.error };
  }

  return { rows: legacy.data || [], error: null };
}

async function insertMessageWithFallback(
  supabase: any,
  modernPayload: Record<string, any>,
  legacyPayload: Record<string, any>
) {
  const modernInsert = await supabase
    .from('messages')
    .insert(modernPayload)
    .select(MESSAGE_SELECT_V2)
    .single();

  if (!modernInsert.error) {
    return { data: modernInsert.data, error: null };
  }

  if (!isMessageSchemaDriftError(modernInsert.error)) {
    return { data: null, error: modernInsert.error };
  }

  const legacyInsert = await supabase
    .from('messages')
    .insert(legacyPayload)
    .select(MESSAGE_SELECT_LEGACY)
    .single();

  if (legacyInsert.error) {
    return { data: null, error: legacyInsert.error };
  }

  return { data: legacyInsert.data, error: null };
}

export const GET = withUser(async (req: NextRequest, { user, supabase, params }) => {
  try {
    const { id: conversationId } = await (params as RouteContext['params']);

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    const access = await getConversationAccessContext(supabase, conversationId, user.id);
    if (!access) {
      return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 });
    }

    const incomingSenderType = access.role === 'user' ? 'business' : 'user';
    const nowIso = new Date().toISOString();
    const { error: deliveredError } = await supabase
      .from('messages')
      .update({
        status: 'delivered',
        delivered_at: nowIso,
      })
      .eq('conversation_id', conversationId)
      .eq('sender_type', incomingSenderType)
      .eq('status', 'sent');

    // Legacy schema does not include status/sender_type delivery columns.
    if (deliveredError && !isMessageSchemaDriftError(deliveredError)) {
      console.warn('[Conversation Messages API] Delivery update warning:', deliveredError);
    }

    const { searchParams } = new URL(req.url);
    const limit = parsePositiveInt(searchParams.get('limit'), 30, 60);
    const cursor = decodeCursor(searchParams.get('cursor'));
    const cursorFilter = cursor
      ? `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`
      : null;

    const { rows, error } = await fetchMessagesWithFallback(
      supabase,
      conversationId,
      limit + 1,
      cursorFilter
    );

    if (error) {
      console.error('[Conversation Messages API] Fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: error?.message || null },
        { status: 500 }
      );
    }

    const fetchedRows = rows || [];
    const hasMore = fetchedRows.length > limit;
    const pageRows = hasMore ? fetchedRows.slice(0, limit) : fetchedRows;
    const orderedRows = [...pageRows].reverse();

    const nextCursor = hasMore
      ? encodeCursor(pageRows[pageRows.length - 1].created_at, pageRows[pageRows.length - 1].id)
      : null;

    const messages = orderedRows.map((row: any) =>
      mapMessageRow(row, access.conversation.user_id, access.conversation.business_id || null)
    );

    return NextResponse.json({
      data: {
        conversation_id: conversationId,
        messages,
        has_more: hasMore,
        next_cursor: nextCursor,
      },
    });
  } catch (error: any) {
    console.error('[Conversation Messages API] Unexpected fetch error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error?.message }, { status: 500 });
  }
});

export const POST = withUser(async (req: NextRequest, { user, supabase, params }) => {
  try {
    const { id: conversationId } = await (params as RouteContext['params']);

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    const access = await getConversationAccessContext(supabase, conversationId, user.id);
    if (!access) {
      return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 });
    }

    const body = await req.json();
    const text = typeof body?.body === 'string'
      ? body.body
      : typeof body?.message === 'string'
        ? body.message
        : '';

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Message body is required' }, { status: 400 });
    }

    const senderType = access.role === 'user' ? 'user' : 'business';

    const modernInsertPayload: Record<string, any> = {
      conversation_id: conversationId,
      body: text.trim(),
      sender_type: senderType,
      sender_user_id: user.id,
      sender_business_id: senderType === 'business' ? access.conversation.business_id : null,
      status: 'sent',
    };

    const legacyInsertPayload: Record<string, any> = {
      conversation_id: conversationId,
      sender_id: user.id,
      content: text.trim(),
      read: false,
    };

    const { data: message, error: insertError } = await insertMessageWithFallback(
      supabase,
      modernInsertPayload,
      legacyInsertPayload
    );

    if (insertError || !message) {
      console.error('[Conversation Messages API] Send error:', insertError);
      return NextResponse.json(
        { error: 'Failed to send message', details: insertError?.message || null },
        { status: 500 }
      );
    }

    const mappedMessage = mapMessageRow(
      message,
      access.conversation.user_id,
      access.conversation.business_id || null
    );

    return NextResponse.json(
      {
        data: mappedMessage,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[Conversation Messages API] Unexpected send error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error?.message }, { status: 500 });
  }
});
