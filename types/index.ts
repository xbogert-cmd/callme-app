export type ReminderStatus = 'pending' | 'in_progress' | 'completed' | 'snoozed' | 'cancelled' | 'called';

export type RepeatInterval = 'none' | 'daily' | 'weekly';

export type ReminderCategory = 'workout' | 'medication' | 'study' | 'budget' | 'general';

export interface CategorySettings {
  // Workout
  trackWorkouts?: boolean;
  // Medication
  askMedication?: boolean;
  // Budget
  dailyLimit?: number;
  checkinsPerDay?: number;
  checkinNumber?: number;      // which check-in this reminder is (1-based)
  budgetDate?: string;         // YYYY-MM-DD for grouping daily spend
  parentId?: string;           // links budget check-ins back to the first one
}

export const CATEGORY_CONFIG: Record<ReminderCategory, {
  label: string;
  emoji: string;
  description: string;
}> = {
  workout:    { label: 'Workout',    emoji: '🏋️', description: 'Track exercises and gym sessions' },
  medication: { label: 'Medication', emoji: '💊',      description: 'Medication reminders' },
  study:      { label: 'Study',      emoji: '📚',      description: 'Study sessions with subject + duration' },
  budget:     { label: 'Budget',     emoji: '💰',      description: 'Daily spending check-ins' },
  general:    { label: 'General',    emoji: '📞',      description: 'General task reminders' },
};

export interface Reminder {
  id: string;
  user_phone: string;
  task_name: string;
  scheduled_time: string;
  status: ReminderStatus;
  category: ReminderCategory;
  category_settings: CategorySettings;
  created_at: string;
  snooze_until?: string | null;
  parent_id?: string | null;
  repeat?: RepeatInterval;
}

export interface CallLog {
  id: string;
  reminder_id: string;
  call_sid: string;
  transcript: string | null;
  outcome: string | null;
  called_at: string;
  reminders?: Reminder;
}

export interface TaskCompletion {
  id: string;
  reminder_id: string;
  notes: string | null;
  completed_at: string;
  reminders?: Reminder;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}
