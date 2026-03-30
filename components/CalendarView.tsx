'use client';

import { useState } from 'react';
import { format, isSameDay, isPast, isToday, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths } from 'date-fns';
import { Reminder, ReminderStatus, ReminderCategory, CATEGORY_CONFIG } from '@/types';

type DisplayStatus = 'upcoming' | 'completed' | 'missed' | 'snoozed' | 'cancelled';

function getDisplayStatus(reminder: Reminder): DisplayStatus {
  if (reminder.status === 'completed') return 'completed';
  if (reminder.status === 'snoozed') return 'snoozed';
  if (reminder.status === 'cancelled') return 'cancelled';
  if (isPast(new Date(reminder.scheduled_time))) return 'missed';
  return 'upcoming';
}

const STATUS_STYLE: Record<DisplayStatus, { bg: string; text: string; label: string }> = {
  upcoming:  { bg: 'rgba(59,130,246,0.15)',  text: '#3B82F6', label: 'Upcoming' },
  completed: { bg: 'rgba(16,185,129,0.15)',  text: '#10B981', label: 'Completed' },
  missed:    { bg: 'rgba(239,68,68,0.15)',   text: '#EF4444', label: 'Missed' },
  snoozed:   { bg: 'rgba(245,158,11,0.15)',  text: '#F59E0B', label: 'Snoozed' },
  cancelled: { bg: 'rgba(148,163,184,0.1)',  text: '#94A3B8', label: 'Cancelled' },
};

interface Props {
  reminders: Reminder[];
  onReschedule: (reminderId: string, newTime: string) => void;
  onStatusChange: (id: string, status: ReminderStatus) => void;
  onDayClick: (date: Date) => void;
}

