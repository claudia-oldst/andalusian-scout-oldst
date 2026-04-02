import logo from '@/assets/logo.png';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export const Header = () => {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full bg-primary border-b border-primary/80">
      <div className="container flex h-14 items-center justify-between">
        <img src={logo} alt="Andalusian Credit Partners" className="h-6" />
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-primary-foreground/70 hidden sm:inline">
              {user.email}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="h-8 w-8 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};
