import logo from '@/assets/logo.png';

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full bg-primary border-b border-primary/80">
      <div className="container flex h-12 items-center">
        <img src={logo} alt="Andalusian Credit Partners" className="h-5" />
      </div>
    </header>
  );
};
