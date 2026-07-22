type IconProps = { className?: string };

const base = "h-5 w-5";

export function IconEdition({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M6 3h9l4 4v14H6z" strokeLinejoin="round" />
      <path d="M15 3v4h4" strokeLinejoin="round" />
      <path d="M9 12h6M9 15.5h6M9 8.5h3" strokeLinecap="round" />
    </svg>
  );
}

export function IconCalendarCheck({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" strokeLinecap="round" />
      <path d="M8.5 14l2 2 4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconStack({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M12 3.5l8 4-8 4-8-4z" strokeLinejoin="round" />
      <path d="M4 12l8 4 8-4M4 16l8 4 8-4" strokeLinejoin="round" />
    </svg>
  );
}

export function IconEye({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconBriefcaseOff({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <rect x="3" y="8" width="18" height="11.5" rx="2" />
      <path d="M8.5 8V6.5A2 2 0 0110.5 4.5h3a2 2 0 012 2V8" />
      <path d="M3 13h18" strokeDasharray="3 3" />
    </svg>
  );
}

export function IconClock({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconAlert({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M12 3.5l9.5 16.5H2.5z" strokeLinejoin="round" />
      <path d="M12 9.5v4.5" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
