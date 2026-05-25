import { ZellijStar } from '@/components/zellij/ZellijStar';
import { cn } from '@/lib/cn';

export function Spinner({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-3 py-12', className)}>
      <ZellijStar size={56} spin variant="duotone" />
      {label && <p className="text-sm text-leather/70 dark:text-ivory/70">{label}</p>}
    </div>
  );
}
