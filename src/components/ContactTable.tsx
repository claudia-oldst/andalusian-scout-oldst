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
    <div className="bg-card rounded-lg border border-border/40 shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/30 hover:bg-secondary/30">
            <TableHead className="w-12">
              <Checkbox
                checked={allVisibleApproved && contacts.length > 0}
                onCheckedChange={(checked) => onApproveAll(!!checked)}
              />
            </TableHead>
            <TableHead className="text-[10px] tracking-[0.15em] uppercase font-semibold text-muted-foreground">Name</TableHead>
            <TableHead className="text-[10px] tracking-[0.15em] uppercase font-semibold text-muted-foreground">Company</TableHead>
            <TableHead className="text-[10px] tracking-[0.15em] uppercase font-semibold text-muted-foreground">Email</TableHead>
            <TableHead className="text-[10px] tracking-[0.15em] uppercase font-semibold text-muted-foreground">Person Location</TableHead>
            <TableHead className="text-[10px] tracking-[0.15em] uppercase font-semibold text-muted-foreground">Company Location</TableHead>
            <TableHead className="text-[10px] tracking-[0.15em] uppercase font-semibold text-muted-foreground">Confidence</TableHead>
            <TableHead className="text-[10px] tracking-[0.15em] uppercase font-semibold text-muted-foreground">HIL Designation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                No contacts match your search.
              </TableCell>
            </TableRow>
          ) : (
            contacts.map((contact) => (
              <TableRow
                key={contact.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onRowClick(contact)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={contact.approved}
                    onCheckedChange={() => onToggleApproval(contact.id)}
                  />
                </TableCell>
                <TableCell className="font-medium text-foreground">{contact.name}</TableCell>
                <TableCell className="text-muted-foreground">{contact.company}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{contact.email}</TableCell>
                <TableCell className="text-sm">{contact.personLocation}</TableCell>
                <TableCell className="text-sm">{contact.companyLocation}</TableCell>
                <TableCell>
                  <ConfidenceBadge level={contact.confidence} />
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={contact.hilDesignation || undefined}
                    onValueChange={(val) => onHILChange(contact.id, val as HILDesignation)}
                  >
                    <SelectTrigger className="h-8 w-[150px] text-xs border-border/50">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="person_location">Person Location</SelectItem>
                      <SelectItem value="company_location">Company Location</SelectItem>
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
