import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Twilio calls this when a call ends (completed, failed, busy, no-answer)
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const callStatus = formData.get('CallStatus') as string;
  const callSid = formData.get('CallSid') as string;
  const reminderId = req.nextUrl.searchParams.get('reminderId')!;

  // If the call never connected, revert reminder to pending
  if (['failed', 'busy', 'no-answer'].includes(callStatus)) {
    await supabase
      .from('reminders')
      .update({ status: 'pending' })
      .eq('id', reminderId)
      .eq('status', 'called'); // Only revert if still in 'called' state

    await supabase
      .from('call_logs')
      .update({ outcome: callStatus })
      .eq('call_sid', callSid);
  }

  return new NextResponse('', { status: 200 });
}
