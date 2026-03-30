// Server component — purely decorative, no interactivity
export default function BackgroundDecor() {
  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>

      {/* ── Gradient blobs ── */}
      <div style={{
        position: 'absolute', top: '-18%', right: '-12%',
        width: 720, height: 720, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 68%)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-18%', left: '-10%',
        width: 640, height: 640, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 68%)',
      }} />
      <div style={{
        position: 'absolute', top: '30%', left: '-8%',
        width: 380, height: 380, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 68%)',
      }} />
      <div style={{
        position: 'absolute', top: '55%', right: '-6%',
        width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 68%)',
      }} />

      {/* ── Alarm clock — top left ── */}
      <svg
        viewBox="0 0 24 24" fill="none" stroke="#6366F1"
        strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"
        style={{ position: 'absolute', top: '3%', left: '1%', width: 215, height: 215, opacity: 0.048, transform: 'rotate(-13deg)' }}>
        <circle cx="12" cy="13" r="9" />
        <path d="M12 9v4l2.5 2.5" />
        <path d="M6.5 3.5L4.5 5.5M17.5 3.5L19.5 5.5" />
        <path d="M9 22h6M12 22v-1" />
      </svg>

      {/* ── Bell — top right ── */}
      <svg
        viewBox="0 0 24 24" fill="none" stroke="#3B82F6"
        strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"
        style={{ position: 'absolute', top: '10%', right: '1%', width: 175, height: 175, opacity: 0.042, transform: 'rotate(14deg)' }}>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>

      {/* ── Phone — left mid ── */}
      <svg
        viewBox="0 0 24 24" fill="none" stroke="#8B5CF6"
        strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"
        style={{ position: 'absolute', top: '40%', left: '-1%', width: 158, height: 158, opacity: 0.052, transform: 'rotate(-19deg)' }}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 3.09 8.8a19.79 19.79 0 0 1-3-8.63A2 2 0 0 1 2.18 0H5a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L6.91 7.9a16 16 0 0 0 6.29 6.29l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 14.92v2z" />
      </svg>

      {/* ── Alarm clock — bottom right, large ── */}
      <svg
        viewBox="0 0 24 24" fill="none" stroke="#3B82F6"
        strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"
        style={{ position: 'absolute', bottom: '10%', right: '1%', width: 235, height: 235, opacity: 0.042, transform: 'rotate(22deg)' }}>
        <circle cx="12" cy="13" r="9" />
        <path d="M12 9v4l2.5 2.5" />
        <path d="M6.5 3.5L4.5 5.5M17.5 3.5L19.5 5.5" />
        <path d="M9 22h6M12 22v-1" />
      </svg>

      {/* ── Bell — bottom left ── */}
      <svg
        viewBox="0 0 24 24" fill="none" stroke="#6366F1"
        strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"
        style={{ position: 'absolute', bottom: '6%', left: '10%', width: 132, height: 132, opacity: 0.038, transform: 'rotate(-9deg)' }}>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>

      {/* ── Phone — lower right ── */}
      <svg
        viewBox="0 0 24 24" fill="none" stroke="#8B5CF6"
        strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"
        style={{ position: 'absolute', bottom: '28%', right: '10%', width: 142, height: 142, opacity: 0.035, transform: 'rotate(-24deg)' }}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 3.09 8.8a19.79 19.79 0 0 1-3-8.63A2 2 0 0 1 2.18 0H5a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L6.91 7.9a16 16 0 0 0 6.29 6.29l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 14.92v2z" />
      </svg>

      {/* ── Alarm clock — small, center-left filler ── */}
      <svg
        viewBox="0 0 24 24" fill="none" stroke="#6366F1"
        strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"
        style={{ position: 'absolute', top: '65%', left: '5%', width: 95, height: 95, opacity: 0.03, transform: 'rotate(8deg)' }}>
        <circle cx="12" cy="13" r="9" />
        <path d="M12 9v4l2.5 2.5" />
        <path d="M6.5 3.5L4.5 5.5M17.5 3.5L19.5 5.5" />
      </svg>

    </div>
  );
}
