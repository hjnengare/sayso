import { NextRequest } from 'next/server';
import { GET as businessNotificationsGet } from '@/app/api/notifications/business/route';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return businessNotificationsGet(req);
}
