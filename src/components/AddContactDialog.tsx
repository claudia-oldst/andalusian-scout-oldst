import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { affinity_id: string; name: string; company_name: string; email_address: string }) => void;
}

export const AddContactDialog = ({ open, onOpenChange, onSubmit }: AddContactDialogProps) => {
  const [affinityId, setAffinityId] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!companyName.trim()) e.companyName = 'Company is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Please enter a valid email address';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      affinity_id: affinityId.trim() || crypto.randomUUID(),
      name: name.trim(),
      company_name: companyName.trim(),
      email_address: email.trim(),
    });
    setAffinityId('');
    setName('');
    setCompanyName('');
    setEmail('');
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm tracking-wider uppercase font-semibold">Add Contact</DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Manually add a new contact record.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-[10px] tracking-[0.14em] uppercase text-muted-foreground">Affinity ID</Label>
            <Input
              value={affinityId}
              onChange={(e) => setAffinityId(e.target.value)}
              placeholder="Optional — auto-generated if blank"
              className="h-8 text-sm mt-1"
              maxLength={100}
            />
          </div>
          <div>
            <Label className="text-[10px] tracking-[0.14em] uppercase text-muted-foreground">Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Smith"
              className="h-8 text-sm mt-1"
              maxLength={100}
            />
            {errors.name && <p className="text-[10px] text-destructive mt-0.5">{errors.name}</p>}
          </div>
          <div>
            <Label className="text-[10px] tracking-[0.14em] uppercase text-muted-foreground">Company Name *</Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Corp"
              className="h-8 text-sm mt-1"
              maxLength={100}
            />
            {errors.companyName && <p className="text-[10px] text-destructive mt-0.5">{errors.companyName}</p>}
          </div>
          <div>
            <Label className="text-[10px] tracking-[0.14em] uppercase text-muted-foreground">Email Address *</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@acme.com"
              className="h-8 text-sm mt-1"
              maxLength={255}
              type="email"
            />
            {errors.email && <p className="text-[10px] text-destructive mt-0.5">{errors.email}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs tracking-wider uppercase">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs tracking-wider uppercase"
          >
            Add Contact
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
