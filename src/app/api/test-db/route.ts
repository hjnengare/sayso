// Test endpoint to verify database connection — admin only, disabled in production
import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/app/api/_lib/withAuth";

export const dynamic = 'force-dynamic';

export const GET = withAdmin(async (_req: NextRequest, { service }) => {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const { count, error } = await service
      .from('businesses')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return NextResponse.json({
        connected: false,
        error: error.message,
        code: error.code,
      }, { status: 500 });
    }

    return NextResponse.json({
      connected: true,
      businessCount: count || 0,
      message: count === 0
        ? 'Database connected but no businesses found. Run seed endpoint.'
        : `${count} businesses found`,
    });
  } catch (error: any) {
    return NextResponse.json({
      connected: false,
      error: error.message,
    }, { status: 500 });
  }
});
