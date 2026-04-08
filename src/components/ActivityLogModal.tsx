import { Contact, ActivityLog, DESIGNATION } from '@/types/contact';
import { ConfidenceBadge } from './ConfidenceBadge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExternalLink, Radar } from 'lucide-react';
import { format } from 'date-fns';
import { getMatchingCompanyLocation, resolveDisplayLocation } from '@/lib/location-matching';

interface ActivityLogModalProps {
  contact: Contact | null;
  activityLogs: ActivityLog[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (id: string) => void;
  onHILChange: (id: string, designationId: number) => void;
  onRunDiscovery?: (contactId: string) => void;
  discoveryRunning?: boolean;
}

export const ActivityLogModal = ({
  contact,
  activityLogs,
  open,
  onOpenChange,
  onApprove,
  onHILChange,
  onRunDiscovery,
  discoveryRunning,
}: ActivityLogModalProps) => {
  if (!contact) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-lg font-semibold">{contact.name}</span>
            <ConfidenceBadge confidenceId={contact.confidence_id} />
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {contact.company_name} · {contact.email_address}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] tracking-[0.15em] uppercase font-semibold text-muted-foreground">
              Discovery Path
            </h3>
            {onRunDiscovery && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRunDiscovery(contact.id)}
                disabled={discoveryRunning}
                className="text-xs tracking-wider uppercase gap-1.5"
              >
                <Radar className="h-3.5 w-3.5" />
                {discoveryRunning ? 'Running…' : 'Run Discovery'}
              </Button>
            )}
          </div>

          {activityLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4">
              No activity logs yet. Run discovery to start.
            </p>
          ) : (
            <div className="border border-border rounded-md divide-y divide-border">
              {activityLogs.map((log) => {
                const label = log.event_type?.label || 'Event';
                return (
                  <div key={log.id} className="px-4 py-3">
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <span className="text-xs font-semibold text-foreground">
                        {label}
                      </span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), 'MMM d, yyyy · HH:mm')}
                      </span>
                    </div>

                    {log.query_used && (
                      <code className="block text-[11px] bg-muted/60 text-muted-foreground rounded px-2 py-1 font-mono break-all mb-1.5">
                        {log.query_used}
                      </code>
                    )}

                    {log.result_snippet && (
                      <p className="text-xs text-foreground/70 leading-relaxed">
                        {log.result_snippet}
                      </p>
                    )}

                    {log.source_url && (
                      <a
                        href={log.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline mt-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {log.source_url}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center gap-3 pt-4 border-t border-border/30">
          <Select
            value={contact.designation_id !== DESIGNATION.PENDING ? String(contact.designation_id) : undefined}
            onValueChange={(val) => onHILChange(contact.id, Number(val))}
          >
            <SelectTrigger className="h-9 w-[200px] text-xs">
              <SelectValue placeholder="Select designation…">
                {resolveDisplayLocation(contact)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {contact.person_location_raw && (
                <SelectItem value={String(DESIGNATION.PERSON)}>{contact.person_location_raw}</SelectItem>
              )}
              {(() => {
                const { match } = getMatchingCompanyLocation(contact);
                const companyDisplay = match || (contact.company_location_raw.length > 0 ? contact.company_location_raw.join(', ') : null);
                if (companyDisplay && companyDisplay !== contact.person_location_raw) {
                  return <SelectItem value={String(DESIGNATION.COMPANY)}>{companyDisplay}</SelectItem>;
                }
                return null;
              })()}
              {contact.manual_location && (
                <SelectItem value={String(DESIGNATION.MANUAL)}>{contact.manual_location}</SelectItem>
              )}
              <SelectItem value="manual_new">Other…</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => onApprove(contact.id)}
            disabled={contact.designation_id === DESIGNATION.PENDING && !contact.is_approved}
            className="bg-steel text-steel-foreground hover:bg-steel/90 text-xs tracking-wider uppercase"
          >
            {contact.is_approved ? 'Approved ✓' : 'Approve Record'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
