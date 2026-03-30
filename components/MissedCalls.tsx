'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { CallLog, Reminder } from '@/types';

interface Props {
  callLogs: CallLog[];
  reminders: Reminder[];
  onReschedule: (reminderId: string, newTime: string) => void;
}

function outcomeLabel(outcome: string): string {
  if (outcome === 'no-answer') return 'No Answer';
  if (outcome === 'busy') return 'Busy';
  return 'Failed';
}

function defaultRescheduleTime(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MissedCalls({ callLogs, reminders, onReschedule }: Props) {
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState<string>('');

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const missedLogs = callLogs.filter((log) => {
    if (!['no-answer', 'busy', 'failed'].includes(log.outcome ?? '')) return false;
    if (new Date(log.called_at) < cutoff) return false;
    const matched = reminders.find((r) => r.id === log.reminder_id);
    if (!matched || matched.status !== 'pending') return false;
    return true;
  });

  if (missedLogs.length === 0) return null;

  const handleRescheduleClick = (logId: string) => {
    setReschedulingId(logId);
    setRescheduleTime(defaultRescheduleTime());
  };

  const handleConfirm = (reminderId: string) => {
    onReschedule(reminderId, new Date(rescheduleTime).toISOString());
    setReschedulingId(null);
  };

  return (
    <section className="mb-4">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold mb-2" style={{ color: '#DC2626' }}>
        <span>⚠️</span> Missed Calls
      </h3>
      <div className="space-y-2">
        {missedLogs.map((log) => {
          const matchedReminder = reminders.find((r) => r.id === log.reminder_id);
          const isRescheduling = reschedulingId === log.id;

          return (
            <div
              key={log.id}
              className="card-lift rounded-xl bg-white px-4 py-3.5"
              style={{
                boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                borderLeft: '3px solid #FECACA',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: '#FEE2E2', color: '#DC2626' }}
                    >
                      Missed
                    </span>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      {matchedReminder?.task_name ?? 'Unknown task'}
                    </p>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>
                    Tried: {format(new Date(log.called_at), 'MMM d • h:mm a')}
                  </p>
                  <span
                    className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}
                  >
                    {outcomeLabel(log.outcome ?? 'failed')}
                  </span>
                </div>

                {!isRescheduling && (
                  <button
                    onClick={() => handleRescheduleClick(log.id)}
                    className="tap-press shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent)' }}
                  >
                    Reschedule
                  </button>
                )}
              </div>

              {isRescheduling && (
                <div className="mt-3 space-y-2">
                  <input
                    type="datetime-local"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full text-sm rounded-lg px-3 py-2 outline-none"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--accent)', color: 'var(--text)' }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConfirm(log.reminder_id)}
                      className="btn-press px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                      style={{ background: 'var(--accent)' }}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setReschedulingId(null)}
                      className="tap-press px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ color: 'var(--text-2)', border: '1px solid var(--border)' }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
