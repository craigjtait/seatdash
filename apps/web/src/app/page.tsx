"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { CartProvider, useCart } from "@/components/CartContext";
import { getMenu, formatCents, type MenuCategory } from "@/lib/api";
import Link from "next/link";

function MenuContent() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem, items, totalCents, itemCount, updateQuantity } = useCart();

  useEffect(() => {
    getMenu()
      .then((data) => setCategories(data.categories))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-brand-silver">Loading menu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <>
      <main className="max-w-lg mx-auto px-4 pb-32 pt-4">
        {categories.map((cat) => (
          <section key={cat.id} className="mb-8">
            <h2 className="font-display text-xl font-bold text-brand-blue-dark uppercase mb-3">
              {cat.name}
            </h2>
            <div className="space-y-3">
              {cat.items.map((item) => {
                const inCart = items.find((i) => i.menuItemId === item.id);
                return (
                  <div key={item.id} className="card p-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base">{item.name}</h3>
                        {item.description && (
                          <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
                        )}
                        <p className="text-brand-blue font-semibold mt-1">
                          {formatCents(item.priceCents)}
                        </p>
                      </div>
                      {inCart ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => updateQuantity(item.id, inCart.quantity - 1)}
                            className="w-9 h-9 rounded-full bg-brand-blue/10 text-brand-blue font-bold text-lg"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="w-6 text-center font-semibold">{inCart.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, inCart.quantity + 1)}
                            className="w-9 h-9 rounded-full bg-brand-blue text-white font-bold text-lg"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            addItem({
                              menuItemId: item.id,
                              name: item.name,
                              priceCents: item.priceCents,
                            })
                          }
                          className="btn-primary text-sm px-4 py-2 shrink-0"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-brand-silver/40 shadow-lg z-40">
          <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">{itemCount} item{itemCount !== 1 ? "s" : ""}</p>
              <p className="font-display text-xl font-bold text-brand-blue">
                {formatCents(totalCents)}
              </p>
            </div>
            <Link href="/checkout" className="btn-primary flex-1 text-center max-w-[200px]">
              Checkout
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

export default function HomePage() {
  return (
    <CartProvider>
      <Header subtitle="Order food & drinks to your seat" />
      <MenuContent />
    </CartProvider>
  );
}
