import { cn } from '@/lib/cn';

/** Une arche mauresque, utilisée en sommet de carte ou de page. */
export function MoorishArch({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 80"
      preserveAspectRatio="none"
      className={cn('w-full h-16 text-gold/70', className)}
      aria-hidden="true"
    >
      <path
        d="M0,80 L0,40 C0,18 30,0 100,0 C170,0 200,18 200,40 L200,80"
        fill="none" stroke="currentColor" strokeWidth="1.5"
      />
      <path
        d="M10,80 L10,42 C10,24 36,8 100,8 C164,8 190,24 190,42 L190,80"
        fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.7"
      />
    </svg>
  );
}
