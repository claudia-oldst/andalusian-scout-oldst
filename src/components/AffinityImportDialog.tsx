import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAffinityImport } from '@/hooks/useAffinityImport';
import { Loader2, Download, Search } from 'lucide-react';

interface AffinityImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invalidateContacts: () => void;
}

export const AffinityImportDialog = ({
  open,
  onOpenChange,
  invalidateContacts,
}: AffinityImportDialogProps) => {
  const [listId, setListId] = useState('');
  const [savedViewId, setSavedViewId] = useState('');
  const [userId, setUserId] = useState('');

  const {
    entries,
    allEntries,
    loading,
    importing,
    filters,
    setFilters,
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    fetchEntries,
    importSelected,
    extractLocation,
    extractName,
    extractEmail,
  } = useAffinityImport(invalidateContacts);

  const handleFetch = () => {
    if (!listId.trim()) return;
    setFilters((prev) => ({ ...prev, onlyUserId: userId.trim() }));
    fetchEntries(listId.trim(), savedViewId.trim() || undefined);
  };

  const handleImport = async () => {
    await importSelected();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm uppercase tracking-widest font-semibold">
            Import from Affinity
          </DialogTitle>
          <DialogDescription>
            Fetch list entries from Affinity CRM and import them as contacts.
          </DialogDescription>
        </DialogHeader>

        {/* Config inputs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              List ID *
            </Label>
            <Input
              value={listId}
              onChange={(e) => setListId(e.target.value)}
              placeholder="e.g. 12345"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Saved View ID
            </Label>
            <Input
              value={savedViewId}
              onChange={(e) => setSavedViewId(e.target.value)}
              placeholder="Optional"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Filter by User ID
            </Label>
            <Input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Optional"
              className="h-9 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            onClick={handleFetch}
            disabled={loading || !listId.trim()}
            size="sm"
            className="gap-1.5"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            {loading ? 'Fetching…' : 'Fetch Entries'}
          </Button>

          {allEntries.length > 0 && (
            <div className="flex items-center gap-2">
              <Switch
                checked={filters.onlyMissingLocation}
                onCheckedChange={(checked) =>
                  setFilters((prev) => ({ ...prev, onlyMissingLocation: checked }))
                }
                id="missing-loc"
              />
              <Label htmlFor="missing-loc" className="text-xs cursor-pointer">
                Only missing location
              </Label>
            </div>
          )}

          {allEntries.length > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">
              {entries.length} of {allEntries.length} entries
              {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
            </span>
          )}
        </div>

        {/* Results table */}
        {entries.length > 0 && (
          <div className="flex-1 overflow-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="p-2 w-8">
                    <Checkbox
                      checked={
                        selectedIds.size === entries.length && entries.length > 0
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="p-2 text-left text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    Name
                  </th>
                  <th className="p-2 text-left text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    Email
                  </th>
                  <th className="p-2 text-left text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    Location
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const loc = extractLocation(entry);
                  return (
                    <tr
                      key={entry.id}
                      className="border-t hover:bg-muted/30 cursor-pointer"
                      onClick={() => toggleSelect(entry.id)}
                    >
                      <td className="p-2">
                        <Checkbox
                          checked={selectedIds.has(entry.id)}
                          onCheckedChange={() => toggleSelect(entry.id)}
                        />
                      </td>
                      <td className="p-2 font-medium">{extractName(entry)}</td>
                      <td className="p-2 text-muted-foreground">
                        {extractEmail(entry) || '—'}
                      </td>
                      <td className="p-2">
                        {loc || (
                          <span className="text-destructive text-xs italic">
                            Missing
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {allEntries.length > 0 && entries.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No entries match the current filters.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing || selectedIds.size === 0}
            className="gap-1.5"
          >
            {importing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Import {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
