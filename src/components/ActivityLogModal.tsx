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
import { ExternalLink, Search, Globe, RefreshCw, MapPin, Linkedin, Pencil, Radar } from 'lucide-react';
import { format } from 'date-fns';

const iconMap: Record<string, React.ElementType> = {
  search: Search,
  linkedin: Linkedin,
  globe: Globe,
  refresh: RefreshCw,
  edit: Pencil,
};

const colorMap: Record<string, string> = {
  search: 'bg-accent',
  linkedin: 'bg-accent',
  globe: 'bg-steel',
  refresh: 'bg-secondary',
  edit: 'bg-primary',
};

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

function resolveDisplayLocation(contact: Contact): string {
  switch (contact.designation_id) {
    case DESIGNATION.PERSON: return contact.person_location_raw;
    case DESIGNATION.COMPANY: return contact.company_location_raw;
    case DESIGNATION.MANUAL: return contact.manual_location;
    default: return 'Select designation…';
  }
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

        <div className="space-y-1">
          <div className="flex items-center justify-between mb-4">
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

          <div className="relative pl-6">
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

            <div className="space-y-6">
              {activityLogs.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No activity logs yet. Run discovery to start.</p>
              )}
              {activityLogs.map((log) => {
                const iconName = log.event_type?.icon_name || 'search';
                const Icon = iconMap[iconName] || Search;
                const bgColor = colorMap[iconName] || 'bg-accent';
                const label = log.event_type?.label || 'Unknown Event';

                return (
                  <div key={log.id} className="relative">
                    <div className={`absolute -left-6 top-1 h-[22px] w-[22px] rounded-full ${bgColor} flex items-center justify-center`}>
                      <Icon className="h-3 w-3 text-white" />
                    </div>

                    <div className="bg-muted/40 rounded-lg p-4 border border-border/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold tracking-wider uppercase text-foreground">
                          {label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(log.created_at), 'MMM d, yyyy · HH:mm')}
                        </span>
                      </div>

                      <div className="mb-2">
                        <span className="text-[10px] tracking-wider uppercase text-muted-foreground">Query</span>
                        <code className="block mt-1 text-xs bg-primary/10 text-foreground rounded px-2 py-1.5 font-mono break-all">
                          {log.query_used}
                        </code>
                      </div>

                      <p className="text-sm text-foreground/80 mb-2">{log.result_snippet}</p>

                      {log.source_url && (
                        <a
                          href={log.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View Source
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
              {contact.company_location_raw && contact.company_location_raw !== contact.person_location_raw && (
                <SelectItem value={String(DESIGNATION.COMPANY)}>{contact.company_location_raw}</SelectItem>
              )}
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
