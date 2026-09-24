export default function HeroBanner() {
  return (
    <section className="hero">
      <div className="hero-copy">
        <h1 className="hero-title">
          YOUR ALL-IN-ONE
          <span className="hero-gradient">Free AI Toolbox</span>
        </h1>
        <p className="hero-desc">
          Chat with Ollama (local &amp; offline), OpenRouter free models, generate images, use powerful
          tools — all in one place.
        </p>
        <div className="hero-badges">
          <span className="hero-badge">100% Free</span>
          <span className="hero-badge">No API cost</span>
          <span className="hero-badge">Local + Cloud</span>
          <span className="hero-badge">Privacy First</span>
        </div>
      </div>

      <div className="hero-art" aria-hidden="true">
        <svg viewBox="0 0 240 200" className="hero-robot">
          <defs>
            <linearGradient id="hg-glow" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#2bff88" stopOpacity="0.95" />
              <stop offset="1" stopColor="#14d8ff" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="hg-body" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0b1516" />
              <stop offset="1" stopColor="#071014" />
            </linearGradient>
          </defs>

          {/* antenna */}
          <line x1="120" y1="26" x2="120" y2="46" stroke="url(#hg-glow)" strokeWidth="2.5" />
          <circle cx="120" cy="20" r="6" fill="url(#hg-glow)" />

          {/* head */}
          <rect x="70" y="46" width="100" height="78" rx="22" fill="url(#hg-body)" stroke="url(#hg-glow)" strokeWidth="2" />
          {/* eyes */}
          <circle cx="102" cy="84" r="9" fill="url(#hg-glow)" />
          <circle cx="138" cy="84" r="9" fill="url(#hg-glow)" />
          <circle cx="106" cy="80" r="2.5" fill="#04140c" />
          <circle cx="142" cy="80" r="2.5" fill="#04140c" />
          {/* mouth */}
          <path d="M104 112 q16 12 32 0" stroke="url(#hg-glow)" strokeWidth="2.5" fill="none" strokeLinecap="round" />

          {/* neck */}
          <rect x="111" y="124" width="18" height="12" rx="4" fill="#12211f" />

          {/* body */}
          <rect x="78" y="136" width="84" height="48" rx="16" fill="url(#hg-body)" stroke="url(#hg-glow)" strokeWidth="2" />
          <circle cx="120" cy="160" r="10" fill="none" stroke="url(#hg-glow)" strokeWidth="1.6" opacity="0.7" />
          <circle cx="120" cy="160" r="4.5" fill="url(#hg-glow)" />
          {/* arms */}
          <rect x="56" y="146" width="20" height="11" rx="5.5" fill="url(#hg-body)" stroke="url(#hg-glow)" strokeWidth="1.6" />
          <rect x="164" y="146" width="20" height="11" rx="5.5" fill="url(#hg-body)" stroke="url(#hg-glow)" strokeWidth="1.6" />
        </svg>
      </div>
    </section>
  )
}