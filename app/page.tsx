'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import ReminderForm from '@/components/ReminderForm';
import ReminderList from '@/components/ReminderList';
import MissedCalls from '@/components/MissedCalls';
import CallLogs from '@/components/CallLogs';
import TaskCompletions from '@/components/TaskCompletions';
import Confetti from '@/components/Confetti';
import { Reminder, ReminderStatus, CallLog, TaskCompletion } from '@/types';

type Tab = 'reminders' | 'history' | 'completions';

const QUOTES = [
  '"The secret of getting ahead is getting started." — Mark Twain',
  '"Small daily improvements lead to stunning results."',
  '"You don\'t have to be great to start, but you have to start to be great."',
  '"Discipline is choosing between what you want now and what you want most."',
  '"Progress, not perfection."',
  '"Show up. Do the work. Be consistent."',
  '"Every action you take is a vote for the person you want to become."',
  '"It always seems impossible until it\'s done." — Nelson Mandela',
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning, Xan 👋';
  if (h < 17) return 'Good afternoon, Xan 👋';
  return 'Good evening, Xan 👋';
}

export default function Dashboard() {
  const [reminders, setReminders]     = useState<Reminder[]>([]);
  const [callLogs, setCallLogs]       = useState<CallLog[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [tab, setTab]   = useState<Tab>('reminders');
  const [loading, setLoading] = useState(true);
  const [quoteIdx] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [showConfetti, setShowConfetti] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const hasLoaded       = useRef(false);
  const prevCompletions = useRef(0);

  const fetchData = useCallback(async () => {
    const [rRes, lRes] = await Promise.all([fetch('/api/reminders'), fetch('/api/logs')]);
    setReminders(await rRes.json());
    const l = await lRes.json();
    setCallLogs(l.callLogs);
    setCompletions(l.completions);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, [fetchData]);

  // Dark mode init + toggle
  useEffect(() => {
    const saved = localStorage.getItem('callme_theme');
    if (saved === 'dark') setIsDark(true);
  }, []);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('callme_theme', next ? 'dark' : 'light');
  };

  // Fire confetti when new completions arrive after initial load
  useEffect(() => {
    if (loading) return;
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      prevCompletions.current = completions.length;
      return;
    }
    if (completions.length > prevCompletions.current) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 3200);
      prevCompletions.current = completions.length;
      return () => clearTimeout(t);
    }
    prevCompletions.current = completions.length;
  }, [loading, completions.length]);

  const active     = reminders.filter((r) => !['completed', 'cancelled'].includes(r.status));
  const completed  = reminders.filter((r) => r.status === 'completed');
  const hasPending = active.some((r) => ['pending', 'snoozed'].includes(r.status));

  function computeStreak(comps: typeof completions): number {
    const days = new Set(comps.map((c) => c.completed_at.split('T')[0]));
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    while (true) {
      const key = cursor.toISOString().split('T')[0];
      if (!days.has(key)) break;
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  const streak = computeStreak(completions);

  const stats: { label: string; value: string | number; accent: string; pulse: boolean }[] = [
    { label: 'Upcoming',  value: active.length,      accent: '#F59E0B', pulse: hasPending && active.length > 0 },
    { label: 'Completed', value: completed.length,   accent: '#10B981', pulse: false },
    { label: 'Logged',    value: completions.length, accent: '#3B82F6', pulse: false },
    { label: '🔥 Streak', value: streak === 0 ? '—' : `${streak}d`, accent: '#EF4444', pulse: streak >= 3 },
  ];

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'reminders',   label: 'Reminders',    count: active.length },
    { key: 'history',     label: 'Call History', count: callLogs.length },
    { key: 'completions', label: 'Completions',  count: completions.length },
  ];

  return (
    <>
      <Confetti active={showConfetti} />
      {/* Brand stripe */}
      <div className="brand-stripe" />

      <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingTop: '3px' }}>

        {/* Header */}
        <header className="sticky top-[3px] z-10"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <div className="max-w-2xl mx-auto px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.webp"
                alt="CallMe"
                width={44}
                height={44}
                style={{ borderRadius: '12px' }}
                priority
              />
              <span className="text-base font-semibold" style={{ color: 'var(--text)' }}>CallMe</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleDark}
                className="tap-press w-8 h-8 rounded-lg flex items-center justify-center text-base transition-colors"
                style={{ color: 'var(--text-2)', border: '1px solid var(--border)', background: 'var(--surface)' }}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
                {isDark ? '☀️' : '🌙'}
              </button>
              <button onClick={fetchData}
                className="tap-press text-xs px-3 py-1.5 rounded-lg font-medium hover:opacity-80 transition-opacity"
                style={{ color: 'var(--text-2)', border: '1px solid var(--border)', background: 'var(--surface)' }}>
                Refresh
              </button>
            </div>
          </div>
        </header>

        <main className="relative z-[1] max-w-2xl mx-auto px-5 py-7 space-y-6">

          {/* Greeting */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
              {getGreeting()}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>
              Your AI accountability coach is ready.
            </p>
            <div className="border-b mt-5" style={{ borderColor: 'var(--border)' }} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.label}
                className={`rounded-xl bg-white py-4 px-3 ${s.pulse ? 'stat-pulse' : ''}`}
                style={{
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                  borderLeft: `3px solid ${s.accent}`,
                }}>
                <p className="text-xl font-bold tabular-nums" style={{ color: s.accent }}>{s.value}</p>
                <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--text-3)' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Form */}
          <ReminderForm onCreated={(r) => {
            const newItems = Array.isArray(r) ? r : [r];
            setReminders((p) => [...newItems, ...p]);
          }} />

          {/* Tabs + content */}
          <div>
            {/* Pill tabs */}
            <div className="flex gap-2 mb-5">
              {tabs.map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className="tap-press flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all"
                  style={tab === t.key
                    ? { background: 'var(--accent)', color: '#fff', boxShadow: '0 2px 8px rgba(59,130,246,0.35)' }
                    : { background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                  {t.label}
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                    style={tab === t.key
                      ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                      : { background: 'var(--bg-2)', color: 'var(--text-3)' }}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {loading ? (
              <div className="rounded-xl bg-white p-12 flex flex-col items-center gap-3"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div className="w-6 h-6 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>Loading…</p>
              </div>
            ) : (
              <div key={tab} className="tab-content">
                {tab === 'reminders'   && (
                  <>
                    <MissedCalls
                      callLogs={callLogs}
                      reminders={reminders}
                      onReschedule={async (reminderId, newTime) => {
                        await fetch(`/api/reminders/${reminderId}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ scheduled_time: newTime, status: 'pending' }),
                        });
                        setReminders((p) => p.map((r) =>
                          r.id === reminderId ? { ...r, scheduled_time: newTime, status: 'pending' } : r,
                        ));
                      }}
                    />
                    <ReminderList
                      reminders={reminders}
                      completions={completions}
                      onDelete={(id) => setReminders((p) => p.filter((r) => r.id !== id))}
                      onStatusChange={(id, status: ReminderStatus) =>
                        setReminders((p) => p.map((r) => r.id === id ? { ...r, status } : r))}
                      onUpdate={(id, updates) =>
                        setReminders((p) => p.map((r) => r.id === id ? { ...r, ...updates } : r))}
                    />
                  </>
                )}
                {tab === 'history'     && <CallLogs logs={callLogs} />}
                {tab === 'completions' && <TaskCompletions completions={completions} />}
              </div>
            )}
          </div>

          {/* Motivational quote */}
          <div className="text-center pt-2 pb-4">
            <p className="text-xs italic" style={{ color: 'var(--text-3)' }}>
              {QUOTES[quoteIdx]}
            </p>
          </div>

        </main>
      </div>
    </>
  );
}
