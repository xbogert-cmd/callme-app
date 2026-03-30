import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get the IDs of all reminders belonging to this user
  const { data: userReminders } = await supabase
    .from('reminders')
    .select('id')
    .eq('user_id', user.id);

  const ids = (userReminders ?? []).map((r: { id: string }) => r.id);

  if (ids.length === 0) {
    return NextResponse.json({ callLogs: [], completions: [] });
  }

  const [logsRes, completionsRes] = await Promise.all([
    supabase
      .from('call_logs')
      .select('*, reminders(*)')
      .in('reminder_id', ids)
      .order('called_at', { ascending: false })
      .limit(50),
    supabase
      .from('task_completions')
      .select('*, reminders(*)')
      .in('reminder_id', ids)
      .order('completed_at', { ascending: false })
      .limit(50),
  ]);

  return NextResponse.json({
    callLogs: logsRes.data ?? [],
    completions: completionsRes.data ?? [],
  });
}
