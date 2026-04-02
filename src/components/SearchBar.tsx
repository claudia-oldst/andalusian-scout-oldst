import { Search, Upload, Download, UserPlus, Radar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronDown } from 'lucide-react';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  confidenceFilter: string;
  onConfidenceFilterChange: (value: string) => void;
  approvalFilter: 'all' | 'approved' | 'pending';
  onApprovalFilterChange: (value: 'all' | 'approved' | 'pending') => void;
  onAddContact: () => void;
  onUploadCSV: () => void;
  onExportCSV: () => void;
  onRunBulkDiscovery: () => void;
  discoveryRunning?: boolean;
}

export const SearchBar = ({
  searchTerm,
  onSearchChange,
  confidenceFilter,
  onConfidenceFilterChange,
  approvalFilter,
  onApprovalFilterChange,
  onAddContact,
  onUploadCSV,
  onExportCSV,
  onRunBulkDiscovery,
  discoveryRunning,
}: SearchBarProps) => {
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, company, or email…"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-10 bg-card border-border focus-visible:ring-accent text-sm"
        />
      </div>
      <Select value={confidenceFilter} onValueChange={onConfidenceFilterChange}>
        <SelectTrigger className="h-10 w-[140px] text-sm border-border bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Confidence</SelectItem>
          <SelectItem value="1">High</SelectItem>
          <SelectItem value="2">Medium</SelectItem>
          <SelectItem value="3">Low</SelectItem>
        </SelectContent>
      </Select>
      <Select value={approvalFilter} onValueChange={(v) => onApprovalFilterChange(v as 'all' | 'approved' | 'pending')}>
        <SelectTrigger className="h-10 w-[130px] text-sm border-border bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
        </SelectContent>
      </Select>
      <div className="w-px h-6 bg-border" />

      {/* Import / Add dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs tracking-[0.12em] uppercase font-medium h-10 gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" />
            Import
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onUploadCSV}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Source CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAddContact}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Contact Manually
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Export */}
      <Button
        onClick={onExportCSV}
        size="sm"
        variant="outline"
        className="h-10 text-xs tracking-[0.12em] uppercase font-medium gap-1.5"
      >
        <Download className="h-3.5 w-3.5" />
        Export
      </Button>

      {/* Discovery */}
      <Button
        onClick={onRunBulkDiscovery}
        disabled={discoveryRunning}
        size="sm"
        variant="outline"
        className="h-10 text-xs tracking-[0.12em] uppercase font-medium gap-1.5"
        title="Run OSINT discovery on all pending contacts"
      >
        <Radar className="h-3.5 w-3.5" />
        {discoveryRunning ? 'Running…' : 'Discover'}
      </Button>
    </div>
  );
};
