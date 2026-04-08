import { useState } from 'react';
import { Contact, DESIGNATION } from '@/types/contact';
import { ConfidenceBadge } from './ConfidenceBadge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { RefreshCw, Trash2 } from 'lucide-react';
import { getMatchingCompanyLocation, resolveDisplayLocation } from '@/lib/location-matching';

interface ContactTableProps {
  contacts: Contact[];
  onToggleApproval: (id: string) => void;
  onApproveAll: (checked: boolean) => void;
  onHILChange: (id: string, designationId: number) => void;
  onRowClick: (contact: Contact) => void;
  onRunDiscovery?: (contactId: string) => void;
  onDeleteContact?: (id: string) => void;
  discoveryRunning?: boolean;
  discoveringContactId?: string | null;
  allVisibleApproved: boolean;
}

function CompanyLocationCell({ contact }: { contact: Contact }) {
  const locs = contact.company_location_raw;
  const sourceUrl = contact.company?.website_url;
  if (locs.length === 0) return <span className="text-muted-foreground text-xs italic">—</span>;

  const { match, others } = getMatchingCompanyLocation(contact);
  const otherCount = others.length;

  const displayText = match
    ? `${match}${otherCount > 0 ? ` (+${otherCount})` : ''}`
    : locs.join(', ');

  const content = sourceUrl ? (
    <a
      href={sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent hover:underline cursor-pointer border-b border-dotted border-accent/40"
      onClick={(e) => e.stopPropagation()}
    >
      {displayText}
    </a>
  ) : (
    <span className={locs.length > 1 || match ? 'cursor-help border-b border-dotted border-muted-foreground/40' : ''}>
      {displayText}
    </span>
  );

  if (locs.length <= 1 && !match) {
    return content;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1">
            All Company Locations
          </p>
          <ul className="space-y-0.5">
            {locs.map((loc, i) => {
              const isMatch = match && loc === match;
              return (
                <li key={i} className={isMatch ? 'font-semibold text-accent' : ''}>
                  {loc}
                  {isMatch && <span className="ml-1 text-[10px] text-accent">(match)</span>}
                </li>
              );
            })}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const ContactTable = ({
  contacts,
  onToggleApproval,
  onApproveAll,
  onHILChange,
  onRowClick,
  onRunDiscovery,
  onDeleteContact,
  discoveryRunning,
  discoveringContactId,
  allVisibleApproved,
}: ContactTableProps) => {
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);

  return (
    <>
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
            {['Name', 'Company', 'Email', 'Person Location', 'Company Location', 'Confidence', 'HIL Designation', ''].map(
              (col, i) => (
                <TableHead
                  key={i}
                  className={col ? "text-[11px] tracking-[0.14em] uppercase font-semibold text-muted-foreground py-3" : "w-10 py-3"}
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
              <TableCell colSpan={9} className="text-center py-16 text-muted-foreground text-sm">
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
                <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={contact.is_approved}
                    disabled={contact.designation_id === DESIGNATION.PENDING}
                    onCheckedChange={() => onToggleApproval(contact.id)}
                    title={contact.designation_id === DESIGNATION.PENDING ? 'Select a designation first' : undefined}
                  />
                </TableCell>
                <TableCell className="font-medium text-foreground text-sm py-3">{contact.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm py-3">{contact.company_name}</TableCell>
                <TableCell className="text-muted-foreground text-sm py-3">{contact.email_address}</TableCell>
                <TableCell className="text-sm py-3">
                  {contact.person_location_raw ? (
                    <a
                      href={`https://www.google.com/search?q=site%3Alinkedin.com+%22${encodeURIComponent(contact.name)}%22+%22${encodeURIComponent(contact.company_name)}%22+location`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {contact.person_location_raw}
                    </a>
                  ) : (
                    <span className="text-muted-foreground text-xs italic">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm py-3">
                  <CompanyLocationCell contact={contact} />
                </TableCell>
                <TableCell className="py-3">
                  <ConfidenceBadge confidenceId={contact.confidence_id} />
                </TableCell>
                <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
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
                    {onRunDiscovery && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        disabled={discoveringContactId === contact.id || discoveryRunning}
                        onClick={() => onRunDiscovery(contact.id)}
                        title="Re-run OSINT discovery for this contact"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${discoveringContactId === contact.id ? 'animate-spin' : ''}`} />
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                  {onDeleteContact && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(contact)}
                      title="Delete contact"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>

    <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Contact</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              if (deleteTarget && onDeleteContact) {
                onDeleteContact(deleteTarget.id);
              }
              setDeleteTarget(null);
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};
