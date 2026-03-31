import { Badge } from '@/components/ui/badge';
import { ConfidenceLevel } from '@/types/contact';
import { cn } from '@/lib/utils';

const config: Record<ConfidenceLevel, { label: string; className: string }> = {
  high: { label: 'HIGH', className: 'bg-steel text-steel-foreground border-steel hover:bg-steel/90' },
  medium: { label: 'MED', className: 'bg-secondary text-secondary-foreground border-secondary hover:bg-secondary/90' },
  low: { label: 'LOW', className: 'bg-destructive/80 text-destructive-foreground border-destructive hover:bg-destructive/70' },
};

export const ConfidenceBadge = ({ level }: { level: ConfidenceLevel }) => {
  const c = config[level];
  return (
    <Badge className={cn('text-[10px] tracking-widest font-semibold', c.className)}>
      {c.label}
    </Badge>
  );
};
