const toneConfig = {
  teal: {
    accent: '#06b6d4',
    glow: 'rgba(6,182,212,0.08)',
    border: 'rgba(6,182,212,0.2)',
  },
  rust: {
    accent: '#f97316',
    glow: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.2)',
  },
  slate: {
    accent: '#818cf8',
    glow: 'rgba(129,140,248,0.08)',
    border: 'rgba(129,140,248,0.2)',
  },
  rose: {
    accent: '#fb7185',
    glow: 'rgba(251,113,133,0.08)',
    border: 'rgba(251,113,133,0.2)',
  },
};

export default function StatCard({ label, value, helper, tone = 'teal' }) {
  const cfg = toneConfig[tone] || toneConfig.teal;

  return (
    <div
      className="th-metric animate-fade-in"
      style={{
        background: `linear-gradient(145deg, var(--bg-card) 0%, ${cfg.glow} 100%)`,
        borderColor: cfg.border,
      }}
    >
      <p className="th-label">{label}</p>
      <p
        className="mt-3 text-3xl font-extrabold tracking-tight"
        style={{ color: cfg.accent }}
      >
        {value}
      </p>
      {helper ? <p className="mt-2 text-sm text-ink-soft">{helper}</p> : null}
    </div>
  );
}
