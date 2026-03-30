import { NextResponse } from 'next/server';
import { checkAndFireReminders } from '@/lib/scheduler';

// This endpoint is hit every minute by a cron job (Vercel Cron or external)
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Protect the endpoint in production
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await checkAndFireReminders();
    return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('Scheduler run failed:', err);
    return NextResponse.json({ error: 'Scheduler failed' }, { status: 500 });
  }
}
