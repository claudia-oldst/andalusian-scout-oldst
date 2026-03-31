import { Badge } from '@/components/ui/badge';
import { ConfidenceLevel } from '@/types/contact';
import { cn } from '@/lib/utils';

const config: Record<ConfidenceLevel, { label: string; className: string }> = {
  high: { label: 'HIGH', className: 'bg-steel/15 text-steel border-steel/30 hover:bg-steel/20' },
  medium: { label: 'MED', className: 'bg-accent/15 text-accent border-accent/30 hover:bg-accent/20' },
  low: { label: 'LOW', className: 'bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20' },
};

export const ConfidenceBadge = ({ level }: { level: ConfidenceLevel }) => {
  const c = config[level];
  return (
    <Badge variant="outline" className={cn('text-[10px] tracking-widest font-semibold', c.className)}>
      {c.label}
    </Badge>
  );
};
