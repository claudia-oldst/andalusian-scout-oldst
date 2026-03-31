import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export const SearchBar = ({ searchTerm, onSearchChange }: SearchBarProps) => {
  return (
    <div className="flex items-center gap-3 w-full max-w-3xl mx-auto">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, company, or email…"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-11 bg-card border-border/50 focus-visible:ring-accent text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <Button variant="outline" className="h-11 border-border/50 text-muted-foreground hover:text-foreground">
        <SlidersHorizontal className="h-4 w-4 mr-2" />
        <span className="text-xs tracking-wider uppercase">Advanced Filters</span>
      </Button>
    </div>
  );
};
