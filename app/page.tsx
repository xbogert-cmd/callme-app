'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
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

function getGreeting(name: string): string {
  const h = new Date().getHours();
  const suffix = name ? `, ${name}` : '';
  if (h < 12) return `Good morning${suffix} 👋`;
  if (h < 17) return `Good afternoon${suffix} 👋`;
  return `Good evening${suffix} 👋`;
}

export default function Dashboard() {
  const router = useRouter();
  const [reminders, setReminders]     = useState<Reminder[]>([]);
  const [callLogs, setCallLogs]       = useState<CallLog[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [tab, setTab]   = useState<Tab>('reminders');
  const [loading, setLoading] = useState(true);
  const [quoteIdx] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [showConfetti, setShowConfetti] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [displayName, setDisplayName]     = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [nameInput, setNameInput]         = useState('');
  const [savingName, setSavingName]       = useState(false);
  const hasLoaded       = useRef(false);
  const prevCompletions = useRef(0);

  const handleSignOut = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleSaveName = async () => {
    const name = nameInput.trim();
    if (!name) return;
    setSavingName(true);
    localStorage.setItem('callme_display_name', name);
    setDisplayName(name);
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.updateUser({ data: { display_name: name } });
    setShowOnboarding(false);
    setSavingName(false);
  };

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

  // Onboarding: show name prompt if display name not yet set
  useEffect(() => {
    const saved = localStorage.getItem('callme_display_name');
    if (saved) {
      setDisplayName(saved);
    } else {
      setShowOnboarding(true);
    }
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

  const STAT_TINTS: Record<string, string> = {
    '#F59E0B': 'rgba(245,158,11,0.07)',
    '#10B981': 'rgba(16,185,129,0.07)',
    '#3B82F6': 'rgba(59,130,246,0.07)',
    '#EF4444': 'rgba(239,68,68,0.07)',
  };

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
              <button onClick={handleSignOut}
                className="tap-press text-xs px-3 py-1.5 rounded-lg font-medium hover:opacity-80 transition-opacity"
                style={{ color: 'var(--text-2)', border: '1px solid var(--border)', background: 'var(--surface)' }}>
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <main className="relative z-[1] max-w-2xl mx-auto px-5 py-7 space-y-6">

          {/* Greeting */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
              {getGreeting(displayName)}
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
                className={`rounded-xl py-5 px-4 ${s.pulse ? 'stat-pulse' : ''}`}
                style={{
                  background: STAT_TINTS[s.accent],
                  border: `1px solid ${s.accent}33`,
                  borderLeft: `4px solid ${s.accent}`,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                }}>
                <p className="text-3xl font-black tabular-nums leading-none" style={{ color: s.accent }}>{s.value}</p>
                <p className="text-xs mt-2 font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)', letterSpacing: '0.06em' }}>{s.label}</p>
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
            {/* Underline tabs */}
            <div className="flex mb-5" style={{ borderBottom: '2px solid var(--border)' }}>
              {tabs.map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className="tap-press flex items-center gap-1.5 px-4 py-2.5 text-sm transition-colors"
                  style={tab === t.key
                    ? { color: 'var(--accent)', fontWeight: 600, borderBottom: '2px solid var(--accent)', marginBottom: '-2px', background: 'none' }
                    : { color: 'var(--text-2)', fontWeight: 500, borderBottom: '2px solid transparent', marginBottom: '-2px', background: 'none' }}>
                  {t.label}
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                    style={tab === t.key
                      ? { background: 'var(--accent-bg)', color: 'var(--accent)' }
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

      {/* Onboarding modal */}
      {showOnboarding && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          padding: '20px',
        }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            padding: '32px',
            width: '100%',
            maxWidth: '380px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>👋</div>
              <h2 style={{ fontSize: '1.3125rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                What should we call you?
              </h2>
              <p style={{ fontSize: '0.9375rem', color: 'var(--text-2)', marginTop: '6px' }}>
                We&apos;ll use this in your daily greeting.
              </p>
            </div>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              placeholder="Your first name"
              autoFocus
              style={{
                width: '100%', padding: '11px 14px', borderRadius: '10px',
                border: '1px solid var(--border)', background: 'var(--bg)',
                color: 'var(--text)', fontSize: '0.9375rem', outline: 'none',
                boxSizing: 'border-box', marginBottom: '14px',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
            <button
              onClick={handleSaveName}
              disabled={!nameInput.trim() || savingName}
              className="btn-press"
              style={{
                width: '100%', padding: '12px', borderRadius: '10px',
                background: nameInput.trim() ? 'var(--accent)' : 'var(--border)',
                color: nameInput.trim() ? '#fff' : 'var(--text-3)',
                fontSize: '0.9375rem', fontWeight: 600, border: 'none',
                cursor: nameInput.trim() && !savingName ? 'pointer' : 'default',
                transition: 'background 0.15s, color 0.15s',
              }}>
              {savingName ? 'Saving…' : "Let's go!"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
