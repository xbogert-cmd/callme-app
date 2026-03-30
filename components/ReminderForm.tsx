'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Reminder, ReminderCategory, RepeatInterval, CategorySettings, CATEGORY_CONFIG } from '@/types';

interface Props {
  onCreated: (reminder: Reminder | Reminder[]) => void;
}

function defaultDateTime() {
  const d = new Date(Date.now() + 5 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function computeCallTimes(startStr: string, n: number): Date[] {
  const start = new Date(startStr);
  if (isNaN(start.getTime())) return [];
  if (n === 1) return [start];
  const intervalMins = Math.floor((12 * 60) / n);
  return Array.from({ length: n }, (_, i) =>
    i === 0 ? start : new Date(start.getTime() + intervalMins * i * 60000),
  );
}

const PHONE_KEY = 'callme_last_phone';
const CATEGORIES = Object.entries(CATEGORY_CONFIG) as [ReminderCategory, typeof CATEGORY_CONFIG[ReminderCategory]][];

const WORKOUT_TYPES = ['Push Day', 'Pull Day', 'Leg Day', 'Cardio', 'Full Body', 'Basketball', 'Custom'];
const STUDY_SUBJECTS = ['Math', 'Science', 'English', 'History', 'Business', 'Economics', 'Computer Science', 'Other'];

function SlideIn({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return (
    <div style={{
      maxHeight: visible ? '520px' : '0',
      opacity: visible ? 1 : 0,
      overflow: 'hidden',
      transition: 'max-height 0.28s ease, opacity 0.2s ease',
    }}>
      <div style={{ paddingTop: '2px' }}>{children}</div>
    </div>
  );
}

export default function ReminderForm({ onCreated }: Props) {
  const [phone, setPhone]               = useState('');
  const [category, setCategory]         = useState<ReminderCategory>('general');
  const [scheduledTime, setScheduledTime] = useState(defaultDateTime);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [repeat, setRepeat]             = useState<RepeatInterval>('none');

  // General
  const [taskName, setTaskName] = useState('');

  // Workout
  const [workoutType, setWorkoutType]     = useState('');
  const [workoutCustom, setWorkoutCustom] = useState('');
  const [trackWorkouts, setTrackWorkouts] = useState(true);

  // Medication
  const [medicationName, setMedicationName] = useState('');
  const [askMedication, setAskMedication]   = useState(false);

  // Study
  const [studySubject, setStudySubject] = useState('Math');
  const [studyProject, setStudyProject] = useState('');

  // Budget
  const [dailyLimit, setDailyLimit]       = useState('');
  const [checkinsPerDay, setCheckinsPerDay] = useState(2);

  useEffect(() => {
    const saved = localStorage.getItem(PHONE_KEY);
    if (saved) setPhone(saved);
  }, []);

  const callTimes = category === 'budget' ? computeCallTimes(scheduledTime, checkinsPerDay) : [];

  function getEffectiveTaskName(): string {
    switch (category) {
      case 'workout':
        return workoutType === 'Custom' ? workoutCustom.trim() : workoutType;
      case 'medication':
        return medicationName.trim() || 'Medication Reminder';
      case 'study': {
        const proj = studyProject.trim();
        return proj ? `Study - ${studySubject}: ${proj}` : `Study - ${studySubject}`;
      }
      case 'budget':
        return 'Daily Budget Check-in';
      default:
        return taskName;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const dt = new Date(scheduledTime);
    if (isNaN(dt.getTime())) { setError('Invalid date or time'); return; }

    if (category === 'workout' && !workoutType) {
      setError('Please select a workout type'); return;
    }
    if (category === 'workout' && workoutType === 'Custom' && !workoutCustom.trim()) {
      setError('Please enter your custom workout'); return;
    }
    if (category === 'general' && !taskName.trim()) {
      setError('Please enter a task name'); return;
    }

    const effectiveTaskName = getEffectiveTaskName();
    const category_settings: CategorySettings = {};

    if (category === 'workout') {
      category_settings.trackWorkouts = trackWorkouts;
    } else if (category === 'medication') {
      category_settings.askMedication = askMedication;
    } else if (category === 'budget') {
      const limit = parseFloat(dailyLimit);
      if (!dailyLimit || isNaN(limit) || limit <= 0) {
        setError('Please enter a valid daily spending limit'); return;
      }
      category_settings.dailyLimit = limit;
      category_settings.checkinsPerDay = checkinsPerDay;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_name: effectiveTaskName,
          user_phone: phone,
          scheduled_time: dt.toISOString(),
          category,
          category_settings,
          repeat,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create reminder');
      }
      const result = await res.json();
      localStorage.setItem(PHONE_KEY, phone);
      onCreated(result);
      // Reset all fields
      setTaskName('');
      setWorkoutType('');
      setWorkoutCustom('');
      setMedicationName('');
      setStudyProject('');
      setCategory('general');
      setScheduledTime(defaultDateTime());
      setDailyLimit('');
      setCheckinsPerDay(2);
      setRepeat('none');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const baseInputStyle = { background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' };
  const inputClass = "w-full text-sm rounded-lg px-3 py-2.5 outline-none";
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = 'var(--accent)';
    e.target.style.boxShadow = '0 0 0 3px var(--accent-bg)';
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = 'var(--border)';
    e.target.style.boxShadow = 'none';
  };

  const pillActive   = { background: 'var(--accent-bg)', border: '1.5px solid var(--accent)', color: 'var(--accent)' };
  const pillInactive = { background: 'var(--surface-2)', border: '1.5px solid var(--border)', color: 'var(--text-2)' };

  return (
    <div className="rounded-xl bg-white p-5"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}>

      <h2 className="text-base font-bold mb-4" style={{ color: 'var(--text)' }}>New Reminder</h2>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg text-xs font-medium"
          style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">

        {/* ── Category selector ── */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Category</label>
          <div className="grid grid-cols-5 gap-1.5">
            {CATEGORIES.map(([key, cfg]) => (
              <button key={key} type="button" onClick={() => setCategory(key)}
                className="flex flex-col items-center gap-1 py-2.5 rounded-lg text-xs font-medium transition-all"
                style={category === key
                  ? { ...pillActive, boxShadow: '0 0 0 3px rgba(59,130,246,0.15)' }
                  : pillInactive}>
                <span className="text-lg leading-none">{cfg.emoji}</span>
                <span className="text-[10px] font-semibold leading-none">{cfg.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── WORKOUT ── */}
        <SlideIn visible={category === 'workout'}>
          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Workout type</label>
              <div className="flex flex-wrap gap-1.5">
                {WORKOUT_TYPES.map((type) => (
                  <button key={type} type="button" onClick={() => setWorkoutType(type)}
                    className="tap-press py-1.5 px-3 rounded-lg text-xs font-semibold transition-all"
                    style={workoutType === type ? pillActive : pillInactive}>
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Nested SlideIn for custom input */}
            <SlideIn visible={workoutType === 'Custom'}>
              <input
                type="text"
                value={workoutCustom}
                onChange={(e) => setWorkoutCustom(e.target.value)}
                placeholder="e.g. Swimming, Yoga, Rock Climbing…"
                className={inputClass}
                style={baseInputStyle}
                onFocus={onFocus} onBlur={onBlur}
              />
            </SlideIn>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={trackWorkouts} onChange={(e) => setTrackWorkouts(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-500" />
              <span className="text-xs" style={{ color: 'var(--text-2)' }}>Track my workouts (AI asks what you did)</span>
            </label>
          </div>
        </SlideIn>

        {/* ── MEDICATION ── */}
        <SlideIn visible={category === 'medication'}>
          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
                Medication name
                <span className="ml-1 font-normal" style={{ color: 'var(--text-3)' }}>(optional)</span>
              </label>
              <input
                type="text"
                value={medicationName}
                onChange={(e) => setMedicationName(e.target.value)}
                placeholder="e.g. Vitamin D, Metformin… or leave blank"
                className={inputClass}
                style={baseInputStyle}
                onFocus={onFocus} onBlur={onBlur}
              />
              {!medicationName.trim() && (
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>
                  Task will be saved as &ldquo;Medication Reminder&rdquo;
                </p>
              )}
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={askMedication} onChange={(e) => setAskMedication(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-500" />
              <span className="text-xs" style={{ color: 'var(--text-2)' }}>Ask which medication I took</span>
            </label>
          </div>
        </SlideIn>

        {/* ── STUDY ── */}
        <SlideIn visible={category === 'study'}>
          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Subject</label>
              <select
                value={studySubject}
                onChange={(e) => setStudySubject(e.target.value)}
                className={inputClass}
                style={baseInputStyle}
                onFocus={onFocus} onBlur={onBlur}>
                {STUDY_SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
                Project / Assignment
                <span className="ml-1 font-normal" style={{ color: 'var(--text-3)' }}>(optional)</span>
              </label>
              <input
                type="text"
                value={studyProject}
                onChange={(e) => setStudyProject(e.target.value)}
                placeholder="e.g. Chapter 5 quiz, Midterm prep…"
                className={inputClass}
                style={baseInputStyle}
                onFocus={onFocus} onBlur={onBlur}
              />
            </div>
            <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>
              Task:{' '}
              <span className="font-medium" style={{ color: 'var(--text-2)' }}>
                {studyProject.trim()
                  ? `Study - ${studySubject}: ${studyProject.trim()}`
                  : `Study - ${studySubject}`}
              </span>
            </p>
          </div>
        </SlideIn>

        {/* ── BUDGET ── */}
        <SlideIn visible={category === 'budget'}>
          <div className="space-y-2.5 px-3 py-3 rounded-lg"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              Task: <span className="font-medium" style={{ color: 'var(--text-2)' }}>Daily Budget Check-in</span>
            </p>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-2)' }}>Daily spending limit</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium"
                  style={{ color: 'var(--text-3)' }}>$</span>
                <input type="number" min="1" step="0.01" value={dailyLimit}
                  onChange={(e) => setDailyLimit(e.target.value)}
                  placeholder="50.00"
                  className="w-full text-sm rounded-lg pl-6 pr-3 py-2.5 outline-none"
                  style={baseInputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-2)' }}>Check-in calls per day</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map((n) => (
                  <button key={n} type="button" onClick={() => setCheckinsPerDay(n)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={checkinsPerDay === n ? pillActive : { ...pillInactive, background: 'var(--surface)' }}>
                    {n}×
                  </button>
                ))}
              </div>
            </div>
            {callTimes.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5"
                  style={{ color: 'var(--text-3)' }}>Call schedule preview</p>
                <div className="flex flex-wrap gap-1.5">
                  {callTimes.map((t, i) => (
                    <span key={i} className="text-xs font-medium px-2 py-1 rounded-md"
                      style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid rgba(59,130,246,0.2)' }}>
                      {i + 1}. {format(t, 'h:mm a')}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-3)' }}>
                  Set &ldquo;First call at&rdquo; below to change the start time
                </p>
              </div>
            )}
          </div>
        </SlideIn>

        {/* ── GENERAL ── free text task */}
        <SlideIn visible={category === 'general'}>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Task</label>
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="e.g. Call the dentist, Finish report…"
              className={inputClass}
              style={baseInputStyle}
              onFocus={onFocus} onBlur={onBlur}
            />
          </div>
        </SlideIn>

        {/* ── Phone ── */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Phone Number</label>
          <input type="tel" required value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className={inputClass} style={baseInputStyle} onFocus={onFocus} onBlur={onBlur} />
        </div>

        {/* ── Time ── */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
            {category === 'budget' ? 'First call at' : 'Call me at'}
          </label>
          <input type="datetime-local" required value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className={inputClass} style={baseInputStyle}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-bg)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
        </div>

        {/* ── Repeat ── */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Repeat</label>
          <div className="flex gap-1.5">
            {(['none', 'daily', 'weekly'] as const).map((opt) => (
              <button key={opt} type="button" onClick={() => setRepeat(opt)}
                className="tap-press flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                style={repeat === opt ? pillActive : pillInactive}>
                {opt === 'none' ? 'None' : opt === 'daily' ? '📅 Daily' : '📆 Weekly'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Submit ── */}
        <button type="submit" disabled={loading}
          className="btn-press w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: 'var(--accent)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-dark)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(59,130,246,0.4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.boxShadow = 'none'; }}>
          {loading ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Scheduling…</>
          ) : (
            <><span>📞</span> Schedule Reminder Call</>
          )}
        </button>

      </form>
    </div>
  );
}
