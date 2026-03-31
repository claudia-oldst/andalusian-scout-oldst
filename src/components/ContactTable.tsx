import { Contact, HILDesignation } from '@/types/contact';
import { ConfidenceBadge } from './ConfidenceBadge';
import { Checkbox } from '@/components/ui/checkbox';
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

interface ContactTableProps {
  contacts: Contact[];
  onToggleApproval: (id: string) => void;
  onApproveAll: (checked: boolean) => void;
  onHILChange: (id: string, value: HILDesignation) => void;
  onRowClick: (contact: Contact) => void;
  allVisibleApproved: boolean;
}

export const ContactTable = ({
  contacts,
  onToggleApproval,
  onApproveAll,
  onHILChange,
  onRowClick,
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
                    checked={contact.approved}
                    disabled={!contact.hilDesignation}
                    onCheckedChange={() => onToggleApproval(contact.id)}
                    title={!contact.hilDesignation ? 'Select a designation first' : undefined}
                  />
                </TableCell>
                <TableCell className="font-medium text-foreground text-sm py-2.5">{contact.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm py-2.5">{contact.company}</TableCell>
                <TableCell className="text-muted-foreground text-xs py-2.5">{contact.email}</TableCell>
                <TableCell className="text-sm py-2.5">{contact.personLocation}</TableCell>
                <TableCell className="text-sm py-2.5">{contact.companyLocation}</TableCell>
                <TableCell className="py-2.5">
                  <ConfidenceBadge level={contact.confidence} />
                </TableCell>
                <TableCell className="py-2.5" onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={contact.hilDesignation || undefined}
                    onValueChange={(val) => onHILChange(contact.id, val as HILDesignation)}
                  >
                    <SelectTrigger className="h-7 w-[160px] text-xs border-border">
                      <SelectValue placeholder="Select…" />
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
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
