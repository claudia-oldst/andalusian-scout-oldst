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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { RefreshCw } from 'lucide-react';

function resolveDisplayLocation(contact: Contact): string {
  switch (contact.designation_id) {
    case DESIGNATION.PERSON: return contact.person_location_raw;
    case DESIGNATION.COMPANY: return contact.company_location_raw.join(', ');
    case DESIGNATION.MANUAL: return contact.manual_location;
    default: return 'Select…';
  }
}

/** Find the company location that matches person_location_raw */
/** Extract city name (first comma-separated segment) for fuzzy matching */
function extractCity(loc: string): string {
  return loc.split(',')[0].toLowerCase().trim();
}

function getMatchingCompanyLocation(contact: Contact): { match: string | null; others: string[] } {
  const personLoc = contact.person_location_raw?.toLowerCase().trim();
  if (!personLoc || contact.company_location_raw.length === 0) {
    return { match: null, others: contact.company_location_raw };
  }

  const personCity = extractCity(contact.person_location_raw || '');

  const matchIdx = contact.company_location_raw.findIndex((loc) => {
    const cNorm = loc.toLowerCase().trim();
    const cCity = extractCity(loc);
    // Exact match, substring match, or city-level match
    return personLoc === cNorm || personLoc.includes(cNorm) || cNorm.includes(personLoc) || personCity === cCity;
  });

  if (matchIdx === -1) {
    return { match: null, others: contact.company_location_raw };
  }

  const match = contact.company_location_raw[matchIdx];
  const others = contact.company_location_raw.filter((_, i) => i !== matchIdx);
  return { match, others };
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
                <TableCell className="text-sm py-2.5">
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
                <TableCell className="text-sm py-2.5">
                  <CompanyLocationCell contact={contact} />
                </TableCell>
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