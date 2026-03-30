'use client';

import { useState, useEffect } from 'react';
import { Reminder, ReminderStatus, TaskCompletion, CATEGORY_CONFIG } from '@/types';
import { format, isPast, differenceInMinutes, differenceInHours } from 'date-fns';

const CATEGORY_STYLE: Record<string, { border: string; emojiBg: string }> = {
  workout:    { border: '#F97316', emojiBg: 'rgba(249,115,22,0.13)' },
  medication: { border: '#EC4899', emojiBg: 'rgba(236,72,153,0.13)' },
  study:      { border: '#3B82F6', emojiBg: 'rgba(59,130,246,0.13)' },
  budget:     { border: '#22C55E', emojiBg: 'rgba(34,197,94,0.13)'  },
  general:    { border: '#94A3B8', emojiBg: 'rgba(148,163,184,0.12)' },
};

const STATUS_CONFIG: Record<ReminderStatus, { label: string; color: string; bg: string; border: string }> = {
  pending:     { label: 'Pending',     color: '#92400E', bg: '#FEF3C7', border: '#FDE68A' },
  called:      { label: 'Calling…',   color: '#1E40AF', bg: '#DBEAFE', border: '#BFDBFE' },
  in_progress: { label: 'In Progress', color: '#1E40AF', bg: '#DBEAFE', border: '#BFDBFE' },
  completed:   { label: 'Completed',  color: '#166534', bg: '#DCFCE7', border: '#BBF7D0' },
  snoozed:     { label: 'Snoozed',    color: '#5B21B6', bg: '#EDE9FE', border: '#DDD6FE' },
  cancelled:   { label: 'Cancelled',  color: '#991B1B', bg: '#FEE2E2', border: '#FECACA' },
};

function getCountdown(scheduledTime: string): string | null {
  const target = new Date(scheduledTime);
  if (isPast(target)) return null;
  const mins = differenceInMinutes(target, new Date());
  if (mins < 1) return 'Calling any moment…';
  if (mins < 60) return `Calling in ${mins}m`;
  const hrs = differenceInHours(target, new Date());
  const rem = mins - hrs * 60;
  return rem === 0 ? `Calling in ${hrs}h` : `Calling in ${hrs}h ${rem}m`;
}

function formatCompletionNotes(reminder: Reminder, notes: string | null): string | null {
  if (!notes) return null;
  if (reminder.category === 'budget') {
    try {
      const parsed = JSON.parse(notes);
      if (typeof parsed.amount === 'number') return `Spent: $${parsed.amount.toFixed(2)}`;
    } catch { /* fall through */ }
  }
  return notes.length > 80 ? notes.slice(0, 80) + '…' : notes;
}

interface Props {
  reminders: Reminder[];
  completions?: TaskCompletion[];
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: ReminderStatus) => void;
  onUpdate: (id: string, updates: Partial<Reminder>) => void;
}

