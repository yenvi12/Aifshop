"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type SizeOption = {
  name: string;
  stock: number;
};

interface ProductContext {
  productId: string;
  productName: string;
  productPrice: number | null;
  productCompareAtPrice: number | null;
  productCategory: string;
  productImage?: string;
  productDescription?: string;
  productSizes?: SizeOption[];
}

interface ChatContextType {
  isOpen: boolean;
  productContext: ProductContext | null;
  openChat: (productContext?: ProductContext) => void;
  closeChat: () => void;
  setProductContext: (context: ProductContext | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [productContext, setProductContext] = useState<ProductContext | null>(null);

  const openChat = (newProductContext?: ProductContext) => {
    if (newProductContext) {
      setProductContext(newProductContext);
    }
    setIsOpen(true);
  };

  const closeChat = () => {
    setIsOpen(false);
    // Không xóa productContext ngay lập tức để tránh flicker
    // Sẽ xóa khi modal hoàn toàn đóng
    setTimeout(() => {
      setProductContext(null);
    }, 300);
  };

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        productContext,
        openChat,
        closeChat,
        setProductContext
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}