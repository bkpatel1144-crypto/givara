import { useCallback, useEffect, useState } from "react";
import type { CartItem } from "@/types/ring";

const STORAGE_KEY = "givara.ring-builder.cart.v1";

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(read());
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage full or unavailable — cart stays in memory */
    }
  }, []);

  const addItem = useCallback(
    (item: Omit<CartItem, "id" | "createdAt">) => {
      const full: CartItem = {
        ...item,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
      };
      persist([...read(), full]);
      return full;
    },
    [persist],
  );

  const removeItem = useCallback(
    (id: string) => persist(read().filter((i) => i.id !== id)),
    [persist],
  );

  const clear = useCallback(() => persist([]), [persist]);

  return { items, addItem, removeItem, clear, count: items.length };
}
