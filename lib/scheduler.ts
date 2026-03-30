import { supabase } from './supabase';
import { makeReminderCall } from './twilio';

export async function checkAndFireReminders(): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 60 * 1000); // 1 minute ago
  const windowEnd = new Date(now.getTime() + 60 * 1000);   // 1 minute from now

  const { data: reminders, error } = await supabase
    .from('reminders')
    .select('*')
    .in('status', ['pending', 'snoozed'])
    .gte('scheduled_time', windowStart.toISOString())
    .lte('scheduled_time', windowEnd.toISOString());

  if (error) {
    console.error('Scheduler error fetching reminders:', error);
    return;
  }

  if (!reminders || reminders.length === 0) return;

  for (const reminder of reminders) {
    console.log(`Firing reminder ${reminder.id}: ${reminder.task_name}`);

    // Mark as called immediately to prevent duplicate calls
    await supabase
      .from('reminders')
      .update({ status: 'called' })
      .eq('id', reminder.id);

    try {
      const callSid = await makeReminderCall(reminder.user_phone, reminder.id);

      // Log the call
      await supabase.from('call_logs').insert({
        reminder_id: reminder.id,
        call_sid: callSid,
        transcript: null,
        outcome: null,
        called_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error(`Failed to call for reminder ${reminder.id}:`, err);
      // Revert status so it can be retried
      await supabase
        .from('reminders')
        .update({ status: 'pending' })
        .eq('id', reminder.id);
    }
  }
}
