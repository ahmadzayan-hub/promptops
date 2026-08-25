interface LogoProps {
  className?: string;
}

/**
 * PromptOps brand mark: a stylised desk with a book and a focus dot ·
 * carried over from the platform's original mark. Single SVG, no deps.
 */
export default function Logo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      role="img"
      aria-label="PromptOps · ZAIan Studio"
      className={className}
    >
      <defs>
        <linearGradient id="mk-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="55%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="mk-book" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
      </defs>

      {/* Rounded tile background */}
      <rect width="512" height="512" rx="112" fill="url(#mk-bg)" />

      {/* The "desk" · a horizontal surface with two legs */}
      <rect x="96"  y="316" width="320" height="20" rx="10" fill="#ffffff" opacity="0.95" />
      <rect x="124" y="336" width="18"  height="64" rx="6"  fill="#ffffff" opacity="0.7" />
      <rect x="370" y="336" width="18"  height="64" rx="6"  fill="#ffffff" opacity="0.7" />

      {/* Open book sitting on the desk */}
      <path
        d="M152 316 L152 220 Q152 200 172 200 L248 200 Q256 200 256 208 L256 316 Z"
        fill="url(#mk-book)"
        opacity="0.96"
      />
      <path
        d="M360 316 L360 220 Q360 200 340 200 L264 200 Q256 200 256 208 L256 316 Z"
        fill="url(#mk-book)"
        opacity="0.78"
      />
      {/* Book spine + page lines */}
      <line x1="256" y1="208" x2="256" y2="316" stroke="#1e3a8a" strokeWidth="3" opacity="0.35" />
      <line x1="178" y1="232" x2="240" y2="232" stroke="#1e3a8a" strokeWidth="3" opacity="0.25" />
      <line x1="178" y1="252" x2="240" y2="252" stroke="#1e3a8a" strokeWidth="3" opacity="0.20" />
      <line x1="272" y1="232" x2="334" y2="232" stroke="#1e3a8a" strokeWidth="3" opacity="0.25" />
      <line x1="272" y1="252" x2="334" y2="252" stroke="#1e3a8a" strokeWidth="3" opacity="0.20" />

      {/* Focus spark · the "AI" of the desk */}
      <circle cx="384" cy="140" r="20" fill="#fde68a" />
      <circle cx="384" cy="140" r="38" fill="#fde68a" opacity="0.25" />
    </svg>
  );
}
