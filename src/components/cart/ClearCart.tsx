"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart";

/** Empties the bag once an order is confirmed paid (after the saved bag has loaded, or it would come back). */
export function ClearCart() {
  const { clear, ready } = useCart();
  useEffect(() => { if (ready) clear(); }, [clear, ready]);
  return null;
}
