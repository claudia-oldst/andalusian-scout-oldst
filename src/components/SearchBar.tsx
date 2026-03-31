import { Search, SlidersHorizontal, ChevronDown, Upload, Download, ArrowUpFromLine } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onFetchContacts: () => void;
  onUploadCSV: () => void;
  onPushToAffinity: () => void;
  onExportCSV: () => void;
}

const SplitButton = ({
  label,
  icon: Icon,
  onClick,
  dropdownLabel,
  dropdownIcon: DropdownIcon,
  onDropdownClick,
}: {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  dropdownLabel: string;
  dropdownIcon: React.ElementType;
  onDropdownClick: () => void;
}) => (
  <div className="flex">
    <Button
      onClick={onClick}
      size="sm"
      className="rounded-r-none bg-accent text-accent-foreground hover:bg-accent/90 text-[11px] tracking-[0.12em] uppercase font-medium h-9"
    >
      <Icon className="h-3.5 w-3.5 mr-1.5" />
      {label}
    </Button>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          className="rounded-l-none border-l border-white/20 bg-accent text-accent-foreground hover:bg-accent/90 px-1.5 h-9"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onDropdownClick}>
          <DropdownIcon className="h-4 w-4 mr-2" />
          {dropdownLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

export const SearchBar = ({
  searchTerm,
  onSearchChange,
  onFetchContacts,
  onUploadCSV,
  onPushToAffinity,
  onExportCSV,
}: SearchBarProps) => {
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, company, or email…"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9 bg-card border-border focus-visible:ring-accent text-sm"
        />
      </div>
      <Button variant="outline" size="sm" className="h-9 text-muted-foreground hover:text-foreground">
        <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
        <span className="text-[11px] tracking-wider uppercase">Filters</span>
      </Button>
      <div className="w-px h-6 bg-border" />
      <SplitButton
        label="Find Contacts"
        icon={Search}
        onClick={onFetchContacts}
        dropdownLabel="Upload Source CSV"
        dropdownIcon={Upload}
        onDropdownClick={onUploadCSV}
      />
      <SplitButton
        label="Map Contacts"
        icon={ArrowUpFromLine}
        onClick={onPushToAffinity}
        dropdownLabel="Export Verified CSV"
        dropdownIcon={Download}
        onDropdownClick={onExportCSV}
      />
    </div>
  );
};
