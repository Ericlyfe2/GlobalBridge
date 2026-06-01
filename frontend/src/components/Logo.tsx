export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative w-8 h-8">
        <svg viewBox="0 0 32 32" className="w-full h-full">
          <defs>
            <linearGradient id="gb-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#0f766e" />
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="14" fill="url(#gb-grad)" />
          <path
            d="M 8 16 Q 16 6, 24 16 Q 16 26, 8 16"
            stroke="#f8fafc"
            strokeWidth="1.5"
            fill="none"
          />
          <circle cx="16" cy="16" r="2.5" fill="#f8fafc" />
        </svg>
      </div>
      <span className="font-display text-xl font-semibold tracking-tight text-ink-900">
        GlobalBridge
      </span>
    </div>
  );
}
