export default function LoadingScreen({ label = 'Loading TrustHire…' }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-5 text-center">
        {/* Spinner */}
        <div className="relative h-14 w-14">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: '2px solid rgba(99,102,241,0.1)',
            }}
          />
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: '2px solid transparent',
              borderTopColor: '#6366f1',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <div
            className="absolute inset-2 rounded-full"
            style={{
              border: '2px solid transparent',
              borderTopColor: '#06b6d4',
              animation: 'spin 1.2s linear infinite reverse',
            }}
          />
        </div>

        <div>
          <p className="text-base font-semibold text-ink">{label}</p>
          <p className="mt-1 text-sm text-ink-soft">Fetching the latest placement data…</p>
        </div>
      </div>
    </div>
  );
}
