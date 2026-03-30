import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateVoiceResponse, extractSpendAmount } from '@/lib/claude';
import { ConversationMessage, ReminderCategory, CategorySettings } from '@/types';
import { addMinutes } from 'date-fns';

// States that end the call immediately
const TERMINAL_STATES = new Set(['completed', 'snoozed', 'in_progress', 'rescheduled', 'cancelled']);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const speechResult = (formData.get('SpeechResult') as string) ?? '';
    const reminderId = req.nextUrl.searchParams.get('reminderId')!;
    const category = (req.nextUrl.searchParams.get('category') ?? 'general') as ReminderCategory;
    const historyParam = req.nextUrl.searchParams.get('history') ?? '[]';
    const settingsParam = req.nextUrl.searchParams.get('settings') ?? '{}';

    let settings: CategorySettings = {};
    try { settings = JSON.parse(decodeURIComponent(settingsParam)); } catch { settings = {}; }

    console.log(`[gather] reminderId=${reminderId} category=${category} speech="${speechResult}"`);

    const { data: reminder } = await supabase
      .from('reminders')
      .select('*')
      .eq('id', reminderId)
      .single();

    const taskName = reminder?.task_name ?? 'your task';
    const scheduledTime = reminder?.scheduled_time ?? new Date().toISOString();

    let history: ConversationMessage[] = [];
    try {
      history = JSON.parse(decodeURIComponent(historyParam));
    } catch {
      history = [];
    }

    history.push({ role: 'user', content: speechResult || '(no response)' });

    // Build budget context if needed
    let budgetContext: { runningTotal: number; dailyLimit: number; checkinsLeft: number } | undefined;
    if (category === 'budget' && settings.parentId && settings.dailyLimit) {
      const budgetDate = settings.budgetDate ?? new Date().toISOString().split('T')[0];
      const checkinNumber = settings.checkinNumber ?? 1;
      const checkinsPerDay = settings.checkinsPerDay ?? 1;

      // Sum all completed budget check-ins for today's session
      const { data: siblings } = await supabase
        .from('reminders')
        .select('id, category_settings')
        .eq('category_settings->>parentId', settings.parentId)
        .eq('category_settings->>budgetDate', budgetDate);

      const siblingIds = (siblings ?? []).map((s: { id: string }) => s.id);

      let runningTotal = 0;
      if (siblingIds.length > 0) {
        const { data: completions } = await supabase
          .from('task_completions')
          .select('notes')
          .in('reminder_id', siblingIds);

        for (const c of completions ?? []) {
          if (c.notes) {
            try {
              const parsed = JSON.parse(c.notes);
              if (typeof parsed.amount === 'number') runningTotal += parsed.amount;
            } catch { /* notes not JSON, skip */ }
          }
        }
      }

      budgetContext = {
        runningTotal,
        dailyLimit: settings.dailyLimit,
        checkinsLeft: checkinsPerDay - checkinNumber,
      };

      console.log(`[gather] budget context: total=$${runningTotal} limit=$${settings.dailyLimit} checkinsLeft=${budgetContext.checkinsLeft}`);
    }

    const { text, state } = await generateVoiceResponse(
      history, taskName, scheduledTime, category, settings, budgetContext,
    );
    history.push({ role: 'assistant', content: text });

    // Terminal state — update DB, save transcript, hang up
    if (TERMINAL_STATES.has(state)) {
      await finalizeCall(history, reminderId, state, speechResult, category, settings);

      // Schedule next occurrence for recurring reminders
      if (state === 'completed' && reminder?.repeat && reminder.repeat !== 'none') {
        const intervalMs = reminder.repeat === 'daily'
          ? 24 * 60 * 60 * 1000
          : 7 * 24 * 60 * 60 * 1000;
        const nextTime = new Date(new Date(reminder.scheduled_time).getTime() + intervalMs);
        await supabase.from('reminders').insert({
          task_name: reminder.task_name,
          user_phone: reminder.user_phone,
          scheduled_time: nextTime.toISOString(),
          status: 'pending',
          category: reminder.category,
          category_settings: reminder.category_settings,
          repeat: reminder.repeat,
        });
        console.log(`[gather] scheduled next ${reminder.repeat} occurrence at ${nextTime.toISOString()}`);
      }

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${escapeXml(text)}</Say>
  <Hangup/>
</Response>`;
      return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // Continue conversation — pass settings forward
    const baseUrl = process.env.BASE_URL!;
    const encodedHistory = encodeURIComponent(JSON.stringify(history));
    const gatherUrl = `${baseUrl}/api/twilio/gather`
      + `?reminderId=${encodeURIComponent(reminderId)}`
      + `&category=${encodeURIComponent(category)}`
      + `&settings=${encodeURIComponent(settingsParam)}`
      + `&history=${encodedHistory}`;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" timeout="6" speechTimeout="auto" action="${escapeXml(gatherUrl)}" method="POST">
    <Say voice="alice">${escapeXml(text)}</Say>
  </Gather>
  <Say voice="alice">I didn't catch that. I'll try you again later. Bye!</Say>
</Response>`;

    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
  } catch (err) {
    console.error('[gather] Error:', err);
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, I hit a technical snag. Check the CallMe app. Talk soon!</Say>
</Response>`;
    return new NextResponse(fallback, { headers: { 'Content-Type': 'text/xml' } });
  }
}

async function finalizeCall(
  history: ConversationMessage[],
  reminderId: string,
  state: string,
  lastUserSpeech: string,
  category: ReminderCategory,
  settings: CategorySettings,
) {
  const transcript = history
    .filter((m) => m.content !== '(no response)')
    .map((m) => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
    .join('\n');

  let newStatus: string;
  switch (state) {
    case 'completed':   newStatus = 'completed';   break;
    case 'cancelled':   newStatus = 'cancelled';   break;
    case 'in_progress': newStatus = 'in_progress'; break;
    case 'snoozed':
    case 'rescheduled': newStatus = 'pending';     break;
    default:            newStatus = 'pending';     break;
  }

  if (state === 'snoozed') {
    const { error: snoozeErr } = await supabase.from('reminders').update({
      status: 'snoozed',
      scheduled_time: addMinutes(new Date(), 15).toISOString(),
    }).eq('id', reminderId);
    if (snoozeErr) console.error('[gather] snooze update error:', snoozeErr);
  } else if (state === 'rescheduled') {
    const newTime = parseRescheduleTime(lastUserSpeech);
    await supabase.from('reminders').update({
      status: 'pending',
      scheduled_time: newTime ? newTime.toISOString() : addMinutes(new Date(), 60).toISOString(),
    }).eq('id', reminderId);
  } else {
    const { error: statusErr } = await supabase
      .from('reminders')
      .update({ status: newStatus })
      .eq('id', reminderId);
    if (statusErr) console.error('[gather] status update error:', statusErr);
  }

  // Save transcript to the most recent call_log
  const { data: logs } = await supabase
    .from('call_logs')
    .select('id')
    .eq('reminder_id', reminderId)
    .order('called_at', { ascending: false })
    .limit(1);

  if (logs && logs.length > 0) {
    await supabase
      .from('call_logs')
      .update({ transcript, outcome: state })
      .eq('id', logs[0].id);
  }

  // Log task completion with notes
  if (state === 'completed') {
    let notes: string | null = null;

    if (category === 'budget') {
      // Extract spend amount from user speech and store as JSON
      const amount = extractSpendAmount(lastUserSpeech);
      if (amount !== null) {
        notes = JSON.stringify({ amount });
      }
    } else {
      // For other categories, join user speech turns as freeform notes
      const userLines = history
        .filter((m) => m.role === 'user' && m.content !== '(no response)')
        .map((m) => m.content)
        .join(' ');
      notes = userLines.length > 10 ? userLines : null;
    }

    await supabase.from('task_completions').insert({
      reminder_id: reminderId,
      notes,
      completed_at: new Date().toISOString(),
    });
  }

  console.log(`[gather] finalized reminderId=${reminderId} state=${state} status=${newStatus}`);
}

function parseRescheduleTime(speech: string): Date | null {
  const now = new Date();

  const relMatch = speech.match(/in\s+(\d+)\s+(hour|minute|min)/i);
  if (relMatch) {
    const n = parseInt(relMatch[1]);
    const unit = relMatch[2].toLowerCase();
    return unit.startsWith('h')
      ? new Date(now.getTime() + n * 60 * 60 * 1000)
      : new Date(now.getTime() + n * 60 * 1000);
  }

  const timeMatch = speech.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const meridiem = timeMatch[3].toLowerCase();
    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
    const result = new Date(now);
    result.setHours(hours, minutes, 0, 0);
    if (result <= now) result.setDate(result.getDate() + 1);
    return result;
  }

  if (/tomorrow/i.test(speech)) {
    const result = new Date(now);
    result.setDate(result.getDate() + 1);
    result.setHours(9, 0, 0, 0);
    return result;
  }

  return null;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
