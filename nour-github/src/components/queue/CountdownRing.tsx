interface CountdownRingProps {
  /** Valeur courante (entier). */
  value: number;
  /** Borne max (utilisée pour le ratio d'avancement). */
  max: number;
  /** Diamètre extérieur en px. */
  size?: number;
  label?: string;
  sublabel?: string;
}

/** Anneau doré gradué représentant la progression dans la file. */
export function CountdownRing({ value, max, size = 220, label, sublabel }: CountdownRingProps) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = max > 0 ? Math.min(1, Math.max(0, 1 - value / max)) : 1;
  const dash = c * ratio;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="gold-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E5C977" />
            <stop offset="50%" stopColor="#C9A84C" />
            <stop offset="100%" stopColor="#B6953D" />
          </linearGradient>
        </defs>
        {/* Anneau de fond */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-leather/10 dark:text-ivory/10"
        />
        {/* Anneau doré */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="url(#gold-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-ticket text-5xl text-leather dark:text-ivory">{value}</span>
        {label && <span className="text-xs uppercase tracking-widest text-leather/60 dark:text-ivory/60">{label}</span>}
        {sublabel && <span className="text-xs text-leather/60 dark:text-ivory/60 mt-1">{sublabel}</span>}
      </div>
    </div>
  );
}
