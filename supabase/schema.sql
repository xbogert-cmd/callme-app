-- CallMe Database Schema
-- Run this in your Supabase SQL Editor

-- Reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_phone TEXT NOT NULL,
  task_name TEXT NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'called', 'in_progress', 'completed', 'snoozed', 'cancelled')),
  snooze_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reminders_status_scheduled ON reminders (status, scheduled_time);

-- Call logs table
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  call_sid TEXT NOT NULL,
  transcript TEXT,
  outcome TEXT,
  called_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS call_logs_reminder_id ON call_logs (reminder_id);

-- Task completions table
CREATE TABLE IF NOT EXISTS task_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  notes TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS task_completions_reminder_id ON task_completions (reminder_id);

-- Row Level Security (optional, enable if using auth)
-- ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
