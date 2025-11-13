import type { Metadata } from "next";
import "./globals.css";
import ClientWrapper from "@/components/ClientWrapper";
import HeaderWrapper from "@/components/HeaderWrapper";
import ContentWrapper from "@/components/ContentWrapper";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Footer from "@/components/Footer";
import ChatAI from "@/components/ai-chat/ChatAIWrapper";
import { ChatProvider } from "@/contexts/ChatContext";

export const metadata: Metadata = {
  title: "AIFShop",
  description: "AI-Powered Jewelry Shopping",
};

const LABELS = {
  "/shop": "Shop",
  products: { label: "Shop", href: "/shop" }, // <-- click vào "Shop" (segment products) sẽ đi tới /shop
  product: "Product",
  cart: "Cart",
  checkout: "Checkout",
  account: "My Account",
  orders: "Orders",
  "/admin": "Admin",
  "/admin/add-product": "Add Product",
  "/admin/products": "Manage Products",
  "/admin/users": "User Management",
  "/admin/analytics": "Analytics",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="text-brand-dark antialiased" suppressHydrationWarning>
        <ChatProvider>
          <ClientWrapper>
            <div className="min-h-screen bg-gradient-to-b from-brand-light/60 to-white">
              {/* Header cố định toàn site */}
              <HeaderWrapper />

              {/* Breadcrumb */}
              <Breadcrumb
                labelMap={LABELS}
                hideOn={["/", "/login", "/register", "/messenger"]} // ẩn ở các trang không cần
                className="flex max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-4 md:pt-6"
              />
              
              {/* Content with conditional wrapper */}
              <ContentWrapper>
                {children}
              </ContentWrapper>
              <Footer></Footer>
            </div>
            <ChatAI />
          </ClientWrapper>
        </ChatProvider>
      </body>
    </html>
  );
}
