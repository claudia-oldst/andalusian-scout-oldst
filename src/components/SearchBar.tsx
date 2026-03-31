import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export const SearchBar = ({ searchTerm, onSearchChange }: SearchBarProps) => {
  return (
    <div className="flex items-center gap-2 w-full max-w-2xl mx-auto">
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
    </div>
  );
};
