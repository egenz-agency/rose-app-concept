// All inline SVG icons — no emoji, no external icon library dependencies
// Stroke weight: 1.25 throughout (ultra-light, premium)

interface IconProps { size?: number; className?: string; color?: string }
const S = (props: IconProps) => ({ width: props.size ?? 16, height: props.size ?? 16, viewBox: "0 0 24 24", fill: "none", stroke: props.color ?? "currentColor", strokeWidth: 1.25, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className: props.className })

export const RoseIcon = (p: IconProps) => (
  <svg {...S(p)}>
    {/* Stem */}
    <line x1="12" y1="13" x2="12" y2="22" />
    {/* Left leaf */}
    <path d="M12 17 Q8 15 8 12" />
    {/* Right leaf */}
    <path d="M12 17 Q16 15 16 12" />
    {/* Outer petals ring */}
    <path d="M12 4 C14 4 16 6 16 8 C16 6 18 4 18 4 C18 6 17 9 15 10 C17 9 20 10 20 10 C19 11 16 12 14 11 C15 13 14 15 12 15 C10 15 9 13 10 11 C8 12 5 11 4 10 C4 10 7 9 9 10 C7 9 6 6 6 4 C6 4 8 6 8 8 C8 6 10 4 12 4Z" />
    {/* Inner bloom center */}
    <circle cx="12" cy="9" r="2" />
  </svg>
)

export const LetterIcon = (p: IconProps) => (
  <svg {...S(p)}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <polyline points="3,5 12,13 21,5" />
  </svg>
)

export const StarIcon = (p: IconProps) => (
  <svg {...S(p)}>
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
  </svg>
)

export const CloseIcon = (p: IconProps) => (
  <svg {...S(p)}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

export const ArrowRightIcon = (p: IconProps) => (
  <svg {...S(p)}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12,5 19,12 12,19" />
  </svg>
)

export const ArrowLeftIcon = (p: IconProps) => (
  <svg {...S(p)}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12,19 5,12 12,5" />
  </svg>
)

export const SoundOffIcon = (p: IconProps) => (
  <svg {...S(p)}>
    <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
)

export const SoundOnIcon = (p: IconProps) => (
  <svg {...S(p)}>
    <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
)

export const LockIcon = (p: IconProps) => (
  <svg {...S(p)}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

export const SparkleIcon = (p: IconProps) => (
  <svg {...S(p)}>
    <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5Z" />
    <path d="M5 4L5.5 6L7 6.5L5.5 7L5 9L4.5 7L3 6.5L4.5 6Z" />
    <path d="M19 15L19.5 17L21 17.5L19.5 18L19 20L18.5 18L17 17.5L18.5 17Z" />
  </svg>
)

export const PlayIcon = (p: IconProps) => (
  <svg {...S(p)}>
    <polygon points="5,3 19,12 5,21" />
  </svg>
)

export const SproutIcon = (p: IconProps) => (
  <svg {...S(p)}>
    <path d="M12 22V12" />
    <path d="M12 12C12 7 17 4 17 4s0 8-5 8Z" />
    <path d="M12 12C12 7 7 4 7 4s0 8 5 8Z" />
  </svg>
)

export const PlusIcon = (p: IconProps) => (
  <svg {...S(p)}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

export const ScrollIcon = (p: IconProps) => (
  <svg {...S(p)}>
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14,2 14,8 20,8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="16" y2="17" />
  </svg>
)

export const HeartIcon = (p: IconProps) => (
  <svg {...S(p)}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
)
