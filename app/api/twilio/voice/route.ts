import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const reminderId = req.nextUrl.searchParams.get('reminderId') || formData.get('reminderId') as string;

    let taskName = 'your task';
    let scheduledTime = 'earlier';
    let category = 'general';
    let settingsParam = '{}';

    if (reminderId) {
      const { data: reminder } = await supabase
        .from('reminders')
        .select('*')
        .eq('id', reminderId)
        .single();

      if (reminder) {
        taskName = reminder.task_name;
        scheduledTime = format(new Date(reminder.scheduled_time), 'h:mm a');
        category = reminder.category ?? 'general';
        settingsParam = JSON.stringify(reminder.category_settings ?? {});
      }
    }

    const greeting = `Hi! This is CallMe with a reminder about: ${taskName}, scheduled for ${scheduledTime}. Did you get it done?`;

    const baseUrl = process.env.BASE_URL!;
    const initialHistory = encodeURIComponent(JSON.stringify([
      { role: 'assistant', content: greeting },
    ]));
    const gatherUrl = `${baseUrl}/api/twilio/gather`
      + `?reminderId=${encodeURIComponent(reminderId)}`
      + `&category=${encodeURIComponent(category)}`
      + `&settings=${encodeURIComponent(settingsParam)}`
      + `&history=${initialHistory}`;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" timeout="6" speechTimeout="auto" action="${escapeXml(gatherUrl)}" method="POST">
    <Say voice="alice">${escapeXml(greeting)}</Say>
  </Gather>
  <Say voice="alice">I didn't catch that. I'll try you again later. Goodbye!</Say>
</Response>`;

    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
  } catch (err) {
    console.error('Voice webhook error:', err);
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hi, this is your CallMe reminder. Sorry, I had a technical issue. Please check the app. Goodbye!</Say>
</Response>`;
    return new NextResponse(fallback, { headers: { 'Content-Type': 'text/xml' } });
  }
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
