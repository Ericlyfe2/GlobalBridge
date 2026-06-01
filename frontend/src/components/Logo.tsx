export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="relative w-8 h-8">
        <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
          {/* Globe outline */}
          <circle cx="16" cy="16" r="13" stroke="url(#gb-grad)" strokeWidth="1.6" />

          {/* Latitude lines */}
          <path d="M 5 11 Q 16 14, 27 11" stroke="url(#gb-grad)" strokeWidth="1.2" opacity="0.6" />
          <path d="M 4 16 Q 16 19, 28 16" stroke="url(#gb-grad)" strokeWidth="1.2" opacity="0.6" />
          <path d="M 5 21 Q 16 24, 27 21" stroke="url(#gb-grad)" strokeWidth="1.2" opacity="0.6" />

          {/* Longitude line */}
          <path d="M 16 3 L 16 29" stroke="url(#gb-grad)" strokeWidth="1.2" opacity="0.4" />

          {/* Bridge arch */}
          <path
            d="M 6 25 C 6 10, 12 4, 16 4 C 20 4, 26 10, 26 25"
            stroke="url(#gb-grad)"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* Bridge deck */}
          <path
            d="M 10 25 L 22 25"
            stroke="url(#gb-grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* Pillar lines */}
          <line x1="14" y1="20" x2="14" y2="25" stroke="url(#gb-grad)" strokeWidth="1.5" opacity="0.7" />
          <line x1="18" y1="20" x2="18" y2="25" stroke="url(#gb-grad)" strokeWidth="1.5" opacity="0.7" />

          <defs>
            <linearGradient id="gb-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#0f766e" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <span className="font-display text-xl font-semibold tracking-tight text-ink-900">
        GlobalBridge
      </span>
    </div>
  );
}
