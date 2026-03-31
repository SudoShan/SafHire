import { sentenceCase, statusTone } from '../lib/utils';

const toneStyles = {
  success: {
    bg: 'rgba(16,185,129,0.12)',
    color: '#34d399',
    border: 'rgba(16,185,129,0.25)',
  },
  warning: {
    bg: 'rgba(245,158,11,0.12)',
    color: '#fbbf24',
    border: 'rgba(245,158,11,0.25)',
  },
  danger: {
    bg: 'rgba(239,68,68,0.12)',
    color: '#f87171',
    border: 'rgba(239,68,68,0.25)',
  },
  neutral: {
    bg: 'rgba(148,163,184,0.1)',
    color: '#94a3b8',
    border: 'rgba(148,163,184,0.2)',
  },
};

export default function StatusBadge({ status }) {
  const tone = statusTone(status);
  const s = toneStyles[tone] || toneStyles.neutral;

  return (
    <span
      className="th-badge"
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
      }}
    >
      {sentenceCase(status || 'Unknown')}
    </span>
  );
}
