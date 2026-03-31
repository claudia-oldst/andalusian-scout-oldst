import { Contact, HILDesignation, ActivityLog } from '@/types/contact';
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
import { ExternalLink, Search, Globe, RefreshCw, MapPin } from 'lucide-react';
import { format } from 'date-fns';

const eventConfig: Record<ActivityLog['eventType'], { label: string; icon: React.ElementType; color: string }> = {
  google_dork_linkedin: { label: 'Google Dorking · LinkedIn Scrape', icon: Search, color: 'bg-accent' },
  firecrawl_website: { label: 'Firecrawl · Website Crawl', icon: Globe, color: 'bg-steel' },
  affinity_sync: { label: 'Affinity CRM · Sync', icon: RefreshCw, color: 'bg-secondary' },
  manual_entry: { label: 'Manual Entry · User Provided', icon: MapPin, color: 'bg-primary' },
};

interface ActivityLogModalProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (id: string) => void;
  onHILChange: (id: string, value: HILDesignation) => void;
}

export const ActivityLogModal = ({
  contact,
  open,
  onOpenChange,
  onApprove,
  onHILChange,
}: ActivityLogModalProps) => {
  if (!contact) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-lg font-semibold">{contact.name}</span>
            <ConfidenceBadge level={contact.confidence} />
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {contact.company} · {contact.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <h3 className="text-[10px] tracking-[0.15em] uppercase font-semibold text-muted-foreground mb-4">
            Discovery Path
          </h3>

          <div className="relative pl-6">
            {/* Timeline line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

            <div className="space-y-6">
              {contact.activityLogs.map((log) => {
                const cfg = eventConfig[log.eventType];
                const Icon = cfg.icon;
                return (
                  <div key={log.id} className="relative">
                    {/* Timeline dot */}
                    <div className={`absolute -left-6 top-1 h-[22px] w-[22px] rounded-full ${cfg.color} flex items-center justify-center`}>
                      <Icon className="h-3 w-3 text-white" />
                    </div>

                    <div className="bg-muted/40 rounded-lg p-4 border border-border/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold tracking-wider uppercase text-foreground">
                          {cfg.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(log.timestamp), 'MMM d, yyyy · HH:mm')}
                        </span>
                      </div>

                      <div className="mb-2">
                        <span className="text-[10px] tracking-wider uppercase text-muted-foreground">Query</span>
                        <code className="block mt-1 text-xs bg-primary/10 text-foreground rounded px-2 py-1.5 font-mono break-all">
                          {log.queryUsed}
                        </code>
                      </div>

                      <p className="text-sm text-foreground/80 mb-2">{log.resultSummary}</p>

                      <a
                        href={log.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View Source
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center gap-3 pt-4 border-t border-border/30">
          <Select
            value={contact.hilDesignation || undefined}
            onValueChange={(val) => onHILChange(contact.id, val as HILDesignation)}
          >
            <SelectTrigger className="h-9 w-[200px] text-xs">
              <SelectValue placeholder="Select designation…" />
            </SelectTrigger>
            <SelectContent>
              {contact.personLocation && (
                <SelectItem value="person_location">{contact.personLocation}</SelectItem>
              )}
              {contact.companyLocation && contact.companyLocation !== contact.personLocation && (
                <SelectItem value="company_location">{contact.companyLocation}</SelectItem>
              )}
              <SelectItem value="manual">Manual Entry</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => onApprove(contact.id)}
            disabled={!contact.hilDesignation && !contact.approved}
            className="bg-steel text-steel-foreground hover:bg-steel/90 text-xs tracking-wider uppercase"
          >
            {contact.approved ? 'Approved ✓' : 'Approve Record'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
