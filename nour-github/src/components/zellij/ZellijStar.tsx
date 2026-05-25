import { cn } from '@/lib/cn';

interface ZellijStarProps {
  size?: number;
  className?: string;
  spin?: boolean;
  variant?: 'emerald' | 'gold' | 'duotone';
}

/**
 * Étoile zellij à 8 branches, vectorielle. Sert de logo NOBTY,
 * de marqueur de chargement et d'élément décoratif.
 */
export function ZellijStar({ size = 80, className, spin = false, variant = 'duotone' }: ZellijStarProps) {
  const stroke1 = variant === 'gold' ? '#C9A84C' : '#2D6A4F';
  const stroke2 = variant === 'emerald' ? '#1B4F8A' : '#C9A84C';
  const inner   = variant === 'gold' ? '#2D6A4F' : '#1B4F8A';
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="-70 -70 140 140"
      className={cn(spin && 'animate-star-spin', className)}
      aria-hidden="true"
    >
      <path
        d="M0,-60 L17,-17 L60,0 L17,17 L0,60 L-17,17 L-60,0 L-17,-17 Z"
        fill="none" stroke={stroke1} strokeWidth="2.4" strokeLinejoin="round"
      />
      <path
        d="M-42,-42 L42,-42 L42,42 L-42,42 Z"
        fill="none" stroke={stroke2} strokeWidth="1.6" transform="rotate(45)"
      />
      <circle r="9" fill="none" stroke={inner} strokeWidth="1.6" />
      <circle r="3" fill={inner} />
    </svg>
  );
}
