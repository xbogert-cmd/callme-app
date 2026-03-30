'use client';

import { TaskCompletion, CATEGORY_CONFIG, ReminderCategory } from '@/types';
import { format } from 'date-fns';

interface Props { completions: TaskCompletion[]; }

export default function TaskCompletions({ completions }: Props) {
  if (completions.length === 0) {
    return (
      <div className="rounded-xl bg-white p-12 flex flex-col items-center gap-3 text-center"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>✅</div>
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>No completions yet</p>
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>
          Complete a task during a call and it&apos;ll be logged here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {completions.map((item) => {
        const reminder = item.reminders as (typeof item.reminders & { category?: ReminderCategory }) | undefined;
        const taskName = reminder?.task_name ?? 'Task';
        const cat = reminder?.category ?? 'general';
        const catCfg = CATEGORY_CONFIG[cat];

        return (
          <div key={item.id} className="card-lift rounded-xl bg-white px-4 py-3.5 flex items-start gap-3"
            style={{
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
              borderLeft: '3px solid #BBF7D0',
            }}>

            {/* Category emoji in check badge */}
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-lg"
              style={{ background: '#DCFCE7', border: '1px solid #BBF7D0' }}>
              {catCfg.emoji}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{taskName}</p>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                  style={{ background: 'var(--bg-2)', color: 'var(--text-3)' }}>
                  {catCfg.label}
                </span>
              </div>

              {item.notes && (
                <p className="text-xs mt-1 italic leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  &ldquo;{item.notes}&rdquo;
                </p>
              )}

              {!item.notes && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>No notes logged</p>
              )}
            </div>

            <div className="text-right shrink-0">
              <p className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>
                {format(new Date(item.completed_at), 'MMM d')}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                {format(new Date(item.completed_at), 'h:mm a')}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
