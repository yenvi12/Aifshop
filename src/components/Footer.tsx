export default function Footer() {
  return (
    <footer className="text-center text-xs text-gray-500 py-6 border-t bg-white">
      <p className="mb-3">© 2025 AIFShop. All rights reserved.</p>
      
      <div className="flex justify-center gap-6 mt-3">
        <a href="/about" className="hover:underline hover:text-blue-600 transition-colors">About Us</a>
        <a href="/contact" className="hover:underline hover:text-blue-600 transition-colors">Contact</a>
        <a href="#" className="hover:underline hover:text-blue-600 transition-colors">Privacy Policy</a>
        <a href="#" className="hover:underline hover:text-blue-600 transition-colors">Terms of Service</a>
      </div>
    </footer>
  );
}