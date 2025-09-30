"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Image from "next/image";
import Link from "next/link";

export default function PaymentPage() {
  const [selectedPayment, setSelectedPayment] = useState("stripe");
  const [selectedShipping, setSelectedShipping] = useState("express");
  
  //const inputClass = "border border-gray-300 rounded-md px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";
  //const labelClass = "text-sm font-medium text-gray-700";

  return (
    <div className="min-h-screen bg-brand-light">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-[2fr_1fr] gap-10">
        {/* LEFT SECTION */}
        <div className="space-y-8">
          {/* Shipping Address */}
          <section className="bg-white shadow-md rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Shipping address</h2>
            <div className="bg-brand-primary/20 text-sm p-4 rounded-lg mb-4">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">Alex Johnson</p>
                  <p>123 Tran Hung Dao St, Quy Nhon, Binh Dinh, Vietnam</p>
                  <p>+84 912 345 678 • alex@example.com</p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 bg-brand-primary text-white rounded-md">Default</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm" >
              <input type="text" placeholder="First name"  className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
              <input type="text" placeholder="Last name"  className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
              <input type="text" placeholder="Address"  className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
              <input type="text" placeholder="City"  className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
              <input type="text" placeholder="Postal code"  className="input" />
            </div>
          </section>

          {/* Payment Method */}
          <section className="bg-white shadow-md rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Payment method</h2>
            <div className="space-y-3">
              {[
                { id: "stripe", label: "Stripe", type: "Card" },
                { id: "vnpay", label: "VNPay", type: "Wallet" },
                { id: "momo", label: "MoMo", type: "App" },
                { id: "qr", label: "QR Pay", type: "Scan" },
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedPayment(method.id)}
                  className={`w-full p-2.5 rounded-xl  flex justify-between items-center border ${
                    selectedPayment === method.id ? "bg-brand-primary text-white border-brand-light" : "bg-brand-primary/20 border-transparent"
                  }`}
                >
                  {method.label} <span className="text-xs">{method.type}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <input type="text" placeholder="Name on card / wallet" className="input col-span-2" />
              <input type="text" placeholder="Card / Wallet ID" className="input" />
              <input type="text" placeholder="Expiry (MM/YY)" className="input" />
              <input type="text" placeholder="CVC / Security code" className="input" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Payments are encrypted. We support 3D Secure and tokenized storage for reorders.</p>
          </section>

          {/* Shipping Method */}
          <section className="bg-white shadow-md rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Shipping method</h2>
            <div className="space-y-3">
              {[
                { id: "express", label: "Express (1–2 days)", price: "$18" },
                { id: "standard", label: "Standard (3–5 days)", price: "$8" },
                { id: "preorder", label: "Preorder slot", price: "Ships in 2 weeks" },
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedShipping(method.id)}
                  //w-full rounded-xl py-2.5 bg-brand-accent text-brand-dark font-semibold border border-brand-light hover:bg-brand-accent/90 disabled:opacity-60 transition
                  className={`w-full p-2.5 rounded-xl  flex justify-between items-center border ${
                    selectedShipping === method.id ? "bg-brand-primary text-brand-light border-brand-light" : "bg-brand-primary/20 border-transparent"
                  }`}
                >
                  {method.label} <span className="text-xs">{method.price}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT SECTION: Order Summary */}
        <aside className="bg-white shadow-md rounded-xl p-6 h-fit sticky top-24">
          <h2 className="text-lg font-semibold mb-4">Order summary</h2>
          <div className="space-y-4">
            {/* Items */}
            <div className="flex items-center gap-4">
              <Image src="/demo/ring1.jpg" alt="Ring1" width={60} height={60} className="rounded-lg" />
              <div className="text-sm">
                <p className="font-medium">Silver leaf Ring</p>
                <p className="text-gray-500">Silver • Size 6</p>
              </div>
              <p className="ml-auto font-medium">$129</p>
            </div>
            <div className="flex items-center gap-4">
              <Image src="/demo/dc11.jpg" alt="Necklaces" width={60} height={60} className="rounded-lg" />
              <div className="text-sm">
                <p className="font-medium">White Gold Daisy Necklace</p>
                <p className="text-gray-500">42 EU</p>
              </div>
              <p className="ml-auto font-medium">$98</p>
            </div>
            <input type="text" placeholder="Promo / Gift code" className="input w-full" />

            {/* Totals */}
            <div className="border-t pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>$227</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>$8</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>$12.45</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total</span>
                <span>$247.45</span>
              </div>
            </div>

            <button className="w-full rounded-xl py-2.5 bg-brand-accent text-brand-dark font-semibold border border-brand-light hover:bg-brand-accent/90 disabled:opacity-60 transition">
              Pay now
            </button>
            <button className="w-full rounded-xl py-2.5 bg-brand-light text-brand-dark font-semibold border border-brand-light hover:bg-brand-accent/90 disabled:opacity-60 transition">Review order</button>
            <Link href="/cart" className="block w-full text-center text-sm text-brand-dark hover:underline">
              ← Back to cart
            </Link>
            <p className="text-xs text-gray-500 text-center">
              By paying, you agree to our <Link href="#" className="underline">Terms</Link> and <Link href="#" className="underline">Refund Policy</Link>.
            </p>
          </div>
        </aside>
      </main>

      <footer className="text-center text-xs py-6 text-brand-dark bg-brand-light">
        © 2025 AIFShop. All rights reserved. · <Link href="#">Privacy Policy</Link> · <Link href="#">Terms of Service</Link>
      </footer>
    </div>
  );
}
