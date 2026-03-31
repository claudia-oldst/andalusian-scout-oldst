import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

interface ManualLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  onSubmit: (city: string, country: string, source: string) => void;
}

export const ManualLocationDialog = ({
  open,
  onOpenChange,
  contactName,
  onSubmit,
}: ManualLocationDialogProps) => {
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [source, setSource] = useState('');

  const handleSubmit = () => {
    if (!city.trim() || !country.trim()) return;
    onSubmit(city.trim(), country.trim(), source.trim());
    setCity('');
    setCountry('');
    setSource('');
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setCity('');
      setCountry('');
      setSource('');
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Manual Location</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Enter location for {contactName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground mb-1 block">
              City
            </label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Madrid"
              className="h-8 text-sm"
              maxLength={100}
            />
          </div>
          <div>
            <label className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground mb-1 block">
              Country
            </label>
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. Spain"
              className="h-8 text-sm"
              maxLength={100}
            />
          </div>
          <div>
            <label className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground mb-1 block">
              Source
            </label>
            <Textarea
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="How did you find this location? e.g. Phone call, personal knowledge…"
              className="text-sm min-h-[60px] resize-none"
              maxLength={500}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!city.trim() || !country.trim()}
            className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs tracking-wider uppercase"
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
