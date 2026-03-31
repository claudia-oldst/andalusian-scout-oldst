import { ChevronDown, Search, Upload, Download, ArrowUpFromLine, ArrowDownToLine } from 'lucide-react';
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
      className="rounded-r-none bg-accent text-accent-foreground hover:bg-accent/90 text-xs tracking-widest uppercase font-medium"
    >
      <Icon className="h-4 w-4 mr-1.5" />
      {label}
    </Button>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="rounded-l-none border-l border-accent-foreground/20 bg-accent text-accent-foreground hover:bg-accent/90 px-2">
          <ChevronDown className="h-4 w-4" />
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
    <header className="sticky top-0 z-50 w-full bg-primary/95 backdrop-blur-md border-b border-border/30">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-accent flex items-center justify-center">
            <span className="text-accent-foreground font-bold text-sm">A</span>
          </div>
          <div>
            <h1 className="text-primary-foreground text-sm font-semibold tracking-[0.2em] uppercase">
              Andalusian Credit Partners
            </h1>
            <p className="text-primary-foreground/60 text-[10px] tracking-[0.15em] uppercase">
              Location Scout · OSINT Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SplitButton
            label="Find New Contacts"
            icon={Search}
            onClick={onFetchContacts}
            dropdownLabel="Upload Source CSV"
            dropdownIcon={Upload}
            onDropdownClick={onUploadCSV}
          />
          <SplitButton
            label="Map Found Contacts"
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