export default function CalendarView({ reminders, onReschedule, onStatusChange, onDayClick }: Props) {
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'completed' | 'missed' | 'snoozed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ReminderCategory>('all');
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState<string>('');

  // Build calendar grid days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  const totalCells = days.length;
  const totalRows = totalCells / 7;

  // Filter reminders for calendar display (no cancelled, apply filters)
  function getFilteredRemindersForDay(day: Date): Reminder[] {
    return reminders.filter((r) => {
      if (r.status === 'cancelled') return false;
      if (!isSameDay(new Date(r.scheduled_time), day)) return false;
      const ds = getDisplayStatus(r);
      if (statusFilter !== 'all' && ds !== statusFilter) return false;
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      return true;
    });
  }

  // For detail panel: all non-cancelled on that day (ignores filters)
  function getDetailRemindersForDay(day: Date): Reminder[] {
    return reminders.filter((r) => {
      if (r.status === 'cancelled') return false;
      return isSameDay(new Date(r.scheduled_time), day);
    });
  }

  const handleDayClick = (day: Date) => {
    const detailed = getDetailRemindersForDay(day);
    if (detailed.length > 0) {
      if (selectedDay && isSameDay(selectedDay, day)) {
        setSelectedDay(null);
      } else {
        setSelectedDay(day);
        setReschedulingId(null);
      }
    } else {
      onDayClick(day);
    }
  };

  const handleCancel = async (id: string) => {
    await fetch(`/api/reminders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    onStatusChange(id, 'cancelled');
    setSelectedDay(null);
  };

  const handleRescheduleConfirm = async (id: string) => {
    if (!rescheduleTime) return;
    const isoTime = new Date(rescheduleTime).toISOString();
    await fetch(`/api/reminders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduled_time: isoTime }),
    });
    onReschedule(id, isoTime);
    setReschedulingId(null);
    setRescheduleTime('');
  };

  const startReschedule = (r: Reminder) => {
    const d = new Date(r.scheduled_time);
    const pad = (n: number) => String(n).padStart(2, '0');
    const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setRescheduleTime(local);
    setReschedulingId(r.id);
  };

  const detailReminders = selectedDay ? getDetailRemindersForDay(selectedDay) : [];

  const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const statusFilterOptions: { value: 'all' | 'upcoming' | 'completed' | 'missed' | 'snoozed'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'completed', label: 'Completed' },
    { value: 'missed', label: 'Missed' },
    { value: 'snoozed', label: 'Snoozed' },
  ];

  const categoryFilterOptions: { value: 'all' | ReminderCategory; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'workout', label: `${CATEGORY_CONFIG.workout.emoji} Workout` },
    { value: 'medication', label: `${CATEGORY_CONFIG.medication.emoji} Medication` },
    { value: 'study', label: `${CATEGORY_CONFIG.study.emoji} Study` },
    { value: 'budget', label: `${CATEGORY_CONFIG.budget.emoji} Budget` },
    { value: 'general', label: `${CATEGORY_CONFIG.general.emoji} General` },
  ];

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="tap-press"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            style={{
              width: 32, height: 32, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--surface)', border: '1px solid var(--border)',
              color: 'var(--text-2)', cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', minWidth: 140, textAlign: 'center' }}>
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <button
            className="tap-press"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            style={{
              width: 32, height: 32, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--surface)', border: '1px solid var(--border)',
              color: 'var(--text-2)', cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Filter toggle button */}
        <button
          className="tap-press"
          onClick={() => setShowFilter((v) => !v)}
          style={{
            width: 32, height: 32, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: showFilter ? 'var(--accent)' : 'var(--surface)',
            border: '1px solid var(--border)',
            color: showFilter ? '#fff' : 'var(--text-2)',
            cursor: 'pointer',
          }}
          title="Filter"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
        </button>
      </div>

      {/* Filter bar */}
      {showFilter && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {/* Status row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-3)', textTransform: 'uppercase', minWidth: 62 }}>
              STATUS
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {statusFilterOptions.map((opt) => (
                <button
                  key={opt.value}
                  className="tap-press"
                  onClick={() => setStatusFilter(opt.value)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 999,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: statusFilter === opt.value ? 'var(--accent)' : 'var(--surface)',
                    color: statusFilter === opt.value ? '#fff' : 'var(--text-2)',
                    border: statusFilter === opt.value ? '1px solid transparent' : '1px solid var(--border)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-3)', textTransform: 'uppercase', minWidth: 62 }}>
              CATEGORY
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {categoryFilterOptions.map((opt) => (
                <button
                  key={opt.value}
                  className="tap-press"
                  onClick={() => setCategoryFilter(opt.value)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 999,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: categoryFilter === opt.value ? 'var(--accent)' : 'var(--surface)',
                    color: categoryFilter === opt.value ? '#fff' : 'var(--text-2)',
                    border: categoryFilter === opt.value ? '1px solid transparent' : '1px solid var(--border)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Calendar grid */}
      <div
        className="rounded-xl bg-white"
        style={{
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Weekday headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
          {WEEK_DAYS.map((d) => (
            <div
              key={d}
              style={{
                padding: '8px 0',
                textAlign: 'center',
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: 'var(--text-3)',
                textTransform: 'uppercase',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {days.map((day, idx) => {
            const colIndex = idx % 7;
            const rowIndex = Math.floor(idx / 7);
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isTodayDay = isToday(day);
            const isSelected = selectedDay !== null && isSameDay(day, selectedDay);
            const filteredDayReminders = getFilteredRemindersForDay(day);
            const visiblePills = filteredDayReminders.slice(0, 2);
            const extraCount = filteredDayReminders.length - visiblePills.length;
            const isLastCol = colIndex === 6;
            const isLastRow = rowIndex === totalRows - 1;

            return (
              <div
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                style={{
                  minHeight: 76,
                  padding: 6,
                  cursor: 'pointer',
                  background: isSelected ? 'var(--accent-bg)' : 'transparent',
                  borderRight: isLastCol ? 'none' : '1px solid var(--border)',
                  borderBottom: isLastRow ? 'none' : '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                }}
              >
                {/* Day number */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: isTodayDay ? 700 : 500,
                      background: isTodayDay ? 'var(--accent)' : 'transparent',
                      color: isTodayDay ? '#fff' : isCurrentMonth ? 'var(--text)' : 'var(--text-3)',
                    }}
                  >
                    {format(day, 'd')}
                  </span>
                </div>

                {/* Reminder pills */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {visiblePills.map((r) => {
                    const ds = getDisplayStatus(r);
                    const ss = STATUS_STYLE[ds];
                    const emoji = CATEGORY_CONFIG[r.category]?.emoji ?? '📞';
                    return (
                      <div
                        key={r.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          background: ss.bg,
                          borderRadius: 4,
                          padding: '1px 4px',
                          overflow: 'hidden',
                        }}
                      >
                        <span style={{ fontSize: 10, lineHeight: 1, flexShrink: 0 }}>{emoji}</span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: ss.text,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {r.task_name}
                        </span>
                      </div>
                    );
                  })}
                  {extraCount > 0 && (
                    <span style={{ fontSize: 10, color: 'var(--text-3)', paddingLeft: 4, fontWeight: 500 }}>
                      +{extraCount} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day detail panel */}
      {selectedDay && detailReminders.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div
            className="rounded-xl bg-white"
            style={{
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
              overflow: 'hidden',
            }}
          >
            {/* Detail header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text)' }}>
                {format(selectedDay, 'EEEE, MMMM d')}
              </span>
              <button
                className="tap-press"
                onClick={() => { setSelectedDay(null); setReschedulingId(null); }}
                style={{
                  width: 28, height: 28, borderRadius: 7,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--bg-2)', border: '1px solid var(--border)',
                  color: 'var(--text-2)', cursor: 'pointer',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Detail reminder list */}
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {detailReminders.map((r) => {
                const ds = getDisplayStatus(r);
                const ss = STATUS_STYLE[ds];
                const catCfg = CATEGORY_CONFIG[r.category] ?? CATEGORY_CONFIG.general;
                const canAct = ds === 'upcoming' || ds === 'missed';
                const isRescheduling = reschedulingId === r.id;

                return (
                  <div
                    key={r.id}
                    style={{
                      background: 'var(--bg)',
                      borderRadius: 10,
                      borderLeft: `3px solid ${ss.text}`,
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                    }}
                  >
                    {/* Emoji circle */}
                    <div
                      style={{
                        width: 38, height: 38, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, flexShrink: 0,
                        background: ss.bg,
                      }}
                    >
                      {catCfg.emoji}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text)' }}>
                          {r.task_name}
                        </span>
                        <span
                          style={{
                            fontSize: '0.6875rem', fontWeight: 700,
                            padding: '2px 8px', borderRadius: 999,
                            background: ss.bg, color: ss.text,
                          }}
                        >
                          {ss.label}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginTop: 2 }}>
                        {format(new Date(r.scheduled_time), 'h:mm a')}
                      </p>

                      {isRescheduling && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                          <input
                            type="datetime-local"
                            value={rescheduleTime}
                            onChange={(e) => setRescheduleTime(e.target.value)}
                            style={{
                              fontSize: '0.8125rem', borderRadius: 8,
                              padding: '4px 8px', outline: 'none',
                              background: 'var(--surface-2)',
                              border: '1px solid var(--accent)',
                              color: 'var(--text)',
                            }}
                          />
                          <button
                            className="btn-press"
                            onClick={() => handleRescheduleConfirm(r.id)}
                            style={{
                              padding: '4px 12px', borderRadius: 7,
                              fontSize: '0.8125rem', fontWeight: 600,
                              background: 'var(--accent)', color: '#fff',
                              border: 'none', cursor: 'pointer',
                            }}
                          >
                            Confirm
                          </button>
                          <button
                            className="tap-press"
                            onClick={() => setReschedulingId(null)}
                            style={{
                              padding: '4px 10px', borderRadius: 7,
                              fontSize: '0.8125rem', fontWeight: 500,
                              background: 'transparent', color: 'var(--text-2)',
                              border: '1px solid var(--border)', cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {canAct && !isRescheduling && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <button
                          className="tap-press"
                          onClick={() => startReschedule(r)}
                          style={{
                            padding: '4px 10px', borderRadius: 7,
                            fontSize: '0.8125rem', fontWeight: 600,
                            background: 'var(--accent-bg)', color: 'var(--accent)',
                            border: '1px solid var(--border)', cursor: 'pointer',
                          }}
                        >
                          Reschedule
                        </button>
                        <button
                          className="tap-press"
                          onClick={() => handleCancel(r.id)}
                          style={{
                            width: 28, height: 28, borderRadius: 7,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'transparent', color: 'var(--text-3)',
                            border: '1px solid var(--border)', cursor: 'pointer',
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
