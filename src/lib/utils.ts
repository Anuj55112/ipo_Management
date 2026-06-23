import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "INR"): string {
  // Use Indian formatting for INR, otherwise default US formatting
  const locale = currency === "INR" ? "en-IN" : "en-US";
  const currencySymbol = currency === "INR" ? "INR" : currency;

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencySymbol,
      maximumFractionDigits: 0
    }).format(amount);
  } catch (error) {
    // Fallback if currency code is not supported
    return `${currency === "INR" ? "₹" : "$"}${amount.toLocaleString()}`;
  }
}

export function formatDate(dateString: string | Date): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}
