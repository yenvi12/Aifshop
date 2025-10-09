import './globals.css';

export const metadata = {
  title: 'AIFShop',
  description: 'Quick style & leather sneakers',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900">{children}</body>
    </html>
  );
}