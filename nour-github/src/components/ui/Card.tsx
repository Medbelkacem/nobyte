import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  arch?: boolean;       // ajoute une arche mauresque en sommet
  interactive?: boolean;// scale au survol/clic
  as?: 'div' | 'button' | 'a';
  children?: ReactNode;
}

export function Card({
  arch, interactive, className, as = 'div', children, ...rest
}: CardProps) {
  const Tag = as as 'div';
  return (
    <Tag
      className={cn(
        'nobty-card',
        arch && 'nobty-card-arch pt-7',
        interactive && 'cursor-pointer transition active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-lg',
        className,
      )}
      {...(rest as HTMLAttributes<HTMLDivElement>)}
    >
      {children}
    </Tag>
  );
}