export default function ReminderList({ reminders, completions = [], onDelete, onStatusChange, onUpdate }: Props) {
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [, setTick]                 = useState(0);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editName, setEditName]     = useState('');
  const [editTime, setEditTime]     = useState('');
  const [saving, setSaving]         = useState(false);
  const [snoozingId, setSnoozingId] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const completionsByReminder = new Map<string, TaskCompletion>();
  for (const c of completions) {
    if (!completionsByReminder.has(c.reminder_id)) {
      completionsByReminder.set(c.reminder_id, c);
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
    onDelete(id);
    setDeleting(null);
  };

  const handleCancel = async (id: string) => {
    await fetch(`/api/reminders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    onStatusChange(id, 'cancelled');
  };

  const startEdit = (r: Reminder) => {
    setEditingId(r.id);
    setEditName(r.task_name);
    const d = new Date(r.scheduled_time);
    const pad = (n: number) => String(n).padStart(2, '0');
    setEditTime(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
  };

  const handleSaveEdit = async (id: string) => {
    setSaving(true);
    const res = await fetch(`/api/reminders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_name: editName, scheduled_time: new Date(editTime).toISOString() }),
    });
    if (res.ok) {
      const updated = await res.json();
      onUpdate(id, { task_name: updated.task_name, scheduled_time: updated.scheduled_time });
    }
    setSaving(false);
    setEditingId(null);
  };

  const handleSnooze = async (id: string) => {
    setSnoozingId(id);
    const newTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await fetch(`/api/reminders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduled_time: newTime, status: 'snoozed' }),
    });
    onUpdate(id, { scheduled_time: newTime, status: 'snoozed' });
    setSnoozingId(null);
  };

  if (reminders.length === 0) {
    return (
      <div className="rounded-xl bg-white p-12 flex flex-col items-center gap-3 text-center"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>📋</div>
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>No reminders yet</p>
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>
          Add one above — you&apos;ll get an AI call at the scheduled time
        </p>
      </div>
    );
  }

  const sorted = [...reminders].sort((a, b) => {
    const aActive = !['completed', 'cancelled'].includes(a.status);
    const bActive = !['completed', 'cancelled'].includes(b.status);
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime();
  });

  return (
    <div className="space-y-2">
      {sorted.map((reminder) => {
        const cfg = STATUS_CONFIG[reminder.status];
        const catCfg = CATEGORY_CONFIG[reminder.category ?? 'general'];
        const catStyle = CATEGORY_STYLE[reminder.category ?? 'general'] ?? CATEGORY_STYLE.general;
        const isCancelled = reminder.status === 'cancelled';
        const isCompleted = reminder.status === 'completed';
        const isOverdue = isPast(new Date(reminder.scheduled_time)) && reminder.status === 'pending';
        const countdown = ['pending', 'snoozed'].includes(reminder.status)
          ? getCountdown(reminder.scheduled_time) : null;

        const completion = completionsByReminder.get(reminder.id);
        const completionDetail = isCompleted
          ? formatCompletionNotes(reminder, completion?.notes ?? null)
          : null;

        const isEditing = editingId === reminder.id;

        return (
          <div key={reminder.id} className="card-lift rounded-xl bg-white px-4 py-3.5 flex items-start gap-3"
            style={{
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
              opacity: isCancelled ? 0.55 : 1,
              borderLeft: `4px solid ${catStyle.border}`,
            }}>

            {/* Category emoji icon */}
            {!isEditing && (
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0"
                style={{ background: catStyle.emojiBg, border: `1.5px solid ${catStyle.border}33` }}>
                {catCfg.emoji}
              </div>
            )}

            {/* Content */}
            {isEditing ? (
              <div className="flex-1 space-y-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-sm rounded-lg px-3 py-2 outline-none"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--accent)', color: 'var(--text)' }}
                />
                <input
                  type="datetime-local"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="w-full text-sm rounded-lg px-3 py-2 outline-none"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit(reminder.id)}
                    disabled={saving}
                    className="btn-press px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                    style={{ background: 'var(--accent)' }}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="tap-press px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-base font-bold leading-snug ${isCancelled ? 'line-through' : ''}`}
                    style={{ color: 'var(--text)' }}>
                    {reminder.task_name}
                  </p>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: cfg.bg, color: cfg.color }}>
                    {cfg.label}
                  </span>
                  {isOverdue && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: '#FEE2E2', color: '#991B1B' }}>
                      Overdue
                    </span>
                  )}
                </div>

                <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                  {reminder.status === 'snoozed'
                    ? `Calling back at ${format(new Date(reminder.scheduled_time), 'h:mm a')}`
                    : format(new Date(reminder.scheduled_time), 'MMM d, yyyy • h:mm a')}
                </p>

                {countdown && (
                  <p className="text-xs mt-0.5 font-medium"
                    style={{ color: reminder.status === 'snoozed' ? '#5B21B6' : '#92400E' }}>
                    {countdown}
                  </p>
                )}

                {completionDetail && (
                  <p className="text-xs mt-1 italic" style={{ color: 'var(--text-2)' }}>
                    &ldquo;{completionDetail}&rdquo;
                  </p>
                )}

                {isCompleted && !completionDetail && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>No notes logged</p>
                )}

                <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-3)' }}>{reminder.user_phone}</p>
              </div>
            )}

            {/* Icon action buttons */}
            {!['completed', 'cancelled'].includes(reminder.status) && !isEditing && (
              <div className="flex items-center gap-1 shrink-0 pt-0.5">
                {/* Edit */}
                <button onClick={() => startEdit(reminder)}
                  className="tap-press w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                  style={{ color: 'var(--text-3)', background: 'transparent' }}
                  title="Edit"
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                {/* Snooze 15m */}
                <button onClick={() => handleSnooze(reminder.id)}
                  disabled={snoozingId === reminder.id}
                  className="tap-press w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
                  style={{ color: 'var(--text-3)', background: 'transparent' }}
                  title="Snooze 15 min"
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </button>
                {/* Cancel */}
                <button onClick={() => handleCancel(reminder.id)}
                  className="tap-press w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                  style={{ color: 'var(--text-3)', background: 'transparent' }}
                  title="Cancel reminder"
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#DC2626'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            )}

            {/* Delete button for cancelled reminders */}
            {isCancelled && (
              <div className="flex items-center shrink-0 pt-0.5">
                <button onClick={() => handleDelete(reminder.id)}
                  disabled={deleting === reminder.id}
                  className="tap-press text-xs font-medium transition-colors disabled:opacity-40"
                  style={{ color: 'var(--text-3)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#B91C1C')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}>
                  {deleting === reminder.id ? '…' : 'Delete'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
