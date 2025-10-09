export default function Header() {
    const links = ['Home', 'Shop', 'About Us', 'Contact'];
  
    return (
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <h1 className="text-xl font-bold">AIFShop</h1>
  
        <nav className="hidden md:flex gap-6 text-sm">
          {links.map((l) => (
            <a key={l} href="#" className="hover:underline">
              {l}
            </a>
          ))}
        </nav>
  
        <button className="md:hidden">☰</button>
      </header>
    );
  }