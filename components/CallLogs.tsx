'use client';

import { useState } from 'react';
import { CallLog } from '@/types';
import { format } from 'date-fns';

const OUTCOME_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  completed:   { label: 'Completed',   color: '#166534', bg: '#DCFCE7' },
  snoozed:     { label: 'Snoozed',     color: '#5B21B6', bg: '#EDE9FE' },
  cancelled:   { label: 'Cancelled',   color: '#991B1B', bg: '#FEE2E2' },
  in_progress: { label: 'In Progress', color: '#1E40AF', bg: '#DBEAFE' },
  rescheduled: { label: 'Rescheduled', color: '#1E40AF', bg: '#DBEAFE' },
  no_answer:   { label: 'No Answer',   color: '#92400E', bg: '#FEF3C7' },
  busy:        { label: 'Busy',        color: '#991B1B', bg: '#FEE2E2' },
  failed:      { label: 'Failed',      color: '#991B1B', bg: '#FEE2E2' },
};

interface Props { logs: CallLog[]; }

export default function CallLogs({ logs }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (logs.length === 0) {
    return (
      <div className="rounded-xl bg-white p-12 flex flex-col items-center gap-3 text-center"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>📞</div>
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>No calls yet</p>
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>
          Call transcripts will appear here once reminders fire
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => {
        const cfg = OUTCOME_CONFIG[log.outcome ?? ''] ?? { label: log.outcome ?? 'Pending', color: 'var(--text-2)', bg: 'var(--bg-2)' };
        const isOpen = expanded === log.id;
        const taskName = (log.reminders as { task_name: string } | undefined)?.task_name ?? 'Unknown task';
        const lines = log.transcript?.split('\n').filter(Boolean) ?? [];

        return (
          <div key={log.id} className="card-lift rounded-xl bg-white overflow-hidden"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}>

            <button onClick={() => setExpanded(isOpen ? null : log.id)}
              className="w-full px-4 py-3.5 flex items-center gap-3 text-left transition-colors hover:bg-gray-50">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>📞</div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{taskName}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                  {format(new Date(log.called_at), 'MMM d, yyyy • h:mm a')}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                {lines.length > 0 && (
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>{isOpen ? '▲' : '▼'}</span>
                )}
              </div>
            </button>

            {isOpen && (
              <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--border)' }}>
                {lines.length > 0 ? (
                  <>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mt-3 mb-3"
                      style={{ color: 'var(--text-3)' }}>Transcript</p>
                    <div className="space-y-2">
                      {lines.map((line, i) => {
                        const isAI = line.startsWith('AI:');
                        const text = line.replace(/^(AI:|User:)\s*/, '');
                        return (
                          <div key={i} className={`flex gap-2 ${isAI ? '' : 'flex-row-reverse'}`}>
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] shrink-0 mt-0.5 font-semibold"
                              style={{
                                background: isAI ? 'var(--accent)' : 'var(--bg-2)',
                                color: isAI ? '#fff' : 'var(--text-2)',
                                border: isAI ? 'none' : '1px solid var(--border)',
                                fontSize: '10px',
                              }}>
                              {isAI ? 'AI' : 'You'}
                            </div>
                            <div className="max-w-[82%] px-3 py-2 rounded-xl"
                              style={{
                                background: isAI ? 'var(--accent-bg)' : 'var(--bg-2)',
                                border: `1px solid ${isAI ? '#BFDBFE' : 'var(--border)'}`,
                              }}>
                              <p className="text-xs leading-relaxed"
                                style={{ color: isAI ? '#1E40AF' : 'var(--text)' }}>{text}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-center py-4" style={{ color: 'var(--text-3)' }}>
                    No transcript for this call
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
