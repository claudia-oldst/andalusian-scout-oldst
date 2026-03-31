import { ChevronDown, Search, Upload, Download, ArrowUpFromLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
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
      className="rounded-r-none bg-accent text-accent-foreground hover:bg-accent/90 text-[11px] tracking-[0.12em] uppercase font-medium h-8"
    >
      <Icon className="h-3.5 w-3.5 mr-1.5" />
      {label}
    </Button>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          className="rounded-l-none border-l border-white/20 bg-accent text-accent-foreground hover:bg-accent/90 px-1.5 h-8"
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

export const Header = ({ onFetchContacts, onUploadCSV, onPushToAffinity, onExportCSV }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-50 w-full bg-primary border-b border-primary/80">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded bg-accent/90 flex items-center justify-center">
            <span className="text-accent-foreground font-bold text-xs">A</span>
          </div>
          <div>
            <h1 className="text-primary-foreground text-[11px] font-semibold tracking-[0.2em] uppercase leading-tight">
              Andalusian Credit Partners
            </h1>
            <p className="text-primary-foreground/50 text-[9px] tracking-[0.15em] uppercase">
              Location Scout · OSINT Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
      </div>
    </header>
  );
};
