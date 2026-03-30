import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const [logsRes, completionsRes] = await Promise.all([
    supabase
      .from('call_logs')
      .select('*, reminders(*)')
      .order('called_at', { ascending: false })
      .limit(50),
    supabase
      .from('task_completions')
      .select('*, reminders(*)')
      .order('completed_at', { ascending: false })
      .limit(50),
  ]);

  return NextResponse.json({
    callLogs: logsRes.data ?? [],
    completions: completionsRes.data ?? [],
  });
}
