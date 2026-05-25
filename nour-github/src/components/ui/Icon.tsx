import { cn } from '@/lib/cn';

/**
 * Mini bibliothèque d'icônes inline (stroke 1.6, currentColor) — pas de dépendance.
 * Couvre tous les `icon` du seed `institution_types` + quelques utilitaires UI.
 */
const PATHS: Record<string, string> = {
  mail:      'M3 7l9 6 9-6M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7l9 6 9-6',
  bank:      'M3 9l9-6 9 6M5 9v10M19 9v10M9 9v10M15 9v10M3 21h18',
  hospital:  'M4 21V9l8-5 8 5v12M9 21v-6h6v6M12 12v3M10.5 13.5h3',
  health:    'M12 21s-7-4.5-7-11a4 4 0 018-1 4 4 0 018 1c0 6.5-7 11-7 11',
  scale:     'M12 3v18M5 9l3 8M19 9l-3 8M3 9h18',
  home:      'M3 11l9-8 9 8M5 10v10h14V10',
  building:  'M4 21V5l8-2 8 2v16M8 9h2m4 0h2M8 13h2m4 0h2M8 17h2m4 0h2',
  map:       'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  shield:    'M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3z',
  briefcase: 'M3 7h18v12H3zM8 7V5a2 2 0 012-2h4a2 2 0 012 2v2',
  bolt:      'M13 2L4 14h7l-1 8 9-12h-7l1-8z',
  droplet:   'M12 3s7 7 7 12a7 7 0 11-14 0c0-5 7-12 7-12z',
  phone:     'M3 5a2 2 0 012-2h2l2 5-2 1a11 11 0 005 5l1-2 5 2v2a2 2 0 01-2 2A16 16 0 013 5z',
  receipt:   'M5 3v18l2-1 2 1 2-1 2 1 2-1 2 1 2-1V3l-2 1-2-1-2 1-2-1-2 1-2-1z',
  // Utilitaires
  search:    'M11 19a8 8 0 110-16 8 8 0 010 16zM21 21l-5-5',
  locate:    'M12 3v2M12 19v2M3 12h2M19 12h2M12 8a4 4 0 100 8 4 4 0 000-8z',
  user:      'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  bell:      'M6 8a6 6 0 1112 0c0 7 3 8 3 8H3s3-1 3-8M10 21h4',
  check:     'M5 12l4 4L19 7',
  x:         'M6 6l12 12M18 6L6 18',
  chevron:   'M9 6l6 6-6 6',
  back:      'M15 6l-6 6 6 6',
  globe:     'M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18M3 12a9 9 0 0118 0 9 9 0 01-18 0z',
  moon:      'M20 14A8 8 0 1110 4a7 7 0 0010 10z',
  sun:       'M12 4v2M12 18v2M4 12h2M18 12h2M6 6l1.4 1.4M16.6 16.6L18 18M6 18l1.4-1.4M16.6 7.4L18 6M12 8a4 4 0 100 8 4 4 0 000-8z',
  ticket:    'M4 8a2 2 0 012-2h12a2 2 0 012 2v3a2 2 0 100 4v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3a2 2 0 100-4V8z',
  chat:      'M4 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 4v-4H6a2 2 0 01-2-2V6z',
  fingerprint: 'M12 11a3 3 0 00-3 3v4M12 11a3 3 0 013 3M9 21a6 6 0 016-12M15 21a9 9 0 00-9-9M5 14V8a7 7 0 0114 0v6',
  route: 'M6 19a2 2 0 11-4 0 2 2 0 014 0zM22 5a2 2 0 11-4 0 2 2 0 014 0zM6 19c0-6 12-6 12-14',
  clock: 'M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z',
  spinner: 'M12 3a9 9 0 109 9',
};

interface IconProps {
  name: keyof typeof PATHS | string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 22, className, strokeWidth = 1.6 }: IconProps) {
  const d = PATHS[name] ?? PATHS.chevron;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('inline-block', className)}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
