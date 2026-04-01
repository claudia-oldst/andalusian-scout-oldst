import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CONFIDENCE } from '@/types/contact';

const config: Record<number, { label: string; className: string }> = {
  [CONFIDENCE.HIGH]: { label: 'HIGH', className: 'bg-steel/15 text-steel border-steel/30 hover:bg-steel/20' },
  [CONFIDENCE.MEDIUM]: { label: 'MED', className: 'bg-accent/15 text-accent border-accent/30 hover:bg-accent/20' },
  [CONFIDENCE.LOW]: { label: 'LOW', className: 'bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20' },
};

export const ConfidenceBadge = ({ confidenceId }: { confidenceId: number }) => {
  const c = config[confidenceId] || config[CONFIDENCE.LOW];
  return (
    <Badge variant="outline" className={cn('text-[10px] tracking-widest font-semibold', c.className)}>
      {c.label}
    </Badge>
  );
};
