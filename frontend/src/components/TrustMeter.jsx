/**
 * TrustMeter.jsx
 * Reusable animated trust score display component.
 *
 * Props:
 *   score       - number 0–100, or null (unrated)
 *   voteCount   - total votes cast (optional)
 *   upvotes     - number (optional)
 *   downvotes   - number (optional)
 *   reports     - number (optional)
 *   compact     - if true, show only the bar + score inline (no chips)
 *   className   - extra class names
 */
export default function TrustMeter({
  score = null,
  voteCount = 0,
  upvotes = 0,
  downvotes = 0,
  reports = 0,
  compact = false,
  className = '',
}) {
  const unrated = score === null || score === undefined;

  const color = unrated
    ? '#64748b'
    : score >= 65
    ? '#10b981'
    : score >= 40
    ? '#f59e0b'
    : '#ef4444';

  const label = unrated
    ? 'Not yet rated'
    : score >= 65
    ? 'Trusted'
    : score >= 40
    ? 'Caution'
    : 'Suspicious';

  const bgColor = unrated
    ? 'rgba(100,116,139,0.15)'
    : score >= 65
    ? 'rgba(16,185,129,0.12)'
    : score >= 40
    ? 'rgba(245,158,11,0.12)'
    : 'rgba(239,68,68,0.12)';

  const borderColor = unrated
    ? 'rgba(100,116,139,0.2)'
    : score >= 65
    ? 'rgba(16,185,129,0.25)'
    : score >= 40
    ? 'rgba(245,158,11,0.25)'
    : 'rgba(239,68,68,0.25)';

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Mini bar */}
        <div
          className="relative flex-1 h-1 rounded-full overflow-hidden"
          style={{ background: 'var(--bg-base)', maxWidth: '80px' }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: unrated ? '50%' : `${score}%`,
              background: unrated
                ? 'rgba(100,116,139,0.4)'
                : `linear-gradient(90deg, ${color}aa, ${color})`,
              transition: 'width 0.8s ease',
              opacity: unrated ? 0.5 : 1,
            }}
          />
        </div>
        <span style={{ color, fontSize: '0.65rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
          {unrated ? 'N/A' : `${Math.round(score)}%`}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem', fontWeight: 600 }}>
          {label}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl p-4 space-y-3 ${className}`}
      style={{ background: bgColor, border: `1px solid ${borderColor}` }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Shield icon dot */}
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
            style={{ background: `${color}20`, color }}
          >
            ⚖
          </span>
          <p className="text-sm font-semibold text-ink">Community trust</p>
        </div>
        <span className="text-sm font-bold" style={{ color }}>
          {unrated ? 'No votes yet' : `${Math.round(score)}% · ${label}`}
        </span>
      </div>

      {/* Bar */}
      <div
        className="relative h-2 rounded-full overflow-hidden"
        style={{ background: 'var(--bg-base)' }}
        role="progressbar"
        aria-valuenow={unrated ? 50 : score}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: unrated ? '50%' : `${score}%`,
            background: unrated
              ? 'rgba(100,116,139,0.3)'
              : `linear-gradient(90deg, ${color}88, ${color})`,
            transition: 'width 0.9s cubic-bezier(0.34, 1.56, 0.64, 1)',
            opacity: unrated ? 0.5 : 1,
          }}
        />
      </div>

      {/* Vote chips */}
      {!unrated && voteCount > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          {upvotes > 0 && (
            <span
              className="th-badge"
              style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              👍 {upvotes} legit
            </span>
          )}
          {downvotes > 0 && (
            <span
              className="th-badge"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              👎 {downvotes} suspicious
            </span>
          )}
          {reports > 0 && (
            <span
              className="th-badge"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              🚩 {reports} reported
            </span>
          )}
        </div>
      )}

      {unrated && (
        <p className="text-xs text-ink-soft">
          No community votes yet. Be the first to vote on this job's authenticity.
        </p>
      )}
    </div>
  );
}
