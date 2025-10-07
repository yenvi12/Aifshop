"use client";

import { useState, useEffect } from "react";
import LoadingSpinner from "./LoadingSpinner";
import { Toaster } from "react-hot-toast";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <Toaster
        position="top-right"
        reverseOrder={true}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          duration: 2000,
          className: '',
          style: {
            background: '#363636',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '500',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1), 0 4px 10px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255,255,255,0.1)',
            maxWidth: '400px',
            padding: '12px 16px',
          },
          success: {
            style: {
              background: '#10b981',
              color: '#fff',
              border: '1px solid #059669',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#10b981',
            },
          },
          error: {
            style: {
              background: '#ef4444',
              color: '#fff',
              border: '1px solid #dc2626',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#ef4444',
            },
          },
          loading: {
            style: {
              background: '#6b7280',
              color: '#fff',
              border: '1px solid #4b5563',
            },
          },
        }}
      />
      {children}
    </>
  );
}