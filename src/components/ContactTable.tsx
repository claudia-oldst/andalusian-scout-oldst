import { Contact, DESIGNATION } from '@/types/contact';
import { ConfidenceBadge } from './ConfidenceBadge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RefreshCw } from 'lucide-react';

function resolveDisplayLocation(contact: Contact): string {
  switch (contact.designation_id) {
    case DESIGNATION.PERSON: return contact.person_location_raw;
    case DESIGNATION.COMPANY: return contact.company_location_raw.join(', ');
    case DESIGNATION.MANUAL: return contact.manual_location;
    default: return 'Select…';
  }
}

interface ContactTableProps {
  contacts: Contact[];
  onToggleApproval: (id: string) => void;
  onApproveAll: (checked: boolean) => void;
  onHILChange: (id: string, designationId: number) => void;
  onRowClick: (contact: Contact) => void;
  onRunDiscovery?: (contactId: string) => void;
  discoveryRunning?: boolean;
  allVisibleApproved: boolean;
}

export const ContactTable = ({
  contacts,
  onToggleApproval,
  onApproveAll,
  onHILChange,
  onRowClick,
  onRunDiscovery,
  discoveryRunning,
  allVisibleApproved,
}: ContactTableProps) => {
  return (
    <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border">
            <TableHead className="w-10 py-2.5">
              <Checkbox
                checked={allVisibleApproved && contacts.length > 0}
                onCheckedChange={(checked) => onApproveAll(!!checked)}
              />
            </TableHead>
            {['Name', 'Company', 'Email', 'Person Location', 'Company Location', 'Confidence', 'HIL Designation'].map(
              (col) => (
                <TableHead
                  key={col}
                  className="text-[10px] tracking-[0.14em] uppercase font-semibold text-muted-foreground py-2.5"
                >
                  {col}
                </TableHead>
              )
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-16 text-muted-foreground text-sm">
                No contacts match your search.
              </TableCell>
            </TableRow>
          ) : (
            contacts.map((contact) => (
              <TableRow
                key={contact.id}
                className="cursor-pointer hover:bg-muted/30 transition-colors border-b border-border/50"
                onClick={() => onRowClick(contact)}
              >
                <TableCell className="py-2.5" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={contact.is_approved}
                    disabled={contact.designation_id === DESIGNATION.PENDING}
                    onCheckedChange={() => onToggleApproval(contact.id)}
                    title={contact.designation_id === DESIGNATION.PENDING ? 'Select a designation first' : undefined}
                  />
                </TableCell>
                <TableCell className="font-medium text-foreground text-sm py-2.5">{contact.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm py-2.5">{contact.company_name}</TableCell>
                <TableCell className="text-muted-foreground text-xs py-2.5">{contact.email_address}</TableCell>
                <TableCell className="text-sm py-2.5">{contact.person_location_raw}</TableCell>
                <TableCell className="text-sm py-2.5">{contact.company_location_raw.join(', ')}</TableCell>
                <TableCell className="py-2.5">
                  <ConfidenceBadge confidenceId={contact.confidence_id} />
                </TableCell>
                <TableCell className="py-2.5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <Select
                      value={contact.designation_id !== DESIGNATION.PENDING ? String(contact.designation_id) : undefined}
                      onValueChange={(val) => onHILChange(contact.id, Number(val))}
                    >
                      <SelectTrigger className="h-7 w-[160px] text-xs border-border">
                        <SelectValue placeholder="Select…">
                          {resolveDisplayLocation(contact)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {contact.person_location_raw && (
                          <SelectItem value={String(DESIGNATION.PERSON)}>{contact.person_location_raw}</SelectItem>
                        )}
                {contact.company_location_raw.length > 0 && contact.company_location_raw.join(', ') !== contact.person_location_raw && (
                  <SelectItem value={String(DESIGNATION.COMPANY)}>{contact.company_location_raw.join(', ')}</SelectItem>
                        )}
                        {contact.manual_location && (
                          <SelectItem value={String(DESIGNATION.MANUAL)}>{contact.manual_location}</SelectItem>
                        )}
                        <SelectItem value="manual_new">Other…</SelectItem>
                      </SelectContent>
                    </Select>
                    {onRunDiscovery && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        disabled={discoveryRunning}
                        onClick={() => onRunDiscovery(contact.id)}
                        title="Re-run OSINT discovery for this contact"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${discoveryRunning ? 'animate-spin' : ''}`} />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
